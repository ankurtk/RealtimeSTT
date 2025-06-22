const { EventEmitter } = require('events');
const OpenAI = require('openai');

class ChatGPTService extends EventEmitter {
  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.settings = {
      model: 'gpt-4-turbo-preview',
      maxTokens: 500,
      temperature: 0.7,
      systemPrompt: `You are an AI meeting assistant. Your role is to:
1. Provide helpful insights and suggestions based on meeting conversations
2. Identify action items and important decisions
3. Suggest follow-up questions when appropriate
4. Summarize key points concisely
5. Flag potential issues or concerns

Keep responses concise and actionable. Focus on being helpful without being intrusive.`,
      responseDelay: 3000, // Wait 3 seconds after transcription before responding
      rateLimitDelay: 1000 // Minimum delay between API calls
    };

    this.lastApiCall = 0;
    this.pendingTimeout = null;
  }

  async processTranscription(text, conversationContext) {
    // Clear any pending response
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
    }

    // Set a delay before processing to avoid responding to incomplete thoughts
    this.pendingTimeout = setTimeout(async () => {
      try {
        await this.generateResponse(text, conversationContext);
      } catch (error) {
        console.error('Error generating response:', error);
        this.emit('error', error);
      }
    }, this.settings.responseDelay);
  }

  async generateResponse(text, conversationContext) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.settings.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.settings.rateLimitDelay - timeSinceLastCall)
      );
    }

    try {
      // Prepare messages for API
      const messages = [
        { role: 'system', content: this.settings.systemPrompt }
      ];

      // Add recent conversation context
      const recentContext = conversationContext.slice(-10); // Last 10 exchanges
      messages.push(...recentContext);

      // Add current transcription with context
      const contextualPrompt = this.buildContextualPrompt(text, conversationContext);
      messages.push({ role: 'user', content: contextualPrompt });

      const response = await this.openai.chat.completions.create({
        model: this.settings.model,
        messages: messages,
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      this.lastApiCall = Date.now();

      const assistantResponse = response.choices[0].message.content.trim();
      
      // Only emit response if it's meaningful
      if (assistantResponse && assistantResponse.length > 10) {
        this.emit('response', assistantResponse);
      }

    } catch (error) {
      if (error.status === 429) {
        // Rate limit exceeded, wait and retry
        console.log('Rate limit exceeded, waiting...');
        setTimeout(() => {
          this.generateResponse(text, conversationContext);
        }, 5000);
      } else {
        throw error;
      }
    }
  }

  buildContextualPrompt(currentText, conversationContext) {
    const recentTranscriptions = conversationContext
      .filter(msg => msg.role === 'user')
      .slice(-3)
      .map(msg => msg.content)
      .join(' ');

    // Analyze the context to determine response type
    let prompt = `Current transcription: "${currentText}"\n\n`;

    if (this.containsActionItems(currentText)) {
      prompt += 'This seems to contain action items or decisions. Please identify and summarize them.';
    } else if (this.containsQuestions(currentText)) {
      prompt += 'This contains questions. Please provide helpful insights or suggest answers if appropriate.';
    } else if (this.containsProblems(currentText)) {
      prompt += 'This mentions problems or challenges. Please suggest potential solutions or next steps.';
    } else {
      prompt += 'Please provide a brief, helpful insight or suggestion based on this conversation.';
    }

    return prompt;
  }

  containsActionItems(text) {
    const actionKeywords = [
      'action item', 'todo', 'task', 'assign', 'responsible', 'deadline',
      'follow up', 'next step', 'deliverable', 'complete by'
    ];
    return actionKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  containsQuestions(text) {
    return text.includes('?') || 
           text.toLowerCase().includes('what') ||
           text.toLowerCase().includes('how') ||
           text.toLowerCase().includes('when') ||
           text.toLowerCase().includes('where') ||
           text.toLowerCase().includes('why');
  }

  containsProblems(text) {
    const problemKeywords = [
      'problem', 'issue', 'challenge', 'difficulty', 'concern',
      'blocker', 'obstacle', 'risk', 'delay'
    ];
    return problemKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Update OpenAI client if API key changed
    if (newSettings.apiKey) {
      this.openai = new OpenAI({
        apiKey: newSettings.apiKey
      });
    }
  }

  cleanup() {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
    }
    this.removeAllListeners();
  }
}

module.exports = { ChatGPTService };
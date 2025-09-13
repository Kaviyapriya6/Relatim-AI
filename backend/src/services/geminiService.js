const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    this.model = 'gemma-3n-e2b-it';
    
    // AI personality and context
    this.systemPrompt = `You are a helpful AI assistant integrated into a Relatim-style messaging app. Your name is AI Assistant.

Guidelines:
- Be conversational, friendly, and helpful
- Keep responses concise but informative
- Use emojis occasionally to make conversations more engaging
- You can help with general questions, provide information, assist with tasks, and have casual conversations
- If asked about technical details of the app, explain that you're an AI assistant integrated into their messaging platform
- Be respectful and professional while maintaining a casual, friendly tone
- If you don't know something, admit it honestly
- Avoid generating inappropriate, harmful, or offensive content

Remember: You're having a conversation in a messaging app, so keep your responses natural and conversational.`;
  }

  async generateResponse(prompt, conversationHistory = []) {
    try {
      // Prepare the conversation context
      let fullPrompt = this.systemPrompt + '\n\n';
      
      // Add conversation history for context (last 10 messages)
      if (conversationHistory.length > 0) {
        fullPrompt += 'Conversation History:\n';
        const recentHistory = conversationHistory.slice(-10);
        
        recentHistory.forEach(msg => {
          if (msg.isUser) {
            fullPrompt += `User: ${msg.content}\n`;
          } else {
            fullPrompt += `AI: ${msg.content}\n`;
          }
        });
        fullPrompt += '\n';
      }
      
      fullPrompt += `Current User Message: ${prompt}\n\nAI Response:`;

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ];

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
      });

      const text = response.text || '';

      // Clean up the response
      const cleanedText = text
        .replace(/^AI:\s*/, '') // Remove "AI:" prefix if present
        .replace(/AI Response:\s*/, '') // Remove "AI Response:" prefix
        .trim();

      return {
        success: true,
        response: cleanedText,
        tokensUsed: this.estimateTokens(fullPrompt + cleanedText)
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Handle specific API errors
      if (error.message.includes('API_KEY')) {
        return {
          success: false,
          error: 'AI service configuration error',
          response: 'Sorry, I\'m having trouble connecting to my AI service. Please try again later. 🤖'
        };
      }
      
      if (error.message.includes('SAFETY')) {
        return {
          success: false,
          error: 'Content safety filter triggered',
          response: 'I cannot provide a response to that message due to safety guidelines. Please try rephrasing your question. 🛡️'
        };
      }
      
      if (error.message.includes('QUOTA')) {
        return {
          success: false,
          error: 'API quota exceeded',
          response: 'I\'m currently experiencing high demand. Please try again in a moment. ⏳'
        };
      }

      // Handle rate limiting
      if (error.status === 429 || error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('Quota exceeded')) {
        return {
          success: true, // Return success with fallback message
          response: 'I\'m currently experiencing high demand and my AI service quota is temporarily exceeded. Here\'s a helpful response while I work on getting back online! 🤖\n\nI\'m an AI assistant ready to help you with questions, provide information, have conversations, and assist with various tasks. Feel free to ask me anything and I\'ll do my best to help once my service is restored. Thank you for your patience! ✨',
          fallback: true
        };
      }

      return {
        success: false,
        error: error.message,
        response: 'Sorry, I encountered an error while processing your message. Please try again. 😅'
      };
    }
  }

  async generateStreamResponse(prompt, conversationHistory = []) {
    try {
      // Prepare the conversation context (similar to generateResponse)
      let fullPrompt = this.systemPrompt + '\n\n';
      
      if (conversationHistory.length > 0) {
        fullPrompt += 'Conversation History:\n';
        const recentHistory = conversationHistory.slice(-10);
        
        recentHistory.forEach(msg => {
          if (msg.isUser) {
            fullPrompt += `User: ${msg.content}\n`;
          } else {
            fullPrompt += `AI: ${msg.content}\n`;
          }
        });
        fullPrompt += '\n';
      }
      
      fullPrompt += `Current User Message: ${prompt}\n\nAI Response:`;

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ];

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        contents,
      });

      return response;

    } catch (error) {
      console.error('Gemini stream error:', error);
      throw error;
    }
  }

  // Estimate token usage (rough approximation)
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Generate conversation summary for context compression
  async generateSummary(conversationHistory) {
    try {
      if (conversationHistory.length < 5) {
        return null; // Not enough history to summarize
      }

      const historyText = conversationHistory.map(msg => 
        `${msg.isUser ? 'User' : 'AI'}: ${msg.content}`
      ).join('\n');

      const summaryPrompt = `Please provide a brief summary of this conversation to maintain context:

${historyText}

Summary (keep it concise, 2-3 sentences max):`;

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: summaryPrompt,
            },
          ],
        },
      ];

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
      });
      
      return (response.text || '').trim();

    } catch (error) {
      console.error('Summary generation error:', error);
      return null;
    }
  }

  // Check if the service is available
  async healthCheck() {
    try {
      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: 'Hello, this is a health check. Please respond with "OK".',
            },
          ],
        },
      ];

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
      });

      return {
        status: 'healthy',
        response: response.text || 'OK'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new GeminiService();
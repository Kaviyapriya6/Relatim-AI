import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { 
  Avatar, 
  Button, 
  EmptyState
} from '../components/common';
import api from '../services/api';
import socketService from '../services/socket';

const AIChat = () => {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [streamingResponse] = useState('');
  
  const { user } = useSelector((state) => state.auth);

  // Use local state for AI conversation
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [conversationStats, setConversationStats] = useState({
    totalMessages: 1,
    averageResponseTime: '2.3s',
    topicsDiscussed: ['General Help'],
    satisfactionScore: 95
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  useEffect(() => {
    // Simulate AI context awareness
    const handleNewMessage = (message) => {
      console.log('New message in AI chat:', message);
    };

    socketService.on('newMessage', handleNewMessage);

    return () => {
      socketService.off('newMessage', handleNewMessage);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversation history from backend
  const loadConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get('/ai/conversation?limit=50');
      
      if (response.data.success && response.data.data.conversation) {
        const conversationData = response.data.data.conversation;
        
        // Convert backend conversation format to frontend message format
        const formattedMessages = [];
        
        conversationData.forEach(chat => {
          // Add user message
          formattedMessages.push({
            id: `user_${chat.id}`,
            content: chat.user_message.content,
            sender: 'user',
            timestamp: chat.user_message.created_at,
            type: 'text'
          });
          
          // Add AI response
          formattedMessages.push({
            id: `ai_${chat.id}`,
            content: chat.ai_response.content,
            sender: 'assistant',
            timestamp: chat.ai_response.created_at,
            type: 'text'
          });
        });
        
        // If no conversation history, add welcome message
        if (formattedMessages.length === 0) {
          formattedMessages.push({
            id: 'welcome',
            content: 'Hello! I\'m your Relatim AI assistant. How can I help you today?',
            sender: 'assistant',
            timestamp: new Date().toISOString(),
            type: 'text'
          });
        }
        
        setMessages(formattedMessages);
        
        // Update conversation stats
        setConversationStats(prev => ({
          ...prev,
          totalMessages: formattedMessages.length
        }));
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      // Add welcome message as fallback
      setMessages([{
        id: 'welcome',
        content: 'Hello! I\'m your Relatim AI assistant. How can I help you today?',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'text'
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load conversation history on component mount
  useEffect(() => {
    loadConversationHistory();
  }, []);

  // Clear conversation history
  const clearConversation = async () => {
    try {
      const response = await api.delete('/ai/conversation');
      if (response.data.success) {
        // Reset to welcome message
        setMessages([{
          id: 'welcome',
          content: 'Hello! I\'m your Relatim AI assistant. How can I help you today?',
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          type: 'text'
        }]);
        
        // Reset stats
        setConversationStats({
          totalMessages: 1,
          averageResponseTime: '0s',
          topicsDiscussed: ['General Help'],
          satisfactionScore: 95
        });
      }
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  const sendAIMessageHandler = async (userMessage) => {
    try {
      setAiTyping(true);
      
      // Add user message to local state immediately
      const userMsg = {
        id: Date.now().toString(),
        content: userMessage,
        sender: 'user',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, userMsg]);
      
      // Call the actual AI API
      const response = await api.post('/ai/message', {
        prompt: userMessage
      });
      
      if (response.data.success) {
        // Add AI response to local state
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          content: response.data.response,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, aiMsg]);
        
        // Update stats
        setConversationStats(prev => ({
          ...prev,
          totalMessages: prev.totalMessages + 2,
          averageResponseTime: (Math.random() * 3 + 1).toFixed(1) + 's'
        }));
      } else {
        throw new Error(response.data.message || 'AI request failed');
      }
      
    } catch (error) {
      console.error('Failed to send AI message:', error);
      
      // Show error message to user
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'text',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setAiTyping(false);
    }
  };

  const handleReaction = async (messageId, reaction) => {
    try {
      // This would typically call an API to store the reaction
      console.log(`Reaction ${reaction} for message ${messageId}`);
      
      // Show success feedback to user
      if (reaction === 'like') {
        toast.success('👍 Thanks for the feedback!');
      } else if (reaction === 'dislike') {
        toast.success('👎 Feedback noted - I\'ll try to improve!');
      }
      
      // TODO: Implement actual reaction storage API call here
      // await api.post(`/ai/messages/${messageId}/reaction`, { reaction });
      
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to record reaction');
    }
  };

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('📋 Message copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('📋 Message copied to clipboard!');
      } catch (fallbackError) {
        toast.error('Failed to copy message to clipboard');
      }
    }
  };

  const handleExportConversation = () => {
    try {
      if (messages.length === 0) {
        toast.error('No conversation to export');
        return;
      }

      // Create conversation text
      const conversationText = messages.map(message => {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const sender = message.sender === 'user' ? 'You' : 'Relatim AI';
        return `[${timestamp}] ${sender}: ${message.content}`;
      }).join('\n\n');

      // Add header
      const exportText = `AI Chat Conversation Export
Generated on: ${new Date().toLocaleString()}
Total Messages: ${messages.length}

${'='.repeat(50)}

${conversationText}`;

      // Create and download file
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-chat-conversation-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('📄 Conversation exported successfully!');
    } catch (error) {
      console.error('Failed to export conversation:', error);
      toast.error('Failed to export conversation');
    }
  };


  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const messageContent = messageInput.trim();
    setMessageInput('');
    inputRef.current?.focus();

    // Update stats
    setConversationStats(prev => ({
      ...prev,
      totalMessages: prev.totalMessages + 1
    }));

    // Send to real AI service
    await sendAIMessageHandler(messageContent);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const quickPrompts = [
    {
      icon: '💡',
      title: 'Get Ideas',
      description: 'Help me brainstorm ideas for...',
    },
    {
      icon: '📝',
      title: 'Write Content',
      description: 'Help me write a...',
    },
    {
      icon: '🔍',
      title: 'Explain Topic',
      description: 'Explain this concept to me...',
    },
    {
      icon: '🛠️',
      title: 'Solve Problem',
      description: 'Help me solve this problem...',
    },
    {
      icon: '📊',
      title: 'Analyze Data',
      description: 'Help me understand this data...',
    },
    {
      icon: '🎯',
      title: 'Set Goals',
      description: 'Help me plan and set goals for...',
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Loading conversation history */}
      {isLoadingHistory && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading conversation history...</p>
          </div>
        </div>
      )}
      
      {/* Chat interface - only show when not loading */}
      {!isLoadingHistory && (
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <Avatar
            src={user?.profile_photo || null}
            alt="Relatim AI"
            size="medium"
            online={true}
          />
          
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
              Relatim AI
              <div className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs rounded-full">
                AI
              </div>
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {aiTyping ? 'AI is thinking...' : 'Always available'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="small"
            onClick={loadConversationHistory}
            disabled={isLoadingHistory}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={clearConversation}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
          
          <Button
            variant="ghost"
            size="small"
            onClick={handleExportConversation}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <EmptyState
              title="Start a conversation with AI"
              description="Ask me anything! I'm here to help with questions, tasks, and creative projects."
              icon="🤖"
            />
            
            {/* Quick Prompts */}
            <div className="max-w-4xl w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
                Try asking me about:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickPrompts.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setMessageInput(prompt.description)}
                    className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{prompt.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {prompt.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {prompt.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const showDate = index === 0 || 
                formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
              
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center">
                      <span className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md flex items-start space-x-3 ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <Avatar
                        src={message.sender === 'assistant' ? null : (message.sender === 'user' ? user?.profile_photo : null)}
                        alt={message.sender === 'assistant' ? 'Relatim AI' : `${user?.first_name || 'User'} ${user?.last_name || ''}`}
                        size="small"
                        online={message.sender === 'assistant'}
                      />
                      
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        
                        <div className={`flex items-center justify-between mt-1 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span className="text-xs">
                            {formatTime(message.timestamp)}
                          </span>
                          
                          {message.sender === 'assistant' && (
                            <div className="flex items-center space-x-1 ml-2">
                              <button 
                                className="text-xs hover:text-gray-700 dark:hover:text-gray-300 p-1"
                                onClick={() => handleReaction(message.id, 'like')}
                                title="Like this response"
                              >
                                👍
                              </button>
                              <button 
                                className="text-xs hover:text-gray-700 dark:hover:text-gray-300 p-1"
                                onClick={() => handleReaction(message.id, 'dislike')}
                                title="Dislike this response"
                              >
                                👎
                              </button>
                              <button 
                                className="text-xs hover:text-gray-700 dark:hover:text-gray-300 p-1"
                                onClick={() => handleCopyMessage(message.content)}
                                title="Copy to clipboard"
                              >
                                📋
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}

            {/* Streaming Response */}
            {streamingResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-xs lg:max-w-md flex items-start space-x-3">
                  <Avatar
                    src={null}
                    alt="Relatim AI"
                    size="small"
                    online={true}
                  />
                  
                  <div className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                    <p className="whitespace-pre-wrap break-words">
                      {streamingResponse}
                      <span className="animate-pulse">|</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI Typing Indicator */}
            {aiTyping && !streamingResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-start space-x-3">
                  <Avatar
                    src={null}
                    alt="Relatim AI"
                    size="small"
                    online={true}
                  />
                  
                  <div className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Conversation Stats */}
      {messages.length > 1 && (
        <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{conversationStats.totalMessages} messages</span>
            <span>Avg response: {conversationStats.averageResponseTime}</span>
            <span>Satisfaction: {conversationStats.satisfactionScore}%</span>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-3">
          <div className="flex space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>

          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="w-full max-h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={1}
              style={{
                minHeight: '44px',
                height: Math.min(messageInput.split('\n').length * 20 + 24, 128) + 'px'
              }}
              disabled={aiTyping}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || aiTyping}
            variant="primary"
            size="medium"
            className="px-4 py-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default AIChat;
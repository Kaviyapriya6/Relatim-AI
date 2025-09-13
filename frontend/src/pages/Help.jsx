import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge } from '../components/common';

const Help = () => {
  const faqs = [
    {
      id: 1,
      question: "How do I add a new contact?",
      answer: "Go to the Contacts page and click the 'Add Contact' button. You can search for users by email, phone number, or name."
    },
    {
      id: 2,
      question: "How do I send messages?",
      answer: "Click on any contact in your chat list or go to Chats page. Type your message in the input field and press Enter or click the send button."
    },
    {
      id: 3,
      question: "How do I change my profile picture?",
      answer: "Go to Settings > Profile tab and click 'Change Photo' to upload a new profile picture."
    },
    {
      id: 4,
      question: "How do I enable dark mode?",
      answer: "Go to Settings > Settings tab and toggle the 'Dark Mode' switch."
    },
    {
      id: 5,
      question: "How do I manage notifications?",
      answer: "In Settings > Settings tab, you can control push notifications and sound settings."
    },
    {
      id: 6,
      question: "How do I use the AI Assistant?",
      answer: "Click on 'AI Assistant' in your chat list to start a conversation with our AI helper."
    },
    {
      id: 7,
      question: "How do I delete messages?",
      answer: "Long press or right-click on any message to see delete options."
    },
    {
      id: 8,
      question: "How do I change my password?",
      answer: "Go to Settings > Security tab to change your password securely."
    }
  ];

  const supportTopics = [
    {
      title: "Account & Profile",
      description: "Manage your account settings, profile information, privacy controls, and personal preferences. Update your name, email, phone number, bio, and profile picture."
    },
    {
      title: "Messaging",
      description: "Send text messages, share files and images, edit or delete messages, and use advanced chat features like message reactions and replies."
    },
    {
      title: "Contacts",
      description: "Add new friends by email or phone, organize your contact list, remove contacts, and manage contact permissions and visibility settings."
    },
    {
      title: "Settings & Preferences",
      description: "Customize your app experience with theme options, notification settings, language preferences, font sizes, and privacy controls."
    },
    {
      title: "AI Assistant",
      description: "Get intelligent help and responses from our built-in AI assistant. Ask questions, get suggestions, and receive automated support."
    },
    {
      title: "Technical Support",
      description: "Troubleshoot connection issues, report bugs, get help with app performance, and resolve technical difficulties or error messages."
    }
  ];

  const handleContactSupport = () => {
    const subject = "WhatsApp AI Chat - Support Request";
    const body = `Hello,

I need help with:

[Please describe your issue here]

---
User Details:
- Page: Help & Support
- Browser: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}

Thank you!`;

    const mailtoUrl = `mailto:Priyakaviya2004@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Help & Support
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Find answers to common questions or contact our support team
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Quick Support Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Need Personal Help?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Can't find what you're looking for? Our support team is here to help!
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleContactSupport}
                >
                  Contact Support
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Support Topics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Browse by Topic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {supportTopics.map((topic, index) => (
                <motion.div
                  key={topic.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="h-full"
                >
                  <Card className="h-full p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {topic.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Frequently Asked Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Card className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* App Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                App Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Features</h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Real-time messaging</li>
                    <li>• File sharing (images, documents)</li>
                    <li>• AI Assistant integration</li>
                    <li>• Dark/Light theme</li>
                    <li>• Profile customization</li>
                    <li>• Contact management</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Keyboard Shortcuts</h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>• <Badge variant="secondary" size="small">Ctrl + /</Badge> Show shortcuts</li>
                    <li>• <Badge variant="secondary" size="small">Enter</Badge> Send message</li>
                    <li>• <Badge variant="secondary" size="small">Shift + Enter</Badge> New line</li>
                    <li>• <Badge variant="secondary" size="small">Esc</Badge> Close modals</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center py-8"
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              WhatsApp AI Chat - Your intelligent messaging companion
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
              For technical support, contact us at{' '}
              <button
                onClick={handleContactSupport}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Priyakaviya2004@gmail.com
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Help;
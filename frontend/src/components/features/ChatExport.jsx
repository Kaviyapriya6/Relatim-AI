import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal } from '../common';
import { useNotification } from '../../contexts/NotificationContext';

const ChatExport = ({ isOpen, onClose, chatData, contactName }) => {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeMedia: true,
    includeSystemMessages: false,
    dateRange: 'all',
    startDate: '',
    endDate: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const { showNotification } = useNotification();

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document', icon: '📄', description: 'Formatted document with timestamps' },
    { value: 'txt', label: 'Text File', icon: '📝', description: 'Plain text format' },
    { value: 'json', label: 'JSON Data', icon: '⚙️', description: 'Machine-readable format' },
    { value: 'csv', label: 'CSV Spreadsheet', icon: '📊', description: 'Tabular format for analysis' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Filter messages based on options
      let filteredMessages = chatData?.messages || [];
      
      // Filter by date range
      if (exportOptions.dateRange !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (exportOptions.dateRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'custom':
            startDate = new Date(exportOptions.startDate);
            const endDate = new Date(exportOptions.endDate);
            filteredMessages = filteredMessages.filter(msg => {
              const msgDate = new Date(msg.timestamp);
              return msgDate >= startDate && msgDate <= endDate;
            });
            break;
          default:
            break;
        }
        
        if (exportOptions.dateRange !== 'custom') {
          filteredMessages = filteredMessages.filter(msg => 
            new Date(msg.timestamp) >= startDate
          );
        }
      }
      
      // Filter system messages
      if (!exportOptions.includeSystemMessages) {
        filteredMessages = filteredMessages.filter(msg => msg.type !== 'system');
      }
      
      // Generate export based on format
      switch (exportFormat) {
        case 'pdf':
          await exportToPDF(filteredMessages);
          break;
        case 'txt':
          await exportToText(filteredMessages);
          break;
        case 'json':
          await exportToJSON(filteredMessages);
          break;
        case 'csv':
          await exportToCSV(filteredMessages);
          break;
        default:
          throw new Error('Invalid export format');
      }
      
      showNotification('Chat exported successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export chat. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async (messages) => {
    // In a real app, you'd use a library like jsPDF or pdfkit
    // For now, we'll create an HTML version and print it
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chat Export - ${contactName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
          .message { margin-bottom: 15px; padding: 10px; border-radius: 8px; }
          .sent { background-color: #DCF8C6; margin-left: 50px; }
          .received { background-color: #F1F1F1; margin-right: 50px; }
          .timestamp { font-size: 12px; color: #666; margin-top: 5px; }
          .sender { font-weight: bold; margin-bottom: 5px; }
          .media { font-style: italic; color: #888; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Chat Export: ${contactName}</h1>
          <p>Exported on ${new Date().toLocaleString()}</p>
          <p>Total Messages: ${messages.length}</p>
        </div>
        ${messages.map(msg => `
          <div class="message ${msg.senderId === 'current-user' ? 'sent' : 'received'}">
            <div class="sender">${msg.senderName}</div>
            <div class="content">
              ${msg.type === 'text' ? msg.content : 
                msg.type === 'image' ? `📷 Image: ${msg.fileName || 'image'}` :
                msg.type === 'file' ? `📎 File: ${msg.fileName}` :
                msg.content}
            </div>
            <div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${contactName}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToText = async (messages) => {
    let textContent = `Chat Export: ${contactName}\n`;
    textContent += `Exported on: ${new Date().toLocaleString()}\n`;
    textContent += `Total Messages: ${messages.length}\n`;
    textContent += '='.repeat(50) + '\n\n';
    
    messages.forEach(msg => {
      textContent += `[${new Date(msg.timestamp).toLocaleString()}] ${msg.senderName}:\n`;
      if (msg.type === 'text') {
        textContent += `${msg.content}\n\n`;
      } else if (msg.type === 'image') {
        textContent += `📷 Image: ${msg.fileName || 'image'}\n\n`;
      } else if (msg.type === 'file') {
        textContent += `📎 File: ${msg.fileName}\n\n`;
      } else {
        textContent += `${msg.content}\n\n`;
      }
    });
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${contactName}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = async (messages) => {
    const jsonData = {
      exportInfo: {
        contactName,
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        format: 'json'
      },
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        reactions: msg.reactions
      }))
    };
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${contactName}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = async (messages) => {
    const headers = ['Timestamp', 'Sender', 'Message Type', 'Content', 'File Name'];
    let csvContent = headers.join(',') + '\n';
    
    messages.forEach(msg => {
      const row = [
        `"${new Date(msg.timestamp).toLocaleString()}"`,
        `"${msg.senderName}"`,
        `"${msg.type}"`,
        `"${msg.content?.replace(/"/g, '""') || ''}"`,
        `"${msg.fileName || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${contactName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export Chat - ${contactName}`}
      size="large"
    >
      <div className="space-y-6">
        {/* Export Format Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Choose Export Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formatOptions.map((format) => (
              <motion.div
                key={format.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  exportFormat === format.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setExportFormat(format.value)}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{format.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {format.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Export Options
          </h3>
          
          <div className="space-y-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={exportOptions.dateRange}
                onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Messages</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            <AnimatePresence>
              {exportOptions.dateRange === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={exportOptions.startDate}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={exportOptions.endDate}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Additional Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMedia}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMedia: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include media references (images, files)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSystemMessages}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSystemMessages: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include system messages (user joined, etc.)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Export Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Export Summary
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>Format: {formatOptions.find(f => f.value === exportFormat)?.label}</p>
            <p>Messages: {chatData?.messages?.length || 0}</p>
            <p>Date Range: {exportOptions.dateRange === 'all' ? 'All messages' : 
              exportOptions.dateRange === 'custom' ? 
                `${exportOptions.startDate} to ${exportOptions.endDate}` :
                exportOptions.dateRange}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting || !chatData?.messages?.length}
          >
            {isExporting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </div>
            ) : (
              'Export Chat'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ChatExport;
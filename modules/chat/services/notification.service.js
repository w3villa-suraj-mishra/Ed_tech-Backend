const logger = require('../../../utils/logger');
let existingNotificationService = null;
try {
  existingNotificationService = require('../../../services/notificationService').notificationService;
} catch (e) {
  logger.warn('Existing notificationService not loaded:', e.message);
}

class ChatNotificationService {
  async notifyNewMessage({ recipientId, senderName, conversationId, messageText }) {
    try {
      if (existingNotificationService && recipientId) {
        await existingNotificationService.create({
          userId: recipientId,
          type: 'CHAT_MESSAGE',
          source: 'ADMIN',
          title: `New message from ${senderName}`,
          message: messageText ? messageText.substring(0, 100) : 'Sent an attachment',
          link: `/admin/conversations?id=${conversationId}`,
          entityType: 'CONVERSATION',
          entityId: conversationId
        });
      }
    } catch (err) {
      logger.error('Chat notification error:', err.message);
    }
  }

  async notifyAssignment({ adminId, assignedByName, conversationId, studentName }) {
    try {
      if (existingNotificationService && adminId) {
        await existingNotificationService.create({
          userId: adminId,
          type: 'CHAT_ASSIGNMENT',
          source: 'ADMIN',
          title: 'Conversation Assigned',
          message: `${assignedByName} assigned you to support ${studentName}.`,
          link: `/admin/conversations?id=${conversationId}`,
          entityType: 'CONVERSATION',
          entityId: conversationId
        });
      }
    } catch (err) {
      logger.error('Chat assignment notification error:', err.message);
    }
  }
}

module.exports = new ChatNotificationService();

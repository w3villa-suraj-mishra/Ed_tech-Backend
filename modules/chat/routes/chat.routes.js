const express = require('express');
const router = express.Router();

const conversationController = require('../controllers/conversation.controller');
const messageController = require('../controllers/message.controller');
const adminChatController = require('../controllers/adminChat.controller');

const { authenticateUser, isAdmin } = require('../../../middleware/auth');
const upload = require('../../../middleware/upload');
const { validateSendMessage, validateConversationStatus } = require('../validators/chat.validator');

// ==========================================
// CONVERSATIONS (USER & SHARED)
// ==========================================
router.post('/conversations', authenticateUser, conversationController.createOrGet);
router.get('/conversations', authenticateUser, conversationController.getUserConversations);
router.get('/conversations/:conversationId', authenticateUser, conversationController.getConversation);
router.delete('/conversations/:conversationId', authenticateUser, conversationController.archiveConversation);
router.patch('/conversations/:conversationId/archive', authenticateUser, conversationController.archiveConversation);

// ==========================================
// MESSAGES & ATTACHMENTS
// ==========================================
router.get('/conversations/:conversationId/messages', authenticateUser, messageController.getMessages);
router.post(
  '/conversations/:conversationId/messages',
  authenticateUser,
  validateSendMessage,
  messageController.sendMessage
);
router.patch('/conversations/:conversationId/read', authenticateUser, messageController.markAsRead);
router.delete('/messages/:messageId', authenticateUser, messageController.deleteMessage);

router.post(
  '/attachments',
  authenticateUser,
  upload.single('file'),
  messageController.uploadAttachment
);

// ==========================================
// ADMIN CHAT MANAGEMENT
// ==========================================
router.get('/admin/conversations/admins-list', authenticateUser, isAdmin, adminChatController.getAdminsList);
router.get('/admin/conversations', authenticateUser, isAdmin, adminChatController.getAdminConversations);
router.patch(
  '/admin/conversations/:conversationId/assign',
  authenticateUser,
  isAdmin,
  adminChatController.assignConversation
);
router.patch(
  '/admin/conversations/:conversationId/status',
  authenticateUser,
  isAdmin,
  validateConversationStatus,
  adminChatController.updateStatus
);

module.exports = router;

const conversationService = require('../services/conversation.service');
const logger = require('../../../utils/logger');

class ConversationController {
  async createOrGet(req, res) {
    try {
      const { courseId, pageContext, lessonId, orderId, initialMessage } = req.body;
      const conversation = await conversationService.getOrCreateUserConversation({
        userId: req.user.id,
        courseId,
        pageContext,
        lessonId,
        orderId,
        initialMessage
      });

      return res.status(200).json({
        success: true,
        conversation
      });
    } catch (err) {
      logger.error('createOrGet conversation error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error processing conversation'
      });
    }
  }

  async getUserConversations(req, res) {
    try {
      const { limit, offset, includeArchived } = req.query;
      const data = await conversationService.getUserConversations(req.user.id, {
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
        includeArchived: includeArchived === 'true'
      });

      return res.status(200).json({
        success: true,
        ...data
      });
    } catch (err) {
      logger.error('getUserConversations error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error fetching conversations'
      });
    }
  }

  async getConversation(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      const conversation = await conversationService.getConversationDetails(conversationId, req.user);

      return res.status(200).json({
        success: true,
        conversation
      });
    } catch (err) {
      logger.error('getConversation error:', err.message);
      const status = err.message.includes('Unauthorized') ? 403 : 404;
      return res.status(status).json({
        success: false,
        message: err.message || 'Conversation not found'
      });
    }
  }

  async archiveConversation(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      const result = await conversationService.archiveUserConversation(conversationId, req.user.id);

      return res.status(200).json(result);
    } catch (err) {
      logger.error('archiveConversation error:', err.message);
      const status = err.message.includes('Unauthorized') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'Error archiving conversation'
      });
    }
  }
}

module.exports = new ConversationController();

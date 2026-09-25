const messageService = require('../services/message.service');
const logger = require('../../../utils/logger');
const { MESSAGE_TYPES } = require('../constants/chatConstants');

class MessageController {
  async getMessages(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      const { limit, beforeMessageId } = req.query;

      const messages = await messageService.getMessages(
        conversationId,
        { limit, beforeMessageId },
        req.user
      );

      return res.status(200).json({
        success: true,
        messages
      });
    } catch (err) {
      logger.error('getMessages error:', err.message);
      const status = err.message.includes('Unauthorized') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'Error fetching messages'
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      const {
        content,
        messageType = MESSAGE_TYPES.TEXT,
        attachmentUrl,
        attachmentName,
        attachmentSize,
        attachmentMime,
        clientMessageId
      } = req.body;

      const message = await messageService.sendMessage({
        conversationId,
        senderUser: req.user,
        content,
        messageType,
        attachmentUrl,
        attachmentName,
        attachmentSize,
        attachmentMime,
        clientMessageId
      });

      return res.status(201).json({
        success: true,
        message
      });
    } catch (err) {
      logger.error('sendMessage error:', err.message);
      const status = err.message.includes('Unauthorized') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'Error sending message'
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const conversationId = parseInt(req.params.conversationId, 10);
      await messageService.markAsRead(conversationId, req.user);

      return res.status(200).json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (err) {
      logger.error('markAsRead error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Error marking messages as read'
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      const messageId = parseInt(req.params.messageId, 10);
      const result = await messageService.deleteMessage(messageId, req.user);

      return res.status(200).json(result);
    } catch (err) {
      logger.error('deleteMessage error:', err.message);
      const status = err.message.includes('Unauthorized') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'Error deleting message'
      });
    }
  }

  async uploadAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const isVideo = req.file.mimetype.startsWith('video/');
      const isImage = req.file.mimetype.startsWith('image/');
      let fileUrl = null;

      try {
        const { handleFileUpload } = require('../../../services/uploadService');
        fileUrl = await handleFileUpload(req.file, isVideo);
      } catch (uploadErr) {
        logger.error('handleFileUpload error in chat:', uploadErr.message);
      }

      if (!fileUrl) {
        const backendBase = process.env.BACKEND_URL || 'http://localhost:5000';
        fileUrl = `${backendBase}/uploads/${req.file.filename}`;
      }

      let messageType = MESSAGE_TYPES.FILE;
      if (isImage) {
        messageType = MESSAGE_TYPES.IMAGE;
      } else if (isVideo) {
        messageType = MESSAGE_TYPES.VIDEO;
      }

      return res.status(200).json({
        success: true,
        attachment: {
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          messageType
        }
      });
    } catch (err) {
      logger.error('uploadAttachment error:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
  }
}

module.exports = new MessageController();

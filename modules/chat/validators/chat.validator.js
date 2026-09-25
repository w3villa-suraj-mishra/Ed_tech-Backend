const { CONVERSATION_STATUS } = require('../constants/chatConstants');

const validateSendMessage = (req, res, next) => {
  const { content, attachmentUrl, clientMessageId } = req.body;
  if ((!content || !content.trim()) && !attachmentUrl) {
    return res.status(400).json({
      success: false,
      message: 'Message content or attachment is required'
    });
  }

  if (content && content.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Message exceeds maximum length of 5000 characters'
    });
  }

  next();
};

const validateConversationStatus = (req, res, next) => {
  const { status } = req.body;
  if (!status || !Object.values(CONVERSATION_STATUS).includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${Object.values(CONVERSATION_STATUS).join(', ')}`
    });
  }
  next();
};

module.exports = {
  validateSendMessage,
  validateConversationStatus
};

const messageRepository = require('../repositories/message.repository');
const conversationRepository = require('../repositories/conversation.repository');
const notificationService = require('./notification.service');
const { CONVERSATION_STATUS, SENDER_TYPES, MESSAGE_TYPES } = require('../constants/chatConstants');

class MessageService {
  async sendMessage({
    conversationId,
    senderUser,
    content,
    messageType = MESSAGE_TYPES.TEXT,
    attachmentUrl = null,
    attachmentName = null,
    attachmentSize = null,
    attachmentMime = null,
    clientMessageId = null
  }) {
    // 1. Deduplication / Idempotency check
    if (clientMessageId) {
      const existing = await messageRepository.findByClientMessageId(clientMessageId);
      if (existing) {
        return existing;
      }
    }

    // 2. Validate conversation access
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isStaff = senderUser.accountType === 'Admin' || senderUser.accountType === 'Superadmin';
    if (!isStaff && String(conversation.userId) !== String(senderUser.id)) {
      throw new Error('Unauthorized to post to this conversation');
    }

    // Determine sender type
    let senderType = SENDER_TYPES.USER;
    if (senderUser.accountType === 'Superadmin') {
      senderType = SENDER_TYPES.SUPER_ADMIN;
    } else if (senderUser.accountType === 'Admin') {
      senderType = SENDER_TYPES.ADMIN;
    }

    // Auto-reopen conversation if closed and someone sends a message
    if (conversation.status === CONVERSATION_STATUS.CLOSED) {
      await conversationRepository.update(conversation.id, {
        status: conversation.assignedTo ? CONVERSATION_STATUS.OPEN : CONVERSATION_STATUS.UNASSIGNED,
        closedAt: null
      });
    }

    // 3. Create message
    const now = new Date();
    const message = await messageRepository.create({
      conversationId,
      senderId: senderUser.id,
      senderType,
      messageType,
      content: content ? content.trim() : null,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMime,
      clientMessageId,
      deliveredAt: now
    });

    // 4. Update conversation metadata and restore userDeletedAt if staff replied
    const conversationUpdates = {
      lastMessageId: message.id,
      lastMessageContent: message.content || (attachmentName ? `[Attachment: ${attachmentName}]` : '[Attachment]'),
      lastMessageAt: now
    };

    if (isStaff && conversation.userDeletedAt) {
      conversationUpdates.userDeletedAt = null;
    }

    // If unassigned student chat and staff replied, auto-assign to that staff
    if (isStaff && !conversation.assignedTo) {
      conversationUpdates.assignedTo = senderUser.id;
      conversationUpdates.assignedRole = senderUser.accountType;
      conversationUpdates.status = CONVERSATION_STATUS.OPEN;
    }

    await conversationRepository.update(conversation.id, conversationUpdates);

    // 5. Send notification to the opposite party
    const senderName = `${senderUser.firstName || ''} ${senderUser.lastName || ''}`.trim() || 'User';
    if (isStaff) {
      // Notify the student
      await notificationService.notifyNewMessage({
        recipientId: conversation.userId,
        senderName,
        conversationId: conversation.id,
        messageText: message.content
      });
    } else {
      // Notify assigned staff, or if unassigned, notify staff in general
      if (conversation.assignedTo) {
        await notificationService.notifyNewMessage({
          recipientId: conversation.assignedTo,
          senderName,
          conversationId: conversation.id,
          messageText: message.content
        });
      }
    }

    return await messageRepository.findById(message.id);
  }

  async getMessages(conversationId, { limit = 50, beforeMessageId = null }, requestingUser) {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isStaff = requestingUser.accountType === 'Admin' || requestingUser.accountType === 'Superadmin';
    if (!isStaff && String(conversation.userId) !== String(requestingUser.id)) {
      throw new Error('Unauthorized');
    }

    // Auto-mark opposite party messages as read
    const readerType = isStaff ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER;
    await messageRepository.markAsRead(conversationId, readerType);

    const messages = await messageRepository.findByConversation(conversationId, {
      limit: parseInt(limit, 10) || 50,
      beforeMessageId: beforeMessageId ? parseInt(beforeMessageId, 10) : null
    });

    return messages;
  }

  async markAsRead(conversationId, readerUser) {
    const isStaff = readerUser.accountType === 'Admin' || readerUser.accountType === 'Superadmin';
    const readerType = isStaff ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER;
    await messageRepository.markAsRead(conversationId, readerType);
    return { success: true };
  }

  async deleteMessage(messageId, user) {
    const message = await messageRepository.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const isStaff = user.accountType === 'Admin' || user.accountType === 'Superadmin';
    if (!isStaff && String(message.senderId) !== String(user.id)) {
      throw new Error('Unauthorized to delete this message');
    }

    await messageRepository.softDelete(messageId);
    return { success: true, message: 'Message deleted' };
  }
}

module.exports = new MessageService();

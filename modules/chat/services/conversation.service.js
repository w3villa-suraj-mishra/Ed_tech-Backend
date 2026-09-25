const conversationRepository = require('../repositories/conversation.repository');
const messageRepository = require('../repositories/message.repository');
const User = require('../../../models/User');
const { CONVERSATION_STATUS, SENDER_TYPES, MESSAGE_TYPES } = require('../constants/chatConstants');

let tablesSynced = false;
async function ensureTablesSynced() {
  if (tablesSynced) return;
  try {
    const { Conversation, Message } = require('../models');
    if (Conversation && Message) {
      await Conversation.sync();
      await Message.sync();
    }
    tablesSynced = true;
  } catch (e) {
    // If sync already ran or handled, continue
  }
}

class ConversationService {
  /**
   * Start a new conversation or retrieve current active one for student
   */
  async getOrCreateUserConversation({
    userId,
    courseId = null,
    pageContext = null,
    lessonId = null,
    orderId = null,
    initialMessage = null
  }) {
    await ensureTablesSynced();
    // Check if there is already an active (unclosed) conversation
    let conversation = await conversationRepository.findActiveByUser(userId, courseId);

    let isNew = false;
    if (!conversation) {
      conversation = await conversationRepository.create({
        userId,
        courseId: courseId || null,
        pageContext: pageContext || null,
        lessonId: lessonId || null,
        orderId: orderId || null,
        status: CONVERSATION_STATUS.UNASSIGNED
      });
      isNew = true;

      // Create SYSTEM message: "Conversation started"
      await messageRepository.create({
        conversationId: conversation.id,
        senderId: null,
        senderType: SENDER_TYPES.SYSTEM,
        messageType: MESSAGE_TYPES.SYSTEM,
        content: 'Conversation started'
      });
    } else {
      // If user had soft-deleted it, un-delete it because they're reopening chat
      if (conversation.userDeletedAt) {
        await conversationRepository.update(conversation.id, {
          userDeletedAt: null
        });
      }
      // Update page context if provided
      if (pageContext && conversation.pageContext !== pageContext) {
        await conversationRepository.update(conversation.id, {
          pageContext,
          courseId: courseId || conversation.courseId
        });
      }
    }

    // If initialMessage was sent alongside create
    if (initialMessage && initialMessage.trim()) {
      const now = new Date();
      const userMsg = await messageRepository.create({
        conversationId: conversation.id,
        senderId: userId,
        senderType: SENDER_TYPES.USER,
        messageType: MESSAGE_TYPES.TEXT,
        content: initialMessage.trim(),
        deliveredAt: now
      });

      await conversationRepository.update(conversation.id, {
        lastMessageId: userMsg.id,
        lastMessageContent: userMsg.content,
        lastMessageAt: now
      });
    }

    return await conversationRepository.findById(conversation.id);
  }

  async getUserConversations(userId, { limit = 20, offset = 0, includeArchived = false } = {}) {
    await ensureTablesSynced();
    const { count, rows } = await conversationRepository.findByUser(userId, {
      limit,
      offset,
      includeArchived
    });

    const enriched = await Promise.all(
      rows.map(async (conv) => {
        const unreadCount = await conversationRepository.countUnreadForUser(conv.id);
        const json = conv.toJSON();
        json.unreadCount = unreadCount;
        return json;
      })
    );

    return { count, conversations: enriched };
  }

  async getConversationDetails(conversationId, requestingUser) {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Role-based access control
    const isStaff = requestingUser.accountType === 'Admin' || requestingUser.accountType === 'Superadmin';
    if (!isStaff && String(conversation.userId) !== String(requestingUser.id)) {
      throw new Error('Unauthorized access to this conversation');
    }

    const unreadCount = isStaff
      ? await conversationRepository.countUnreadForStaff(conversation.id)
      : await conversationRepository.countUnreadForUser(conversation.id);

    const json = conversation.toJSON();
    json.unreadCount = unreadCount;
    return json;
  }

  async getAdminConversations(query, adminUser) {
    await ensureTablesSynced();
    const isSuperAdmin = adminUser.accountType === 'Superadmin';
    const limit = parseInt(query.limit, 10) || 20;
    const page = parseInt(query.page, 10) || 1;
    const offset = (page - 1) * limit;

    const { count, rows } = await conversationRepository.findAllAdmin({
      status: query.status,
      assignedTo: query.assignedTo,
      search: query.search,
      courseId: query.courseId,
      limit,
      offset,
      isSuperAdmin,
      adminId: adminUser.id,
      myChatsOnly: query.myChatsOnly === 'true'
    });

    const enriched = await Promise.all(
      rows.map(async (conv) => {
        const unreadCount = await conversationRepository.countUnreadForStaff(conv.id);
        const json = conv.toJSON();
        json.unreadCount = unreadCount;
        return json;
      })
    );

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
      conversations: enriched
    };
  }

  async updateStatus(conversationId, newStatus, actingUser) {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!Object.values(CONVERSATION_STATUS).includes(newStatus)) {
      throw new Error('Invalid conversation status');
    }

    const oldStatus = conversation.status;
    const updateData = { status: newStatus };

    if (newStatus === CONVERSATION_STATUS.CLOSED) {
      updateData.closedAt = new Date();
    } else {
      updateData.closedAt = null;
    }

    const updated = await conversationRepository.update(conversationId, updateData);

    // Create system message for status change
    const userName = `${actingUser.firstName || ''} ${actingUser.lastName || ''}`.trim() || 'Staff';
    const systemMessage = await messageRepository.create({
      conversationId,
      senderId: null,
      senderType: SENDER_TYPES.SYSTEM,
      messageType: MESSAGE_TYPES.SYSTEM,
      content: `Conversation status changed from ${oldStatus} to ${newStatus} by ${userName}`
    });

    return { conversation: updated, systemMessage };
  }

  async archiveUserConversation(conversationId, userId) {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (String(conversation.userId) !== String(userId)) {
      throw new Error('Unauthorized');
    }

    // Soft delete: sets userDeletedAt
    await conversationRepository.update(conversationId, {
      userDeletedAt: new Date()
    });

    return { success: true, message: 'Conversation archived successfully' };
  }

  async getAdminsList() {
    const admins = await User.findAll({
      where: {
        accountType: ['Admin', 'Superadmin'],
        active: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
    });
    return admins;
  }
}

module.exports = new ConversationService();

const conversationService = require('../services/conversation.service');
const messageService = require('../services/message.service');
const assignmentService = require('../services/assignment.service');
const { Conversation, Message } = require('../models');
const User = require('../../../models/User');
const { CONVERSATION_STATUS, SENDER_TYPES, MESSAGE_TYPES } = require('../constants/chatConstants');

describe('Chat Module Tests', () => {
  let testStudent;
  let testAdmin;
  let testSuperAdmin;
  let createdConversationId;

  beforeAll(async () => {
    // Look up existing users in DB or find by accountType
    testStudent = await User.findOne({ where: { accountType: 'Student' } });
    testSuperAdmin = await User.findOne({ where: { accountType: 'Superadmin' } });
    testAdmin = await User.findOne({ where: { accountType: 'Admin' } }) || testSuperAdmin;

    expect(testStudent).toBeDefined();
    expect(testSuperAdmin).toBeDefined();
  });

  afterAll(async () => {
    if (createdConversationId) {
      await Message.destroy({ where: { conversationId: createdConversationId } });
      await Conversation.destroy({ where: { id: createdConversationId } });
    }
  });

  test('User can start a conversation with initial message and page context', async () => {
    const conv = await conversationService.getOrCreateUserConversation({
      userId: testStudent.id,
      pageContext: 'course-details',
      initialMessage: 'Hello, I need help with enrollment.'
    });

    expect(conv).toBeDefined();
    createdConversationId = conv.id;
    expect(String(conv.userId)).toBe(String(testStudent.id));
    expect(conv.pageContext).toBe('course-details');
    expect(conv.status).toBe(CONVERSATION_STATUS.UNASSIGNED);

    // Check message persistence
    const messages = await messageService.getMessages(conv.id, {}, testStudent);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const userMsg = messages.find(m => String(m.senderId) === String(testStudent.id));
    expect(userMsg).toBeDefined();
    expect(userMsg.content).toBe('Hello, I need help with enrollment.');
  });

  test('Superadmin can assign conversation to Admin/Staff', async () => {
    const { conversation, systemMessage } = await assignmentService.assignConversation({
      conversationId: createdConversationId,
      assignedToId: testAdmin.id,
      assignedByUser: testSuperAdmin
    });

    expect(String(conversation.assignedTo)).toBe(String(testAdmin.id));
    expect(conversation.status).toBe(CONVERSATION_STATUS.OPEN);
    expect(systemMessage.messageType).toBe(MESSAGE_TYPES.SYSTEM);
    expect(systemMessage.content).toContain('Conversation assigned');
  });

  test('Staff can reply and unread count is updated correctly', async () => {
    const reply = await messageService.sendMessage({
      conversationId: createdConversationId,
      senderUser: testAdmin,
      content: 'Hi! I am here to help you.',
      clientMessageId: 'test-client-id-123'
    });

    expect(reply).toBeDefined();
    expect(String(reply.senderId)).toBe(String(testAdmin.id));

    // Idempotency test: duplicate send with same clientMessageId returns original
    const duplicate = await messageService.sendMessage({
      conversationId: createdConversationId,
      senderUser: testAdmin,
      content: 'Hi! I am here to help you.',
      clientMessageId: 'test-client-id-123'
    });
    expect(duplicate.id).toBe(reply.id);

    // Unread count for student
    const studentConv = await conversationService.getUserConversations(testStudent.id);
    const target = studentConv.conversations.find(c => c.id === createdConversationId);
    expect(target).toBeDefined();
    expect(target.unreadCount).toBeGreaterThanOrEqual(1);
  });

  test('User reading conversation marks messages read', async () => {
    await messageService.markAsRead(createdConversationId, testStudent);
    const messages = await messageService.getMessages(createdConversationId, {}, testStudent);
    const staffMsg = messages.find(m => m.senderId === testAdmin.id);
    if (staffMsg) {
      expect(staffMsg.readAt).not.toBeNull();
    }
  });

  test('Status can be updated to CLOSED and auto-reopens on new message', async () => {
    const { conversation } = await conversationService.updateStatus(
      createdConversationId,
      CONVERSATION_STATUS.CLOSED,
      testAdmin
    );
    expect(conversation.status).toBe(CONVERSATION_STATUS.CLOSED);
    expect(conversation.closedAt).not.toBeNull();

    // Student sends new message -> auto reopens
    await messageService.sendMessage({
      conversationId: createdConversationId,
      senderUser: testStudent,
      content: 'Wait, I have one more question!'
    });

    const refreshed = await conversationService.getConversationDetails(createdConversationId, testStudent);
    expect(refreshed.status).toBe(CONVERSATION_STATUS.OPEN);
    expect(refreshed.closedAt).toBeNull();
  });

  test('User archive/delete conversation performs soft delete (userDeletedAt set)', async () => {
    const res = await conversationService.archiveUserConversation(createdConversationId, testStudent.id);
    expect(res.success).toBe(true);

    const userConvs = await conversationService.getUserConversations(testStudent.id, { includeArchived: false });
    const existsForUser = userConvs.conversations.some(c => c.id === createdConversationId);
    expect(existsForUser).toBe(false);

    // Admin can still view it
    const adminConvs = await conversationService.getAdminConversations({}, testAdmin);
    const existsForAdmin = adminConvs.conversations.some(c => c.id === createdConversationId);
    expect(existsForAdmin).toBe(true);
  });
});

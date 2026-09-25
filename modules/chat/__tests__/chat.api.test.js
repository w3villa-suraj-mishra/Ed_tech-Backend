const request = require('supertest');
const app = require('../../../server');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const { Conversation, Message } = require('../models');

describe('Chat REST API Integration Tests', () => {
  let studentUser;
  let adminUser;
  let studentToken;
  let adminToken;
  let conversationId;

  beforeAll(async () => {
    studentUser = await User.findOne({ where: { accountType: 'Student' } });
    adminUser = await User.findOne({ where: { accountType: 'Superadmin' } });

    const secret = process.env.JWT_SECRET || 'Secret123';
    studentToken = jwt.sign(
      { userId: studentUser.id, user_id: studentUser.id, email: studentUser.email, accountType: studentUser.accountType },
      secret,
      { expiresIn: '1d' }
    );
    adminToken = jwt.sign(
      { userId: adminUser.id, user_id: adminUser.id, email: adminUser.email, accountType: adminUser.accountType },
      secret,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    if (conversationId) {
      await Message.destroy({ where: { conversationId } });
      await Conversation.destroy({ where: { id: conversationId } });
    }
  });

  test('POST /api/conversations - Student creates or gets active conversation', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        pageContext: 'checkout',
        initialMessage: 'Hi, testing chat API.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.conversation).toBeDefined();
    conversationId = res.body.conversation.id;
  });

  test('GET /api/conversations/:id/messages - Returns paginated messages', async () => {
    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages?limit=20`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('POST /api/conversations/:id/messages - Student sends message', async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Another question via API.',
        clientMessageId: 'api-test-client-msg-1'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message.content).toBe('Another question via API.');
  });

  test('GET /api/admin/conversations - Admin lists all conversations', async () => {
    const res = await request(app)
      .get('/api/admin/conversations?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.conversations).toBeDefined();
  });

  test('PATCH /api/admin/conversations/:id/status - Admin changes status to PENDING', async () => {
    const res = await request(app)
      .patch(`/api/admin/conversations/${conversationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PENDING' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.conversation.status).toBe('PENDING');
  });

  test('GET /api/admin/conversations/admins-list - Lists eligible staff for assignment', async () => {
    const res = await request(app)
      .get('/api/admin/conversations/admins-list')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.admins)).toBe(true);
  });
});

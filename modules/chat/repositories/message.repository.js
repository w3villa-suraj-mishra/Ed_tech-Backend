const { Op } = require('sequelize');
const { Message } = require('../models');
const User = require('../../../models/User');
const { SENDER_TYPES } = require('../constants/chatConstants');

class MessageRepository {
  async create(data, options = {}) {
    return await Message.create(data, options);
  }

  async findByClientMessageId(clientMessageId) {
    if (!clientMessageId) return null;
    return await Message.findOne({
      where: { clientMessageId }
    });
  }

  async findById(id, options = {}) {
    return await Message.findByPk(id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        }
      ],
      ...options
    });
  }

  async findByConversation(conversationId, { limit = 50, beforeMessageId = null } = {}) {
    const where = { conversationId };

    if (beforeMessageId) {
      where.id = { [Op.lt]: beforeMessageId };
    }

    const messages = await Message.findAll({
      where,
      limit,
      order: [['id', 'DESC']],
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        }
      ]
    });

    // Return in chronological order (oldest to newest)
    return messages.reverse();
  }

  async markAsDelivered(conversationId, recipientType) {
    const where = {
      conversationId,
      deliveredAt: null
    };

    if (recipientType === SENDER_TYPES.USER) {
      // User is recipient -> mark messages sent by Admin/Staff
      where.senderType = {
        [Op.in]: [SENDER_TYPES.ADMIN, SENDER_TYPES.SUPER_ADMIN, SENDER_TYPES.SYSTEM]
      };
    } else {
      // Staff is recipient -> mark messages sent by User
      where.senderType = SENDER_TYPES.USER;
    }

    return await Message.update(
      { deliveredAt: new Date() },
      { where }
    );
  }

  async markAsRead(conversationId, readerType) {
    const where = {
      conversationId,
      readAt: null
    };

    const now = new Date();

    if (readerType === SENDER_TYPES.USER) {
      // User is reading -> mark staff messages as read
      where.senderType = {
        [Op.in]: [SENDER_TYPES.ADMIN, SENDER_TYPES.SUPER_ADMIN, SENDER_TYPES.SYSTEM]
      };
    } else {
      // Staff is reading -> mark user messages as read
      where.senderType = SENDER_TYPES.USER;
    }

    return await Message.update(
      {
        readAt: now,
        deliveredAt: now // reading implies delivered
      },
      { where }
    );
  }

  async softDelete(id) {
    return await Message.update(
      {
        deletedAt: new Date(),
        content: 'This message was deleted'
      },
      { where: { id } }
    );
  }
}

module.exports = new MessageRepository();

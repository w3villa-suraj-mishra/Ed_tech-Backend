const { Op } = require('sequelize');
const { Conversation, Message } = require('../models');
const User = require('../../../models/User');
const Course = require('../../../models/Course');
const { CONVERSATION_STATUS, SENDER_TYPES } = require('../constants/chatConstants');

class ConversationRepository {
  async create(data, options = {}) {
    return await Conversation.create(data, options);
  }

  async findById(id, options = {}) {
    return await Conversation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'courseName', 'thumbnail', 'price']
        }
      ],
      ...options
    });
  }

  async findActiveByUser(userId, courseId = null) {
    const where = {
      userId,
      userDeletedAt: null,
      status: {
        [Op.in]: [CONVERSATION_STATUS.UNASSIGNED, CONVERSATION_STATUS.OPEN, CONVERSATION_STATUS.PENDING]
      }
    };
    if (courseId) {
      where.courseId = courseId;
    }
    return await Conversation.findOne({
      where,
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'courseName', 'thumbnail', 'price']
        }
      ]
    });
  }

  async findByUser(userId, { limit = 20, offset = 0, includeArchived = false } = {}) {
    const where = { userId };
    if (!includeArchived) {
      where.userDeletedAt = null;
    }

    const { count, rows } = await Conversation.findAndCountAll({
      where,
      limit,
      offset,
      order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'courseName', 'thumbnail', 'price']
        }
      ]
    });

    return { count, rows };
  }

  async findAllAdmin({
    status,
    assignedTo,
    search,
    courseId,
    limit = 20,
    offset = 0,
    isSuperAdmin = false,
    adminId = null,
    myChatsOnly = false
  } = {}) {
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (myChatsOnly && adminId) {
      where.assignedTo = adminId;
    } else if (assignedTo) {
      if (assignedTo === 'UNASSIGNED') {
        where.assignedTo = null;
      } else {
        where.assignedTo = assignedTo;
      }
    } else if (!isSuperAdmin && adminId) {
      // Normal admin sees unassigned or assigned to them
      where[Op.or] = [
        { assignedTo: adminId },
        { assignedTo: null }
      ];
    }

    if (courseId) {
      where.courseId = courseId;
    }

    const userIncludeWhere = {};
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      userIncludeWhere[Op.or] = [
        { firstName: { [Op.iLike]: term } },
        { lastName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } }
      ];
    }

    const { count, rows } = await Conversation.findAndCountAll({
      where,
      limit,
      offset,
      order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          where: Object.keys(userIncludeWhere).length > 0 ? userIncludeWhere : undefined,
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'accountType']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'courseName', 'thumbnail', 'price']
        }
      ]
    });

    return { count, rows };
  }

  async update(id, data, options = {}) {
    await Conversation.update(data, {
      where: { id },
      ...options
    });
    return await this.findById(id);
  }

  async countUnreadForUser(conversationId) {
    return await Message.count({
      where: {
        conversationId,
        senderType: {
          [Op.in]: [SENDER_TYPES.ADMIN, SENDER_TYPES.SUPER_ADMIN, SENDER_TYPES.SYSTEM]
        },
        readAt: null,
        deletedAt: null
      }
    });
  }

  async countUnreadForStaff(conversationId) {
    return await Message.count({
      where: {
        conversationId,
        senderType: SENDER_TYPES.USER,
        readAt: null,
        deletedAt: null
      }
    });
  }
}

module.exports = new ConversationRepository();

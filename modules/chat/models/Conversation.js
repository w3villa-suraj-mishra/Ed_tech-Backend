const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');
const { CONVERSATION_STATUS } = require('../constants/chatConstants');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_to'
  },
  assignedRole: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'assigned_role'
  },
  status: {
    type: DataTypes.ENUM(
      CONVERSATION_STATUS.UNASSIGNED,
      CONVERSATION_STATUS.OPEN,
      CONVERSATION_STATUS.PENDING,
      CONVERSATION_STATUS.CLOSED
    ),
    defaultValue: CONVERSATION_STATUS.UNASSIGNED,
    allowNull: false
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'course_id'
  },
  lessonId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lesson_id'
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'order_id'
  },
  pageContext: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'page_context'
  },
  lastMessageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'last_message_id'
  },
  lastMessageContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_message_content'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_message_at'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at'
  },
  userDeletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'user_deleted_at'
  }
}, {
  tableName: 'conversations',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['assigned_to'] },
    { fields: ['status'] },
    { fields: ['last_message_at'] },
    { fields: ['user_deleted_at'] }
  ]
});

module.exports = Conversation;

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');
const { SENDER_TYPES, MESSAGE_TYPES } = require('../constants/chatConstants');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'conversation_id'
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sender_id'
  },
  senderType: {
    type: DataTypes.ENUM(
      SENDER_TYPES.USER,
      SENDER_TYPES.ADMIN,
      SENDER_TYPES.SUPER_ADMIN,
      SENDER_TYPES.SYSTEM
    ),
    allowNull: false,
    field: 'sender_type'
  },
  messageType: {
    type: DataTypes.ENUM(
      MESSAGE_TYPES.TEXT,
      MESSAGE_TYPES.IMAGE,
      MESSAGE_TYPES.FILE,
      MESSAGE_TYPES.VIDEO,
      MESSAGE_TYPES.SYSTEM
    ),
    defaultValue: MESSAGE_TYPES.TEXT,
    allowNull: false,
    field: 'message_type'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachmentUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'attachment_url'
  },
  attachmentName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'attachment_name'
  },
  attachmentSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'attachment_size'
  },
  attachmentMime: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'attachment_mime'
  },
  clientMessageId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'client_message_id'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'delivered_at'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  }
}, {
  tableName: 'messages',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['conversation_id'] },
    { fields: ['sender_id'] },
    { fields: ['created_at'] },
    { fields: ['read_at'] },
    { fields: ['client_message_id'] }
  ]
});

module.exports = Message;

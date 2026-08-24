const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. COURSE_PURCHASED, PAYMENT_SUCCESS, COURSE_COMPLETED, CERTIFICATE_AVAILABLE, NEW_COMMENT, COMMENT_REPLY, NEW_REVIEW, NEW_LESSON, PLAN_ACTIVATED, PLAN_EXPIRING, PLATFORM_ANNOUNCEMENT'
  },
  source: {
    type: DataTypes.ENUM('SYSTEM', 'ADMIN', 'INSTRUCTOR'),
    allowNull: false,
    defaultValue: 'SYSTEM'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'entity_id'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  }
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['user_id', 'is_read']
    },
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['type']
    },
    {
      fields: ['entity_type', 'entity_id']
    }
  ]
});

module.exports = Notification;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  highlightText: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'highlight_text'
  },
  audience: {
    type: DataTypes.ENUM('ALL', 'STUDENTS', 'INSTRUCTORS'),
    allowNull: false,
    defaultValue: 'ALL'
  },
  ctaEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'cta_enabled'
  },
  ctaText: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'cta_text'
  },
  ctaUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'cta_url'
  },
  countdownEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'countdown_enabled'
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_at'
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_at'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'ARCHIVED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Normal', 'High'),
    allowNull: false,
    defaultValue: 'Normal'
  },
  dismissible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'announcements',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['audience'] },
    { fields: ['start_at'] },
    { fields: ['end_at'] },
    { fields: ['priority'] }
  ]
});

module.exports = Announcement;

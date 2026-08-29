const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AnnouncementDismissal = sequelize.define('AnnouncementDismissal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  announcementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'announcement_id',
    references: {
      model: 'announcements',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  dismissedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'dismissed_at'
  }
}, {
  tableName: 'announcement_dismissals',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['announcement_id', 'user_id']
    }
  ]
});

module.exports = AnnouncementDismissal;

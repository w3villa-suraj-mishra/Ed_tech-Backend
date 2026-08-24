const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LiveChatMessage = sequelize.define('LiveChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  liveSessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'live_session_id',
    references: {
      model: 'live_sessions',
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
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'live_chat_messages',
  underscored: true,
  timestamps: true
});

module.exports = LiveChatMessage;

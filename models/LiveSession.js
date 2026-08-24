const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LiveSession = sequelize.define('LiveSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'course_id',
    references: {
      model: 'courses',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sessionName: {
    type: DataTypes.STRING,
    field: 'session_name',
    allowNull: true
  },
  startTime: {
    type: DataTypes.DATE,
    field: 'start_time',
    allowNull: true
  },
  endTime: {
    type: DataTypes.DATE,
    field: 'end_time',
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Scheduled'
  }
}, {
  tableName: 'live_sessions',
  underscored: true,
  timestamps: true
});

module.exports = LiveSession;

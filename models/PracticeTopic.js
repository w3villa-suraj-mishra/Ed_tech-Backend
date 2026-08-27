const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PracticeTopic = sequelize.define('PracticeTopic', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'practice_topics',
  timestamps: true,
});

module.exports = PracticeTopic;

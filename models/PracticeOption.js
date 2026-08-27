const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PracticeOption = sequelize.define('PracticeOption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  optionText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'practice_options',
  timestamps: true,
});

module.exports = PracticeOption;

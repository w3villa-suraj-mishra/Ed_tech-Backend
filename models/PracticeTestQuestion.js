const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PracticeTestQuestion = sequelize.define('PracticeTestQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  testId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'practice_test_questions',
  timestamps: true,
});

module.exports = PracticeTestQuestion;

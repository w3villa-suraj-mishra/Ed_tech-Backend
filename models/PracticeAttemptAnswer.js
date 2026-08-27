const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PracticeAttemptAnswer = sequelize.define('PracticeAttemptAnswer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  attemptId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  selectedOptionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  userCode: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  userInterviewAnswer: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  marksAwarded: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'practice_attempt_answers',
  timestamps: true,
});

module.exports = PracticeAttemptAnswer;

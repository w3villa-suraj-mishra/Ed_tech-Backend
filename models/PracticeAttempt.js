const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PracticeAttempt = sequelize.define('PracticeAttempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  testId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null for standalone daily quiz or topic practice
  },
  testType: {
    type: DataTypes.ENUM('Daily Quiz', 'Topic Practice', 'Course Test', 'Mock Test', 'Coding Problem', 'Interview Question'),
    allowNull: false,
    defaultValue: 'Daily Quiz',
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  correctCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  wrongCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  skippedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  totalMarks: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  percentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  timeTaken: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Passed', 'Failed', 'Completed'),
    allowNull: false,
    defaultValue: 'Completed',
  },
  analytics: {
    type: DataTypes.JSON, // { strongTopics: [], weakTopics: [], recommendedPractice: [] }
    allowNull: true,
  }
}, {
  tableName: 'practice_attempts',
  timestamps: true,
});

module.exports = PracticeAttempt;

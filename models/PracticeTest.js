const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PracticeTest = sequelize.define('PracticeTest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  testType: {
    type: DataTypes.ENUM('Daily Quiz', 'Topic Practice', 'Course Test', 'Mock Test', 'Interview Test'),
    allowNull: false,
    defaultValue: 'Mock Test',
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  topicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false,
    defaultValue: 15,
  },
  totalMarks: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 10,
  },
  passingPercentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 40,
  },
  numberOfQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
  randomizeQuestions: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  randomizeOptions: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  allowReattempt: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    allowNull: false,
    defaultValue: 'published',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdByRole: {
    type: DataTypes.STRING, // 'ADMIN' or 'INSTRUCTOR'
    allowNull: false,
    defaultValue: 'ADMIN',
  },
  scope: {
    type: DataTypes.ENUM('GLOBAL', 'COURSE'),
    allowNull: false,
    defaultValue: 'GLOBAL',
  },
}, {
  tableName: 'practice_tests',
  timestamps: true,
});

module.exports = PracticeTest;

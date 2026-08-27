const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PracticeQuestion = sequelize.define('PracticeQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('MCQ', 'Coding', 'Interview'),
    allowNull: false,
    defaultValue: 'MCQ',
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  topicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
    allowNull: false,
    defaultValue: 'Easy',
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  marks: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1,
  },
  negativeMarks: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  // Extra fields for Coding Problems
  codingDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    // Schema: { problemStatement, inputFormat, outputFormat, constraints, exampleInput, exampleOutput, starterCode, language, testCases: [{input, output}] }
  },
  // Extra fields for Interview Questions
  interviewDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    // Schema: { sampleAnswer, keyPoints, companyTags }
  }
}, {
  tableName: 'practice_questions',
  timestamps: true,
});

module.exports = PracticeQuestion;

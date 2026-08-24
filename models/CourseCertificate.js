const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseCertificate = sequelize.define('CourseCertificate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  certificateId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'certificate_id'
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
  instructorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'instructor_id'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'completed_at'
  },
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'issued_at'
  }
}, {
  tableName: 'course_certificates',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'course_id']
    }
  ]
});

module.exports = CourseCertificate;

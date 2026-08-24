const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseProgressVideo = sequelize.define('CourseProgressVideo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseProgressId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'course_progress_id',
    references: {
      model: 'course_progresses',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subSectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sub_section_id',
    references: {
      model: 'sub_sections',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'course_progress_videos',
  underscored: true,
  timestamps: true
});

module.exports = CourseProgressVideo;

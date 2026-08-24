const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Section = sequelize.define('Section', {
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
  sectionName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'section_name'
  }
}, {
  tableName: 'sections',
  underscored: true,
  timestamps: true
});

module.exports = Section;

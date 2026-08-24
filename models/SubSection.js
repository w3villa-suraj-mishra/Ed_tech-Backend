const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubSection = sequelize.define('SubSection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'section_id',
    references: {
      model: 'sections',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  videoUrl: {
    type: DataTypes.STRING,
    field: 'video_url',
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  timeDuration: {
    type: DataTypes.STRING,
    field: 'time_duration',
    allowNull: true
  }
}, {
  tableName: 'sub_sections',
  underscored: true,
  timestamps: true
});

module.exports = SubSection;

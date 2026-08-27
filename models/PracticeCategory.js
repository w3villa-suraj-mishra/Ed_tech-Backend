const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PracticeCategory = sequelize.define('PracticeCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'practice_categories',
  timestamps: true,
});

module.exports = PracticeCategory;

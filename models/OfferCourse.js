const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OfferCourse = sequelize.define('OfferCourse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  offerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'offer_id',
    references: {
      model: 'offers',
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
  }
}, {
  tableName: 'offer_courses',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['offer_id', 'course_id'], unique: true }
  ]
});

module.exports = OfferCourse;

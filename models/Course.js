const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'course_name'
  },
  courseDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'course_description'
  },
  whatYouWillLearn: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'what_you_will_learn'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_price'
  },
  discountType: {
    type: DataTypes.ENUM('none', 'percentage', 'fixed'),
    allowNull: false,
    defaultValue: 'none',
    field: 'discount_type'
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_value'
  },
  offerStartAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'offer_start_at'
  },
  offerEndAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'offer_end_at'
  },
  tag: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Draft'
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  instructorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'instructor_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'courses',
  underscored: true,
  timestamps: true
});

module.exports = Course;

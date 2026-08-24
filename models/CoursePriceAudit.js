const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoursePriceAudit = sequelize.define('CoursePriceAudit', {
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
  changedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'changed_by_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  changedByRole: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'changed_by_role'
  },
  previousPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'previous_price'
  },
  newPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'new_price'
  },
  previousDiscountType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'previous_discount_type'
  },
  newDiscountType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'new_discount_type'
  },
  previousDiscountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'previous_discount_value'
  },
  newDiscountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'new_discount_value'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'course_price_audits',
  underscored: true,
  timestamps: true
});

module.exports = CoursePriceAudit;

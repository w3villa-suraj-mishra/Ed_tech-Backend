const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discountType: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false,
    field: 'discount_type'
  },
  discountValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'discount_value'
  },
  scope: {
    type: DataTypes.ENUM('ALL_COURSES', 'SELECTED_COURSES'),
    allowNull: false,
    defaultValue: 'ALL_COURSES'
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_at'
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_at'
  },
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_uses'
  },
  maxUsesPerUser: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_uses_per_user'
  },
  totalUses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_uses'
  },
  audience: {
    type: DataTypes.ENUM('ALL', 'STUDENTS', 'INSTRUCTORS'),
    allowNull: false,
    defaultValue: 'ALL'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'offers',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['status'] },
    { fields: ['start_at'] },
    { fields: ['end_at'] }
  ]
});

module.exports = Offer;

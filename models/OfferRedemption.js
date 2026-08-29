const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OfferRedemption = sequelize.define('OfferRedemption', {
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
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'course_id',
    references: {
      model: 'courses',
      key: 'id'
    }
  },
  plan: {
    type: DataTypes.ENUM('free', 'silver', 'gold'),
    allowNull: false,
    defaultValue: 'gold'
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'order_id'
  },
  discountAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'discount_amount'
  }
}, {
  tableName: 'offer_redemptions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['offer_id', 'user_id'], unique: true }, // Concurrency & Max Uses Per User protection
    { fields: ['user_id'] },
    { fields: ['course_id'] }
  ]
});

module.exports = OfferRedemption;

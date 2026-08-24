const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactUs = sequelize.define('ContactUs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  countrycode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Resolved', 'Ignored'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'ContactUs',
  timestamps: true
});

module.exports = ContactUs;

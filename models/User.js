const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcryptjs = require('bcryptjs');
const helpers = require('../utils/helpers');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  passwordDigest: {
    type: DataTypes.STRING,
    field: 'password_digest',
    allowNull: true
  },
  password: {
    type: DataTypes.VIRTUAL,
    allowNull: true
  },
  passwordConfirmation: {
    type: DataTypes.VIRTUAL,
    allowNull: true
  },
  accountType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'account_type',
    defaultValue: 'Student',
    validate: {
      isIn: {
        args: [['Superadmin', 'Admin', 'Student', 'Instructor']],
        msg: 'accountType must be one of Superadmin, Admin, Student, Instructor'
      }
    }
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  githubUid: {
    type: DataTypes.STRING,
    field: 'github_uid',
    allowNull: true
  },
  githubToken: {
    type: DataTypes.STRING,
    field: 'github_token',
    allowNull: true
  },
  googleUid: {
    type: DataTypes.STRING,
    field: 'google_uid',
    allowNull: true
  },
  googleToken: {
    type: DataTypes.STRING,
    field: 'google_token',
    allowNull: true
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    field: 'reset_password_expires',
    allowNull: true
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  hooks: {
    beforeCreate: hashPassword,
    beforeUpdate: hashPassword,
    afterCreate: createUserProfile
  }
});

// Hash password before saving
function hashPassword(user) {
  if (user.password) {
    if (user.password !== user.passwordConfirmation) {
      throw new Error('Passwords do not match');
    }
    user.passwordDigest = bcryptjs.hashSync(user.password, 10);
  }
}

// Create user profile after user creation
async function createUserProfile(user) {
  const Profile = require('./Profile');
  await Profile.create({ userId: user.id });
}

// Method to authenticate password
User.prototype.authenticate = function(password) {
  return bcryptjs.compareSync(password, this.passwordDigest);
};

module.exports = User;

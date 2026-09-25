const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const authenticateUser = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ success: false, message: 'Token missing' });
  }

  const token = header.split(' ').pop();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Secret123');
    const user = await User.findByPk(decoded.user_id || decoded.userId || decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    req.user = user;
    const role = String(user.accountType || decoded.account_type || '').toLowerCase();
    if (role.includes('admin') || role.includes('superadmin')) {
      req.admin = user;
    }
    next();
  } catch (error) {
    logger.error('AUTHENTICATION ERROR:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const setCurrentUserIfAuthenticated = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();

  const token = header.split(' ').pop();
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Secret123');
    const user = await User.findByPk(decoded.user_id || decoded.userId || decoded.id);
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // ignore invalid token for optional auth routes
  }
  next();
};

const isInstructor = (req, res, next) => {
  if (!req.user || req.user.accountType !== 'Instructor') {
    return res.status(403).json({ success: false, message: 'This is a protected route for Instructors' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  const user = req.user || req.admin;
  const role = String(user?.accountType || user?.account_type || '').toLowerCase();
  if (!user || (!role.includes('admin') && !role.includes('superadmin'))) {
    return res.status(403).json({ success: false, message: 'This is a protected route for Admins' });
  }
  next();
};

module.exports = {
  authenticateUser,
  setCurrentUserIfAuthenticated,
  isInstructor,
  isAdmin
};

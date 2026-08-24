const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Authenticate admin user from Bearer token.
 * Allows both 'Admin' and 'Superadmin' account types.
 */
const authenticateAdmin = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ success: false, message: 'Admin token missing' });
  }

  const token = header.split(' ').pop();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Secret123');
    const user = await User.findByPk(decoded.user_id || decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Admin user not found' });
    }

    if (!['Admin', 'Superadmin'].includes(user.accountType)) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required' });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, message: 'Admin account is deactivated' });
    }

    req.admin = user;
    next();
  } catch (error) {
    logger.error('ADMIN AUTH ERROR:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
};

/**
 * Require Superadmin role specifically.
 * Must be used after authenticateAdmin.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin || req.admin.accountType !== 'Superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Superadmin privileges required'
    });
  }
  next();
};

/**
 * Require at least Admin role.
 * Must be used after authenticateAdmin.
 */
const requireAdmin = (req, res, next) => {
  if (!req.admin || !['Admin', 'Superadmin'].includes(req.admin.accountType)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }
  next();
};

module.exports = {
  authenticateAdmin,
  requireSuperAdmin,
  requireAdmin
};

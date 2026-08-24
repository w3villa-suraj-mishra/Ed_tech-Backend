const { Notification, NotificationPreference } = require('../models');
const logger = require('../utils/logger');

let ioInstance = null;

const socketService = {
  init: (io) => {
    ioInstance = io;
  },
  getIO: () => ioInstance
};

const notificationService = {
  /**
   * Central method to validate, create, persist and emit real-time notification
   */
  create: async ({
    userId,
    type,
    source = 'SYSTEM',
    title,
    message,
    link = null,
    entityType = null,
    entityId = null,
    metadata = null
  }) => {
    try {
      if (!userId || !type || !title || !message) {
        logger.error('INVALID NOTIFICATION PARAMETERS:', { userId, type, title });
        return null;
      }

      // Check notification preferences if present
      const pref = await NotificationPreference.findOne({ where: { userId } });
      if (pref) {
        // Map non-critical types to preferences
        if (type.includes('LESSON') || type.includes('SECTION') || type.includes('UPDATE')) {
          if (!pref.newLessons && !pref.courseUpdates) return null;
        }
        if (type.includes('REVIEW') && !pref.courseReviews) return null;
        if (type.includes('REPLY') || type.includes('COMMENT')) {
          if (!pref.discussionReplies) return null;
        }
        if (type.includes('ANNOUNCEMENT') && !pref.platformAnnouncements) return null;
      }

      // Idempotency check: prevent duplicate notifications for exact same event created in last 10 seconds
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const duplicate = await Notification.findOne({
        where: {
          userId,
          type,
          entityType: entityType || null,
          entityId: entityId || null,
          createdAt: { [require('sequelize').Op.gte]: tenSecondsAgo }
        }
      });

      if (duplicate) {
        logger.info('DUPLICATE NOTIFICATION PREVENTED:', { userId, type });
        return duplicate;
      }

      // 1. Save to PostgreSQL
      const notification = await Notification.create({
        userId,
        type,
        source,
        title,
        message,
        link,
        entityType,
        entityId,
        metadata,
        isRead: false
      });

      // 2. Real-time delivery via Socket.IO
      const io = socketService.getIO();
      if (io) {
        io.to(`user:${userId}`).emit('notification:new', notification.toJSON());
      }

      return notification;
    } catch (error) {
      logger.error('NOTIFICATION SERVICE CREATE FAILED:', error.message);
      return null;
    }
  },

  /**
   * Helper to send targeted notifications to array of user IDs
   */
  notifyUsers: async (userIds, notificationPayload) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    const results = [];
    for (const uid of userIds) {
      const res = await notificationService.create({ ...notificationPayload, userId: uid });
      if (res) results.push(res);
    }
    return results;
  }
};

module.exports = {
  notificationService,
  socketService
};

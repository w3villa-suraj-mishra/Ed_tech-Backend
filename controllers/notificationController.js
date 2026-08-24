const { Notification, NotificationPreference, User, Course } = require('../models');
const { notificationService } = require('../services/notificationService');
const logger = require('../utils/logger');

const notificationController = {
  /**
   * GET /notifications
   * Fetch paginated notifications for logged-in user
   */
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await Notification.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const unreadCount = await Notification.count({
        where: { userId, isRead: false }
      });

      return res.status(200).json({
        success: true,
        data: {
          notifications: rows,
          totalCount: count,
          unreadCount,
          page,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('GET NOTIFICATIONS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /notifications/unread-count
   */
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const unreadCount = await Notification.count({
        where: { userId, isRead: false }
      });
      return res.status(200).json({ success: true, unreadCount });
    } catch (error) {
      logger.error('GET UNREAD COUNT FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PATCH /notifications/:id/read
   */
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({
        where: { id, userId }
      });

      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      await notification.update({
        isRead: true,
        readAt: new Date()
      });

      const unreadCount = await Notification.count({
        where: { userId, isRead: false }
      });

      return res.status(200).json({ success: true, notification, unreadCount });
    } catch (error) {
      logger.error('MARK AS READ FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PATCH /notifications/read-all
   */
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;

      await Notification.update(
        { isRead: true, readAt: new Date() },
        { where: { userId, isRead: false } }
      );

      return res.status(200).json({ success: true, message: 'All notifications marked as read', unreadCount: 0 });
    } catch (error) {
      logger.error('MARK ALL AS READ FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * DELETE /notifications/:id
   */
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({ where: { id, userId } });
      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      await notification.destroy();
      return res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      logger.error('DELETE NOTIFICATION FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /notifications/preferences
   */
  getPreferences: async (req, res) => {
    try {
      const userId = req.user.id;
      let pref = await NotificationPreference.findOne({ where: { userId } });
      if (!pref) {
        pref = await NotificationPreference.create({ userId });
      }
      return res.status(200).json({ success: true, data: pref });
    } catch (error) {
      logger.error('GET PREFERENCES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PATCH /notifications/preferences
   */
  updatePreferences: async (req, res) => {
    try {
      const userId = req.user.id;
      let pref = await NotificationPreference.findOne({ where: { userId } });
      if (!pref) {
        pref = await NotificationPreference.create({ userId, ...req.body });
      } else {
        await pref.update(req.body);
      }
      return res.status(200).json({ success: true, data: pref, message: 'Notification preferences updated' });
    } catch (error) {
      logger.error('UPDATE PREFERENCES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /admin/notifications (Manual Admin Broadcast/Targeted Notification)
   */
  createAdminNotification: async (req, res) => {
    try {
      const { title, message, type = 'PLATFORM_ANNOUNCEMENT', audience = 'All Users', link, courseId } = req.body;

      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
      }

      let recipientUserIds = [];

      if (audience === 'All Users') {
        const users = await User.findAll({ attributes: ['id'] });
        recipientUserIds = users.map(u => u.id);
      } else if (audience === 'Students') {
        const students = await User.findAll({ where: { accountType: 'Student' }, attributes: ['id'] });
        recipientUserIds = students.map(u => u.id);
      } else if (audience === 'Instructors') {
        const instructors = await User.findAll({ where: { accountType: 'Instructor' }, attributes: ['id'] });
        recipientUserIds = instructors.map(u => u.id);
      } else if (audience === 'Specific Course Students' && courseId) {
        const enrollments = await require('../models').Enrollment.findAll({ where: { courseId }, attributes: ['userId'] });
        recipientUserIds = enrollments.map(e => e.userId);
      }

      const created = await notificationService.notifyUsers(recipientUserIds, {
        type,
        source: 'ADMIN',
        title,
        message,
        link: link || '/dashboard',
        entityType: courseId ? 'COURSE' : 'ANNOUNCEMENT',
        entityId: courseId || null
      });

      return res.status(200).json({
        success: true,
        message: `Notification dispatched to ${created.length} users.`,
        sentCount: created.length
      });
    } catch (error) {
      logger.error('CREATE ADMIN NOTIFICATION FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = notificationController;

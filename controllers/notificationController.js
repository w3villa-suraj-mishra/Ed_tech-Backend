const { notificationQuery } = require('../nativequery');
const logger = require('../utils/logger');

const notificationController = {
  /**
   * Get unread notification count
   */
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const unreadCount = await notificationQuery.getUnreadNotificationCountQuery(userId);

      return res.status(200).json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      logger.error('GET UNREAD NOTIFICATION COUNT FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get notifications list for user
   */
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notifications, unreadCount } = await notificationQuery.getUserNotificationsQuery(userId, 20);

      return res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount
        }
      });
    } catch (error) {
      logger.error('GET NOTIFICATIONS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const unreadCount = await notificationQuery.markNotificationReadQuery(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { unreadCount }
      });
    } catch (error) {
      logger.error('MARK NOTIFICATION READ FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const unreadCount = await notificationQuery.markAllNotificationsReadQuery(userId);

      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: { unreadCount }
      });
    } catch (error) {
      logger.error('MARK ALL NOTIFICATIONS READ FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await notificationQuery.deleteNotificationQuery(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      logger.error('DELETE NOTIFICATION FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (req, res) => {
    try {
      const userId = req.user.id;
      const pref = await notificationQuery.getUserNotificationPreferencesQuery(userId);

      return res.status(200).json({
        success: true,
        data: pref
      });
    } catch (error) {
      logger.error('GET NOTIFICATION PREFERENCES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (req, res) => {
    try {
      const userId = req.user.id;
      const pref = await notificationQuery.updateUserNotificationPreferencesQuery(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: pref
      });
    } catch (error) {
      logger.error('UPDATE NOTIFICATION PREFERENCES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Admin Broadcast Notification
   */
  broadcastNotification: async (req, res) => {
    try {
      const { title, message, type, recipientType, courseId, linkUrl } = req.body;

      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
      }

      const recipientTypeVal = recipientType || 'ALL';
      const userIds = await notificationQuery.getRecipientsForBroadcastQuery(recipientTypeVal, courseId);

      if (userIds.length > 0) {
        const notificationsToCreate = userIds.map(uId => ({
          userId: uId,
          title,
          message,
          type: type || 'SYSTEM_ANNOUNCEMENT',
          linkUrl: linkUrl || null,
          isRead: false
        }));

        await notificationQuery.bulkCreateNotificationsQuery(notificationsToCreate);
      }

      return res.status(200).json({
        success: true,
        message: `Notification broadcast sent to ${userIds.length} users.`
      });
    } catch (error) {
      logger.error('BROADCAST NOTIFICATION FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getUserNotifications: function(req, res) {
    return notificationController.getNotifications(req, res);
  },

  createAdminNotification: function(req, res) {
    return notificationController.broadcastNotification(req, res);
  }
};

module.exports = notificationController;

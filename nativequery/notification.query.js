const { Notification, NotificationPreference, User, Enrollment } = require('../models');

/**
 * Notification Native & ORM Queries Layer
 */

const getUnreadNotificationCountQuery = async (userId) => {
  return await Notification.count({
    where: { userId, isRead: false }
  });
};

const getUserNotificationsQuery = async (userId, limit = 20) => {
  const notifications = await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit
  });
  const unreadCount = await Notification.count({
    where: { userId, isRead: false }
  });
  return { notifications, unreadCount };
};

const markNotificationReadQuery = async (id, userId) => {
  const notification = await Notification.findOne({ where: { id, userId } });
  if (notification) {
    await notification.update({ isRead: true });
  }
  const unreadCount = await Notification.count({
    where: { userId, isRead: false }
  });
  return unreadCount;
};

const markAllNotificationsReadQuery = async (userId) => {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
  return 0;
};

const deleteNotificationQuery = async (id, userId) => {
  const notification = await Notification.findOne({ where: { id, userId } });
  if (notification) {
    await notification.destroy();
  }
  return true;
};

const getUserNotificationPreferencesQuery = async (userId) => {
  let pref = await NotificationPreference.findOne({ where: { userId } });
  if (!pref) {
    pref = await NotificationPreference.create({ userId });
  }
  return pref;
};

const updateUserNotificationPreferencesQuery = async (userId, updateData) => {
  let pref = await NotificationPreference.findOne({ where: { userId } });
  if (!pref) {
    pref = await NotificationPreference.create({ userId, ...updateData });
  } else {
    await pref.update(updateData);
  }
  return pref;
};

const getRecipientsForBroadcastQuery = async (recipientType, courseId = null) => {
  let userIds = [];
  if (recipientType === 'ALL') {
    const users = await User.findAll({ attributes: ['id'] });
    userIds = users.map(u => u.id);
  } else if (recipientType === 'STUDENTS') {
    const students = await User.findAll({ where: { accountType: 'Student' }, attributes: ['id'] });
    userIds = students.map(u => u.id);
  } else if (recipientType === 'INSTRUCTORS') {
    const instructors = await User.findAll({ where: { accountType: 'Instructor' }, attributes: ['id'] });
    userIds = instructors.map(u => u.id);
  } else if (recipientType === 'COURSE_ENROLLED' && courseId) {
    const enrollments = await Enrollment.findAll({ where: { courseId }, attributes: ['userId'] });
    userIds = enrollments.map(e => e.userId);
  }
  return userIds;
};

const bulkCreateNotificationsQuery = async (notificationsData) => {
  return await Notification.bulkCreate(notificationsData);
};

module.exports = {
  getUnreadNotificationCountQuery,
  getUserNotificationsQuery,
  markNotificationReadQuery,
  markAllNotificationsReadQuery,
  deleteNotificationQuery,
  getUserNotificationPreferencesQuery,
  updateUserNotificationPreferencesQuery,
  getRecipientsForBroadcastQuery,
  bulkCreateNotificationsQuery
};

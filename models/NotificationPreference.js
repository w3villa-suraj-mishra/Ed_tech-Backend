const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationPreference = sequelize.define('NotificationPreference', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  courseUpdates: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'course_updates' },
  newLessons: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'new_lessons' },
  newCourses: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'new_courses' },
  discussionReplies: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'discussion_replies' },
  courseReviews: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'course_reviews' },
  offersPromotions: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'offers_promotions' },
  planExpiration: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'plan_expiration' },
  platformAnnouncements: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'platform_announcements' }
}, {
  tableName: 'notification_preferences',
  underscored: true,
  timestamps: true
});

module.exports = NotificationPreference;

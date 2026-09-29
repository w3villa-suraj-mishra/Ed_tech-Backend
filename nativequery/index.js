const courseQuery = require('./course.query');
const userQuery = require('./user.query');
const practiceQuery = require('./practice.query');
const adminQuery = require('./admin.query');
const authQuery = require('./auth.query');
const paymentQuery = require('./payment.query');
const offerQuery = require('./offer.query');
const announcementQuery = require('./announcement.query');
const profileQuery = require('./profile.query');
const sectionQuery = require('./section.query');
const sessionsQuery = require('./sessions.query');
const notificationQuery = require('./notification.query');
const contactQuery = require('./contact.query');
const articleQuery = require('./article.query');
const siteConfigQuery = require('./siteConfig.query');

/**
 * Native Query Layer Barrel Export
 * All controllers call functions in nativequery -> nativequery executes queries -> returns data.
 */

module.exports = {
  courseQuery,
  userQuery,
  practiceQuery,
  adminQuery,
  authQuery,
  paymentQuery,
  offerQuery,
  announcementQuery,
  profileQuery,
  sectionQuery,
  sessionsQuery,
  notificationQuery,
  contactQuery,
  articleQuery,
  siteConfigQuery
};

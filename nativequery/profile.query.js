const { User, Profile, Notification, NotificationPreference, Enrollment, Course, Section, SubSection, RatingAndReview, CourseProgress, CourseProgressVideo } = require('../models');

/**
 * Profile & Notification Native Queries Layer
 */

const findProfileByUserIdQuery = async (userId) => {
  return await Profile.findOne({ where: { userId } });
};

const updateProfileQuery = async (userId, profileData) => {
  const profile = await Profile.findOne({ where: { userId } });
  if (!profile) {
    return await Profile.create({ userId, ...profileData });
  }
  await profile.update(profileData);
  return profile;
};

const findUserNotificationsQuery = async (userId) => {
  return await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });
};

const createNotificationQuery = async (notificationData) => {
  return await Notification.create(notificationData);
};

const markNotificationReadQuery = async (notificationId, userId) => {
  const notification = await Notification.findOne({ where: { id: notificationId, userId } });
  if (!notification) return null;
  await notification.update({ isRead: true });
  return notification;
};

const getUserEnrolledCoursesQuery = async (userId) => {
  const enrollments = await Enrollment.findAll({
    where: { userId },
    include: [
      {
        model: Course,
        as: 'course',
        required: false,
        include: [
          {
            model: Section,
            as: 'sections',
            required: false,
            include: [{ model: SubSection, as: 'subSections', required: false }]
          },
          {
            model: RatingAndReview,
            as: 'ratingAndReviews',
            required: false
          }
        ]
      }
    ]
  });

  const userProgresses = await CourseProgress.findAll({
    where: { userId },
    include: [{ model: CourseProgressVideo, as: 'courseProgressVideos' }]
  });

  return { enrollments, userProgresses };
};

const getInstructorCoursesQuery = async (instructorId) => {
  return await Course.findAll({
    where: { instructorId },
    include: [
      { model: Enrollment, as: 'enrollments' },
      {
        model: RatingAndReview,
        as: 'ratingAndReviews',
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'image'] }]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const deleteUserAccountQuery = async (userInstance) => {
  return await userInstance.destroy();
};

const updateUserImageQuery = async (userInstance, imageUrl) => {
  return await userInstance.update({ image: imageUrl });
};

module.exports = {
  findProfileByUserIdQuery,
  updateProfileQuery,
  findUserNotificationsQuery,
  createNotificationQuery,
  markNotificationReadQuery,
  getUserEnrolledCoursesQuery,
  getInstructorCoursesQuery,
  deleteUserAccountQuery,
  updateUserImageQuery
};

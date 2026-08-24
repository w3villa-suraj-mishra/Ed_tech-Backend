const EventEmitter = require('events');
const { notificationService } = require('../services/notificationService');
const { Course, User, Enrollment } = require('../models');
const logger = require('../utils/logger');

class AppEventEmitter extends EventEmitter {}
const eventDispatcher = new AppEventEmitter();

// Centralized Notification Event Handlers

// 1. COURSE_PURCHASED & PAYMENT_SUCCESS
eventDispatcher.on('COURSE_PURCHASED', async ({ userId, courseId, courseName, amount }) => {
  try {
    await notificationService.create({
      userId,
      type: 'COURSE_PURCHASED',
      source: 'SYSTEM',
      title: '🎓 Course Purchased',
      message: `You have successfully purchased "${courseName || 'Course'}".`,
      link: `/courses/${courseId}`,
      entityType: 'COURSE',
      entityId: courseId,
      metadata: { amount }
    });

    await notificationService.create({
      userId,
      type: 'PAYMENT_SUCCESS',
      source: 'SYSTEM',
      title: '💳 Payment Successful',
      message: `Your payment for "${courseName || 'Course'}" was successful.`,
      link: `/dashboard/enrolled-courses`,
      entityType: 'PAYMENT',
      entityId: courseId,
      metadata: { amount }
    });

    // Also notify course instructor
    const course = await Course.findByPk(courseId);
    if (course && course.instructorId) {
      const student = await User.findByPk(userId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';
      await notificationService.create({
        userId: course.instructorId,
        type: 'NEW_ENROLLMENT',
        source: 'SYSTEM',
        title: '🎓 New Student Enrolled',
        message: `${studentName} enrolled in "${course.courseName}".`,
        link: `/dashboard/instructor`,
        entityType: 'COURSE',
        entityId: courseId
      });
    }
  } catch (err) {
    logger.error('EVENT HANDLER COURSE_PURCHASED FAILED:', err.message);
  }
});

// 2. PAYMENT_FAILED
eventDispatcher.on('PAYMENT_FAILED', async ({ userId, courseName, reason }) => {
  try {
    await notificationService.create({
      userId,
      type: 'PAYMENT_FAILED',
      source: 'SYSTEM',
      title: '❌ Payment Failed',
      message: `Your payment for "${courseName || 'Course'}" could not be completed.`,
      link: `/catalog`,
      entityType: 'PAYMENT',
      metadata: { reason }
    });
  } catch (err) {
    logger.error('EVENT HANDLER PAYMENT_FAILED FAILED:', err.message);
  }
});

// 3. COURSE_COMPLETED & CERTIFICATE_AVAILABLE
eventDispatcher.on('COURSE_COMPLETED', async ({ userId, courseId, courseName, certificateId }) => {
  try {
    await notificationService.create({
      userId,
      type: 'COURSE_COMPLETED',
      source: 'SYSTEM',
      title: '🎉 Course Completed!',
      message: `Congratulations! You have completed "${courseName || 'the course'}".`,
      link: `/s/courses/${courseId}/take`,
      entityType: 'COURSE',
      entityId: courseId
    });

    await notificationService.create({
      userId,
      type: 'CERTIFICATE_AVAILABLE',
      source: 'SYSTEM',
      title: '🏆 Certificate Available',
      message: `Your completion certificate for "${courseName || 'Course'}" is now ready to download.`,
      link: `/s/courses/${courseId}/certificate`,
      entityType: 'CERTIFICATE',
      entityId: courseId,
      metadata: { certificateId }
    });
  } catch (err) {
    logger.error('EVENT HANDLER COURSE_COMPLETED FAILED:', err.message);
  }
});

// 4. NEW_COMMENT & COMMENT_REPLY
eventDispatcher.on('NEW_COMMENT', async ({ commenterId, courseId, courseName, parentCommentUserId, commenterName }) => {
  try {
    const course = await Course.findByPk(courseId);
    if (!course) return;

    // If it's a reply to another student's comment
    if (parentCommentUserId && String(parentCommentUserId) !== String(commenterId)) {
      await notificationService.create({
        userId: parentCommentUserId,
        type: 'COMMENT_REPLY',
        source: 'SYSTEM',
        title: '💬 New Reply',
        message: `${commenterName || 'Someone'} replied to your comment on "${course.courseName}".`,
        link: `/s/courses/${courseId}/take`,
        entityType: 'COMMENT',
        entityId: courseId
      });
    }

    // Notify instructor if commenter is not the instructor
    if (course.instructorId && String(course.instructorId) !== String(commenterId)) {
      await notificationService.create({
        userId: course.instructorId,
        type: 'NEW_COMMENT',
        source: 'SYSTEM',
        title: '💬 New Discussion Comment',
        message: `${commenterName || 'A student'} commented on "${course.courseName}".`,
        link: `/s/courses/${courseId}/take`,
        entityType: 'COMMENT',
        entityId: courseId
      });
    }
  } catch (err) {
    logger.error('EVENT HANDLER NEW_COMMENT FAILED:', err.message);
  }
});

// 5. NEW_REVIEW
eventDispatcher.on('NEW_REVIEW', async ({ reviewerId, courseId, rating, reviewerName }) => {
  try {
    const course = await Course.findByPk(courseId);
    if (course && course.instructorId && String(course.instructorId) !== String(reviewerId)) {
      await notificationService.create({
        userId: course.instructorId,
        type: 'NEW_REVIEW',
        source: 'INSTRUCTOR',
        title: '⭐ New Course Review',
        message: `${reviewerName || 'A student'} rated your course "${course.courseName}" ${rating} stars.`,
        link: `/courses/${courseId}`,
        entityType: 'REVIEW',
        entityId: courseId,
        metadata: { rating }
      });
    }
  } catch (err) {
    logger.error('EVENT HANDLER NEW_REVIEW FAILED:', err.message);
  }
});

// 6. NEW_LESSON / NEW_SECTION / COURSE_UPDATED
eventDispatcher.on('COURSE_CONTENT_UPDATED', async ({ courseId, courseName, updateType, title }) => {
  try {
    const enrollments = await Enrollment.findAll({ where: { courseId }, attributes: ['userId'] });
    const userIds = enrollments.map(e => e.userId);

    if (userIds.length === 0) return;

    let eventTitle = '✏️ Course Updated';
    let msg = `New content available in "${courseName}".`;

    if (updateType === 'LESSON') {
      eventTitle = '🎥 New Lesson Added';
      msg = `A new lesson "${title || ''}" was added to "${courseName}".`;
    } else if (updateType === 'SECTION') {
      eventTitle = '📚 New Section Added';
      msg = `A new section "${title || ''}" was added to "${courseName}".`;
    }

    await notificationService.notifyUsers(userIds, {
      type: 'COURSE_UPDATED',
      source: 'INSTRUCTOR',
      title: eventTitle,
      message: msg,
      link: `/s/courses/${courseId}/take`,
      entityType: 'COURSE',
      entityId: courseId
    });
  } catch (err) {
    logger.error('EVENT HANDLER COURSE_CONTENT_UPDATED FAILED:', err.message);
  }
});

// 7. COURSE_STATUS_CHANGED (APPROVED / REJECTED / PUBLISHED)
eventDispatcher.on('COURSE_STATUS_CHANGED', async ({ courseId, courseName, instructorId, status, rejectionReason }) => {
  try {
    if (status === 'Approved' || status === 'Published') {
      await notificationService.create({
        userId: instructorId,
        type: 'COURSE_APPROVED',
        source: 'ADMIN',
        title: '✅ Course Approved & Published',
        message: `Your course "${courseName}" has been approved and is now live.`,
        link: `/courses/${courseId}`,
        entityType: 'COURSE',
        entityId: courseId
      });
    } else if (status === 'Rejected') {
      await notificationService.create({
        userId: instructorId,
        type: 'COURSE_REJECTED',
        source: 'ADMIN',
        title: '⚠️ Course Needs Changes',
        message: `Your course "${courseName}" requires changes: ${rejectionReason || 'Please review guidelines.'}`,
        link: `/dashboard/edit-course/${courseId}`,
        entityType: 'COURSE',
        entityId: courseId,
        metadata: { rejectionReason }
      });
    }
  } catch (err) {
    logger.error('EVENT HANDLER COURSE_STATUS_CHANGED FAILED:', err.message);
  }
});

// 8. PLAN_ACTIVATED / PLAN_EXPIRING / PLAN_EXPIRED
eventDispatcher.on('PLAN_STATUS_CHANGED', async ({ userId, planName, status, daysRemaining }) => {
  try {
    if (status === 'ACTIVATED') {
      await notificationService.create({
        userId,
        type: 'PLAN_ACTIVATED',
        source: 'SYSTEM',
        title: `⭐ ${planName} Plan Activated`,
        message: `Your ${planName} plan is now active. Enjoy premium learning features!`,
        link: `/dashboard/buy-courses`,
        entityType: 'PLAN'
      });
    } else if (status === 'EXPIRING_SOON') {
      await notificationService.create({
        userId,
        type: 'PLAN_EXPIRING',
        source: 'SYSTEM',
        title: `⚠️ Plan Expiring Soon`,
        message: `Your ${planName} plan expires in ${daysRemaining || 2} days. Renew to maintain access.`,
        link: `/dashboard/buy-courses`,
        entityType: 'PLAN'
      });
    } else if (status === 'EXPIRED') {
      await notificationService.create({
        userId,
        type: 'PLAN_EXPIRED',
        source: 'SYSTEM',
        title: `❌ Plan Expired`,
        message: `Your ${planName} plan has expired.`,
        link: `/dashboard/buy-courses`,
        entityType: 'PLAN'
      });
    }
  } catch (err) {
    logger.error('EVENT HANDLER PLAN_STATUS_CHANGED FAILED:', err.message);
  }
});

module.exports = eventDispatcher;

const { Enrollment, Course, User, Offer, OfferRedemption, Announcement } = require('../models');

/**
 * Payment & Enrollment Native Queries Layer
 */

const findEnrollmentQuery = async (userId, courseId) => {
  return await Enrollment.findOne({
    where: { userId, courseId }
  });
};

const createEnrollmentQuery = async (data) => {
  return await Enrollment.create(data);
};

const findOrCreateFreeEnrollmentQuery = async (userId, course) => {
  const [enrollment] = await Enrollment.findOrCreate({
    where: { userId, courseId: course.id },
    defaults: {
      userId,
      courseId: course.id,
      plan: 'free',
      status: 'active',
      coursePrice: Number(course.price || 0),
      purchasePrice: 0,
      discountPercentage: 0,
      activatedAt: new Date(),
      expiresAt: null,
      paymentReference: 'FREE_ENROLLMENT'
    }
  });
  return enrollment;
};

const upsertEnrollmentQuery = async ({ userId, courseId, plan, pricing, purchasePrice, discountPercentage, activatedAt, expiresAt, paymentReference }) => {
  const existingEnrollment = await Enrollment.findOne({
    where: { userId, courseId }
  });

  if (existingEnrollment) {
    return await existingEnrollment.update({
      plan,
      status: 'active',
      coursePrice: pricing.originalPrice,
      purchasePrice,
      discountPercentage,
      activatedAt,
      expiresAt,
      paymentReference: paymentReference || existingEnrollment.paymentReference
    });
  } else {
    return await Enrollment.create({
      userId,
      courseId,
      plan,
      status: 'active',
      coursePrice: pricing.originalPrice,
      purchasePrice,
      discountPercentage,
      activatedAt,
      expiresAt,
      paymentReference: paymentReference || 'STRIPE_PAYMENT'
    });
  }
};

const findUserEnrollmentsQuery = async (userId) => {
  return await Enrollment.findAll({
    where: { userId },
    include: [
      {
        model: Course,
        as: 'course',
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'firstName', 'lastName', 'image']
          }
        ]
      }
    ],
    order: [['enrolledAt', 'DESC']]
  });
};

const findCoursesByIdsQuery = async (courseIds) => {
  return await Promise.all(
    courseIds.map(id => Course.findByPk(typeof id === 'object' ? id.id || id._id : id))
  );
};

const findOfferByCodeAndValidateQuery = async (normalizedCode) => {
  return await Offer.findOne({
    where: { code: normalizedCode, status: 'ACTIVE' },
    include: [{ model: Course, as: 'courses', attributes: ['id'] }]
  });
};

const getOfferUserRedemptionCountQuery = async (offerId, userId) => {
  return await OfferRedemption.count({ where: { offerId, userId } });
};

const findAnnouncementHighlightQuery = async (normalizedCode) => {
  return await Announcement.findOne({ where: { highlightText: normalizedCode, status: 'ACTIVE' } });
};

const findCourseByIdQuery = async (courseId) => {
  return await Course.findByPk(courseId);
};

const findOfferByIdQuery = async (offerId) => {
  return await Offer.findByPk(offerId);
};

const recordOfferRedemptionHelperQuery = async ({ offer, userId, courseId, plan, orderId, discountAmount }) => {
  try {
    await OfferRedemption.findOrCreate({
      where: { offerId: offer.id, userId, courseId },
      defaults: {
        offerId: offer.id,
        userId,
        courseId,
        plan,
        orderId: orderId || 'DIRECT',
        discountAmount
      }
    });
    await offer.increment('totalUses', { by: 1 });
  } catch (err) {}
};

module.exports = {
  findEnrollmentQuery,
  createEnrollmentQuery,
  findOrCreateFreeEnrollmentQuery,
  upsertEnrollmentQuery,
  findUserEnrollmentsQuery,
  findCoursesByIdsQuery,
  findOfferByCodeAndValidateQuery,
  getOfferUserRedemptionCountQuery,
  findAnnouncementHighlightQuery,
  findCourseByIdQuery,
  findOfferByIdQuery,
  recordOfferRedemptionHelperQuery
};

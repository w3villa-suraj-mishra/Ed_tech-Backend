const { Offer, OfferCourse, OfferRedemption, Course } = require('../models');
const { Op } = require('sequelize');

/**
 * Offer Native & ORM Queries Layer
 */

const findOfferByCodeQuery = async (code) => {
  return await Offer.findOne({
    where: { code },
    include: [{ model: Course, as: 'courses' }]
  });
};

const findOfferCodeExistsQuery = async (code, excludeId = null) => {
  const where = { code: code.trim().toUpperCase() };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  return await Offer.findOne({ where });
};

const findAllOffersFilteredQuery = async ({ search, discountType }) => {
  const whereClause = {};

  if (search && search.trim()) {
    const query = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { name: { [Op.iLike]: query } },
      { code: { [Op.iLike]: query } }
    ];
  }

  if (discountType && ['PERCENTAGE', 'FIXED'].includes(discountType)) {
    whereClause.discountType = discountType;
  }

  return await Offer.findAll({
    where: whereClause,
    include: [
      { model: Course, as: 'courses', attributes: ['id', 'courseName', 'price'], through: { attributes: [] } }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const findOfferByIdWithCoursesQuery = async (id) => {
  return await Offer.findByPk(id, {
    include: [
      { model: Course, as: 'courses', attributes: ['id', 'courseName', 'price', 'thumbnail'], through: { attributes: [] } }
    ]
  });
};

const findOfferByIdQuery = async (id) => {
  return await Offer.findByPk(id);
};

const createOfferWithCoursesQuery = async (offerData, courseIds = []) => {
  if (offerData.scope === 'SELECTED_COURSES' && courseIds.length > 0) {
    const existingCourses = await Course.findAll({
      where: { id: courseIds },
      attributes: ['id']
    });
    const validIds = existingCourses.map(c => c.id);

    const offer = await Offer.create(offerData);
    if (validIds.length > 0) {
      const records = validIds.map(cId => ({ offerId: offer.id, courseId: cId }));
      await OfferCourse.bulkCreate(records);
    }
    return await findOfferByIdWithCoursesQuery(offer.id);
  }

  const offer = await Offer.create(offerData);
  return await findOfferByIdWithCoursesQuery(offer.id);
};

const updateOfferWithCoursesQuery = async (id, updateFields, courseIds) => {
  const offer = await Offer.findByPk(id);
  if (!offer) return null;

  await offer.update(updateFields);

  if (offer.scope === 'SELECTED_COURSES') {
    await OfferCourse.destroy({ where: { offerId: offer.id } });
    if (Array.isArray(courseIds) && courseIds.length > 0) {
      const existingCourses = await Course.findAll({ where: { id: courseIds }, attributes: ['id'] });
      const records = existingCourses.map(c => ({ offerId: offer.id, courseId: c.id }));
      await OfferCourse.bulkCreate(records);
    }
  } else {
    await OfferCourse.destroy({ where: { offerId: offer.id } });
  }

  return await findOfferByIdWithCoursesQuery(id);
};

const updateOfferStatusQuery = async (id, status) => {
  const offer = await Offer.findByPk(id);
  if (!offer) return null;
  offer.status = status;
  await offer.save();
  return offer;
};

const duplicateOfferQuery = async (id, adminId) => {
  const offer = await Offer.findByPk(id, {
    include: [{ model: Course, as: 'courses' }]
  });

  if (!offer) return null;

  const newCode = `${offer.code}_COPY_${Math.floor(100 + Math.random() * 900)}`;

  const newOffer = await Offer.create({
    name: `${offer.name} (Copy)`,
    code: newCode,
    description: offer.description,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    scope: offer.scope,
    startAt: offer.startAt,
    endAt: offer.endAt,
    maxUses: offer.maxUses,
    maxUsesPerUser: offer.maxUsesPerUser,
    audience: offer.audience,
    status: 'DRAFT',
    createdBy: adminId || null
  });

  if (offer.scope === 'SELECTED_COURSES' && offer.courses && offer.courses.length > 0) {
    const records = offer.courses.map(c => ({ offerId: newOffer.id, courseId: c.id }));
    await OfferCourse.bulkCreate(records);
  }

  return await findOfferByIdWithCoursesQuery(newOffer.id);
};

const deleteOfferOrDisableQuery = async (id) => {
  const offer = await Offer.findByPk(id);
  if (!offer) return { notFound: true };

  if (offer.totalUses > 0) {
    offer.status = 'DISABLED';
    await offer.save();
    return { disabled: true };
  }

  await OfferCourse.destroy({ where: { offerId: offer.id } });
  await offer.destroy();
  return { deleted: true };
};

const getOfferUserRedemptionCountQuery = async (offerId, userId) => {
  return await OfferRedemption.count({ where: { offerId, userId } });
};

module.exports = {
  findOfferByCodeQuery,
  findOfferCodeExistsQuery,
  findAllOffersFilteredQuery,
  findOfferByIdWithCoursesQuery,
  findOfferByIdQuery,
  createOfferWithCoursesQuery,
  updateOfferWithCoursesQuery,
  updateOfferStatusQuery,
  duplicateOfferQuery,
  deleteOfferOrDisableQuery,
  getOfferUserRedemptionCountQuery
};

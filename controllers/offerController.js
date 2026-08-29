const { Offer, OfferCourse, Course, User } = require('../models');
const { Op } = require('sequelize');

// Helper to determine active/scheduled/expired status dynamically based on current time & timestamps
function calculateOfferStatus(offer) {
  if (offer.status === 'DISABLED' || offer.status === 'DRAFT') {
    return offer.status;
  }
  const now = new Date();
  const startAt = new Date(offer.startAt);
  const endAt = new Date(offer.endAt);

  if (now < startAt) {
    return 'SCHEDULED';
  } else if (now >= startAt && now <= endAt) {
    return 'ACTIVE';
  } else {
    return 'EXPIRED';
  }
}

// Format single offer response
function formatOfferResponse(offer) {
  const plain = offer.get({ plain: true });
  const effectiveStatus = calculateOfferStatus(plain);
  return {
    ...plain,
    status: effectiveStatus,
    applicableCourseCount: plain.scope === 'ALL_COURSES' ? 'All Courses' : (plain.courses ? plain.courses.length : 0)
  };
}

/**
 * Create a new offer/coupon
 * POST /admin/offers
 */
exports.createOffer = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      discountType,
      discountValue,
      scope = 'ALL_COURSES',
      courseIds = [],
      startAt,
      endAt,
      maxUses,
      maxUsesPerUser,
      audience = 'ALL',
      status = 'DRAFT'
    } = req.body;

    // 1. Backend Validations
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Offer name is required.' });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const codeRegex = /^[A-Z0-9_-]{3,30}$/;
    if (!codeRegex.test(normalizedCode)) {
      return res.status(400).json({ success: false, message: 'Promo code must be 3-30 alphanumeric characters.' });
    }

    // Check Promo Code Uniqueness
    const existingOffer = await Offer.findOne({ where: { code: normalizedCode } });
    if (existingOffer) {
      return res.status(400).json({ success: false, message: 'Promo code already exists.' });
    }

    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      return res.status(400).json({ success: false, message: 'Invalid discount type. Must be PERCENTAGE or FIXED.' });
    }

    const numDiscountValue = parseFloat(discountValue);
    if (isNaN(numDiscountValue) || numDiscountValue <= 0) {
      return res.status(400).json({ success: false, message: 'Discount value must be a positive number.' });
    }

    if (discountType === 'PERCENTAGE' && numDiscountValue > 100) {
      return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
    }

    if (!startAt || !endAt) {
      return res.status(400).json({ success: false, message: 'Start date and End date are required.' });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date format.' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'End date & time must be after start date & time.' });
    }

    // Validate course selection if scope is SELECTED_COURSES
    let validCourseIds = [];
    if (scope === 'SELECTED_COURSES') {
      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Please select at least one course for Selected Courses scope.' });
      }

      const existingCourses = await Course.findAll({
        where: { id: courseIds },
        attributes: ['id']
      });
      validCourseIds = existingCourses.map(c => c.id);
      if (validCourseIds.length === 0) {
        return res.status(400).json({ success: false, message: 'None of the selected courses exist.' });
      }
    }

    // Calculate initial status
    let initialStatus = status;
    if (status !== 'DRAFT' && status !== 'DISABLED') {
      const now = new Date();
      if (now < startDate) {
        initialStatus = 'SCHEDULED';
      } else if (now >= startDate && now <= endDate) {
        initialStatus = 'ACTIVE';
      } else {
        initialStatus = 'EXPIRED';
      }
    }

    // Create Offer Record
    const offer = await Offer.create({
      name: name.trim(),
      code: normalizedCode,
      description: description ? description.trim() : null,
      discountType,
      discountValue: numDiscountValue,
      scope: ['ALL_COURSES', 'SELECTED_COURSES'].includes(scope) ? scope : 'ALL_COURSES',
      startAt: startDate,
      endAt: endDate,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser, 10) : null,
      audience: ['ALL', 'STUDENTS', 'INSTRUCTORS'].includes(audience) ? audience : 'ALL',
      status: initialStatus,
      createdBy: req.admin ? req.admin.id : null
    });

    // Create OfferCourse Relations if SELECTED_COURSES
    if (scope === 'SELECTED_COURSES' && validCourseIds.length > 0) {
      const offerCourseRecords = validCourseIds.map(courseId => ({
        offerId: offer.id,
        courseId
      }));
      await OfferCourse.bulkCreate(offerCourseRecords);
    }

    const fullOffer = await Offer.findByPk(offer.id, {
      include: [
        { model: Course, as: 'courses', attributes: ['id', 'courseName', 'price'], through: { attributes: [] } }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully.',
      offer: formatOfferResponse(fullOffer)
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating offer.', error: error.message });
  }
};

/**
 * Get list of all offers with search and filter
 * GET /admin/offers
 */
exports.getAllOffers = async (req, res) => {
  try {
    const { search, status, discountType } = req.query;

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

    const offers = await Offer.findAll({
      where: whereClause,
      include: [
        { model: Course, as: 'courses', attributes: ['id', 'courseName', 'price'], through: { attributes: [] } }
      ],
      order: [['createdAt', 'DESC']]
    });

    let formattedOffers = offers.map(o => formatOfferResponse(o));

    if (status && status !== 'ALL') {
      formattedOffers = formattedOffers.filter(o => o.status === status);
    }

    return res.status(200).json({
      success: true,
      offers: formattedOffers
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching offers.', error: error.message });
  }
};

/**
 * Get single offer details
 * GET /admin/offers/:id
 */
exports.getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id, {
      include: [
        { model: Course, as: 'courses', attributes: ['id', 'courseName', 'price', 'thumbnail'], through: { attributes: [] } }
      ]
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    return res.status(200).json({
      success: true,
      offer: formatOfferResponse(offer)
    });
  } catch (error) {
    console.error('Error fetching offer details:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching offer details.', error: error.message });
  }
};

/**
 * Update an existing offer
 * PUT /admin/offers/:id
 */
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    const {
      name,
      code,
      description,
      discountType,
      discountValue,
      scope,
      courseIds = [],
      startAt,
      endAt,
      maxUses,
      maxUsesPerUser,
      audience,
      status
    } = req.body;

    // Prevent changing promo code if offer has already been used
    if (code && code.trim().toUpperCase() !== offer.code && offer.totalUses > 0) {
      return res.status(400).json({ success: false, message: 'Promo code cannot be modified after it has been used.' });
    }

    if (code && code.trim().toUpperCase() !== offer.code) {
      const normalizedCode = code.trim().toUpperCase();
      const existing = await Offer.findOne({ where: { code: normalizedCode, id: { [Op.ne]: id } } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Promo code already exists.' });
      }
      offer.code = normalizedCode;
    }

    if (name) offer.name = name.trim();
    if (description !== undefined) offer.description = description ? description.trim() : null;

    if (discountType && ['PERCENTAGE', 'FIXED'].includes(discountType)) {
      offer.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const numVal = parseFloat(discountValue);
      if (isNaN(numVal) || numVal <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be a positive number.' });
      }
      if (offer.discountType === 'PERCENTAGE' && numVal > 100) {
        return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
      }
      offer.discountValue = numVal;
    }

    if (startAt) offer.startAt = new Date(startAt);
    if (endAt) offer.endAt = new Date(endAt);

    if (offer.endAt <= offer.startAt) {
      return res.status(400).json({ success: false, message: 'End date & time must be after start date & time.' });
    }

    if (scope && ['ALL_COURSES', 'SELECTED_COURSES'].includes(scope)) {
      offer.scope = scope;
    }

    if (maxUses !== undefined) offer.maxUses = maxUses ? parseInt(maxUses, 10) : null;
    if (maxUsesPerUser !== undefined) offer.maxUsesPerUser = maxUsesPerUser ? parseInt(maxUsesPerUser, 10) : null;
    if (audience && ['ALL', 'STUDENTS', 'INSTRUCTORS'].includes(audience)) offer.audience = audience;

    if (status && ['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED'].includes(status)) {
      offer.status = status;
    }

    await offer.save();

    // Update Course relations
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

    const updatedOffer = await Offer.findByPk(id, {
      include: [
        { model: Course, as: 'courses', attributes: ['id', 'courseName', 'price'], through: { attributes: [] } }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Offer updated successfully.',
      offer: formatOfferResponse(updatedOffer)
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    return res.status(500).json({ success: false, message: 'Server error updating offer.', error: error.message });
  }
};

/**
 * Toggle Status / Activate / Deactivate
 * PATCH /admin/offers/:id/status
 */
exports.updateOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const offer = await Offer.findByPk(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    offer.status = status;
    await offer.save();

    return res.status(200).json({
      success: true,
      message: `Offer status updated to ${status}.`,
      offer: formatOfferResponse(offer)
    });
  } catch (error) {
    console.error('Error updating offer status:', error);
    return res.status(500).json({ success: false, message: 'Server error updating status.', error: error.message });
  }
};

/**
 * Duplicate Offer
 * POST /admin/offers/:id/duplicate
 */
exports.duplicateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id, {
      include: [{ model: Course, as: 'courses' }]
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Source offer not found.' });
    }

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
      createdBy: req.admin ? req.admin.id : null
    });

    if (offer.scope === 'SELECTED_COURSES' && offer.courses && offer.courses.length > 0) {
      const records = offer.courses.map(c => ({ offerId: newOffer.id, courseId: c.id }));
      await OfferCourse.bulkCreate(records);
    }

    const createdDuplicate = await Offer.findByPk(newOffer.id, {
      include: [{ model: Course, as: 'courses', attributes: ['id', 'courseName', 'price'], through: { attributes: [] } }]
    });

    return res.status(201).json({
      success: true,
      message: 'Offer duplicated successfully as Draft.',
      offer: formatOfferResponse(createdDuplicate)
    });
  } catch (error) {
    console.error('Error duplicating offer:', error);
    return res.status(500).json({ success: false, message: 'Server error duplicating offer.', error: error.message });
  }
};

/**
 * Delete / Archive Offer
 * DELETE /admin/offers/:id
 */
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    // If offer has historical usage, archive/disable it instead of hard deletion to maintain integrity
    if (offer.totalUses > 0) {
      offer.status = 'DISABLED';
      await offer.save();
      return res.status(200).json({
        success: true,
        message: 'Offer has historical usage. It was disabled instead of deleted.'
      });
    }

    await OfferCourse.destroy({ where: { offerId: offer.id } });
    await offer.destroy();

    return res.status(200).json({
      success: true,
      message: 'Offer deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting offer.', error: error.message });
  }
};

/**
 * Validate Coupon & Calculate Backend Discount
 * POST /api/v1/offers/validate
 */
exports.validateAndCalculateCoupon = async (req, res) => {
  try {
    const { code, courseId, plan = 'gold' } = req.body;
    const userId = req.user?.id;
    const targetPlan = String(plan).toLowerCase();

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    // 1. Check Course Exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Free plan check
    if (targetPlan === 'free') {
      return res.status(400).json({ success: false, message: 'Coupon is not applicable to free plans.' });
    }

    // 2. Find Offer
    const normalizedCode = code.trim().toUpperCase();
    const offer = await Offer.findOne({
      where: { code: normalizedCode },
      include: [
        { model: Course, as: 'courses', attributes: ['id'] }
      ]
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    // 3. Status and Date Checks
    if (offer.status === 'DISABLED' || offer.status === 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Coupon is not active.' });
    }

    const now = new Date();
    const startAt = new Date(offer.startAt);
    const endAt = new Date(offer.endAt);

    if (now < startAt) {
      return res.status(400).json({ success: false, message: 'Coupon is not active yet.' });
    }

    if (now > endAt) {
      return res.status(400).json({ success: false, message: 'Coupon has expired.' });
    }

    // 4. Scope / Course Eligibility Check
    if (offer.scope === 'SELECTED_COURSES') {
      const eligibleCourseIds = offer.courses ? offer.courses.map(c => c.id) : [];
      if (!eligibleCourseIds.includes(Number(courseId))) {
        return res.status(400).json({ success: false, message: 'Coupon is not valid for this course.' });
      }
    }

    // 5. Total Uses Check
    if (offer.maxUses !== null && offer.totalUses >= offer.maxUses) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its maximum total usage limit.' });
    }

    // 6. User Specific Usage Check
    const { OfferRedemption } = require('../models');
    if (userId) {
      const userRedemptionCount = await OfferRedemption.count({
        where: { offerId: offer.id, userId }
      });
      const maxPerUser = offer.maxUsesPerUser !== null ? offer.maxUsesPerUser : 1; // Default to 1
      if (userRedemptionCount >= maxPerUser) {
        return res.status(400).json({ success: false, message: 'You have already used this coupon.' });
      }
    }

    // 7. Calculate Pricing
    const { calculatePlanPrice } = require('../config/plans');
    const originalAmount = calculatePlanPrice(course, targetPlan);

    let discountAmount = 0;
    if (offer.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((originalAmount * offer.discountValue) / 100);
    } else {
      discountAmount = Math.round(offer.discountValue);
    }

    if (discountAmount > originalAmount) {
      discountAmount = originalAmount;
    }

    const finalAmount = originalAmount - discountAmount;

    return res.status(200).json({
      success: true,
      message: 'Coupon code applied successfully.',
      data: {
        offerId: offer.id,
        code: offer.code,
        name: offer.name,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        originalAmount,
        discountAmount,
        finalAmount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({ success: false, message: 'Server error while validating coupon.', error: error.message });
  }
};


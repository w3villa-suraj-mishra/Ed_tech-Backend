const { offerQuery, courseQuery } = require('../nativequery');

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
  const plain = typeof offer.get === 'function' ? offer.get({ plain: true }) : offer;
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

    const existingOffer = await offerQuery.findOfferCodeExistsQuery(normalizedCode);
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

    const offerData = {
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
    };

    const fullOffer = await offerQuery.createOfferWithCoursesQuery(offerData, courseIds);

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

    const offers = await offerQuery.findAllOffersFilteredQuery({ search, discountType });

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
    const offer = await offerQuery.findOfferByIdWithCoursesQuery(id);

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
    const offer = await offerQuery.findOfferByIdQuery(id);

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

    if (code && code.trim().toUpperCase() !== offer.code && offer.totalUses > 0) {
      return res.status(400).json({ success: false, message: 'Promo code cannot be modified after it has been used.' });
    }

    const updateFields = {};
    if (code && code.trim().toUpperCase() !== offer.code) {
      const normalizedCode = code.trim().toUpperCase();
      const existing = await offerQuery.findOfferCodeExistsQuery(normalizedCode, id);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Promo code already exists.' });
      }
      updateFields.code = normalizedCode;
    }

    if (name) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description ? description.trim() : null;
    if (discountType && ['PERCENTAGE', 'FIXED'].includes(discountType)) updateFields.discountType = discountType;

    if (discountValue !== undefined) {
      const numVal = parseFloat(discountValue);
      if (isNaN(numVal) || numVal <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be a positive number.' });
      }
      if (discountType === 'PERCENTAGE' && numVal > 100) {
        return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
      }
      updateFields.discountValue = numVal;
    }

    if (startAt) updateFields.startAt = new Date(startAt);
    if (endAt) updateFields.endAt = new Date(endAt);

    if (updateFields.startAt && updateFields.endAt && updateFields.endAt <= updateFields.startAt) {
      return res.status(400).json({ success: false, message: 'End date & time must be after start date & time.' });
    }

    if (scope && ['ALL_COURSES', 'SELECTED_COURSES'].includes(scope)) updateFields.scope = scope;
    if (maxUses !== undefined) updateFields.maxUses = maxUses ? parseInt(maxUses, 10) : null;
    if (maxUsesPerUser !== undefined) updateFields.maxUsesPerUser = maxUsesPerUser ? parseInt(maxUsesPerUser, 10) : null;
    if (audience && ['ALL', 'STUDENTS', 'INSTRUCTORS'].includes(audience)) updateFields.audience = audience;
    if (status && ['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED'].includes(status)) updateFields.status = status;

    const updatedOffer = await offerQuery.updateOfferWithCoursesQuery(id, updateFields, courseIds);

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

    const offer = await offerQuery.updateOfferStatusQuery(id, status);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

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
    const adminId = req.admin ? req.admin.id : null;
    const createdDuplicate = await offerQuery.duplicateOfferQuery(id, adminId);

    if (!createdDuplicate) {
      return res.status(404).json({ success: false, message: 'Source offer not found.' });
    }

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
    const result = await offerQuery.deleteOfferOrDisableQuery(id);

    if (result.notFound) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    if (result.disabled) {
      return res.status(200).json({
        success: true,
        message: 'Offer has historical usage. It was disabled instead of deleted.'
      });
    }

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

    const course = await courseQuery.findCourseByIdQuery(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (targetPlan === 'free') {
      return res.status(400).json({ success: false, message: 'Coupon is not applicable to free plans.' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const offer = await offerQuery.findOfferByCodeQuery(normalizedCode);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

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

    if (offer.scope === 'SELECTED_COURSES') {
      const eligibleCourseIds = offer.courses ? offer.courses.map(c => c.id) : [];
      if (!eligibleCourseIds.includes(Number(courseId))) {
        return res.status(400).json({ success: false, message: 'Coupon is not valid for this course.' });
      }
    }

    if (offer.maxUses !== null && offer.totalUses >= offer.maxUses) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its maximum total usage limit.' });
    }

    if (userId) {
      const userRedemptionCount = await offerQuery.getOfferUserRedemptionCountQuery(offer.id, userId);
      const maxPerUser = offer.maxUsesPerUser !== null ? offer.maxUsesPerUser : 1;
      if (userRedemptionCount >= maxPerUser) {
        return res.status(400).json({ success: false, message: 'You have already used this coupon.' });
      }
    }

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

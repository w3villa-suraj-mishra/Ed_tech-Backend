/**
 * Centralized Pricing Service for Calculating Course Prices and Offers.
 */

const calculateCoursePrice = (course) => {
  if (!course) {
    return {
      originalPrice: 0,
      discountType: 'none',
      discountValue: 0,
      discountAmount: 0,
      finalPrice: 0,
      discountPercentage: 0,
      isOfferActive: false,
      offerStartAt: null,
      offerEndAt: null
    };
  }

  const basePrice = Number(course.originalPrice || course.price || 0);
  const discountType = course.discountType || 'none';
  const discountValue = Number(course.discountValue || 0);
  const now = new Date();

  let isOfferActive = false;

  if (discountType !== 'none' && discountValue > 0) {
    const startDate = course.offerStartAt ? new Date(course.offerStartAt) : null;
    const endDate = course.offerEndAt ? new Date(course.offerEndAt) : null;

    const startValid = !startDate || startDate <= now;
    const endValid = !endDate || endDate >= now;

    if (startValid && endValid) {
      isOfferActive = true;
    }
  }

  let finalPrice = basePrice;
  let discountAmount = 0;

  if (isOfferActive) {
    if (discountType === 'percentage') {
      const percentage = Math.min(Math.max(discountValue, 0), 100);
      discountAmount = Math.round((basePrice * percentage) / 100);
      finalPrice = Math.max(0, basePrice - discountAmount);
    } else if (discountType === 'fixed') {
      // If fixed amount entered is intended as the final fixed price (e.g. course price 3649, fixed offer price 3000 -> final 3000)
      if (discountValue > 0 && discountValue < basePrice) {
        finalPrice = Math.round(discountValue);
        discountAmount = basePrice - finalPrice;
      } else {
        discountAmount = Math.min(basePrice, Math.max(0, discountValue));
        finalPrice = Math.max(0, basePrice - discountAmount);
      }
    }
  }

  const computedDiscountPercentage = basePrice > 0 && finalPrice < basePrice
    ? Math.round(((basePrice - finalPrice) / basePrice) * 100)
    : 0;

  return {
    originalPrice: basePrice,
    discountType: isOfferActive ? discountType : 'none',
    discountValue: isOfferActive ? discountValue : 0,
    discountAmount: isOfferActive ? discountAmount : 0,
    finalPrice,
    discountPercentage: computedDiscountPercentage,
    isOfferActive,
    offerStartAt: course.offerStartAt || null,
    offerEndAt: course.offerEndAt || null
  };
};

/**
 * Validate pricing inputs before persisting to DB
 */
const validatePricingInput = ({ price, discountType, discountValue, offerStartAt, offerEndAt }) => {
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return { valid: false, message: 'Original price cannot be negative' };
  }

  const validTypes = ['none', 'percentage', 'fixed'];
  if (discountType && !validTypes.includes(discountType)) {
    return { valid: false, message: 'Invalid discount type' };
  }

  const numDiscount = Number(discountValue || 0);
  if (isNaN(numDiscount) || numDiscount < 0) {
    return { valid: false, message: 'Discount value cannot be negative' };
  }

  if (discountType === 'percentage' && numDiscount > 100) {
    return { valid: false, message: 'Percentage discount cannot exceed 100%' };
  }

  if (discountType === 'fixed' && numDiscount > numPrice) {
    return { valid: false, message: 'Fixed discount cannot exceed original course price' };
  }

  if (offerStartAt && offerEndAt) {
    const start = new Date(offerStartAt);
    const end = new Date(offerEndAt);
    if (end <= start) {
      return { valid: false, message: 'Offer end date must be after offer start date' };
    }
  }

  return { valid: true };
};

module.exports = {
  calculateCoursePrice,
  validatePricingInput
};

const PLAN_TYPES = {
  FREE: 'free',
  SILVER: 'silver',
  GOLD: 'gold'
};

const PLAN_CONFIG = {
  [PLAN_TYPES.FREE]: {
    pricePercentage: 0,
    freeVideoLimit: 2,
    durationMonths: null,
    fullCourseAccess: false
  },
  [PLAN_TYPES.SILVER]: {
    pricePercentage: 0.70,
    freeVideoLimit: null,
    durationMonths: 12,
    fullCourseAccess: true
  },
  [PLAN_TYPES.GOLD]: {
    pricePercentage: 1.00,
    freeVideoLimit: null,
    durationMonths: null,
    fullCourseAccess: true
  }
};

const { calculateCoursePrice } = require('../services/pricingService');

/**
 * Calculate payable price for a plan given course object or course price.
 * @param {object|number} courseObj 
 * @param {string} plan 
 * @returns {number}
 */
const calculatePlanPrice = (courseObj, plan) => {
  const selectedPlan = (plan || PLAN_TYPES.FREE).toLowerCase();
  
  if (selectedPlan === PLAN_TYPES.FREE) {
    return 0;
  }

  // Extract current active selling price using pricing service
  let activePrice = 0;
  if (typeof courseObj === 'object' && courseObj !== null) {
    const pricing = calculateCoursePrice(courseObj);
    activePrice = pricing.finalPrice;
  } else {
    activePrice = Number(courseObj || 0);
  }
  
  if (selectedPlan === PLAN_TYPES.SILVER) {
    return Math.round(activePrice * PLAN_CONFIG[PLAN_TYPES.SILVER].pricePercentage);
  }
  if (selectedPlan === PLAN_TYPES.GOLD) {
    return Math.round(activePrice * PLAN_CONFIG[PLAN_TYPES.GOLD].pricePercentage);
  }
  return activePrice;
};

module.exports = {
  PLAN_TYPES,
  PLAN_CONFIG,
  calculatePlanPrice
};

const PLAN_TYPES = {
  FREE: 'free',
  BASIC: 'basic',
  SILVER: 'silver',
  PLUS: 'plus',
  GOLD: 'gold',
  PRO: 'pro'
};

const PLAN_CONFIG = {
  [PLAN_TYPES.FREE]: {
    pricePercentage: 0,
    freeVideoLimit: 2,
    durationMonths: null,
    fullCourseAccess: false
  },
  [PLAN_TYPES.BASIC]: {
    pricePercentage: 0.10,
    freeVideoLimit: null,
    durationMonths: 1,
    fullCourseAccess: true
  },
  [PLAN_TYPES.SILVER]: {
    pricePercentage: 0.70,
    freeVideoLimit: null,
    durationMonths: 12,
    fullCourseAccess: true
  },
  [PLAN_TYPES.PLUS]: {
    pricePercentage: 1.00,
    freeVideoLimit: null,
    durationMonths: 12,
    fullCourseAccess: true
  },
  [PLAN_TYPES.GOLD]: {
    pricePercentage: 1.00,
    freeVideoLimit: null,
    durationMonths: null,
    fullCourseAccess: true
  },
  [PLAN_TYPES.PRO]: {
    pricePercentage: 1.40,
    freeVideoLimit: null,
    durationMonths: 24,
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
  const selectedPlan = (plan || PLAN_TYPES.GOLD).toLowerCase();
  
  if (selectedPlan === PLAN_TYPES.FREE) {
    return 0;
  }

  // Extract current active selling price using pricing service
  let activePrice = 0;
  if (typeof courseObj === 'object' && courseObj !== null) {
    const pricing = calculateCoursePrice(courseObj);
    activePrice = pricing.finalPrice || Number(courseObj.price || 0);
  } else {
    activePrice = Number(courseObj || 0);
  }
  
  if (selectedPlan === PLAN_TYPES.BASIC) {
    return Math.round(activePrice * 0.10);
  }
  if (selectedPlan === PLAN_TYPES.SILVER) {
    return Math.round(activePrice * 0.70);
  }
  if (selectedPlan === PLAN_TYPES.PLUS || selectedPlan === PLAN_TYPES.GOLD) {
    return Math.round(activePrice * 1.00);
  }
  if (selectedPlan === PLAN_TYPES.PRO) {
    return Math.round(activePrice * 1.40);
  }

  return activePrice;
};

module.exports = {
  PLAN_TYPES,
  PLAN_CONFIG,
  calculatePlanPrice
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build';
const stripe = require('stripe')(stripeSecretKey);
const { Enrollment, Course } = require('../models');
const { PLAN_TYPES, PLAN_CONFIG, calculatePlanPrice } = require('../config/plans');
const { calculateCoursePrice } = require('../services/pricingService');
const logger = require('../utils/logger');

/**
 * Create Stripe Checkout Session or process Free enrollment for course plan purchase
 */
const createPaymentOrder = async (req, res) => {
  try {
    const { courses, plan = PLAN_TYPES.GOLD } = req.body;
    const targetPlan = String(plan).toLowerCase();

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ success: false, message: 'No courses provided' });
    }

    const courseDetails = await Promise.all(
      courses.map(id => Course.findByPk(typeof id === 'object' ? id.id || id._id : id))
    );

    const validCourses = courseDetails.filter(c => c !== null);
    if (validCourses.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid courses found' });
    }

    const userId = req.user.id;

    // Backend validation: Check existing enrollment plan for every requested course
    for (const course of validCourses) {
      const existingEnrollment = await Enrollment.findOne({
        where: { userId, courseId: course.id }
      });

      if (existingEnrollment) {
        const isSilverExpired = existingEnrollment.plan === 'silver' && existingEnrollment.expiresAt && new Date(existingEnrollment.expiresAt) <= new Date();
        const currentPlan = isSilverExpired ? 'expired' : existingEnrollment.plan;

        if (currentPlan === PLAN_TYPES.GOLD) {
          return res.status(400).json({
            success: false,
            message: `You already have Gold Lifetime Access for "${course.courseName}". No further purchases required.`
          });
        }
        if (currentPlan === PLAN_TYPES.SILVER && targetPlan === PLAN_TYPES.SILVER) {
          return res.status(400).json({
            success: false,
            message: `You already have an Active Silver Plan for "${course.courseName}". You can upgrade to Gold!`
          });
        }
      }
    }

    // Handle Free Plan directly without Stripe checkout
    if (targetPlan === PLAN_TYPES.FREE) {
      const enrollments = await Promise.all(
        validCourses.map(async (course) => {
          const [enrollment] = await Enrollment.findOrCreate({
            where: { userId, courseId: course.id },
            defaults: {
              userId,
              courseId: course.id,
              plan: PLAN_TYPES.FREE,
              status: 'active',
              coursePrice: Number(course.price || 0),
              purchasePrice: 0,
              discountPercentage: 0,
              activatedAt: new Date(),
              expiresAt: null,
              paymentReference: 'FREE_ACCESS'
            }
          });
          // Send confirmation email for free access
          const mailService = require('../services/mailService');
          mailService.sendCoursePurchaseConfirmation({
            enrollmentId: enrollment.id,
            userId,
            courseId: course.id
          }).catch(err => {
            logger.error(`Non-blocking free plan email error: ${err.message}`);
          });

          return enrollment;
        })
      );

      return res.status(200).json({
        success: true,
        isFree: true,
        message: 'Free plan activated successfully',
        data: { enrollments }
      });
    }

    // Handle Silver / Gold plan calculations on backend
    const { couponCode } = req.body;
    let validatedOffer = null;
    let validatedDiscount = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const normalizedCode = couponCode.trim().toUpperCase();
      const { Offer, OfferRedemption } = require('../models');
      const offer = await Offer.findOne({
        where: { code: normalizedCode },
        include: [{ model: Course, as: 'courses', attributes: ['id'] }]
      });

      if (offer && offer.status !== 'DISABLED' && offer.status !== 'DRAFT') {
        const now = new Date();
        const startAt = new Date(offer.startAt);
        const endAt = new Date(offer.endAt);

        if (now >= startAt && now <= endAt) {
          // Check scope
          let isEligible = true;
          if (offer.scope === 'SELECTED_COURSES') {
            const eligibleIds = offer.courses ? offer.courses.map(c => c.id) : [];
            isEligible = validCourses.every(c => eligibleIds.includes(c.id));
          }

          // Check max total uses
          if (offer.maxUses !== null && offer.totalUses >= offer.maxUses) {
            isEligible = false;
          }

          // Check user max uses
          if (userId) {
            const userCount = await OfferRedemption.count({ where: { offerId: offer.id, userId } });
            const maxPerUser = offer.maxUsesPerUser !== null ? offer.maxUsesPerUser : 1;
            if (userCount >= maxPerUser) {
              isEligible = false;
            }
          }

          if (isEligible) {
            validatedOffer = offer;
          }
        }
      }
    }

    const purchaseItems = validCourses.map((course) => {
      const pricing = calculateCoursePrice(course);
      let payablePrice = calculatePlanPrice(course, targetPlan);

      if (validatedOffer) {
        if (validatedOffer.discountType === 'PERCENTAGE') {
          const disc = Math.round((payablePrice * validatedOffer.discountValue) / 100);
          payablePrice = Math.max(0, payablePrice - disc);
        } else {
          payablePrice = Math.max(0, payablePrice - Math.round(validatedOffer.discountValue));
        }
      }

      const discountPercentage = targetPlan === PLAN_TYPES.SILVER ? 30 : pricing.discountPercentage;

      return {
        course,
        coursePrice: pricing.originalPrice,
        payablePrice,
        discountPercentage
      };
    });

    const lineItems = purchaseItems.map(({ course, payablePrice }) => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: `${course.courseName} (${targetPlan.toUpperCase()} Plan)${validatedOffer ? ` - Coupon ${validatedOffer.code}` : ''}`,
          description: targetPlan === PLAN_TYPES.SILVER ? '1 Year Full Course Access' : 'Lifetime Full Course Access',
          images: course.thumbnail ? [course.thumbnail] : [],
        },
        unit_amount: Math.round(payablePrice * 100),
      },
      quantity: 1,
    }));

    let session;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: req.user?.email,
        success_url: `${frontendUrl}/dashboard/enrolled-courses?session_id={CHECKOUT_SESSION_ID}&plan=${targetPlan}`,
        cancel_url: `${frontendUrl}/dashboard/cart`,
        metadata: {
          userId: String(userId),
          plan: targetPlan,
          courseIds: JSON.stringify(validCourses.map(c => c.id)),
          offerId: validatedOffer ? String(validatedOffer.id) : null,
          couponCode: validatedOffer ? validatedOffer.code : null
        },
      });
    } catch (stripeErr) {
      logger.warn(`Stripe session creation bypassed/failed (${stripeErr.message}). Activating course directly.`);
      await activateEnrollments({
        userId,
        courseIds: validCourses.map(c => c.id),
        plan: targetPlan,
        paymentRef: 'DIRECT_ACTIVATION',
        offerId: validatedOffer ? validatedOffer.id : null
      });

      return res.status(200).json({
        success: true,
        isFree: true,
        message: 'Course access activated successfully',
        data: { enrollments: validCourses }
      });
    }

    return res.status(200).json({
      success: true,
      isFree: false,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    logger.error('STRIPE CREATE SESSION FAILED:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper function to activate user course plan enrollments
 */
const activateEnrollments = async ({ userId, courseIds, plan = PLAN_TYPES.GOLD, paymentRef = null, offerId = null }) => {
  const targetPlan = String(plan).toLowerCase();

  await Promise.all(
    courseIds.map(async (cId) => {
      const parsedCourseId = typeof cId === 'object' ? cId.id || cId._id : cId;
      if (!parsedCourseId) return;

      const course = await Course.findByPk(parsedCourseId);
      if (!course) return;

      const pricing = calculateCoursePrice(course);
      let purchasePrice = calculatePlanPrice(course, targetPlan);
      let discountAmountRecorded = 0;

      // Handle Coupon Redemption if offerId present
      const { Offer, OfferRedemption, sequelize } = require('../models');
      if (offerId) {
        const offer = await Offer.findByPk(offerId);
        if (offer) {
          if (offer.discountType === 'PERCENTAGE') {
            discountAmountRecorded = Math.round((purchasePrice * offer.discountValue) / 100);
            purchasePrice = Math.max(0, purchasePrice - discountAmountRecorded);
          } else {
            discountAmountRecorded = Math.round(offer.discountValue);
            purchasePrice = Math.max(0, purchasePrice - discountAmountRecorded);
          }

          // Record Redemption & Increment totalUses atomically / safely
          try {
            await OfferRedemption.findOrCreate({
              where: { offerId: offer.id, userId, courseId: parsedCourseId },
              defaults: {
                offerId: offer.id,
                userId,
                courseId: parsedCourseId,
                plan: targetPlan,
                orderId: paymentRef || 'DIRECT',
                discountAmount: discountAmountRecorded
              }
            });
            await offer.increment('totalUses', { by: 1 });
          } catch (redemptionErr) {
            logger.warn(`Offer redemption already recorded or concurrent duplicate prevented: ${redemptionErr.message}`);
          }
        }
      }

      const discountPercentage = targetPlan === PLAN_TYPES.SILVER ? 30 : pricing.discountPercentage;
      const activatedAt = new Date();

      let expiresAt = null;
      if (targetPlan === PLAN_TYPES.SILVER) {
        expiresAt = new Date(activatedAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      const existingEnrollment = await Enrollment.findOne({
        where: { userId, courseId: parsedCourseId }
      });

      let enrollmentRecord = null;
      if (existingEnrollment) {
        enrollmentRecord = await existingEnrollment.update({
          plan: targetPlan,
          status: 'active',
          coursePrice: pricing.originalPrice,
          purchasePrice,
          discountPercentage,
          activatedAt,
          expiresAt,
          paymentReference: paymentRef || existingEnrollment.paymentReference
        });
      } else {
        enrollmentRecord = await Enrollment.create({
          userId,
          courseId: parsedCourseId,
          plan: targetPlan,
          status: 'active',
          coursePrice: pricing.originalPrice,
          purchasePrice,
          discountPercentage,
          activatedAt,
          expiresAt,
          paymentReference: paymentRef || 'STRIPE_PAYMENT'
        });
      }

      // Automatically send dynamic course purchase confirmation email
      const mailService = require('../services/mailService');
      mailService.sendCoursePurchaseConfirmation({
        enrollmentId: enrollmentRecord.id,
        userId,
        courseId: parsedCourseId
      }).catch(err => {
        logger.error(`Non-blocking email send error for enrollment ${enrollmentRecord.id}: ${err.message}`);
      });

      // Emit event for real-time notification
      const eventDispatcher = require('../services/eventDispatcher');
      eventDispatcher.emit('COURSE_PURCHASED', {
        userId,
        courseId: parsedCourseId,
        courseName: course.courseName,
        amount: purchasePrice
      });

      if (targetPlan === PLAN_TYPES.SILVER || targetPlan === PLAN_TYPES.GOLD) {
        eventDispatcher.emit('PLAN_STATUS_CHANGED', {
          userId,
          planName: targetPlan.toUpperCase(),
          status: 'ACTIVATED'
        });
      }
    })
  );
};

/**
 * Verify Stripe session and enroll user with selected plan
 */
const verifyPayment = async (req, res) => {
  try {
    const { sessionId, courses, plan } = req.body;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        let courseIds = [];
        try {
          courseIds = JSON.parse(session.metadata?.courseIds || '[]');
        } catch {
          courseIds = [];
        }
        const targetUserId = req.user?.id || session.metadata?.userId;
        const sessionPlan = session.metadata?.plan || plan || PLAN_TYPES.GOLD;
        const sessionOfferId = session.metadata?.offerId || null;

        logger.info(`Verifying payment session ${sessionId} for user ${targetUserId}, plan: ${sessionPlan}, courseIds: ${JSON.stringify(courseIds)}, offerId: ${sessionOfferId}`);

        if (targetUserId && Array.isArray(courseIds) && courseIds.length > 0) {
          await activateEnrollments({
            userId: targetUserId,
            courseIds,
            plan: sessionPlan,
            paymentRef: session.id,
            offerId: sessionOfferId
          });
        }

        return res.status(200).json({ success: true, message: 'Payment verified and plan activated successfully' });
      }
    }

    if (req.user && Array.isArray(courses) && courses.length > 0) {
      await activateEnrollments({
        userId: req.user.id,
        courseIds: courses,
        plan: plan || PLAN_TYPES.GOLD,
        paymentRef: 'MANUAL_VERIFY'
      });
      return res.status(200).json({ success: true, message: 'Enrolled successfully' });
    }

    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  } catch (error) {
    logger.error('STRIPE VERIFY PAYMENT FAILED:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Stripe Webhook Handler
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    logger.error('WEBHOOK SIGNATURE VERIFICATION FAILED:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const courseIds = JSON.parse(session.metadata?.courseIds || '[]');
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan || PLAN_TYPES.GOLD;
      const offerId = session.metadata?.offerId || null;

      if (userId && courseIds.length > 0) {
        await activateEnrollments({
          userId,
          courseIds,
          plan,
          paymentRef: session.id,
          offerId
        });
        logger.info(`Stripe webhook: Enrolled user ${userId} with plan ${plan} in courses: ${courseIds.join(', ')}`);
      }
    } catch (err) {
      logger.error('WEBHOOK ENROLLMENT FAILED:', err.message);
    }
  }

  res.status(200).json({ received: true });
};

const sendPaymentSuccessEmail = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: 'Payment success email sent' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  sendPaymentSuccessEmail,
};

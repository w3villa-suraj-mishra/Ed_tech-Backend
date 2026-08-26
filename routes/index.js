const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const courseController = require('../controllers/courseController');
const sectionController = require('../controllers/sectionController');
const sessionsController = require('../controllers/sessionsController');
const paymentController = require('../controllers/paymentController');
const contactController = require('../controllers/contactController');
const notificationController = require('../controllers/notificationController');
const articleController = require('../controllers/articleController');
const { passport } = require('../config/passport');
const {
  authenticateUser,
  setCurrentUserIfAuthenticated,
  isInstructor,
  isAdmin
} = require('../middleware/auth');
const upload = require('../middleware/upload');

// ==========================================
// NOTIFICATION ROUTES
// ==========================================
router.get('/notifications', authenticateUser, notificationController.getUserNotifications);
router.get('/notifications/unread-count', authenticateUser, notificationController.getUnreadCount);
router.patch('/notifications/preferences', authenticateUser, notificationController.updatePreferences);
router.get('/notifications/preferences', authenticateUser, notificationController.getPreferences);
router.patch('/notifications/read-all', authenticateUser, notificationController.markAllAsRead);
router.patch('/notifications/:id/read', authenticateUser, notificationController.markAsRead);
router.delete('/notifications/:id', authenticateUser, notificationController.deleteNotification);
router.post('/admin/create-notification', authenticateUser, isAdmin, notificationController.createAdminNotification);

// ==========================================
// ARTICLE ROUTES
// ==========================================
router.get('/articles', articleController.getAllArticles);
router.get('/admin/articles', authenticateUser, isAdmin, articleController.getAdminArticles);
router.post('/admin/articles', authenticateUser, isAdmin, articleController.createArticle);
router.put('/admin/articles/:id', authenticateUser, isAdmin, articleController.updateArticle);
router.delete('/admin/articles/:id', authenticateUser, isAdmin, articleController.deleteArticle);

// ==========================================
// AUTH ROUTES
// ==========================================
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/send_otp', authController.sendOtp);
router.post('/verify_otp', authController.verifyOtp);
router.post('/logout', authController.logout);
router.post('/auth/changepassword', authenticateUser, authController.changePassword);

// OAuth routes
router.get('/auth/debug', (req, res) => {
  return res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    googleCallback: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/auth/google_oauth2/callback`,
    githubClientId: process.env.GITHUB_CLIENT_ID || null,
    githubCallback: process.env.GITHUB_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/auth/github/callback`,
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
});

router.get('/auth/github', (req, res, next) => {
  logger.info('[GITHUB 1] OAuth request started');
  const mode = req.query.mode || 'signup';
  const role = req.query.role || 'Student';

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    logger.error('[GITHUB ERROR] GitHub Client ID or Secret missing in env');
    return res.status(400).json({
      success: false,
      message: "GitHub OAuth is not configured on the server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend Environment Variables."
    });
  }

  try {
    const { configurePassport } = require('../config/passport');
    configurePassport();
  } catch (err) {
    logger.error('[GITHUB PASSPORT INIT ERROR]', err);
  }

  if (!passport._strategies || !passport._strategies['github']) {
    logger.error('[GITHUB ERROR] GitHub strategy is not initialized in Passport');
    return res.status(500).json({
      success: false,
      message: "GitHub OAuth strategy is not initialized. Please verify GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables."
    });
  }

  try {
    return passport.authenticate('github', {
      scope: ['user:email'],
      session: false,
      state: `${mode}_${role}`
    })(req, res, next);
  } catch (error) {
    logger.error('[GITHUB INIT ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

router.get('/auth/google_oauth2', (req, res, next) => {
  console.log('[GOOGLE DEBUG] OAuth route reached');
  const mode = req.query.mode || 'signup';
  const role = req.query.role || 'Student';
  console.log('[GOOGLE DEBUG] mode:', mode);
  console.log('[GOOGLE DEBUG] role:', role);
  console.log('[GOOGLE DEBUG] GOOGLE_CLIENT_ID present:', Boolean(process.env.GOOGLE_CLIENT_ID));
  console.log('[GOOGLE DEBUG] GOOGLE_CLIENT_SECRET present:', Boolean(process.env.GOOGLE_CLIENT_SECRET));
  console.log('[GOOGLE DEBUG] GOOGLE_CALLBACK_URL present:', Boolean(process.env.GOOGLE_CALLBACK_URL));

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[GOOGLE ERROR] Google Client ID or Secret missing in env');
    return res.status(400).json({
      success: false,
      message: "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend Environment Variables."
    });
  }

  console.log('[GOOGLE DEBUG] Passport configuration started');
  try {
    const { configurePassport } = require('../config/passport');
    configurePassport();
    console.log('[GOOGLE DEBUG] Passport configuration completed');
  } catch (error) {
    console.error('[GOOGLE PASSPORT CONFIG ERROR]', error);
    console.error(error.stack);
  }

  const strategyExists = Boolean(passport._strategies && (passport._strategies['google_oauth2'] || passport._strategies['google']));
  console.log('[GOOGLE DEBUG] Strategy google_oauth2 exists:', Boolean(passport._strategies?.google_oauth2));
  console.log('[GOOGLE DEBUG] Strategy google exists:', Boolean(passport._strategies?.google));

  if (!strategyExists) {
    console.error('[GOOGLE ERROR] Google OAuth strategy is NOT registered after configuration');
    return res.status(500).json({
      success: false,
      message: "Google OAuth strategy is not initialized. Please verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables."
    });
  }

  const strategyName = passport._strategies['google_oauth2'] ? 'google_oauth2' : 'google';
  console.log(`[GOOGLE DEBUG] About to authenticate with strategy: ${strategyName}`);

  try {
    return passport.authenticate(strategyName, {
      scope: ['email', 'profile'],
      session: false,
      state: `${mode}_${role}`
    })(req, res, next);
  } catch (error) {
    console.error('[GOOGLE INIT ERROR]', error);
    console.error('[GOOGLE INIT STACK]', error.stack);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

router.get(
  '/auth/google_oauth2/callback',
  (req, res, next) => {
    console.log('[GOOGLE CALLBACK 1] Callback route reached');
    console.log('[GOOGLE CALLBACK 2] Query parameters received:', JSON.stringify(req.query));

    if (!passport._strategies || !passport._strategies['google_oauth2']) {
      console.log('[GOOGLE CALLBACK 2] Initializing Passport strategy dynamically in callback handler...');
      try {
        const { configurePassport } = require('../config/passport');
        configurePassport();
      } catch (err) {
        console.error('[GOOGLE CALLBACK PASSPORT ERROR]', err);
      }
    }

    console.log('[GOOGLE CALLBACK 3] Passport authentication started');
    passport.authenticate('google_oauth2', { session: false }, (err, user, info) => {
      const defaultFrontend = 'https://ed-tech-frontend-indol.vercel.app';
      const targetFrontend = (process.env.FRONTEND_URL || defaultFrontend).trim();

      if (err) {
        console.error('[GOOGLE CALLBACK ERROR] Passport authentication threw error:', err.message);
        console.error('[GOOGLE CALLBACK ERROR STACK]', err.stack);
        return res.status(500).json({
          success: false,
          message: `OAuth Auth Error: ${err.message}`,
          stack: err.stack
        });
      }

      if (!user) {
        console.error('[GOOGLE CALLBACK ERROR] Passport did not return a user profile. Info:', info);
        return res.status(400).json({
          success: false,
          message: 'No user profile received from Google',
          info
        });
      }

      console.log('[GOOGLE CALLBACK 4] Google profile received for email:', user.email);
      req.authInfo = user;
      req.user = user;

      if (req.query.state) {
        try {
          const statePayload = JSON.parse(req.query.state);
          req.query = { ...req.query, ...statePayload };
        } catch (e) {
          if (typeof req.query.state === 'string' && req.query.state.includes('_')) {
            const [mode, role] = req.query.state.split('_');
            req.query = { ...req.query, mode, role };
          }
        }
      }

      console.log('[GOOGLE CALLBACK 5] Handing over to sessionsController.create');
      next();
    })(req, res, next);
  },
  sessionsController.create
);

router.get(
  '/auth/github/callback',
  (req, res, next) => {
    logger.info('[GITHUB 2] Callback reached');
    if (!passport._strategies || !passport._strategies['github']) {
      try {
        const { configurePassport } = require('../config/passport');
        configurePassport();
      } catch (err) {
        logger.error('[GITHUB PASSPORT CALLBACK INIT ERROR]', err);
      }
    }
    passport.authenticate('github', { session: false }, (err, user, info) => {
      const defaultFrontend = 'https://ed-tech-frontend-indol.vercel.app';
      const targetFrontend = (process.env.FRONTEND_URL || defaultFrontend).trim();

      if (err) {
        logger.error('[GITHUB CALLBACK ERROR]', err.message);
        return res.redirect(`${targetFrontend}/login?error=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        logger.error('[GITHUB CALLBACK ERROR] No GitHub profile received', info);
        return res.redirect(`${targetFrontend}/login?error=auth_failed`);
      }

      logger.info('[GITHUB 3] GitHub profile received');
      req.authInfo = user;
      req.user = user;

      if (req.query.state) {
        try {
          const statePayload = JSON.parse(req.query.state);
          req.query = { ...req.query, ...statePayload };
        } catch (e) {
          if (typeof req.query.state === 'string' && req.query.state.includes('_')) {
            const [mode, role] = req.query.state.split('_');
            req.query = { ...req.query, mode, role };
          }
        }
      }

      next();
    })(req, res, next);
  },
  sessionsController.create
);

router.get(
  '/auth/:provider/callback',
  (req, res, next) => {
    passport.authenticate(req.params.provider, { session: false }, (err, user) => {
      const defaultFrontend = 'https://ed-tech-frontend-indol.vercel.app';
      const targetFrontend = (process.env.FRONTEND_URL || defaultFrontend).trim();
      if (err || !user) {
        logger.error('OAuth provider callback error:', err ? err.message : 'No user profile');
        return res.redirect(`${targetFrontend}/login?error=auth_failed`);
      }
      req.authInfo = user;
      req.user = user;
      if (req.query.state) {
        try {
          const statePayload = JSON.parse(req.query.state);
          req.query = { ...req.query, ...statePayload };
        } catch (e) {
          if (typeof req.query.state === 'string' && req.query.state.includes('_')) {
            const [mode, role] = req.query.state.split('_');
            req.query = { ...req.query, mode, role };
          }
        }
      }
      next();
    })(req, res, next);
  },
  sessionsController.create
);
router.get('/github-start', sessionsController.githubStart);
router.get('/auth/failure', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
});

// ==========================================
// PROFILE ROUTES
// ==========================================
router.get(
  '/profile/getUserDetails',
  authenticateUser,
  profileController.getUserDetails
);
router.get(
  '/profile/getEnrolledCourses',
  authenticateUser,
  profileController.getEnrolledCourses
);
router.delete(
  '/profile/deleteAccount',
  authenticateUser,
  profileController.deleteAccount
);
router.get(
  '/profile/instructorDashboard',
  authenticateUser,
  isInstructor,
  profileController.instructorDashboard
);
router.put(
  '/profile/updateProfile',
  authenticateUser,
  profileController.updateProfile
);
router.put(
  '/profile/updateDisplayPicture',
  authenticateUser,
  upload.single('image'),
  profileController.updateDisplayPicture
);

// ==========================================
// COURSE ROUTES
// ==========================================
router.post(
  '/course/createCourse',
  authenticateUser,
  isInstructor,
  upload.single('thumbnailImage'),
  courseController.createCourse
);
router.post(
  '/course/editCourse',
  authenticateUser,
  isInstructor,
  upload.single('thumbnailImage'),
  courseController.editCourse
);
router.get(
  '/course/getInstructorCourses',
  authenticateUser,
  isInstructor,
  courseController.getInstructorCourses
);
router.patch(
  '/course/:id/pricing',
  authenticateUser,
  courseController.updateCoursePricing
);
router.get(
  '/course/:id/pricing',
  courseController.getCoursePricing
);
router.get(
  '/course/getHomePageStats',
  courseController.getHomePageStats
);
router.get(
  '/course/getAllCourses',
  setCurrentUserIfAuthenticated,
  courseController.getAllCourses
);
router.post(
  '/course/getCourseDetails',
  setCurrentUserIfAuthenticated,
  courseController.getCourseDetails
);
router.get(
  '/course/getCourseDetails',
  setCurrentUserIfAuthenticated,
  courseController.getCourseDetails
);
router.post(
  '/course/getFullCourseDetails',
  authenticateUser,
  courseController.getFullCourseDetails
);
router.get(
  '/course/showAllCategories',
  courseController.showAllCategories
);
router.post(
  '/course/createCategory',
  courseController.createCategory
);
router.post(
  '/course/createRating',
  authenticateUser,
  courseController.createRating
);
router.get(
  '/course/getReviews',
  courseController.getReviews
);
router.post(
  '/course/postComment',
  authenticateUser,
  courseController.postComment
);
router.get(
  '/course/getComments',
  courseController.getComments
);
router.delete(
  '/course/deleteComment',
  authenticateUser,
  courseController.deleteComment
);
router.get(
  '/course/getCertificate',
  authenticateUser,
  courseController.getCertificate
);
router.get(
  '/certificate/verify/:certificateId',
  courseController.verifyCertificate
);
router.get(
  '/course/getCategoryPageDetails',
  courseController.getCategoryPageDetails
);
router.delete(
  '/course/deleteCourse',
  authenticateUser,
  isInstructor,
  courseController.deleteCourse
);

// ==========================================
// SECTION ROUTES
// ==========================================
router.post(
  '/course/addSection',
  authenticateUser,
  isInstructor,
  sectionController.addSection
);
router.post(
  '/course/updateSection',
  authenticateUser,
  isInstructor,
  sectionController.updateSection
);
router.post(
  '/course/deleteSection',
  authenticateUser,
  isInstructor,
  sectionController.deleteSection
);

// ==========================================
// SUBSECTION ROUTES
// ==========================================
router.post(
  '/course/addSubSection',
  authenticateUser,
  isInstructor,
  upload.single('video'),
  sectionController.addSubSection
);
router.post(
  '/course/updateSubSection',
  authenticateUser,
  isInstructor,
  upload.single('videoFile'),
  sectionController.updateSubSection
);
router.post(
  '/course/updateLectureDuration',
  authenticateUser,
  courseController.updateLectureDuration
);
router.post(
  '/course/deleteSubSection',
  authenticateUser,
  isInstructor,
  sectionController.deleteSubSection
);

// ==========================================
// PROGRESS ROUTES
// ==========================================
router.post(
  '/course/updateCourseProgress',
  authenticateUser,
  sectionController.updateCourseProgress
);

// ==========================================
// PAYMENT ROUTES
// ==========================================
router.post('/payment/capturePayment', authenticateUser, paymentController.createPaymentOrder);
router.post('/payment/verifyPayment', authenticateUser, paymentController.verifyPayment);
router.post('/payment/sendPaymentSuccessEmail', authenticateUser, paymentController.sendPaymentSuccessEmail);
router.post('/payment/webhook', paymentController.handleWebhook);

// ==========================================
// CONTACT ROUTE
// ==========================================
router.post('/reach/contact', contactController.contact);

module.exports = router;

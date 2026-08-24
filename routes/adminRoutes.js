const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/adminAuth');
const upload = require('../middleware/upload');

// ── Public (no auth) ─────────────────────────────────
router.get('/check-init', admin.checkInit);
router.post('/setup', admin.setup);
router.post('/login', admin.login);

// ── All routes below require admin auth ──────────────
router.use(authenticateAdmin);

router.get('/me', admin.getMe);

// Dashboard
router.get('/dashboard/stats', admin.dashboardStats);

// Users (Superadmin-only for destructive/role actions)
router.get('/users', admin.getUsers);
router.get('/users/:id', admin.getUser);
router.post('/users', requireSuperAdmin, admin.createUser);
router.put('/users/:id', requireSuperAdmin, admin.updateUser);
router.delete('/users/:id', requireSuperAdmin, admin.deleteUser);
router.put('/users/:id/reset-password', requireSuperAdmin, admin.resetPassword);

// Categories
router.get('/categories', admin.getCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', requireSuperAdmin, admin.deleteCategory);

// Courses
router.get('/courses', admin.getCourses);
router.get('/courses/:id', admin.getCourse);
router.put('/courses/:id', upload.single('thumbnailImage'), admin.updateCourse);
router.put('/courses/:id/status', admin.updateCourseStatus);
router.patch('/courses/:id/pricing', require('../controllers/courseController').updateCoursePricing);
router.delete('/courses/:id', requireSuperAdmin, admin.deleteCourseAdmin);

// Enrollments
router.get('/enrollments', admin.getEnrollments);
router.delete('/enrollments/:id', requireSuperAdmin, admin.deleteEnrollment);

// Reviews
router.get('/reviews', admin.getReviews);
router.delete('/reviews/:id', admin.deleteReview);

// Live Sessions
router.get('/live-sessions', admin.getLiveSessions);
router.post('/live-sessions', admin.createLiveSession);
router.put('/live-sessions/:id', admin.updateLiveSession);
router.delete('/live-sessions/:id', admin.deleteLiveSession);

// Sections
router.get('/sections', admin.getSections);
router.post('/sections', admin.createSection);
router.put('/sections/:id', admin.updateSection);
router.delete('/sections/:id', admin.deleteSection);

// SubSections
router.get('/subsections', admin.getSubSections);
router.post('/subsections', upload.single('video'), admin.createSubSection);
router.put('/subsections/:id', upload.single('video'), admin.updateSubSection);
router.delete('/subsections/:id', admin.deleteSubSection);

// Contact Submissions
router.get('/contacts', admin.getContacts);
router.put('/contacts/:id/status', admin.updateContactStatus);
router.delete('/contacts/:id', admin.deleteContact);

// Notifications
router.get('/notifications', admin.getNotifications);

module.exports = router;

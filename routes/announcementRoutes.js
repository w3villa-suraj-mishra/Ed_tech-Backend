const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { setCurrentUserIfAuthenticated, authenticateUser } = require('../middleware/auth');

// Public/Learner Active Announcement endpoint
router.get('/active', setCurrentUserIfAuthenticated, announcementController.getActiveAnnouncement);

// Dismiss announcement for user
router.post('/:id/dismiss', setCurrentUserIfAuthenticated, announcementController.dismissAnnouncement);

module.exports = router;

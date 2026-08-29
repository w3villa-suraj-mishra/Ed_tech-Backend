const { Announcement, AnnouncementDismissal } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Helper to sanitize URL schemes (prevent javascript:, data:, etc.)
const sanitizeUrl = (url) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) {
    return '#';
  }
  return trimmed;
};

// Helper to calculate effective status based on timestamps
const calculateEffectiveStatus = (status, startAt, endAt) => {
  if (status === 'DRAFT' || status === 'ARCHIVED') {
    return status;
  }
  const now = new Date();
  if (endAt && new Date(endAt) <= now) {
    return 'EXPIRED';
  }
  if (startAt && new Date(startAt) > now) {
    return 'SCHEDULED';
  }
  return 'ACTIVE';
};

// ── ADMIN CONTROLLERS ──────────────────────────────────────────────────────────

/**
 * Create a new announcement (Admin)
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      message,
      highlightText,
      audience = 'ALL',
      ctaEnabled = false,
      ctaText,
      ctaUrl,
      countdownEnabled = false,
      startAt,
      endAt,
      status = 'DRAFT',
      priority = 'Normal',
      dismissible = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement message is required' });
    }

    if (ctaEnabled) {
      if (!ctaText || !ctaText.trim()) {
        return res.status(400).json({ success: false, message: 'CTA Text is required when CTA is enabled' });
      }
      if (!ctaUrl || !ctaUrl.trim()) {
        return res.status(400).json({ success: false, message: 'CTA URL is required when CTA is enabled' });
      }
    }

    if (countdownEnabled) {
      if (!startAt || !endAt) {
        return res.status(400).json({ success: false, message: 'Start and End dates are required when countdown is enabled' });
      }
    }

    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      return res.status(400).json({ success: false, message: 'End date must be later than start date' });
    }

    const effectiveStatus = calculateEffectiveStatus(status, startAt, endAt);

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      highlightText: highlightText ? highlightText.trim() : null,
      audience,
      ctaEnabled: !!ctaEnabled,
      ctaText: ctaEnabled ? ctaText.trim() : null,
      ctaUrl: ctaEnabled ? sanitizeUrl(ctaUrl) : null,
      countdownEnabled: !!countdownEnabled,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      status: effectiveStatus,
      priority,
      dismissible: dismissible !== undefined ? !!dismissible : true,
      createdBy: req.user?.id || req.admin?.id || null
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    logger.error('Error creating announcement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all announcements for Admin Management
 */
exports.getAllAnnouncements = async (req, res) => {
  try {
    const { status, audience, search } = req.query;
    const where = {};

    if (status && status !== 'all' && status !== 'All') {
      where.status = status.toUpperCase();
    }

    if (audience && audience !== 'all' && audience !== 'All') {
      where.audience = audience.toUpperCase();
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search.trim()}%` } },
        { message: { [Op.iLike]: `%${search.trim()}%` } },
        { highlightText: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    const announcements = await Announcement.findAll({
      where,
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    // Auto update expired statuses in response
    const now = new Date();
    const updatedAnnouncements = announcements.map((item) => {
      const a = item.toJSON();
      if (a.status !== 'DRAFT' && a.status !== 'ARCHIVED' && a.endAt && new Date(a.endAt) <= now) {
        a.status = 'EXPIRED';
      } else if (a.status !== 'DRAFT' && a.status !== 'ARCHIVED' && a.startAt && new Date(a.startAt) > now) {
        a.status = 'SCHEDULED';
      }
      return a;
    });

    return res.status(200).json({
      success: true,
      data: updatedAnnouncements
    });
  } catch (error) {
    logger.error('Error fetching announcements:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get announcement by ID (Admin)
 */
exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    return res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    logger.error('Error fetching announcement details:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an announcement (Admin)
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const {
      title,
      message,
      highlightText,
      audience,
      ctaEnabled,
      ctaText,
      ctaUrl,
      countdownEnabled,
      startAt,
      endAt,
      status,
      priority,
      dismissible
    } = req.body;

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ success: false, message: 'Announcement title cannot be empty' });
    }
    if (message !== undefined && (!message || !message.trim())) {
      return res.status(400).json({ success: false, message: 'Announcement message cannot be empty' });
    }

    const newStartAt = startAt !== undefined ? (startAt ? new Date(startAt) : null) : announcement.startAt;
    const newEndAt = endAt !== undefined ? (endAt ? new Date(endAt) : null) : announcement.endAt;

    if (newStartAt && newEndAt && newEndAt <= newStartAt) {
      return res.status(400).json({ success: false, message: 'End date must be later than start date' });
    }

    const requestedStatus = status || announcement.status;
    const effectiveStatus = calculateEffectiveStatus(requestedStatus, newStartAt, newEndAt);

    await announcement.update({
      title: title !== undefined ? title.trim() : announcement.title,
      message: message !== undefined ? message.trim() : announcement.message,
      highlightText: highlightText !== undefined ? (highlightText ? highlightText.trim() : null) : announcement.highlightText,
      audience: audience !== undefined ? audience : announcement.audience,
      ctaEnabled: ctaEnabled !== undefined ? !!ctaEnabled : announcement.ctaEnabled,
      ctaText: ctaText !== undefined ? (ctaText ? ctaText.trim() : null) : announcement.ctaText,
      ctaUrl: ctaUrl !== undefined ? sanitizeUrl(ctaUrl) : announcement.ctaUrl,
      countdownEnabled: countdownEnabled !== undefined ? !!countdownEnabled : announcement.countdownEnabled,
      startAt: newStartAt,
      endAt: newEndAt,
      status: effectiveStatus,
      priority: priority !== undefined ? priority : announcement.priority,
      dismissible: dismissible !== undefined ? !!dismissible : announcement.dismissible
    });

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    logger.error('Error updating announcement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update announcement status (Activate/Deactivate/Archive)
 */
exports.updateAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const effectiveStatus = calculateEffectiveStatus(status, announcement.startAt, announcement.endAt);
    await announcement.update({ status: effectiveStatus });

    return res.status(200).json({
      success: true,
      message: `Announcement status updated to ${effectiveStatus}`,
      data: announcement
    });
  } catch (error) {
    logger.error('Error updating status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete an announcement (Admin)
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await announcement.destroy();

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting announcement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ── PUBLIC / LEARNER CONTROLLERS ─────────────────────────────────────────────

/**
 * Get current active announcement for logged-in or guest user
 */
exports.getActiveAnnouncement = async (req, res) => {
  try {
    const now = new Date();
    const userRole = req.user ? req.user.accountType : 'Student';
    const userId = req.user ? req.user.id : null;

    // Audience filter: ALL always allowed.
    // If Student: ALL or STUDENTS
    // If Instructor: ALL or INSTRUCTORS
    const allowedAudiences = ['ALL'];
    if (userRole === 'Student' || userRole === 'StudentUser') {
      allowedAudiences.push('STUDENTS');
    } else if (userRole === 'Instructor') {
      allowedAudiences.push('INSTRUCTORS');
    } else {
      allowedAudiences.push('STUDENTS', 'INSTRUCTORS');
    }

    // Get list of dismissed announcement IDs if user is logged in
    let dismissedIds = [];
    if (userId) {
      const dismissals = await AnnouncementDismissal.findAll({
        where: { userId },
        attributes: ['announcementId']
      });
      dismissedIds = dismissals.map(d => d.announcementId);
    }

    const where = {
      status: { [Op.in]: ['ACTIVE', 'SCHEDULED'] },
      audience: { [Op.in]: allowedAudiences },
      [Op.and]: [
        {
          [Op.or]: [
            { startAt: null },
            { startAt: { [Op.lte]: now } }
          ]
        },
        {
          [Op.or]: [
            { endAt: null },
            { endAt: { [Op.gt]: now } }
          ]
        }
      ]
    };

    if (dismissedIds.length > 0) {
      where.id = { [Op.notIn]: dismissedIds };
    }

    const announcements = await Announcement.findAll({ where });

    if (!announcements || announcements.length === 0) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    // Sort by priority rank: High = 3, Normal = 2, Low = 1; then by createdAt DESC
    const priorityRank = { High: 3, Normal: 2, Low: 1 };
    announcements.sort((a, b) => {
      const rankA = priorityRank[a.priority] || 2;
      const rankB = priorityRank[b.priority] || 2;
      if (rankB !== rankA) return rankB - rankA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const activeItem = announcements[0].toJSON();

    return res.status(200).json({
      success: true,
      data: activeItem
    });
  } catch (error) {
    logger.error('Error fetching active announcement:', error);
    // Silent fail safely to prevent breaking layout
    return res.status(200).json({
      success: true,
      data: null,
      error: error.message
    });
  }
};

/**
 * Dismiss an announcement for current user
 */
exports.dismissAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      // Guest dismissal handled via local storage on frontend
      return res.status(200).json({ success: true, message: 'Dismissed locally' });
    }

    await AnnouncementDismissal.findOrCreate({
      where: {
        announcementId: id,
        userId
      },
      defaults: {
        announcementId: id,
        userId,
        dismissedAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Announcement dismissed successfully'
    });
  } catch (error) {
    logger.error('Error dismissing announcement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const { Enrollment, Course, Section, SubSection } = require('../models');
const { PLAN_TYPES, PLAN_CONFIG } = require('../config/plans');
const { Op } = require('sequelize');

/**
 * Service to check course and video access for a user.
 */
class AccessControlService {
  /**
   * Get user's enrollment for a course and evaluate live status.
   * @param {number} userId 
   * @param {number} courseId 
   * @returns {Promise<Object|null>}
   */
  static async getUserCourseEnrollment(userId, courseId) {
    if (!userId || !courseId) return null;

    const enrollment = await Enrollment.findOne({
      where: { userId, courseId }
    });

    if (!enrollment) return null;

    // Check live expiration for Silver plan
    if (enrollment.plan === PLAN_TYPES.SILVER && enrollment.status === 'active' && enrollment.expiresAt) {
      if (new Date(enrollment.expiresAt) <= new Date()) {
        await enrollment.update({ status: 'expired' });
      }
    }

    return enrollment;
  }

  /**
   * Determine if user has access to a specific subSection (video).
   * Rules:
   * 1. Gold: ALLOW
   * 2. Active Silver (unexpired): ALLOW
   * 3. Free (or active Free plan enrollment): ALLOW if video position <= 2
   * 4. Else: DENY
   * 
   * @param {number} userId 
   * @param {number} courseId 
   * @param {number} subSectionId 
   * @returns {Promise<{ allowed: boolean, reason: string, plan: string, isFreeVideo: boolean }>}
   */
  static async canAccessVideo(userId, courseId, subSectionId) {
    // Determine overall video position in course
    const videoPosition = await this.getVideoPositionInCourse(courseId, subSectionId);
    const isFreeVideo = videoPosition > 0 && videoPosition <= 2;

    if (!userId) {
      if (isFreeVideo) {
        return { allowed: true, reason: 'Free preview video', plan: 'none', isFreeVideo: true };
      }
      return { allowed: false, reason: 'Authentication required for video 3+', plan: 'none', isFreeVideo: false };
    }

    const enrollment = await this.getUserCourseEnrollment(userId, courseId);
    const plan = enrollment ? enrollment.plan : 'none';

    // 1. Gold Plan
    if (enrollment && enrollment.plan === PLAN_TYPES.GOLD && enrollment.status === 'active') {
      return { allowed: true, reason: 'Gold plan active', plan: 'gold', isFreeVideo };
    }

    // 2. Silver Plan (check expiration)
    if (enrollment && enrollment.plan === PLAN_TYPES.SILVER && enrollment.status === 'active') {
      if (!enrollment.expiresAt || new Date(enrollment.expiresAt) > new Date()) {
        return { allowed: true, reason: 'Silver plan active', plan: 'silver', isFreeVideo };
      }
    }

    // 3. Free Plan or Unenrolled user
    if (isFreeVideo) {
      return { allowed: true, reason: 'Free video (positions 1-2)', plan: enrollment ? enrollment.plan : 'free', isFreeVideo: true };
    }

    return {
      allowed: false,
      reason: 'Upgrade to Silver (1 Year) or Gold (Lifetime) to unlock remaining lectures',
      plan,
      isFreeVideo: false
    };
  }

  /**
   * Helper to calculate 1-indexed video position in a course based on section and subsection ordering.
   * @param {number} courseId 
   * @param {number} subSectionId 
   * @returns {Promise<number>}
   */
  static async getVideoPositionInCourse(courseId, subSectionId) {
    const sections = await Section.findAll({
      where: { courseId },
      include: [{ model: SubSection, as: 'subSections' }],
      order: [
        ['id', 'ASC'],
        [{ model: SubSection, as: 'subSections' }, 'id', 'ASC']
      ]
    });

    let position = 0;
    for (const sec of sections) {
      const subSections = sec.subSections || [];
      for (const sub of subSections) {
        position++;
        if (String(sub.id) === String(subSectionId)) {
          return position;
        }
      }
    }
    return 0;
  }

  /**
   * Process Silver Plan expirations in batch (Cron job helper).
   * @returns {Promise<number>} Number of expired enrollments updated
   */
  static async expireSilverPlans() {
    const [affectedRows] = await Enrollment.update(
      { status: 'expired' },
      {
        where: {
          plan: PLAN_TYPES.SILVER,
          status: 'active',
          expiresAt: {
            [Op.lte]: new Date()
          }
        }
      }
    );
    return affectedRows;
  }
}

module.exports = AccessControlService;

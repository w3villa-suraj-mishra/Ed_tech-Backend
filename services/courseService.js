const helpers = require('../utils/helpers');

const toCamelCase = (key) => {
  return key.replace(/_([a-z])/g, (_, chr) => chr.toUpperCase());
};

const normalizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const normalized = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    normalized[key] = value;
    const camelKey = toCamelCase(key);
    if (camelKey !== key) {
      normalized[camelKey] = value;
    }
  });

  return normalized;
};

const formatSubSection = (subSection) => {
  const sub = normalizeObject(subSection);
  const durationSeconds = parseInt(sub.duration, 10) || helpers.parseTimeDuration(sub.timeDuration) || 0;
  const formatted = {
    ...sub,
    _id: sub.id,
    durationSeconds,
    duration: secondsToPrettyString(durationSeconds)
  };
  return formatted;
};

const secondsToPrettyString = (seconds) => {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);
  return parts.join(' ');
};

const formatCourse = async (course, currentUserId = null) => {
  if (!course) return null;

  const coursePlain = course.get ? course.get({ plain: true }) : { ...course };
  const result = normalizeObject(coursePlain);
  result._id = coursePlain.id;

  const { calculateCoursePrice } = require('./pricingService');
  const pricing = calculateCoursePrice(coursePlain);
  result.pricing = pricing;
  // Dynamic price field alias for client components relying on price
  result.price = pricing.finalPrice;
  result.originalPrice = pricing.originalPrice;

  const completedVideos = [];
  if (currentUserId && coursePlain.courseProgresses) {
    coursePlain.courseProgresses.forEach((progress) => {
      if (progress.courseProgressVideos) {
        progress.courseProgressVideos.forEach((video) => {
          completedVideos.push(video.subSectionId || video.sub_section_id);
        });
      }
    });
  }

  // Get enrollment status if user is provided
  let userEnrollment = null;
  if (currentUserId) {
    const { Enrollment } = require('../models');
    userEnrollment = await Enrollment.findOne({
      where: { userId: currentUserId, courseId: coursePlain.id }
    });
    if (userEnrollment && userEnrollment.plan === 'silver' && userEnrollment.expiresAt && new Date(userEnrollment.expiresAt) <= new Date()) {
      await userEnrollment.update({ status: 'expired' });
    }
  }

  result.userEnrollment = userEnrollment ? {
    plan: userEnrollment.plan,
    status: userEnrollment.status,
    activatedAt: userEnrollment.activatedAt,
    expiresAt: userEnrollment.expiresAt
  } : null;

  let globalVideoCounter = 0;

  result.courseContent = (coursePlain.sections || []).map((sectionRaw) => {
    const section = normalizeObject(sectionRaw);
    section._id = section.id;
    section.sectionName = section.sectionName || section.section_name;

    const subSectionList = (sectionRaw.subSections || sectionRaw.sub_sections || []).map((subRaw) => {
      globalVideoCounter++;
      const formatted = formatSubSection(subRaw);
      const isFreeVideo = globalVideoCounter <= 2;

      let isUnlocked = false;
      let accessReason = '';

      if (userEnrollment && userEnrollment.status === 'active') {
        if (userEnrollment.plan === 'gold') {
          isUnlocked = true;
          accessReason = 'Gold Lifetime Access';
        } else if (userEnrollment.plan === 'silver') {
          if (!userEnrollment.expiresAt || new Date(userEnrollment.expiresAt) > new Date()) {
            isUnlocked = true;
            accessReason = 'Silver 1-Year Access';
          } else {
            isUnlocked = isFreeVideo;
            accessReason = isFreeVideo ? 'Free Preview' : 'Silver Expired';
          }
        } else {
          // Free Plan
          isUnlocked = isFreeVideo;
          accessReason = isFreeVideo ? 'Free Access (First 2 Videos)' : 'Requires Silver or Gold Upgrade';
        }
      } else {
        // Unenrolled User
        isUnlocked = isFreeVideo;
        accessReason = isFreeVideo ? 'Free Access (First 2 Videos)' : 'Requires Enrollment';
      }

      return {
        ...formatted,
        videoPosition: globalVideoCounter,
        isFreeVideo,
        isUnlocked,
        accessReason,
        // Hide videoUrl for locked videos on the backend to prevent inspection bypass
        videoUrl: isUnlocked ? formatted.videoUrl : null
      };
    });

    return {
      ...section,
      subSection: subSectionList,
      totalDurationSeconds: subSectionList.reduce((sum, item) => sum + (item.durationSeconds || 0), 0),
      totalDuration: secondsToPrettyString(subSectionList.reduce((sum, item) => sum + (item.durationSeconds || 0), 0))
    };
  });

  const courseDurationSeconds = result.courseContent.reduce((sum, section) => sum + (section.totalDurationSeconds || 0), 0);
  result.totalDurationSeconds = courseDurationSeconds;
  result.totalDuration = secondsToPrettyString(courseDurationSeconds);
  result.completedVideos = [...new Set(completedVideos)];

  if (coursePlain.category) {
    result.category = normalizeObject(coursePlain.category);
  }

  return result;
};

module.exports = {
  formatCourse,
  normalizeObject,
  secondsToPrettyString
};

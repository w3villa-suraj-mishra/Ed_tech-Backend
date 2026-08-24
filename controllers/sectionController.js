const {
  Course,
  Section,
  SubSection,
  CourseProgress,
  CourseProgressVideo
} = require('../models');
const courseService = require('../services/courseService');
const uploadService = require('../services/uploadService');
const accessControlService = require('../services/accessControlService');
const logger = require('../utils/logger');

const sectionController = {
  /**
   * Add section to course
   */
  addSection: async (req, res) => {
    try {
      const { sectionName, courseId } = req.body;

      const course = await Course.findByPk(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const section = await Section.create({
        sectionName,
        courseId
      });

      const updatedCourse = await Course.findByPk(courseId, {
        include: [
          {
            association: 'sections',
            include: [{ association: 'subSections' }]
          }
        ]
      });

      const formattedCourse = await courseService.formatCourse(updatedCourse);

      return res.status(201).json({
        success: true,
        message: 'Section created successfully',
        updatedCourse: formattedCourse
      });
    } catch (error) {
      logger.error('ADD SECTION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update section
   */
  updateSection: async (req, res) => {
    try {
      const { sectionName, sectionId, courseId } = req.body;

      const section = await Section.findByPk(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      await section.update({ sectionName });

      const course = await Course.findByPk(courseId, {
        include: [
          {
            association: 'sections',
            include: [{ association: 'subSections' }]
          }
        ]
      });

      const formattedCourse = await courseService.formatCourse(course);

      return res.status(200).json({
        success: true,
        message: 'Section updated successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('UPDATE SECTION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Delete section
   */
  deleteSection: async (req, res) => {
    try {
      const { sectionId, courseId } = req.body;

      const section = await Section.findByPk(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      await section.destroy();

      const course = await Course.findByPk(courseId, {
        include: [
          {
            association: 'sections',
            include: [{ association: 'subSections' }]
          }
        ]
      });

      const formattedCourse = await courseService.formatCourse(course);

      return res.status(200).json({
        success: true,
        message: 'Section deleted successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('DELETE SECTION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Add subsection
   */
  addSubSection: async (req, res) => {
    try {
      const { sectionId, title, description, duration } = req.body;

      const section = await Section.findByPk(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      let videoUrl = null;

      // Handle video upload
      if (req.file) {
        videoUrl = await uploadService.handleFileUpload(req.file, true);
      }

      const subSection = await SubSection.create({
        title,
        description,
        duration: parseInt(duration) || 0,
        videoUrl,
        sectionId
      });

      const updatedCourse = await Course.findByPk(section.courseId, {
        include: [
          {
            association: 'sections',
            include: [{ association: 'subSections' }]
          }
        ]
      });

      const formattedCourse = await courseService.formatCourse(updatedCourse);

      return res.status(201).json({
        success: true,
        message: 'Lecture added successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('ADD SUBSECTION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update subsection
   */
  updateSubSection: async (req, res) => {
    try {
      const { subSectionId, title, description, duration } = req.body;

      const subSection = await SubSection.findByPk(subSectionId);

      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: 'SubSection not found'
        });
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (duration !== undefined) updateData.duration = parseInt(duration) || 0;

      // Handle video upload
      if (req.file) {
        const videoUrl = await uploadService.handleFileUpload(req.file, true);
        updateData.videoUrl = videoUrl;
      }

      await subSection.update(updateData);

      const section = await Section.findByPk(subSection.sectionId);
      const course = await Course.findByPk(section.courseId, {
        include: [
          {
            association: 'sections',
            include: [{ association: 'subSections' }]
          }
        ]
      });

      const formattedCourse = await courseService.formatCourse(course);

      return res.status(200).json({
        success: true,
        message: 'Lecture updated successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('UPDATE SUBSECTION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Delete subsection
   */
  deleteSubSection: async (req, res) => {
    try {
      const { subSectionId, sectionId } = req.body;

      const subSection = await SubSection.findByPk(subSectionId);

      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: 'SubSection not found'
        });
      }

      await subSection.destroy();

      const section = await Section.findByPk(sectionId);
      const course = await Course.findByPk(section.courseId, {
        include: [
          {
            association: 'sections',
            include: [{ association: 'subSections' }]
          }
        ]
      });

      const formattedCourse = await courseService.formatCourse(course);

      return res.status(200).json({
        success: true,
        message: 'Lecture deleted successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('DELETE SUBSECTION FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update course progress
   */
  updateCourseProgress: async (req, res) => {
    try {
      const { courseId, subSectionId } = req.body;

      if (!courseId || !subSectionId) {
        return res.status(400).json({
          success: false,
          message: 'Missing fields'
        });
      }

      const userId = req.user.id;

      // Enforce backend access control before allowing video progress update
      const accessCheck = await accessControlService.canAccessVideo(userId, courseId, subSectionId);
      if (!accessCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: accessCheck.reason
        });
      }

      let progress = await CourseProgress.findOne({
        where: { userId, courseId }
      });

      if (!progress) {
        progress = await CourseProgress.create({
          userId,
          courseId
        });
      }

      // Check if video already marked as completed
      const completedVideo = await CourseProgressVideo.findOne({
        where: {
          courseProgressId: progress.id,
          subSectionId
        }
      });

      if (completedVideo) {
        return res.status(200).json({
          success: true,
          message: 'Already completed'
        });
      }

      await CourseProgressVideo.create({
        courseProgressId: progress.id,
        subSectionId
      });

      return res.status(200).json({
        success: true,
        message: 'Lecture marked as completed'
      });
    } catch (error) {
      logger.error('UPDATE COURSE PROGRESS FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = sectionController;

const { sectionQuery, courseQuery } = require('../nativequery');
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

      const course = await courseQuery.findCourseByIdQuery(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      await sectionQuery.createSectionQuery({
        sectionName,
        courseId
      });

      const updatedCourse = await courseQuery.findCourseDetailsByIdQuery(courseId);
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

      const section = await sectionQuery.findSectionByIdQuery(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      await sectionQuery.updateSectionQuery({ sectionId, sectionName });

      const course = await courseQuery.findCourseDetailsByIdQuery(courseId);
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

      const section = await sectionQuery.findSectionByIdQuery(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      await sectionQuery.deleteSectionQuery(sectionId);

      const course = await courseQuery.findCourseDetailsByIdQuery(courseId);
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

      const section = await sectionQuery.findSectionByIdQuery(sectionId);

      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      let videoUrl = null;
      if (req.file) {
        videoUrl = await uploadService.handleFileUpload(req.file, true);
      }

      await sectionQuery.createSubSectionQuery({
        title,
        description,
        duration: parseInt(duration) || 0,
        videoUrl,
        sectionId
      });

      const updatedCourse = await courseQuery.findCourseDetailsByIdQuery(section.courseId);
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

      const subSection = await sectionQuery.findSubSectionByIdQuery(subSectionId);

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

      if (req.file) {
        const videoUrl = await uploadService.handleFileUpload(req.file, true);
        updateData.videoUrl = videoUrl;
      }

      await sectionQuery.updateSubSectionQuery(subSectionId, updateData);

      const section = await sectionQuery.findSectionByIdQuery(subSection.sectionId);
      const course = await courseQuery.findCourseDetailsByIdQuery(section.courseId);
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

      const subSection = await sectionQuery.findSubSectionByIdQuery(subSectionId);

      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: 'SubSection not found'
        });
      }

      await sectionQuery.deleteSubSectionQuery(subSectionId);

      const section = await sectionQuery.findSectionByIdQuery(sectionId);
      const course = await courseQuery.findCourseDetailsByIdQuery(section.courseId);
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

      const accessCheck = await accessControlService.canAccessVideo(userId, courseId, subSectionId);
      if (!accessCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: accessCheck.reason
        });
      }

      const progress = await sectionQuery.findOrCreateCourseProgressQuery(userId, courseId);

      const completedVideo = await sectionQuery.findCompletedVideoQuery(progress.id, subSectionId);

      if (completedVideo) {
        return res.status(200).json({
          success: true,
          message: 'Already completed'
        });
      }

      await sectionQuery.markVideoCompletedQuery(progress.id, subSectionId);

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

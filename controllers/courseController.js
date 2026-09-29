const { Op } = require('sequelize');
const { courseQuery, sectionQuery } = require('../nativequery');
const courseService = require('../services/courseService');
const uploadService = require('../services/uploadService');
const logger = require('../utils/logger');

const courseController = {
  /**
   * Get dynamic homepage statistics
   */
  getHomePageStats: async (req, res) => {
    try {
      const stats = await courseQuery.getHomePageStatsQuery();

      return res.status(200).json({
        success: true,
        data: {
          learnersCount: stats.learnersCount,
          coursesCount: stats.coursesCount,
          projectsCount: stats.projectsCount,
          certificationsCount: stats.certificationsCount,
          hoursLearned: stats.hoursLearned,
          averageRating: stats.rating
        }
      });
    } catch (error) {
      logger.error('GET HOMEPAGE STATS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get or generate course completion certificate (backend verified)
   */
  getCertificate: async (req, res) => {
    try {
      const courseId = req.query.courseId || req.body.courseId;
      const userId = req.user.id;

      if (!courseId) {
        return res.status(400).json({ success: false, message: 'courseId is required' });
      }

      const course = await courseQuery.findCourseDetailsByIdQuery(courseId);

      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      let totalLectures = 0;
      (course.courseContent || course.sections || []).forEach((sec) => {
        totalLectures += sec.subSections ? sec.subSections.length : 0;
      });

      const userProgress = await courseQuery.getUserCourseProgressQuery(userId, courseId);

      const completedCount = userProgress?.courseProgressVideos ? userProgress.courseProgressVideos.length : 0;
      const progressPercentage = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

      if (progressPercentage < 100 && totalLectures > 0) {
        return res.status(400).json({
          success: false,
          isLocked: true,
          progressPercentage,
          message: 'Please complete the full course to unlock and receive your certificate.'
        });
      }

      let certificate = await courseQuery.findCertificateQuery(userId, courseId);

      if (!certificate) {
        const dateStr = new Date().getFullYear();
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const certIdStr = `CERT-${dateStr}-${randomNum}`;

        certificate = await courseQuery.createCertificateQuery({
          certificateId: certIdStr,
          userId,
          courseId,
          instructorId: course.instructorId
        });

        const eventDispatcher = require('../services/eventDispatcher');
        eventDispatcher.emit('COURSE_COMPLETED', {
          userId,
          courseId,
          courseName: course.courseName,
          certificateId: certIdStr
        });
      }

      const instructorName = course.instructor
        ? `${course.instructor.firstName || ''} ${course.instructor.lastName || ''}`.trim()
        : 'Instructor';

      return res.status(200).json({
        success: true,
        data: {
          ...certificate.toJSON(),
          courseName: course.courseName,
          instructorName,
          progressPercentage: 100
        }
      });
    } catch (error) {
      logger.error('GET CERTIFICATE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Public certificate verification endpoint
   */
  verifyCertificate: async (req, res) => {
    try {
      const { certificateId } = req.params;
      if (!certificateId) {
        return res.status(400).json({ success: false, message: 'Certificate ID is required' });
      }

      const cert = await courseQuery.findCertificateByCertIdQuery(certificateId);

      if (!cert) {
        return res.status(404).json({ success: false, isValid: false, message: 'Invalid or non-existent certificate ID' });
      }

      return res.status(200).json({
        success: true,
        isValid: true,
        data: {
          certificateId: cert.certificateId,
          studentName: `${cert.user?.firstName || ''} ${cert.user?.lastName || ''}`.trim(),
          courseName: cert.course?.courseName || 'Course',
          completedAt: cert.completedAt,
          issuedAt: cert.issuedAt
        }
      });
    } catch (error) {
      logger.error('VERIFY CERTIFICATE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Post a comment for a course discussion
   */
  postComment: async (req, res) => {
    try {
      const { courseId, text, parentCommentId } = req.body;
      const userId = req.user.id;

      if (!courseId || !text) {
        return res.status(400).json({ success: false, message: 'courseId and text are required' });
      }

      const fetchedComment = await courseQuery.createCourseCommentQuery({
        courseId,
        userId,
        parentCommentId,
        text
      });

      const eventDispatcher = require('../services/eventDispatcher');
      const commenterName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      eventDispatcher.emit('NEW_COMMENT', {
        commenterId: userId,
        courseId,
        parentCommentUserId: parentCommentId ? (await courseQuery.findCourseCommentByIdQuery(parentCommentId))?.userId : null,
        commenterName
      });

      return res.status(201).json({
        success: true,
        message: 'Comment posted successfully',
        data: {
          ...fetchedComment.toJSON(),
          _id: fetchedComment.id
        }
      });
    } catch (error) {
      logger.error('POST COMMENT FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get all comments for a course discussion
   */
  getComments: async (req, res) => {
    try {
      const courseId = req.query.courseId || req.body.courseId;
      if (!courseId) {
        return res.status(400).json({ success: false, message: 'courseId is required' });
      }

      const comments = await courseQuery.findCourseCommentsQuery(courseId);

      return res.status(200).json({
        success: true,
        data: comments.map((c) => ({
          ...c.toJSON(),
          _id: c.id
        }))
      });
    } catch (error) {
      logger.error('GET COMMENTS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Delete a comment
   */
  deleteComment: async (req, res) => {
    try {
      const commentId = req.body?.commentId || req.query?.commentId || req.params?.commentId;
      const userId = req.user.id;

      if (!commentId) {
        return res.status(400).json({ success: false, message: 'commentId is required' });
      }

      const comment = await courseQuery.findCourseCommentByIdQuery(commentId);
      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      if (String(comment.userId) !== String(userId) && !['Admin', 'Superadmin', 'Student', 'Instructor'].includes(req.user?.accountType)) {
        return res.status(403).json({ success: false, message: 'Unauthorized to delete this comment' });
      }

      await courseQuery.deleteCourseCommentQuery(commentId);
      return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      logger.error('DELETE COMMENT FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Create a new course
   */
  createCourse: async (req, res) => {
    try {
      const {
        courseName,
        courseDescription,
        whatYouWillLearn,
        price,
        tag,
        category,
        status,
        instructions
      } = req.body;

      const instructorId = req.user.id;
      let thumbnail = null;

      if (!courseName || !courseDescription || !whatYouWillLearn) {
        return res.status(400).json({
          success: false,
          message: 'All required course fields must be provided'
        });
      }

      const categoryData = await courseQuery.findCategoryByIdOrNameQuery(category);
      const targetCategoryId = categoryData ? categoryData.id : null;

      if (req.file) {
        if (req.file.size > 10 * 1024 * 1024) {
          uploadService.deleteLocalFile(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum allowed size is 10MB.'
          });
        }

        thumbnail = await uploadService.handleFileUpload(req.file, false);
      }

      let numericPrice = 0;
      if (price !== undefined && price !== null && price !== '') {
        const cleanedPrice = String(price).replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleanedPrice);
        numericPrice = isNaN(parsed) ? 0 : Math.round(parsed);
      }

      const course = await courseQuery.createCourseQuery({
        courseName,
        courseDescription,
        whatYouWillLearn,
        price: numericPrice,
        originalPrice: numericPrice,
        tag,
        instructions,
        categoryId: targetCategoryId,
        instructorId,
        status: status || 'Draft',
        thumbnail
      });

      const formattedCourse = await courseService.formatCourse(course);

      return res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('CREATE COURSE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Get course details
   */
  getCourseDetails: async (req, res) => {
    try {
      const courseId = req.body.courseId || req.query.courseId;
      const course = await courseQuery.findCourseDetailsByIdQuery(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const formattedCourse = await courseService.formatCourse(course, req.user?.id);

      return res.status(200).json({
        success: true,
        data: formattedCourse
      });
    } catch (error) {
      logger.error('GET COURSE DETAILS FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Get full course details for authenticated user
   */
  getFullCourseDetails: async (req, res) => {
    try {
      const courseId = req.body.courseId || req.query.courseId;
      const course = await courseQuery.findCourseDetailsByIdQuery(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const formattedCourse = await courseService.formatCourse(course, req.user?.id);

      return res.status(200).json({
        success: true,
        data: formattedCourse
      });
    } catch (error) {
      logger.error('GET FULL COURSE DETAILS FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Get instructor's courses
   */
  getInstructorCourses: async (req, res) => {
    try {
      const instructorId = req.user.id;
      const courses = await courseQuery.findInstructorCoursesQuery(instructorId);

      const formattedCourses = await Promise.all(
        courses.map(course => courseService.formatCourse(course))
      );

      return res.status(200).json({
        success: true,
        data: formattedCourses
      });
    } catch (error) {
      logger.error('GET INSTRUCTOR COURSES FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Get all courses
   */
  getAllCourses: async (req, res) => {
    try {
      const courses = await courseQuery.findAllPublishedCoursesQuery();

      const formattedCourses = await Promise.all(
        courses.map(course => courseService.formatCourse(course))
      );

      return res.status(200).json({
        success: true,
        data: formattedCourses
      });
    } catch (error) {
      logger.error('GET ALL COURSES FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Edit course
   */
  editCourse: async (req, res) => {
    try {
      const courseId = req.body.courseId || req.query.courseId;
      const {
        courseName,
        courseDescription,
        whatYouWillLearn,
        price,
        tag,
        status,
        category,
        instructions
      } = req.body;

      const course = await courseQuery.findCourseByIdQuery(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.instructorId !== req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const updateData = {};
      if (courseName) updateData.courseName = courseName;
      if (courseDescription) updateData.courseDescription = courseDescription;
      if (whatYouWillLearn) updateData.whatYouWillLearn = whatYouWillLearn;
      if (price !== undefined && price !== '') {
        const parsedPrice = Math.round(parseFloat(price));
        updateData.price = isNaN(parsedPrice) ? 0 : parsedPrice;
        updateData.originalPrice = updateData.price;
      }
      if (tag) updateData.tag = tag;
      if (status) updateData.status = status;
      if (category) updateData.categoryId = category;
      if (instructions) updateData.instructions = instructions;

      if (req.file) {
        const thumbnail = await uploadService.handleFileUpload(req.file, false);
        updateData.thumbnail = thumbnail;
      }

      const updatedCourse = await courseQuery.updateCourseQuery(courseId, updateData);
      const formattedCourse = await courseService.formatCourse(updatedCourse);

      return res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: formattedCourse
      });
    } catch (error) {
      logger.error('EDIT COURSE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update Course Pricing & Offers (Admin or Owner Instructor)
   */
  updateCoursePricing: async (req, res) => {
    try {
      const courseId = req.params.id || req.body.courseId;
      const { price } = req.body;

      const course = await courseQuery.findCourseByIdQuery(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const activeUser = req.user || req.admin;
      if (!activeUser) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const isUserAdmin = ['Admin', 'Superadmin'].includes(activeUser.accountType);
      const isOwner = course.instructorId === activeUser.id;

      if (!isUserAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only manage pricing for courses you own.'
        });
      }

      const updatedCourse = await courseQuery.updateCoursePricingQuery({
        courseId,
        price: price !== undefined ? price : course.price,
        isFree: Number(price) === 0,
        changedById: activeUser.id,
        changeReason: 'Updated by admin/instructor'
      });

      const { calculateCoursePrice } = require('../services/pricingService');
      const pricing = calculateCoursePrice(updatedCourse);

      return res.status(200).json({
        success: true,
        message: 'Course pricing updated successfully',
        data: {
          courseId: course.id,
          pricing
        }
      });
    } catch (error) {
      logger.error('UPDATE COURSE PRICING FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get Course Pricing & Audits
   */
  getCoursePricing: async (req, res) => {
    try {
      const courseId = req.params.id || req.query.courseId;
      const course = await courseQuery.findCourseByIdQuery(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const { calculateCoursePrice } = require('../services/pricingService');
      const pricing = calculateCoursePrice(course);

      const audits = await courseQuery.getCoursePriceAuditsQuery(course.id);

      return res.status(200).json({
        success: true,
        data: {
          courseId: course.id,
          pricing,
          audits
        }
      });
    } catch (error) {
      logger.error('GET COURSE PRICING FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Delete course
   */
  deleteCourse: async (req, res) => {
    try {
      const courseId = req.body.courseId || req.query.courseId;
      const course = await courseQuery.findCourseByIdQuery(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.instructorId !== req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized to delete this course'
        });
      }

      await courseQuery.deleteCourseAndRelationsQuery(courseId);

      return res.status(200).json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      logger.error('DELETE COURSE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Show all categories with published course counts
   */
  showAllCategories: async (req, res) => {
    try {
      const categoriesJson = await courseQuery.findAllCategoriesQuery();

      return res.status(200).json({
        success: true,
        data: categoriesJson
      });
    } catch (error) {
      logger.error('SHOW ALL CATEGORIES FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Create categories
   */
  createCategory: async (req, res) => {
    try {
      const categoriesData = req.body;

      if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No category data provided'
        });
      }

      const created = await Promise.all(
        categoriesData.map(cat =>
          courseQuery.createCategoryQuery({
            name: cat.name,
            description: cat.description
          })
        )
      );

      return res.status(201).json({
        success: true,
        message: 'Categories created successfully',
        data: created
      });
    } catch (error) {
      logger.error('CREATE CATEGORY FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Create or update a rating and review for a course (Upsert - 1 review per user/course)
   */
  createRating: async (req, res) => {
    try {
      const { courseId, rating, review } = req.body;
      const userId = req.user.id;

      if (!courseId || rating === undefined) {
        return res.status(400).json({ success: false, message: 'Missing rating payload' });
      }

      const ratingResult = await courseQuery.upsertRatingAndReviewQuery({
        userId,
        courseId,
        rating: Number(rating),
        review: review || null
      });

      return res.status(200).json({ success: true, message: 'Rating saved successfully', data: ratingResult });
    } catch (error) {
      logger.error('CREATE RATING FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get ratings and reviews for a course
   */
  getReviews: async (req, res) => {
    try {
      const reviews = await courseQuery.findAllRatingsAndReviewsQuery();

      return res.status(200).json({
        success: true,
        data: reviews.map((review) => ({
          ...review.toJSON(),
          _id: review.id,
          user: review.user ? review.user.toJSON() : null,
          course: review.course ? review.course.toJSON() : null
        }))
      });
    } catch (error) {
      logger.error('GET REVIEWS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get category page details and counts
   */
  getCategoryPageDetails: async (req, res) => {
    try {
      const categoriesJson = await courseQuery.findAllCategoriesQuery();
      return res.status(200).json({ success: true, data: categoriesJson });
    } catch (error) {
      logger.error('GET CATEGORY PAGE DETAILS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Update lecture duration
   */
  updateLectureDuration: async (req, res) => {
    try {
      const { subSectionId, duration } = req.body;
      if (!subSectionId) {
        return res.status(400).json({ success: false, message: 'Subsection ID is required' });
      }

      const subSection = await courseQuery.updateSubSectionDurationQuery(subSectionId, duration);
      if (!subSection) {
        return res.status(404).json({ success: false, message: 'SubSection not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Duration updated successfully',
        data: subSection.duration
      });
    } catch (error) {
      logger.error('UPDATE LECTURE DURATION FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = courseController;

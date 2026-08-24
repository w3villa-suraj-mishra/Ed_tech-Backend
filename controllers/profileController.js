const { User, Course, Enrollment, Section, SubSection, RatingAndReview } = require('../models');
const logger = require('../utils/logger');

const profileController = {
  /**
   * Get user details
   */
  getUserDetails: async (req, res) => {
    try {
      const user = req.user;
      const profile = await user.getProfile();

      return res.status(200).json({
        success: true,
        message: 'User data fetched successfully',
        data: {
          id: user.id,
          _id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          accountType: user.accountType,
          account_type: user.accountType,
          image: user.image,
          active: user.active,
          approved: user.approved,
          profile: profile ? profile.toJSON() : null,
          additionalDetails: profile ? profile.toJSON() : null
        }
      });
    } catch (error) {
      logger.error('GET USER DETAILS FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Get enrolled courses for a user
   */
  getEnrolledCourses: async (req, res) => {
    try {
      const userId = req.user.id;
      const { CourseProgress, CourseProgressVideo } = require('../models');

      const enrollments = await Enrollment.findAll({
        where: { userId },
        include: [
          {
            model: Course,
            as: 'course',
            required: false,
            include: [
              {
                model: Section,
                as: 'sections',
                required: false,
                include: [
                  {
                    model: SubSection,
                    as: 'subSections',
                    required: false
                  }
                ]
              },
              {
                model: RatingAndReview,
                as: 'ratingAndReviews',
                required: false
              }
            ]
          }
        ]
      });

      const userProgresses = await CourseProgress.findAll({
        where: { userId },
        include: [{ model: CourseProgressVideo, as: 'courseProgressVideos' }]
      });

      const data = enrollments
        .filter(entry => entry.course !== null && entry.course !== undefined)
        .map((entry) => {
          const courseData = entry.course.toJSON();
          const isSilverExpired = entry.plan === 'silver' && entry.expiresAt && new Date(entry.expiresAt) <= new Date();
          const liveStatus = isSilverExpired ? 'expired' : entry.status;

          // Calculate total lectures
          let totalLectures = 0;
          if (courseData.sections && Array.isArray(courseData.sections)) {
            courseData.sections.forEach(sec => {
              if (sec.subSections && Array.isArray(sec.subSections)) {
                totalLectures += sec.subSections.length;
              }
            });
          }

          // Calculate ratings
          const reviews = courseData.ratingAndReviews || [];
          const totalRatingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
          const ratingCount = reviews.length;
          const averageRating = ratingCount > 0 ? (totalRatingSum / ratingCount).toFixed(1) : 0;

          // Find progress record for this course
          const progRecord = userProgresses.find(p => p.courseId === courseData.id);
          const completedVideosCount = progRecord?.courseProgressVideos ? progRecord.courseProgressVideos.length : 0;

          let progressPercentage = 0;
          if (totalLectures > 0) {
            progressPercentage = Math.round((completedVideosCount / totalLectures) * 100);
          } else if (completedVideosCount > 0) {
            progressPercentage = 100;
          }

          return {
            ...courseData,
            _id: courseData.id,
            id: courseData.id,
            enrollmentId: entry.id,
            plan: entry.plan,
            accessPlan: entry.plan,
            status: liveStatus,
            accessStatus: liveStatus,
            activatedAt: entry.activatedAt,
            expiresAt: entry.expiresAt,
            isExpired: isSilverExpired,
            purchasePrice: entry.purchasePrice,
            courseContent: courseData.sections || [],
            progressPercentage,
            completedVideosCount,
            totalLectures,
            averageRating: Number(averageRating),
            ratingCount
          };
        });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      logger.error('GET ENROLLED COURSES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async (req, res) => {
    try {
      const user = req.user;

      await user.destroy();

      return res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('DELETE ACCOUNT FAILED:', error.message);
      return res.status(422).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  },

  /**
   * Update the user's display picture
   */
  updateDisplayPicture: async (req, res) => {
    try {
      const user = req.user;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }

      const uploadService = require('../services/uploadService');
      const imageUrl = await uploadService.handleFileUpload(req.file, false);

      await user.update({ image: imageUrl });

      return res.status(200).json({
        success: true,
        message: 'Display picture updated successfully',
        data: {
          id: user.id,
          _id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountType: user.accountType,
          image: user.image
        }
      });
    } catch (error) {
      logger.error('UPDATE DISPLAY PICTURE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Get comprehensive instructor dashboard data
   */
  instructorDashboard: async (req, res) => {
    try {
      const instructorId = req.user.id;
      const { Op } = require('sequelize');

      // Fetch all courses for this instructor including enrollments and ratingAndReviews
      const courses = await Course.findAll({
        where: { instructorId },
        include: [
          { model: Enrollment, as: 'enrollments' },
          {
            model: RatingAndReview,
            as: 'ratingAndReviews',
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'image'] }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      let totalCourses = courses.length;
      let totalCoursesThisMonth = 0;
      let totalCoursesLastMonth = 0;

      let allEnrollments = [];
      let allReviews = [];
      let totalEarnings = 0;
      let totalEarningsThisMonth = 0;
      let totalEarningsLastMonth = 0;
      let totalStudentsThisMonth = 0;
      let totalStudentsLastMonth = 0;

      const courseDetails = courses.map((course) => {
        const cJson = course.toJSON();
        const courseCreated = new Date(course.createdAt);
        if (courseCreated >= firstDayThisMonth) totalCoursesThisMonth++;
        else if (courseCreated >= firstDayLastMonth && courseCreated < firstDayThisMonth) totalCoursesLastMonth++;

        const enrolls = cJson.enrollments || [];
        const reviews = cJson.ratingAndReviews || [];

        allEnrollments.push(...enrolls);
        allReviews.push(...reviews.map(r => ({ ...r, courseName: cJson.courseName })));

        const coursePrice = Number(cJson.price || 0);
        const courseEarnings = enrolls.reduce((sum, e) => sum + Number(e.purchasePrice || coursePrice), 0);
        totalEarnings += courseEarnings;

        enrolls.forEach(e => {
          const eDate = new Date(e.createdAt);
          if (eDate >= firstDayThisMonth) {
            totalStudentsThisMonth++;
            totalEarningsThisMonth += Number(e.purchasePrice || coursePrice);
          } else if (eDate >= firstDayLastMonth && eDate < firstDayThisMonth) {
            totalStudentsLastMonth++;
            totalEarningsLastMonth += Number(e.purchasePrice || coursePrice);
          }
        });

        const ratingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 0;

        return {
          _id: cJson.id,
          id: cJson.id,
          courseName: cJson.courseName,
          courseDescription: cJson.courseDescription,
          thumbnail: cJson.thumbnail,
          status: cJson.status || 'Draft',
          price: coursePrice,
          totalStudentsEnrolled: enrolls.length,
          totalAmountGenerated: courseEarnings,
          ratingAndReviews: reviews,
          averageRating: avgRating,
          createdAt: cJson.createdAt
        };
      });

      // Unique student count
      const uniqueStudentIds = new Set(allEnrollments.map(e => e.userId));
      const totalStudents = uniqueStudentIds.size;

      // Overall average rating across all instructor courses
      const overallRatingSum = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const overallAvgRating = allReviews.length > 0 ? Number((overallRatingSum / allReviews.length).toFixed(1)) : 0;

      // Calculate monthly comparison deltas
      const courseDelta = totalCoursesThisMonth - totalCoursesLastMonth;
      const studentDelta = totalStudentsThisMonth - totalStudentsLastMonth;
      const earningsDelta = totalEarningsThisMonth - totalEarningsLastMonth;

      return res.status(200).json({
        success: true,
        data: courseDetails,
        stats: {
          totalCourses,
          totalStudents,
          totalEarnings,
          averageRating: overallAvgRating,
          courseDelta: courseDelta !== 0 ? `${courseDelta > 0 ? '+' : ''}${courseDelta} this month` : null,
          studentDelta: studentDelta !== 0 ? `${studentDelta > 0 ? '+' : ''}${studentDelta} this month` : null,
          earningsDelta: earningsDelta !== 0 ? `${earningsDelta > 0 ? '+' : ''}₹${earningsDelta} this month` : null,
          reviews: allReviews
        }
      });
    } catch (error) {
      logger.error('INSTRUCTOR DASHBOARD FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (req, res) => {
    try {
      const {
        gender,
        dateOfBirth,
        about,
        contactNumber,
        firstName,
        lastName,
        address,
        latitude,
        longitude
      } = req.body;

      const user = req.user;

      // Update user name if provided
      if (firstName || lastName) {
        await user.update({
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName
        });
      }

      // Update or create profile
      let profile = await user.getProfile();

      if (!profile) {
        profile = await user.createProfile({});
      }

      await profile.update({
        gender,
        dateOfBirth,
        about,
        contactNumber,
        address: address !== undefined ? address : profile.address,
        latitude: latitude !== undefined ? latitude : profile.latitude,
        longitude: longitude !== undefined ? longitude : profile.longitude
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profile: profile.toJSON(),
          additionalDetails: profile.toJSON()
        }
      });
    } catch (error) {
      logger.error('UPDATE PROFILE FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = profileController;

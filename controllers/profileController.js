const { profileQuery } = require('../nativequery');
const uploadService = require('../services/uploadService');
const logger = require('../utils/logger');

const profileController = {
  /**
   * Get user details
   */
  getUserDetails: async (req, res) => {
    try {
      const user = req.user;
      const profile = await profileQuery.findProfileByUserIdQuery(user.id);

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
      const { enrollments, userProgresses } = await profileQuery.getUserEnrolledCoursesQuery(userId);

      const data = enrollments
        .filter(entry => entry.course !== null && entry.course !== undefined)
        .map((entry) => {
          const courseData = entry.course.toJSON();
          const isSilverExpired = entry.plan === 'silver' && entry.expiresAt && new Date(entry.expiresAt) <= new Date();
          const liveStatus = isSilverExpired ? 'expired' : entry.status;

          let totalLectures = 0;
          if (courseData.sections && Array.isArray(courseData.sections)) {
            courseData.sections.forEach(sec => {
              if (sec.subSections && Array.isArray(sec.subSections)) {
                totalLectures += sec.subSections.length;
              }
            });
          }

          const reviews = courseData.ratingAndReviews || [];
          const totalRatingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
          const ratingCount = reviews.length;
          const averageRating = ratingCount > 0 ? (totalRatingSum / ratingCount).toFixed(1) : 0;

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
      await profileQuery.deleteUserAccountQuery(user);

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

      const imageUrl = await uploadService.handleFileUpload(req.file, false);
      await profileQuery.updateUserImageQuery(user, imageUrl);

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
      const courses = await profileQuery.getInstructorCoursesQuery(instructorId);

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

      const uniqueStudentIds = new Set(allEnrollments.map(e => e.userId));
      const totalStudents = uniqueStudentIds.size;

      const overallRatingSum = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const overallAvgRating = allReviews.length > 0 ? Number((overallRatingSum / allReviews.length).toFixed(1)) : 0;

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

      if (firstName || lastName) {
        await user.update({
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName
        });
      }

      const profile = await profileQuery.updateProfileQuery(user.id, {
        gender,
        dateOfBirth,
        about,
        contactNumber,
        address,
        latitude,
        longitude
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profile: profile ? profile.toJSON() : null,
          additionalDetails: profile ? profile.toJSON() : null
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

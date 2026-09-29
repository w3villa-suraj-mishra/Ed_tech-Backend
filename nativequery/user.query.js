const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const { User, Profile } = require('../models');

/**
 * User & Profile Native Queries Layer
 */

/**
 * Get user profile with role details
 */
const findUserWithProfileQuery = async (userId) => {
  return await User.findByPk(userId, {
    attributes: { exclude: ['password'] },
    include: [{ model: Profile, as: 'profile' }]
  });
};

/**
 * Native raw SQL query to fetch user statistics (active courses, completed practice tests)
 */
const getUserDashboardStatsQuery = async (userId) => {
  const [enrollments] = await sequelize.query(
    `SELECT COUNT(*) AS "activeCourses" FROM "Enrollments" WHERE "userId" = :userId AND "status" = 'active'`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );

  const [attempts] = await sequelize.query(
    `SELECT COUNT(*) AS "completedTests" FROM "PracticeAttempts" WHERE "userId" = :userId AND "status" = 'completed'`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );

  return {
    activeCourses: Number(enrollments?.activeCourses || 0),
    completedTests: Number(attempts?.completedTests || 0)
  };
};

module.exports = {
  findUserWithProfileQuery,
  getUserDashboardStatsQuery
};

const sequelize = require('../config/database');
const { QueryTypes, Op } = require('sequelize');
const {
  User, Profile, Course, Category, Section, SubSection,
  Enrollment, RatingAndReview, LiveSession, ContactUs, CourseProgress, LiveChatMessage
} = require('../models');

/**
 * Admin Native & ORM Queries Layer
 */

const getAdminCountQuery = async () => {
  return await User.count({
    where: {
      accountType: { [Op.in]: ['Superadmin', 'Admin'] }
    }
  });
};

const createAdminSetupUserQuery = async (userData) => {
  return await User.create(userData);
};

const findAdminUserByEmailQuery = async (email) => {
  return await User.findOne({
    where: {
      email: { [Op.iLike]: email.trim() }
    }
  });
};

const getAdminNotificationsQuery = async () => {
  const [pendingContacts, recentReviews, newEnrollments] = await Promise.all([
    ContactUs.findAll({ where: { status: 'Pending' }, limit: 5, order: [['createdAt', 'DESC']] }),
    RatingAndReview.findAll({ limit: 5, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] }),
    Enrollment.findAll({ limit: 5, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }, { model: Course, as: 'course', attributes: ['courseName'] }] })
  ]);
  return { pendingContacts, recentReviews, newEnrollments };
};

const getAdminDashboardFullStatsQuery = async () => {
  const [
    totalUsers, totalStudents, totalInstructors, totalAdmins,
    totalCourses, publishedCourses, draftCourses,
    totalCategories, totalEnrollments, totalReviews, totalSections, totalLiveSessions,
    recentCourses, recentUsers
  ] = await Promise.all([
    User.count(),
    User.count({ where: { accountType: 'Student' } }),
    User.count({ where: { accountType: 'Instructor' } }),
    User.count({ where: { accountType: { [Op.in]: ['Admin', 'Superadmin'] } } }),
    Course.count(),
    Course.count({ where: { status: 'Published' } }),
    Course.count({ where: { status: 'Draft' } }),
    Category.count(),
    Enrollment.count(),
    RatingAndReview.count(),
    Section.count(),
    LiveSession.count(),
    Course.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ association: 'instructor', attributes: ['id', 'firstName', 'lastName'] }]
    }),
    User.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'firstName', 'lastName', 'email', 'accountType']
    })
  ]);

  return {
    totalUsers, totalStudents, totalInstructors, totalAdmins,
    totalCourses, publishedCourses, draftCourses,
    totalCategories, totalEnrollments, totalReviews, totalSections, totalLiveSessions,
    recentCourses, recentUsers
  };
};

const findUsersPaginatedQuery = async ({ limit, offset, where }) => {
  return await User.findAndCountAll({
    where, limit, offset,
    attributes: { exclude: ['passwordDigest', 'token', 'githubToken', 'googleToken'] },
    order: [['createdAt', 'DESC']]
  });
};

const findUserByIdWithProfileQuery = async (id) => {
  return await User.findByPk(id, {
    attributes: { exclude: ['passwordDigest', 'token', 'githubToken', 'googleToken'] },
    include: [{ association: 'profile' }]
  });
};

const findUserByIdQuery = async (id) => {
  return await User.findByPk(id);
};

const createUserAdminQuery = async (userData) => {
  return await User.create(userData);
};

const updateUserQuery = async (id, updates) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(updates);
  return user;
};

const deleteUserAndRelationsQuery = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return null;

  await Profile.destroy({ where: { userId } });
  await Enrollment.destroy({ where: { userId } });
  await RatingAndReview.destroy({ where: { userId } });
  await CourseProgress.destroy({ where: { userId } });
  await LiveChatMessage.destroy({ where: { userId } });
  await Course.destroy({ where: { instructorId: userId } });

  await user.destroy();
  return true;
};

const findCategoriesWithCourseCountQuery = async (where = {}) => {
  const cats = await Category.findAll({
    where, order: [['createdAt', 'DESC']],
    include: [{ model: Course, attributes: ['id'] }]
  });
  return cats.map(c => ({ ...c.toJSON(), courseCount: c.Courses ? c.Courses.length : 0 }));
};

const findCategoryByNameQuery = async (name, excludeId = null) => {
  const where = { name: { [Op.iLike]: name.trim() } };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return await Category.findOne({ where });
};

const createCategoryQuery = async (data) => {
  return await Category.create(data);
};

const findCategoryByIdQuery = async (id) => {
  return await Category.findByPk(id);
};

const updateCategoryQuery = async (id, updates) => {
  const category = await Category.findByPk(id);
  if (!category) return null;
  await category.update(updates);
  return category;
};

const deleteCategoryQuery = async (id) => {
  return await Category.destroy({ where: { id } });
};

const findCoursesPaginatedQuery = async ({ where, limit, offset }) => {
  return await Course.findAndCountAll({
    where, limit, offset,
    include: [
      { association: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: Category, attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const findCourseByIdFullQuery = async (id) => {
  return await Course.findByPk(id, {
    include: [
      { association: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: Category, attributes: ['id', 'name'] },
      { association: 'sections', include: [{ association: 'subSections' }] },
      { association: 'enrollments', attributes: ['id', 'userId', 'createdAt'] }
    ]
  });
};

const findCourseByIdQuery = async (id) => {
  return await Course.findByPk(id);
};

const updateCourseQuery = async (id, updates) => {
  const course = await Course.findByPk(id);
  if (!course) return null;
  await course.update(updates);
  return course;
};

const deleteCourseQuery = async (id) => {
  return await Course.destroy({ where: { id } });
};

const findEnrollmentsPaginatedQuery = async ({ where, limit, offset }) => {
  return await Enrollment.findAndCountAll({
    where, limit, offset,
    include: [
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { 
        model: Course, 
        as: 'course', 
        attributes: ['id', 'courseName', 'price', 'status'],
        include: [
          { model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const findEnrollmentByIdQuery = async (id) => {
  return await Enrollment.findByPk(id);
};

const deleteEnrollmentQuery = async (id) => {
  return await Enrollment.destroy({ where: { id } });
};

const findReviewsPaginatedQuery = async ({ where, limit, offset }) => {
  return await RatingAndReview.findAndCountAll({
    where, limit, offset,
    include: [
      { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: Course, attributes: ['id', 'courseName'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const findReviewByIdQuery = async (id) => {
  return await RatingAndReview.findByPk(id);
};

const deleteReviewQuery = async (id) => {
  return await RatingAndReview.destroy({ where: { id } });
};

const findLiveSessionsPaginatedQuery = async ({ where, limit, offset }) => {
  return await LiveSession.findAndCountAll({
    where, limit, offset,
    include: [{ model: Course, attributes: ['id', 'courseName'] }],
    order: [['createdAt', 'DESC']]
  });
};

const findLiveSessionByIdQuery = async (id) => {
  return await LiveSession.findByPk(id);
};

const updateLiveSessionQuery = async (id, updates) => {
  const session = await LiveSession.findByPk(id);
  if (!session) return null;
  await session.update(updates);
  return session;
};

const deleteLiveSessionQuery = async (id) => {
  return await LiveSession.destroy({ where: { id } });
};

const findSectionsByCourseIdQuery = async (courseId) => {
  return await Section.findAll({
    where: { courseId },
    include: [{ association: 'subSections', order: [['createdAt', 'ASC']] }],
    order: [['createdAt', 'ASC']]
  });
};

const updateSectionQuery = async (id, updates) => {
  const section = await Section.findByPk(id);
  if (!section) return null;
  await section.update(updates);
  return section;
};

const findSubSectionsBySectionIdQuery = async (sectionId) => {
  return await SubSection.findAll({
    where: { sectionId },
    order: [['createdAt', 'ASC']]
  });
};

const findContactsPaginatedQuery = async ({ where, limit, offset }) => {
  return await ContactUs.findAndCountAll({
    where, limit, offset,
    order: [['createdAt', 'DESC']]
  });
};

const findContactByIdQuery = async (id) => {
  return await ContactUs.findByPk(id);
};

const updateContactQuery = async (id, updates) => {
  const contact = await ContactUs.findByPk(id);
  if (!contact) return null;
  await contact.update(updates);
  return contact;
};

const deleteContactQuery = async (id) => {
  return await ContactUs.destroy({ where: { id } });
};

module.exports = {
  getAdminCountQuery,
  createAdminSetupUserQuery,
  findAdminUserByEmailQuery,
  getAdminNotificationsQuery,
  getAdminDashboardFullStatsQuery,
  findUsersPaginatedQuery,
  findUserByIdWithProfileQuery,
  findUserByIdQuery,
  createUserAdminQuery,
  updateUserQuery,
  deleteUserAndRelationsQuery,
  findCategoriesWithCourseCountQuery,
  findCategoryByNameQuery,
  createCategoryQuery,
  findCategoryByIdQuery,
  updateCategoryQuery,
  deleteCategoryQuery,
  findCoursesPaginatedQuery,
  findCourseByIdFullQuery,
  findCourseByIdQuery,
  updateCourseQuery,
  deleteCourseQuery,
  findEnrollmentsPaginatedQuery,
  findEnrollmentByIdQuery,
  deleteEnrollmentQuery,
  findReviewsPaginatedQuery,
  findReviewByIdQuery,
  deleteReviewQuery,
  findLiveSessionsPaginatedQuery,
  findLiveSessionByIdQuery,
  updateLiveSessionQuery,
  deleteLiveSessionQuery,
  findSectionsByCourseIdQuery,
  updateSectionQuery,
  findSubSectionsBySectionIdQuery,
  findContactsPaginatedQuery,
  findContactByIdQuery,
  updateContactQuery,
  deleteContactQuery
};

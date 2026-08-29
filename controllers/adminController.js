const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { Op } = require('sequelize');
const {
  User, Profile, Course, Category, Section, SubSection,
  Enrollment, RatingAndReview, LiveSession, ContactUs
} = require('../models');
const { calculateCoursePrice } = require('../services/pricingService');
const logger = require('../utils/logger');

const sign = (user) =>
  jwt.sign(
    { user_id: user.id, email: user.email, account_type: user.accountType },
    process.env.JWT_SECRET || 'Secret123',
    { expiresIn: '7d' }
  );

/* ─────────────────────────────────────────
   INIT / AUTH
───────────────────────────────────────── */

// GET /admin/check-init
const checkInit = async (req, res) => {
  try {
    const count = await User.count({
      where: {
        accountType: { [Op.in]: ['Superadmin', 'Admin'] }
      }
    });
    return res.json({ success: true, usersExist: count > 0 });
  } catch (e) {
    logger.error('CHECK INIT:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /admin/setup  (only when zero Admin/Superadmin users exist)
const setup = async (req, res) => {
  try {
    const count = await User.count({
      where: {
        accountType: { [Op.in]: ['Superadmin', 'Admin'] }
      }
    });
    if (count > 0) {
      return res.status(403).json({ success: false, message: 'Setup already completed.' });
    }
    const { firstName, lastName, email, password, passwordConfirmation } = req.body;
    if (!firstName || !lastName || !email || !password || !passwordConfirmation) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    const user = await User.create({
      firstName, lastName, email,
      password, passwordConfirmation,
      accountType: 'Superadmin',
      active: true, approved: true
    });
    const token = sign(user);
    return res.status(201).json({
      success: true, message: 'Superadmin created.',
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, accountType: user.accountType }
    });
  } catch (e) {
    logger.error('ADMIN SETUP:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /admin/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }
    let user = await User.findOne({
      where: {
        email: { [Op.iLike]: email.trim() }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found.' });
    }

    if (!['Admin', 'Superadmin'].includes(user.accountType)) {
      // Auto promote to Admin when attempting Admin portal login
      user.accountType = 'Admin';
      await user.save();
    }

    if (!user.authenticate(password)) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }
    if (!user.active) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }
    const token = sign(user);
    return res.json({
      success: true, message: 'Login successful.', token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, accountType: user.accountType, image: user.image }
    });
  } catch (e) {
    logger.error('ADMIN LOGIN:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /admin/me
const getMe = async (req, res) => {
  const u = req.admin;
  return res.json({
    success: true,
    user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, accountType: u.accountType, image: u.image }
  });
};

/* ─────────────────────────────────────────
   DASHBOARD STATS
───────────────────────────────────────── */

const getNotifications = async (req, res) => {
  try {
    const [pendingContacts, recentReviews, newEnrollments] = await Promise.all([
      ContactUs.findAll({ where: { status: 'Pending' }, limit: 5, order: [['createdAt', 'DESC']] }),
      RatingAndReview.findAll({ limit: 5, order: [['createdAt', 'DESC']], include: [{ model: User, attributes: ['firstName', 'lastName'] }] }),
      Enrollment.findAll({ limit: 5, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }, { model: Course, as: 'course', attributes: ['courseName'] }] })
    ]);

    const notifications = [];

    pendingContacts.forEach(c => {
      notifications.push({
        id: `contact-${c.id}`,
        type: 'contact',
        title: 'New Contact Submission',
        message: `${c.firstName} ${c.lastName}: "${c.message.substring(0, 45)}..."`,
        time: c.createdAt,
        link: '/admin/contacts'
      });
    });

    recentReviews.forEach(r => {
      notifications.push({
        id: `review-${r.id}`,
        type: 'review',
        title: 'New Course Review',
        message: `${r.User ? r.User.firstName : 'User'} left a ${r.rating}★ review`,
        time: r.createdAt,
        link: '/admin/reviews'
      });
    });

    newEnrollments.forEach(e => {
      const u = e.user || e.User;
      const c = e.course || e.Course;
      notifications.push({
        id: `enroll-${e.id}`,
        type: 'enrollment',
        title: 'New Enrollment',
        message: `${u ? u.firstName : 'Student'} enrolled in ${c ? c.courseName : 'a course'}`,
        time: e.createdAt,
        link: '/admin/enrollments'
      });
    });

    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.json({
      success: true,
      unreadCount: pendingContacts.length,
      notifications: notifications.slice(0, 10)
    });
  } catch (e) {
    logger.error('GET NOTIFICATIONS:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const dashboardStats = async (req, res) => {
  try {
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

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalAdmins,
        totalCourses,
        publishedCourses,
        draftCourses,
        totalCategories,
        totalEnrollments,
        totalReviews,
        totalSections,
        totalLiveSessions,
        recentCourses,
        recentUsers,
        // Nested object for backward compatibility
        users: { total: totalUsers, students: totalStudents, instructors: totalInstructors, admins: totalAdmins },
        courses: { total: totalCourses, published: publishedCourses, draft: draftCourses },
        categories: totalCategories,
        enrollments: totalEnrollments,
        reviews: totalReviews,
        sections: totalSections,
        liveSessions: totalLiveSessions
      }
    });
  } catch (e) {
    logger.error('ADMIN DASHBOARD STATS:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   USERS
───────────────────────────────────────── */

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', role = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) where.accountType = role;
    if (status === 'active') where.active = true;
    if (status === 'inactive') where.active = false;

    const { count, rows } = await User.findAndCountAll({
      where, limit: parseInt(limit), offset,
      attributes: { exclude: ['passwordDigest', 'token', 'githubToken', 'googleToken'] },
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, data: { users: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (e) {
    logger.error('ADMIN GET USERS:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordDigest', 'token', 'githubToken', 'googleToken'] },
      include: [{ association: 'profile' }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: user });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, passwordConfirmation, accountType } = req.body;
    const allowed = ['Student', 'Instructor', 'Admin'];
    // Only superadmin can create another Superadmin
    if (accountType === 'Superadmin' && req.admin.accountType !== 'Superadmin') {
      return res.status(403).json({ success: false, message: 'Only Superadmin can create Superadmin accounts.' });
    }
    if (accountType === 'Superadmin') allowed.push('Superadmin');
    if (!allowed.includes(accountType)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(422).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({ firstName, lastName, email, password, passwordConfirmation, accountType, active: true, approved: true });
    return res.status(201).json({ success: true, message: 'User created.', data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, accountType: user.accountType } });
  } catch (e) {
    logger.error('ADMIN CREATE USER:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { firstName, lastName, email, accountType, active } = req.body;

    // Prevent privilege escalation
    if (accountType === 'Superadmin' && req.admin.accountType !== 'Superadmin') {
      return res.status(403).json({ success: false, message: 'Only Superadmin can assign Superadmin role.' });
    }
    // Prevent self-demotion if only superadmin
    if (user.id === req.admin.id && accountType && accountType !== req.admin.accountType) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
    }

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (accountType) updates.accountType = accountType;
    if (active !== undefined) updates.active = active;

    await user.update(updates);
    return res.json({ success: true, message: 'User updated.', data: user });
  } catch (e) {
    logger.error('ADMIN UPDATE USER:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.id === req.admin.id) return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });

    const { Profile, Enrollment, RatingAndReview, CourseProgress, LiveChatMessage, Course } = require('../models');

    // Clean up dependent child records to respect foreign key constraints
    await Profile.destroy({ where: { userId: user.id } });
    await Enrollment.destroy({ where: { userId: user.id } });
    await RatingAndReview.destroy({ where: { userId: user.id } });
    await CourseProgress.destroy({ where: { userId: user.id } });
    await LiveChatMessage.destroy({ where: { userId: user.id } });
    await Course.destroy({ where: { instructorId: user.id } });

    await user.destroy();
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (e) {
    logger.error('ADMIN DELETE USER:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    user.password = newPassword;
    user.passwordConfirmation = newPassword;
    await user.save();
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   CATEGORIES
───────────────────────────────────────── */

const getCategories = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const where = search ? { name: { [Op.iLike]: `%${search}%` } } : {};
    const cats = await Category.findAll({
      where, order: [['createdAt', 'DESC']],
      include: [{ model: Course, attributes: ['id'] }]
    });
    const data = cats.map(c => ({ ...c.toJSON(), courseCount: c.Courses ? c.Courses.length : 0 }));
    return res.json({ success: true, data });
  } catch (e) {
    logger.error('GET CATEGORIES:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name required.' });

    const existing = await Category.findOne({
      where: { name: { [Op.iLike]: name.trim() } }
    });
    if (existing) {
      return res.status(422).json({ success: false, message: 'Category with this name already exists.' });
    }

    const cat = await Category.create({ name: name.trim(), description });
    return res.status(201).json({ success: true, message: 'Category created.', data: cat });
  } catch (e) {
    logger.error('CREATE CATEGORY:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });

    const { name, description } = req.body;
    if (name && name.trim()) {
      const existing = await Category.findOne({
        where: {
          name: { [Op.iLike]: name.trim() },
          id: { [Op.ne]: cat.id }
        }
      });
      if (existing) {
        return res.status(422).json({ success: false, message: 'Category with this name already exists.' });
      }
      cat.name = name.trim();
    }
    if (description !== undefined) cat.description = description;

    await cat.save();
    return res.json({ success: true, message: 'Category updated.', data: cat });
  } catch (e) {
    logger.error('UPDATE CATEGORY:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found.' });
    await cat.destroy();
    return res.json({ success: true, message: 'Category deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   COURSES
───────────────────────────────────────── */

const getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', status = '', categoryId = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) where.courseName = { [Op.iLike]: `%${search}%` };
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const { count, rows } = await Course.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [
        { association: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Category, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const formattedCourses = rows.map(c => {
      const courseObj = c.toJSON();
      courseObj.pricing = calculateCoursePrice(courseObj);
      return courseObj;
    });
    return res.json({ success: true, data: { courses: formattedCourses, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (e) {
    logger.error('ADMIN GET COURSES:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { association: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Category, attributes: ['id', 'name'] },
        { association: 'sections', include: [{ association: 'subSections' }] },
        { association: 'enrollments', attributes: ['id', 'userId', 'createdAt'] }
      ]
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    const courseObj = course.toJSON();
    courseObj.pricing = calculateCoursePrice(courseObj);
    return res.json({ success: true, data: courseObj });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const { courseName, courseDescription, whatYouWillLearn, price, tag, status, categoryId, instructorId, instructions } = req.body;
    const updates = {};
    if (courseName) updates.courseName = courseName;
    if (courseDescription !== undefined) updates.courseDescription = courseDescription;
    if (whatYouWillLearn !== undefined) updates.whatYouWillLearn = whatYouWillLearn;
    if (price !== undefined && price !== '') {
      const parsedPrice = parseFloat(price);
      updates.price = isNaN(parsedPrice) ? 0 : Math.round(parsedPrice);
      updates.originalPrice = updates.price;
    }
    if (tag) updates.tag = tag;
    if (status) updates.status = status;
    if (categoryId) updates.categoryId = categoryId;
    if (instructorId) updates.instructorId = instructorId;
    if (instructions !== undefined) updates.instructions = instructions;

    if (req.file) {
      const url = await uploadService.handleFileUpload(req.file, false);
      updates.thumbnail = url;
    }

    await course.update(updates);
    return res.json({ success: true, message: 'Course updated.', data: course });
  } catch (e) {
    logger.error('ADMIN UPDATE COURSE:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateCourseStatus = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    const { status } = req.body;
    if (!['Draft', 'Published'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Draft or Published.' });
    }
    await course.update({ status });
    return res.json({ success: true, message: `Course ${status.toLowerCase()}.`, data: { id: course.id, status: course.status } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteCourseAdmin = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    await course.destroy();
    return res.json({ success: true, message: 'Course deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   ENROLLMENTS
───────────────────────────────────────── */

const getEnrollments = async (req, res) => {
  try {
    const { page = 1, limit = 15, courseId = '', userId = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;

    const { count, rows } = await Enrollment.findAndCountAll({
      where, limit: parseInt(limit), offset,
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
    return res.json({ success: true, data: { enrollments: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    await enrollment.destroy();
    return res.json({ success: true, message: 'Enrollment removed.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   REVIEWS
───────────────────────────────────────── */

const getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 15, courseId = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (courseId) where.courseId = courseId;

    const { count, rows } = await RatingAndReview.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [
        { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Course, attributes: ['id', 'courseName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, data: { reviews: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const r = await RatingAndReview.findByPk(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: 'Review not found.' });
    await r.destroy();
    return res.json({ success: true, message: 'Review deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   LIVE SESSIONS
───────────────────────────────────────── */

const getLiveSessions = async (req, res) => {
  try {
    const { page = 1, limit = 15, courseId = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (courseId) where.courseId = courseId;
    const { count, rows } = await LiveSession.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [{ model: Course, attributes: ['id', 'courseName'] }],
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, data: { sessions: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const createLiveSession = async (req, res) => {
  try {
    const { courseId, sessionName, startTime, endTime, status } = req.body;
    if (!courseId || !sessionName) return res.status(400).json({ success: false, message: 'courseId and sessionName required.' });
    const session = await LiveSession.create({ courseId, sessionName, startTime, endTime, status: status || 'Scheduled' });
    return res.status(201).json({ success: true, message: 'Live session created.', data: session });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateLiveSession = async (req, res) => {
  try {
    const session = await LiveSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    await session.update(req.body);
    return res.json({ success: true, message: 'Session updated.', data: session });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteLiveSession = async (req, res) => {
  try {
    const session = await LiveSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    await session.destroy();
    return res.json({ success: true, message: 'Session deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   SECTIONS
───────────────────────────────────────── */

const getSections = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId required.' });
    const sections = await Section.findAll({
      where: { courseId },
      include: [{ association: 'subSections', order: [['createdAt', 'ASC']] }],
      order: [['createdAt', 'ASC']]
    });
    return res.json({ success: true, data: sections });
  } catch (e) {
    logger.error('ADMIN GET SECTIONS:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const createSection = async (req, res) => {
  try {
    const { courseId, sectionName } = req.body;
    if (!courseId || !sectionName) return res.status(400).json({ success: false, message: 'courseId and sectionName required.' });
    const course = await Course.findByPk(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    const section = await Section.create({ courseId, sectionName });
    return res.status(201).json({ success: true, message: 'Section created.', data: section });
  } catch (e) {
    logger.error('ADMIN CREATE SECTION:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });
    const { sectionName } = req.body;
    if (!sectionName) return res.status(400).json({ success: false, message: 'sectionName required.' });
    await section.update({ sectionName });
    return res.json({ success: true, message: 'Section updated.', data: section });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });
    await section.destroy();
    return res.json({ success: true, message: 'Section deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   SUBSECTIONS
───────────────────────────────────────── */

const getSubSections = async (req, res) => {
  try {
    const { sectionId } = req.query;
    if (!sectionId) return res.status(400).json({ success: false, message: 'sectionId required.' });
    const subs = await SubSection.findAll({
      where: { sectionId },
      order: [['createdAt', 'ASC']]
    });
    return res.json({ success: true, data: subs });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const createSubSection = async (req, res) => {
  try {
    const { sectionId, title, description, timeDuration } = req.body;
    if (!sectionId || !title) return res.status(400).json({ success: false, message: 'sectionId and title required.' });
    const section = await Section.findByPk(sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });
    let videoUrl = null;
    if (req.file) videoUrl = await uploadService.handleFileUpload(req.file, true);
    const sub = await SubSection.create({ sectionId, title, description, timeDuration, videoUrl });
    return res.status(201).json({ success: true, message: 'SubSection created.', data: sub });
  } catch (e) {
    logger.error('ADMIN CREATE SUBSECTION:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateSubSection = async (req, res) => {
  try {
    const sub = await SubSection.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'SubSection not found.' });
    const { title, description, timeDuration } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (timeDuration) updates.timeDuration = timeDuration;
    if (req.file) updates.videoUrl = await uploadService.handleFileUpload(req.file, true);
    await sub.update(updates);
    return res.json({ success: true, message: 'SubSection updated.', data: sub });
  } catch (e) {
    logger.error('ADMIN UPDATE SUBSECTION:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteSubSection = async (req, res) => {
  try {
    const sub = await SubSection.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'SubSection not found.' });
    await sub.destroy();
    return res.json({ success: true, message: 'SubSection deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────
   CONTACT US SUBMISSIONS
───────────────────────────────────────── */

const getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;

    const { count, rows } = await ContactUs.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: {
        contacts: rows,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (e) {
    logger.error('ADMIN GET CONTACTS:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

const updateContactStatus = async (req, res) => {
  try {
    const contact = await ContactUs.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact entry not found.' });
    const { status } = req.body;
    if (!['Pending', 'Resolved', 'Ignored'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    await contact.update({ status });
    return res.json({ success: true, message: 'Status updated.', data: contact });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await ContactUs.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact entry not found.' });
    await contact.destroy();
    return res.json({ success: true, message: 'Contact entry deleted.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  checkInit, setup, login, getMe,
  dashboardStats,
  getUsers, getUser, createUser, updateUser, deleteUser, resetPassword,
  getCategories, createCategory, updateCategory, deleteCategory,
  getCourses, getCourse, updateCourse, updateCourseStatus, deleteCourseAdmin,
  getEnrollments, deleteEnrollment,
  getReviews, deleteReview,
  getLiveSessions, createLiveSession, updateLiveSession, deleteLiveSession,
  getSections, createSection, updateSection, deleteSection,
  getSubSections, createSubSection, updateSubSection, deleteSubSection,
  getContacts, updateContactStatus, deleteContact,
  getNotifications
};

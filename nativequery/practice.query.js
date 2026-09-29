const sequelize = require('../config/database');
const { QueryTypes, Op } = require('sequelize');
const {
  PracticeCategory,
  PracticeTopic,
  PracticeQuestion,
  PracticeOption,
  PracticeTest,
  PracticeTestQuestion,
  PracticeAttempt,
  PracticeAttemptAnswer,
  User,
  Course,
  Enrollment
} = require('../models');

/**
 * Practice & Assessment Native Queries Layer
 */

// 1. Dashboard counts via native SQL for peak efficiency
const getPracticeDashboardStatsQuery = async (userId) => {
  const [stats] = await sequelize.query(
    `
    SELECT
      (SELECT COUNT(*) FROM "PracticeTests" WHERE "testType" = 'Daily Quiz' AND "status" = 'published' AND "scope" = 'GLOBAL') AS "dailyQuizzesCount",
      (SELECT COUNT(*) FROM "PracticeQuestions" WHERE "status" = 'published' AND "scope" = 'GLOBAL' AND "categoryId" IS NOT NULL) AS "topicTestsCount",
      (SELECT COUNT(*) FROM "PracticeTests" WHERE "testType" = 'Course Test' AND "status" = 'published' AND "scope" = 'GLOBAL') AS "subjectTestsCount",
      (SELECT COUNT(*) FROM "PracticeTests" WHERE "testType" = 'Mock Test' AND "status" = 'published' AND "scope" = 'GLOBAL') AS "mockTestsCount",
      (SELECT COUNT(*) FROM "PracticeQuestions" WHERE "type" = 'Coding' AND "status" = 'published' AND "scope" = 'GLOBAL') AS "codingCount",
      (SELECT COUNT(*) FROM "PracticeQuestions" WHERE "type" = 'Interview' AND "status" = 'published' AND "scope" = 'GLOBAL') AS "interviewCount",
      (SELECT COUNT(*) FROM "PracticeAttempts" WHERE "userId" = :userId) AS "attemptsCount"
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT
    }
  );

  return {
    dailyQuizzesCount: Number(stats?.dailyQuizzesCount || 0),
    topicTestsCount: Number(stats?.topicTestsCount || 0),
    subjectTestsCount: Number(stats?.subjectTestsCount || 0),
    mockTestsCount: Number(stats?.mockTestsCount || 0),
    codingCount: Number(stats?.codingCount || 0),
    interviewCount: Number(stats?.interviewCount || 0),
    attemptsCount: Number(stats?.attemptsCount || 0)
  };
};

// 2. Categories & Topics
const getCategoriesQuery = async () => {
  return await PracticeCategory.findAll({
    include: [{ model: PracticeTopic, as: 'topics' }],
    order: [['name', 'ASC']],
  });
};

const createCategoryQuery = async ({ name, description }) => {
  return await PracticeCategory.create({ name, description });
};

const createTopicQuery = async ({ categoryId, name, description }) => {
  return await PracticeTopic.create({ categoryId, name, description });
};

// 3. Question Queries
const findQuestionByIdQuery = async (id, options = {}) => {
  return await PracticeQuestion.findByPk(id, options);
};

const getQuestionsQuery = async (where = {}) => {
  return await PracticeQuestion.findAll({
    where,
    include: [
      { model: PracticeOption, as: 'options' },
      { model: PracticeCategory, as: 'category' },
      { model: PracticeTopic, as: 'topic' },
      { model: Course, as: 'course', attributes: ['id', 'courseName'] },
    ],
    order: [['createdAt', 'DESC']],
  });
};

const createQuestionQuery = async (questionData, optionsData = []) => {
  const question = await PracticeQuestion.create(questionData);
  if (optionsData && optionsData.length > 0) {
    const opts = optionsData.map(o => ({
      questionId: question.id,
      optionText: o.optionText || o.text,
      isCorrect: !!o.isCorrect
    }));
    await PracticeOption.bulkCreate(opts);
  }
  return await PracticeQuestion.findByPk(question.id, {
    include: [
      { model: PracticeOption, as: 'options' },
      { model: Course, as: 'course', attributes: ['id', 'courseName'] }
    ]
  });
};

const updateQuestionQuery = async (id, updateData, optionsData) => {
  const question = await PracticeQuestion.findByPk(id);
  if (!question) return null;
  await question.update(updateData);

  if (Array.isArray(optionsData)) {
    await PracticeOption.destroy({ where: { questionId: id } });
    if (optionsData.length > 0) {
      const opts = optionsData.map(o => ({
        questionId: question.id,
        optionText: o.optionText || o.text,
        isCorrect: !!o.isCorrect
      }));
      await PracticeOption.bulkCreate(opts);
    }
  }

  return await PracticeQuestion.findByPk(id, {
    include: [
      { model: PracticeOption, as: 'options' },
      { model: Course, as: 'course', attributes: ['id', 'courseName'] }
    ]
  });
};

const deleteQuestionQuery = async (id) => {
  await PracticeOption.destroy({ where: { questionId: id } });
  return await PracticeQuestion.destroy({ where: { id } });
};

const bulkDeleteQuestionsQuery = async (ids) => {
  return await PracticeQuestion.destroy({ where: { id: ids } });
};

const bulkUploadQuestionsQuery = async (questions) => {
  let createdCount = 0;
  for (const q of questions) {
    const createdQ = await PracticeQuestion.create({
      title: q.title || q.question,
      type: q.type || 'MCQ',
      difficulty: q.difficulty || 'Easy',
      explanation: q.explanation || '',
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0,
      status: 'published',
    });

    if (q.options && Array.isArray(q.options)) {
      const opts = q.options.map(opt => ({
        questionId: createdQ.id,
        optionText: opt.text || opt.optionText,
        isCorrect: !!opt.isCorrect
      }));
      await PracticeOption.bulkCreate(opts);
    }
    createdCount++;
  }
  return createdCount;
};

// 4. Test Queries
const findTestByIdQuery = async (id, options = {}) => {
  return await PracticeTest.findByPk(id, options);
};

const getTestsQuery = async (where = {}) => {
  const include = [];
  if (PracticeCategory) include.push({ model: PracticeCategory, as: 'category', required: false });
  if (PracticeTopic) include.push({ model: PracticeTopic, as: 'topic', required: false });
  if (PracticeQuestion) include.push({ model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] }, required: false });
  if (Course) include.push({ model: Course, as: 'course', attributes: ['id', 'courseName'], required: false });

  return await PracticeTest.findAll({
    where,
    include,
    order: [['createdAt', 'DESC']],
  });
};

const createTestQuery = async (testData, questionIds = []) => {
  const test = await PracticeTest.create(testData);

  if (Array.isArray(questionIds) && questionIds.length > 0) {
    const numericQIds = questionIds.map(id => Number(id));
    const validQuestions = await PracticeQuestion.findAll({
      where: { id: { [Op.in]: numericQIds } },
      attributes: ['id']
    });
    const validQIdSet = new Set(validQuestions.map(q => q.id));

    const testQuestions = numericQIds
      .filter(qId => validQIdSet.has(qId))
      .map((qId, idx) => ({
        testId: test.id,
        questionId: qId,
        order: idx + 1,
      }));

    if (testQuestions.length > 0) {
      await PracticeTestQuestion.bulkCreate(testQuestions);
    }
  }

  return await PracticeTest.findByPk(test.id, {
    include: [
      { model: Course, as: 'course', attributes: ['id', 'courseName'] },
      { model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] } }
    ]
  });
};

const updateTestQuery = async (id, updateData, questionIds) => {
  const test = await PracticeTest.findByPk(id);
  if (!test) return null;

  await test.update(updateData);

  if (Array.isArray(questionIds)) {
    await PracticeTestQuestion.destroy({ where: { testId: id } });

    const numericQIds = questionIds.map(qId => Number(qId));
    const validQuestions = await PracticeQuestion.findAll({
      where: { id: { [Op.in]: numericQIds } },
      attributes: ['id']
    });
    const validQIdSet = new Set(validQuestions.map(q => q.id));

    const testQuestions = numericQIds
      .filter(qId => validQIdSet.has(qId))
      .map((qId, idx) => ({
        testId: test.id,
        questionId: qId,
        order: idx + 1,
      }));

    if (testQuestions.length > 0) {
      await PracticeTestQuestion.bulkCreate(testQuestions);
    }
  }

  return await PracticeTest.findByPk(id, {
    include: [
      { model: Course, as: 'course', attributes: ['id', 'courseName'] },
      { model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] } }
    ]
  });
};

const deleteTestQuery = async (id) => {
  await PracticeTestQuestion.destroy({ where: { testId: id } });
  return await PracticeTest.destroy({ where: { id } });
};

const bulkDeleteTestsQuery = async (numericIds) => {
  return await PracticeTest.destroy({
    where: { id: { [Op.in]: numericIds } }
  });
};

// 5. Daily Quiz & Topic Practice
const getDailyQuizQuery = async () => {
  let test = await PracticeTest.findOne({
    where: { testType: 'Daily Quiz', status: 'published' },
    include: [{
      model: PracticeQuestion,
      as: 'questions',
      where: { status: 'published' },
      include: [{ model: PracticeOption, as: 'options', attributes: ['id', 'optionText'] }]
    }]
  });

  if (!test || !test.questions || test.questions.length === 0) {
    const questions = await PracticeQuestion.findAll({
      where: { type: 'MCQ', status: 'published' },
      limit: 5,
      include: [{ model: PracticeOption, as: 'options', attributes: ['id', 'optionText'] }],
      order: sequelize.random()
    });

    return {
      isDynamic: true,
      data: {
        id: null,
        title: 'Daily Practice Quiz',
        duration: 10,
        totalMarks: questions.length * 2,
        questions: questions
      }
    };
  }

  return { isDynamic: false, data: test };
};

const getTopicPracticeQuestionsQuery = async (where = {}) => {
  return await PracticeQuestion.findAll({
    where,
    include: [{ model: PracticeOption, as: 'options', attributes: ['id', 'optionText'] }],
    limit: 10
  });
};

// 6. Practice Attempts
const createAttemptWithAnswersQuery = async (attemptData, answersData = []) => {
  const attempt = await PracticeAttempt.create(attemptData);

  if (answersData && answersData.length > 0) {
    const ansRecords = answersData.map(a => ({
      attemptId: attempt.id,
      ...a
    }));
    await PracticeAttemptAnswer.bulkCreate(ansRecords);
  }

  return await PracticeAttempt.findByPk(attempt.id, {
    include: [{
      model: PracticeAttemptAnswer,
      as: 'answers',
      include: [
        { model: PracticeQuestion, as: 'question', include: [{ model: PracticeOption, as: 'options' }] },
        { model: PracticeOption, as: 'selectedOption' }
      ]
    }]
  });
};

const getUserAttemptsQuery = async (userId) => {
  return await PracticeAttempt.findAll({
    where: { userId },
    include: [{ model: PracticeTest, as: 'test', attributes: ['title', 'testType'] }],
    order: [['createdAt', 'DESC']],
  });
};

const getAttemptDetailsQuery = async (id, userId) => {
  return await PracticeAttempt.findOne({
    where: { id, userId },
    include: [
      { model: PracticeTest, as: 'test' },
      {
        model: PracticeAttemptAnswer,
        as: 'answers',
        include: [
          { model: PracticeQuestion, as: 'question', include: [{ model: PracticeOption, as: 'options' }] },
          { model: PracticeOption, as: 'selectedOption' }
        ]
      }
    ]
  });
};

// 7. Courses & Enrollments
const findCourseByIdQuery = async (courseId) => {
  return await Course.findByPk(courseId);
};

const findInstructorCoursesQuery = async (instructorId) => {
  return await Course.findAll({
    where: { [Op.or]: [{ instructorId }, { instructor_id: instructorId }] },
    attributes: ['id']
  });
};

const findEnrollmentQuery = async (userId, courseId) => {
  return await Enrollment.findOne({
    where: { userId, courseId }
  });
};

const getInstructorTestsQuery = async (where) => {
  return await PracticeTest.findAll({
    where,
    include: [
      { model: Course, as: 'course', attributes: ['id', 'courseName'] },
      { model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] } }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const getInstructorQuestionsQuery = async (where) => {
  return await PracticeQuestion.findAll({
    where,
    include: [
      { model: PracticeOption, as: 'options' },
      { model: Course, as: 'course', attributes: ['id', 'courseName'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const getTestAttemptsQuery = async (testId) => {
  return await PracticeAttempt.findAll({
    where: { testId },
    include: [
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'image'] },
      { model: PracticeTest, as: 'test', attributes: ['id', 'title', 'totalMarks', 'passingPercentage'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const getCoursePracticeTestsQuery = async (whereClause) => {
  return await PracticeTest.findAll({
    where: whereClause,
    include: [
      {
        model: PracticeQuestion,
        as: 'questions',
        through: { attributes: ['order'] },
        include: [{ model: PracticeOption, as: 'options' }]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

const getUserTestAttemptsQuery = async (userId, testId) => {
  return await PracticeAttempt.findAll({
    where: { userId, testId },
    order: [['createdAt', 'DESC']]
  });
};

module.exports = {
  getPracticeDashboardStatsQuery,
  getCategoriesQuery,
  createCategoryQuery,
  createTopicQuery,
  findQuestionByIdQuery,
  getQuestionsQuery,
  createQuestionQuery,
  updateQuestionQuery,
  deleteQuestionQuery,
  bulkDeleteQuestionsQuery,
  bulkUploadQuestionsQuery,
  findTestByIdQuery,
  getTestsQuery,
  createTestQuery,
  updateTestQuery,
  deleteTestQuery,
  bulkDeleteTestsQuery,
  getDailyQuizQuery,
  getTopicPracticeQuestionsQuery,
  createAttemptWithAnswersQuery,
  getUserAttemptsQuery,
  getAttemptDetailsQuery,
  findCourseByIdQuery,
  findInstructorCoursesQuery,
  findEnrollmentQuery,
  getInstructorTestsQuery,
  getInstructorQuestionsQuery,
  getTestAttemptsQuery,
  getCoursePracticeTestsQuery,
  getUserTestAttemptsQuery
};

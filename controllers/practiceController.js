const models = require('../models');
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
  Course
} = models;
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const practiceController = {
  // ================= CATEGORIES & TOPICS =================

  getCategories: async (req, res) => {
    try {
      const categories = await PracticeCategory.findAll({
        include: [{ model: PracticeTopic, as: 'topics' }],
        order: [['name', 'ASC']],
      });
      return res.status(200).json({ success: true, data: categories });
    } catch (error) {
      logger.error('GET PRACTICE CATEGORIES FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createCategory: async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ success: false, message: 'Category name required' });
      
      const category = await PracticeCategory.create({ name, description });
      return res.status(201).json({ success: true, data: category });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createTopic: async (req, res) => {
    try {
      const { categoryId, name, description } = req.body;
      if (!categoryId || !name) return res.status(400).json({ success: false, message: 'Category ID & topic name required' });
      
      const topic = await PracticeTopic.create({ categoryId, name, description });
      return res.status(201).json({ success: true, data: topic });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= ADMIN QUESTION BANK =================

  getQuestions: async (req, res) => {
    try {
      const { type, testCategory, categoryId, topicId, difficulty, status, search, scope, courseId } = req.query;
      const where = {};

      if (type) where.type = type;
      if (testCategory) where.testCategory = testCategory;
      if (categoryId) where.categoryId = categoryId;
      if (topicId) where.topicId = topicId;
      if (difficulty) where.difficulty = difficulty;
      if (status) where.status = status;
      if (scope) where.scope = scope;
      if (courseId) where.courseId = courseId;
      if (search) {
        const searchOp = Op.iLike || Op.like;
        where.title = { [searchOp]: `%${search}%` };
      }

      const questions = await PracticeQuestion.findAll({
        where,
        include: [
          { model: PracticeOption, as: 'options' },
          { model: PracticeCategory, as: 'category' },
          { model: PracticeTopic, as: 'topic' },
          { model: Course, as: 'course', attributes: ['id', 'courseName'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({ success: true, data: questions });
    } catch (error) {
      logger.error('GET QUESTIONS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createQuestion: async (req, res) => {
    try {
      const {
        title,
        type,
        testCategory,
        categoryId,
        topicId,
        difficulty,
        explanation,
        marks,
        negativeMarks,
        tags,
        options,
        answerDetails,
        courseId,
        scope,
        status,
        codingDetails,
        interviewDetails
      } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, message: 'Question title is required' });
      }

      // Explicit Scope Validation
      const targetScope = scope === 'COURSE' ? 'COURSE' : 'GLOBAL';
      const targetCourseId = targetScope === 'COURSE' ? (courseId || null) : null;

      if (targetScope === 'COURSE' && !targetCourseId) {
        return res.status(400).json({ success: false, message: 'Course selection is required for Course questions' });
      }

      // Security check for instructors
      if (targetCourseId && req.user?.accountType === 'Instructor') {
        const course = await Course.findByPk(targetCourseId);
        if (!course) {
          return res.status(404).json({ success: false, message: 'Course not found' });
        }
        if (course.instructorId !== req.user.id && course.instructor_id !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not own this course' });
        }
      }

      const userRole = req.user?.accountType === 'Instructor' ? 'INSTRUCTOR' : 'ADMIN';

      const question = await PracticeQuestion.create({
        title,
        type: type || 'MCQ',
        testCategory: testCategory || 'MCQ',
        answerDetails: answerDetails || null,
        categoryId: categoryId || null,
        topicId: topicId || null,
        difficulty: difficulty || 'Easy',
        explanation: explanation || '',
        marks: marks || 1,
        negativeMarks: negativeMarks || 0,
        tags: tags || [],
        courseId: targetCourseId,
        createdBy: req.user ? req.user.id : null,
        createdByRole: userRole,
        scope: targetScope,
        status: status || 'published',
        codingDetails: codingDetails || null,
        interviewDetails: interviewDetails || null,
      });

      // Handle MCQ / Multiple Select / True/False Options
      if (['MCQ', 'Multiple Select', 'True/False'].includes(type || 'MCQ') && Array.isArray(options)) {
        const optionRecords = options.map((opt) => ({
          questionId: question.id,
          optionText: opt.optionText || opt.text,
          isCorrect: !!opt.isCorrect,
        }));
        await PracticeOption.bulkCreate(optionRecords);
      }

      const fullQuestion = await PracticeQuestion.findByPk(question.id, {
        include: [
          { model: PracticeOption, as: 'options' },
          { model: Course, as: 'course', attributes: ['id', 'courseName'] }
        ],
      });

      return res.status(201).json({ success: true, data: fullQuestion });
    } catch (error) {
      logger.error('CREATE QUESTION FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  updateQuestion: async (req, res) => {
    try {
      const { id } = req.params;
      const question = await PracticeQuestion.findByPk(id);
      if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

      const { options, scope, courseId, ...updateData } = req.body;

      if (scope) {
        const targetScope = scope === 'COURSE' ? 'COURSE' : 'GLOBAL';
        const targetCourseId = targetScope === 'COURSE' ? (courseId || question.courseId || null) : null;
        if (targetScope === 'COURSE' && !targetCourseId) {
          return res.status(400).json({ success: false, message: 'Course selection is required for Course questions' });
        }
        updateData.scope = targetScope;
        updateData.courseId = targetCourseId;
      } else if (courseId !== undefined) {
        updateData.courseId = courseId;
      }

      await question.update(updateData);

      if (['MCQ', 'Multiple Select', 'True/False'].includes(question.type) && Array.isArray(options)) {
        await PracticeOption.destroy({ where: { questionId: id } });
        const optionRecords = options.map((opt) => ({
          questionId: question.id,
          optionText: opt.optionText || opt.text,
          isCorrect: !!opt.isCorrect,
        }));
        await PracticeOption.bulkCreate(optionRecords);
      }

      const updatedFull = await PracticeQuestion.findByPk(id, {
        include: [
          { model: PracticeOption, as: 'options' },
          { model: Course, as: 'course', attributes: ['id', 'courseName'] }
        ],
      });

      return res.status(200).json({ success: true, data: updatedFull });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteQuestion: async (req, res) => {
    try {
      const { id } = req.params;
      await PracticeQuestion.destroy({ where: { id } });
      return res.status(200).json({ success: true, message: 'Question deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  bulkDeleteQuestions: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No question IDs provided for bulk deletion' });
      }
      await PracticeQuestion.destroy({ where: { id: ids } });
      return res.status(200).json({ success: true, message: `${ids.length} question(s) deleted successfully` });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Bulk CSV Upload
  bulkUploadQuestions: async (req, res) => {
    try {
      const { questions } = req.body; // Expect array of question objects parsed from CSV
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: 'No questions provided' });
      }

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

      return res.status(200).json({ success: true, message: `Successfully imported ${createdCount} questions` });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= ADMIN TEST BUILDER =================

  getTests: async (req, res) => {
    try {
      const { testType, status, scope, courseId } = req.query;
      const where = {};
      if (testType) where.testType = testType;
      if (status) where.status = status;
      if (scope) where.scope = scope;
      if (courseId) where.courseId = Number(courseId);

      const include = [];
      if (PracticeCategory) {
        include.push({ model: PracticeCategory, as: 'category', required: false });
      }
      if (PracticeTopic) {
        include.push({ model: PracticeTopic, as: 'topic', required: false });
      }
      if (PracticeQuestion) {
        include.push({ model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] }, required: false });
      }
      if (Course) {
        include.push({ model: Course, as: 'course', attributes: ['id', 'courseName'], required: false });
      }

      const tests = await PracticeTest.findAll({
        where,
        include,
        order: [['createdAt', 'DESC']],
      });
      return res.status(200).json({ success: true, data: tests });
    } catch (error) {
      logger.error('GET TESTS ERROR:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createTest: async (req, res) => {
    try {
      const {
        title,
        description,
        testType,
        categoryId,
        topicId,
        courseId,
        duration,
        totalMarks,
        passingPercentage,
        numberOfQuestions,
        randomizeQuestions,
        randomizeOptions,
        allowReattempt,
        status,
        questionIds
      } = req.body;

      if (!title || !testType) {
        return res.status(400).json({ success: false, message: 'Title and Test Type are required' });
      }

      const userRole = req.user?.accountType === 'Instructor' ? 'INSTRUCTOR' : 'ADMIN';
      const targetScope = req.body.scope || (courseId ? 'COURSE' : 'GLOBAL');
      const targetCourseId = targetScope === 'COURSE' ? courseId : null;

      const test = await PracticeTest.create({
        title,
        description,
        testType,
        categoryId: categoryId || null,
        topicId: topicId || null,
        courseId: targetCourseId,
        createdBy: req.user ? req.user.id : null,
        createdByRole: userRole,
        scope: targetScope,
        duration: duration || 15,
        totalMarks: totalMarks || 10,
        passingPercentage: passingPercentage || 40,
        numberOfQuestions: numberOfQuestions || (questionIds ? questionIds.length : 10),
        randomizeQuestions: randomizeQuestions !== undefined ? randomizeQuestions : true,
        randomizeOptions: randomizeOptions !== undefined ? randomizeOptions : true,
        allowReattempt: allowReattempt !== undefined ? allowReattempt : true,
        status: status || 'published',
      });

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

      const fullTest = await PracticeTest.findByPk(test.id, {
        include: [{ model: PracticeQuestion, as: 'questions' }]
      });

      return res.status(201).json({ success: true, data: fullTest });
    } catch (error) {
      logger.error('CREATE TEST ERROR:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteTest: async (req, res) => {
    try {
      const { id } = req.params;
      await PracticeTest.destroy({ where: { id } });
      return res.status(200).json({ success: true, message: 'Test deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  bulkDeleteTests: async (req, res) => {
    try {
      const { testIds } = req.body;
      if (!Array.isArray(testIds) || testIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No test IDs provided for deletion.' });
      }
      const numericIds = testIds.map(id => Number(id));
      const deletedCount = await PracticeTest.destroy({
        where: { id: { [Op.in]: numericIds } }
      });
      return res.status(200).json({
        success: true,
        message: `${deletedCount} test(s) deleted successfully.`,
        deletedCount
      });
    } catch (error) {
      logger.error('BULK DELETE TESTS ERROR:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= STUDENT PRACTICE CENTER =================

  // Overview stats & cards data
  getPracticeOverview: async (req, res) => {
    try {
      const [
        dailyQuizCount,
        topicPracticeCount,
        courseTestCount,
        mockTestCount,
        codingCount,
        interviewCount,
        userAttemptsCount
      ] = await Promise.all([
        PracticeTest.count({ where: { testType: 'Daily Quiz', status: 'published', scope: 'GLOBAL' } }),
        PracticeQuestion.count({ where: { status: 'published', scope: 'GLOBAL', categoryId: { [Op.ne]: null } } }),
        PracticeTest.count({ where: { testType: 'Course Test', status: 'published', scope: 'GLOBAL' } }),
        PracticeTest.count({ where: { testType: 'Mock Test', status: 'published', scope: 'GLOBAL' } }),
        PracticeQuestion.count({ where: { type: 'Coding', status: 'published', scope: 'GLOBAL' } }),
        PracticeQuestion.count({ where: { type: 'Interview', status: 'published', scope: 'GLOBAL' } }),
        PracticeAttempt.count({ where: { userId: req.user.id } }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          dailyQuizCount: dailyQuizCount || 0,
          topicPracticeCount: topicPracticeCount || 0,
          courseTestCount: courseTestCount || 0,
          mockTestCount: mockTestCount || 0,
          codingCount: codingCount || 0,
          interviewCount: interviewCount || 0,
          userAttemptsCount: userAttemptsCount || 0,
        }
      });
    } catch (error) {
      logger.error('PRACTICE OVERVIEW FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Fetch Daily Quiz (Dynamic questions)
  getDailyQuiz: async (req, res) => {
    try {
      // Find published Daily Quiz test or dynamically fetch 5 published MCQ questions
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
        // Fallback: Pick 5 published MCQs
        const questions = await PracticeQuestion.findAll({
          where: { type: 'MCQ', status: 'published' },
          limit: 5,
          include: [{ model: PracticeOption, as: 'options', attributes: ['id', 'optionText'] }],
          order: sequelize.random()
        });

        return res.status(200).json({
          success: true,
          data: {
            id: null,
            title: 'Daily Practice Quiz',
            duration: 10,
            totalMarks: questions.length * 2,
            questions: questions
          }
        });
      }

      return res.status(200).json({ success: true, data: test });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Dynamic Topic Practice Questions
  getTopicPracticeQuestions: async (req, res) => {
    try {
      const { categoryId, topicId, difficulty } = req.query;
      const where = { status: 'published' };
      if (categoryId) where.categoryId = categoryId;
      if (topicId) where.topicId = topicId;
      if (difficulty) where.difficulty = difficulty;

      const questions = await PracticeQuestion.findAll({
        where,
        include: [{ model: PracticeOption, as: 'options', attributes: ['id', 'optionText'] }],
        limit: 10
      });

      return res.status(200).json({ success: true, data: questions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Submit Practice Attempt
  submitAttempt: async (req, res) => {
    try {
      const { testId, testType, answers, timeTaken } = req.body; // answers = [{ questionId, selectedOptionId, userCode, userInterviewAnswer }]
      const userId = req.user.id;

      if (!Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: 'Invalid answers format' });
      }

      let totalQuestions = answers.length;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;
      let score = 0;
      let totalMarks = 0;
      const answerRecords = [];
      const topicStats = {}; // { topicName: { correct: 0, total: 0 } }

      for (const ans of answers) {
        const question = await PracticeQuestion.findByPk(ans.questionId, {
          include: [
            { model: PracticeOption, as: 'options' },
            { model: PracticeTopic, as: 'topic' }
          ]
        });

        if (!question) continue;

        const marks = question.marks || 1;
        const neg = question.negativeMarks || 0;
        totalMarks += marks;

        const topicName = question.topic ? question.topic.name : 'General';
        if (!topicStats[topicName]) topicStats[topicName] = { correct: 0, total: 0 };
        topicStats[topicName].total += 1;

        let isCorrect = false;
        let awarded = 0;

        if (question.type === 'MCQ') {
          if (!ans.selectedOptionId) {
            skippedCount++;
          } else {
            const correctOpt = question.options.find(o => o.isCorrect);
            if (correctOpt && String(correctOpt.id) === String(ans.selectedOptionId)) {
              isCorrect = true;
              correctCount++;
              awarded = marks;
              score += marks;
              topicStats[topicName].correct += 1;
            } else {
              wrongCount++;
              awarded = -neg;
              score -= neg;
            }
          }
        } else {
          // Coding or Interview - self-validated / submitted
          if (ans.userCode || ans.userInterviewAnswer) {
            isCorrect = true;
            correctCount++;
            awarded = marks;
            score += marks;
            topicStats[topicName].correct += 1;
          } else {
            skippedCount++;
          }
        }

        answerRecords.push({
          questionId: question.id,
          selectedOptionId: ans.selectedOptionId || null,
          userCode: ans.userCode || null,
          userInterviewAnswer: ans.userInterviewAnswer || null,
          isCorrect,
          marksAwarded: awarded,
        });
      }

      const percentage = totalMarks > 0 ? Math.max(0, Math.round((score / totalMarks) * 100)) : 0;
      const attemptedCount = correctCount + wrongCount;
      const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

      // Calculate strong/weak topics
      const strongTopics = [];
      const weakTopics = [];
      Object.keys(topicStats).forEach(t => {
        const acc = (topicStats[t].correct / topicStats[t].total) * 100;
        if (acc >= 70) strongTopics.push(t);
        else weakTopics.push(t);
      });

      const attempt = await PracticeAttempt.create({
        userId,
        testId: testId || null,
        testType: testType || 'Daily Quiz',
        totalQuestions,
        correctCount,
        wrongCount,
        skippedCount,
        score,
        totalMarks,
        percentage,
        accuracy,
        timeTaken: timeTaken || 0,
        status: percentage >= 40 ? 'Passed' : 'Completed',
        analytics: {
          strongTopics,
          weakTopics,
          recommendedPractice: weakTopics.length > 0 ? weakTopics : ['Advanced Algorithms']
        }
      });

      // Bulk create answers
      const answersWithAttemptId = answerRecords.map(a => ({ ...a, attemptId: attempt.id }));
      await PracticeAttemptAnswer.bulkCreate(answersWithAttemptId);

      const fullAttempt = await PracticeAttempt.findByPk(attempt.id, {
        include: [{
          model: PracticeAttemptAnswer,
          as: 'answers',
          include: [
            { model: PracticeQuestion, as: 'question', include: [{ model: PracticeOption, as: 'options' }] },
            { model: PracticeOption, as: 'selectedOption' }
          ]
        }]
      });

      return res.status(201).json({ success: true, data: fullAttempt });
    } catch (error) {
      logger.error('SUBMIT ATTEMPT FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Student Previous Attempts
  getUserAttempts: async (req, res) => {
    try {
      const attempts = await PracticeAttempt.findAll({
        where: { userId: req.user.id },
        include: [{ model: PracticeTest, as: 'test', attributes: ['title', 'testType'] }],
        order: [['createdAt', 'DESC']],
      });
      return res.status(200).json({ success: true, data: attempts });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Single Attempt Detailed Review
  getAttemptDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const attempt = await PracticeAttempt.findOne({
        where: { id, userId: req.user.id },
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

      if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
      return res.status(200).json({ success: true, data: attempt });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ================= COURSE-SPECIFIC PRACTICE (INSTRUCTOR & ENROLLED STUDENTS) =================

  // Instructor Overview & Content Listing
  getInstructorTests: async (req, res) => {
    try {
      const instructorId = req.user.id;
      const { courseId, testType, status } = req.query;

      logger.info(`[COURSE TEST LIST] instructorId=${instructorId}, req.courseId=${courseId}, testType=${testType}`);

      // Find all courses owned by instructor
      const ownedCourses = await Course.findAll({
        where: { [Op.or]: [{ instructorId }, { instructor_id: instructorId }] },
        attributes: ['id']
      });
      const ownedCourseIds = ownedCourses.map(c => c.id);

      logger.info(`[COURSE TEST LIST] ownedCourseIds=[${ownedCourseIds.join(', ')}]`);

      if (ownedCourseIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      const where = {
        scope: 'COURSE'
      };

      if (courseId) {
        const numericCourseId = Number(courseId);
        if (!ownedCourseIds.map(id => Number(id)).includes(numericCourseId)) {
          logger.warn(`[COURSE TEST LIST] Unauthorized course access attempt for courseId=${courseId}`);
          return res.status(403).json({ success: false, message: 'Unauthorized course access' });
        }
        where.courseId = numericCourseId;
      } else {
        where.courseId = { [Op.in]: ownedCourseIds };
      }

      if (testType) where.testType = testType;
      if (status) where.status = status;

      const tests = await PracticeTest.findAll({
        where,
        include: [
          { model: Course, as: 'course', attributes: ['id', 'courseName'] },
          { model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] } }
        ],
        order: [['createdAt', 'DESC']]
      });

      logger.info(`[COURSE TEST LIST] returnedTests count=${tests.length}`);

      return res.status(200).json({ success: true, data: tests });
    } catch (error) {
      logger.error('GET INSTRUCTOR TESTS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getInstructorQuestions: async (req, res) => {
    try {
      const instructorId = req.user.id;
      const { courseId, type, difficulty, search } = req.query;

      const ownedCourses = await Course.findAll({
        where: { [Op.or]: [{ instructorId }, { instructor_id: instructorId }] },
        attributes: ['id']
      });
      const ownedCourseIds = ownedCourses.map(c => c.id);

      const whereConditions = [
        { createdBy: instructorId }
      ];

      if (ownedCourseIds.length > 0) {
        whereConditions.push({ courseId: { [Op.in]: ownedCourseIds } });
      }

      const where = {
        [Op.or]: whereConditions
      };

      if (courseId) {
        where.courseId = Number(courseId);
      }
      if (type) where.type = type;
      if (difficulty) where.difficulty = difficulty;
      if (search) where.title = { [Op.like]: `%${search}%` };

      const questions = await PracticeQuestion.findAll({
        where,
        include: [
          { model: PracticeOption, as: 'options' },
          { model: Course, as: 'course', attributes: ['id', 'courseName'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({ success: true, data: questions });
    } catch (error) {
      logger.error('GET INSTRUCTOR QUESTIONS FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  updateTestStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const instructorId = req.user.id;

      const test = await PracticeTest.findByPk(id);
      if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

      // Verify ownership
      if (Number(test.createdBy) !== Number(instructorId) && req.user.accountType !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not own this test' });
      }

      await test.update({ status: status === 'published' ? 'published' : 'draft' });
      return res.status(200).json({ success: true, message: `Test status updated to ${test.status}`, data: test });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getTestAttempts: async (req, res) => {
    try {
      const instructorId = req.user.id;
      const { testId } = req.params;

      const test = await PracticeTest.findByPk(testId);
      if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

      if (Number(test.createdBy) !== Number(instructorId) && req.user.accountType !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const attempts = await PracticeAttempt.findAll({
        where: { testId },
        include: [
          { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'image'] },
          { model: PracticeTest, as: 'test', attributes: ['id', 'title', 'totalMarks', 'passingPercentage'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({ success: true, data: attempts });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Fetch tests for a specific course (Student & Enrolled)
  getCoursePractice: async (req, res) => {
    try {
      const { courseId } = req.params;
      if (!courseId) {
        return res.status(400).json({ success: false, message: 'Course ID is required' });
      }

      // Fetch all published tests for this course
      const tests = await PracticeTest.findAll({
        where: { courseId: Number(courseId), scope: 'COURSE', status: 'published' },
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

      return res.status(200).json({ success: true, data: tests });
    } catch (error) {
      logger.error('GET COURSE PRACTICE FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Instructor Create Course Practice Test with ownership verification
  createInstructorCourseTest: async (req, res) => {
    try {
      const { courseId, title, description, testType, duration, totalMarks, passingPercentage, status, questionIds } = req.body;
      const instructorId = req.user.id;

      logger.info(`[COURSE TEST CREATE] payload=${JSON.stringify(req.body)}, instructorId=${instructorId}`);

      if (!courseId || !title) {
        return res.status(400).json({ success: false, message: 'Course ID and title are required' });
      }

      const numericCourseId = Number(courseId);

      // Security check: Verify course exists and is owned by logged-in instructor
      const course = await Course.findByPk(numericCourseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const courseInstructorId = course.instructorId || course.instructor_id;
      if (Number(courseInstructorId) !== Number(instructorId) && req.user.accountType !== 'Admin' && req.user.accountType !== 'Superadmin') {
        logger.warn(`[COURSE TEST CREATE FORBIDDEN] courseInstructorId=${courseInstructorId}, instructorId=${instructorId}`);
        return res.status(403).json({ success: false, message: 'Forbidden: You can only create practice tests for your own courses' });
      }

      const testStatus = status === 'published' ? 'published' : 'draft';

      // Disallow publishing if questions are empty
      if (testStatus === 'published' && (!Array.isArray(questionIds) || questionIds.length === 0)) {
        return res.status(400).json({ success: false, message: 'At least one question is required to publish a test.' });
      }

      const test = await PracticeTest.create({
        title,
        description: description || '',
        testType: testType || 'Course Test',
        courseId: numericCourseId,
        duration: duration || 15,
        totalMarks: totalMarks || 10,
        passingPercentage: passingPercentage || 40,
        numberOfQuestions: Array.isArray(questionIds) ? questionIds.length : 0,
        status: testStatus,
        createdBy: instructorId,
        createdByRole: 'INSTRUCTOR',
        scope: 'COURSE'
      });

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
            order: idx + 1
          }));

        if (testQuestions.length > 0) {
          await PracticeTestQuestion.bulkCreate(testQuestions);
        }
      }

      // Query database using the returned test ID and verify record actually exists
      const fullTest = await PracticeTest.findByPk(test.id, {
        include: [
          { model: Course, as: 'course', attributes: ['id', 'courseName'] },
          { model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] } }
        ]
      });

      if (!fullTest) {
        logger.error(`[COURSE TEST DB VERIFY FAILED] testId=${test.id}`);
        return res.status(500).json({ success: false, message: 'Database persistence failed: Created test could not be retrieved.' });
      }

      logger.info(`[COURSE TEST CREATED & VERIFIED] id=${fullTest.id}, courseId=${fullTest.courseId}, scope=${fullTest.scope}, status=${fullTest.status}`);

      return res.status(201).json({
        success: true,
        data: fullTest,
        message: `Course Practice Test ${testStatus === 'published' ? 'published' : 'saved as draft'} successfully`
      });
    } catch (error) {
      logger.error('CREATE INSTRUCTOR TEST FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = practiceController;

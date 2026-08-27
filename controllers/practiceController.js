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
      const { type, categoryId, topicId, difficulty, status, search } = req.query;
      const where = {};

      if (type) where.type = type;
      if (categoryId) where.categoryId = categoryId;
      if (topicId) where.topicId = topicId;
      if (difficulty) where.difficulty = difficulty;
      if (status) where.status = status;
      if (search) {
        where.title = { [Op.like]: `%${search}%` };
      }

      const questions = await PracticeQuestion.findAll({
        where,
        include: [
          { model: PracticeOption, as: 'options' },
          { model: PracticeCategory, as: 'category' },
          { model: PracticeTopic, as: 'topic' },
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
        categoryId,
        topicId,
        difficulty,
        explanation,
        marks,
        negativeMarks,
        tags,
        courseId,
        status,
        options,
        codingDetails,
        interviewDetails
      } = req.body;

      if (!title || !type) {
        return res.status(400).json({ success: false, message: 'Title and Type are required' });
      }

      const question = await PracticeQuestion.create({
        title,
        type,
        categoryId: categoryId || null,
        topicId: topicId || null,
        difficulty: difficulty || 'Easy',
        explanation,
        marks: marks || 1,
        negativeMarks: negativeMarks || 0,
        tags: tags || [],
        courseId: courseId || null,
        status: status || 'published',
        createdBy: req.user ? req.user.id : null,
        codingDetails: codingDetails || null,
        interviewDetails: interviewDetails || null,
      });

      // Handle MCQ Options
      if (type === 'MCQ' && Array.isArray(options)) {
        const optionRecords = options.map((opt) => ({
          questionId: question.id,
          optionText: opt.optionText || opt.text,
          isCorrect: !!opt.isCorrect,
        }));
        await PracticeOption.bulkCreate(optionRecords);
      }

      const fullQuestion = await PracticeQuestion.findByPk(question.id, {
        include: [{ model: PracticeOption, as: 'options' }],
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

      const { options, ...updateData } = req.body;
      await question.update(updateData);

      if (question.type === 'MCQ' && Array.isArray(options)) {
        await PracticeOption.destroy({ where: { questionId: id } });
        const optionRecords = options.map((opt) => ({
          questionId: question.id,
          optionText: opt.optionText || opt.text,
          isCorrect: !!opt.isCorrect,
        }));
        await PracticeOption.bulkCreate(optionRecords);
      }

      const updatedFull = await PracticeQuestion.findByPk(id, {
        include: [{ model: PracticeOption, as: 'options' }],
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
      const { testType, status } = req.query;
      const where = {};
      if (testType) where.testType = testType;
      if (status) where.status = status;

      const tests = await PracticeTest.findAll({
        where,
        include: [
          { model: PracticeCategory, as: 'category' },
          { model: PracticeTopic, as: 'topic' },
          { model: PracticeQuestion, as: 'questions', through: { attributes: ['order'] } }
        ],
        order: [['createdAt', 'DESC']],
      });
      return res.status(200).json({ success: true, data: tests });
    } catch (error) {
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

      const test = await PracticeTest.create({
        title,
        description,
        testType,
        categoryId: categoryId || null,
        topicId: topicId || null,
        courseId: courseId || null,
        duration: duration || 15,
        totalMarks: totalMarks || 10,
        passingPercentage: passingPercentage || 40,
        numberOfQuestions: numberOfQuestions || (questionIds ? questionIds.length : 10),
        randomizeQuestions: randomizeQuestions !== undefined ? randomizeQuestions : true,
        randomizeOptions: randomizeOptions !== undefined ? randomizeOptions : true,
        allowReattempt: allowReattempt !== undefined ? allowReattempt : true,
        status: status || 'published',
        createdBy: req.user ? req.user.id : null,
      });

      if (Array.isArray(questionIds) && questionIds.length > 0) {
        const testQuestions = questionIds.map((qId, idx) => ({
          testId: test.id,
          questionId: qId,
          order: idx + 1,
        }));
        await PracticeTestQuestion.bulkCreate(testQuestions);
      }

      const fullTest = await PracticeTest.findByPk(test.id, {
        include: [{ model: PracticeQuestion, as: 'questions' }]
      });

      return res.status(201).json({ success: true, data: fullTest });
    } catch (error) {
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
        PracticeTest.count({ where: { testType: 'Daily Quiz', status: 'published' } }),
        PracticeQuestion.count({ where: { status: 'published', categoryId: { [Op.ne]: null } } }),
        PracticeTest.count({ where: { testType: 'Course Test', status: 'published' } }),
        PracticeTest.count({ where: { testType: 'Mock Test', status: 'published' } }),
        PracticeQuestion.count({ where: { type: 'Coding', status: 'published' } }),
        PracticeQuestion.count({ where: { type: 'Interview', status: 'published' } }),
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
  }
};

module.exports = practiceController;

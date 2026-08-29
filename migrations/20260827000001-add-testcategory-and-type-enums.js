'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('practice_questions');

    if (!tableInfo.testCategory) {
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_practice_questions_testCategory') THEN 
            CREATE TYPE "enum_practice_questions_testCategory" AS ENUM('MCQ', 'Coding', 'Topic Practice', 'Mock Test', 'Interview Test', 'Daily Quiz'); 
          END IF; 
        END $$;
      `);
      await queryInterface.addColumn('practice_questions', 'testCategory', {
        type: Sequelize.ENUM('MCQ', 'Coding', 'Topic Practice', 'Mock Test', 'Interview Test', 'Daily Quiz'),
        allowNull: false,
        defaultValue: 'MCQ',
      });
    }

    if (!tableInfo.answerDetails) {
      await queryInterface.addColumn('practice_questions', 'answerDetails', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    // Update enum_practice_questions_type values in postgres if missing
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'Multiple Select';
      ALTER TYPE "enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'True/False';
      ALTER TYPE "enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'Short Answer';
      ALTER TYPE "enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'Fill in the Blank';
    `).catch(() => {});

    // Update enum_practice_tests_testType values in postgres if missing
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'MCQ';
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'Coding';
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'Topic Practice';
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'Mock Test';
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'Interview Test';
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'Daily Quiz';
      ALTER TYPE "enum_practice_tests_testType" ADD VALUE IF NOT EXISTS 'Course Test';
    `).catch(() => {});

    // Update enum_practice_attempts_testType values in postgres if missing
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'MCQ';
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'Coding';
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'Topic Practice';
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'Mock Test';
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'Interview Test';
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'Daily Quiz';
      ALTER TYPE "enum_practice_attempts_testType" ADD VALUE IF NOT EXISTS 'Course Test';
    `).catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('practice_questions', 'testCategory');
    await queryInterface.removeColumn('practice_questions', 'answerDetails');
  }
};

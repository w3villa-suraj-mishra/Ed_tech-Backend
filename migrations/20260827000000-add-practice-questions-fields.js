'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add columns to practice_questions if they do not exist
    const tableInfo = await queryInterface.describeTable('practice_questions');

    if (!tableInfo.createdByRole) {
      await queryInterface.addColumn('practice_questions', 'createdByRole', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ADMIN',
      });
    }

    if (!tableInfo.scope) {
      await queryInterface.addColumn('practice_questions', 'scope', {
        type: Sequelize.ENUM('GLOBAL', 'COURSE'),
        allowNull: false,
        defaultValue: 'GLOBAL',
      });
    }

    if (!tableInfo.courseId) {
      await queryInterface.addColumn('practice_questions', 'courseId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.codingDetails) {
      await queryInterface.addColumn('practice_questions', 'codingDetails', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!tableInfo.interviewDetails) {
      await queryInterface.addColumn('practice_questions', 'interviewDetails', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    // Add createdByRole and scope to practice_tests if missing
    const testTableInfo = await queryInterface.describeTable('practice_tests');

    if (!testTableInfo.createdByRole) {
      await queryInterface.addColumn('practice_tests', 'createdByRole', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ADMIN',
      });
    }

    if (!testTableInfo.scope) {
      await queryInterface.addColumn('practice_tests', 'scope', {
        type: Sequelize.ENUM('GLOBAL', 'COURSE'),
        allowNull: false,
        defaultValue: 'GLOBAL',
      });
    }

    if (!testTableInfo.courseId) {
      await queryInterface.addColumn('practice_tests', 'courseId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('practice_questions', 'createdByRole');
    await queryInterface.removeColumn('practice_questions', 'scope');
    await queryInterface.removeColumn('practice_questions', 'courseId');
    await queryInterface.removeColumn('practice_questions', 'codingDetails');
    await queryInterface.removeColumn('practice_questions', 'interviewDetails');
    await queryInterface.removeColumn('practice_tests', 'createdByRole');
    await queryInterface.removeColumn('practice_tests', 'scope');
    await queryInterface.removeColumn('practice_tests', 'courseId');
  }
};

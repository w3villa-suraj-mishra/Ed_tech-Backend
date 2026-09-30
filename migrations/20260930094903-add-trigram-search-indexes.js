'use strict';
// queryInterface ->Sequelize ka interface hai jiske through hum database ko modify kar sakte hain
// PostgreSQL mein different index types hote hain:
// B-tree
// Hash
// GIN ->Text substring search ke liye hum yahan
// GiST
// BRIN
module.exports = {
  async up(queryInterface) {
    // Enable PostgreSQL trigram extension
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);

    // Category name search index
    await queryInterface.sequelize.query(`
      CREATE INDEX categories_name_trgm_idx
      ON categories
      USING GIN (name gin_trgm_ops);
    `);

    // Course name search index
    await queryInterface.sequelize.query(`
      CREATE INDEX courses_course_name_trgm_idx
      ON courses
      USING GIN (course_name gin_trgm_ops);
    `);
  },

  async down(queryInterface) {
    // Remove course search index
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS courses_course_name_trgm_idx;
    `);

    // Remove category search index
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS categories_name_trgm_idx;
    `);

    // Do NOT drop pg_trgm extension here.
    // Other indexes/database objects may depend on it.
  }
};
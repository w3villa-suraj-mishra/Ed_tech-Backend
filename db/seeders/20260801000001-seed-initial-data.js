// db/seeders/20260801000001-seed-initial-data.js
// Sequelize seed file for initial data population

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash password helper (use bcryptjs in production)
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);

    return Promise.all([
      // Create Admin User
      queryInterface.sequelize.query(`
        INSERT INTO users (id, first_name, last_name, email, password_digest, account_type, image, active, approved, created_at, updated_at)
        VALUES (
          1,
          'Admin',
          'User',
          'admin@edtech.com',
          '${await bcrypt.hash('Admin123', salt)}',
          'Admin',
          'https://res.cloudinary.com/dxgdsmdrl/image/upload/v1/edtech/default_avatar.jpg',
          true,
          true,
          NOW(),
          NOW()
        )
      `),

      // Create Sample Instructor
      queryInterface.sequelize.query(`
        INSERT INTO users (id, first_name, last_name, email, password_digest, account_type, image, active, approved, created_at, updated_at)
        VALUES (
          2,
          'John',
          'Instructor',
          'instructor@edtech.com',
          '${await bcrypt.hash('Instructor123', salt)}',
          'Instructor',
          'https://res.cloudinary.com/dxgdsmdrl/image/upload/v1/edtech/default_avatar.jpg',
          true,
          true,
          NOW(),
          NOW()
        )
      `),

      // Create Sample Student
      queryInterface.sequelize.query(`
        INSERT INTO users (id, first_name, last_name, email, password_digest, account_type, image, active, approved, created_at, updated_at)
        VALUES (
          3,
          'Jane',
          'Student',
          'student@edtech.com',
          '${await bcrypt.hash('Student123', salt)}',
          'Student',
          'https://res.cloudinary.com/dxgdsmdrl/image/upload/v1/edtech/default_avatar.jpg',
          true,
          true,
          NOW(),
          NOW()
        )
      `)
    ]).then(() => {
      // Create profiles for users
      return queryInterface.sequelize.query(`
        INSERT INTO profiles (id, user_id, gender, date_of_birth, contact_number, about, created_at, updated_at)
        VALUES
          (1, 1, 'Male', '1990-01-01', '+1234567890', 'Admin user profile', NOW(), NOW()),
          (2, 2, 'Male', '1985-05-15', '+1234567891', 'Experienced instructor', NOW(), NOW()),
          (3, 3, 'Female', '2000-12-20', '+1234567892', 'Student profile', NOW(), NOW())
      `);
    }).then(() => {
      // Create Categories
      return queryInterface.sequelize.query(`
        INSERT INTO categories (id, name, description, created_at, updated_at)
        VALUES
          (1, 'Web Development', 'Learn web development from basics to advanced', NOW(), NOW()),
          (2, 'Data Science', 'Master data science and machine learning', NOW(), NOW()),
          (3, 'Mobile Development', 'Build mobile apps for iOS and Android', NOW(), NOW()),
          (4, 'Cloud Computing', 'Cloud infrastructure and deployment', NOW(), NOW()),
          (5, 'DevOps', 'DevOps practices and tools', NOW(), NOW())
      `);
    }).then(() => {
      // Create Sample Course
      return queryInterface.sequelize.query(`
        INSERT INTO courses (id, course_name, course_description, what_you_will_learn, price, tag, status, category_id, instructor_id, thumbnail, instructions, created_at, updated_at)
        VALUES (
          1,
          'The Complete Web Development Course',
          'Learn HTML, CSS, JavaScript, React, Node.js and MongoDB',
          'Master full-stack web development with modern frameworks',
          4999,
          'Web Development, JavaScript, React',
          'Published',
          1,
          2,
          'https://res.cloudinary.com/dxgdsmdrl/image/upload/v1/edtech/course_thumbnail.jpg',
          'Prerequisites: Basic computer knowledge',
          NOW(),
          NOW()
        )
      `);
    }).then(() => {
      // Create Sections for the course
      return queryInterface.sequelize.query(`
        INSERT INTO sections (id, section_name, course_id, created_at, updated_at)
        VALUES
          (1, 'Introduction to Web Development', 1, NOW(), NOW()),
          (2, 'HTML Basics', 1, NOW(), NOW()),
          (3, 'CSS Styling', 1, NOW(), NOW()),
          (4, 'JavaScript Fundamentals', 1, NOW(), NOW()),
          (5, 'React Framework', 1, NOW(), NOW())
      `);
    }).then(() => {
      // Create SubSections (lessons/lectures)
      return queryInterface.sequelize.query(`
        INSERT INTO sub_sections (id, title, time_duration, description, video_url, section_id, created_at, updated_at)
        VALUES
          (1, 'Welcome to Web Development', 300, 'Introduction and course overview', 'https://res.cloudinary.com/dxgdsmdrl/video/upload/v1/edtech/lesson_1.mp4', 1, NOW(), NOW()),
          (2, 'Why Learn Web Development', 450, 'Benefits and career prospects', 'https://res.cloudinary.com/dxgdsmdrl/video/upload/v1/edtech/lesson_2.mp4', 1, NOW(), NOW()),
          (3, 'HTML Structure and Tags', 600, 'HTML5 semantic elements', 'https://res.cloudinary.com/dxgdsmdrl/video/upload/v1/edtech/lesson_3.mp4', 2, NOW(), NOW()),
          (4, 'CSS Selectors and Properties', 900, 'Styling with CSS', 'https://res.cloudinary.com/dxgdsmdrl/video/upload/v1/edtech/lesson_4.mp4', 3, NOW(), NOW()),
          (5, 'JavaScript Variables and Functions', 1200, 'JavaScript fundamentals', 'https://res.cloudinary.com/dxgdsmdrl/video/upload/v1/edtech/lesson_5.mp4', 4, NOW(), NOW())
      `);
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Delete in reverse order of creation
    return queryInterface.sequelize.query('SET CONSTRAINTS ALL DEFERRED;')
      .then(() => queryInterface.bulkDelete('sub_sections', null, {}))
      .then(() => queryInterface.bulkDelete('sections', null, {}))
      .then(() => queryInterface.bulkDelete('courses', null, {}))
      .then(() => queryInterface.bulkDelete('categories', null, {}))
      .then(() => queryInterface.bulkDelete('profiles', null, {}))
      .then(() => queryInterface.bulkDelete('users', null, {}));
  }
};

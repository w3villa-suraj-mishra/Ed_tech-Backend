module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      first_name: { type: Sequelize.STRING, allowNull: false },
      last_name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false },
      password_digest: { type: Sequelize.STRING },
      account_type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Student' },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      approved: { type: Sequelize.BOOLEAN, defaultValue: true },
      image: { type: Sequelize.STRING },
      token: { type: Sequelize.STRING },
      reset_password_expires: { type: Sequelize.DATE },
      github_uid: { type: Sequelize.STRING },
      github_token: { type: Sequelize.STRING },
      google_uid: { type: Sequelize.STRING },
      google_token: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.addIndex('users', ['email', 'account_type'], { unique: true, name: 'users_email_account_type_unique' });

    await queryInterface.createTable('otps', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING, allowNull: false },
      code: { type: Sequelize.STRING, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('profiles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      gender: { type: Sequelize.STRING },
      date_of_birth: { type: Sequelize.STRING },
      about: { type: Sequelize.TEXT },
      contact_number: { type: Sequelize.STRING },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('courses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      course_name: { type: Sequelize.STRING },
      course_description: { type: Sequelize.TEXT },
      what_you_will_learn: { type: Sequelize.TEXT },
      price: { type: Sequelize.INTEGER, defaultValue: 0 },
      thumbnail: { type: Sequelize.STRING },
      tag: { type: Sequelize.STRING },
      status: { type: Sequelize.STRING },
      instructions: { type: Sequelize.TEXT },
      instructor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      category_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('sections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      section_name: { type: Sequelize.STRING },
      course_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('sub_sections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING },
      time_duration: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      video_url: { type: Sequelize.STRING },
      duration: { type: Sequelize.INTEGER, defaultValue: 0 },
      section_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'sections', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('enrollments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      course_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('rating_and_reviews', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      rating: { type: Sequelize.INTEGER },
      review: { type: Sequelize.TEXT },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      course_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('course_progresses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      course_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.addIndex('course_progresses', ['user_id', 'course_id'], { unique: true, name: 'course_progresses_user_course_unique' });

    await queryInterface.createTable('course_progress_videos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      course_progress_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'course_progresses', key: 'id' }, onDelete: 'CASCADE' },
      sub_section_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'sub_sections', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('live_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      course_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      session_name: { type: Sequelize.STRING },
      start_time: { type: Sequelize.DATE },
      end_time: { type: Sequelize.DATE },
      status: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.createTable('live_chat_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      live_session_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'live_sessions', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      message: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('live_chat_messages');
    await queryInterface.dropTable('live_sessions');
    await queryInterface.dropTable('course_progress_videos');
    await queryInterface.dropTable('course_progresses');
    await queryInterface.dropTable('rating_and_reviews');
    await queryInterface.dropTable('enrollments');
    await queryInterface.dropTable('sub_sections');
    await queryInterface.dropTable('sections');
    await queryInterface.dropTable('courses');
    await queryInterface.dropTable('profiles');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('otps');
    await queryInterface.dropTable('users');
  }
};

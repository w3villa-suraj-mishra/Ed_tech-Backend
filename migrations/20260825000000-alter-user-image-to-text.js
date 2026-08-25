module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN image TYPE TEXT USING image::text;`
      );
    } else {
      await queryInterface.changeColumn('users', 'image', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN image TYPE VARCHAR(255) USING image::varchar(255);`
      );
    } else {
      await queryInterface.changeColumn('users', 'image', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      });
    }
  }
};

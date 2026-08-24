module.exports = {
  async up(queryInterface, Sequelize) {
    // This migration attempts to convert enum account_type to varchar/string
    // Safe for Postgres: cast enum to varchar and set default
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN account_type TYPE VARCHAR USING account_type::varchar;`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN account_type SET DEFAULT 'Student';`
      );
    } else {
      // For other dialects, alterColumn to STRING
      await queryInterface.changeColumn('users', 'account_type', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Student'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      // Attempt to revert back to enum-like restriction by creating a CHECK constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN account_type TYPE VARCHAR;` // leaving as varchar on down
      );
    } else {
      // No-op
    }
  }
};

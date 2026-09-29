const { ContactUs } = require('../models');

/**
 * Contact Us Native & ORM Queries Layer
 */

const createContactSubmissionQuery = async (data) => {
  return await ContactUs.create(data);
};

module.exports = {
  createContactSubmissionQuery
};

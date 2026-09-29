const { siteconfig } = require('../models');

/**
 * Site Config Native & ORM Queries Layer
 */

const getSiteConfigQuery = async () => {
  return await siteconfig.findOne();
};

const updateSiteConfigQuery = async (updateData) => {
  let config = await siteconfig.findOne();
  if (!config) {
    config = await siteconfig.create(updateData);
  } else {
    await config.update(updateData);
  }
  return config;
};

module.exports = {
  getSiteConfigQuery,
  updateSiteConfigQuery
};

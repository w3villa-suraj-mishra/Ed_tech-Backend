const { siteConfigQuery } = require('../nativequery');

const getSiteConfig = async (req, res) => {
  try {
    const config = await siteConfigQuery.getSiteConfigQuery();
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getConfigByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const config = await siteConfigQuery.getSiteConfigQuery();
    const val = config && config[key] !== undefined ? config[key] : null;
    return res.status(200).json({ success: true, data: val });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateSiteConfig = async (req, res) => {
  try {
    const config = await siteConfigQuery.updateSiteConfigQuery(req.body);
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSiteConfig,
  getConfigByKey,
  updateSiteConfig
};

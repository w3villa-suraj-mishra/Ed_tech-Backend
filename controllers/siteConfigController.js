const { SiteConfig } = require('../models');

exports.getConfigByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const config = await SiteConfig.findOne({ where: { key } });
    if (!config) {
      return res.status(404).json({ success: false, message: `Config for key ${key} not found.` });
    }
    
    // Parse if JSON, otherwise return as string
    let parsedValue = config.value;
    try {
      parsedValue = JSON.parse(config.value);
    } catch (e) {
      // Not JSON, return raw string
    }

    return res.status(200).json({ success: true, data: parsedValue });
  } catch (error) {
    console.error('Error fetching site config:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const accessControlService = require('../services/accessControlService');
const logger = require('../utils/logger');

// Run every hour to check and expire active Silver plan access
const startSilverExpirationCron = () => {
  const ONE_HOUR = 60 * 60 * 1000;
  
  const checkExpirations = async () => {
    try {
      const expiredCount = await accessControlService.expireSilverPlans();
      if (expiredCount > 0) {
        logger.info(`Cron Job: Expired ${expiredCount} Silver course plan(s).`);
      }
    } catch (error) {
      logger.error('Cron Job Error (Silver Expiration):', error.message);
    }
  };

  // Initial run (delayed by 10s to allow DB sync to complete first) and hourly interval
  setTimeout(checkExpirations, 10000);
  setInterval(checkExpirations, ONE_HOUR);
  logger.info('Silver expiration background interval initialized.');
};

module.exports = startSilverExpirationCron;

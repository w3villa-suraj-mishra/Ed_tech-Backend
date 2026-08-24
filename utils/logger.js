const fs = require('fs');
const path = require('path');

const logDir = process.env.VERCEL
  ? path.join('/tmp', 'logs')
  : path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    console.error('Logger dir create error:', err.message);
  }
}

const appendLog = (file, content) => {
  if (process.env.VERCEL) return;
  try {
    fs.appendFileSync(path.join(logDir, file), content);
  } catch (err) {
    // Ignore file write errors on serverless
  }
};

const logger = {
  error: (message, error = '') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message} ${error}\n`;
    console.error(logMessage);
    appendLog('error.log', logMessage);
  },
  
  info: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}\n`;
    console.log(logMessage);
    appendLog('info.log', logMessage);
  },
  
  warn: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WARN: ${message}\n`;
    console.warn(logMessage);
    appendLog('warn.log', logMessage);
  }
};

module.exports = logger;

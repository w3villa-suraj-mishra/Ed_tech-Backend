const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = {
  error: (message, error = '') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message} ${error}\n`;
    console.error(logMessage);
    fs.appendFileSync(path.join(logDir, 'error.log'), logMessage);
  },
  
  info: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}\n`;
    if (process.env.NODE_ENV === 'development') {
      console.log(logMessage);
    }
    fs.appendFileSync(path.join(logDir, 'info.log'), logMessage);
  },
  
  warn: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WARN: ${message}\n`;
    if (process.env.NODE_ENV === 'development') {
      console.warn(logMessage);
    }
    fs.appendFileSync(path.join(logDir, 'warn.log'), logMessage);
  }
};

module.exports = logger;

const { v4: uuidv4 } = require('uuid');

const helpers = {
  /**
   * Generate OTP code (6 digits)
   */
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Generate unique filename for uploads
   */
  generateFileName: (originalName) => {
    const ext = originalName.split('.').pop();
    return `${uuidv4()}.${ext}`;
  },

  /**
   * Parse time duration string (HH:MM:SS or MM:SS)
   */
  parseTimeDuration: (timeString) => {
    if (!timeString) return 0;
    
    const parts = timeString.split(':').map(p => parseInt(p, 10));
    
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    
    return 0;
  },

  /**
   * Convert seconds to HH:MM:SS format
   */
  secondsToHHMMSS: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  /**
   * Get user's avatar URL from dicebear
   */
  getDefaultAvatarUrl: (firstName = 'User', lastName = 'Profile') => {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}${lastName}`;
  },

  /**
   * Validate email format
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Split full name into first and last name
   */
  splitName: (fullName) => {
    if (!fullName) {
      return { firstName: 'User', lastName: 'Profile' };
    }

    const parts = fullName.trim().split(/\s+/);
    return {
      firstName: parts[0] || 'User',
      lastName: parts.slice(1).join(' ') || 'Profile'
    };
  }
};

module.exports = helpers;

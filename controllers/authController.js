const jwt = require('jsonwebtoken');
const { User, Otp } = require('../models');
const mailService = require('../services/mailService');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

const authController = {
  /**
   * Sign up new user
   */
  signup: async (req, res) => {
    try {
      const {
        firstName: reqFirstName,
        first_name,
        lastName: reqLastName,
        last_name,
        email: reqEmail,
        password,
        confirmPassword,
        passwordConfirmation: reqPasswordConfirmation,
        password_confirmation,
        accountType: reqAccountType,
        account_type,
        image
      } = req.body;

      const firstName = reqFirstName || first_name;
      const lastName = reqLastName || last_name;
      const passwordConfirmation = reqPasswordConfirmation || password_confirmation || confirmPassword;
      const email = String(reqEmail || '').toLowerCase().trim();
      const accountType = reqAccountType || account_type;

      if (!accountType) {
        return res.status(400).json({ success: false, message: 'accountType is required' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email, accountType }
      });

      if (existingUser) {
        return res.status(422).json({
          success: false,
          message: 'This account already exists for the selected role. Please log in.'
        });
      }

      // Check if OTP was verified
      const otp = await Otp.findOne({
        where: { email, verified: true }
      });

      if (!otp) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email with OTP first.'
        });
      }

      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        passwordConfirmation,
        accountType,
        image: image || helpers.getDefaultAvatarUrl(firstName, lastName)
      });

      // Delete OTP after successful signup
      await otp.destroy();

      return res.status(201).json({
        success: true,
        message: 'Signup successful'
      });
    } catch (error) {
      logger.error('SIGNUP FAILED:', error.message);
      return res.status(500).json({
        success: false,
        errors: [{ message: error.message }]
      });
    }
  },

  /**
   * Login user
   */
  login: async (req, res) => {
    try {
      const { email, password, accountType: reqAccountType, account_type } = req.body;
      const accountType = reqAccountType || account_type;

      if (!accountType) {
        return res.status(400).json({ success: false, message: 'accountType is required' });
      }

      let user = await User.findOne({
        where: { email, accountType },
        include: ['profile']
      });

      if (!user) {
        // Fallback: check if user exists under email regardless of tab role
        user = await User.findOne({
          where: { email },
          include: ['profile']
        });
      }

      if (!user || !user.authenticate(password)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const token = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          account_type: user.accountType
        },
        process.env.JWT_SECRET || 'Secret123',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountType: user.accountType,
          image: user.image,
          profile: user.profile
        }
      });
    } catch (error) {
      logger.error('LOGIN FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Send OTP to email
   */
  sendOtp: async (req, res) => {
    try {
      const { email: reqEmail, accountType: reqAccountType, account_type } = req.body;
      const email = String(reqEmail || '').toLowerCase().trim();
      const accountType = reqAccountType || account_type;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      if (!accountType) {
        return res.status(400).json({ success: false, message: 'accountType is required' });
      }

      // Check if user already exists
      const userExists = await User.findOne({
        where: { email, accountType }
      });

      if (userExists) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email and role is already registered. Please log in.'
        });
      }

      // Delete any existing OTPs for this email
      await Otp.destroy({
        where: { email }
      });

      // Generate 6-digit OTP
      const code = helpers.generateOTP();

      // Create OTP record
      await Otp.create({
        email,
        code: String(code).trim(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        verified: false
      });

      // Send OTP via email
      await mailService.sendOTP(email, code);

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      logger.error('SEND OTP FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message || 'Unable to send the verification code. Please try again.'
      });
    }
  },

  /**
   * Verify OTP
   */
  verifyOtp: async (req, res) => {
    try {
      const { email: reqEmail, code } = req.body;
      const email = String(reqEmail || '').toLowerCase().trim();
      const cleanCode = String(code || '').trim();

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.'
        });
      }

      if (!cleanCode || cleanCode.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Please enter the complete 6-digit verification code.'
        });
      }

      const otpRecord = await Otp.findOne({
        where: {
          email,
          code: cleanCode
        },
        order: [['createdAt', 'DESC']]
      });

      if (!otpRecord) {
        return res.status(422).json({
          success: false,
          message: 'Invalid verification code. Please try again.'
        });
      }

      if (otpRecord.verified) {
        return res.status(422).json({
          success: false,
          message: 'This verification code has already been used.'
        });
      }

      // Check if OTP has expired
      if (new Date() > new Date(otpRecord.expiresAt)) {
        await otpRecord.destroy();
        return res.status(422).json({
          success: false,
          message: 'This verification code has expired. Please request a new code.'
        });
      }

      // Mark OTP as verified
      await otpRecord.update({ verified: true });

      return res.status(200).json({
        success: true,
        message: 'OTP Verified'
      });
    } catch (error) {
      logger.error('VERIFY OTP FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }
  },

  /**
   * Logout user
   */
  logout: async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('LOGOUT FAILED:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const header = req.headers.authorization;
      if (!header) {
        return res.status(401).json({ success: false, message: 'Token missing' });
      }

      const token = header.split(' ').pop();
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'Secret123');
      const user = await User.findByPk(decoded.user_id || decoded.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (!user.authenticate(currentPassword)) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }

      user.password = newPassword;
      user.passwordConfirmation = confirmPassword;
      await user.save();

      return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      logger.error('CHANGE PASSWORD FAILED:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = authController;

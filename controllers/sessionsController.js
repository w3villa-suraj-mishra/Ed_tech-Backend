const jwt = require('jsonwebtoken');
const axios = require('axios');
const { User } = require('../models');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

const sessionsController = {
  /**
   * GitHub OAuth start
   */
  githubStart: async (req, res) => {
    try {
      const mode = req.query.mode || 'signup';
      const role = req.query.role || 'Student';

      return res.redirect(
        `${process.env.BACKEND_URL}/auth/github?mode=${mode}&role=${role}`
      );
    } catch (error) {
      logger.error('GITHUB START FAILED:', error.message);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  },

  /**
   * OAuth callback handler
   */
  create: async (req, res) => {
    try {
      const auth = req.authInfo || req.user;
      const paramsData = req.query;

      if (!auth) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      const mode = paramsData.mode || 'signup';
      const role = paramsData.role || 'Student';

      const provider = auth.provider;
      const uid = auth.uid;
      const token_str = auth.accessToken;
      let email = auth.email;

      // Get email for GitHub if not provided
      if (!email && provider === 'github' && token_str) {
        email = await sessionsController.fetchGithubPrimaryEmail(token_str);
      }

      if (!email) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
      }

      // Find or create user
      let user = await User.findOne({
        where: { email }
      });

      if (user) {
        // If role was explicitly selected during OAuth login (e.g. Instructor), update accountType
        if (role && role !== user.accountType) {
          await user.update({ accountType: role });
        }

        // Update social fields
        if (provider === 'github' && !user.githubUid) {
          await user.update({ githubUid: uid, githubToken: token_str });
        } else if ((provider === 'google' || provider === 'google_oauth2') && !user.googleUid) {
          await user.update({ googleUid: uid, googleToken: token_str });
        }

        // Update image if available
        if (auth.photo && !user.image) {
          await user.update({ image: auth.photo });
        }
      } else {
        const { firstName, lastName } = helpers.splitName(auth.displayName);

        const randomPassword = require('crypto').randomBytes(10).toString('hex');

        const userData = {
          firstName,
          lastName,
          email,
          password: randomPassword,
          passwordConfirmation: randomPassword,
          accountType: role || 'Student',
          image: auth.photo || helpers.getDefaultAvatarUrl(firstName, lastName),
          active: true,
          approved: true
        };

        if (provider === 'github') {
          userData.githubUid = uid;
          userData.githubToken = token_str;
        } else if (provider === 'google' || provider === 'google_oauth2') {
          userData.googleUid = uid;
          userData.googleToken = token_str;
        }

        user = await User.create(userData);
      }

      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          account_type: user.accountType
        },
        process.env.JWT_SECRET || 'Secret123',
        { expiresIn: '7d' }
      );

      const targetFrontend = (process.env.FRONTEND_URL || 'https://ed-tech-frontend-indol.vercel.app').trim();
      return res.redirect(
        `${targetFrontend}/oauth-success?token=${jwtToken}&role=${user.accountType}`
      );
    } catch (error) {
      logger.error('OAUTH CALLBACK FAILED:', error.message);
      const targetFrontend = (process.env.FRONTEND_URL || 'https://ed-tech-frontend-indol.vercel.app').trim();
      return res.redirect(`${targetFrontend}/login?error=auth_failed`);
    }
  },

  /**
   * Fetch GitHub primary email
   */
  fetchGithubPrimaryEmail: async (accessToken) => {
    try {
      const response = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'EdTech'
        }
      });

      if (Array.isArray(response.data)) {
        const primaryEmail = response.data.find(e => e.primary);
        return primaryEmail ? primaryEmail.email : response.data[0].email;
      }

      return null;
    } catch (error) {
      logger.error('FETCH GITHUB EMAIL FAILED:', error.message);
      return null;
    }
  }
};

module.exports = sessionsController;

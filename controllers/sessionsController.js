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

      const provider = auth?.provider;
      const isGithub = provider === 'github';
      const logPrefix = isGithub ? '[GITHUB' : '[GOOGLE';

      logger.info(`${logPrefix} 4] Entering sessionsController.create`);
      if (!auth) {
        logger.error(`${logPrefix} ERROR] No auth payload in req.authInfo or req.user`);
        const targetFrontend = (process.env.FRONTEND_URL || 'https://ed-tech-frontend-indol.vercel.app').trim();
        return res.redirect(`${targetFrontend}/login?error=auth_failed`);
      }

      const mode = paramsData.mode || 'signup';
      const role = paramsData.role || 'Student';

      const uid = auth.uid;
      const token_str = auth.accessToken;
      let email = auth.email;

      // Get email for GitHub if missing from profile
      if (!email && isGithub && token_str) {
        logger.info('[GITHUB 4] Email missing in profile, retrieving primary email from GitHub API');
        email = await sessionsController.fetchGithubPrimaryEmail(token_str);
      }

      if (email) {
        email = String(email).toLowerCase().trim();
      }

      logger.info(`${logPrefix} 4] Provider=${provider}, mode=${mode}, role=${role}, email=${email}`);

      if (!email) {
        logger.error(`${logPrefix} ERROR] No verified email found in OAuth profile`);
        const targetFrontend = (process.env.FRONTEND_URL || 'https://ed-tech-frontend-indol.vercel.app').trim();
        return res.redirect(`${targetFrontend}/login?error=no_email`);
      }

      // Find or create user
      logger.info(`${logPrefix} 5] User lookup started for email: ${email}`);
      let user = await User.findOne({
        where: { email }
      });

      if (user) {
        logger.info(`${logPrefix} 6] Existing user found (ID: ${user.id}, stored accountType: ${user.accountType})`);
        
        // For signup mode, if accountType is different, update it if explicitly requested; for login, preserve stored accountType
        if (mode === 'signup' && role && role !== user.accountType) {
          await user.update({ accountType: role });
          logger.info(`${logPrefix} 6] Updated existing user accountType to selected signup role: ${role}`);
        }

        // Update social fields without breaking existing accounts
        if (isGithub && !user.githubUid) {
          await user.update({ githubUid: String(uid || '') });
        } else if ((provider === 'google' || provider === 'google_oauth2') && !user.googleUid) {
          await user.update({ googleUid: String(uid || '') });
        }

        // Update profile image if missing
        if (auth.photo && !user.image) {
          await user.update({ image: auth.photo });
        }
      } else {
        logger.info(`${logPrefix} 6] New user detected. Creating new user record for ${email}`);
        const { firstName, lastName } = helpers.splitName(auth.displayName);

        const randomPassword = require('crypto').randomBytes(10).toString('hex');

        const userData = {
          firstName: firstName || 'User',
          lastName: lastName || '',
          email,
          password: randomPassword,
          passwordConfirmation: randomPassword,
          accountType: role || 'Student',
          active: true,
          approved: true
        };

        const safePhoto = auth.photo
          ? (auth.photo.length > 250 ? helpers.getDefaultAvatarUrl(firstName, lastName) : auth.photo)
          : helpers.getDefaultAvatarUrl(firstName, lastName);

        if (isGithub) {
          userData.githubUid = String(uid || '');
        } else if (provider === 'google' || provider === 'google_oauth2') {
          userData.googleUid = String(uid || '');
        }

        userData.image = safePhoto;

        try {
          user = await User.create(userData);
          logger.info(`${logPrefix} 7] User created successfully (ID: ${user.id}, accountType: ${user.accountType})`);
        } catch (createErr) {
          logger.error(`${logPrefix} CREATE ERROR] User.create failed for ${email}: ${createErr.message}`, {
            name: createErr.name,
            errors: createErr.errors,
            original: createErr.original,
            stack: createErr.stack
          });
          throw createErr;
        }
      }

      logger.info(`${logPrefix} 8] Account type detected: ${user.accountType}`);
      logger.info(`${logPrefix} 9] JWT generated`);

      // Generate JWT token using existing JWT architecture
      const jwtToken = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          account_type: user.accountType
        },
        process.env.JWT_SECRET || 'Secret123',
        { expiresIn: '7d' }
      );

      logger.info(`${logPrefix} 10] Redirecting to OAuthSuccess`);
      const targetFrontend = (process.env.FRONTEND_URL || 'https://ed-tech-frontend-indol.vercel.app').trim();
      
      return res.redirect(
        `${targetFrontend}/oauth-success?token=${jwtToken}&role=${user.accountType}`
      );
    } catch (error) {
      logger.error(`[OAUTH ERROR] ${error.message}`, { 
        name: error.name,
        errors: error.errors,
        original: error.original,
        stack: error.stack 
      });
      const targetFrontend = (process.env.FRONTEND_URL || 'https://ed-tech-frontend-indol.vercel.app').trim();
      return res.redirect(`${targetFrontend}/login?error=${encodeURIComponent(error.message)}`);
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

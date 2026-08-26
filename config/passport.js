const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const logger = require('../utils/logger');

const configurePassport = () => {
  try {
    const defaultBackend = 'https://ed-tech-backend-2kha.vercel.app';
    const backendUrl = String(process.env.BACKEND_URL || defaultBackend).trim();
    const rawCallback = process.env.GOOGLE_CALLBACK_URL || `${backendUrl}/auth/google_oauth2/callback`;
    const googleCallback = String(rawCallback).replace(/[\r\n\t ]+/g, '').trim();

    const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();

    if (googleClientId && googleClientSecret) {
      const googleStrategy = new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: googleCallback
        },
        (accessToken, refreshToken, profile, done) => {
          done(null, {
            provider: 'google_oauth2',
            uid: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
            photo: profile.photos?.[0]?.value,
            accessToken
          });
        }
      );
      googleStrategy.name = 'google_oauth2';
      passport.use(googleStrategy);
      logger.info(`Google OAuth callback URL: ${googleCallback}`);
    } else {
      logger.warn('Google OAuth credentials missing or invalid in environment variables');
    }

    const githubClientId = String(process.env.GITHUB_CLIENT_ID || '').trim();
    const githubClientSecret = String(process.env.GITHUB_CLIENT_SECRET || '').trim();

    if (githubClientId && githubClientSecret) {
      const githubCallback = process.env.GITHUB_CALLBACK_URL || `${backendUrl}/auth/github/callback`;
      const githubStrategy = new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: githubCallback,
          scope: ['user:email']
        },
        (accessToken, refreshToken, profile, done) => {
          done(null, {
            provider: 'github',
            uid: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
            photo: profile.photos?.[0]?.value,
            accessToken
          });
        }
      );
      githubStrategy.name = 'github';
      passport.use(githubStrategy);
      logger.info(`GitHub OAuth callback URL: ${githubCallback}`);
    } else {
      logger.warn('GitHub OAuth credentials missing or invalid in environment variables');
    }
  } catch (err) {
    logger.error('Error configuring Passport:', err.message);
  }
};

module.exports = { configurePassport, passport };

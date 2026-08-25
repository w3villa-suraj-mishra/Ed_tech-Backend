const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const logger = require('../utils/logger');

const configurePassport = () => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const defaultBackend = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ed-tech-backend-2kha.vercel.app';
    const backendUrl = process.env.BACKEND_URL || defaultBackend;
    const googleCallback = process.env.GOOGLE_CALLBACK_URL || `${backendUrl}/auth/google_oauth2/callback`;
    const googleStrategy = new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
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
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const githubCallback = process.env.GITHUB_CALLBACK_URL || `${baseUrl}/auth/github/callback`;
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
      )
    );
    logger.info(`GitHub OAuth callback URL: ${githubCallback}`);
  }
};

module.exports = { configurePassport, passport };

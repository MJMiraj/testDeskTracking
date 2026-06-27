const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

const verifyCallback = async (accessToken, refreshToken, profile, done) => {
    try {
        // GitHub might send emails as an array or null
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : `${profile.username}@github.com`;

        // Check if user already exists
        let user = await User.findOne({ where: { email: email } });

        if (user) {
            // Update provider if they previously signed up locally
            if (user.provider === 'local') {
                user.provider = profile.provider;
                user.providerId = profile.id;
                await user.save();
            }
            return done(null, user);
        }

        // Create new user
        user = await User.create({
            name: profile.displayName || profile.username || 'User',
            email: email,
            provider: profile.provider,
            providerId: profile.id
        });

        done(null, user);
    } catch (error) {
        done(error, null);
    }
};

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    callbackURL: "/api/auth/google/callback"
}, verifyCallback));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'dummy',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'dummy',
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails']
}, verifyCallback));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'dummy',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy',
    callbackURL: "/api/auth/github/callback",
    scope: ['user:email']
}, verifyCallback));

module.exports = passport;

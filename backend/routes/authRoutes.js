const express = require('express');
const { register, login } = require('../controllers/authController');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Utility for sending JWT after OAuth
const generateTokenAndRedirect = (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET || 'super_secret_jwt_key_for_testing', { expiresIn: '1d' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Redirect to frontend with token in URL
    res.redirect(`${frontendUrl}?token=${token}`);
};

// Local Auth
router.post('/register', register);
router.post('/login', login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), generateTokenAndRedirect);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), generateTokenAndRedirect);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login' }), generateTokenAndRedirect);

module.exports = router;

const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super_secret_jwt_key_for_testing';

// Advanced Concept: Closures & Async Handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

exports.register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    
    let user = await User.findOne({ where: { email } });
    if (user) {
        return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = await User.create({ name, email, password });
    
    // Advanced Concept: JWT Auth
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.status(201).json({ success: true, token, user: { name: user.name, email: user.email }});
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ success: true, token, user: { name: user.name, email: user.email }});
});

const User = require('../models/User');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.updateTheme = asyncHandler(async (req, res) => {
    const { theme } = req.body;
    req.user.theme = theme;
    await req.user.save();
    res.status(200).json({ success: true, data: req.user.theme });
});

exports.getMe = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: { name: req.user.name, email: req.user.email, theme: req.user.theme } });
});

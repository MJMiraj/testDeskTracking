const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_testing');
        req.user = await User.findByPk(decoded.id);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};

module.exports = protect;

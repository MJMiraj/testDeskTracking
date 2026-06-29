const User = require('../models/User');
const TimeEntry = require('../models/TimeEntry');
const Screenshot = require('../models/Screenshot');
const { Op } = require('sequelize');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.getAllUsersStats = asyncHandler(async (req, res) => {
    // Only allow admins or the specific superadmin email
    if (req.user.role !== 'admin' && req.user.email !== 'mdmiraj.paperles@gmail.com') {
        return res.status(403).json({ success: false, message: 'Access denied: Admins only' });
    }

    let targetDate = new Date();
    if (req.query.date) {
        targetDate = new Date(req.query.date);
    }
    targetDate.setHours(0, 0, 0, 0);
    
    let tomorrow = new Date(targetDate);
    tomorrow.setDate(targetDate.getDate() + 1);

    const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'] });
    
    const stats = [];

    for (const u of users) {
        const screenshots = await Screenshot.findAll({
            where: {
                userId: u.id,
                createdAt: { [Op.gte]: targetDate, [Op.lt]: tomorrow }
            },
            order: [['createdAt', 'DESC']]
        });

        let isTrackingActive = false;
        if (screenshots.length > 0) {
            const lastSS = screenshots[0];
            const minsSinceLastSS = (new Date() - new Date(lastSS.createdAt)) / 60000;
            isTrackingActive = minsSinceLastSS < 3;
        }

        const totalMinutes = screenshots.length; // 1 screenshot per minute assumption

        stats.push({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isTrackingActive,
            totalMinutes,
            lastActive: screenshots.length > 0 ? screenshots[0].createdAt : null
        });
    }

    res.status(200).json({ success: true, data: stats });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
    // ONLY allow Miraj to update roles
    if (req.user.email !== 'mdmiraj.paperles@gmail.com') {
        return res.status(403).json({ success: false, message: 'Super admin access required to change roles.' });
    }

    const { role } = req.body;
    const userToUpdate = await User.findByPk(req.params.id);

    if (!userToUpdate) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    res.status(200).json({ success: true, message: 'Role updated successfully', data: userToUpdate });
});

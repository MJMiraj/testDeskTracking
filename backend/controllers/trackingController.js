const Screenshot = require('../models/Screenshot');
const path = require('path');
const { Op } = require('sequelize');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.uploadScreenshot = asyncHandler(async (req, res) => {
    const { timeEntryId, activeWindow, isIdle } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    // req.file.path contains the secure Cloudinary URL
    const imageUrl = req.file.path;

    const parsedIsIdle = isIdle === 'true' || isIdle === true;

    const screenshot = await Screenshot.create({
        userId: req.user.id,
        timeEntryId: timeEntryId && timeEntryId !== 'null' ? timeEntryId : null,
        imageUrl,
        activeWindow: activeWindow || 'Unknown',
        isIdle: parsedIsIdle
    });

    if (timeEntryId && timeEntryId !== 'null' && !parsedIsIdle) {
        const TimeEntry = require('../models/TimeEntry');
        const entry = await TimeEntry.findByPk(timeEntryId);
        if (entry) {
            entry.durationSeconds += 60;
            entry.endTime = new Date();
            await entry.save();
        }
    }

    // Emit live update to all connected dashboard clients
    const io = req.app.get('io');
    if (io) {
        io.emit('dashboard_update', { message: 'New activity tracked', userId: req.user.id });
    }

    res.status(201).json({ success: true, data: screenshot });
});

exports.getScreenshots = asyncHandler(async (req, res) => {
    // Advanced: Find all screenshots for today
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const screenshots = await Screenshot.findAll({
        where: {
            userId: req.user.id,
            createdAt: { [Op.gte]: today }
        },
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, count: screenshots.length, data: screenshots });
});

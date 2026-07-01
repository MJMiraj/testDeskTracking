const Screenshot = require('../models/Screenshot');
const path = require('path');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

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
    // Determine the user's timezone from their settings, fallback to UTC
    const userTimezone = req.user.settings?.timezone || 'UTC';
    
    // Get exact start and end of the day in the user's local timezone
    const startOfDay = moment.tz(userTimezone).startOf('day').toDate();
    const endOfDay = moment.tz(userTimezone).endOf('day').toDate();
    
    const screenshots = await Screenshot.findAll({
        where: {
            userId: req.user.id,
            createdAt: { 
                [Op.gte]: startOfDay,
                [Op.lte]: endOfDay
            }
        },
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, count: screenshots.length, data: screenshots });
});

// Helper for dynamic DeskTime categorization based on user profile settings
const categorizeAppDynamic = (windowTitle, userSettings) => {
    if (!windowTitle) return 'Neutral';
    const title = windowTitle.toLowerCase();
    
    const appCategories = userSettings?.appCategories || {};
    
    // Check if any of the user's configured app names are in the window title
    for (const [keyword, category] of Object.entries(appCategories)) {
        if (title.includes(keyword.toLowerCase())) {
            // Capitalize to match expected 'Productive', 'Neutral', 'Unproductive' values
            return category.charAt(0).toUpperCase() + category.slice(1);
        }
    }
    
    return 'Neutral';
};

exports.getActivities = asyncHandler(async (req, res) => {
    const userTimezone = req.user.settings?.timezone || 'UTC';
    const startOfDay = moment.tz(userTimezone).startOf('day').toDate();
    const endOfDay = moment.tz(userTimezone).endOf('day').toDate();
    
    const screenshots = await Screenshot.findAll({
        where: {
            userId: req.user.id,
            createdAt: { 
                [Op.gte]: startOfDay,
                [Op.lte]: endOfDay 
            },
            isIdle: false
        },
        attributes: ['activeWindow']
    });

    // Aggregate by activeWindow
    const appMap = {};
    let totalMinutes = 0;
    
    screenshots.forEach(ss => {
        const title = ss.activeWindow || 'Unknown';
        // Simplify title (e.g. "Google Chrome - YouTube" -> "YouTube")
        const parts = title.split(' - ');
        const simpleName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        
        if (!appMap[simpleName]) {
            appMap[simpleName] = { 
                name: simpleName, 
                minutes: 0, 
                category: categorizeAppDynamic(simpleName, req.user.settings) 
            };
        }
        // Since we take a screenshot approx every 1 minute, we assume 1 record = 1 min
        appMap[simpleName].minutes += 1; 
        totalMinutes += 1;
    });

    const data = Object.values(appMap).sort((a, b) => b.minutes - a.minutes);
    
    res.status(200).json({ 
        success: true, 
        totalMinutes,
        data 
    });
});

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
    if (!windowTitle) return { category: 'Neutral', matchedApp: null };
    
    // Remove common browser suffixes so a rule like "chrome" doesn't override specific websites
    let title = windowTitle.toLowerCase();
    title = title.replace(/\s*-\s*(google chrome|mozilla firefox|microsoft edge|safari|opera|brave)$/i, '');
    
    const appCategories = userSettings?.appCategories || {};
    
    // Sort categories by keyword length descending to prioritize more specific matches
    const sortedCategories = Object.entries(appCategories).sort((a, b) => b[0].length - a[0].length);
    
    // Check if any of the user's configured app names are in the window title
    for (const [keyword, category] of sortedCategories) {
        // Strip common domains and extensions for better fuzzy matching against window titles
        const cleanKeyword = keyword.toLowerCase().trim().replace(/\.(com|org|net|io|co|us|tv|app|exe)$/, '');
        
        if (!cleanKeyword) continue; // Prevent empty keywords from matching everything
        
        if (title.includes(cleanKeyword)) {
            // Capitalize to match expected 'Productive', 'Neutral', 'Unproductive' values
            return { 
                category: category.charAt(0).toUpperCase() + category.slice(1), 
                matchedApp: keyword 
            };
        }
    }
    
    return { category: 'Neutral', matchedApp: null };
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
        // Get the category and matched keyword by checking the FULL window title
        const { category, matchedApp } = categorizeAppDynamic(title, req.user.settings);
        
        // If it matches a specific configured app (e.g. "youtube.com"), group by that app name.
        // Otherwise, fallback to the last part of the window title (usually the browser or base app name).
        let displayName = matchedApp;
        if (!displayName) {
            const parts = title.split(' - ');
            displayName = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
        }
        
        if (!appMap[displayName]) {
            appMap[displayName] = { 
                name: displayName, 
                minutes: 0, 
                category: category 
            };
        }
        // Since we take a screenshot approx every 1 minute, we assume 1 record = 1 min
        appMap[displayName].minutes += 1; 
        totalMinutes += 1;
    });

    const data = Object.values(appMap).sort((a, b) => b.minutes - a.minutes);
    
    res.status(200).json({ 
        success: true, 
        totalMinutes,
        data 
    });
});

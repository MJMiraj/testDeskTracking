const TimeEntry = require('../models/TimeEntry');
const { Op } = require('sequelize');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.getEntries = asyncHandler(async (req, res) => {
    const entries = await TimeEntry.findAll({ 
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, count: entries.length, data: entries });
});

exports.getSummary = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const entries = await TimeEntry.findAll({ 
        where: { userId: req.user.id }
    });

    const Screenshot = require('../models/Screenshot');
    const screenshots = await Screenshot.findAll({
        where: { userId: req.user.id, createdAt: { [Op.gte]: today } },
        order: [['createdAt', 'DESC']]
    });

    let isTrackingActive = false;
    if (screenshots.length > 0) {
        const lastSS = screenshots[0];
        const minsSinceLastSS = (new Date() - new Date(lastSS.createdAt)) / 60000;
        isTrackingActive = minsSinceLastSS < 3;
    }

    const appMap = {};
    let productiveCount = 0;
    const totalCount = screenshots.length;

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        time: `${i.toString().padStart(2, '0')}:00`,
        idle: 0,
        productive: 0,
        unproductive: 0
    }));

    screenshots.forEach(ss => {
        let appName = (ss.activeWindow || 'Unknown').split(' - ').pop();
        if (appName.length > 20) appName = appName.substring(0, 20) + '...';
        
        if (!appMap[appName]) appMap[appName] = 0;
        appMap[appName]++;

        const lowerApp = appName.toLowerCase();
        // Assuming development/work tools as productive
        const isProd = lowerApp.includes('code') || lowerApp.includes('chrome') || lowerApp.includes('firefox') || lowerApp.includes('github') || lowerApp.includes('terminal') || lowerApp.includes('laragon');
        
        if (isProd && !ss.isIdle) {
            productiveCount++;
        }

        const hourIndex = new Date(ss.createdAt).getHours();
        if (ss.isIdle) {
            hourlyData[hourIndex].idle += 1;
        } else if (isProd) {
            hourlyData[hourIndex].productive += 1;
        } else {
            hourlyData[hourIndex].unproductive += 1;
        }
    });

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    hourlyData.forEach((h, index) => {
        const total = h.idle + h.productive + h.unproductive;
        
        let maxAllowed = 60;
        if (index > currentHour) {
            maxAllowed = 0;
        } else if (index === currentHour) {
            maxAllowed = currentMinute;
        }

        if (index === 13) {
            console.log(`[DEBUG] Hour 13 -> currentHour: ${currentHour}, currentMinute: ${currentMinute}, total: ${total}, maxAllowed: ${maxAllowed}`);
        }

        if (total > maxAllowed) {
            if (maxAllowed === 0) {
                h.idle = 0;
                h.productive = 0;
                h.unproductive = 0;
            } else {
                const scale = maxAllowed / total;
                h.idle = Math.round(h.idle * scale);
                h.productive = Math.round(h.productive * scale);
                h.unproductive = Math.round(h.unproductive * scale);
                
                const newTotal = h.idle + h.productive + h.unproductive;
                if (newTotal !== maxAllowed) {
                    const diff = maxAllowed - newTotal;
                    if (h.unproductive >= h.idle && h.unproductive >= h.productive) {
                        h.unproductive += diff;
                    } else if (h.idle >= h.productive) {
                        h.idle += diff;
                    } else {
                        h.productive += diff;
                    }
                }
            }
        }
    });

    const topApps = Object.keys(appMap)
        .map(k => ({ name: k, value: appMap[k] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const productivityScore = totalCount > 0 ? Math.round((productiveCount / totalCount) * 100) : 0;

    let todaySeconds = 0;
    let weekSeconds = 0;
    const dailyMap = {};

    entries.forEach(entry => {
        const entryDate = new Date(entry.startTime);
        
        if (entryDate >= today) todaySeconds += entry.durationSeconds;
        if (entryDate >= weekStart) weekSeconds += entry.durationSeconds;

        const dateString = entryDate.toISOString().split('T')[0];
        if (!dailyMap[dateString]) dailyMap[dateString] = 0;
        dailyMap[dateString] += entry.durationSeconds;
    });

    const dailyData = Object.keys(dailyMap).sort().slice(-7).map(k => ({
        date: k.split('-').slice(1).join('/'),
        hours: parseFloat((dailyMap[k] / 3600).toFixed(2))
    }));

    res.status(200).json({ 
        success: true, 
        data: { todaySeconds, weekSeconds, dailyData, hourlyData, isTrackingActive, topApps, productivityScore }
    });
});

exports.autoStartSession = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let entry = await TimeEntry.findOne({
        where: {
            userId: req.user.id,
            taskName: 'Daily Session',
            createdAt: { [Op.gte]: today }
        }
    });

    if (!entry) {
        entry = await TimeEntry.create({
            taskName: 'Daily Session',
            projectName: 'General Work',
            startTime: new Date(),
            userId: req.user.id,
            durationSeconds: 0
        });
    }

    res.status(200).json({ success: true, data: entry });
});

exports.startTimer = asyncHandler(async (req, res) => {
    const { taskName, projectName } = req.body;
    const entry = await TimeEntry.create({
        taskName,
        projectName: projectName || 'General',
        startTime: new Date(),
        userId: req.user.id
    });
    res.status(201).json({ success: true, data: entry });
});

exports.stopTimer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const entry = await TimeEntry.findOne({ where: { id, userId: req.user.id } });
    
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (entry.endTime) return res.status(400).json({ success: false, message: 'Timer already stopped' });

    entry.endTime = new Date();
    entry.durationSeconds = Math.floor((entry.endTime - entry.startTime) / 1000);
    await entry.save();

    res.status(200).json({ success: true, data: entry });
});

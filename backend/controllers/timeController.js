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
    let now = new Date();
    if (req.query.date) {
        now = new Date(req.query.date);
    }
    
    const serverOffset = now.getTimezoneOffset();
    const userOffset = req.query.tzOffset ? parseInt(req.query.tzOffset) : serverOffset;
    
    // Calculate user's midnight in absolute time
    let userLocalTime = new Date(now.getTime() + (serverOffset - userOffset) * 60000);
    userLocalTime.setHours(0, 0, 0, 0);
    let today = new Date(userLocalTime.getTime() - (serverOffset - userOffset) * 60000);
    
    let tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const entries = await TimeEntry.findAll({ 
        where: { userId: req.user.id }
    });

    const Screenshot = require('../models/Screenshot');
    const screenshots = await Screenshot.findAll({
        where: { 
            userId: req.user.id, 
            createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } 
        },
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

    const timelineData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        minutes: Array(60).fill('empty')
    }));

    screenshots.forEach(ss => {
        let appName = (ss.activeWindow || 'Unknown').split(' - ').pop();
        if (appName.length > 20) appName = appName.substring(0, 20) + '...';
        
        if (!appMap[appName]) appMap[appName] = 0;
        appMap[appName]++;

        const lowerApp = appName.toLowerCase();
        
        let forcedStatus = null;
        if (lowerApp.startsWith('[productive] ')) {
            forcedStatus = 'productive';
            appName = appName.substring(13);
        } else if (lowerApp.startsWith('[unproductive] ')) {
            forcedStatus = 'unproductive';
            appName = appName.substring(15);
        } else if (lowerApp.startsWith('[neutral] ')) {
            forcedStatus = 'neutral';
            appName = appName.substring(10);
        }

        let isProd = false;
        if (forcedStatus === 'productive') {
            isProd = true;
        } else if (forcedStatus === 'unproductive' || forcedStatus === 'neutral') {
            isProd = false;
        } else if (req.user.settings && req.user.settings.appCategories) {
            // Find if any key in appCategories is a substring of the app name
            isProd = Object.entries(req.user.settings.appCategories).some(([key, val]) => {
                return val === 'productive' && lowerApp.includes(key.toLowerCase());
            });
        } else {
            isProd = lowerApp.includes('code') || lowerApp.includes('phpstorm') || lowerApp.includes('storm') || lowerApp.includes('chrome') || lowerApp.includes('firefox') || lowerApp.includes('github') || lowerApp.includes('terminal') || lowerApp.includes('laragon');
        }
        
        if (isProd && !ss.isIdle) {
            productiveCount++;
        }

        const ssDate = new Date(ss.createdAt);
        const userDate = new Date(ssDate.getTime() + (serverOffset - userOffset) * 60000);
        const hourIndex = userDate.getHours();
        const minuteIndex = userDate.getMinutes();

        let status = 'unproductive';
        if (forcedStatus === 'neutral') {
            status = 'idle';
        } else if (ss.isIdle) {
            status = 'idle';
        } else if (isProd) {
            status = 'productive';
        }

        // Assign status to the exact minute slot
        timelineData[hourIndex].minutes[minuteIndex] = {
            status,
            app: appName
        };

        if (ss.isIdle) {
            hourlyData[hourIndex].idle += 1;
        } else if (isProd) {
            hourlyData[hourIndex].productive += 1;
        } else {
            hourlyData[hourIndex].unproductive += 1;
        }
    });

    const nowForData = new Date();
    const userNowData = new Date(nowForData.getTime() + (serverOffset - userOffset) * 60000);
    const currentHour = userNowData.getHours();
    const currentMinute = userNowData.getMinutes();

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

        const userEntryDate = new Date(entryDate.getTime() + (serverOffset - userOffset) * 60000);
        const dateString = userEntryDate.toISOString().split('T')[0];
        
        if (!dailyMap[dateString]) dailyMap[dateString] = 0;
        dailyMap[dateString] += entry.durationSeconds;
    });

    const dailyData = Object.keys(dailyMap).sort().slice(-7).map(k => ({
        date: k.split('-').slice(1).join('/'),
        hours: parseFloat((dailyMap[k] / 3600).toFixed(2))
    }));

    res.status(200).json({ 
        success: true, 
        data: { todaySeconds, weekSeconds, dailyData, hourlyData, timelineData, isTrackingActive, topApps, productivityScore }
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

exports.addManualTime = asyncHandler(async (req, res) => {
    const { date, startHour, startMinute, endHour, endMinute, reason, status } = req.body;
    if (startHour === undefined || startMinute === undefined || endHour === undefined || endMinute === undefined || !reason) {
        return res.status(400).json({ success: false, message: 'Please provide start time, end time, and reason' });
    }

    const Screenshot = require('../models/Screenshot');
    
    // Construct exact start and end timestamps
    const baseDate = new Date(date || new Date());
    const start = new Date(baseDate);
    start.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const end = new Date(baseDate);
    end.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    if (end < start) {
        return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    const statusTag = status === 'productive' ? '[Productive]' : status === 'neutral' ? '[Neutral]' : '[Unproductive]';
    const manualLabel = `${statusTag} Offline: ${reason}`;
    
    // Calculate total minutes to insert
    const totalMinutes = Math.floor((end - start) / 60000) + 1; // inclusive of end minute
    const endPlusOneMinute = new Date(start.getTime() + (totalMinutes * 60000));

    // 1. Fetch all existing screenshots in this time range to minimize queries
    const existingScreenshots = await Screenshot.findAll({
        where: {
            userId: req.user.id,
            createdAt: {
                [Op.gte]: start,
                [Op.lt]: endPlusOneMinute
            }
        }
    });

    // 2. Map existing by the exact minute they fall into
    const existingByMinute = {};
    existingScreenshots.forEach(ss => {
        const minKey = new Date(ss.createdAt).setSeconds(0, 0);
        // Only keep one screenshot per minute slot
        if (!existingByMinute[minKey]) {
            existingByMinute[minKey] = ss;
        }
    });

    const toInsert = [];
    const updateIds = [];

    // 3. Determine which minutes need an insert vs an update
    for (let i = 0; i < totalMinutes; i++) {
        let currentMin = new Date(start.getTime() + (i * 60000));
        let minKey = currentMin.setSeconds(0, 0);
        
        if (existingByMinute[minKey]) {
            updateIds.push(existingByMinute[minKey].id);
        } else {
            toInsert.push({
                userId: req.user.id,
                activeWindow: manualLabel,
                isIdle: false,
                imageUrl: 'manual',
                createdAt: currentMin
            });
        }
    }

    // 4. Perform bulk operations
    if (toInsert.length > 0) {
        await Screenshot.bulkCreate(toInsert);
    }

    if (updateIds.length > 0) {
        await Screenshot.update({
            activeWindow: manualLabel,
            isIdle: false
        }, {
            where: {
                id: {
                    [Op.in]: updateIds
                }
            }
        });
    }

    res.status(200).json({ success: true, message: 'Manual time logged successfully' });
});

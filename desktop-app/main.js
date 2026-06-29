const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const screenshot = require('screenshot-desktop');
const activeWin = require('./getActiveWindow');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

let mainWindow;
let trackingInterval;
let currentToken = null;
let currentTimeEntryId = null;
let userIdleTimeout = 60;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "DeskTime Pro Native App",
        icon: path.join(__dirname, 'build', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // We load the React dev server. In production, this would load the build files.
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'frontend-dist', 'index.html'));
    } else {
        mainWindow.loadURL('http://localhost:5173');
    }
}

app.whenReady().then(createWindow);

ipcMain.on('start-tracking', async (event, { token, timeEntryId }) => {
    currentToken = token;
    currentTimeEntryId = timeEntryId;
    
    // Fetch user settings
    try {
        const res = await axios.get('https://testdesktracking.onrender.com/api/user/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.data && res.data.data.settings && res.data.data.settings.idleTimeout) {
            userIdleTimeout = parseInt(res.data.data.settings.idleTimeout, 10);
            console.log(`Loaded idle timeout: ${userIdleTimeout} seconds`);
        }
    } catch (e) {
        console.error('Failed to fetch user settings for idle timeout', e.message);
    }

    console.log(`Started Tracking for Entry ID: ${timeEntryId}`);
    captureAndUpload(); // Initial capture

    // Set interval to 1 minute (60000 ms) for production/testing
    trackingInterval = setInterval(captureAndUpload, 60000);
});

ipcMain.on('stop-tracking', () => {
    console.log('Stopped Tracking');
    if (trackingInterval) clearInterval(trackingInterval);
    currentToken = null;
    currentTimeEntryId = null;
});

async function captureAndUpload() {
    if (!currentToken || !currentTimeEntryId) return;

    try {
        // 1. Check Idle Time based on user settings
        const idleTime = powerMonitor.getSystemIdleTime();
        const isIdle = idleTime > userIdleTimeout;

        // 2. Track Active Window
        const activeWindow = await activeWin();

        console.log(`Capturing... Window: ${activeWindow} | Idle: ${isIdle}`);

        // 3. Capture Screenshot natively (No browser popups!)
        const imgPath = path.join(app.getPath('temp'), `ss_${Date.now()}.png`);
        await screenshot({ filename: imgPath });

        // 4. Upload to Backend API
        const form = new FormData();
        form.append('screenshot', fs.createReadStream(imgPath));
        form.append('timeEntryId', currentTimeEntryId.toString());
        form.append('activeWindow', activeWindow);
        form.append('isIdle', isIdle.toString());

        await axios.post('https://testdesktracking.onrender.com/api/tracking/upload', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${currentToken}`
            }
        });

        // 5. Cleanup local image file
        fs.unlinkSync(imgPath);
        console.log('Upload successful!');

    } catch (error) {
        console.error('Capture/Upload Error:', error.message);
        const { dialog } = require('electron');
        dialog.showErrorBox('Capture/Upload Error', error.message + '\n' + (error.stack || ''));
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

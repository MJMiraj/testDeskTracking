const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const ws = require('windows-shortcuts');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        frame: false,
        transparent: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'icon.ico')
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-install', async (event, config = {}) => {
    try {
        const localAppData = process.env.LOCALAPPDATA;
        const installDir = path.join(localAppData, 'DeskTimePro');

        // Path to the bundled app.zip
        let zipPath = path.join(process.resourcesPath, 'app.zip');
        if (!fs.existsSync(zipPath)) {
            // For development
            zipPath = path.join(__dirname, 'app.zip');
        }

        if (!fs.existsSync(zipPath)) {
            event.reply('install-error', 'Installation package not found.');
            return;
        }

        // Send progress updates
        event.reply('install-progress', 'Extracting files...');

        // Clean existing dir if any
        if (fs.existsSync(installDir)) {
            fs.rmSync(installDir, { recursive: true, force: true });
        }
        fs.mkdirSync(installDir, { recursive: true });

        // Extract
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(installDir, true);

        event.reply('install-progress', 'Creating shortcuts...');

        const exePath = path.join(installDir, 'DeskTime Pro.exe'); // Ensure this matches your exe name!
        
        // Create Desktop Shortcut
        if (config.desktopShortcut !== false) {
            const desktopPath = path.join(process.env.USERPROFILE, 'Desktop', 'DeskTime Pro.lnk');
            ws.create(desktopPath, {
                target: exePath,
                desc: "DeskTime Pro Native Tracking App"
            }, (err) => {
                if (err) console.error(err);
            });
        }

        // Create Start Menu Shortcut
        if (config.startMenuShortcut !== false) {
            const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'DeskTime Pro.lnk');
            ws.create(startMenuPath, {
                target: exePath,
                desc: "DeskTime Pro Native Tracking App"
            }, (err) => {
                if (err) console.error(err);
            });
        }

        event.reply('install-progress', 'Finishing setup...');
        
        setTimeout(() => {
            // Launch the app
            event.reply('install-progress', 'Launching DeskTime Pro...');
            
            setTimeout(() => {
                const child = spawn(exePath, [], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                
                app.quit();
            }, 1500);

        }, 1500);

    } catch (error) {
        event.reply('install-error', error.message);
    }
});

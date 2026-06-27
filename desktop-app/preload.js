const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startTracking: (data) => ipcRenderer.send('start-tracking', data),
    stopTracking: () => ipcRenderer.send('stop-tracking')
});

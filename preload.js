const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Download control
    cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
    openNewWindow: (url) => ipcRenderer.send('open-new-window', url),
    showItemInFolder: (path) => ipcRenderer.send('show-item-in-folder', path),
    openPath: (path) => ipcRenderer.send('open-path', path),

    // Download event listeners (auto-captured from browser/iframes)
    onDownloadStarted: (callback) => {
        ipcRenderer.on('download-started', (event, data) => callback(data));
    },
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, data) => callback(data));
    },
    onDownloadComplete: (callback) => {
        ipcRenderer.on('download-complete', (event, data) => callback(data));
    },
    onDownloadError: (callback) => {
        ipcRenderer.on('download-error', (event, data) => callback(data));
    }
});

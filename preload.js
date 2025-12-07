const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Download control
    cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
    openNewWindow: (url) => ipcRenderer.send('open-new-window', url),
    showItemInFolder: (path) => ipcRenderer.send('show-item-in-folder', path),
    openPath: (path) => ipcRenderer.send('open-path', path),
    extractFile: (filePath, destPath) => ipcRenderer.invoke('extract-file', { filePath, destPath }),

    // Storage Management
    selectDownloadDirectory: () => ipcRenderer.invoke('select-download-directory'),
    getDiskSpace: (path) => ipcRenderer.invoke('get-disk-space', path),
    setDownloadDirectory: (path) => ipcRenderer.invoke('set-download-directory', path),
    getDownloadDirectory: () => ipcRenderer.invoke('get-download-directory'),

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
    },

    // Game Launching
    scanGameExecutables: (directory) => ipcRenderer.invoke('scan-game-executables', directory),
    launchGame: (options) => ipcRenderer.invoke('launch-game', options),
    getGameConfig: (gameId) => ipcRenderer.invoke('get-game-config', gameId),
    saveGameConfig: (data) => ipcRenderer.invoke('save-game-config', data),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
});

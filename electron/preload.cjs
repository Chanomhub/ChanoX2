const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Download control
    cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
    showItemInFolder: (path) => ipcRenderer.send('show-item-in-folder', path),
    openPath: (path) => ipcRenderer.send('open-path', path),
    openExternal: (url) => ipcRenderer.send('open-external', url),
    openNewWindow: (url) => ipcRenderer.send('open-new-window', url),
    extractFile: (filePath, destPath) => ipcRenderer.invoke('extract-file', { filePath, destPath }),

    // Storage Management
    selectDownloadDirectory: () => ipcRenderer.invoke('select-download-directory'),
    getDiskSpace: (path) => ipcRenderer.invoke('get-disk-space', path),
    setDownloadDirectory: (path) => ipcRenderer.invoke('set-download-directory', path),
    getDownloadDirectory: () => ipcRenderer.invoke('get-download-directory'),

    // Download event listeners - returns cleanup function to prevent duplicate listeners
    onDownloadStarted: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('download-started');
        ipcRenderer.on('download-started', handler);
        return () => ipcRenderer.removeListener('download-started', handler);
    },
    onDownloadProgress: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.on('download-progress', handler);
        return () => ipcRenderer.removeListener('download-progress', handler);
    },
    onDownloadComplete: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('download-complete');
        ipcRenderer.on('download-complete', handler);
        return () => ipcRenderer.removeListener('download-complete', handler);
    },
    onDownloadError: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('download-error');
        ipcRenderer.on('download-error', handler);
        return () => ipcRenderer.removeListener('download-error', handler);
    },

    // Game Launching
    scanGameExecutables: (directory) => ipcRenderer.invoke('scan-game-executables', directory),
    launchGame: (options) => ipcRenderer.invoke('launch-game', options),
    getGameConfig: (gameId) => ipcRenderer.invoke('get-game-config', gameId),
    saveGameConfig: (data) => ipcRenderer.invoke('save-game-config', data),

    // Global Settings
    getGlobalSettings: () => ipcRenderer.invoke('get-global-settings'),
    saveGlobalSettings: (settings) => ipcRenderer.invoke('save-global-settings', settings),

    // Downloads Persistence
    getDownloads: () => ipcRenderer.invoke('get-downloads'),
    saveDownloads: (downloads) => ipcRenderer.invoke('save-downloads', downloads),

    // Library Persistence
    getLibrary: () => ipcRenderer.invoke('get-library'),
    saveLibrary: (library) => ipcRenderer.invoke('save-library', library),

    // File Management
    moveArchiveToStorage: (sourcePath, filename) => ipcRenderer.invoke('move-archive-to-storage', { sourcePath, filename }),
    deleteArchive: (archivePath) => ipcRenderer.invoke('delete-archive', archivePath),
    deleteGameFolder: (folderPath) => ipcRenderer.invoke('delete-game-folder', folderPath),
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

    // Auth Persistence
    getAuthData: (key) => ipcRenderer.invoke('get-auth-data', key),
    saveAuthData: (key, value) => ipcRenderer.invoke('save-auth-data', { key, value }),
    removeAuthData: (key) => ipcRenderer.invoke('remove-auth-data', key),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // OAuth callback listener
    onOAuthCallback: (callback) => {
        ipcRenderer.on('oauth-callback', (event, data) => callback(data));
    },

    // OAuth server control
    startOAuthServer: () => ipcRenderer.invoke('start-oauth-server'),
    stopOAuthServer: () => ipcRenderer.invoke('stop-oauth-server'),
});

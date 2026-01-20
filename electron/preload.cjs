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
    selectGameFolder: () => ipcRenderer.invoke('select-game-folder'),
    selectGameArchive: () => ipcRenderer.invoke('select-game-archive'),

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
    stopGame: (gameId) => ipcRenderer.invoke('stop-game', gameId),
    isGameRunning: (gameId) => ipcRenderer.invoke('is-game-running', gameId),
    getGameConfig: (gameId) => ipcRenderer.invoke('get-game-config', gameId),
    saveGameConfig: (data) => ipcRenderer.invoke('save-game-config', data),

    // Game event listeners
    onGameStarted: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('game-started');
        ipcRenderer.on('game-started', handler);
        return () => ipcRenderer.removeListener('game-started', handler);
    },
    onGameStopped: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('game-stopped');
        ipcRenderer.on('game-stopped', handler);
        return () => ipcRenderer.removeListener('game-stopped', handler);
    },

    // Global Settings
    getGlobalSettings: () => ipcRenderer.invoke('get-global-settings'),
    saveGlobalSettings: (settings) => ipcRenderer.invoke('save-global-settings', settings),

    // Bottles CLI
    listBottles: () => ipcRenderer.invoke('list-bottles'),

    // Downloads Persistence
    getDownloads: () => ipcRenderer.invoke('get-downloads'),
    saveDownloads: (downloads) => ipcRenderer.invoke('save-downloads', downloads),

    // Library Persistence
    getLibrary: () => ipcRenderer.invoke('get-library'),
    saveLibrary: (library) => ipcRenderer.invoke('save-library', library),
    downloadCoverImage: (gameId, coverImageUrl) => ipcRenderer.invoke('download-cover-image', { gameId, coverImageUrl }),

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

    // OAuth callback listener - returns cleanup function to prevent duplicate listeners
    onOAuthCallback: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('oauth-callback');
        ipcRenderer.on('oauth-callback', handler);
        return () => ipcRenderer.removeListener('oauth-callback', handler);
    },

    // OAuth server control
    startOAuthServer: () => ipcRenderer.invoke('start-oauth-server'),
    stopOAuthServer: () => ipcRenderer.invoke('stop-oauth-server'),

    // Game Shortcuts
    createGameShortcut: (gameId, title, iconPath) =>
        ipcRenderer.invoke('create-game-shortcut', { gameId, title, iconPath }),
    deleteGameShortcut: (gameId, title) =>
        ipcRenderer.invoke('delete-game-shortcut', { gameId, title }),
    hasGameShortcut: (gameId, title) =>
        ipcRenderer.invoke('has-game-shortcut', { gameId, title }),

    // Pending game launch listener (from shortcuts/second instance)
    onPendingGameLaunch: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('pending-game-launch');
        ipcRenderer.on('pending-game-launch', handler);
        return () => ipcRenderer.removeListener('pending-game-launch', handler);
    },

    // Winetricks
    checkWinetricksInstalled: () => ipcRenderer.invoke('check-winetricks-installed'),
    getWinetricksPackages: () => ipcRenderer.invoke('get-winetricks-packages'),
    installWinetricksPackage: (packageId, winePrefix) =>
        ipcRenderer.invoke('install-winetricks-package', { packageId, winePrefix }),
    cancelWinetricksInstall: () => ipcRenderer.invoke('cancel-winetricks-install'),
    onWinetricksProgress: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.removeAllListeners('winetricks-progress');
        ipcRenderer.on('winetricks-progress', handler);
        return () => ipcRenderer.removeListener('winetricks-progress', handler);
    },

    // NST CLI Integration
    openNstCli: (projectPath, engine) =>
        ipcRenderer.invoke('open-nst-cli', { projectPath, engine }),
});

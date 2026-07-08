const { app, BrowserWindow, ipcMain, dialog, session, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// Load .env manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    console.log('📝 [Main] Loading .env file...');
    try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split(/\r?\n/).forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const k = key.trim();
                const v = valueParts.join('=').trim();
                if (k && !k.startsWith('#')) {
                    process.env[k] = v;
                }
            }
        });
    } catch (err) {
        console.error('❌ [Main] Error loading .env:', err);
    }
}

const platformHandler = require('./platforms/index.cjs');
const GameCompatibility = require('./services/GameCompatibility.cjs');
const ExtractorService = require('./services/ExtractorService.cjs');
const ParallelDownloader = require('./services/ParallelDownloader.cjs');
const DiscordService = require('./services/DiscordService.cjs');

// Set app name to ensure userData path is correct
app.name = 'ChanoX2';

// Register as default protocol client for chanox2://
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('chanox2', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('chanox2');
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('🔥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('🔥 Unhandled Rejection:', reason);
});

// Constants
const HOME_DIR = app.getPath('home');
const DEFAULT_DIR = path.join(HOME_DIR, 'ChanoX2Library');
const USER_DATA_DIR = app.getPath('userData');

// Optimization: Disable site isolation to reduce memory usage
// This allows the renderer process to be shared/consolidated where possible.
app.commandLine.appendSwitch('disable-site-isolation-trials');

// File paths
const GAME_CONFIG_FILE = path.join(USER_DATA_DIR, 'games-config.json');
const SETTINGS_FILE = path.join(USER_DATA_DIR, 'settings.json');
const DOWNLOADS_FILE = path.join(USER_DATA_DIR, 'downloads.json');
const LIBRARY_FILE = path.join(USER_DATA_DIR, 'library.json');
const AUTH_FILE = path.join(USER_DATA_DIR, 'auth.json');
const ARCHIVES_DIR = path.join(DEFAULT_DIR, 'archives');

// State
let mainWindow = null;
const activeDownloads = new Map();
const runningGames = new Map(); // Track running game processes: gameId -> { subprocess, startTime }
let downloadId = Date.now();
let downloadDirectory = DEFAULT_DIR;
let oauthServer = null;
const OAUTH_CALLBACK_PORT = 9876;
let parallelDownloader = null;

// Parse command line arguments for game launch
function parseLaunchGameArg(args) {
    const launchArg = args.find(arg => arg.startsWith('--launch-game='));
    return launchArg ? launchArg.split('=')[1] : null;
}

// Parse command line arguments for protocol URL
function parseProtocolUrl(args) {
    console.log('🔍 [Main] Parsing command line args:', args);
    // Find any argument that contains chanox2://
    const protocolArg = args.find(arg => arg.includes('chanox2://'));
    if (protocolArg) {
        // Extract the actual URL (in case it's part of a larger string)
        const match = protocolArg.match(/chanox2:\/\/[^\s"]+/);
        return match ? match[0] : protocolArg;
    }
    return null;
}

let pendingGameLaunch = parseLaunchGameArg(process.argv.slice(1));
let pendingDeepLink = parseProtocolUrl(process.argv.slice(1));

// macOS: Handle deep links when app is already running
app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deep-link', { url });
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    } else {
        pendingDeepLink = url;
    }
});

// Shortcut paths
// Shortcut paths
function getShortcutPath(gameId, title) {
    return platformHandler.getShortcutPath(app, title);
}

// Get app icon path
function getAppIconPath() {
    // In development
    const devIcon = path.join(__dirname, '../public/icon.png');
    if (fs.existsSync(devIcon)) return devIcon;

    // In production (resources folder)
    const prodIcon = path.join(process.resourcesPath, 'icon.png');
    if (fs.existsSync(prodIcon)) return prodIcon;

    // Fallback to installed icon location on Linux
    const linuxIcon = '/usr/share/icons/hicolor/256x256/apps/chanox2.png';
    if (fs.existsSync(linuxIcon)) return linuxIcon;

    return 'application-x-executable'; // System fallback
}

// Download and cache icon for game shortcuts
async function downloadGameIcon(gameId, coverImageUrl) {
    if (!coverImageUrl || !coverImageUrl.startsWith('http')) {
        return null;
    }

    try {
        const iconsDir = path.join(USER_DATA_DIR, 'game-icons');
        if (!fs.existsSync(iconsDir)) {
            fs.mkdirSync(iconsDir, { recursive: true });
        }

        const iconPath = path.join(iconsDir, `${gameId}.png`);

        // Skip if already cached
        if (fs.existsSync(iconPath)) {
            return iconPath;
        }

        // Download the image
        const response = await fetch(coverImageUrl);
        if (!response.ok) throw new Error('Failed to download icon');

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(iconPath, buffer);

        console.log('✅ Downloaded game icon:', iconPath);
        return iconPath;
    } catch (err) {
        console.error('⚠️ Failed to download icon:', err.message);
        return null;
    }
}

// Download and cache cover image for library (offline support)
async function downloadCoverImage(gameId, coverImageUrl) {
    if (!coverImageUrl || !coverImageUrl.startsWith('http')) {
        return null;
    }

    try {
        const coversDir = path.join(USER_DATA_DIR, 'game-covers');
        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true });
        }

        // Get file extension from URL or default to jpg
        const urlPath = new URL(coverImageUrl).pathname;
        const ext = path.extname(urlPath) || '.jpg';
        const coverPath = path.join(coversDir, `${gameId}${ext}`);

        // Skip if already cached
        if (fs.existsSync(coverPath)) {
            console.log('📦 Cover already cached:', coverPath);
            return coverPath;
        }

        // Download the image
        const response = await fetch(coverImageUrl);
        if (!response.ok) throw new Error('Failed to download cover');

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(coverPath, buffer);

        console.log('✅ Downloaded cover image:', coverPath);
        return coverPath;
    } catch (err) {
        console.error('⚠️ Failed to download cover:', err.message);
        return null;
    }
}

// Extraction is now handled by ExtractorService using native OS tools

// Ensure default directory exists
try {
    if (!fs.existsSync(DEFAULT_DIR)) {
        fs.mkdirSync(DEFAULT_DIR, { recursive: true });
    }
    // Create archives subfolder
    if (!fs.existsSync(ARCHIVES_DIR)) {
        fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
    }
} catch (err) {
    console.error('Failed to create default library directory:', err);
}

// ============= Helper Functions =============

function loadJsonFile(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (e) {
        console.error(`Failed to load ${filePath}:`, e);
    }
    return defaultValue;
}

function saveJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Failed to save ${filePath}:`, e);
        return false;
    }
}

function compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

// ============= Window Creation =============

function createWindow() {
    // Fix Cloudflare Hotlink Protection (Error 1011)
    // Some resources on cdn.chanomhub.com have hotlink protection enabled.
    // We spoof the Referer and Origin to make it look like it's coming from the main site.
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['*://*.chanomhub.com/*'] },
        (details, callback) => {
            details.requestHeaders['Referer'] = 'https://chanomhub.com/';
            details.requestHeaders['Origin'] = 'https://chanomhub.com';
            callback({ requestHeaders: details.requestHeaders });
        }
    );

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        icon: path.join(__dirname, '../public/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.cjs'),
        },
        frame: false, // Frameless for custom title bar
        backgroundColor: '#1e2329',
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        // Development: Load from Vite dev server
        console.log('📱 Loading from Vite dev server (localhost:5173)...');
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // Production: Load from built files
        console.log('Loading from built files...');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // F12 to toggle DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
            mainWindow.webContents.toggleDevTools();
        }
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http') && !url.includes('localhost')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Download handling
    mainWindow.webContents.session.on('will-download', (event, item) => {
        const id = downloadId++;
        const filename = item.getFilename();
        const savePath = path.join(downloadDirectory, filename);
        item.setSavePath(savePath);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-started', {
                id,
                filename,
                totalBytes: item.getTotalBytes()
            });
        }

        activeDownloads.set(id, item);

        let lastReceivedBytes = 0;
        let lastTime = Date.now();

        item.on('updated', (event, state) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (state === 'progressing') {
                    const currentTime = Date.now();
                    const currentBytes = item.getReceivedBytes();
                    const timeDiff = (currentTime - lastTime) / 1000;
                    const bytesDiff = currentBytes - lastReceivedBytes;
                    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                    mainWindow.webContents.send('download-progress', {
                        id,
                        receivedBytes: currentBytes,
                        totalBytes: item.getTotalBytes(),
                        speed: Math.round(speed)
                    });

                    lastReceivedBytes = currentBytes;
                    lastTime = currentTime;
                }
            }
        });

        item.once('done', (event, state) => {
            activeDownloads.delete(id);
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (state === 'completed') {
                    mainWindow.webContents.send('download-complete', {
                        id,
                        path: item.getSavePath(),
                        filename
                    });
                } else {
                    mainWindow.webContents.send('download-error', {
                        id,
                        error: state === 'cancelled' ? 'Download cancelled' : 'Download failed'
                    });
                }
            }
        });
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Initialize parallel downloader
    parallelDownloader = new ParallelDownloader(mainWindow, downloadDirectory, activeDownloads, () => downloadId++);
}

// ============= IPC Handlers =============

// --- File Extraction (using native OS tools) ---
ipcMain.handle('extract-file', async (event, { filePath, destPath }) => {
    return await ExtractorService.extractFile(filePath, destPath);
});

// --- Check Extraction Tools ---
ipcMain.handle('check-extraction-tools', async () => {
    return ExtractorService.checkExtractionTools();
});

// --- Directory Operations ---
ipcMain.handle('select-download-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-game-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedPath = result.filePaths[0];

    // 1. System Folder Protection - OS Specific
    const systemDirs = platformHandler.getBlockedSystemDirectories(app);

    // Normalize paths for comparison (remove trailing slashes)
    const normalizedSelected = path.normalize(selectedPath);
    const isSystemDir = systemDirs.some(dir => {
        const normalizedSystem = path.normalize(dir);
        return normalizedSelected === normalizedSystem;
    });

    if (isSystemDir) {
        dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Invalid Folder',
            message: 'You cannot select a system or root user directory as a game.',
            detail: 'Please select a specific folder inside containing the game files.'
        });
        return null;
    }

    // 2. Scan for executables validation
    const executables = scanDir(selectedPath, 0, 2); // Scan up to depth 2 is usually enough for a quick check
    const hasGameExecutable = executables.length > 0;

    if (!hasGameExecutable) {
        const userChoice = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'No Game Found',
            message: 'No game executables found in this folder.',
            detail: 'This folder does not appear to contain any recognized game launchers (.exe, .x86_64, etc). Are you sure you want to add this folder?',
            buttons: ['Cancel', 'Add Anyway'],
            defaultId: 0,
            cancelId: 0
        });

        if (userChoice.response === 0) {
            return null;
        }
    }

    return selectedPath;
});

ipcMain.handle('select-game-archive', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Archives', extensions: ['zip', '7z', 'rar', 'tar', 'gz', 'iso'] }
        ]
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-disk-space', async (event, checkPath) => {
    try {
        const stats = await fs.promises.statfs(checkPath);
        return {
            free: stats.bfree * stats.bsize,
            total: stats.blocks * stats.bsize,
            available: stats.bavail * stats.bsize
        };
    } catch (error) {
        console.error('Failed to check disk space:', error);
        return null;
    }
});

async function calculateDirSize(dirPath) {
    let size = 0;
    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const promises = files.map(async (file) => {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                size += await calculateDirSize(filePath);
            } else if (file.isFile()) {
                const stat = await fs.promises.stat(filePath);
                size += stat.size;
            }
        });
        await Promise.all(promises);
    } catch (e) {
        // Ignore file errors or missing paths silently to avoid crashing
    }
    return size;
}

ipcMain.handle('get-directory-size', async (event, dirPath) => {
    if (!dirPath || !fs.existsSync(dirPath)) return 0;
    try {
        const stats = await fs.promises.stat(dirPath);
        if (!stats.isDirectory()) return stats.size;
        return await calculateDirSize(dirPath);
    } catch (error) {
        console.error('Failed to get directory size:', error);
        return 0;
    }
});

ipcMain.handle('get-file-size', async (event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    try {
        const stats = await fs.promises.stat(filePath);
        return stats.size;
    } catch (error) {
        console.error('Failed to get file size:', error);
        return 0;
    }
});

ipcMain.handle('set-download-directory', (event, dirPath) => {
    if (dirPath && fs.existsSync(dirPath)) {
        downloadDirectory = dirPath;
        return true;
    }
    return false;
});

ipcMain.handle('get-download-directory', () => downloadDirectory);

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

//
// ================================================================================================
// Auto Updater
//
// This section handles app updates using electron-updater.
// ================================================================================================
//
// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// --- State ---
let updaterWindow = null;
let isUpdateInProgress = false;

// --- IPC Handlers for UI interaction ---
ipcMain.on('updater-start-download', () => {
    const globalSettings = loadJsonFile(SETTINGS_FILE);
    const autoDownload = globalSettings.autoUpdateEnabled !== false;
    if (autoDownload) {
        log.info('[Updater] User confirmed download OR auto-download is enabled. Starting download.');
        autoUpdater.downloadUpdate();
    }
});

ipcMain.on('updater-quit-and-install', () => {
    log.info('[Updater] User requested to quit and install.');
    autoUpdater.quitAndInstall();
});

ipcMain.on('updater-skip-update', () => {
    log.info('[Updater] User skipped the update. Launching main application.');
    isUpdateInProgress = false;
    launchMainApp();
});


// --- AutoUpdater Event Listeners ---
autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update...');
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-status', 'Checking for updates...');
        updaterWindow.webContents.send('hide-all-options');
    }
});

autoUpdater.on('update-available', (info) => {
    log.info('[Updater] Update available.', info);
    isUpdateInProgress = true;
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-status', `New version v${info.version} is available.`);
        const globalSettings = loadJsonFile(SETTINGS_FILE);
        const autoDownload = globalSettings.autoUpdateEnabled !== false;
        if (autoDownload) {
            log.info('[Updater] Auto-download is enabled. Starting download automatically.');
            updaterWindow.webContents.send('show-download-state');
            autoUpdater.downloadUpdate();
        } else {
            log.info('[Updater] Auto-download is disabled. Showing options to user.');
            updaterWindow.webContents.send('show-update-options');
        }
    }
});

autoUpdater.on('update-not-available', (info) => {
    log.info('[Updater] Update not available.');
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-status', 'App is up to date. Starting ChanoX2...');
    }
    setTimeout(launchMainApp, 1500);
});

autoUpdater.on('error', (err) => {
    log.error('[Updater] Error in auto-updater. ' + err);
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-status', 'Error checking for updates. Starting ChanoX2...');
    }
    setTimeout(launchMainApp, 2000);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);

    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-progress', Math.round(progressObj.percent));
        updaterWindow.webContents.send('update-status', `Downloading... (${Math.round(progressObj.percent)}%)`);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('[Updater] Update downloaded.');
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-status', 'Update downloaded. Ready to install.');
        updaterWindow.webContents.send('show-install-options'); // This tells UI to show "Restart Now" button
    }
});

// This is the replacement for the old custom updater logic
function createUpdaterWindow() {
    if (updaterWindow) return; // Prevent creating multiple windows

    updaterWindow = new BrowserWindow({
        width: 480,
        height: 320,
        frame: false,
        transparent: true,
        resizable: false,
        center: true,
        show: false,
        icon: path.join(__dirname, '../public/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        updaterWindow.loadURL('http://localhost:5173/updater.html');
    } else {
        updaterWindow.loadFile(path.join(__dirname, '../dist/updater.html'));
    }

    updaterWindow.once('ready-to-show', () => {
        updaterWindow.show();
        // In dev, don't trigger update check to avoid errors.
        if (!isDev) {
            setTimeout(() => autoUpdater.checkForUpdates(), 1000);
        } else {
             setTimeout(() => {
                if (updaterWindow && !updaterWindow.isDestroyed()) {
                    updaterWindow.webContents.send('update-status', 'Dev mode: Skipping update check. Starting ChanoX2...');
                }
                setTimeout(launchMainApp, 1500);
            }, 1000);
        }
    });

    updaterWindow.on('closed', () => {
        updaterWindow = null;
        // If the update wasn't completed, and the main window never opened, quit the app.
        if (!mainWindow && !isUpdateInProgress) {
            app.quit();
        }
    });
}

function launchMainApp() {
    // If an update is in progress, do not launch the main app.
    if (isUpdateInProgress && autoUpdater.autoInstallOnAppQuit) {
        log.info('[Updater] Update is in progress, deferring main app launch.');
        return;
    }

    if (!mainWindow) {
        createWindow();
    }

    if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
            if (updaterWindow && !updaterWindow.isDestroyed()) {
                log.info('[Main] Main window loaded, closing updater window.');
                updaterWindow.close();
            }
        });
        // Ensure main window is focused if it already exists
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }

    // Handle pending deep links or game launches after the main window is ready
    if (pendingGameLaunch || pendingDeepLink) {
        mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    if (pendingGameLaunch) {
                        log.info('🎮 Sending pending game launch:', pendingGameLaunch);
                        mainWindow.webContents.send('pending-game-launch', { gameId: pendingGameLaunch });
                        pendingGameLaunch = null;
                    }
                    if (pendingDeepLink) {
                        log.info('🔗 Sending pending deep link:', pendingDeepLink);
                        mainWindow.webContents.send('deep-link', { url: pendingDeepLink });
                        pendingDeepLink = null;
                    }
                }
            }, 1500);
        });
    }
}
// ============= App Lifecycle =============

app.whenReady().then(() => {
    const globalSettings = loadJsonFile(SETTINGS_FILE);
    if (globalSettings.discordRPCEnabled !== false) {
        DiscordService.init();
    }

    createUpdaterWindow();
});

app.on('window-all-closed', () => {
    DiscordService.shutdown();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        // Check for --launch-game argument from shortcut
        const gameId = parseLaunchGameArg(commandLine);
        if (gameId && mainWindow && !mainWindow.isDestroyed()) {
            console.log('🎮 Second instance game launch:', gameId);
            mainWindow.webContents.send('pending-game-launch', { gameId });
        }

        // Check for protocol URL
        const protocolUrl = parseProtocolUrl(commandLine);
        if (protocolUrl && mainWindow && !mainWindow.isDestroyed()) {
            console.log('🔗 Second instance deep link:', protocolUrl);
            mainWindow.webContents.send('deep-link', { url: protocolUrl });
        }

        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

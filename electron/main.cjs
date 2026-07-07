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
let updaterWindow = null;
let activeUpdateRequest = null;
let updateAssetToDownload = null;
let updateDestPath = null;
let latestReleaseVersion = null;
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

// --- Updater Action ---
ipcMain.on('updater-action', (event, action) => {
    if (action === 'skip') {
        if (activeUpdateRequest) {
            try {
                activeUpdateRequest.abort();
            } catch (e) { /* ignore */ }
            activeUpdateRequest = null;
        }
        launchMainApp();
    } else if (action === 'update') {
        runUpdateFlow();
    }
});

// --- Download Control ---
ipcMain.on('cancel-download', (event, id) => {
    const item = activeDownloads.get(id);
    if (item && !item.isPaused()) {
        item.cancel();
        activeDownloads.delete(id);
    }
});

ipcMain.on('download-file', (event, { url, headers }) => {
    console.log('📥 [Main] Received download-file request:', url);
    console.log('   Headers:', headers ? 'Present' : 'None');
    
    // Use parallel downloader for storage.chanomhub.com
    if (url.includes('storage.chanomhub.com')) {
        if (parallelDownloader) {
            // Update directory in case it changed
            parallelDownloader.downloadDirectory = downloadDirectory;
            parallelDownloader.download(url, headers);
            return;
        }
    }

    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        const options = {};
        if (headers) {
            options.headers = headers;
        }
        win.webContents.downloadURL(url, options);
    } else {
        console.error('❌ [Main] Could not find sender window for download');
    }
});

// --- File System ---
ipcMain.handle('read-directory', async (event, dirPath) => {
    try {
        if (!dirPath || !fs.existsSync(dirPath)) {
            return { success: false, entries: [], error: 'Directory not found' };
        }
        // If the path is a file, use its parent directory
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) {
            dirPath = path.dirname(dirPath);
        }
        const entries = fs.readdirSync(dirPath).filter(name => !name.startsWith('PaxHeader')).map(name => {
            const fullPath = path.join(dirPath, name);
            try {
                const stat = fs.statSync(fullPath);
                return {
                    name,
                    path: fullPath,
                    isDirectory: stat.isDirectory(),
                    size: stat.isDirectory() ? 0 : stat.size,
                };
            } catch {
                return { name, path: fullPath, isDirectory: false, size: 0 };
            }
        });
        // Sort: directories first, then files, alphabetically
        entries.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return { success: true, entries };
    } catch (err) {
        return { success: false, entries: [], error: err.message };
    }
});

ipcMain.on('show-item-in-folder', (event, fullPath) => shell.showItemInFolder(fullPath));
ipcMain.on('open-path', async (event, fullPath) => await shell.openPath(fullPath));
ipcMain.on('open-external', (event, url) => shell.openExternal(url));

ipcMain.on('open-new-window', (event, url) => {
    const parent = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        parent: parent,
        modal: false,
        backgroundColor: '#1b2838',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true // Safer for external content
        },
        autoHideMenuBar: true
    });

    // Add custom menu or remove it
    win.removeMenu();

    win.loadURL(url);

    // Handlers for the new window events
    win.webContents.setWindowOpenHandler(({ url }) => {
        // If the new window tries to open another window, open it in default browser
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // NOTE: Downloads from child windows are automatically handled by mainWindow's session
    // handler since they share the same default session. No need for duplicate handler here.
});

// --- Mod Management ---
ipcMain.handle('install-mod', async (event, { url, installPath, filename, headers }) => {
    console.log(`📥 [Main] Mod Install Request: ${url}`);
    if (headers && headers.Authorization) {
        console.log(`   Auth: Bearer ${headers.Authorization.substring(7, 15)}...`);
    }

    return new Promise((resolve, reject) => {
        const filePath = path.join(installPath, filename);
        console.log(`   Path: ${filePath}`);

        try {
            // Ensure directory exists
            if (!fs.existsSync(installPath)) {
                fs.mkdirSync(installPath, { recursive: true });
            }

            const file = fs.createWriteStream(filePath);
            const request = net.request({
                url,
                method: 'GET',
                redirect: 'follow'
            });

            // Set headers explicitly
            if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                    request.setHeader(key, value);
                }
            }

            request.on('response', (response) => {
                console.log(`   Response: ${response.statusCode} ${response.statusMessage}`);

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(filePath, () => { }); // Delete partial file
                    reject(new Error(`Download failed with status code: ${response.statusCode}`));
                    return;
                }

                // Simplified stream piping
                response.pipe(file);

                response.on('error', (err) => {
                    console.error('   Response Error:', err);
                    file.close();
                    fs.unlink(filePath, () => { });
                    reject(err);
                });
            });

            request.on('error', (err) => {
                console.error('   Request Error:', err);
                if (!file.destroyed) file.close();
                fs.unlink(filePath, () => { });
                reject(err);
            });

            file.on('finish', () => {
                file.close();
                console.log(`✅ [Main] Mod installed successfully: ${filePath}`);
                resolve({ success: true, path: filePath });
            });

            file.on('error', (err) => {
                console.error('   File Error:', err);
                fs.unlink(filePath, () => { });
                reject(err);
            });

            request.end();
        } catch (err) {
            console.error('   Setup Error:', err);
            reject(err);
        }
    });
});

ipcMain.handle('read-file-content', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return content;
        }
        return null;
    } catch (err) {
        console.error(`[Main] Error reading file ${filePath}:`, err);
        throw err;
    }
});

ipcMain.handle('write-file-content', async (event, { filePath, content }) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    } catch (err) {
        console.error(`[Main] Error writing file ${filePath}:`, err);
        return false;
    }
});

// --- LayerPack Integration ---
ipcMain.handle('check-lpack-conflicts', async (event, { filePath, destPath, key }) => {
    try {
        const { JsLayerPack } = require('layer-pack-node');
        const lpackKey = key || process.env.LPACK_SECURITY_KEY || process.env.LPACK_ENCRYPTION_KEY || "__LPACK_SECURITY_KEY__" || "__LPACK_ENCRYPTION_KEY__" || "";
        const pack = new JsLayerPack(filePath, lpackKey);
        const files = pack.getFileList();

        const conflicts = [];
        const newFiles = [];
        const modDirs = new Set();

        for (const file of files) {
            const parts = file.split(/[/\\]/);
            if (parts.length > 1) {
                modDirs.add(parts[0]);
            }

            const fullPath = path.join(destPath, file);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                conflicts.push(file);
            } else {
                newFiles.push(file);
            }
        }

        // Structural Heuristic: Check if mod's top-level folders exist in destination
        const mismatchedDirs = [];
        for (const dir of modDirs) {
            const dirPath = path.join(destPath, dir);
            if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
                mismatchedDirs.push(dir);
            }
        }

        // Path Auto-Correction Logic
        let suggestedPath = null;
        if (mismatchedDirs.length > 0 && conflicts.length === 0) {
            // Check common subdirectories for a better match
            const commonSubs = ['www', 'game', 'Content', 'StreamingAssets'];
            for (const sub of commonSubs) {
                const subPath = path.join(destPath, sub);
                if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
                    // Count how many modDirs exist in this subPath
                    let matches = 0;
                    for (const dir of modDirs) {
                        try {
                            const checkPath = path.join(subPath, dir);
                            if (fs.existsSync(checkPath)) {
                                matches++;
                            }
                        } catch (e) { }
                    }
                    if (matches > 0 && matches >= modDirs.size / 2) {
                        suggestedPath = subPath;
                        break;
                    }
                }
            }
        }

        // If conflicts are 0 but the mod has many files that would be in subdirectories
        // that don't exist, it's a strong sign of a mismatch.
        const structureWarning = mismatchedDirs.length > 0 && conflicts.length === 0;

        return {
            success: true,
            conflicts,
            newFiles,
            structureWarning,
            mismatchedDirs,
            suggestedPath: suggestedPath ? path.relative(destPath, suggestedPath) : null
        };
    } catch (err) {
        console.error(`[Main] Error checking lpack conflicts:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-lpack-metadata', async (event, { filePath, key }) => {
    try {
        const { JsLayerPack } = require('layer-pack-node');
        const lpackKey = key || process.env.LPACK_SECURITY_KEY || process.env.LPACK_ENCRYPTION_KEY || "__LPACK_SECURITY_KEY__" || "__LPACK_ENCRYPTION_KEY__" || "";
        const pack = new JsLayerPack(filePath, lpackKey);
        return {
            success: true,
            name: pack.name,
            author: pack.author,
            files: pack.getFileList()
        };
    } catch (err) {
        console.error(`[Main] Error reading lpack metadata:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('extract-lpack', async (event, { filePath, destPath, key, modId, gamePath }) => {
    try {
        const { JsLayerPack } = require('layer-pack-node');
        const lpackKey = key || process.env.LPACK_SECURITY_KEY || process.env.LPACK_ENCRYPTION_KEY || "__LPACK_SECURITY_KEY__" || "__LPACK_ENCRYPTION_KEY__" || "";
        const pack = new JsLayerPack(filePath, lpackKey);
        const files = pack.getFileList();

        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
        }

        const timestamp = Date.now();
        // Use gamePath (root) for backups if provided, otherwise fallback to destPath
        const rootPath = gamePath || destPath;
        const backupDir = path.join(rootPath, '.chanox2', 'backups', `mod_${modId}_${timestamp}`);
        const manifestPath = path.join(backupDir, 'backup-manifest.json');
        const backedUpFiles = [];
        const extractedFiles = [];

        for (const file of files) {
            const fullPath = path.join(destPath, file);
            const dir = path.dirname(fullPath);

            // 1. Backup if file exists
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                const backupPath = path.join(backupDir, file);
                const backupFileDir = path.dirname(backupPath);
                if (!fs.existsSync(backupFileDir)) {
                    fs.mkdirSync(backupFileDir, { recursive: true });
                }
                fs.copyFileSync(fullPath, backupPath);
                backedUpFiles.push(file);
            }

            // 2. Extract
            const content = pack.readFile(file);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, content);
            extractedFiles.push(file);
        }

        // Save manifest if there were backups/extractions
        if (backedUpFiles.length > 0 || extractedFiles.length > 0) {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            fs.writeFileSync(manifestPath, JSON.stringify({
                modId,
                timestamp,
                backedUpFiles,
                extractedFiles,
                destPath: path.relative(rootPath, destPath) // Store where we extracted
            }, null, 2));
        }

        return { success: true, backupId: backedUpFiles.length > 0 ? `mod_${modId}_${timestamp}` : null };
    } catch (err) {
        console.error(`[Main] Error extracting lpack:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('rollback-lpack-extraction', async (event, { gamePath, backupId }) => {
    try {
        const backupDir = path.join(gamePath, '.chanox2', 'backups', backupId);
        const manifestPath = path.join(backupDir, 'backup-manifest.json');

        if (!fs.existsSync(manifestPath)) {
            throw new Error('Backup manifest not found');
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        // If destPath was stored in manifest, use it relative to gamePath
        const destPath = manifest.destPath ? path.join(gamePath, manifest.destPath) : gamePath;

        // 1. Delete extracted files (that weren't backups)
        for (const file of manifest.extractedFiles) {
            const fullPath = path.join(destPath, file);
            if (fs.existsSync(fullPath) && !manifest.backedUpFiles.includes(file)) {
                fs.unlinkSync(fullPath);
            }
        }

        // 2. Restore backed up files
        for (const file of manifest.backedUpFiles) {
            const sourcePath = path.join(backupDir, file);
            const targetPath = path.join(destPath, file);
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }

        // Cleanup: remove backup dir if possible
        // (Optional: keep it but mark as rolled back?)
        // For now, let's keep it to be safe, but we could delete it.
        fs.renameSync(manifestPath, manifestPath + '.rolledback');

        return { success: true };
    } catch (err) {
        console.error(`[Main] Error rolling back lpack:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-mod-backups', async (event, { gamePath, modId }) => {
    try {
        const rootBackupDir = path.join(gamePath, '.chanox2', 'backups');
        if (!fs.existsSync(rootBackupDir)) return { success: true, backups: [] };

        const dirs = fs.readdirSync(rootBackupDir);
        const backups = [];

        for (const dirName of dirs) {
            if (dirName.startsWith(`mod_${modId}_`)) {
                const manifestPath = path.join(rootBackupDir, dirName, 'backup-manifest.json');
                if (fs.existsSync(manifestPath)) {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                    backups.push({
                        id: dirName,
                        timestamp: manifest.timestamp,
                        fileCount: manifest.backedUpFiles.length,
                        files: manifest.backedUpFiles
                    });
                }
            }
        }
        return { success: true, backups: backups.sort((a, b) => b.timestamp - a.timestamp) };
    } catch (err) {
        console.error(`[Main] Error listing mod backups:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('read-lpack-file', async (event, { filePath, key, innerPath }) => {
    try {
        const { JsLayerPack } = require('layer-pack-node');
        const lpackKey = key || process.env.LPACK_SECURITY_KEY || process.env.LPACK_ENCRYPTION_KEY || "";
        const pack = new JsLayerPack(filePath, lpackKey);
        const content = pack.readFile(innerPath);
        return { success: true, content };
    } catch (err) {
        console.error(`[Main] Error reading file from lpack:`, err);
        return { success: false, error: err.message };
    }
});

// --- Window Controls ---
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());

// --- OAuth Server ---
ipcMain.handle('start-oauth-server', (event, options) => {
    const apiBaseUrl = (options && options.apiBaseUrl) || process.env.VITE_API_URL || 'https://api.chanomhub.com';
    return new Promise((resolve, reject) => {
        if (oauthServer) {
            resolve({ port: OAUTH_CALLBACK_PORT });
            return;
        }

        oauthServer = http.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${OAUTH_CALLBACK_PORT}`);

            if (url.pathname === '/callback') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Login Successful</title>
            <style>
              body { font-family: system-ui; display: flex; justify-content: center; align-items: center; 
                     height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { text-align: center; color: white; padding: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 id="status">✅ Login Successful!</h1>
              <p>You can close this tab and return to ChanoX2.</p>
            </div>
            <script>
              const apiBaseUrl = '${apiBaseUrl}';

              // First try Better Auth session exchange (new login)
              fetch(apiBaseUrl + '/api/auth/exchange', {
                method: 'POST',
                credentials: 'include'
              })
              .then(res => {
                if (!res.ok) throw new Error('Better Auth session exchange failed');
                return res.json();
              })
              .then(responseJson => {
                const loginData = responseJson.data || responseJson;
                const token = loginData.user?.token || loginData.token;
                const refreshToken = loginData.refreshToken;
                if (token) {
                  return fetch('/oauth-tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: token, refreshToken })
                  });
                }
                throw new Error('No token returned from Better Auth');
              })
              .then(() => setTimeout(() => window.close(), 1500))
              .catch(err => {
                console.warn('Better Auth exchange failed, trying legacy URL params fallback:', err);
                
                // Fallback to legacy URL parameters
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash || window.location.search);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                
                if (accessToken) {
                  fetch('/oauth-tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken, refreshToken })
                  })
                  .then(() => setTimeout(() => window.close(), 1500))
                  .catch(localErr => {
                    console.error('Local callback post failed:', localErr);
                    document.getElementById('status').innerText = '❌ Authentication failed: ' + localErr.message;
                  });
                } else {
                  document.getElementById('status').innerText = '❌ Authentication failed: ' + err.message;
                }
              });
            </script>
          </body>
          </html>
        `);
            } else if (url.pathname === '/oauth-tokens' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const { accessToken, refreshToken } = JSON.parse(body);
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('oauth-callback', { accessToken, refreshToken });
                            mainWindow.focus();
                        }
                        res.writeHead(200);
                        res.end('OK');
                        setTimeout(() => {
                            if (oauthServer) {
                                oauthServer.close();
                                oauthServer = null;
                            }
                        }, 2000);
                    } catch (e) {
                        res.writeHead(400);
                        res.end('Bad Request');
                    }
                });
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        oauthServer.listen(OAUTH_CALLBACK_PORT, () => resolve({ port: OAUTH_CALLBACK_PORT }));
        oauthServer.on('error', (err) => {
            oauthServer = null;
            reject(err);
        });
    });
});

ipcMain.handle('stop-oauth-server', () => {
    if (oauthServer) {
        oauthServer.close();
        oauthServer = null;
    }
    return true;
});

// --- Data Persistence ---
ipcMain.handle('get-game-config', (event, gameId) => loadJsonFile(GAME_CONFIG_FILE)[gameId] || null);
ipcMain.handle('save-game-config', (event, { gameId, config }) => {
    const fullConfig = loadJsonFile(GAME_CONFIG_FILE);
    fullConfig[gameId] = config;
    return saveJsonFile(GAME_CONFIG_FILE, fullConfig);
});

ipcMain.handle('get-global-settings', () => loadJsonFile(SETTINGS_FILE));
ipcMain.handle('save-global-settings', (event, settings) => {
    const oldSettings = loadJsonFile(SETTINGS_FILE);
    const result = saveJsonFile(SETTINGS_FILE, settings);
    
    // Handle Discord RPC toggle
    if (settings.discordRPCEnabled === true && oldSettings.discordRPCEnabled !== true) {
        console.log('🎮 [Main] Discord RPC enabled by user');
        DiscordService.init();
    } else if (settings.discordRPCEnabled === false && oldSettings.discordRPCEnabled !== false) {
        console.log('🎮 [Main] Discord RPC disabled by user');
        DiscordService.shutdown();
    }
    
    return result;
});

ipcMain.handle('get-downloads', () => loadJsonFile(DOWNLOADS_FILE, []));
ipcMain.handle('save-downloads', (event, downloads) => saveJsonFile(DOWNLOADS_FILE, downloads));

// --- Library Persistence ---
ipcMain.handle('get-library', () => loadJsonFile(LIBRARY_FILE, []));
ipcMain.handle('save-library', (event, library) => saveJsonFile(LIBRARY_FILE, library));

// Download cover image for offline support
ipcMain.handle('download-cover-image', async (event, { gameId, coverImageUrl }) => {
    const localPath = await downloadCoverImage(gameId, coverImageUrl);
    return { success: !!localPath, localPath };
});

// Move archive to archives subfolder
ipcMain.handle('move-archive-to-storage', async (event, { sourcePath, filename }) => {
    try {
        const destPath = path.join(ARCHIVES_DIR, filename);

        // If source and dest are the same, no need to move
        if (sourcePath === destPath) return { success: true, newPath: destPath };

        // Check if source exists
        if (!fs.existsSync(sourcePath)) {
            console.log('move-archive-to-storage: Source file not found, skipping move:', sourcePath);
            return { success: true, newPath: sourcePath, skipped: true }; // Return success but indicate skipped
        }

        // Ensure destination directory exists
        if (!fs.existsSync(ARCHIVES_DIR)) {
            fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
        }

        // Try rename first (fast, same filesystem)
        try {
            await fs.promises.rename(sourcePath, destPath);
            return { success: true, newPath: destPath };
        } catch (renameErr) {
            // If rename fails (cross-device or other issue), try copy+delete
            if (renameErr.code === 'EXDEV' || renameErr.code === 'ENOENT') {
                console.log('move-archive-to-storage: rename failed, trying copy:', renameErr.code);
                await fs.promises.copyFile(sourcePath, destPath);
                await fs.promises.unlink(sourcePath);
                return { success: true, newPath: destPath };
            }
            throw renameErr;
        }
    } catch (err) {
        console.error('Failed to move archive:', err);
        return { success: false, error: err.message };
    }
});

// Delete a file or directory at a given path.
ipcMain.handle('delete-path', async (event, pathToDelete) => {
    try {
        if (!pathToDelete || typeof pathToDelete !== 'string') {
            return { success: false, error: 'Invalid path provided' };
        }

        // Security: Basic check to prevent deleting critical root directories.
        const restrictedPaths = [app.getPath('home'), app.getPath('userData'), '/'];
        if (restrictedPaths.includes(path.normalize(pathToDelete))) {
             return { success: false, error: 'Deletion of critical system path is not allowed' };
        }

        if (fs.existsSync(pathToDelete)) {
            await fs.promises.rm(pathToDelete, { recursive: true, force: true });
            console.log(`[FS] Deleted path: ${pathToDelete}`);
            return { success: true };
        }
        // If path doesn't exist, it's not an error, the desired state is achieved.
        return { success: true, warning: 'Path did not exist, no action taken.' };
    } catch (err) {
        console.error(`[FS] Failed to delete path '${pathToDelete}':`, err);
        return { success: false, error: err.message };
    }
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
});

ipcMain.handle('get-auth-data', (event, key) => loadJsonFile(AUTH_FILE)[key] || null);
ipcMain.handle('save-auth-data', (event, { key, value }) => {
    const data = loadJsonFile(AUTH_FILE);
    data[key] = value;
    return saveJsonFile(AUTH_FILE, data);
});
ipcMain.handle('remove-auth-data', (event, key) => {
    const data = loadJsonFile(AUTH_FILE);
    delete data[key];
    return saveJsonFile(AUTH_FILE, data);
});

// --- Proton Detection ---
ipcMain.handle('find-installed-protons', async () => {
    const os = require('os');
    const homedir = os.homedir();
    const searchDirs = [
        path.join(homedir, '.local/share/Steam/compatibilitytools.d'),
        path.join(homedir, '.steam/root/compatibilitytools.d'),
        path.join(homedir, '.steam/steam/compatibilitytools.d'),
        path.join(homedir, '.var/app/com.valvesoftware.Steam/data/Steam/compatibilitytools.d'),
        '/usr/share/steam/compatibilitytools.d'
    ];

    const detected = [];
    
    // Add workspace path for development/testing
    const workspaceProton = path.join(__dirname, '..', 'GE-Proton10-34');
    searchDirs.push(path.dirname(workspaceProton));

    for (const dir of searchDirs) {
        try {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                const subdirs = fs.readdirSync(dir);
                for (const sub of subdirs) {
                    const fullPath = path.join(dir, sub);
                    const protonBin = path.join(fullPath, 'proton');
                    if (fs.existsSync(protonBin)) {
                        // Check if we already added this one
                        if (!detected.some(d => d.path === fullPath)) {
                            detected.push({
                                name: sub,
                                path: fullPath
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`[Main] Error searching Proton in ${dir}:`, e.message);
        }
    }

    return detected;
});

// --- GE-Proton Downloader and Installer ---
let activeProtonDownload = null;

ipcMain.handle('get-proton-ge-releases', async () => {
    return new Promise((resolve, reject) => {
        const request = net.request({
            method: 'GET',
            url: 'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases',
            headers: {
                'User-Agent': 'ChanoX2'
            }
        });

        request.on('response', (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk.toString();
            });

            response.on('end', () => {
                try {
                    if (response.statusCode === 200) {
                        const releases = JSON.parse(data);
                        const formatted = releases.map(r => {
                            const tarAsset = r.assets.find(a => a.name.endsWith('.tar.gz'));
                            return {
                                tagName: r.tag_name,
                                name: r.name,
                                publishedAt: r.published_at,
                                tarUrl: tarAsset ? tarAsset.browser_download_url : null,
                                size: tarAsset ? tarAsset.size : 0
                            };
                        }).filter(r => r.tarUrl !== null);
                        resolve(formatted);
                    } else {
                        reject(new Error(`GitHub API error: status ${response.statusCode}`));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.end();
    });
});

ipcMain.handle('download-and-install-proton-ge', async (event, { tagName, downloadUrl }) => {
    if (activeProtonDownload) {
        return { success: false, error: 'Another Proton installation is currently in progress.' };
    }

    const compatibilitytoolsDir = path.join(HOME_DIR, '.local/share/Steam/compatibilitytools.d');
    
    try {
        if (!fs.existsSync(compatibilitytoolsDir)) {
            fs.mkdirSync(compatibilitytoolsDir, { recursive: true });
        }
    } catch (err) {
        return { success: false, error: `Failed to create compatibility directory: ${err.message}` };
    }

    const tempFileName = `${tagName}.tar.gz.tmp`;
    const tempFilePath = path.join(compatibilitytoolsDir, tempFileName);
    const finalFilePath = path.join(compatibilitytoolsDir, `${tagName}.tar.gz`);

    return new Promise((resolve) => {
        try {
            const file = fs.createWriteStream(tempFilePath);
            
            const request = net.request({
                url: downloadUrl,
                method: 'GET',
                redirect: 'follow'
            });

            activeProtonDownload = request;

            let downloadedBytes = 0;
            let totalBytes = 0;

            request.on('response', (response) => {
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(tempFilePath, () => {});
                    activeProtonDownload = null;
                    resolve({ success: false, error: `Download failed with status: ${response.statusCode}` });
                    return;
                }

                totalBytes = parseInt(response.headers['content-length'], 10) || 0;
                response.pipe(file);

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes > 0 && mainWindow && !mainWindow.isDestroyed()) {
                        const percent = Math.round((downloadedBytes / totalBytes) * 100);
                        mainWindow.webContents.send('proton-download-progress', {
                            version: tagName,
                            percent,
                            downloadedBytes,
                            totalBytes,
                            status: 'downloading'
                        });
                    }
                });

                response.on('error', (err) => {
                    console.error('[ProtonInstaller] Response error:', err);
                    file.close();
                    fs.unlink(tempFilePath, () => {});
                    activeProtonDownload = null;
                    resolve({ success: false, error: err.message });
                });
            });

            request.on('error', (err) => {
                console.error('[ProtonInstaller] Request error:', err);
                if (!file.destroyed) file.close();
                fs.unlink(tempFilePath, () => {});
                activeProtonDownload = null;
                resolve({ success: false, error: err.message });
            });

            file.on('finish', async () => {
                file.close();
                activeProtonDownload = null;
                
                try {
                    if (fs.existsSync(tempFilePath)) {
                        fs.renameSync(tempFilePath, finalFilePath);
                    }

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('proton-download-progress', {
                            version: tagName,
                            percent: 100,
                            downloadedBytes: totalBytes,
                            totalBytes: totalBytes,
                            status: 'extracting'
                        });
                    }

                    console.log(`[ProtonInstaller] Extracting ${finalFilePath} to ${compatibilitytoolsDir}...`);
                    await ExtractorService.extractArchive(finalFilePath, compatibilitytoolsDir);
                    
                    fs.unlinkSync(finalFilePath);

                    console.log(`[ProtonInstaller] Successfully installed ${tagName}!`);
                    
                    const installedPath = path.join(compatibilitytoolsDir, tagName);
                    resolve({ success: true, path: installedPath });

                } catch (err) {
                    console.error('[ProtonInstaller] Post-download error:', err);
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                    if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
                    resolve({ success: false, error: `Installation/extraction failed: ${err.message}` });
                }
            });

            file.on('error', (err) => {
                console.error('[ProtonInstaller] File write error:', err);
                fs.unlink(tempFilePath, () => {});
                activeProtonDownload = null;
                resolve({ success: false, error: err.message });
            });

            request.end();

        } catch (err) {
            console.error('[ProtonInstaller] Init error:', err);
            activeProtonDownload = null;
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            resolve({ success: false, error: err.message });
        }
    });
});

ipcMain.handle('cancel-proton-download', async () => {
    if (activeProtonDownload) {
        try {
            activeProtonDownload.abort();
        } catch (e) {
            // ignore
        }
        activeProtonDownload = null;
        return { success: true };
    }
    return { success: false, error: 'No active download' };
});

// --- Bottles CLI Integration ---
ipcMain.handle('list-bottles', async () => {
    try {
        const { execSync } = require('child_process');
        const output = execSync('bottles-cli list bottles 2>/dev/null', { encoding: 'utf8', timeout: 10000 });
        // Parse output like: "Found 1 bottles:\n- GAME\n- Another Bottle"
        const lines = output.split('\n');
        const bottles = [];
        for (const line of lines) {
            const match = line.match(/^-\s+(.+)$/);
            if (match) {
                bottles.push(match[1].trim());
            }
        }
        return { success: true, bottles };
    } catch (error) {
        console.log('bottles-cli not found or failed:', error.message);
        return { success: false, bottles: [], error: error.message };
    }
});

// --- Winetricks Integration ---
const WINETRICKS_PACKAGES = [
    { id: 'vcrun2022', name: 'Visual C++ 2015-2022', category: 'dlls', description: 'Microsoft Visual C++ 2015-2022 Redistributable (x64)' },
    { id: 'vcrun2019', name: 'Visual C++ 2019', category: 'dlls', description: 'Microsoft Visual C++ 2019 Redistributable' },
    { id: 'vcrun2017', name: 'Visual C++ 2017', category: 'dlls', description: 'Microsoft Visual C++ 2017 Redistributable' },
    { id: 'vcrun2015', name: 'Visual C++ 2015', category: 'dlls', description: 'Microsoft Visual C++ 2015 Redistributable' },
    { id: 'vcrun2013', name: 'Visual C++ 2013', category: 'dlls', description: 'Microsoft Visual C++ 2013 Redistributable' },
    { id: 'vcrun2012', name: 'Visual C++ 2012', category: 'dlls', description: 'Microsoft Visual C++ 2012 Redistributable' },
    { id: 'vcrun2010', name: 'Visual C++ 2010', category: 'dlls', description: 'Microsoft Visual C++ 2010 Redistributable' },
    { id: 'dxvk', name: 'DXVK', category: 'dlls', description: 'Vulkan-based D3D9/D3D10/D3D11 implementation for better performance' },
    { id: 'dotnet48', name: '.NET Framework 4.8', category: 'dlls', description: 'Microsoft .NET Framework 4.8' },
    { id: 'dotnet40', name: '.NET Framework 4.0', category: 'dlls', description: 'Microsoft .NET Framework 4.0' },
    { id: 'd3dx9', name: 'DirectX 9', category: 'dlls', description: 'All d3dx9 DLLs from DirectX 9' },
    { id: 'd3dx10', name: 'DirectX 10', category: 'dlls', description: 'All d3dx10 DLLs from DirectX 10' },
    { id: 'd3dx11_43', name: 'DirectX 11', category: 'dlls', description: 'd3dx11_43 DLL from DirectX SDK' },
    { id: 'd3dcompiler_47', name: 'D3D Compiler 47', category: 'dlls', description: 'd3dcompiler_47.dll' },
    { id: 'xact', name: 'XACT', category: 'dlls', description: 'MS XACT Engine (x3daudio, xapofx)' },
    { id: 'xact_x64', name: 'XACT x64', category: 'dlls', description: 'MS XACT Engine 64-bit' },
    { id: 'physx', name: 'PhysX', category: 'dlls', description: 'NVIDIA PhysX engine' },
    { id: 'corefonts', name: 'Core Fonts', category: 'fonts', description: 'Microsoft core fonts (Arial, Times, etc.)' },
    { id: 'tahoma', name: 'Tahoma', category: 'fonts', description: 'Microsoft Tahoma font' },
    { id: 'cjkfonts', name: 'CJK Fonts', category: 'fonts', description: 'Chinese, Japanese, Korean fonts' }
];

// Running winetricks installations (for progress tracking)
let activeWinetricksProcess = null;

ipcMain.handle('check-winetricks-installed', async () => {
    try {
        const { execSync } = require('child_process');
        const output = execSync('winetricks --version 2>&1', { encoding: 'utf8', timeout: 5000 });
        const version = output.trim().split('\n')[0];
        return { installed: true, version };
    } catch (error) {
        console.log('winetricks not found:', error.message);
        return { installed: false };
    }
});

ipcMain.handle('get-winetricks-packages', async () => {
    return WINETRICKS_PACKAGES;
});

ipcMain.handle('install-winetricks-package', async (event, { packageId, winePrefix }) => {
    // Cancel any existing installation
    if (activeWinetricksProcess) {
        try {
            activeWinetricksProcess.kill('SIGTERM');
        } catch (e) { /* ignore */ }
        activeWinetricksProcess = null;
    }

    return new Promise((resolve) => {
        try {
            const env = { ...process.env };

            // Set wine prefix if provided
            if (winePrefix) {
                env.WINEPREFIX = winePrefix;
            }

            // Run winetricks in unattended mode
            const args = ['-q', packageId];

            console.log('🍷 [winetricks] Installing:', packageId, winePrefix ? `(prefix: ${winePrefix})` : '(default prefix)');

            activeWinetricksProcess = spawn('winetricks', args, {
                env,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            activeWinetricksProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                // Send progress to renderer
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('winetricks-progress', { output: text, packageId });
                }
            });

            activeWinetricksProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                // Also send stderr as progress
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('winetricks-progress', { output: text, packageId, isError: true });
                }
            });

            activeWinetricksProcess.on('close', (code) => {
                console.log('🍷 [winetricks] Process closed with code:', code);
                activeWinetricksProcess = null;

                if (code === 0) {
                    resolve({ success: true, package: packageId });
                } else {
                    resolve({
                        success: false,
                        package: packageId,
                        error: errorOutput || `Process exited with code ${code}`
                    });
                }
            });

            activeWinetricksProcess.on('error', (err) => {
                console.error('🍷 [winetricks] Spawn error:', err.message);
                activeWinetricksProcess = null;
                resolve({ success: false, package: packageId, error: err.message });
            });

        } catch (error) {
            console.error('🍷 [winetricks] Error:', error.message);
            resolve({ success: false, package: packageId, error: error.message });
        }
    });
});

ipcMain.handle('cancel-winetricks-install', async () => {
    if (activeWinetricksProcess) {
        try {
            activeWinetricksProcess.kill('SIGTERM');
            activeWinetricksProcess = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: true };
});

// --- NST CLI Integration ---
ipcMain.handle('open-nst-cli', async (event, { projectPath, engine, outputPath, nstExecutablePath, title, coverImage }) => {
    try {
        // Use provided path or default
        // TODO: Make this path configurable via Settings UI if not provided
        const nstPath = nstExecutablePath || 'NST';

        // Check if NST exists
        if (!fs.existsSync(nstPath)) {
            return { success: false, error: `NST not found at: ${nstPath}` };
        }

        // Ensure NST has execute permissions
        try {
            fs.chmodSync(nstPath, '755');
        } catch (chmodErr) {
            console.warn('⚠️ [open-nst-cli] Could not set permissions:', chmodErr.message);
        }

        const args = ['-e', engine || 'rpgm', '-p', projectPath];
        if (outputPath) {
            args.push('--output', outputPath);
        }

        console.log('🌐 [open-nst-cli] Launching NST:', { nstPath, args });

        // Run NST and wait for completion
        return new Promise((resolve) => {
            const subprocess = spawn(nstPath, args, {
                stdio: 'pipe' // Capture output for debugging/logging
            });

            let outputLog = '';
            let errorLog = '';

            subprocess.stdout.on('data', (data) => {
                const text = data.toString();
                outputLog += text;
                console.log(`[NST stdout]: ${text.trim()}`);
                // Optional: Send progress to frontend if needed
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('nst-output', text);
                }
            });

            subprocess.stderr.on('data', (data) => {
                const text = data.toString();
                errorLog += text;
                console.error(`[NST stderr]: ${text.trim()}`);
            });

            subprocess.on('close', async (code) => {
                console.log(`[NST] Process exited with code ${code}`);

                if (code === 0) {
                    // Success!
                    let resultPath = outputPath;

                    // If outputPath wasn't provided, we might need to guess where it went (default behavior of NST?)
                    // For now, we assume outputPath IS provided for the auto-add feature to work effectively.

                    if (outputPath && fs.existsSync(outputPath)) {
                        // Auto-Add to Library
                        try {
                            const library = loadJsonFile(LIBRARY_FILE, []);

                            // Check for duplicates (by path)
                            const isDuplicate = library.some(item => item.extractedPath === outputPath);
                            if (!isDuplicate) {
                                const newGame = {
                                    id: Date.now(),
                                    title: title || `${path.basename(projectPath)} (Translated)`,
                                    extractedPath: outputPath,
                                    addedAt: new Date().toISOString(),
                                    engine: engine,
                                    coverImage: coverImage || null,
                                    isMod: true // Mark as modified/translated version
                                };

                                library.push(newGame);
                                saveJsonFile(LIBRARY_FILE, library);

                                console.log('✅ [open-nst-cli] Automatically added to library:', newGame.title);

                                // Notify frontend to refresh library
                                if (mainWindow && !mainWindow.isDestroyed()) {
                                    mainWindow.webContents.send('library-updated');
                                }
                            } else {
                                console.log('ℹ️ [open-nst-cli] Game allready in library, skipping add.');
                            }

                            resolve({ success: true, logs: outputLog });
                        } catch (libErr) {
                            console.error('⚠️ [open-nst-cli] Failed to add to library:', libErr);
                            // Still resolve as success since translation worked
                            resolve({ success: true, logs: outputLog, warning: 'Failed to add to library' });
                        }
                    } else {
                        // Translation finished but output path invalid?
                        resolve({ success: true, logs: outputLog, warning: 'Output path not found' });
                    }
                } else {
                    resolve({ success: false, error: `NST process exited with code ${code}`, logs: outputLog, errorLogs: errorLog });
                }
            });

            subprocess.on('error', (err) => {
                console.error('🔥 [open-nst-cli] Spawn error:', err.message);
                resolve({ success: false, error: err.message });
            });
        });

    } catch (error) {
        console.error('🔥 [open-nst-cli] Error:', error.message);
        return { success: false, error: error.message };
    }
});

// --- Game Scanning & Launching ---

function scanDir(dir, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return [];
    let executables = [];
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file === 'PaxHeader' || file === '__MACOSX' || file.startsWith('.')) continue;

            const fullPath = path.join(dir, file);
            try {
                // Use lstat to check for symlinks
                const lstats = fs.lstatSync(fullPath);

                let isDirectory = lstats.isDirectory();
                let targetStats = lstats;

                if (lstats.isSymbolicLink()) {
                    try {
                        targetStats = fs.statSync(fullPath);
                        if (targetStats.isDirectory()) {
                            // Skip symlinked directories to prevent escaping the game folder
                            console.log('Skipping symlinked directory:', fullPath);
                            continue;
                        }
                        // It's a symlink to a file, use targetStats for executable check
                        isDirectory = false;
                    } catch (e) {
                        // Broken symlink, skip
                        continue;
                    }
                }

                // Directory Handling
                if (isDirectory) {
                    // Check if directory itself is a game app (e.g. .app on Mac)
                    if (platformHandler.isGameDirectory) {
                        const gameDir = platformHandler.isGameDirectory(fullPath);
                        if (gameDir) {
                            executables.push({ path: fullPath, type: gameDir.type });
                            continue; // Treat as file, don't recurse inside
                        }
                    }
                    executables = executables.concat(scanDir(fullPath, depth + 1, maxDepth));
                } else {
                    // File Handling
                    const gameExec = platformHandler.isGameExecutable(file, targetStats);
                    if (gameExec) {
                        executables.push({ path: fullPath, type: gameExec.type });
                    }
                }
            } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
    return executables;
}

ipcMain.handle('scan-game-executables', (event, directory) => {
    if (!directory || !fs.existsSync(directory)) return [];

    // Check if path is a file (for non-archive downloads like AppImage)
    const stats = fs.statSync(directory);
    if (stats.isFile()) {
        // Return the file itself as an executable if it's a valid game file
        const filename = path.basename(directory);
        const gameExec = platformHandler.isGameExecutable(filename, stats);
        if (gameExec) {
            return [{ path: directory, type: gameExec.type }];
        }

        // Return empty if file is not an executable. 
        // Do NOT scan parent directory as it might be the library root or contain unrelated games.
        return [];
    }

    return scanDir(directory);
});

ipcMain.handle('launch-game', async (event, { executablePath, useWine, args = [], locale, gameId: providedGameId }) => {
    const globalSettings = loadJsonFile(SETTINGS_FILE);
    const wineProvider = globalSettings.wineProvider || 'internal';

    const allConfigs = loadJsonFile(GAME_CONFIG_FILE);
    // PRIORITY: Use providedGameId first (from library item), fallback to executablePath lookup
    let gameId = providedGameId ? String(providedGameId) : null;
    if (!gameId) {
        gameId = Object.keys(allConfigs).find(key => allConfigs[key].executablePath === executablePath);
    }

    console.log('🎮 [launch-game] Starting game:', {
        executablePath,
        useWine,
        gameId,
        providedGameId,
        configKeys: Object.keys(allConfigs)
    });

    if (gameId) {
        allConfigs[gameId] = { ...allConfigs[gameId], lastPlayed: new Date().toISOString() };
        saveJsonFile(GAME_CONFIG_FILE, allConfigs);
        console.log('🎮 [launch-game] Updated lastPlayed for gameId:', gameId);
    } else {
        console.warn('⚠️ [launch-game] No gameId found, playtime will NOT be tracked!');
    }

    // Ensure executable permissions (Linux/AppImage)
    if (platformHandler.ensureExecutable) {
        platformHandler.ensureExecutable(executablePath);
    }

    // Prepare launch command via platform handler
    const { command, finalArgs, detached, extraEnv } = platformHandler.prepareLaunch(
        executablePath,
        args,
        { useWine, wineProvider, globalSettings }
    );

    const gameDir = path.dirname(executablePath);

    console.log('🎮 [launch-game] Spawning:', { command, finalArgs: finalArgs.slice(0, 2), gameDir });

    // Check if game is already running
    if (gameId && runningGames.has(gameId)) {
        console.log('⚠️ [launch-game] Game already running:', gameId);
        return { success: false, error: 'Game is already running' };
    }

    return new Promise((resolve) => {
        try {
            const outLog = path.join(USER_DATA_DIR, 'game-launch.log');
            const errLog = path.join(USER_DATA_DIR, 'game-error.log');
            const out = fs.openSync(outLog, 'a');
            const err = fs.openSync(errLog, 'a');

            const cleanEnv = { ...process.env };
            delete cleanEnv.ELECTRON_RUN_AS_NODE;
            if (locale) {
                cleanEnv.LANG = locale;
                cleanEnv.LC_ALL = locale;
            }

            // [Auto Compatibility] Apply fixes
            const compatEnv = GameCompatibility.getEnv(executablePath, {
                useWine: !!useWine, // Normalize to boolean
                platform: process.platform
            });
            Object.assign(cleanEnv, compatEnv);
            if (extraEnv) Object.assign(cleanEnv, extraEnv);

            const startTime = Date.now();
            const subprocess = spawn(command, finalArgs, {
                cwd: gameDir,
                env: cleanEnv,
                detached,
                stdio: ['ignore', out, err]
            });

            // Track running game
            if (gameId) {
                runningGames.set(gameId, { subprocess, startTime, pid: subprocess.pid });

                // Update Discord status
                try {
                    const library = loadJsonFile(LIBRARY_FILE, []);
                    const gameInfo = library.find(item => String(item.id) === String(gameId));
                    if (gameInfo) {
                        DiscordService.setGameActivity(gameInfo.title, startTime);
                    }
                } catch (e) {
                    console.warn('⚠️ [Main] Failed to update Discord activity:', e.message);
                }

                // Notify frontend that game started
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('game-started', { gameId, pid: subprocess.pid });
                }
            }

            subprocess.on('error', (spawnErr) => {
                console.error('🔥 [launch-game] Spawn error:', spawnErr.message);
                if (gameId) {
                    runningGames.delete(gameId);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('game-stopped', { gameId, error: spawnErr.message });
                    }
                }
                resolve({ success: false, error: spawnErr.message });
            });

            subprocess.on('close', (code) => {
                const duration = Math.floor((Date.now() - startTime) / 1000);
                console.log('🎮 [launch-game] Process closed:', { code, duration, gameId });

                // Reset Discord status to idle
                DiscordService.setIdleActivity();

                // Remove from running games and notify frontend
                if (gameId) {
                    runningGames.delete(gameId);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('game-stopped', { gameId, duration, code });
                    }

                    const currentConfigs = loadJsonFile(GAME_CONFIG_FILE);
                    const previousPlayTime = currentConfigs[gameId]?.playTime || 0;
                    currentConfigs[gameId] = {
                        ...currentConfigs[gameId],
                        playTime: previousPlayTime + duration
                    };
                    const saved = saveJsonFile(GAME_CONFIG_FILE, currentConfigs);
                    console.log('🎮 [launch-game] PlayTime saved:', {
                        gameId,
                        previousPlayTime,
                        duration,
                        newPlayTime: currentConfigs[gameId].playTime,
                        saved
                    });
                }
            });

            subprocess.on('exit', (code, signal) => {
                console.log('🎮 [launch-game] Process exit:', { code, signal });
            });

            subprocess.unref();
            setTimeout(() => resolve({ success: true, logsPath: outLog, pid: subprocess.pid }), 500);
        } catch (error) {
            console.error('🔥 [launch-game] Error:', error.message);
            if (gameId) runningGames.delete(gameId);
            resolve({ success: false, error: error.message });
        }
    });
});

// --- Stop Running Game ---
ipcMain.handle('stop-game', async (event, gameId) => {
    const gameInfo = runningGames.get(String(gameId));
    if (!gameInfo) {
        return { success: false, error: 'Game not running' };
    }

    try {
        const { subprocess } = gameInfo;
        if (subprocess && !subprocess.killed) {
            // Try graceful kill first
            if (process.platform === 'win32') {
                subprocess.kill();
            } else {
                // On Unix, kill the entire process group if detached
                try {
                    process.kill(-subprocess.pid, 'SIGTERM');
                } catch (e) {
                    subprocess.kill('SIGTERM');
                }
            }
            console.log('🎮 [stop-game] Sent SIGTERM to game:', gameId);
            return { success: true };
        }
        return { success: false, error: 'Process already terminated' };
    } catch (err) {
        console.error('🔥 [stop-game] Error:', err.message);
        return { success: false, error: err.message };
    }
});

// --- Check if game is running ---
ipcMain.handle('is-game-running', (event, gameId) => {
    return runningGames.has(String(gameId));
});

// --- Game Shortcuts ---
ipcMain.handle('create-game-shortcut', async (event, { gameId, title, iconPath }) => {
    try {
        const shortcutPath = getShortcutPath(gameId, title);
        if (!shortcutPath) {
            return { success: false, error: 'Unsupported platform' };
        }

        const isDev = process.env.NODE_ENV === 'development';
        const launchArg = `--launch-game=${gameId}`;

        // In development: electron binary + app path
        // In production: the packaged app executable
        let execCommand;
        if (isDev) {
            // Development mode: use npm run electron:dev equivalent
            const appPath = path.join(__dirname, '..');
            execCommand = `"${process.execPath}" "${appPath}" ${launchArg}`;
        } else {
            // Production mode: use the packaged app
            execCommand = `"${process.execPath}" ${launchArg}`;
        }

        if (process.platform === 'win32') {
            // Windows: Create .lnk file
            const shortcutDetails = {
                target: process.execPath,
                args: isDev ? `"${path.join(__dirname, '..')}" ${launchArg}` : launchArg,
                icon: iconPath || process.execPath,
                iconIndex: 0,
                description: `Launch ${title} via ChanoX2`
            };
            const success = shell.writeShortcutLink(shortcutPath, shortcutDetails);
            if (!success) {
                return { success: false, error: 'Failed to create shortcut' };
            }
        } else if (process.platform === 'linux') {
            // Linux: Create .desktop file
            // Try to download game cover image as icon, fallback to app icon
            let finalIconPath = getAppIconPath();
            if (iconPath && iconPath.startsWith('http')) {
                const downloadedIcon = await downloadGameIcon(gameId, iconPath);
                if (downloadedIcon) {
                    finalIconPath = downloadedIcon;
                }
            }

            const desktopEntry = `[Desktop Entry]
Type=Application
Name=${title}
Exec=${execCommand}
Icon=${finalIconPath}
Terminal=false
Categories=Game;
Comment=Launch ${title} via ChanoX2
StartupWMClass=ChanoX2
`;
            // Ensure Desktop directory exists
            const desktopDir = path.join(HOME_DIR, 'Desktop');
            if (!fs.existsSync(desktopDir)) {
                fs.mkdirSync(desktopDir, { recursive: true });
            }
            fs.writeFileSync(shortcutPath, desktopEntry);
            fs.chmodSync(shortcutPath, '755');
        } else if (process.platform === 'darwin') {
            // macOS: Create .command script
            const scriptContent = `#!/bin/bash
${execCommand}
`;
            fs.writeFileSync(shortcutPath, scriptContent);
            fs.chmodSync(shortcutPath, '755');
        }

        console.log('✅ Created game shortcut:', shortcutPath);
        return { success: true, path: shortcutPath };
    } catch (err) {
        console.error('🔥 Failed to create shortcut:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-game-shortcut', async (event, { gameId, title }) => {
    try {
        const shortcutPath = getShortcutPath(gameId, title);
        if (!shortcutPath) {
            return { success: false, error: 'Unsupported platform' };
        }

        if (fs.existsSync(shortcutPath)) {
            fs.unlinkSync(shortcutPath);
            console.log('✅ Deleted game shortcut:', shortcutPath);
            return { success: true };
        }
        return { success: true }; // Already doesn't exist
    } catch (err) {
        console.error('🔥 Failed to delete shortcut:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('has-game-shortcut', async (event, { gameId, title }) => {
    try {
        const shortcutPath = getShortcutPath(gameId, title);
        if (!shortcutPath) return false;
        return fs.existsSync(shortcutPath);
    } catch (err) {
        console.error('Error checking shortcut:', err);
        return false;
    }
});

// --- Auto Update ---
function downloadUpdateFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const request = net.request({
            url,
            method: 'GET',
            redirect: 'follow'
        });

        activeUpdateRequest = request;

        let totalBytes = 0;
        let receivedBytes = 0;
        let isAborted = false;

        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => {});
                activeUpdateRequest = null;
                reject(new Error(`Server returned status code ${response.statusCode}`));
                return;
            }

            totalBytes = parseInt(response.headers['content-length'], 10) || 0;

            response.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (totalBytes > 0) {
                    const percent = Math.round((receivedBytes / totalBytes) * 100);
                    if (updaterWindow && !updaterWindow.isDestroyed()) {
                        updaterWindow.webContents.send('update-progress', percent);
                        updaterWindow.webContents.send('update-status', `Downloading updates... (${percent}%)`);
                    }
                }
            });

            response.pipe(file);
        });

        request.on('abort', () => {
            isAborted = true;
            file.close();
            fs.unlink(destPath, () => {});
            activeUpdateRequest = null;
            reject(new Error('aborted'));
        });

        request.on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            activeUpdateRequest = null;
            reject(err);
        });

        file.on('finish', () => {
            file.close();
            activeUpdateRequest = null;
            if (!isAborted) {
                resolve();
            }
        });

        file.on('error', (err) => {
            fs.unlink(destPath, () => {});
            activeUpdateRequest = null;
            reject(err);
        });

        request.end();
    });
}

async function runUpdateFlow() {
    if (!updateAssetToDownload || !updateDestPath) {
        launchMainApp();
        return;
    }

    try {
        if (updaterWindow && !updaterWindow.isDestroyed()) {
            updaterWindow.webContents.send('update-status', `New version v${latestReleaseVersion} found. Downloading...`);
            updaterWindow.webContents.send('show-download-state');
        }

        await downloadUpdateFile(updateAssetToDownload.browser_download_url, updateDestPath);

        if (updaterWindow && !updaterWindow.isDestroyed()) {
            updaterWindow.webContents.send('update-status', 'Download complete. Launching installer...');
            updaterWindow.webContents.send('hide-all-options');
        }

        setTimeout(async () => {
            try {
                // Set execute permissions on Linux and macOS for downloaded installers
                if (process.platform === 'linux' || process.platform === 'darwin') {
                    try {
                        fs.chmodSync(updateDestPath, 0o755);
                    } catch (chmodErr) {
                        console.warn('⚠️ Failed to set execute permissions:', chmodErr.message);
                    }
                }

                // If running on Linux and executing an AppImage, launch it directly via spawn
                // to bypass KIO Client desktop environment security restrictions
                if (process.platform === 'linux' && updateDestPath.toLowerCase().endsWith('.appimage')) {
                    console.log('🔄 [Updater] Launching AppImage directly via spawn to bypass KIO Client...');
                    const child = spawn(updateDestPath, [], {
                        detached: true,
                        stdio: 'ignore'
                    });
                    child.unref();
                } else {
                    console.log('🔄 [Updater] Launching installer via shell.openPath...');
                    await shell.openPath(updateDestPath);
                }

                setTimeout(() => {
                    app.quit();
                }, 500);
            } catch (err) {
                console.error('Failed to open installer:', err);
                launchMainApp();
            }
        }, 1000);
    } catch (err) {
        if (err.message === 'aborted') {
            console.log('Update download aborted by user.');
            return;
        }
        console.error('Failed to download update:', err);
        launchMainApp();
    }
}

async function checkForUpdates() {
    if (updaterWindow && !updaterWindow.isDestroyed()) {
        updaterWindow.webContents.send('update-status', 'Checking for updates...');
        updaterWindow.webContents.send('hide-all-options');
    }

    const isDev = process.env.NODE_ENV === 'development';
    
    // In development mode, mock the checking process and proceed to app
    if (isDev) {
        setTimeout(() => {
            if (updaterWindow && !updaterWindow.isDestroyed()) {
                updaterWindow.webContents.send('update-status', 'App is up to date. Starting ChanoX2...');
            }
            setTimeout(launchMainApp, 1000);
        }, 1500);
        return;
    }

    let currentVersion = app.getVersion();
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        currentVersion = pkg.version;
    } catch (e) { /* use app version */ }

    try {
        console.log(`🔄 [Updater] Current version (local package.json): v${currentVersion}`);
        const response = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
        if (!response.ok) {
            throw new Error(`Failed to check updates: ${response.statusText}`);
        }

        const data = await response.json();
        const latestVersion = data.tag_name.replace(/^v/, '').trim();
        latestReleaseVersion = latestVersion;

        console.log(`🔄 [Updater] Latest remote version: v${latestVersion}`);

        if (latestVersion !== currentVersion && compareVersions(latestVersion, currentVersion) > 0) {
            const asset = data.assets.find(a => {
                const name = a.name.toLowerCase();
                if (process.platform === 'win32' && name.endsWith('.exe')) return true;
                if (process.platform === 'linux' && (name.endsWith('.deb') || name.endsWith('.appimage'))) return true;
                if (process.platform === 'darwin' && name.endsWith('.dmg')) return true;
                return false;
            });

            if (asset) {
                const downloadUrl = asset.browser_download_url;
                const fileName = asset.name;
                const tempDir = app.getPath('temp');
                const destPath = path.join(tempDir, fileName);

                updateAssetToDownload = asset;
                updateDestPath = destPath;

                // 1. Pre-flight Disk Space Check
                let hasEnoughSpace = true;
                try {
                    const stats = await fs.promises.statfs(tempDir);
                    const freeSpace = stats.bavail * stats.bsize; // in bytes
                    const requiredSpace = asset.size ? asset.size * 2 : 500 * 1024 * 1024;
                    if (freeSpace < requiredSpace) {
                        hasEnoughSpace = false;
                        console.warn(`Disk space too low for update! Free: ${freeSpace}, Needed: ${requiredSpace}`);
                    } else {
                        console.log(`🔄 [Updater] Disk space verified: ${Math.round(freeSpace / (1024 * 1024))}MB available (Need: ${Math.round(requiredSpace / (1024 * 1024))}MB)`);
                    }
                } catch (spaceErr) {
                    console.warn('⚠️ Disk space verification failed, proceeding:', spaceErr.message);
                }

                if (!hasEnoughSpace) {
                    if (updaterWindow && !updaterWindow.isDestroyed()) {
                        updaterWindow.webContents.send('update-status', 'Low disk space. Skipping update for safety...');
                    }
                    setTimeout(launchMainApp, 2500);
                    return;
                }

                // 2. Check settings configuration for Auto Update
                const globalSettings = loadJsonFile(SETTINGS_FILE);
                const autoUpdateEnabled = globalSettings.autoUpdateEnabled !== false;

                console.log(`🔄 [Updater] Auto-update is enabled? ${autoUpdateEnabled}`);
                if (autoUpdateEnabled) {
                    console.log('🔄 [Updater] Downloading update automatically...');
                    runUpdateFlow();
                } else {
                    console.log('🔄 [Updater] Auto-update is disabled. Presenting "Update Now" and "Skip & Launch" options...');
                    if (updaterWindow && !updaterWindow.isDestroyed()) {
                        updaterWindow.webContents.send('update-status', `New version v${latestVersion} is available.`);
                        updaterWindow.webContents.send('show-update-options');
                    }
                }
            } else {
                console.log('🔄 [Updater] No installer found for current platform.');
                if (updaterWindow && !updaterWindow.isDestroyed()) {
                    updaterWindow.webContents.send('update-status', 'No installer found for your OS. Skipping update...');
                }
                setTimeout(launchMainApp, 1500);
            }
        } else {
            console.log('🔄 [Updater] App is up to date.');
            if (updaterWindow && !updaterWindow.isDestroyed()) {
                updaterWindow.webContents.send('update-status', 'App is up to date. Starting ChanoX2...');
            }
            setTimeout(launchMainApp, 1000);
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        if (updaterWindow && !updaterWindow.isDestroyed()) {
            updaterWindow.webContents.send('update-status', 'Offline / Connection error. Starting ChanoX2...');
        }
        setTimeout(launchMainApp, 2000);
    }
}

function createUpdaterWindow() {
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
        setTimeout(checkForUpdates, 800);
    });
}

function launchMainApp() {
    if (!mainWindow) {
        createWindow();
    }

    if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
            if (updaterWindow && !updaterWindow.isDestroyed()) {
                updaterWindow.close();
                updaterWindow = null;
            }
        });
    }

    if (pendingGameLaunch || pendingDeepLink) {
        mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    if (pendingGameLaunch) {
                        console.log('🎮 Sending pending game launch:', pendingGameLaunch);
                        mainWindow.webContents.send('pending-game-launch', { gameId: pendingGameLaunch });
                        pendingGameLaunch = null;
                    }
                    if (pendingDeepLink) {
                        console.log('🔗 Sending pending deep link:', pendingDeepLink);
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

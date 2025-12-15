const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// Set app name to ensure userData path is correct
app.name = 'ChanoX2';

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

// 7zip setup
const pathTo7zip = require('7zip-bin').path7za.replace('app.asar', 'app.asar.unpacked');
const Seven = require('node-7z');

// Fix 7zip permissions on Linux
if (process.platform === 'linux') {
    try {
        if (fs.existsSync(pathTo7zip)) {
            fs.chmodSync(pathTo7zip, '755');
        }
    } catch (err) {
        if (err.code !== 'EROFS') console.error('Failed to set 7zip permissions:', err);
    }
}

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
        console.log('📦 Loading from built files...');
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
}

// ============= IPC Handlers =============

// --- File Extraction ---
ipcMain.handle('extract-file', async (event, { filePath, destPath }) => {
    const runExtraction = (file, dest) => {
        return new Promise((resolve, reject) => {
            const stream = Seven.extractFull(file, dest, {
                $bin: pathTo7zip,
                $progress: true,
                $default: ['-aoa']
            });
            stream.on('end', resolve);
            stream.on('error', reject);
        });
    };

    try {
        await runExtraction(filePath, destPath);

        // Handle tar.gz/tar.xz double extraction
        const lowerPath = filePath.toLowerCase();
        if (lowerPath.endsWith('.tar.gz') || lowerPath.endsWith('.tar.xz') || lowerPath.endsWith('.tgz')) {
            const baseName = path.basename(filePath);
            const tarNameGuess = baseName.replace(/\.[^.]+$/, '');
            const tarPath = path.join(destPath, tarNameGuess);

            if (fs.existsSync(tarPath) && tarPath.toLowerCase().endsWith('.tar')) {
                await runExtraction(tarPath, destPath);
                // Check again before unlinking in case extraction moved/removed it
                if (fs.existsSync(tarPath)) {
                    fs.unlinkSync(tarPath);
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Extraction failed:', error);
        throw error;
    }
});

// --- Directory Operations ---
ipcMain.handle('select-download-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
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

ipcMain.handle('set-download-directory', (event, dirPath) => {
    if (dirPath && fs.existsSync(dirPath)) {
        downloadDirectory = dirPath;
        return true;
    }
    return false;
});

ipcMain.handle('get-download-directory', () => downloadDirectory);

// --- Download Control ---
ipcMain.on('cancel-download', (event, id) => {
    const item = activeDownloads.get(id);
    if (item && !item.isPaused()) {
        item.cancel();
        activeDownloads.delete(id);
    }
});

// --- File System ---
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

// --- Window Controls ---
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());

// --- OAuth Server ---
ipcMain.handle('start-oauth-server', () => {
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
              <h1>✅ Login Successful!</h1>
              <p>You can close this tab and return to ChanoX2.</p>
            </div>
            <script>
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash || window.location.search);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              if (accessToken) {
                fetch('/oauth-tokens', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken, refreshToken })
                }).then(() => setTimeout(() => window.close(), 1500));
              }
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
ipcMain.handle('save-global-settings', (event, settings) => saveJsonFile(SETTINGS_FILE, settings));

ipcMain.handle('get-downloads', () => loadJsonFile(DOWNLOADS_FILE, []));
ipcMain.handle('save-downloads', (event, downloads) => saveJsonFile(DOWNLOADS_FILE, downloads));

// --- Library Persistence ---
ipcMain.handle('get-library', () => loadJsonFile(LIBRARY_FILE, []));
ipcMain.handle('save-library', (event, library) => saveJsonFile(LIBRARY_FILE, library));

// Move archive to archives subfolder
ipcMain.handle('move-archive-to-storage', async (event, { sourcePath, filename }) => {
    try {
        const destPath = path.join(ARCHIVES_DIR, filename);
        // If source and dest are the same, no need to move
        if (sourcePath === destPath) return { success: true, newPath: destPath };
        // Check if source exists
        if (!fs.existsSync(sourcePath)) return { success: false, error: 'Source file not found' };
        // Move file
        await fs.promises.rename(sourcePath, destPath);
        return { success: true, newPath: destPath };
    } catch (err) {
        console.error('Failed to move archive:', err);
        return { success: false, error: err.message };
    }
});

// Delete archive file
ipcMain.handle('delete-archive', async (event, archivePath) => {
    try {
        if (!archivePath || !fs.existsSync(archivePath)) {
            return { success: false, error: 'Archive not found' };
        }
        await fs.promises.unlink(archivePath);
        return { success: true };
    } catch (err) {
        console.error('Failed to delete archive:', err);
        return { success: false, error: err.message };
    }
});

// Delete game folder (extracted)
ipcMain.handle('delete-game-folder', async (event, folderPath) => {
    try {
        if (!folderPath || !fs.existsSync(folderPath)) {
            return { success: false, error: 'Folder not found' };
        }
        await fs.promises.rm(folderPath, { recursive: true, force: true });
        return { success: true };
    } catch (err) {
        console.error('Failed to delete game folder:', err);
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
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    if (process.platform === 'darwin' && file.endsWith('.app')) {
                        executables.push({ path: fullPath, type: 'mac-app' });
                    } else {
                        executables = executables.concat(scanDir(fullPath, depth + 1, maxDepth));
                    }
                } else {
                    const lower = file.toLowerCase();
                    if (lower.endsWith('.exe')) {
                        executables.push({ path: fullPath, type: 'windows-exe' });
                    } else if (process.platform !== 'win32') {
                        const isExecutable = !!(stats.mode & 0o100);
                        const ignoredExts = ['.sh', '.so', '.txt', '.png', '.jpg', '.json', '.xml', '.html', '.css', '.js'];
                        const hasIgnoredExt = ignoredExts.some(ext => lower.endsWith(ext));

                        if ((isExecutable && !hasIgnoredExt) || lower.endsWith('.x86_64') || lower.endsWith('.x86')) {
                            executables.push({ path: fullPath, type: 'native-binary' });
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
    return executables;
}

ipcMain.handle('scan-game-executables', (event, directory) => {
    if (!directory || !fs.existsSync(directory)) return [];
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

    let command = executablePath;
    let finalArgs = args;

    if (useWine) {
        if (wineProvider === 'bottles') {
            const customCmd = globalSettings.externalWineCommand || 'flatpak run com.usebottles.bottles -e %EXE%';
            let cmdString = customCmd.replace('%EXE%', executablePath);
            if (!customCmd.includes('%EXE%')) cmdString = `${customCmd} "${executablePath}"`;

            const parts = cmdString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            if (parts.length > 0) {
                command = parts[0].replace(/"/g, '');
                finalArgs = [...parts.slice(1).map(arg => arg.replace(/"/g, '')), ...args];
            }
        } else {
            command = 'wine';
            finalArgs = [executablePath, ...args];
        }
    } else if (process.platform === 'darwin' && executablePath.endsWith('.app')) {
        command = 'open';
        finalArgs = ['-a', executablePath, ...args];
    }

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

            const startTime = Date.now();
            const subprocess = spawn(command, finalArgs, {
                cwd: gameDir,
                env: cleanEnv,
                detached: wineProvider !== 'bottles',
                stdio: ['ignore', out, err]
            });

            // Track running game
            if (gameId) {
                runningGames.set(gameId, { subprocess, startTime, pid: subprocess.pid });
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

// --- Auto Update ---
async function checkForUpdates() {
    let currentVersion = app.getVersion();
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        currentVersion = pkg.version;
    } catch (e) { /* use app version */ }

    try {
        const response = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.tag_name.replace(/^v/, '').trim();

        if (latestVersion !== currentVersion && compareVersions(latestVersion, currentVersion) > 0) {
            const { response: buttonIndex } = await dialog.showMessageBox(mainWindow, {
                type: 'info',
                buttons: ['Update Now', 'Later'],
                title: 'Update Available',
                message: `A new version (${latestVersion}) is available.`,
                detail: `You are currently on version ${currentVersion}.`
            });

            if (buttonIndex === 0) {
                const asset = data.assets.find(a => {
                    const name = a.name.toLowerCase();
                    if (process.platform === 'win32' && name.endsWith('.exe')) return true;
                    if (process.platform === 'linux' && (name.endsWith('.deb') || name.endsWith('.appimage'))) return true;
                    if (process.platform === 'darwin' && name.endsWith('.dmg')) return true;
                    return false;
                });
                shell.openExternal(asset?.browser_download_url || data.html_url);
            }
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

// ============= App Lifecycle =============

app.whenReady().then(() => {
    createWindow();
    setTimeout(checkForUpdates, 3000);
});

app.on('window-all-closed', () => {
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
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

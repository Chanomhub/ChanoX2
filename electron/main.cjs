const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const platformHandler = require('./platforms/index.cjs');

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

// Parse command line arguments for game launch
function parseLaunchGameArg(args) {
    const launchArg = args.find(arg => arg.startsWith('--launch-game='));
    return launchArg ? launchArg.split('=')[1] : null;
}
let pendingGameLaunch = parseLaunchGameArg(process.argv.slice(1));

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

                // Directory Handling
                if (stats.isDirectory()) {
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
                    const gameExec = platformHandler.isGameExecutable(file, stats);
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
        // If not recognized as executable, scan parent dir
        const parentDir = path.dirname(directory);
        return scanDir(parentDir);
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
    const { command, finalArgs, detached } = platformHandler.prepareLaunch(
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

    // Send pending game launch after window is ready
    if (pendingGameLaunch) {
        mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    console.log('🎮 Sending pending game launch:', pendingGameLaunch);
                    mainWindow.webContents.send('pending-game-launch', { gameId: pendingGameLaunch });
                    pendingGameLaunch = null;
                }
            }, 1500); // Wait for React to mount
        });
    }
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
    app.on('second-instance', (event, commandLine) => {
        // Check for --launch-game argument from shortcut
        const gameId = parseLaunchGameArg(commandLine);
        if (gameId && mainWindow && !mainWindow.isDestroyed()) {
            console.log('🎮 Second instance game launch:', gameId);
            mainWindow.webContents.send('pending-game-launch', { gameId });
        }

        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

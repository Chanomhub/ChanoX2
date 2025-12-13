const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');

// Set app name to ensure userData path is correct (and not default 'Electron')
app.name = 'ChanoX2';

const fs = require('fs');
const { protocol, net } = require('electron');
const { pathToFileURL } = require('url');

process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

// ⚠️ CRITICAL: ต้อง register protocol ก่อน app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'chanox2',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
]);

// appServe removed, handling moved to whenReady


let mainWindow;
const activeDownloads = new Map();
let downloadId = Date.now();
const pathTo7zip = require('7zip-bin').path7za.replace('app.asar', 'app.asar.unpacked');

// Fix 7zip permissions on Linux
if (process.platform === 'linux') {
  try {
    if (fs.existsSync(pathTo7zip)) {
      try {
        fs.chmodSync(pathTo7zip, '755');
        console.log('Set 7zip permissions to 755');
      } catch (err) {
        if (err.code === 'EROFS') {
          console.log('Skipping 7zip chmod (Read-Only Filesystem)');
        } else {
          console.error('Failed to set 7zip permissions:', err);
        }
      }
    }
  } catch (err) {
    console.error('General error setting 7zip permissions:', err);
  }
}

const Seven = require('node-7z');

ipcMain.handle('extract-file', async (event, { filePath, destPath }) => {
  const runExtraction = (file, dest) => {
    return new Promise((resolve, reject) => {
      // Fix permissions lazy check
      if (process.platform === 'linux') {
        try {
          if (fs.existsSync(pathTo7zip)) {
            try {
              fs.chmodSync(pathTo7zip, '755');
            } catch (e) {
              if (e.code !== 'EROFS') throw e;
            }
          }
        } catch (e) { /* ignore */ }
      }

      const stream = Seven.extractFull(file, dest, {
        $bin: pathTo7zip,
        $progress: true,
        $default: ['-aoa'] // Overwrite all existing files without prompt
      });
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });
  };

  try {
    await runExtraction(filePath, destPath);

    // Handle double-extraction for .tar.gz / .tar.xz
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.endsWith('.tar.gz') || lowerPath.endsWith('.tar.xz') || lowerPath.endsWith('.tgz')) {
      const baseName = path.basename(filePath);
      const tarNameGuess = baseName.replace(/\.[^.]+$/, "");
      const tarPath = path.join(destPath, tarNameGuess);

      if (fs.existsSync(tarPath) && tarPath.toLowerCase().endsWith('.tar')) {
        console.log('Detected intermediate tar file, extracting:', tarPath);
        await runExtraction(tarPath, destPath);
        fs.unlinkSync(tarPath);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Extraction failed:', error);
    throw error;
  }
});

// Storage & Download Management
const HOME_DIR = app.getPath('home');
const DEFAULT_DIR = path.join(HOME_DIR, 'ChanoX2Library');

// Ensure default directory exists
try {
  if (!fs.existsSync(DEFAULT_DIR)) {
    fs.mkdirSync(DEFAULT_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create default library directory:', err);
}

let downloadDirectory = DEFAULT_DIR;

ipcMain.handle('select-download-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
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

ipcMain.handle('set-download-directory', (event, path) => {
  if (path && fs.existsSync(path)) {
    downloadDirectory = path;
    return true;
  }
  return false;
});

ipcMain.handle('get-download-directory', () => {
  return downloadDirectory;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:chanox2'
    },
    frame: false,
  });

  // ตรวจสอบ development mode
  const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.NODE_ENV !== 'production');
  const webBuildExists = fs.existsSync(path.join(__dirname, 'web-build'));

  console.log('🚀 Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    isDev,
    webBuildExists,
    __dirname
  });

  if (isDev) {
    // Development mode: ใช้ Metro bundler
    console.log('📱 Loading from Metro dev server (localhost:8081)...');
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: ใช้ไฟล์ที่ build แล้ว
    console.log('📦 Loading from built files (chanox2:// protocol)...');
    mainWindow.loadURL('chanox2://app/');
  }

  // F12 shortcut to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Debug: แสดง navigation events
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', validatedURL, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Successfully loaded!');
  });

  // Handle new window creation
  ipcMain.on('open-new-window', (event, url) => {
    const newWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: false,
        preload: path.join(__dirname, 'preload.js'),
        partition: 'persist:chanox2'
      },
      frame: true,
      autoHideMenuBar: true
    });

    newWindow.loadURL(url);
  });

  // Prevent external navigation - allow OAuth and localhost in dev mode
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('⚠️ Will Navigate to:', url);
    const isAppUrl = url.startsWith('chanox2://');
    const isOauthUrl = url.includes('supabase.co') || url.includes('google.com') || url.includes('accounts.google.com');
    // Allow localhost for dev mode
    const isDevUrl = isDev && url.startsWith('http://localhost');

    console.log('🔍 Navigation checks:', { isAppUrl, isDevUrl, isOauthUrl, isDev });

    if (!isAppUrl && !isDevUrl && !isOauthUrl) {
      event.preventDefault();
      console.warn('⚠️ Blocked navigation to:', url);
      require('electron').shell.openExternal(url);
    } else {
      console.log('✅ Allowing navigation to:', url);
    }
  });

  // Handle window open requests
  // Handle window open requests
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('⚠️ Window Open Request:', url);
    const isOauthUrl = url.includes('supabase.co') || url.includes('google.com') || url.includes('accounts.google.com');

    if (url.startsWith('http') && !isOauthUrl) {
      require('electron').shell.openExternal(url);
      console.warn('Opening external:', url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });


  // Intercept ALL downloads
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
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
        if (state === 'interrupted') {
          mainWindow.webContents.send('download-error', { id, error: 'Download interrupted' });
        } else if (state === 'progressing') {
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
            filename: filename
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

// Cancel download
ipcMain.on('cancel-download', (event, id) => {
  const item = activeDownloads.get(id);
  if (item && !item.isPaused()) {
    item.cancel();
    activeDownloads.delete(id);
  }
});

// File system actions
ipcMain.on('show-item-in-folder', (event, fullPath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(fullPath);
});

ipcMain.on('open-path', async (event, fullPath) => {
  const { shell } = require('electron');
  const error = await shell.openPath(fullPath);
  if (error) {
    console.error('Error opening path:', error);
  }
});

// Open URL in system's default browser (for OAuth)
ipcMain.on('open-external', (event, url) => {
  const { shell } = require('electron');
  console.log('Opening external URL:', url);
  shell.openExternal(url);
});

// --- OAuth Callback Server ---
// Temporary HTTP server to receive OAuth callback from external browser
const http = require('http');
let oauthServer = null;
const OAUTH_CALLBACK_PORT = 9876;

// Start OAuth callback server
ipcMain.handle('start-oauth-server', async () => {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      console.log('OAuth server already running');
      resolve({ port: OAUTH_CALLBACK_PORT });
      return;
    }

    oauthServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${OAUTH_CALLBACK_PORT}`);

      // Check if this is the callback
      if (url.pathname === '/callback') {
        console.log('🔐 OAuth callback received');

        // Get tokens from hash (sent as query params by Supabase redirect)
        // The tokens might be in the URL fragment (#) which we need to handle client-side
        // Or as query params if Supabase uses that format

        // Send a page that extracts hash fragment and posts it
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Login Successful</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                     display: flex; justify-content: center; align-items: center; height: 100vh; 
                     margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { text-align: center; color: white; padding: 40px; }
              h1 { margin-bottom: 10px; }
              p { opacity: 0.9; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Login Successful!</h1>
              <p>You can close this tab and return to ChanoX2.</p>
            </div>
            <script>
              // Extract tokens from URL hash or query
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash || window.location.search);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              
              if (accessToken) {
                // Send tokens to callback endpoint
                fetch('/oauth-tokens', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken, refreshToken })
                }).then(() => {
                  setTimeout(() => window.close(), 1500);
                });
              }
            </script>
          </body>
          </html>
        `);
      } else if (url.pathname === '/oauth-tokens' && req.method === 'POST') {
        // Receive tokens from the callback page
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { accessToken, refreshToken } = JSON.parse(body);
            console.log('✅ OAuth tokens received from browser');

            // Send tokens to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('oauth-callback', { accessToken, refreshToken });
              mainWindow.focus();
            }

            res.writeHead(200);
            res.end('OK');

            // Close the server after a delay
            setTimeout(() => {
              if (oauthServer) {
                oauthServer.close();
                oauthServer = null;
                console.log('OAuth server closed');
              }
            }, 2000);
          } catch (e) {
            console.error('Failed to parse OAuth tokens:', e);
            res.writeHead(400);
            res.end('Bad Request');
          }
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    oauthServer.listen(OAUTH_CALLBACK_PORT, () => {
      console.log(`🔐 OAuth callback server started on port ${OAUTH_CALLBACK_PORT}`);
      resolve({ port: OAUTH_CALLBACK_PORT });
    });

    oauthServer.on('error', (err) => {
      console.error('OAuth server error:', err);
      oauthServer = null;
      reject(err);
    });
  });
});

// Stop OAuth callback server
ipcMain.handle('stop-oauth-server', async () => {
  if (oauthServer) {
    oauthServer.close();
    oauthServer = null;
    console.log('OAuth server stopped');
  }
  return true;
});

// Window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// ⚠️ ต้องเรียก createWindow หลังจาก app.whenReady()
app.whenReady().then(() => {
  const distPath = path.join(__dirname, 'web-build');
  console.log('🚀 App Ready. Registering protocol handler...');

  const partitionSession = session.fromPartition('persist:chanox2');

  // Register protocol on the specific partition/session used by the window
  const result = partitionSession.protocol.handle('chanox2', (request) => {
    // Expected URL: chanox2://app/index.html
    let urlPath = request.url.replace('chanox2://app', '');

    // If just chanox2://app or chanox2://app/, assume index.html
    if (urlPath === '' || urlPath === '/') {
      urlPath = '/index.html';
    }

    urlPath = decodeURIComponent(urlPath);
    // Security check: prevent directory traversal
    if (urlPath.includes('..')) {
      return new Response('Access Denied', { status: 403 });
    }

    console.log('Proto Request:', request.url, '->', urlPath);

    let filePath = path.join(distPath, urlPath);

    // Fallback to index.html if file doesn't exist (SPA routing)
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      console.log('File not found, fallback to index.html:', filePath);
      filePath = path.join(distPath, 'index.html');
    }

    try {
      const content = fs.readFileSync(filePath);

      // Simple MIME type lookup
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'text/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.ico') contentType = 'image/x-icon';
      else if (ext === '.ttf') contentType = 'font/ttf';

      return new Response(content, {
        headers: { 'content-type': contentType }
      });
    } catch (err) {
      console.error('Failed to read file:', filePath, err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  console.log('✅ Protocol registered on partition. Is handled?', partitionSession.protocol.isProtocolHandled('chanox2'));

  createWindow();

  // Check for updates after a short delay to ensure window is ready
  setTimeout(() => {
    checkForUpdates();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- Deep Link / OAuth Callback Handling ---
// Register as default protocol client for chanox2://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('chanox2', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('chanox2');
}

// Handle deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('🔗 Deep link received:', url);
  handleDeepLink(url);
});

// Handle deep link on Windows/Linux (second instance)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Find the deep link URL in command line args
    const url = commandLine.find(arg => arg.startsWith('chanox2://'));
    if (url) {
      console.log('🔗 Deep link from second instance:', url);
      handleDeepLink(url);
    }
    // Focus the main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle OAuth callback deep link
function handleDeepLink(url) {
  if (!url.startsWith('chanox2://callback')) {
    console.log('Deep link is not a callback, ignoring');
    return;
  }

  console.log('🔐 OAuth callback deep link:', url);

  // Extract tokens from URL (they could be in hash or query params)
  // Format: chanox2://callback#access_token=...&refresh_token=...
  // or: chanox2://callback?access_token=...

  let tokenPart = '';
  if (url.includes('#')) {
    tokenPart = url.split('#')[1];
  } else if (url.includes('?')) {
    tokenPart = url.split('?')[1];
  }

  if (tokenPart && mainWindow && !mainWindow.isDestroyed()) {
    // Parse the tokens
    const params = new URLSearchParams(tokenPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
      console.log('✅ Found access token, sending to renderer');
      // Send tokens to renderer process
      mainWindow.webContents.send('oauth-callback', {
        accessToken,
        refreshToken,
      });
      // Focus the window
      mainWindow.focus();
    } else {
      console.error('❌ No access token found in callback URL');
    }
  }
}

// --- Game Launching Logic ---

const GAME_CONFIG_FILE = path.join(app.getPath('userData'), 'games-config.json');

function loadGameConfig() {
  try {
    if (fs.existsSync(GAME_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(GAME_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load game config:', e);
  }
  return {};
}

function saveGameConfig(config) {
  try {
    fs.writeFileSync(GAME_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save game config:', e);
  }
}

ipcMain.handle('get-game-config', (event, gameId) => {
  const config = loadGameConfig();
  return config[gameId] || null;
});

ipcMain.handle('save-game-config', (event, { gameId, config }) => {
  const fullConfig = loadGameConfig();
  fullConfig[gameId] = config;
  saveGameConfig(fullConfig);
  return true;
});

// --- Global Settings Logic ---
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

function loadGlobalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load global settings:', e);
  }
  return {};
}

function saveGlobalSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Failed to save global settings:', e);
  }
}

ipcMain.handle('get-global-settings', () => {
  return loadGlobalSettings();
});

ipcMain.handle('save-global-settings', (event, settings) => {
  saveGlobalSettings(settings);
  return true;
});

// --- Downloads Persistence Logic ---
const DOWNLOADS_FILE = path.join(app.getPath('userData'), 'downloads.json');

function loadDownloads() {
  try {
    if (fs.existsSync(DOWNLOADS_FILE)) {
      return JSON.parse(fs.readFileSync(DOWNLOADS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load downloads:', e);
  }
  return [];
}

function saveDownloads(downloads) {
  try {
    fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(downloads, null, 2));
  } catch (e) {
    console.error('Failed to save downloads:', e);
  }
}

ipcMain.handle('get-downloads', () => {
  return loadDownloads();
});

ipcMain.handle('save-downloads', (event, downloads) => {
  saveDownloads(downloads);
  return true;
});

// --- Auth Persistence Logic ---
const AUTH_FILE = path.join(app.getPath('userData'), 'auth.json');

function loadAuth() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load auth data:', e);
  }
  return {};
}

function saveAuth(data) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save auth data:', e);
  }
}

ipcMain.handle('get-auth-data', (event, key) => {
  const data = loadAuth();
  return data[key] || null;
});

ipcMain.handle('save-auth-data', (event, { key, value }) => {
  const data = loadAuth();
  data[key] = value;
  saveAuth(data);
  return true;
});

ipcMain.handle('remove-auth-data', (event, key) => {
  const data = loadAuth();
  delete data[key];
  saveAuth(data);
  return true;
});

// --- Auto Update Logic ---
async function checkForUpdates() {
  // Use explicit package.json read to ensure freshness
  let currentVersion = app.getVersion();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    currentVersion = pkg.version;
  } catch (e) {
    console.error('Failed to read package.json version', e);
  }

  console.log('Checking for updates... Current version:', currentVersion);

  try {
    const response = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
    if (!response.ok) {
      console.error('Failed to fetch update info:', response.statusText);
      return;
    }

    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v/, '').trim();
    currentVersion = currentVersion.trim();

    console.log('Latest version:', latestVersion, 'Current version:', currentVersion);

    // Simple version comparison (assumes semver X.Y.Z)
    if (latestVersion !== currentVersion && compareVersions(latestVersion, currentVersion) > 0) {
      console.log('Update available!');

      const { response: buttonIndex } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Update Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update Available',
        message: `A new version (${latestVersion}) is available.`,
        detail: `You are currently on version ${currentVersion}.\nWould you like to download and install the update now?`,
        icon: path.join(__dirname, 'assets/icon.png') // Optional, if you have one
      });

      if (buttonIndex === 0) {
        // Find best asset for current platform
        let downloadUrl = data.html_url; // Fallback to release page
        const platform = process.platform;
        const arch = process.arch;

        const asset = data.assets.find(a => {
          const name = a.name.toLowerCase();
          if (platform === 'win32' && name.endsWith('.exe')) return true;
          if (platform === 'linux') {
            if (name.endsWith('.deb') || name.endsWith('.appimage')) return true; // Prefer deb or appimage
          }
          if (platform === 'darwin' && name.endsWith('.dmg')) return true;
          return false;
        });

        if (asset) {
          downloadUrl = asset.browser_download_url;
        }

        console.log('Opening download URL:', downloadUrl);
        const { shell } = require('electron');
        shell.openExternal(downloadUrl);
      }
    } else {
      console.log('App is up to date.');
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// Helper to compare versions
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

function scanDir(dir, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return [];
  let updateFiles = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      // Ignore common junk and metadata folders
      if (file === 'PaxHeader' || file === '__MACOSX' || file.startsWith('.')) continue;

      const fullPath = path.join(dir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          // Double check: if the directory name itself contains PaxHeader (sometimes it's nested strangely), skip
          if (file.includes('PaxHeader')) continue;

          if (process.platform === 'darwin' && file.endsWith('.app')) {
            updateFiles.push({ path: fullPath, type: 'mac-app' });
          } else {
            updateFiles = updateFiles.concat(scanDir(fullPath, depth + 1, maxDepth));
          }
        } else {
          // Skip if parent dir was PaxHeader (though properly handled by recursion check above, safer to be sure)
          if (fullPath.includes('PaxHeader')) continue;

          const lower = file.toLowerCase();
          if (lower.endsWith('.exe')) {
            updateFiles.push({ path: fullPath, type: 'windows-exe' });
          } else if (process.platform !== 'win32') {
            // Check for executable bit
            const isExecutable = !!(stats.mode & 0o100);

            // Common non-binary extensions to ignore even if +x
            const ignoredExts = ['.sh', '.so', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.json', '.xml', '.html', '.css', '.js', '.map', '.config', '.ini', '.md'];
            const hasIgnoredExt = ignoredExts.some(ext => lower.endsWith(ext));

            // Allow files with dots if they are executable and not in ignored list
            // Also explicitly include .x86/.x86_64 regardless of mode if widely used? 
            // Better to stick to +x check for general files, and specific extension check for known binary types

            if (isExecutable && !hasIgnoredExt) {
              updateFiles.push({ path: fullPath, type: 'native-binary' });
            } else if (lower.endsWith('.x86_64') || lower.endsWith('.x86')) {
              // Explicitly add common Linux game binary extensions even if +x is missing (rare but possible in transfer)
              updateFiles.push({ path: fullPath, type: 'native-binary' });
            }
          }
        }
      } catch (e) {
        // ignore access errors
      }
    }
  } catch (e) {
    // ignore dir errors
  }
  return updateFiles;
}

ipcMain.handle('scan-game-executables', (event, directory) => {
  if (!directory || !fs.existsSync(directory)) return [];
  return scanDir(directory);
});

ipcMain.handle('launch-game', async (event, { executablePath, useWine, args = [], locale }) => {
  const { spawn } = require('child_process');

  const globalSettings = loadGlobalSettings();
  const wineProvider = globalSettings.wineProvider || 'internal';

  console.log('Launching game:', executablePath, 'Use Wine:', useWine, 'Locale:', locale, 'Provider:', wineProvider);

  // Identify Game ID by executable path (simple mapping for now, ideally passed in)
  // Limitation: if two games share the same exe, they share config/stats. 
  // Ideally 'launch-game' should receive 'gameId'. Since we don't have it here easily without changing signature
  // and all callers, we'll iterate the config to find the gameId that matches this executablePath.
  const allConfigs = loadGameConfig();
  let gameId = Object.keys(allConfigs).find(key => allConfigs[key].executablePath === executablePath);

  // If not found (e.g. first launch without config), we might miss stats. 
  // In a real app, pass gameId explicitly.
  if (!gameId) {
    console.warn('Game ID not found for path, stats might not save correctly:', executablePath);
  }

  // Update Last Played immediately
  if (gameId) {
    allConfigs[gameId] = {
      ...allConfigs[gameId],
      lastPlayed: new Date().toISOString()
    };
    saveGameConfig(allConfigs);
  }

  let command = executablePath;
  let finalArgs = args;

  if (useWine) {
    if (wineProvider === 'bottles') {
      const customCmd = globalSettings.externalWineCommand || 'flatpak run com.usebottles.bottles -e %EXE%';
      console.log('🍷 Launching via External Command:', customCmd);

      // Replace %EXE% with the actual path
      let cmdString = customCmd.replace('%EXE%', executablePath);

      // Fallback: if user didn't put %EXE%, assume they want to append it
      if (!customCmd.includes('%EXE%')) {
        cmdString = `${customCmd} "${executablePath}"`;
      }

      // Parse command string into command + args
      const parts = cmdString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      if (parts.length > 0) {
        command = parts[0].replace(/"/g, ''); // remove quotes around command if any
        const extraArgs = parts.slice(1).map(arg => arg.replace(/"/g, ''));
        finalArgs = [...extraArgs, ...args];
      } else {
        // Fallback if parsing failed
        command = customCmd;
        finalArgs = [executablePath, ...args];
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

  return new Promise((resolve) => {
    try {
      const logsDir = app.getPath('userData');
      const outLog = path.join(logsDir, 'game-launch.log');
      const errLog = path.join(logsDir, 'game-error.log');

      console.log('Redirecting game output to:', outLog);

      const out = fs.openSync(outLog, 'a');
      const err = fs.openSync(errLog, 'a');

      const cleanEnv = { ...process.env };
      delete cleanEnv.ELECTRON_RUN_AS_NODE;
      delete cleanEnv.ELECTRON_NO_ATTACH_CONSOLE;

      if (locale) {
        cleanEnv.LANG = locale;
        cleanEnv.LC_ALL = locale;
      }

      const startTime = Date.now();

      const subprocess = spawn(command, finalArgs, {
        cwd: gameDir,
        env: cleanEnv,
        detached: wineProvider !== 'bottles', // Try attaching for Bottles/External to see if it fixes window parenting
        stdio: ['ignore', out, err]
      });

      subprocess.on('error', (err) => {
        console.error('Failed to start subprocess:', err);
        resolve({ success: false, error: err.message });
      });

      // Track close event to calculate duration
      subprocess.on('close', (code) => {
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        console.log(`Game process exited with code ${code}. Duration: ${durationSeconds}s`);

        if (gameId) {
          const currentConfigs = loadGameConfig(); // Reload to be safe
          const currentStats = currentConfigs[gameId] || {};
          const previousTime = currentStats.playTime || 0;

          currentConfigs[gameId] = {
            ...currentStats,
            playTime: previousTime + durationSeconds
          };
          saveGameConfig(currentConfigs);
        }
      });

      subprocess.unref();

      setTimeout(() => {
        resolve({ success: true, logsPath: outLog });
      }, 500);

    } catch (error) {
      console.error('Launch failed catch:', error);
      resolve({ success: false, error: error.message });
    }
  });
});
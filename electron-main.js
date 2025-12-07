const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Set app name to ensure userData path is correct (and not default 'Electron')
app.name = 'ChanoX2';

const fs = require('fs');

const { protocol, net } = require('electron');
const { pathToFileURL } = require('url');

const appServe = async (win) => {
  const distPath = path.join(__dirname, 'web-build');

  if (!protocol.isProtocolHandled('chanox2')) {
    protocol.handle('chanox2', (request) => {
      let urlPath = request.url.slice('chanox2://'.length);
      // Remove 'domain' part if present
      if (urlPath.startsWith('-/')) {
        urlPath = urlPath.slice(2);
      } else if (urlPath === '-') {
        urlPath = '';
      }

      console.log('Proto Request:', request.url);
      console.log('Decoded Path:', urlPath);

      const filePath = path.join(distPath, decodeURIComponent(urlPath));
      console.log('Resolved File Path:', filePath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        console.log('File exists, serving.');
        return net.fetch(pathToFileURL(filePath).toString());
      }
      console.log('File not found, serving index.html');
      // SPA Fallback
      return net.fetch(pathToFileURL(path.join(distPath, 'index.html')).toString());
    });
  }

  await win.loadURL('chanox2://-/index.html');
};

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



let mainWindow;
const activeDownloads = new Map();
let downloadId = Date.now();
const pathTo7zip = require('7zip-bin').path7za;

// Fix 7zip permissions on Linux
if (process.platform === 'linux') {
  try {
    if (fs.existsSync(pathTo7zip)) {
      fs.chmodSync(pathTo7zip, '755');
      console.log('Set 7zip permissions to 755');
    }
  } catch (err) {
    console.error('Failed to set 7zip permissions:', err);
  }
}

const Seven = require('node-7z');

ipcMain.handle('extract-file', async (event, { filePath, destPath }) => {
  const runExtraction = (file, dest) => {
    return new Promise((resolve, reject) => {
      // Fix permissions lazy check
      if (process.platform === 'linux') {
        try {
          if (fs.existsSync(pathTo7zip)) fs.chmodSync(pathTo7zip, '755');
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
      // Check if a .tar file exists in the destination
      // Usually it has the same base name, but let's look for any .tar if we want to be aggressive, 
      // or just strict name matching. 
      // Strict: original name "file.tar.xz" -> extracts "file.tar" usually.
      const baseName = path.basename(filePath);
      // Remove the last extension (.xz, .gz) to guess the tar name
      const tarNameGuess = baseName.replace(/\.[^.]+$/, "");
      const tarPath = path.join(destPath, tarNameGuess);

      if (fs.existsSync(tarPath) && tarPath.toLowerCase().endsWith('.tar')) {
        console.log('Detected intermediate tar file, extracting:', tarPath);
        await runExtraction(tarPath, destPath);
        // Cleanup the .tar file
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
      webSecurity: false, // Allow iframes to load external sites
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:chanox2' // Explicitly persist session data
    },
    frame: false, // Frameless window
    // titleBarStyle: 'hidden', // Optional: MacOS specific style

  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    appServe(mainWindow);
  }

  // F12 shortcut to toggle DevTools (works in both dev and production)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Handle new window creation
  ipcMain.on('open-new-window', (event, url) => {
    const newWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Needed for some sites
        webSecurity: false,
        preload: path.join(__dirname, 'preload.js'),
        partition: 'persist:chanox2' // Share session with main window
      },
      frame: true,
      autoHideMenuBar: true
    });

    newWindow.loadURL(url);

    // Optional: Add custom menu or toolbar here if needed
  });

  // Intercept ALL downloads (from any source including iframes and new windows)
  // We attach this to the session so it covers all windows sharing the session
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const id = downloadId++;
    const filename = item.getFilename();

    // Set the save path to our configured directory
    const savePath = path.join(downloadDirectory, filename);
    item.setSavePath(savePath);

    // ALWAYS send to mainWindow, regardless of where the download started
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

app.whenReady().then(createWindow);

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

// --- Game Launching Logic ---

const GAME_CONFIG_FILE = path.join(app.getPath('userData'), 'games-config.json');

// Helper to load game config
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

// Helper to save game config
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

// Recursive scan for executables
function scanDir(dir, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return [];
  let updateFiles = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      // Filter out system/metadata folders
      if (file === 'PaxHeader' || file === '__MACOSX' || file.startsWith('.')) continue;

      const fullPath = path.join(dir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          // MacOS .app is a directory but treated as an executable
          if (process.platform === 'darwin' && file.endsWith('.app')) {
            updateFiles.push({ path: fullPath, type: 'mac-app' });
          } else {
            updateFiles = updateFiles.concat(scanDir(fullPath, depth + 1, maxDepth));
          }
        } else {
          // Check extensions
          const lower = file.toLowerCase();
          if (lower.endsWith('.exe')) {
            updateFiles.push({ path: fullPath, type: 'windows-exe' });
          } else if (process.platform !== 'win32') {
            // Check for executable bit on Linux/Mac
            // constants.S_IXUSR = 0o100
            if (!!(stats.mode & 0o100) && !lower.endsWith('.sh') && !lower.endsWith('.so') && !lower.includes('.')) {
              // Heuristic: generic binary (no extension usually, or specifically trusted)
              updateFiles.push({ path: fullPath, type: 'native-binary' });
            }
            // Also include .sh if we want? Maybe risky. Let's stick to binaries or strict extensions.
            if (lower.endsWith('.x86_64') || lower.endsWith('.x86')) {
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

  console.log('Launching game:', executablePath, 'Use Wine:', useWine, 'Locale:', locale);

  let command = executablePath;
  let finalArgs = args;

  // ... (command selection logic remains partially same, simplified for brevity in replacement if needed, but here we just need to insert locale handling)
  if (useWine) {
    command = 'wine';
    finalArgs = [executablePath, ...args];
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

      // Sanitize environment variables to prevent child process from inheriting Electron state
      const cleanEnv = { ...process.env };
      delete cleanEnv.ELECTRON_RUN_AS_NODE;
      delete cleanEnv.ELECTRON_NO_ATTACH_CONSOLE;

      // Apply Locale if specified
      if (locale) {
        cleanEnv.LANG = locale;
        cleanEnv.LC_ALL = locale;
      }

      const subprocess = spawn(command, finalArgs, {
        cwd: gameDir, // Run from game directory
        env: cleanEnv,
        detached: true,
        stdio: ['ignore', out, err]
      });

      subprocess.on('error', (err) => {
        console.error('Failed to start subprocess:', err);
        resolve({ success: false, error: err.message });
      });

      subprocess.unref();

      // Give it a tiny moment to fail synchronously-ish
      setTimeout(() => {
        resolve({ success: true, logsPath: outLog });
      }, 500);

    } catch (error) {
      console.error('Launch failed catch:', error);
      resolve({ success: false, error: error.message });
    }
  });
});

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const fs = require('fs');

const serve = require('electron-serve');
const loadURL = serve.default || serve;
const appServe = loadURL({ directory: 'dist' });

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
        $progress: true
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
      frame: false,
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

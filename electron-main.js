const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
const activeDownloads = new Map();
let downloadId = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // Allow iframes to load external sites
      preload: path.join(__dirname, 'preload.js')
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'web', 'index.html'));
  }

  // Intercept ALL downloads (from any source including iframes)
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const id = downloadId++;
    const filename = item.getFilename();

    // Notify renderer about new download
    webContents.send('download-started', {
      id,
      filename,
      totalBytes: item.getTotalBytes()
    });

    activeDownloads.set(id, item);

    let lastReceivedBytes = 0;
    let lastTime = Date.now();

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        webContents.send('download-error', { id, error: 'Download interrupted' });
      } else if (state === 'progressing') {
        const currentTime = Date.now();
        const currentBytes = item.getReceivedBytes();
        const timeDiff = (currentTime - lastTime) / 1000;
        const bytesDiff = currentBytes - lastReceivedBytes;
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

        webContents.send('download-progress', {
          id,
          receivedBytes: currentBytes,
          totalBytes: item.getTotalBytes(),
          speed: Math.round(speed)
        });

        lastReceivedBytes = currentBytes;
        lastTime = currentTime;
      }
    });

    item.once('done', (event, state) => {
      activeDownloads.delete(id);
      if (state === 'completed') {
        webContents.send('download-complete', {
          id,
          path: item.getSavePath(),
          filename: filename
        });
      } else {
        webContents.send('download-error', {
          id,
          error: state === 'cancelled' ? 'Download cancelled' : 'Download failed'
        });
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

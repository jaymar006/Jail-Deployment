const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const http = require('http');

// Check if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Single instance lock to prevent multiple app instances from locking database
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;

  // Configure User Data path for embedded SQLite database storage
  process.env.USER_DATA_PATH = app.getPath('userData');
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  const PORT = process.env.PORT || '10000';
  process.env.PORT = PORT;

  console.log('🚀 Launching Jail Information System Desktop App');
  console.log(`📂 App User Data Directory: ${process.env.USER_DATA_PATH}`);

  // Start embedded Express backend server
  try {
    require(path.join(__dirname, 'backend', 'server.js'));
  } catch (err) {
    console.error('❌ Failed to start embedded backend server:', err);
  }

  // Poll local Express backend health check before opening browser window
  function waitForBackend(url, callback, timeoutMs = 15000) {
    const startTime = Date.now();
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          callback(true);
        } else if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 300);
        } else {
          callback(false);
        }
      }).on('error', () => {
        if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 300);
        } else {
          callback(false);
        }
      });
    };
    check();
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1366,
      height: 868,
      minWidth: 1024,
      minHeight: 700,
      title: 'Jail Information & Visitor Management System',
      show: false,
      backgroundColor: '#0f172a', // Sleek dark slate background while loading
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false
      }
    });

    // Remove default top menu bar for clean app UI (press Alt to view if needed)
    Menu.setApplicationMenu(null);

    const appUrl = `http://localhost:${PORT}`;

    waitForBackend(`http://localhost:${PORT}/api/health`, (ready) => {
      if (ready) {
        console.log(`✅ Backend ready. Loading application UI at ${appUrl}`);
        mainWindow.loadURL(appUrl);
      } else {
        console.warn(`⚠️ Backend timeout. Attempting direct load at ${appUrl}`);
        mainWindow.loadURL(appUrl);
      }
    });

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    // Open target blank links in external default browser instead of new Electron windows
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // IPC Handlers
    ipcMain.handle('get-app-version', () => app.getVersion());
    ipcMain.handle('open-external', async (event, url) => {
      await shell.openExternal(url);
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

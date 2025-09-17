const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Register an IPC handler so preload can ask the main process to perform
  // network requests using the privileged net API. This avoids renderer CSP
  // problems when contacting external services.
  ipcMain.handle('fargo-suggestions', async (event, payload) => {
    try {
      // payload expected to have { url: '<fargo search url>', player: '<name>' }
      // If url is missing, construct a simple search URL from payload.player
      const targetUrl = (payload && payload.url) ? payload.url : (payload && payload.player ? `https://api.fargorate.com/search?search=${encodeURIComponent(payload.player)}` : 'https://api.fargorate.com/search');
      const body = JSON.stringify(payload || {});
      return await new Promise((resolve) => {
        const request = net.request({
          method: 'POST',
          url: 'https://us-central1-digital-pool.cloudfunctions.net/getFargoRating',
          redirect: 'follow',
        });

        request.setHeader('Content-Type', 'application/json');

        let raw = '';
        request.on('response', (response) => {
          response.on('data', (chunk) => { raw += chunk.toString(); });
          response.on('end', () => {
            try {
              const parsed = JSON.parse(raw || 'null');
              resolve(Array.isArray(parsed) ? parsed : []);
            } catch (err) {
              console.error('fargo-suggestions parse error', err, raw, 'payload-url:', targetUrl);
              resolve([]);
            }
          });
        });

        request.on('error', (err) => {
          console.error('fargo-suggestions request error', err);
          resolve([]);
        });

        request.write(body);
        request.end();
      });
    } catch (err) {
      console.error('fargo-suggestions handler error', err);
      return [];
    }
  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Run the existing server.js to start the WebSocket and HTTP endpoints
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'EduSim Virtual Lab Agent',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load the Vercel URL
  // Replace this with your actual Vercel deployment URL
  mainWindow.loadURL('https://sih-26-edu-sim.vercel.app/'); 

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

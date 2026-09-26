'use strict';
// Electron entry point: opens the game (web/index.html) in a window, and runs the
// co-op networking (plain TCP, newline-delimited JSON) on behalf of the page.
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    backgroundColor: '#000000',
    title: 'Emberfall',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
  // F11 toggles fullscreen, F12 opens devtools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    if (input.key === 'F12') { win.webContents.toggleDevTools(); event.preventDefault(); }
  });
  // Never navigate away from the game or open popups.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // keep the in-game Fullscreen setting in sync with the real window state
  win.on('enter-full-screen', () => win.webContents.send('fullscreen-changed', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen-changed', false));
  // pause audio/rendering work when minimized (turned off while in a co-op session)
  win.webContents.setBackgroundThrottling(true);
  win.on('closed', () => { win = null; stopNet(); });
}

ipcMain.on('quit', () => app.quit());
ipcMain.on('fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); });

// Co-op networking lives in netmain.js (plain TCP between players' games).
const coop = require('./netmain')(ipcMain, () => win);
const stopNet = coop.stop;

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { stopNet(); if (process.platform !== 'darwin') app.quit(); });

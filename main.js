'use strict';
// Electron entry point: opens the game (web/index.html) in a window, and runs the
// co-op networking (plain TCP, newline-delimited JSON) on behalf of the page.
const { app, BrowserWindow, ipcMain, Menu, session, shell } = require('electron');
const path = require('path');
// The game was called Emberfall before; keep using that data folder so everyone's saves carry over.
app.setPath('userData', path.join(app.getPath('appData'), 'Emberfall'));

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    backgroundColor: '#000000',
    title: 'Shattercrown',
    icon: path.join(__dirname, 'web', 'icon.png'),
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

// ---- Camel Studios account: the sign-in page (camells1.github.io/account) opens in a small window.
// After sign-in the page sets #rl-auth=<json> in its address; we pass that to the game and close the window.
const ACCOUNT_URL = 'https://camells1.github.io/account/?app=shattercrown';
const AUTH_PARTITION = 'persist:camel-auth';
let loginWin = null;
ipcMain.handle('account-open', () => new Promise((resolve) => {
  if (loginWin) { loginWin.focus(); return resolve(null); }
  loginWin = new BrowserWindow({
    width: 480, height: 760, parent: win || undefined, modal: !!win, resizable: false, minimizable: false,
    title: 'Camel Studios Account', backgroundColor: '#07060d', autoHideMenuBar: true, icon: path.join(__dirname, 'web', 'icon.png'),
    webPreferences: { partition: AUTH_PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  let done = false;
  const finish = (data) => { if (done) return; done = true; resolve(data); if (loginWin && !loginWin.isDestroyed()) loginWin.close(); };
  const check = (_e, url) => {
    const m = /#rl-auth=(.+)$/.exec(url || '');
    if (!m) return;
    try { finish(JSON.parse(decodeURIComponent(m[1]))); } catch (_) { finish(null); }
  };
  loginWin.webContents.on('did-navigate-in-page', check);
  loginWin.webContents.on('did-navigate', check);
  loginWin.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  loginWin.on('closed', () => { loginWin = null; finish(null); });
  loginWin.loadURL(ACCOUNT_URL);
}));
ipcMain.handle('account-logout', async () => { try { await session.fromPartition(AUTH_PARTITION).clearStorageData(); } catch (_) {} return true; });
ipcMain.on('fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); });

// Co-op networking lives in netmain.js (plain TCP between players' games).
const coop = require('./netmain')(ipcMain, () => win);
const stopNet = coop.stop;

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { stopNet(); if (process.platform !== 'darwin') app.quit(); });

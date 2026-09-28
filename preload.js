'use strict';
// Exposes the few desktop-only features the game uses. The web build works without it.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('quit'),
  setFullscreen: (on) => ipcRenderer.send('fullscreen', !!on),
  // called with true/false whenever the window enters or leaves fullscreen (F11, OS controls...)
  onFullscreen: (fn) => ipcRenderer.on('fullscreen-changed', (_e, on) => fn(!!on)),
  // Camel Studios account: open() shows the sign-in window and resolves with the session (or null)
  account: {
    open: () => ipcRenderer.invoke('account-open'),
    logout: () => ipcRenderer.invoke('account-logout'),
  },
  // co-op networking (see main.js). Messages are strings (one JSON object each).
  net: {
    host: (port) => ipcRenderer.invoke('net-host', port | 0),
    join: (host, port) => ipcRenderer.invoke('net-join', String(host), port | 0),
    stop: () => ipcRenderer.invoke('net-stop'),
    addresses: () => ipcRenderer.invoke('net-addresses'),
    send: (to, line) => ipcRenderer.send('net-send', to | 0, String(line)),
    kick: (id) => ipcRenderer.send('net-kick', id | 0),
    awake: (on) => ipcRenderer.send('net-awake', !!on),
    onMessage: (fn) => ipcRenderer.on('net-msg', (_e, m) => fn(m.from, m.line)),
    onStatus: (fn) => ipcRenderer.on('net-status', (_e, s) => fn(s)),
  },
});

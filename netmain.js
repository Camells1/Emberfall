'use strict';
// Co-op networking for Shattercrown (Electron main process).
// One player hosts (TCP server); friends connect to host:port. The page talks to this
// through preload.js (window.electronAPI.net); every message is one line of JSON.
const net = require('net');
const os = require('os');

module.exports = function setupNet(ipcMain, getWin) {
  let server = null;
  const clients = new Map(); // id -> socket (host side)
  let upstream = null;       // socket to the host (client side)
  let nextId = 1;
  const MAX_CLIENTS = 3;
  const MAX_BUFFER = 2 * 1024 * 1024;

  const toPage = (channel, data) => { const win = getWin(); if (win && !win.isDestroyed()) win.webContents.send(channel, data); };

  function wire(sock, id) {
    let buf = '';
    sock.setNoDelay(true);
    sock.setKeepAlive(true, 5000);
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      if (buf.length > MAX_BUFFER) { sock.destroy(); return; }
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (line) toPage('net-msg', { from: id, line });
      }
    });
    sock.on('close', () => {
      if (id === 0) { if (upstream === sock) upstream = null; } else clients.delete(id);
      toPage('net-status', { type: 'closed', id });
    });
    sock.on('error', (e) => toPage('net-status', { type: 'error', id, message: e.message }));
  }

  function localAddresses() {
    const out = [];
    for (const [name, list] of Object.entries(os.networkInterfaces())) {
      for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
    }
    return out;
  }

  function stopNet() {
    if (upstream) { try { upstream.destroy(); } catch (e) { /* ignore */ } upstream = null; }
    for (const s of clients.values()) { try { s.destroy(); } catch (e) { /* ignore */ } }
    clients.clear();
    if (server) { try { server.close(); } catch (e) { /* ignore */ } server = null; }
    const win = getWin(); if (win && !win.isDestroyed()) win.webContents.setBackgroundThrottling(true);
  }

  ipcMain.handle('net-host', (_e, port) => new Promise((resolve) => {
    stopNet();
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    server = net.createServer((sock) => {
      if (clients.size >= MAX_CLIENTS) { sock.end(JSON.stringify({ t: 'reject', reason: 'The game is full (4 players max).' }) + '\n'); return; }
      const id = nextId++;
      clients.set(id, sock);
      wire(sock, id);
      toPage('net-status', { type: 'connect', id, address: sock.remoteAddress });
    });
    server.on('error', (e) => { finish({ ok: false, error: e.code === 'EADDRINUSE' ? 'Port ' + port + ' is already in use.' : e.message }); stopNet(); });
    server.listen(port, '0.0.0.0', () => {
      const win = getWin(); if (win) win.webContents.setBackgroundThrottling(false); // keep the world running when minimized
      finish({ ok: true, port, addresses: localAddresses() });
    });
  }));

  ipcMain.handle('net-join', (_e, host, port) => new Promise((resolve) => {
    stopNet();
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const sock = net.connect({ host, port });
    sock.setTimeout(8000);
    sock.on('timeout', () => { finish({ ok: false, error: 'Timed out. Check the address, and that the host is hosting.' }); sock.destroy(); });
    sock.once('connect', () => {
      sock.setTimeout(0);
      upstream = sock;
      wire(sock, 0);
      const win = getWin(); if (win) win.webContents.setBackgroundThrottling(false);
      finish({ ok: true });
    });
    sock.once('error', (e) => finish({ ok: false, error: e.code === 'ECONNREFUSED' ? 'Connection refused: nobody is hosting on that address and port.' : e.message }));
  }));

  // to: 0 = the host (when we are a client), -1 = every client (when hosting), n = one client
  ipcMain.on('net-send', (_e, to, line) => {
    if (typeof line !== 'string') return;
    const data = line + '\n';
    if (to === 0) { if (upstream) upstream.write(data); return; }
    if (to === -1) { for (const s of clients.values()) s.write(data); return; }
    const s = clients.get(to);
    if (s) s.write(data);
  });
  ipcMain.on('net-kick', (_e, id) => { const s = clients.get(id); if (s) s.destroy(); });
  ipcMain.handle('net-stop', () => { stopNet(); return true; });
  ipcMain.handle('net-addresses', () => localAddresses());
  // room-code (WebRTC) games run in the page; keep them running when minimized
  ipcMain.on('net-awake', (_e, on) => { const win = getWin(); if (win && !win.isDestroyed()) win.webContents.setBackgroundThrottling(!on); });


  return { stop: stopNet };
};

'use strict';
// Camel Studios account (shared with Riftline). Signing in happens on the account page
// (camells1.github.io/account), opened by the desktop app; this keeps the session and shows who you are.
// Uses the public Firebase REST API with the studio's public web key, so no SDK is needed.
(function (R) {
  const API_KEY = 'AIzaSyAgEzMO9dzwwHr-iyvDhRho-DY1-gg9os4';
  const STORE = 'shattercrown-auth';
  const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || sessionStorage.getItem(STORE) || 'null'); } catch (_) { return null; } };
  const write = (data, stay) => {
    try {
      localStorage.removeItem(STORE); sessionStorage.removeItem(STORE);
      if (data) (stay ? localStorage : sessionStorage).setItem(STORE, JSON.stringify(data));
    } catch (_) {}
  };
  const splitId = (dn) => { const i = (dn || '').lastIndexOf('#'); return i > 0 ? [dn.slice(0, i), dn.slice(i + 1)] : [dn || '', '']; };
  async function post(url, body, form) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? new URLSearchParams(body) : JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error((json.error && json.error.message) || ('HTTP ' + res.status)); e.code = json.error && json.error.message; throw e; }
    return json;
  }

  // The account page sends the session back with postMessage, then closes itself
  const SITE = 'https://camells1.github.io';
  function webLogin() {
    return new Promise((resolve) => {
      const w = window.open(SITE + '/account/?app=shattercrown', 'camel-login', 'popup,width=480,height=760');
      if (!w) { if (R.UI && R.UI.toast) R.UI.toast('Allow pop-ups for this site to log in.', 'bad'); resolve(null); return; }
      const onMsg = (e) => { if (e.origin === SITE && e.data && e.data.type === 'camel-auth') done(e.data.data); };
      const timer = setInterval(() => { if (w.closed) done(null); }, 600);
      function done(d) { clearInterval(timer); window.removeEventListener('message', onMsg); resolve(d); }
      window.addEventListener('message', onMsg);
    });
  }

  const A = R.Account = {
    user: null, // { uid, email, name, tag }
    get signedIn() { return !!A.user; },
    // Desktop app: a sign-in window. Browser version (Chromebooks etc.): a pop-up from the account site.
    get available() { return true; },
    label() { return A.user ? (A.user.name ? `${A.user.name}#${A.user.tag}` : A.user.email) : ''; },

    // Refresh the saved session (every launch). Resolves to the user or null.
    async restore() {
      const saved = read();
      if (!saved || !saved.refreshToken) { A.user = null; return null; }
      try {
        const tok = await post(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, { grant_type: 'refresh_token', refresh_token: saved.refreshToken }, true);
        saved.refreshToken = tok.refresh_token; write(saved, saved.stay);
        const look = await post(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, { idToken: tok.id_token });
        const u = (look.users && look.users[0]) || {};
        const [name, tag] = splitId(u.displayName);
        A.user = { uid: tok.user_id, email: u.email || saved.email, name, tag };
        return A.user;
      } catch (e) {
        if (/TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(e.code || '')) { write(null); A.user = null; }
        return null;
      }
    },

    // Opens the sign-in window. Resolves to the user (or null if the window was closed).
    async login() {
      const desk = window.electronAPI && window.electronAPI.account;
      const data = desk ? await desk.open() : await webLogin();
      if (!data || !data.refreshToken) return null;
      write({ refreshToken: data.refreshToken, uid: data.uid, email: data.email, stay: data.stay !== false }, data.stay !== false);
      return A.restore();
    },

    async logout() {
      write(null); A.user = null;
      if (window.electronAPI && window.electronAPI.account) await window.electronAPI.account.logout();
    },
  };

  // Stay logged in: refresh the saved session shortly after start, then redraw the title screen
  setTimeout(() => {
    A.restore().then((u) => { if (u && R.UI && R.UI.current === 'title') try { R.UI.refresh(); } catch (_) {} });
  }, 300);
})(window.RPG);

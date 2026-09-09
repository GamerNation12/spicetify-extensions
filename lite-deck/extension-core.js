// NAME: LiteDeck
// AUTHOR: GamerNation12
// DESCRIPTION: Ultra-lightweight fast controls + queue + search panel with one-click Lite Mode for laggy setups.

(() => {
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[LiteDeck]', ...args); };

  // VERSIONING (Semantic Versioning: MAJOR.MINOR.PATCH)
  // Source of truth is version.json in this folder. Fallback only.
  let LITEDECK_VERSION = '1.0.0';
  let LITEDECK_CHANGELOG_LINES = [
    'Initial release: fast controls + queue + search panel with Lite Mode toggle.'
  ];

  const BTN_ID = 'litedeck-fab';
  const PANEL_ID = 'litedeck-panel';
  const STYLES_ID = 'litedeck-styles';
  const LITE_STYLES_ID = 'litedeck-lite-styles';
  const LS_LITE = 'litedeck:liteMode';
  const LS_DISMISSED = 'litedeck_dismissed_update';

  async function waitUntil(predicate, opts = {}) {
    const { initial = 50, max = 500, timeout = 20000 } = opts;
    let delay = initial;
    const start = Date.now();
    if (predicate()) return;
    while (!predicate()) {
      if (Date.now() - start > timeout) throw new Error('waitUntil timeout');
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(max, Math.floor(delay * 1.6));
    }
  }

  async function waitForSpicetify() {
    await waitUntil(() => typeof Spicetify !== 'undefined' && Spicetify?.Player && Spicetify?.Platform);
  }

  function fmt(ms) {
    if (ms == null || isNaN(ms)) return '0:00';
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  async function checkForUpdates() {
    try {
      const res = await fetch('https://spicetify-extensions.vercel.app/api/version?folder=lite-deck');
      if (!res.ok) return;
      const json = await res.json();
      if (json.version && json.version !== LITEDECK_VERSION && LITEDECK_VERSION !== 'Loading...') {
        if (localStorage.getItem(LS_DISMISSED) !== json.version) {
          Spicetify.showNotification('⚡ LiteDeck update available: v' + json.version);
          localStorage.setItem(LS_DISMISSED, json.version);
        }
      }
    } catch (e) {
      log('update check failed', e);
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const s = document.createElement('style');
    s.id = STYLES_ID;
    s.textContent = `
      #${BTN_ID}{position:fixed;right:16px;bottom:96px;z-index:9998;background:#1ed760;color:#000;border:none;border-radius:999px;padding:10px 16px;font-weight:800;font-size:.8rem;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4);font-family:sans-serif}
      #${PANEL_ID}{position:fixed;right:16px;bottom:148px;z-index:9998;width:min(92vw,340px);max-height:60vh;overflow:auto;background:#121212;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;font-family:sans-serif;font-size:.85rem}
      #${PANEL_ID} h3{margin:0 0 4px;font-size:1rem}
      #${PANEL_ID} .ld-sub{opacity:.6;font-size:.75rem;margin-bottom:10px}
      #${PANEL_ID} .ld-row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
      #${PANEL_ID} img.ld-cover{width:48px;height:48px;border-radius:8px;background:#222;object-fit:cover}
      #${PANEL_ID} .ld-title{font-weight:700}
      #${PANEL_ID} .ld-artist{opacity:.65;font-size:.78rem}
      #${PANEL_ID} .ld-controls{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
      #${PANEL_ID} button{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:7px 12px;font-size:.78rem;font-weight:700;cursor:pointer}
      #${PANEL_ID} button:hover{background:rgba(255,255,255,.14)}
      #${PANEL_ID} button.ld-primary{background:#1ed760;border-color:#1ed760;color:#000}
      #${PANEL_ID} input[type=text]{width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.3);color:#fff;font-size:.82rem;box-sizing:border-box}
      #${PANEL_ID} input[type=range]{width:100%;accent-color:#1ed760}
      #${PANEL_ID} .ld-meta{display:flex;justify-content:space-between;font-size:.72rem;opacity:.6;margin:2px 0 6px}
      #${PANEL_ID} .ld-track{padding:7px 4px;border-top:1px solid rgba(255,255,255,.07);cursor:pointer}
      #${PANEL_ID} .ld-track:hover{background:rgba(255,255,255,.05)}
      #${PANEL_ID} .ld-track .a{opacity:.6;font-size:.75rem}
      #${PANEL_ID} .ld-toggle{display:flex;justify-content:space-between;align-items:center;margin:8px 0;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px}
    `;
    document.head.appendChild(s);
  }

  function applyLiteMode(on) {
    let s = document.getElementById(LITE_STYLES_ID);
    if (on && !s) {
      s = document.createElement('style');
      s.id = LITE_STYLES_ID;
      // No blur, no animation, hide heavy canvas/video. Plain and fast.
      s.textContent = `
        *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;animation:none!important;transition:none!important}
        video,canvas{display:none!important}
      `;
      document.head.appendChild(s);
    } else if (!on && s) {
      s.remove();
    }
    try { localStorage.setItem(LS_LITE, on ? '1' : '0'); } catch {}
  }

  function isLiteMode() {
    try { return localStorage.getItem(LS_LITE) === '1'; } catch { return false; }
  }

  function getTrack() {
    try { return Spicetify.Player?.data?.item || null; } catch { return null; }
  }

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return;
    injectStyles();

    const p = el('div');
    p.id = PANEL_ID;
    p.style.display = 'none';

    const h = el('h3', null, 'LiteDeck');
    const sub = el('div', 'ld-sub', 'Fast mode — no blur, no animations.');
    p.appendChild(h);
    p.appendChild(sub);

    // Lite mode toggle
    const tog = el('div', 'ld-toggle');
    const label = el('span', null, 'Lite Mode (kill blur/canvas)');
    const btn = el('button', null, isLiteMode() ? 'ON' : 'OFF');
    btn.onclick = () => {
      const next = !isLiteMode();
      applyLiteMode(next);
      btn.textContent = next ? 'ON' : 'OFF';
    };
    tog.appendChild(label);
    tog.appendChild(btn);
    p.appendChild(tog);

    // Now playing
    const row = el('div', 'ld-row');
    const img = el('img', 'ld-cover');
    const info = el('div');
    const title = el('div', 'ld-title', 'Nothing playing');
    const artist = el('div', 'ld-artist', '');
    info.appendChild(title);
    info.appendChild(artist);
    row.appendChild(img);
    row.appendChild(info);
    p.appendChild(row);

    // Seek
    const seek = document.createElement('input');
    seek.type = 'range';
    seek.min = '0';
    seek.value = '0';
    const meta = el('div', 'ld-meta');
    const cur = el('span', null, '0:00');
    const dur = el('span', null, '0:00');
    meta.appendChild(cur);
    meta.appendChild(dur);
    p.appendChild(seek);
    p.appendChild(meta);
    seek.onchange = () => {
      try { Spicetify.Player?.seek?.(Number(seek.value)); } catch {}
    };

    // Controls
    const ctrls = el('div', 'ld-controls');
    const mkBtn = (t, fn, primary) => {
      const b = el('button', primary ? 'ld-primary' : null, t);
      b.onclick = fn;
      ctrls.appendChild(b);
      return b;
    };
    mkBtn('⏮', () => { try { Spicetify.Player?.back?.(); } catch {} });
    const playBtn = mkBtn('▶', () => { try { Spicetify.Player?.togglePlay?.(); } catch {} }, true);
    mkBtn('⏭', () => { try { Spicetify.Player?.next?.(); } catch {} });
    mkBtn('🔀', () => { try { Spicetify.Player?.toggleShuffle?.(); } catch {} });
    mkBtn('🔁', () => {
      try {
        const c = Spicetify.Player?.getRepeat?.();
        Spicetify.Player?.setRepeat?.(c === 1 ? 0 : c === 2 ? 1 : 2);
      } catch {}
    });
    p.appendChild(ctrls);

    // Search
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Fast search tracks…';
    const resBox = el('div');
    p.appendChild(search);
    p.appendChild(resBox);
    let st = null;
    search.oninput = () => {
      clearTimeout(st);
      const v = search.value.trim();
      if (v.length < 2) { resBox.innerHTML = ''; return; }
      st = setTimeout(async () => {
        try {
          const res = await Spicetify.CosmosAsync.get(
            'https://api.spotify.com/v1/search?q=' + encodeURIComponent(v) + '&type=track&limit=8'
          );
          resBox.innerHTML = '';
          (res?.tracks?.items || []).forEach((t) => {
            const d = el('div', 'ld-track');
            d.innerHTML = '';
            const tn = el('div', null, t.name);
            const an = el('div', 'a', (t.artists || []).map((a) => a.name).join(', '));
            d.appendChild(tn);
            d.appendChild(an);
            d.onclick = () => {
              try {
                if (Spicetify.Player?.playUri) Spicetify.Player.playUri(t.uri);
              } catch {}
            };
            resBox.appendChild(d);
          });
        } catch { resBox.innerHTML = ''; }
      }, 400);
    };

    // Queue
    const qHead = el('div', 'ld-sub', 'Up next');
    const qBox = el('div');
    const qBtn = el('button', null, '↻ Refresh queue');
    qBtn.onclick = () => refreshQueue(qBox);
    p.appendChild(qHead);
    p.appendChild(qBtn);
    p.appendChild(qBox);

    document.body.appendChild(p);

    // 1s tick only when playing — the perf win
    setInterval(() => {
      try {
        const track = getTrack();
        const paused = Spicetify.Player?.data?.isPaused !== false;
        const durMs = Spicetify.Player?.getDuration?.() || track?.duration?.milliseconds || 0;
        const prog = Spicetify.Player?.getProgress?.() || 0;
        if (p.style.display === 'none') return;
        title.textContent = track?.name || 'Nothing playing';
        artist.textContent = (track?.artists || []).map((a) => a.name).join(', ');
        const art = track?.album?.images?.[0]?.url || '';
        if (art) { img.src = art; img.style.display = ''; } else { img.removeAttribute('src'); img.style.display = 'none'; }
        seek.max = String(durMs || 0);
        if (document.activeElement !== seek) seek.value = String(Math.min(prog, durMs || 0));
        cur.textContent = fmt(prog);
        dur.textContent = fmt(durMs);
        playBtn.textContent = paused ? '▶' : '⏸';
      } catch {}
    }, 1000);

    refreshQueue(qBox);

    const rerender = () => refreshQueue(qBox);
    try { Spicetify.Player?.addEventListener?.('songchange', rerender); } catch {}
  }

  function refreshQueue(box) {
    if (!box) return;
    try {
      const q = Spicetify.Queue?.queue?._list || Spicetify.Queue?.queue || [];
      const list = Array.isArray(q) ? q.slice(0, 15) : [];
      box.innerHTML = '';
      if (!list.length) {
        box.appendChild(el('div', 'ld-artist', 'Queue empty.'));
        return;
      }
      list.forEach((item) => {
        const name = item?.name || item?.title || item?.uri || 'Unknown';
        const uri = item?.uri || item?.contextTrack?.uri || null;
        const d = el('div', 'ld-track', null);
        d.appendChild(el('div', null, String(name)));
        if (uri) d.onclick = () => { try { Spicetify.Player?.playUri?.(uri); } catch {} };
        box.appendChild(d);
      });
    } catch { box.innerHTML = ''; }
  }

  function buildButton() {
    if (document.getElementById(BTN_ID)) return;
    const b = el('button', null, '⚡ Lite');
    b.id = BTN_ID;
    b.onclick = () => {
      const p = document.getElementById(PANEL_ID);
      if (!p) return;
      p.style.display = p.style.display === 'none' ? '' : 'none';
    };
    document.body.appendChild(b);
  }

  (async function main() {
    await waitForSpicetify();
    // Restore lite mode early (before heavy visuals settle)
    if (isLiteMode()) applyLiteMode(true);
    injectStyles();
    buildButton();
    buildPanel();
    checkForUpdates();
    log('initialized v' + LITEDECK_VERSION);
  })();
})();

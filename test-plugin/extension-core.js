// NAME: Spicetify Diagnostics & Accent Customizer (Test Plugin)
// AUTHOR: GamerNation12
// DESCRIPTION: A test plugin featuring an interactive API diagnostics center, quick action player triggers, neon RGB lightbars, and a native Spotify profile settings toggle.

(() => {
  const STYLES_ID = 'nprd-test-styles';
  const FLOATING_BTN_ID = 'nprd-test-floating-btn';
  const PANEL_ID = 'nprd-test-panel';
  const BACKDROP_ID = 'nprd-test-backdrop';
  const AURA_ID = 'nprd-test-aura';

  // THEME PRESETS DEFINITIONS
  const PRESETS = {
    rainbow: { name: 'Rainbow Flow', class: 'nprd-theme-rainbow' },
    cyberpunk: { name: 'Cyberpunk Glow', class: 'nprd-theme-cyberpunk' },
    emerald: { name: 'Spotify Emerald', class: 'nprd-theme-emerald' },
    ocean: { name: 'Deep Ocean', class: 'nprd-theme-ocean' },
    sunset: { name: 'Sunset Pulse', class: 'nprd-theme-sunset' }
  };

  // SYSTEM LOG CONSOLE HISTORY
  const consoleHistory = [];
  let updateIntervalId = null;

  // VERSIONING (Semantic Versioning: MAJOR.MINOR.PATCH)
  // Source of truth is version.json in this folder. This fallback is used
  // only if JSON cannot be loaded (e.g. raw GitHub request blocked).
  let NPTD_VERSION = '1.1.0';
  let NPTD_CHANGELOG_LINES = [
    'Upgraded Diagnostics Center with accent theme selector.',
    'Added simulated live audio visualizer wave synchronized with player state.',
    'Integrated scrollable, glassmorphic telemetry console event logger.'
  ];

  async function waitUntil(predicate, opts = {}) {
    const { initial = 50, max = 500, timeout = 20000 } = opts;
    let delay = initial;
    const start = Date.now();
    if (predicate()) return;
    while (!predicate()) {
      if (Date.now() - start > timeout) throw new Error('waitUntil timeout');
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(max, Math.floor(delay * 1.6));
    }
  }

  async function waitForSpicetify() {
    await waitUntil(() => typeof Spicetify !== 'undefined' && Spicetify?.Player && Spicetify?.Platform && Spicetify?.Menu);
  }

  function logToConsole(message, type = 'info') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem = { timeStr, message, type };
    
    consoleHistory.push(logItem);
    if (consoleHistory.length > 50) {
      consoleHistory.shift();
    }
    
    const consoleLog = document.getElementById('nprd-test-console-log');
    if (consoleLog) {
      const line = document.createElement('div');
      line.className = 'nprd-console-line';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'nprd-console-time';
      timeSpan.textContent = `[${timeStr}]`;
      
      const msgSpan = document.createElement('span');
      msgSpan.className = `nprd-console-msg ${type}`;
      msgSpan.textContent = message;
      
      line.appendChild(timeSpan);
      line.appendChild(msgSpan);
      consoleLog.appendChild(line);
      consoleLog.scrollTop = consoleLog.scrollHeight;
    }
  }

  async function checkForUpdates() {
    try {
      const REMOTE_VERSION = 'https://spicetify-extensions.vercel.app/api/version?folder=test-plugin';
      const res = await fetch(REMOTE_VERSION);
      if (res.ok) {
        const json = await res.json();
        if (json.version && json.version !== NPTD_VERSION && NPTD_VERSION !== 'Loading...') {
          const dismissed = localStorage.getItem('nptd_test_dismissed_update');
          if (dismissed !== json.version) {
              logToConsole(`Newer version detected on GitHub: v${json.version}!`, 'success');
              logToConsole("Restart Spotify or run 'spicetify apply' to auto-update.", 'info');
              Spicetify.showNotification(`⚡ Test Plugin Update Available: v${json.version} detected!`);
              localStorage.setItem('nptd_test_dismissed_update', json.version);
          }
        }
      }
    } catch (e) {
      console.warn('[Test Plugin] Failed to check for updates:', e);
    }
  }

  function showChangelogPopup() {
    if (document.getElementById('nprd-test-changelog')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'nprd-test-changelog-backdrop';
    backdrop.style.position = 'fixed';
    backdrop.style.inset = '0';
    backdrop.style.background = 'rgba(0,0,0,0.6)';
    backdrop.style.zIndex = '10009';
    backdrop.style.backdropFilter = 'blur(6px)';

    const modal = document.createElement('div');
    modal.id = 'nprd-test-changelog';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'rgba(18,18,18,0.85)';
    modal.style.backdropFilter = 'blur(25px)';
    modal.style.padding = '24px';
    modal.style.borderRadius = '20px';
    modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12)';
    modal.style.color = 'var(--spice-text, #fff)';
    modal.style.width = 'min(90vw, 420px)';
    modal.style.fontSize = '0.9rem';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '14px';
    modal.style.zIndex = '10010';
    modal.style.fontFamily = 'sans-serif';

    const activePreset = localStorage.getItem('testPlugin:preset') || 'rainbow';
    const presetData = PRESETS[activePreset] || PRESETS.rainbow;

    modal.innerHTML = `
      <div style="position: absolute; top: -3px; left: 0; right: 0; height: 3px; border-top-left-radius: 20px; border-top-right-radius: 20px;" class="${presetData.class}"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px; text-align: left;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-weight:800;font-size:1.1rem;background:linear-gradient(135deg, #1ed760 0%, #00f2fe 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Plugin Auto-Updated! ⚡</span>
          <span style="opacity:0.6;font-size:0.75rem;">Diagnostics & Accent Customizer v${NPTD_VERSION}</span>
        </div>
        <button id="nprd-test-changelog-close" style="background:rgba(255,255,255,0.05);border:none;color:var(--spice-text,#fff);border-radius:50%;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background 0.2s;">✕</button>
      </div>
      <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:#1ed760;font-weight:800;text-align:left;">What's New:</div>
      <ul id="nprd-test-changelog-list" style="margin:0 0 0 18px;padding:0;list-style:disc;text-align:left;line-height:1.4;font-size:0.85rem;color:var(--spice-subtext,#b3b3b3);display:flex;flex-direction:column;gap:8px;"></ul>
      <button id="nprd-test-changelog-ok" style="margin-top:8px;align-self:flex-end;background:#1ed760;border:none;border-radius:999px;padding:8px 18px;font-size:0.8rem;font-weight:700;cursor:pointer;color:#000;transition:transform 0.1s;">
        Got it
      </button>
    `;

    const closeBtn = modal.querySelector('#nprd-test-changelog-close');
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.15)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.05)';

    const listEl = modal.querySelector('#nprd-test-changelog-list');
    NPTD_CHANGELOG_LINES.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line;
      listEl.appendChild(li);
    });

    const close = () => {
      backdrop.remove();
      modal.remove();
    };

    modal.querySelector('#nprd-test-changelog-close').onclick = close;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) close();
    };
    
    const okBtn = modal.querySelector('#nprd-test-changelog-ok');
    okBtn.onmouseover = () => okBtn.style.transform = 'scale(1.04)';
    okBtn.onmouseout = () => okBtn.style.transform = 'none';
    okBtn.onclick = (e) => {
      e.stopPropagation();
      close();
    };

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
  }

  function unmountTestPlugin() {
    document.getElementById(STYLES_ID)?.remove();
    document.getElementById(FLOATING_BTN_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(BACKDROP_ID)?.remove();
    document.getElementById(AURA_ID)?.remove();
    
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      updateIntervalId = null;
    }

    try {
      Spicetify.Player.removeEventListener('songchange', handleSongChange);
      Spicetify.Player.removeEventListener('playchange', handlePlayChange);
    } catch (e) {}
    console.log('[Test Plugin] Unmounted successfully.');
  }

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.innerHTML = `
      #${FLOATING_BTN_ID} {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: rgba(30, 215, 96, 0.9);
        color: #000;
        box-shadow: 0 8px 30px rgba(30, 215, 96, 0.4), 0 0 0 1px rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        cursor: pointer;
        z-index: 10008;
        transition: transform 0.2s cubic-bezier(0.3, 0, 0.2, 1), background 0.2s, box-shadow 0.2s;
        border: none;
      }
      #${FLOATING_BTN_ID}:hover {
        transform: scale(1.1) rotate(15deg);
        background: #1ed760;
        box-shadow: 0 12px 40px rgba(30, 215, 96, 0.6), 0 0 0 1px rgba(255,255,255,0.2);
      }
      
      #${BACKDROP_ID} {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10009;
        backdrop-filter: blur(4px);
      }
      
      #${PANEL_ID} {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(18, 18, 18, 0.85);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        padding: 24px;
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12);
        flex-direction: column;
        width: min(90vw, 460px);
        max-height: 85vh;
        overflow-y: auto;
        z-index: 10010;
        gap: 16px;
        box-sizing: border-box;
        color: var(--spice-text, #fff);
        font-family: sans-serif;
      }
      #${PANEL_ID}::-webkit-scrollbar {
        width: 6px;
      }
      #${PANEL_ID}::-webkit-scrollbar-track {
        background: transparent;
      }
      #${PANEL_ID}::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 99px;
      }
      #${PANEL_ID}::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      
      .nprd-test-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 12px;
        margin-bottom: 4px;
      }
      .nprd-test-header h2 {
        font-size: 1.15rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.01em;
        background: linear-gradient(135deg, #1ed760 0%, #00f2fe 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .nprd-test-close {
        background: rgba(255,255,255,0.05);
        border: none;
        color: var(--spice-text, #fff);
        border-radius: 50%;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: background 0.2s;
      }
      .nprd-test-close:hover {
        background: rgba(255,255,255,0.15);
      }
      
      .nprd-test-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        padding: 12px;
        border: 1px solid rgba(255,255,255,0.05);
      }
      .nprd-test-section-title {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #1ed760;
        margin-bottom: 4px;
        text-align: left;
      }
      
      .nprd-test-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;
      }
      .nprd-test-row span {
        color: var(--spice-subtext, #b3b3b3);
      }
      .nprd-test-row strong {
        color: var(--spice-text, #fff);
        font-weight: 600;
        max-width: 240px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .nprd-test-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      
      .nprd-test-btn {
        background: rgba(255,255,255,0.05);
        color: var(--spice-text, #fff);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 600;
        transition: background 0.2s, border-color 0.2s, transform 0.1s;
        text-align: center;
      }
      .nprd-test-btn:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.2);
      }
      .nprd-test-btn:active {
        transform: scale(0.97);
      }
      .nprd-test-btn-accent {
        background: #1ed760;
        color: #000;
        border: none;
      }
      .nprd-test-btn-accent:hover {
        background: #1db954;
      }
      
      .nprd-test-badge {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .nprd-test-badge-ok {
        background: rgba(30,215,96,0.15);
        color: #1ed760;
        border: 1px solid rgba(30,215,96,0.25);
      }
      .nprd-test-badge-err {
        background: rgba(226,37,43,0.15);
        color: #e2252b;
        border: 1px solid rgba(226,37,43,0.25);
      }
      
      /* Preset Theme Gradients */
      .nprd-theme-rainbow {
        background: linear-gradient(90deg, #ff007f, #7f00ff, #00f2fe, #4facfe, #ff007f);
        background-size: 400% 400%;
        animation: nprd-aura-flow 4s ease infinite;
        box-shadow: 0 0 12px rgba(0, 242, 254, 0.6);
      }
      .nprd-theme-cyberpunk {
        background: linear-gradient(90deg, #ff0055, #f39c12, #00e5ff, #ff0055);
        background-size: 400% 400%;
        animation: nprd-aura-flow 4s ease infinite;
        box-shadow: 0 0 12px rgba(255, 0, 85, 0.6);
      }
      .nprd-theme-emerald {
        background: linear-gradient(90deg, #1db954, #1ed760, #128c7e, #1db954);
        background-size: 400% 400%;
        animation: nprd-aura-flow 4s ease infinite;
        box-shadow: 0 0 12px rgba(30, 215, 96, 0.6);
      }
      .nprd-theme-ocean {
        background: linear-gradient(90deg, #0052d4, #4364f7, #6fb1fc, #0052d4);
        background-size: 400% 400%;
        animation: nprd-aura-flow 4s ease infinite;
        box-shadow: 0 0 12px rgba(67, 100, 247, 0.6);
      }
      .nprd-theme-sunset {
        background: linear-gradient(90deg, #ff416c, #ff4b2b, #f12711, #f5af19, #ff416c);
        background-size: 400% 400%;
        animation: nprd-aura-flow 4s ease infinite;
        box-shadow: 0 0 12px rgba(255, 65, 108, 0.6);
      }

      /* Dropdown and selector controls */
      .nprd-select-container {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      .nprd-dropdown {
        flex: 1;
        background: rgba(255,255,255,0.06);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 0.8rem;
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s;
      }
      .nprd-dropdown:focus {
        border-color: #1ed760;
      }
      .nprd-dropdown option {
        background: #181818;
        color: #fff;
      }

      /* Simulated Audio Visualizer Wave */
      .nprd-visualizer-container {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 4px;
        height: 28px;
        margin-top: 10px;
        background: rgba(0,0,0,0.25);
        border-radius: 8px;
        padding: 6px;
      }
      .nprd-visualizer-bar {
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, #00f2fe, #1ed760);
        border-radius: 2px;
        transform: scaleY(0.15);
        transform-origin: bottom;
        transition: transform 0.2s ease, background 0.3s ease;
      }
      
      .nprd-visualizer-container.playing .nprd-visualizer-bar {
        animation: nprd-bar-bounce 1s ease-in-out infinite alternate;
      }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(1) { animation-duration: 0.8s; animation-delay: 0.1s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(2) { animation-duration: 0.5s; animation-delay: 0.3s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(3) { animation-duration: 0.7s; animation-delay: 0.0s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(4) { animation-duration: 0.6s; animation-delay: 0.4s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(5) { animation-duration: 0.9s; animation-delay: 0.2s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(6) { animation-duration: 0.5s; animation-delay: 0.5s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(7) { animation-duration: 0.8s; animation-delay: 0.3s; }
      .nprd-visualizer-container.playing .nprd-visualizer-bar:nth-child(8) { animation-duration: 0.6s; animation-delay: 0.1s; }

      @keyframes nprd-bar-bounce {
        0% { transform: scaleY(0.15); }
        100% { transform: scaleY(1.0); }
      }

      /* Glassmorphic Event Logger Console */
      .nprd-console-container {
        display: flex;
        flex-direction: column;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 10px;
        height: 110px;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 0.72rem;
        box-sizing: border-box;
      }
      .nprd-console-log {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-right: 4px;
      }
      .nprd-console-log::-webkit-scrollbar {
        width: 4px;
      }
      .nprd-console-log::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.02);
      }
      .nprd-console-log::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
      }
      .nprd-console-line {
        line-height: 1.3;
        word-break: break-all;
        text-align: left;
      }
      .nprd-console-time {
        color: rgba(255, 255, 255, 0.35);
        margin-right: 6px;
      }
      .nprd-console-msg {
        color: rgba(255, 255, 255, 0.85);
      }
      .nprd-console-msg.info {
        color: #00e5ff;
      }
      .nprd-console-msg.success {
        color: #1ed760;
      }
      .nprd-console-msg.event {
        color: #ff9f43;
      }
      
      /* Neon Lightbar Aura Underglow */
      #${AURA_ID} {
        position: absolute;
        top: -3px;
        left: 0;
        right: 0;
        height: 3px;
        z-index: 1000;
      }
      @keyframes nprd-aura-flow {
        0% { background-position: 0% 50% }
        50% { background-position: 100% 50% }
        100% { background-position: 0% 50% }
      }
      
      .main-nowPlayingBar-container {
        position: relative !important;
      }
    `;
    document.head.appendChild(style);
  }

  function togglePanel() {
    const panel = document.getElementById(PANEL_ID);
    const backdrop = document.getElementById(BACKDROP_ID);
    if (!panel || !backdrop) return;
    
    const isHidden = panel.style.display === 'none' || panel.style.display === '';
    panel.style.display = isHidden ? 'flex' : 'none';
    backdrop.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
      logToConsole('Diagnostics Portal opened.', 'info');
      // Force scroll on mount
      setTimeout(() => {
        const consoleLog = document.getElementById('nprd-test-console-log');
        if (consoleLog) consoleLog.scrollTop = consoleLog.scrollHeight;
      }, 50);
    }
  }

  function toggleAura(show) {
    document.getElementById(AURA_ID)?.remove();
    if (!show) {
      logToConsole('Pulse RGB Underglow deactivated.', 'info');
      return;
    }
    
    const target = document.querySelector('.main-nowPlayingBar-container') || document.querySelector('[data-testid="now-playing-bar"]') || document.querySelector('.main-nowPlayingBar-nowPlayingBar');
    if (target) {
      const aura = document.createElement('div');
      aura.id = AURA_ID;
      
      const activePreset = localStorage.getItem('testPlugin:preset') || 'rainbow';
      const presetClass = PRESETS[activePreset]?.class || 'nprd-theme-rainbow';
      aura.className = presetClass;
      
      target.appendChild(aura);
      logToConsole(`Pulse RGB Underglow activated with theme: ${PRESETS[activePreset]?.name || activePreset}`, 'success');
    }
  }

  function changePreset(presetKey) {
    if (!PRESETS[presetKey]) return;
    localStorage.setItem('testPlugin:preset', presetKey);
    logToConsole(`Accent theme updated: ${PRESETS[presetKey].name}`, 'success');
    
    const aura = document.getElementById(AURA_ID);
    if (aura) {
      Object.values(PRESETS).forEach(p => {
        aura.classList.remove(p.class);
      });
      aura.classList.add(PRESETS[presetKey].class);
    }
  }

  function updateVisualizerState() {
    const visualizer = document.getElementById('nprd-test-visualizer');
    if (!visualizer) return;
    
    const isPlaying = Spicetify.Player.isPlaying();
    if (isPlaying) {
      visualizer.classList.add('playing');
    } else {
      visualizer.classList.remove('playing');
    }
  }

  function handleSongChange() {
    updatePanelTrackInfo();
    updateVisualizerState();
    
    const item = Spicetify.Player.data?.item;
    if (item) {
      logToConsole(`Track changed: ${item.name} • ${item.artists?.map(a => a.name).join(', ')}`, 'event');
    }
  }

  function handlePlayChange() {
    updateVisualizerState();
    const isPlaying = Spicetify.Player.isPlaying();
    logToConsole(`Playback ${isPlaying ? 'Resumed' : 'Paused'}`, isPlaying ? 'success' : 'info');
  }

  function runDiagnostics() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    
    const checkApi = (val) => {
      return val 
        ? `<span class="nprd-test-badge nprd-test-badge-ok">✓ Active</span>`
        : `<span class="nprd-test-badge nprd-test-badge-err">✗ Missing</span>`;
    };
    
    panel.querySelector('#nprd-test-api-spicetify').innerHTML = checkApi(typeof Spicetify !== 'undefined');
    panel.querySelector('#nprd-test-api-player').innerHTML = checkApi(Spicetify?.Player);
    panel.querySelector('#nprd-test-api-platform').innerHTML = checkApi(Spicetify?.Platform);
    
    logToConsole('Diagnostics API check completed.', 'info');
  }

  function updatePanelTrackInfo() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    
    const item = Spicetify.Player.data?.item;
    if (item) {
      panel.querySelector('#nprd-test-track-title').textContent = item.name || 'Unknown Track';
      panel.querySelector('#nprd-test-track-artist').textContent = item.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
      panel.querySelector('#nprd-test-track-album').textContent = item.album?.name || 'Unknown Album';
    } else {
      panel.querySelector('#nprd-test-track-title').textContent = 'No track active';
      panel.querySelector('#nprd-test-track-artist').textContent = '-';
      panel.querySelector('#nprd-test-track-album').textContent = '-';
    }
  }

  function mountTestPlugin() {
    unmountTestPlugin();
    injectStyles();
    
    logToConsole(`System initialized: Diagnostics & Accent Customizer v${NPTD_VERSION}`, 'success');

    // Startup Version Check for Changelog
    const seenVersion = localStorage.getItem('nptd_test_version');
    const currentVerStr = String(NPTD_VERSION);
    if (seenVersion !== currentVerStr && currentVerStr !== 'Loading...' && currentVerStr !== 'Unknown' && currentVerStr !== 'undefined') {
      localStorage.setItem('nptd_test_version', currentVerStr);
      setTimeout(() => {
        if (typeof showChangelogPopup === 'function') showChangelogPopup();
      }, 2500);
    }

    // Auto-update checker polling
    if (!updateIntervalId) {
      checkForUpdates();
      updateIntervalId = setInterval(checkForUpdates, 60000);
    }

    const btn = document.createElement('button');
    btn.id = FLOATING_BTN_ID;
    btn.innerHTML = '⚡';
    btn.title = `Spicetify Diagnostics Hub v${NPTD_VERSION}`;
    btn.onclick = togglePanel;
    document.body.appendChild(btn);
    
    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.onclick = togglePanel;
    document.body.appendChild(backdrop);
    
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="nprd-test-header">
        <h2>Diagnostic Portal v${NPTD_VERSION} ⚡</h2>
        <button class="nprd-test-close">✕</button>
      </div>
      
      <div class="nprd-test-section">
        <div class="nprd-test-section-title">🎵 Active Track</div>
        <div class="nprd-test-row">
          <span>Title:</span>
          <strong id="nprd-test-track-title">Loading...</strong>
        </div>
        <div class="nprd-test-row">
          <span>Artist:</span>
          <strong id="nprd-test-track-artist">Loading...</strong>
        </div>
        <div class="nprd-test-row">
          <span>Album:</span>
          <strong id="nprd-test-track-album">Loading...</strong>
        </div>
        <div class="nprd-visualizer-container" id="nprd-test-visualizer">
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
          <div class="nprd-visualizer-bar"></div>
        </div>
      </div>

      <div class="nprd-test-section">
        <div class="nprd-test-section-title">🌈 Neon Accent Theme</div>
        <div class="nprd-select-container">
          <select class="nprd-dropdown" id="nprd-test-action-preset">
            <option value="rainbow">Rainbow Flow (Default)</option>
            <option value="cyberpunk">Cyberpunk Glow</option>
            <option value="emerald">Spotify Emerald</option>
            <option value="ocean">Deep Ocean</option>
            <option value="sunset">Sunset Pulse</option>
          </select>
          <input type="checkbox" id="nprd-test-action-aura" style="width:16px;height:16px;accent-color:#1ed760;cursor:pointer;" title="Toggle Aura Lightbar">
        </div>
      </div>
      
      <div class="nprd-test-section">
        <div class="nprd-test-section-title">📊 Spicetify APIs Health</div>
        <div class="nprd-test-row">
          <span>Spicetify Namespace:</span>
          <strong id="nprd-test-api-spicetify">-</strong>
        </div>
        <div class="nprd-test-row">
          <span>Player API:</span>
          <strong id="nprd-test-api-player">-</strong>
        </div>
        <div class="nprd-test-row">
          <span>Platform API:</span>
          <strong id="nprd-test-api-platform">-</strong>
        </div>
      </div>
      
      <div class="nprd-test-section">
        <div class="nprd-test-section-title">⚡ Interactive Suite</div>
        <div class="nprd-test-grid">
          <button class="nprd-test-btn" id="nprd-test-action-toast">🔔 Trigger Toast</button>
          <button class="nprd-test-btn" id="nprd-test-action-dump">💾 Dump metadata</button>
          <button class="nprd-test-btn" id="nprd-test-action-play">⏯️ Play/Pause</button>
          <button class="nprd-test-btn" id="nprd-test-action-next">⏭️ Skip Track</button>
          <button class="nprd-test-btn" id="nprd-test-action-devtools" title="Copy DevTools Command" style="grid-column: span 2;">🛠️ Copy DevTools Cmd</button>
        </div>
      </div>

      <div class="nprd-test-section" style="padding: 8px;">
        <div class="nprd-test-section-title" style="margin-bottom: 4px; padding-left: 4px;">📟 System Telemetry Console</div>
        <div class="nprd-console-container">
          <div class="nprd-console-log" id="nprd-test-console-log"></div>
        </div>
      </div>
    `;
    panel.querySelector('.nprd-test-close').onclick = togglePanel;
    document.body.appendChild(panel);
    
    // Repopulate console history
    const consoleLog = panel.querySelector('#nprd-test-console-log');
    if (consoleLog) {
      consoleHistory.forEach(item => {
        const line = document.createElement('div');
        line.className = 'nprd-console-line';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'nprd-console-time';
        timeSpan.textContent = `[${item.timeStr}]`;
        
        const msgSpan = document.createElement('span');
        msgSpan.className = `nprd-console-msg ${item.type}`;
        msgSpan.textContent = item.message;
        
        line.appendChild(timeSpan);
        line.appendChild(msgSpan);
        consoleLog.appendChild(line);
      });
      consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    panel.querySelector('#nprd-test-action-toast').onclick = () => {
      logToConsole('Triggered Toast notification.', 'info');
      Spicetify.showNotification(`Diagnostics alert! Hello from Spicetify Test Plugin v${NPTD_VERSION}! ⚡`);
    };
    panel.querySelector('#nprd-test-action-dump').onclick = () => {
      console.log('[Test Plugin] Full Active Track Metadata Dump:', Spicetify.Player.data);
      logToConsole('Dumped track metadata to developer logs.', 'success');
      Spicetify.showNotification("Metadata dumped to Developer Console! 💾 (F12 to view)");
    };
    panel.querySelector('#nprd-test-action-play').onclick = () => {
      Spicetify.Player.togglePlay();
      logToConsole('Toggled playback state.', 'info');
    };
    panel.querySelector('#nprd-test-action-next').onclick = () => {
      Spicetify.Player.next();
      logToConsole('Skipped current track.', 'info');
    };
    panel.querySelector('#nprd-test-action-devtools').onclick = () => {
      const cmd = 'spicetify enable-devtools';
      if (Spicetify.Platform?.ClipboardAPI?.copy) {
        Spicetify.Platform.ClipboardAPI.copy(cmd);
      } else {
        navigator.clipboard.writeText(cmd);
      }
      logToConsole('Copied DevTools command to clipboard.', 'success');
      Spicetify.showNotification('Copied "spicetify enable-devtools" to clipboard! Paste it in your terminal.');
    };

    // Preset dropdown configuration
    const presetDropdown = panel.querySelector('#nprd-test-action-preset');
    const activePreset = localStorage.getItem('testPlugin:preset') || 'rainbow';
    presetDropdown.value = activePreset;
    presetDropdown.onchange = (e) => {
      changePreset(e.target.value);
    };
    
    const auraChk = panel.querySelector('#nprd-test-action-aura');
    const lsAura = localStorage.getItem('testPlugin:aura') === 'true';
    auraChk.checked = lsAura;
    toggleAura(lsAura);
    
    auraChk.onchange = (e) => {
      localStorage.setItem('testPlugin:aura', e.target.checked ? 'true' : 'false');
      toggleAura(e.target.checked);
    };
    
    Spicetify.Player.addEventListener('songchange', handleSongChange);
    Spicetify.Player.addEventListener('playchange', handlePlayChange);
    
    runDiagnostics();
    updatePanelTrackInfo();
    updateVisualizerState();
    console.log(`[Test Plugin] Mounted successfully (v${NPTD_VERSION}).`);
  }

  let menuToggle = null;
  let settingsObserver = null;
  const SETTINGS_STYLES_ID = 'nprd-test-settings-styles';

  function injectSettingsStyles() {
    if (document.getElementById(SETTINGS_STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = SETTINGS_STYLES_ID;
    style.innerHTML = `
      #nprd-settings-section-container {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .nprd-settings-title {
        font-size: 1.2rem;
        font-weight: 800;
        color: var(--spice-text, #fff);
        margin-bottom: 8px;
        background: linear-gradient(135deg, #1ed760 0%, #00f2fe 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .nprd-settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.2s, border-color 0.2s;
      }
      .nprd-settings-row:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .nprd-settings-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-right: 16px;
      }
      .nprd-settings-label {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--spice-text, #fff);
      }
      .nprd-settings-desc {
        font-size: 0.8rem;
        color: var(--spice-subtext, #b3b3b3);
        line-height: 1.4;
      }
      /* Premium Switch Custom Styling */
      .nprd-switch {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 26px;
        flex-shrink: 0;
      }
      .nprd-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .nprd-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.15);
        transition: .3s cubic-bezier(0.3, 0, 0.2, 1);
        border-radius: 34px;
      }
      .nprd-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: .3s cubic-bezier(0.3, 0, 0.2, 1);
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      .nprd-switch input:checked + .nprd-slider {
        background-color: #1ed760;
        box-shadow: 0 0 10px rgba(30, 215, 96, 0.4);
      }
      .nprd-switch input:checked + .nprd-slider:before {
        transform: translateX(22px);
      }
    `;
    document.head.appendChild(style);
  }

  function findSettingsContainer() {
    const scrollContainer = document.querySelector(".main-view-container__scroll-node-child") || 
                            document.querySelector("main") || 
                            document.querySelector(".Root__main-view .os-viewport");
    
    if (!scrollContainer) return null;
    
    const content = scrollContainer.querySelector(".main-devicePicker-devicePicker")?.parentElement || 
                    scrollContainer.querySelector("section")?.parentElement ||
                    scrollContainer.firstElementChild ||
                    scrollContainer;
    return content;
  }

  function updateSettingsPageCheckbox(state) {
    const chk = document.getElementById('nprd-test-settings-checkbox');
    if (chk) {
      chk.checked = state;
    }
  }

  function onSettingsPageToggle(checked) {
    localStorage.setItem("testPlugin:enabled", checked ? "true" : "false");
    
    if (menuToggle) {
      menuToggle.setState(checked);
    }
    
    if (checked) {
      mountTestPlugin();
      Spicetify.showNotification("Diagnostics Test Plugin Enabled! ⚡");
    } else {
      unmountTestPlugin();
      Spicetify.showNotification("Diagnostics Test Plugin Disabled! 🔌");
    }

    // Fire event to notify normal extension to override
    window.dispatchEvent(new CustomEvent('testPluginToggle', { detail: { enabled: checked } }));
  }

  function injectSettingsGroup(container) {
    if (document.getElementById('nprd-settings-section-container')) return;

    injectSettingsStyles();

    const isEnabled = localStorage.getItem("testPlugin:enabled") !== "false";

    const section = document.createElement('div');
    section.id = 'nprd-settings-section-container';
    section.innerHTML = `
      <div class="nprd-settings-title">Diagnostics & Accent Customizer</div>
      <div class="nprd-settings-row">
        <div class="nprd-settings-info">
          <div class="nprd-settings-label">Enable Diagnostics Test Extension</div>
          <div class="nprd-settings-desc">Activate the interactive diagnostic telemetry, quick action panel, and neon player underglows.</div>
        </div>
        <label class="nprd-switch">
          <input type="checkbox" id="nprd-test-settings-checkbox" ${isEnabled ? 'checked' : ''}>
          <span class="nprd-slider"></span>
        </label>
      </div>
    `;

    const checkbox = section.querySelector('#nprd-test-settings-checkbox');
    checkbox.onchange = (e) => {
      onSettingsPageToggle(e.target.checked);
    };

    container.appendChild(section);
    console.log('[Test Plugin] Injected settings toggle into native settings page.');
  }

  function setupSettingsInjection() {
    if (document.getElementById('nprd-settings-section-container')) return;

    const injectIfPossible = () => {
      if (document.getElementById('nprd-settings-section-container')) return;
      const container = findSettingsContainer();
      if (container) {
        injectSettingsGroup(container);
      }
    };

    injectIfPossible();

    if (settingsObserver) settingsObserver.disconnect();
    settingsObserver = new MutationObserver(() => {
      if (Spicetify.Platform?.History?.location?.pathname === "/settings") {
        injectIfPossible();
      }
    });
    settingsObserver.observe(document.body, { childList: true, subtree: true });
  }

  function handleRouteSettings(pathname) {
    if (pathname === "/settings") {
      setupSettingsInjection();
    } else {
      if (settingsObserver) {
        settingsObserver.disconnect();
        settingsObserver = null;
      }
    }
  }

  async function initializeTestPlugin() {
    await waitForSpicetify();
    
    let isEnabled = localStorage.getItem("testPlugin:enabled") !== "false";
    
    menuToggle = new Spicetify.Menu.Item(
      "Enable Diagnostics Plugin",
      isEnabled,
      (self) => {
        isEnabled = !isEnabled;
        localStorage.setItem("testPlugin:enabled", isEnabled ? "true" : "false");
        self.setState(isEnabled);
        
        if (isEnabled) {
          mountTestPlugin();
          Spicetify.showNotification("Diagnostics Test Plugin Enabled! ⚡");
        } else {
          unmountTestPlugin();
          Spicetify.showNotification("Diagnostics Test Plugin Disabled! 🔌");
        }

        updateSettingsPageCheckbox(isEnabled);

        // Fire event to notify normal extension to override
        window.dispatchEvent(new CustomEvent('testPluginToggle', { detail: { enabled: isEnabled } }));
      }
    );
    menuToggle.register();
    
    if (isEnabled) {
      mountTestPlugin();
    }

    if (Spicetify.Platform?.History) {
      Spicetify.Platform.History.listen((location) => {
        handleRouteSettings(location.pathname);
      });
      handleRouteSettings(Spicetify.Platform.History.location.pathname);
    }
  }

  initializeTestPlugin();
})();

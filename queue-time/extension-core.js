// NAME: Queue Time
// AUTHOR: GamerNation12
// DESCRIPTION: Displays Queue Time
(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player || !document.body) {
        setTimeout(QueueTime, 300);
        return;
    }
    console.info("✨ [GN | Queue Time] Successfully initialized.");

    if (window.__mgnQueueTimeState) {
        if (window.__mgnQueueTimeState.interval) clearInterval(window.__mgnQueueTimeState.interval);
        if (window.__mgnQueueTimeState.updateInterval) clearInterval(window.__mgnQueueTimeState.updateInterval);
        
        const removeIds = [
            'mgn-queue-time-pill', 'mgn-qt-settings-backdrop', 'mgn-qt-settings-menu',
            'mgn-qt-style', 'mgn-qt-changelog-backdrop', 'mgn-qt-changelog-modal'
        ];
        removeIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        
        document.querySelectorAll('.mgn-qt-inline').forEach(el => el.remove());
    }
    
    let savedState = {};
    try {
        savedState = JSON.parse(localStorage.getItem('mgnQueueTimeState')) || {};
    } catch (e) {}

    window.__mgnQueueTimeState = {
        interval: null
    };

    const QT_VERSION = "3.0.8";
    let QT_CHANGELOG_LINES = [
        "Enabled Full Playlist Estimation by default for all sizes, meaning the queue time will perfectly match the time shown at the top of your playlist!",
        "Added local storage persistence so your place in the queue is remembered even if you completely close or restart Spotify."
    ];

    // Default Settings
    const defaultSettings = {
        mode: 'text', // 'pill' or 'text'
        format: 'both', // 'both' (80 songs, 5hr 4m 16s), 'time' (5hr 4m 16s)
        calc: 'playlist', // 'queue' (80 limit) or 'playlist' (estimate full length)
        color: '#ffffff',
        menuTheme: 'm3'
    };

    let settings = { ...defaultSettings };
    try {
        const stored = localStorage.getItem("queue-time:settings");
        if (stored) settings = { ...settings, ...JSON.parse(stored) };
    } catch (e) {}

    function saveSettings() {
        localStorage.setItem("queue-time:settings", JSON.stringify(settings));
        applySettings();
    }
    
    async function checkForUpdates(manual = false) {
        try {
            const res = await fetch(`https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/queue-time/version.json?t=${Math.random()}`);
            if (res.ok) {
                const json = await res.json();
                const latestVersion = json.version;
                
                if (json.changelogs && json.changelogs[QT_VERSION]) {
                    QT_CHANGELOG_LINES = json.changelogs[QT_VERSION];
                } else if (json.changelog && latestVersion === QT_VERSION) {
                    QT_CHANGELOG_LINES = json.changelog;
                }
                
                if (latestVersion !== QT_VERSION) {
                    if (manual) {
                        const btn = document.getElementById('qt-update-btn');
                        if (btn) btn.textContent = 'Updating...';
                        try {
                            const codeRes = await fetch(`https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/queue-time/QueueTime_v2.js?t=${Date.now()}`);
                            if (!codeRes.ok) throw new Error();
                            const code = await codeRes.text();
                            const blob = new Blob([code], { type: 'application/javascript' });
                            const localUrl = URL.createObjectURL(blob);
                            await import(localUrl);
                            URL.revokeObjectURL(localUrl);
                            Spicetify.showNotification(`Successfully updated to v${latestVersion}!`);
                            let m = document.getElementById('qt-settings-menu'); 
                            let bd = document.getElementById('qt-settings-backdrop');
                            if (m) {
                                m.classList.remove('brd-m3-animate');
                                m.style.display = 'none';
                            }
                            if (bd) {
                                bd.classList.remove('brd-m3-animate');
                                bd.style.display = 'none';
                            }
                        } catch (e) {
                            Spicetify.showNotification("Update failed. See console.", true);
                        }
                    } else {
                        Spicetify.showNotification(`Queue Time: New version ${latestVersion} available!`);
                    }
                } else {
                    if (manual) Spicetify.showNotification(`Already on latest version (v${latestVersion}).`);
                }
            }
        } catch (e) {
            if (manual) Spicetify.showNotification("Failed to check for updates.", true);
        }
    }
    
    function showChangelogPopup() {
        if (document.getElementById('qt-changelog')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'qt-changelog-backdrop';
        backdrop.style.position = 'fixed';
        backdrop.style.inset = '0';
        backdrop.style.background = 'rgba(0,0,0,0.6)';
        backdrop.style.zIndex = '10000';
        backdrop.style.backdropFilter = 'blur(4px)';

        const modal = document.createElement('div');
        modal.id = 'qt-changelog';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = 'rgba(18,18,18,0.9)';
        modal.style.backdropFilter = 'blur(25px)';
        modal.style.padding = '20px 22px';
        modal.style.borderRadius = '18px';
        modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)';
        modal.style.color = 'var(--spice-text)';
        modal.style.width = 'min(90vw, 420px)';
        modal.style.fontSize = '0.9rem';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.gap = '10px';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="display:flex;flex-direction:column;gap:2px;">
              <span style="font-weight:800;letter-spacing:-0.01em;">Queue Time Updated</span>
              <span style="opacity:0.7;font-size:0.8rem;">Queue Time v${QT_VERSION}</span>
            </div>
            <button id="qt-changelog-close" style="background:rgba(255,255,255,0.05);border:none;color:var(--spice-text);border-radius:999px;cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;">&#10005;</button>
          </div>
          <ul id="qt-changelog-list" style="margin:4px 0 0 16px;padding:0;list-style:disc;"></ul>
          <button id="qt-changelog-ok" style="margin-top:10px;align-self:flex-end;background:#1ed760;border:none;border-radius:999px;padding:6px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;color:#000;transition:transform 0.1s;">
            Awesome
          </button>
        `;

        const listEl = modal.querySelector('#qt-changelog-list');
        const firstLines = QT_CHANGELOG_LINES.slice(0, 3);
        firstLines.forEach(line => {
          const li = document.createElement('li');
          li.textContent = line;
          listEl.appendChild(li);
        });
        if (QT_CHANGELOG_LINES.length > 3) {
          const li = document.createElement('li');
          li.textContent = `...and ${QT_CHANGELOG_LINES.length - 3} more changes.`;
          li.style.opacity = '0.6';
          li.style.listStyle = 'none';
          li.style.marginLeft = '-16px';
          li.style.marginTop = '4px';
          listEl.appendChild(li);
        }

        const close = () => {
          backdrop.remove();
          modal.remove();
        };

        modal.querySelector('#qt-changelog-close').onclick = close;
        modal.querySelector('#qt-changelog-ok').onclick = close;
        backdrop.onclick = close;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
    }
    
    // Check for updates on load
    const updateCheckPromise = checkForUpdates();
    window.__mgnQueueTimeState.updateInterval = setInterval(checkForUpdates, 1000 * 60 * 60);

    const seenVersion = localStorage.getItem('qt_version');
    const currentVerStr = String(QT_VERSION);
    const sessionShown = sessionStorage.getItem('qt_popup_shown_' + currentVerStr);
    
    if (!sessionShown && seenVersion !== currentVerStr) {
        try { localStorage.setItem('qt_version', currentVerStr); } catch(e){}
        sessionStorage.setItem('qt_popup_shown_' + currentVerStr, 'true');
        Promise.all([
            updateCheckPromise.catch(() => {}),
            new Promise(r => setTimeout(r, 2000))
        ]).finally(() => {
            showChangelogPopup();
        });
    }


function queueTimeCSS() {
    const styleId = 'qt-settings-style';
    if (document.getElementById(styleId)) return null;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* BASE CSS (Structure & Layout) */
      #qt-settings-menu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); 
        padding: 24px; flex-direction: column; width: min(90vw, 440px); z-index: 10001; gap: 16px; 
        box-sizing: border-box; opacity: 0;
        transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s cubic-bezier(0.2, 0, 0, 1);
        font-family: var(--font-family, inherit);
      }
      #qt-settings-menu.brd-m3-animate { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      #qt-settings-menu * { box-sizing: border-box; }
      #qt-settings-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; opacity: 0; transition: opacity 0.25s linear; backdrop-filter: blur(4px); }
      #qt-settings-backdrop.brd-m3-animate { opacity: 1; }
      
      #qt-settings-menu .brd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      #qt-settings-menu h2 { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.01em; margin: 0; }
      #qt-settings-menu .brd-close { border: none; border-radius: 50%; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background 0.2s, color 0.2s; font-size: 14px; }
      
      .Dropdown-container { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-weight: 500; font-size: 0.9rem; gap: 12px; }
      .brd-select {
        position: relative; min-width: 180px; border-radius: 8px; padding: 8px 30px 8px 12px; 
        font-family: inherit; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
        transition: border-color 0.18s ease, background 0.18s ease;
      }
      .brd-select-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .brd-options {
        position: absolute; inset-inline: 0; top: calc(100% + 6px); border-radius: 8px; padding: 4px; z-index: 10; max-height: 220px; overflow-y: auto;
      }
      .brd-option { padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
      
      /* Switches */
      .brd-switch { position: relative; display: inline-block; width: 52px; height: 32px; flex-shrink: 0; }
      .brd-switch input { opacity: 0; width: 0; height: 0; }
      .brd-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; transition: .25s cubic-bezier(0.2, 0, 0, 1); }
      .brd-slider:before { position: absolute; content: ""; transition: .25s cubic-bezier(0.2, 0, 0, 1); }
      
      /* Tabs */
      .brd-tabs-header { display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
      .brd-tab-btn { display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; border: none; font-weight: 600; font-size: 0.85rem; padding: 6px 12px; cursor: pointer; border-radius: 8px; transition: 0.2s; flex: 1; text-align: center; }
      .brd-tab-content { display: none; flex-direction: column; animation: brdFadeIn 0.3s cubic-bezier(0.2, 0, 0, 1); }
      .brd-tab-content.brd-active { display: flex; }
      @keyframes brdFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

      
      .brd-update-btn-base { transition: 0.2s; font-family: inherit; font-size: 0.85rem; font-weight: 600; }
      #qt-settings-menu.theme-m3 .brd-update-btn-base { background: rgba(30,215,96,1); color: #000; }
      #qt-settings-menu.theme-m3 .brd-update-btn-base:hover { transform: scale(1.02); filter: brightness(1.1); }

      /* ========================================================
         THEME 1: MATERIAL 3 (Default Android look)
         ======================================================== */
      #qt-settings-menu.theme-m3 { background: #1c1b1f; color: #e6e1e5; border-radius: 28px; box-shadow: 0px 8px 24px rgba(0,0,0,0.4); border: none; }
      #qt-settings-menu.theme-m3 .brd-close { background: rgba(255,255,255,0.05); color: #e6e1e5; }
      #qt-settings-menu.theme-m3 .brd-close:hover { background: rgba(255,255,255,0.15); }
      #qt-settings-menu.theme-m3 .brd-select { background: #49454f; color: #e6e1e5; border: 1px solid #938f99; }
      #qt-settings-menu.theme-m3 .brd-select:hover { border-color: #e6e1e5; background: #605d66; }
      #qt-settings-menu.theme-m3 .brd-select.brd-open { border-color: #1ed760; background: #323035; }
      #qt-settings-menu.theme-m3 .brd-options { background: #323035; box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1); }
      #qt-settings-menu.theme-m3 .brd-option { color: #c8c5ca; }
      #qt-settings-menu.theme-m3 .brd-option:hover { background: rgba(255,255,255,0.08); color: #e6e1e5; }
      #qt-settings-menu.theme-m3 .brd-option.brd-selected { background: rgba(30,215,96,0.2); color: #1ed760; }
      #qt-settings-menu.theme-m3 .brd-slider { background-color: #49454f; border: 2px solid #938f99; border-radius: 32px; }
      #qt-settings-menu.theme-m3 .brd-slider:before { height: 16px; width: 16px; left: 6px; top: 6px; background-color: #938f99; border-radius: 50%; }
      #qt-settings-menu.theme-m3 .brd-switch input:checked + .brd-slider { background-color: #1ed760; border-color: #1ed760; }
      #qt-settings-menu.theme-m3 .brd-switch input:checked + .brd-slider:before { transform: translateX(20px) scale(1.5); background-color: #000; }
      #qt-settings-menu.theme-m3 .brd-tab-btn { color: #938f99; }
      #qt-settings-menu.theme-m3 .brd-tab-btn:hover { background: rgba(255,255,255,0.05); color: #e6e1e5; }
      #qt-settings-menu.theme-m3 .brd-tab-btn.brd-active { background: rgba(30,215,96,0.1); color: #1ed760; }

      /* ========================================================
         THEME 2: SPOTIFY NATIVE (Premium seamless integration)
         ======================================================== */
      #qt-settings-menu.theme-spotify { background: #242424; color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: 'CircularSp', 'CircularSp-Arab', 'CircularSp-Hebr', 'CircularSp-Cyrl', 'CircularSp-Grek', 'CircularSp-Deva', var(--fallback-fonts, sans-serif); }
      #qt-settings-menu.theme-spotify .brd-close { background: transparent; color: #b3b3b3; }
      #qt-settings-menu.theme-spotify .brd-close:hover { background: #333; color: #fff; }
      #qt-settings-menu.theme-spotify .brd-select { background: #242424; color: #fff; border: 1px solid #555; border-radius: 4px; font-weight: 400; }
      #qt-settings-menu.theme-spotify .brd-select:hover { border-color: #888; background: #2a2a2a; }
      #qt-settings-menu.theme-spotify .brd-select.brd-open { border-color: #fff; background: #333; }
      #qt-settings-menu.theme-spotify .brd-options { background: #282828; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 4px; }
      #qt-settings-menu.theme-spotify .brd-option { color: #b3b3b3; border-radius: 2px; }
      #qt-settings-menu.theme-spotify .brd-option:hover { background: #333; color: #fff; }
      #qt-settings-menu.theme-spotify .brd-option.brd-selected { color: #1ed760; background: rgba(30,215,96,0.1); }
      /* Spotify Switch */
      #qt-settings-menu.theme-spotify .brd-switch { width: 40px; height: 24px; }
      #qt-settings-menu.theme-spotify .brd-slider { background-color: #5a5a5a; border-radius: 24px; border: none; }
      #qt-settings-menu.theme-spotify .brd-slider:before { height: 18px; width: 18px; left: 3px; top: 3px; background-color: #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
      #qt-settings-menu.theme-spotify .brd-switch input:checked + .brd-slider { background-color: #1ed760; }
      #qt-settings-menu.theme-spotify .brd-switch input:checked + .brd-slider:before { transform: translateX(16px); background-color: #fff; }
      #qt-settings-menu.theme-spotify .brd-tab-btn { color: #b3b3b3; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 500px; padding: 8px; }
      #qt-settings-menu.theme-spotify .brd-tab-btn:hover { color: #fff; }
      #qt-settings-menu.theme-spotify .brd-tab-btn.brd-active { background: #333; color: #fff; }
      #qt-settings-menu.theme-spotify #brd-update-btn { background: #1ed760 !important; color: #000 !important; border-radius: 500px !important; text-transform: uppercase; font-weight: 700 !important; font-size: 0.8rem; letter-spacing: 0.1em; transform: scale(1); transition: transform 0.1s; }
      #qt-settings-menu.theme-spotify #brd-update-btn:hover { transform: scale(1.04); background: #1fdf64 !important; }

      /* ========================================================
         THEME 3: AURORA GRADIENTS (Ethereal flowing colors)
         ======================================================== */
      #qt-settings-menu.theme-aurora { 
        background: linear-gradient(135deg, #1f005c, #5b0060, #870160, #ac255e, #ca485c, #e16b5c, #f39060, #ffb56b);
        background-size: 300% 300%; animation: auroraShift 12s ease infinite;
        color: #fff; border-radius: 24px; box-shadow: 0 12px 40px rgba(172,37,94,0.4); border: 1px solid rgba(255,255,255,0.2); 
      }
      @keyframes auroraShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      #qt-settings-menu.theme-aurora .brd-close { background: rgba(255,255,255,0.1); color: #fff; }
      #qt-settings-menu.theme-aurora .brd-close:hover { background: rgba(255,255,255,0.3); }
      #qt-settings-menu.theme-aurora .brd-select { background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
      #qt-settings-menu.theme-aurora .brd-select:hover { background: rgba(0,0,0,0.5); }
      #qt-settings-menu.theme-aurora .brd-select.brd-open { border-color: #fff; }
      #qt-settings-menu.theme-aurora .brd-options { background: rgba(30,0,60,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); }
      #qt-settings-menu.theme-aurora .brd-option { color: rgba(255,255,255,0.8); }
      #qt-settings-menu.theme-aurora .brd-option:hover { background: rgba(255,255,255,0.15); color: #fff; }
      #qt-settings-menu.theme-aurora .brd-option.brd-selected { background: rgba(255,255,255,0.3); color: #fff; font-weight: bold; }
      #qt-settings-menu.theme-aurora .brd-switch { width: 50px; height: 28px; }
      #qt-settings-menu.theme-aurora .brd-slider { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.3); border-radius: 30px; }
      #qt-settings-menu.theme-aurora .brd-slider:before { height: 20px; width: 20px; left: 3px; top: 3px; background: rgba(255,255,255,0.6); border-radius: 50%; }
      #qt-settings-menu.theme-aurora .brd-switch input:checked + .brd-slider { background: rgba(255,255,255,0.4); border-color: #fff; }
      #qt-settings-menu.theme-aurora .brd-switch input:checked + .brd-slider:before { transform: translateX(22px); background: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.8); }
      #qt-settings-menu.theme-aurora .brd-tab-btn { color: rgba(255,255,255,0.6); }
      #qt-settings-menu.theme-aurora .brd-tab-btn.brd-active { background: rgba(255,255,255,0.2); color: #fff; box-shadow: inset 0 0 10px rgba(255,255,255,0.1); }
      #qt-settings-menu.theme-aurora #brd-update-btn { background: rgba(255,255,255,0.9) !important; color: #870160 !important; border-radius: 12px !important; font-weight: 800 !important; }

      /* ========================================================
         THEME 4: WINDOWS 11 FLUENT (Acrylic blur & glass)
         ======================================================== */
      #qt-settings-menu.theme-fluent { background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(40px) saturate(150%); color: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
      #qt-settings-menu.theme-fluent .brd-close { background: transparent; color: #fff; border-radius: 6px; }
      #qt-settings-menu.theme-fluent .brd-close:hover { background: rgba(255,255,255,0.1); }
      #qt-settings-menu.theme-fluent .brd-select { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-bottom: 2px solid rgba(255,255,255,0.2); border-radius: 6px; }
      #qt-settings-menu.theme-fluent .brd-select:hover { background: rgba(255,255,255,0.08); border-bottom-color: rgba(255,255,255,0.4); }
      #qt-settings-menu.theme-fluent .brd-select.brd-open { border-bottom-color: #60cdff; background: rgba(255,255,255,0.1); }
      #qt-settings-menu.theme-fluent .brd-options { background: rgba(40,40,40,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
      #qt-settings-menu.theme-fluent .brd-option { color: #eee; border-radius: 4px; }
      #qt-settings-menu.theme-fluent .brd-option:hover { background: rgba(255,255,255,0.06); }
      #qt-settings-menu.theme-fluent .brd-option.brd-selected { background: rgba(96,205,255,0.1); color: #60cdff; position: relative; }
      #qt-settings-menu.theme-fluent .brd-option.brd-selected::before { content: ""; position: absolute; left: 2px; top: 20%; bottom: 20%; width: 3px; background: #60cdff; border-radius: 2px; }
      #qt-settings-menu.theme-fluent .brd-switch { width: 44px; height: 22px; }
      #qt-settings-menu.theme-fluent .brd-slider { background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 11px; }
      #qt-settings-menu.theme-fluent .brd-slider:before { height: 14px; width: 14px; left: 3px; top: 3px; background-color: #ccc; border-radius: 50%; }
      #qt-settings-menu.theme-fluent .brd-switch input:checked + .brd-slider { background-color: #60cdff; border-color: #60cdff; }
      #qt-settings-menu.theme-fluent .brd-switch input:checked + .brd-slider:before { transform: translateX(22px); background-color: #000; }
      #qt-settings-menu.theme-fluent .brd-tab-btn { color: #ccc; border-radius: 6px; }
      #qt-settings-menu.theme-fluent .brd-tab-btn:hover { background: rgba(255,255,255,0.05); }
      #qt-settings-menu.theme-fluent .brd-tab-btn.brd-active { background: rgba(255,255,255,0.1); color: #fff; }
      #qt-settings-menu.theme-fluent #brd-update-btn { background: #60cdff !important; color: #000 !important; border-radius: 6px !important; font-weight: 600 !important; }

      /* ========================================================
         THEME 5: PURE OLED (Pitch black, white lines)
         ======================================================== */

      #qt-settings-menu.theme-oled { background: #000000; color: #ffffff; border-radius: 0; box-shadow: none; border: 1px solid #333; }
      #qt-settings-menu.theme-oled .brd-close { background: #000; border: 1px solid #333; color: #fff; border-radius: 0; }
      #qt-settings-menu.theme-oled .brd-close:hover { background: #fff; color: #000; }
      #qt-settings-menu.theme-oled .brd-select { background: #000; color: #fff; border: 1px solid #555; border-radius: 0; }
      #qt-settings-menu.theme-oled .brd-select:hover { border-color: #fff; }
      #qt-settings-menu.theme-oled .brd-select.brd-open { border-color: #fff; background: #111; }
      #qt-settings-menu.theme-oled .brd-options { background: #000; border: 1px solid #555; border-radius: 0; box-shadow: none; }
      #qt-settings-menu.theme-oled .brd-option { color: #aaa; border-radius: 0; }
      #qt-settings-menu.theme-oled .brd-option:hover { background: #111; color: #fff; }
      #qt-settings-menu.theme-oled .brd-option.brd-selected { background: #fff; color: #000; }
      #qt-settings-menu.theme-oled .brd-switch { width: 40px; height: 20px; }
      #qt-settings-menu.theme-oled .brd-slider { background-color: #000; border: 1px solid #555; border-radius: 0; }
      #qt-settings-menu.theme-oled .brd-slider:before { height: 12px; width: 18px; left: 2px; top: 3px; background-color: #555; border-radius: 0; }
      #qt-settings-menu.theme-oled .brd-switch input:checked + .brd-slider { border-color: #fff; }
      #qt-settings-menu.theme-oled .brd-switch input:checked + .brd-slider:before { transform: translateX(16px); background-color: #fff; }
      #qt-settings-menu.theme-oled .brd-tab-btn { color: #555; border-radius: 0; }
      #qt-settings-menu.theme-oled .brd-tab-btn:hover { color: #fff; }
      #qt-settings-menu.theme-oled .brd-tab-btn.brd-active { background: #fff; color: #000; }
      #qt-settings-menu.theme-oled #brd-update-btn { background: #000 !important; color: #fff !important; border: 1px solid #fff !important; border-radius: 0 !important; font-weight: 400 !important; }
      #qt-settings-menu.theme-oled #brd-update-btn:hover { background: #fff !important; color: #000 !important; }
    `;
    return style;
  }

function createCustomDropdown(id, label, options, onChange = null) {
    const div = document.createElement('div');
    div.className = 'Dropdown-container';

    const stored = settings[id] ?? options[0]?.value;
    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'brd-select';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'brd-select-label';
    valueSpan.textContent = options.find(o => o.value === stored)?.text ?? options[0]?.text ?? '';

    const chevron = document.createElement('div');
    chevron.className = 'brd-chevron';
    chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    chevron.style.display = 'flex';
    chevron.style.alignItems = 'center';
    chevron.style.transition = 'transform 0.2s';
    
    button.appendChild(valueSpan);
    button.appendChild(chevron);

    const list = document.createElement('div');
    list.className = 'brd-options';
    list.style.display = 'none';

    const closeAll = () => {
      button.classList.remove('brd-open');
      list.style.display = 'none';
      chevron.style.transform = 'rotate(0deg)';
      document.removeEventListener('click', onDocClick);
    };

    const onDocClick = (e) => {
      if (!wrapper.contains(e.target)) closeAll();
    };

    options.forEach(o => {
      const opt = document.createElement('div');
      opt.className = 'brd-option' + (o.value === stored ? ' brd-selected' : '');
      opt.textContent = o.text;
      opt.onclick = () => {
        settings[id] = o.value; saveSettings();
        valueSpan.textContent = o.text;
        list.querySelectorAll('.brd-option').forEach(el => el.classList.remove('brd-selected'));
        opt.classList.add('brd-selected');
        closeAll();
        if (onChange) onChange(o.value);
        else applySettings();
      };
      list.appendChild(opt);
    });

    button.onclick = () => {
      const open = list.style.display === 'block';
      if (open) {
        closeAll();
      } else {
        document.querySelectorAll('.brd-options').forEach(el => {
          if (el !== list) {
            el.style.display = 'none';
            el.previousElementSibling.classList.remove('brd-open');
            const otherChevron = el.previousElementSibling.querySelector('.brd-chevron');
            if (otherChevron) otherChevron.style.transform = 'rotate(0deg)';
          }
        });
        button.classList.add('brd-open');
        list.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
        setTimeout(() => document.addEventListener('click', onDocClick), 10);
      }
    };

    wrapper.appendChild(button);
    wrapper.appendChild(list);

    div.appendChild(labelEl);
    div.appendChild(wrapper);
    return div;
  }


    function openSettings() {
        let m = document.getElementById('qt-settings-menu');
        if (!m) {
            createSettingsMenu();
            m = document.getElementById('qt-settings-menu');
        }
        
        const backdrop = document.getElementById('qt-settings-backdrop');
        if (m && backdrop) {
            backdrop.style.display = 'block';
            m.style.display = 'flex';
            void m.offsetWidth;
            backdrop.classList.add('brd-m3-animate');
            m.classList.add('brd-m3-animate');
        }
    }

    function toggleSettingsMenu(menu) {
        const backdrop = document.getElementById('qt-settings-backdrop');
        const isHidden = menu.style.display === 'none' || !menu.classList.contains('brd-m3-animate');
        
        const close = () => {
            menu.classList.remove('brd-m3-animate');
            backdrop.classList.remove('brd-m3-animate');
            setTimeout(() => {
                menu.style.display = 'none';
                backdrop.style.display = 'none';
                backdrop.onclick = null;
            }, 250);
        };
        
        backdrop.onclick = close;
        const closeBtn = menu.querySelector('.brd-close');
        if (closeBtn) closeBtn.onclick = close;

        if (isHidden) {
            openSettings();
            backdrop.onclick = close;
        } else {
            close();
        }
    }

    function createSettingsMenu() {
        if (document.getElementById('qt-settings-menu')) document.getElementById('qt-settings-menu').remove();
        if (!document.getElementById('qt-settings-backdrop')) {
            const bd = document.createElement('div');
            bd.id = 'qt-settings-backdrop';
            bd.className = 'brd-backdrop';
            bd.style.display = 'none';
            bd.style.position = 'fixed';
            bd.style.inset = '0';
            bd.style.background = 'rgba(0,0,0,0.5)';
            bd.style.zIndex = '10000';
            bd.style.opacity = '0';
            bd.style.transition = 'opacity 0.25s linear';
            bd.style.backdropFilter = 'blur(4px)';
            document.body.appendChild(bd);
        }
        
        const menu = document.createElement('div');
        menu.id = 'qt-settings-menu';
        menu.className = `theme-${settings.menuTheme || 'm3'}`;

        const header = document.createElement('div');
        header.className = 'brd-header';
        header.innerHTML = `<div style="display:flex;align-items:baseline;gap:8px;"><h2>Queue Time Settings</h2><span style="opacity:0.5;font-size:0.75rem;font-weight:600;">v${QT_VERSION}</span></div><button class="brd-close" aria-label="Close">&#10005;</button>`;
        menu.appendChild(header);

        const tabsHeader = document.createElement('div');
        tabsHeader.className = 'brd-tabs-header';
        const tabNames = [
           { id: 'tab-layout', name: 'Layout', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' },
           { id: 'tab-style', name: 'Style', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"></path></svg>' }
        ];
        
        const tabContents = document.createElement('div');
        tabContents.className = 'brd-tabs-body';

        tabNames.forEach((tab, index) => {
           const btn = document.createElement('button');
           btn.className = `brd-tab-btn ${index === 0 ? 'brd-active' : ''}`;
           btn.innerHTML = `${tab.icon} <span>${tab.name}</span>`;
           
           const content = document.createElement('div');
           content.className = `brd-tab-content ${index === 0 ? 'brd-active' : ''}`;
           content.id = tab.id;

           btn.onclick = () => {
              tabsHeader.querySelectorAll('.brd-tab-btn').forEach(b => b.classList.remove('brd-active'));
              tabContents.querySelectorAll('.brd-tab-content').forEach(c => c.classList.remove('brd-active'));
              btn.classList.add('brd-active');
              content.classList.add('brd-active');
           };

           tabsHeader.appendChild(btn);
           tabContents.appendChild(content);
        });

        menu.appendChild(tabsHeader);
        menu.appendChild(tabContents);

        const layoutTab = tabContents.querySelector('#tab-layout');
        const styleTab = tabContents.querySelector('#tab-style');

        // Options
        const modeOpts = [
            { value: "pill", text: "Floating Pill" },
            { value: "text", text: "In-Queue Text" }
        ];
        const formatOpts = [
            { value: "both", text: "Songs & Time" },
            { value: "time", text: "Time Only" }
        ];
        const themeOpts = [
            { value: "m3", text: "Material 3" },
            { value: "spotify", text: "Spotify Native" },
            { value: "aurora", text: "Aurora Gradients" },
            { value: "fluent", text: "Windows 11 Fluent" },
            { value: "oled", text: "Pure OLED" }
        ];
        const colorOpts = [
          { value: "inherit", text: "Default (Subtext)" },
          { value: "var(--spice-text)", text: "Dynamic: Text" },
          { value: "var(--spice-subtext)", text: "Dynamic: Subtext" },
          { value: "var(--spice-button)", text: "Dynamic: Button" },
          { value: "var(--spice-button-active)", text: "Dynamic: Button Active" },
          { value: "#ffffff", text: "Solid White" },
          { value: "#1ed760", text: "Spotify Green" },
          { value: "#60cdff", text: "Soft Blue" },
          { value: "#ff5e5e", text: "Bright Red" }
        ];
        const sizeOpts = [
          { value: "0.65rem", text: "Small" },
          { value: "0.75rem", text: "Default" },
          { value: "0.9rem", text: "Large" }
        ];
        const weightOpts = [
          { value: "400", text: "Normal" },
          { value: "600", text: "Semi-Bold" },
          { value: "900", text: "Black" }
        ];
        const bgOpts = [
          { value: "rgba(255,255,255,0.08)", text: "Glassmorphism (BRD)" },
          { value: "rgba(30, 30, 30, 0.7)", text: "Default Queue Time" },
          { value: "var(--spice-button)", text: "Spotify Button" }
        ];

        layoutTab.appendChild(createCustomDropdown('mode', 'Display Mode', modeOpts));
        layoutTab.appendChild(createCustomDropdown('format', 'Text Format', formatOpts));
        
        styleTab.appendChild(createCustomDropdown('menuTheme', 'Menu Theme', themeOpts, (newTheme) => {
            menu.className = `theme-${newTheme} brd-m3-animate`;
            settings.menuTheme = newTheme;
            saveSettings();
        }));
        styleTab.appendChild(createCustomDropdown('color', 'Text Color', colorOpts));
        styleTab.appendChild(createCustomDropdown('fontSize', 'Font Size', sizeOpts));
        styleTab.appendChild(createCustomDropdown('fontWeight', 'Font Weight', weightOpts));
        styleTab.appendChild(createCustomDropdown('bgColor', 'Pill Background', bgOpts));

        const updateBtnContainer = document.createElement('div');
        updateBtnContainer.style.display = 'flex';
        updateBtnContainer.style.justifyContent = 'center';
        updateBtnContainer.style.marginTop = '16px';
        const updateBtn = document.createElement('button');
        updateBtn.id = 'brd-update-btn';
        updateBtn.className = 'brd-update-btn-base';
        updateBtn.style.padding = '8px 16px';
        updateBtn.style.cursor = 'pointer';
        updateBtn.textContent = 'Check for Updates';
        updateBtn.style.border = 'none';
        updateBtn.style.borderRadius = '999px';
        
        updateBtn.onclick = () => {
            updateBtn.textContent = 'Checking...';
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.5';
            updateBtn.style.cursor = 'not-allowed';
            checkForUpdates(true).finally(() => {
                setTimeout(() => {
                    updateBtn.textContent = 'Check for Updates';
                    updateBtn.disabled = false;
                    updateBtn.style.opacity = '1';
                    updateBtn.style.cursor = 'pointer';
                }, 1500);
            });
        };
        updateBtnContainer.appendChild(updateBtn);
        menu.appendChild(updateBtnContainer);

        document.body.appendChild(menu);
    }

    // Robust Menu Registration
    if (!window.__mgnQueueTimeMenuRegistered) {
        window.__mgnQueueTimeMenuRegistered = true;
        let menuInterval = setInterval(() => {
            if (Spicetify.Menu && Spicetify.Menu.Item) {
                new Spicetify.Menu.Item(
                    "Queue Time Settings",
                    false,
                    openSettings,
                    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>'
                ).register();
                clearInterval(menuInterval);
            } else if (Spicetify.Topbar && Spicetify.Topbar.Button) {
                new Spicetify.Topbar.Button("Queue Time Settings", '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>', openSettings).register();
                clearInterval(menuInterval);
            }
        }, 1000);
    }

    async function saveQueueToPlaylist() {
        let nextTracks = [];
        let stateQueue = Spicetify.Platform?.PlayerAPI?.getState()?.queue?.nextTracks;
        if (stateQueue && stateQueue.length > 0) {
            nextTracks = stateQueue;
        } else if (Spicetify.Queue?.nextTracks?.length > 0) {
            nextTracks = Spicetify.Queue.nextTracks;
        }
        
        if (nextTracks.length > 0) {
            let delimiterIndex = nextTracks.findIndex(t => t.uri === 'spotify:delimiter' || t.contextTrack?.uri === 'spotify:delimiter');
            if (delimiterIndex !== -1) {
                nextTracks = nextTracks.slice(0, delimiterIndex);
            }
            nextTracks = nextTracks.filter(t => t.provider !== 'autoplay' && !String(t.uri).includes('spotify:station:'));
        }

        if (!nextTracks || nextTracks.length === 0) {
            Spicetify.showNotification("Queue is empty!");
            return;
        }
        try {
            Spicetify.showNotification("Saving Queue to Playlist...");
            const me = await Spicetify.CosmosAsync.get('https://api.spotify.com/v1/me');
            const userId = me.id;
            const dateStr = new Date().toLocaleString();
            const playlist = await Spicetify.CosmosAsync.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
                name: `Saved Queue (${dateStr})`,
                public: false,
                description: "Saved from Queue Time Extension"
            });
            
            const uris = nextTracks.map(cur => cur.uri || cur.contextTrack?.uri || cur.item?.uri || cur.track?.uri || cur.metadata?.uri).filter(Boolean);
            
            for (let i = 0; i < uris.length; i += 100) {
                const chunk = uris.slice(i, i + 100);
                await Spicetify.CosmosAsync.post(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, { uris: chunk });
            Spicetify.showNotification("Successfully Saved! Waiting for Spotify to sync...");
            setTimeout(() => {
                if (Spicetify.Platform?.History?.push) {
                    Spicetify.Platform.History.push(`/playlist/${playlist.id}`);
                }
            }, 3000);
        } catch (e) {
            console.error("[Queue Time] Save failed:", e);
            Spicetify.showNotification("Failed to save Queue (check console)", true);
        }
    }

    // DOM Elements setup
    let qt_style = document.createElement("style");
    qt_style.innerHTML = `
    #mgn-queue-time-pill {
        position: fixed;
        bottom: 145px;
        left: 16px;
        z-index: 9999;
        background: var(--qt-bg-color, rgba(255,255,255,0.08));
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        padding: 4px 14px;
        color: var(--spice-text, #fff);
        font-size: 0.75rem;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        gap: 6px;
        transition: opacity 0.3s ease, transform 0.2s ease;
        opacity: 0;
        pointer-events: none;
        cursor: pointer;
    }
    #mgn-queue-time-pill.visible {
        opacity: 1;
        pointer-events: auto;
    }
    #mgn-queue-time-pill:hover {
        transform: translateY(-2px);
        background: rgba(40, 40, 40, 0.8);
        border-color: rgba(255,255,255,0.2);
    }
    #mgn-queue-time-pill svg {
        width: 12px;
        height: 12px;
        fill: currentColor;
        opacity: 0.8;
    }
    .mgn-qt-inline {
        margin-left: auto;
        font-size: 0.875rem;
        font-weight: 400;
        transition: opacity 0.2s;
        padding-right: 16px;
    }
    .mgn-qt-icon-btn {
        background: transparent;
        border: none;
        color: var(--spice-subtext);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border-radius: 4px;
    }
    .mgn-qt-icon-btn:hover {
        color: var(--spice-text);
        background: rgba(255,255,255,0.1);
    }
    `;
    document.head.appendChild(qt_style);

    let pill = document.createElement('div');
    pill.id = 'mgn-queue-time-pill';
    pill.onclick = () => { let m = document.getElementById('qt-settings-menu'); if (!m) { createSettingsMenu(); m = document.getElementById('qt-settings-menu'); } toggleSettingsMenu(m); };
    pill.title = "Queue Time Settings";
    pill.innerHTML = `<svg viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg><span id="mgn-qt-text"></span>`;
    document.body.appendChild(pill);
    const pillTextNode = pill.querySelector('#mgn-qt-text');

    let currentFormattedText = "";

    function applySettings() {
        const pill = document.getElementById("mgn-queue-time-pill");
        if (pill) {
            pill.style.display = settings.mode === 'pill' ? 'flex' : 'none';
            pill.style.color = settings.color || '#ffffff';
            pill.style.fontSize = settings.fontSize || '0.75rem';
            pill.style.fontWeight = settings.fontWeight || '600';
            pill.style.setProperty('--qt-bg-color', settings.bgColor || 'rgba(255,255,255,0.08)');
            // Fix svg size relative to font size
            const svg = pill.querySelector('svg');
            if (svg) {
                const fs = parseInt(settings.fontSize || '12') || 12;
                svg.style.width = `${fs}px`;
                svg.style.height = `${fs}px`;
            }
        }
    }

    const css = queueTimeCSS();
    if (css) document.head.appendChild(css);
    createSettingsMenu();

    applySettings(); // initial
    let cachedPlaylistLengths = {};

    window.__mgnQueueTimeState.interval = setInterval(() => {
        try {
            // Priority: The native PlayerAPI internal queue state is 100% reliable for all users.
            let nextTracks = [];
            let stateQueue = Spicetify.Platform?.PlayerAPI?.getState()?.queue?.nextTracks;
            if (stateQueue && stateQueue.length > 0) {
                nextTracks = stateQueue;
            } else if (Spicetify.Queue?.nextTracks?.length > 0) {
                nextTracks = Spicetify.Queue.nextTracks;
            }
            
            // Filter out Autoplay and Shuffle+ delimiters to perfectly count actual remaining songs!
            if (nextTracks.length > 0) {
                // Shuffle+ uses a delimiter, and Spotify dumps Autoplay songs after it. 
                // Truncating at the delimiter guarantees we strip out ALL fake songs.
                let delimiterIndex = nextTracks.findIndex(t => t.uri === 'spotify:delimiter' || t.contextTrack?.uri === 'spotify:delimiter');
                if (delimiterIndex !== -1) {
                    nextTracks = nextTracks.slice(0, delimiterIndex);
                }
                
                // Fallback for native Spotify Autoplay songs
                nextTracks = nextTracks.filter(t => t.provider !== 'autoplay' && !String(t.uri).includes('spotify:station:'));
            }
            
            let numSongs = nextTracks.length;
            let totalTimeMs = 0;
            let isEstimated = false;
            let state = Spicetify.Platform?.PlayerAPI?.getState();

            if (numSongs > 0 || state?.item) {
                // Add current track to the count
                numSongs += 1;
                
                if (nextTracks.length > 0) {
                totalTimeMs = nextTracks.reduce((acc, cur) => {
                    const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                    return acc + duration;
                }, 0);
                }
            }
            

            if (numSongs === 0) {
                currentFormattedText = "Empty";
                if (settings.mode === 'pill') pill.classList.add('visible');
            } else {
                const currentDur = Spicetify.Player.getDuration ? Spicetify.Player.getDuration() : 0;
                const currentProg = Spicetify.Player.getProgress ? Spicetify.Player.getProgress() : 0;
                totalTimeMs = Math.max(0, totalTimeMs + currentDur - currentProg);

                const totalSeconds = Math.floor(totalTimeMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                let timeStr = "";
                if (hours > 0) {
                    timeStr = `${hours}hr ${minutes}m ${seconds}s`;
                } else {
                    timeStr = `${minutes}m ${seconds}s`;
                }
                
                let songString = numSongs === 1 ? '1 song' : `${numSongs} songs`;
                
                if (settings.format === 'time') {
                    currentFormattedText = timeStr;
                } else {
                    currentFormattedText = `${songString} • ${timeStr}`;
                }

                if (settings.mode === 'pill') {
                    pillTextNode.textContent = currentFormattedText;
                    pill.classList.add('visible');
                }
            }

            // In-Queue Text Injection (Global H2 Search)
            if (settings.mode === 'text') {
                let headers = Array.from(document.querySelectorAll('h2'));
                
                headers.forEach(h2 => {
                    let text = h2.textContent.toLowerCase();
                    if (text.includes("next in queue") || text.includes("next from")) {
                        if (!h2.querySelector('.mgn-qt-inline')) {
                            let injectDiv = document.createElement('span');
                            injectDiv.className = 'mgn-qt-inline';
                            injectDiv.style.display = 'inline-flex';
                            injectDiv.style.alignItems = 'center';
                            injectDiv.style.gap = '8px';
                            injectDiv.style.marginLeft = '16px';
                            injectDiv.style.verticalAlign = 'middle';
                            
                            // 1. Text
                            let textSpan = document.createElement('span');
                            textSpan.className = 'mgn-qt-time-text';
                            textSpan.style.color = settings.color || 'var(--spice-subtext)';
                            textSpan.style.fontSize = settings.fontSize || '14px';
                            textSpan.style.fontWeight = '400';
                            injectDiv.appendChild(textSpan);
                            
                            // 2. Settings Gear
                            let gearBtn = document.createElement('button');
                            gearBtn.className = 'mgn-qt-icon-btn';
                            gearBtn.title = 'Settings';
                            gearBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>';
                            gearBtn.onclick = () => { let m = document.getElementById('qt-settings-menu'); if (!m) { createSettingsMenu(); m = document.getElementById('qt-settings-menu'); } toggleSettingsMenu(m); };
                            injectDiv.appendChild(gearBtn);
                            
                            // 3. Save Playlist
                            let saveBtn = document.createElement('button');
                            saveBtn.className = 'mgn-qt-icon-btn';
                            saveBtn.title = 'Save Queue to Playlist';
                            saveBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M14 2H2v12h12V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"></path><path d="M8 4.5a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3a.5.5 0 0 1 .5-.5z"></path></svg>';
                            saveBtn.onclick = () => saveQueueToPlaylist();
                            injectDiv.appendChild(saveBtn);

                            h2.appendChild(injectDiv);
                        }
                        
                        let inlineSpan = h2.querySelector('.mgn-qt-time-text');
                        if (inlineSpan) {
                            inlineSpan.textContent = currentFormattedText;
                            inlineSpan.style.color = settings.color || 'var(--spice-subtext)';
                            inlineSpan.style.fontSize = settings.fontSize || '14px';
                        }
                    }
                });
            } else {
                document.querySelectorAll('.mgn-qt-inline').forEach(el => el.remove());
            }

        } catch (e) {
            console.error("[Queue Time] Error:", e);
        }
    }, 1000);
})();

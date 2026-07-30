// NAME: Queue Time
// AUTHOR: GamerNation12
// DESCRIPTION: Displays Queue Time
(function QueueTime() {
    console.log("[Queue Time] Script evaluating...");
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player || !document.body) {
        console.log("[Queue Time] Waiting for Spicetify Player API and document.body to load...");
        setTimeout(QueueTime, 300);
        return;
    }
    console.log("[Queue Time] Spicetify loaded, building UI!");

    if (document.getElementById('mgn-queue-time-pill') || window.__mgnQueueTimeRunning) {
        console.log("[Queue Time] UI already exists. Aborting duplicate init.");
        return;
    }
    window.__mgnQueueTimeRunning = true;

    const QT_VERSION = "2.0.4";
    let QT_CHANGELOG_LINES = [
        "Massive Queue Time Settings Redesign!",
        "Added a sleek, native-feeling premium settings menu with rounded edges and micro-animations.",
        "Added this beautiful startup changelog popup (brought over from Beautiful Release Date) so you always know what's new."
    ];

    // Default Settings
    const defaultSettings = {
        mode: 'text', // 'pill' or 'text'
        format: 'both', // 'both' (80 songs, 5hr 4m), 'time' (5hr 4m)
        color: '#ffffff'
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
    setInterval(checkForUpdates, 1000 * 60 * 60);

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

    // Settings Modal
    function openSettings() {
        const container = document.createElement("div");
        container.innerHTML = `
            <style>
                .qt-setting-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 8px; transition: background 0.2s; }
                .qt-setting-row:hover { background: rgba(255,255,255,0.08); }
                .qt-select { background: rgba(0,0,0,0.2); color: var(--spice-text); border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px; outline: none; cursor: pointer; font-family: inherit; font-size: 13px; }
                .qt-select:hover { background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.2); }
                .qt-color-picker { width: 32px; height: 32px; border: none; border-radius: 50%; cursor: pointer; background: none; overflow: hidden; padding: 0; }
                .qt-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
                .qt-color-picker::-webkit-color-swatch { border: none; border-radius: 50%; box-shadow: 0 0 0 1px rgba(255,255,255,0.2); }
                .qt-btn { flex: 1; padding: 12px; border-radius: 8px; border: none; font-weight: 700; font-size: 13px; cursor: pointer; transition: transform 0.1s, filter 0.2s; color: #000; }
                .qt-btn:hover { transform: scale(1.02); filter: brightness(1.1); }
                .qt-btn:active { transform: scale(0.98); }
                .qt-save-btn { background: #1ed760; }
                .qt-update-btn { background: rgba(255,255,255,0.1); color: var(--spice-text); border: 1px solid rgba(255,255,255,0.1); }
            </style>
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 4px;">
                <div class="qt-setting-row">
                    <label style="color: var(--spice-text); font-weight: 600; font-size: 14px;">Display Mode</label>
                    <select id="qt-mode" class="qt-select">
                        <option value="pill" ${settings.mode === 'pill' ? 'selected' : ''}>Floating Pill</option>
                        <option value="text" ${settings.mode === 'text' ? 'selected' : ''}>In-Queue Text</option>
                    </select>
                </div>
                <div class="qt-setting-row">
                    <label style="color: var(--spice-text); font-weight: 600; font-size: 14px;">Text Format</label>
                    <select id="qt-format" class="qt-select">
                        <option value="both" ${settings.format === 'both' ? 'selected' : ''}>Songs & Time (e.g. 80 songs • 5hr 4m)</option>
                        <option value="time" ${settings.format === 'time' ? 'selected' : ''}>Time Only (e.g. 5hr 4m)</option>
                    </select>
                </div>
                <div class="qt-setting-row">
                    <label style="color: var(--spice-text); font-weight: 600; font-size: 14px;">Custom Color</label>
                    <input type="color" id="qt-color" class="qt-color-picker" value="${settings.color}">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button id="qt-save" class="qt-btn qt-save-btn">Save & Apply</button>
                    <button id="qt-update-btn" class="qt-btn qt-update-btn">Check for Updates</button>
                </div>
                <div style="text-align: center; font-size: 11px; color: var(--spice-subtext); margin-top: 4px; opacity: 0.6; font-weight: 600;">Queue Time v${QT_VERSION}</div>
            </div>
        `;

        Spicetify.PopupModal.display({
            title: "Queue Time Settings",
            content: container,
            isLarge: false
        });

        container.querySelector("#qt-save").onclick = () => {
            settings.mode = container.querySelector("#qt-mode").value;
            settings.format = container.querySelector("#qt-format").value;
            settings.color = container.querySelector("#qt-color").value;
            saveSettings();
            Spicetify.PopupModal.hide();
        };
        
        const updateBtn = container.querySelector("#qt-update-btn");
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
    }

    // Robust Menu Registration
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
            new Spicetify.Topbar.Button(
                "Queue Time Settings",
                '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>',
                openSettings
            );
            clearInterval(menuInterval);
        }
    }, 1000);

    // Save Queue to Playlist Logic
    async function saveQueueToPlaylist(nextTracks) {
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
            }
            Spicetify.showNotification("Successfully Saved Queue!");
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
        background: rgba(30, 30, 30, 0.7);
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
        opacity: 0.7;
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
    pill.onclick = openSettings;
    pill.title = "Queue Time Settings";
    pill.innerHTML = `<svg viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg><span id="mgn-qt-text"></span>`;
    document.body.appendChild(pill);
    const pillTextNode = pill.querySelector('#mgn-qt-text');

    let currentFormattedText = "";

    function applySettings() {
        if (settings.mode === 'text') {
            pill.classList.remove('visible');
        } else {
            pill.style.color = settings.color;
        }
    }

    applySettings(); // initial

    setInterval(() => {
        try {
            // Priority: The native PlayerAPI internal queue state is 100% reliable for all users.
            let nextTracks = [];
            let stateQueue = Spicetify.Platform?.PlayerAPI?.getState()?.queue?.nextTracks;
            if (stateQueue && stateQueue.length > 0) {
                nextTracks = stateQueue;
            } else if (Spicetify.Queue?.nextTracks?.length > 0) {
                nextTracks = Spicetify.Queue.nextTracks;
            }
            
            let numSongs = nextTracks.length;
            let totalTimeMs = 0;
            let isEstimated = false;

            if (numSongs > 0) {
                totalTimeMs = nextTracks.reduce((acc, cur) => {
                    const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                    return acc + duration;
                }, 0);
            }
            
            if (numSongs >= 80) {
                const state = Spicetify.Platform?.PlayerAPI?.getState();
                const contextCount = Number(state?.context?.metadata?.track_count);
                const currentIndex = Number(state?.index?.track);
                
                if (!isNaN(contextCount) && !isNaN(currentIndex)) {
                    const contextRemaining = Math.max(0, contextCount - currentIndex - 1);
                    const queuedLength = state?.queue?.queued?.length || 0;
                    const calculatedRemaining = contextRemaining + queuedLength;
                    
                    if (calculatedRemaining > numSongs) {
                        isEstimated = true;
                        const avgTime = totalTimeMs / numSongs;
                        numSongs = calculatedRemaining;
                        totalTimeMs = avgTime * numSongs;
                    }
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
                
                if (isEstimated) {
                    timeStr = "~" + timeStr;
                }
                
                if (nextTracks.length === 0) {
                    timeStr = "~" + timeStr;
                }
                
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
                        let container = h2.parentElement;
                        
                        if (container && !container.querySelector('.mgn-qt-inline')) {
                            if (window.getComputedStyle(container).display !== 'flex') {
                                container.style.display = 'flex';
                                container.style.alignItems = 'center';
                                container.style.justifyContent = 'space-between';
                                container.style.width = '100%';
                            }
                            
                            let injectDiv = document.createElement('div');
                            injectDiv.className = 'mgn-qt-inline';
                            injectDiv.style.display = 'flex';
                            injectDiv.style.alignItems = 'center';
                            injectDiv.style.gap = '8px';
                            injectDiv.style.marginLeft = 'auto';
                            injectDiv.style.paddingRight = '16px';
                            
                            // 1. Text
                            let textSpan = document.createElement('span');
                            textSpan.className = 'mgn-qt-time-text';
                            textSpan.style.color = settings.color;
                            injectDiv.appendChild(textSpan);
                            
                            // 2. Settings Gear
                            let gearBtn = document.createElement('button');
                            gearBtn.className = 'mgn-qt-icon-btn';
                            gearBtn.title = 'Settings';
                            gearBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>';
                            gearBtn.onclick = openSettings;
                            injectDiv.appendChild(gearBtn);
                            
                            // 3. Save Playlist
                            let saveBtn = document.createElement('button');
                            saveBtn.className = 'mgn-qt-icon-btn';
                            saveBtn.title = 'Save Queue to Playlist';
                            saveBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M14 2H2v12h12V2zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"></path><path d="M8 4.5a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3a.5.5 0 0 1 .5-.5z"></path></svg>';
                            saveBtn.onclick = () => saveQueueToPlaylist(nextTracks);
                            injectDiv.appendChild(saveBtn);

                            container.appendChild(injectDiv);
                        }
                        
                        let inlineSpan = container.querySelector('.mgn-qt-time-text');
                        if (inlineSpan) {
                            inlineSpan.textContent = currentFormattedText;
                            inlineSpan.style.color = settings.color;
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

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
    
    window.__mgnQueueTimeState = {};

    const QT_VERSION = "2.0.18";
    let QT_CHANGELOG_LINES = [
        "The displayed song count now correctly includes the currently playing track so it mathematically matches the remaining time!",
        "Added this beautiful startup changelog popup (brought over from Beautiful Release Date) so you always know what's new."
    ];

    // Default Settings
    const defaultSettings = {
        mode: 'text', // 'pill' or 'text'
        format: 'both', // 'both' (80 songs, 5hr 4m 16s), 'time' (5hr 4m 16s)
        calc: 'playlist', // 'queue' (80 limit) or 'playlist' (estimate full length)
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
                        <option value="both" ${settings.format === 'both' ? 'selected' : ''}>Songs & Time (e.g. 80 songs • 5hr 4m 16s)</option>
                        <option value="time" ${settings.format === 'time' ? 'selected' : ''}>Time Only (e.g. 5hr 4m 16s)</option>
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
            
            let numSongs = nextTracks.length;
            let totalTimeMs = 0;
            let isEstimated = false;

            if (numSongs > 0) {
                totalTimeMs = nextTracks.reduce((acc, cur) => {
                    const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                    return acc + duration;
                }, 0);
            }
            
            let state = Spicetify.Platform?.PlayerAPI?.getState();
            
            // Try to find the exact current index using the context URI if native index is missing
            let currentIndex = Number(state?.index?.track) || Number(state?.index?.itemIndex);
            
            // If the native index is missing or 0 (and we know it shouldn't always be 0), we can try to locate it in the nextTracks context
            if (isNaN(currentIndex) || currentIndex === 0) {
                // For now, if we can't find it natively, we just rely on our best guess.
                // Actually, if we track the last known track URI, we can manually increment it!
                if (!window.__mgnQueueTimeState.lastTrackUri) {
                    window.__mgnQueueTimeState.lastTrackUri = state?.item?.uri;
                    window.__mgnQueueTimeState.manualIndex = 0;
                } else if (window.__mgnQueueTimeState.lastTrackUri !== state?.item?.uri) {
                    // Song changed!
                    window.__mgnQueueTimeState.lastTrackUri = state?.item?.uri;
                    window.__mgnQueueTimeState.manualIndex = (window.__mgnQueueTimeState.manualIndex || 0) + 1;
                }
                
                // Fallback to our manual counter if native is broken
                if (isNaN(currentIndex)) {
                    currentIndex = window.__mgnQueueTimeState.manualIndex || 0;
                } else if (currentIndex === 0 && window.__mgnQueueTimeState.manualIndex > 0) {
                    // If native says 0 but we know we've skipped songs, native is probably broken/stuck
                    currentIndex = window.__mgnQueueTimeState.manualIndex;
                }
            }

            if (numSongs >= 80) {
                const uri = state?.context?.uri;
                let contextCount = Number(state?.context?.metadata?.track_count);
                
                if (isNaN(contextCount) && uri && uri.includes('spotify:playlist:')) {
                    if (cachedPlaylistLengths[uri] !== undefined) {
                        contextCount = cachedPlaylistLengths[uri];
                    } else if (!cachedPlaylistLengths[uri + "_fetching"]) {
                        cachedPlaylistLengths[uri + "_fetching"] = true;
                        const playlistId = uri.split(':').pop();
                        
                        // 1. Try Spicetify Platform API (Safest & Official Internal API)
                        let found = false;
                        if (Spicetify.Platform?.PlaylistAPI?.getMetadata) {
                            console.log("[Queue Time Debug] Trying PlaylistAPI.getMetadata for", uri);
                            Spicetify.Platform.PlaylistAPI.getMetadata(uri).then(md => {
                                console.log("[Queue Time Debug] getMetadata response:", md);
                                let len = md?.length ?? md?.totalLength ?? md?.trackCount ?? md?.tracks?.length ?? md?.duration;
                                if (typeof len === 'number') {
                                    console.log("[Queue Time Debug] Success getMetadata length:", len);
                                    cachedPlaylistLengths[uri] = len;
                                    found = true;
                                }
                            }).catch(e => {
                                console.error("[Queue Time Debug] getMetadata failed:", e);
                            });
                        }

                        setTimeout(() => {
                            if (found) return;
                            
                            // 2. Try internal local Cosmos API
                            console.log("[Queue Time Debug] Trying Cosmos sp://core-playlist for", uri);
                            Spicetify.CosmosAsync.get('sp://core-playlist/v1/playlist/' + uri).then(pl => {
                                console.log("[Queue Time Debug] Cosmos core-playlist response:", pl);
                                let len = pl?.playlist?.length ?? pl?.length ?? pl?.tracks?.length ?? pl?.tracks?.total;
                                if (typeof len === 'number') {
                                    console.log("[Queue Time Debug] Success core-playlist length:", len);
                                    cachedPlaylistLengths[uri] = len;
                                } else {
                                    throw new Error("Local cache failed");
                                }
                            }).catch(e => {
                                console.warn("[Queue Time Debug] Cosmos core-playlist failed:", e);
                                // 3. Fallback to Web API
                                console.log("[Queue Time Debug] Trying Web API for", playlistId);
                                Spicetify.CosmosAsync.get('https://api.spotify.com/v1/playlists/' + playlistId).then(pl => {
                                    console.log("[Queue Time Debug] Web API response:", pl);
                                    let len = pl?.tracks?.total ?? pl?.tracks?.length ?? pl?.length;
                                    if (typeof len === 'number') {
                                        console.log("[Queue Time Debug] Success Web API length:", len);
                                        cachedPlaylistLengths[uri] = len;
                                    } else {
                                        throw new Error("Invalid playlist response");
                                    }
                                }).catch(e => {
                                    console.error("[Queue Time Debug] All APIs Failed to fetch playlist length", e);
                                    setTimeout(() => { cachedPlaylistLengths[uri + "_fetching"] = false; }, 60000);
                                });
                            });
                        }, 500);
                    }
                }
                
                if (!isNaN(contextCount)) {
                    console.log("[Queue Time Debug] state.index:", JSON.stringify(state?.index));
                    console.log("[Queue Time Debug] Estimating... contextCount:", contextCount, "currentIndex:", currentIndex, "numSongs:", numSongs);
                    let queuedLength = 0;
                    if (Spicetify.Queue?.nextTracks) {
                        queuedLength = Spicetify.Queue.nextTracks.filter(t => t.provider === 'queue').length;
                    }

                    const contextRemaining = Math.max(0, contextCount - currentIndex - 1);
                    const totalRemaining = contextRemaining + queuedLength;

                    if (totalRemaining > numSongs) {
                        const estimatedDurationAvg = totalTimeMs / numSongs;
                        totalTimeMs = estimatedDurationAvg * totalRemaining;
                        numSongs = totalRemaining;
                        isEstimated = true;
                    } else if (totalRemaining < numSongs) {
                        // The queue has MORE songs than the playlist has left!
                        // This happens when Repeat or Autoplay is ON for small playlists and inflates nextTracks to 80.
                        // We truncate the queue to only sum the true remaining songs of the current playlist context.
                        numSongs = totalRemaining;
                        totalTimeMs = nextTracks.slice(0, numSongs).reduce((acc, cur) => {
                            const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                            return acc + duration;
                        }, 0);
                        isEstimated = true;
                    }
                } else {
                    console.log("[Queue Time Debug] Skipping estimation, contextCount is NaN. state.index:", state?.index);
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
                
                let displayedSongs = numSongs + 1;
                let songString = displayedSongs === 1 ? '1 song' : `${displayedSongs} songs`;
                
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
                            textSpan.style.fontSize = '14px'; // Slightly smaller to match standard subtext
                            textSpan.style.fontWeight = '400';
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

                            h2.appendChild(injectDiv);
                        }
                        
                        let inlineSpan = h2.querySelector('.mgn-qt-time-text');
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

// NAME: Queue Time
// AUTHOR: GamerNation12
// DESCRIPTION: Displays Queue Time
(function QueueTime() {
    console.log("[Queue Time] Script evaluating...");
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player || !document.body || !Spicetify.Topbar) {
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

    // Settings Modal
    function openSettings() {
        const container = document.createElement("div");
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="color: var(--spice-text); font-size: 14px;">Display Mode</label>
                    <select id="qt-mode" style="background: var(--spice-button-disabled); color: var(--spice-text); border: none; padding: 8px; border-radius: 4px;">
                        <option value="pill" ${settings.mode === 'pill' ? 'selected' : ''}>Floating Pill</option>
                        <option value="text" ${settings.mode === 'text' ? 'selected' : ''}>In-Queue Text</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="color: var(--spice-text); font-size: 14px;">Text Format</label>
                    <select id="qt-format" style="background: var(--spice-button-disabled); color: var(--spice-text); border: none; padding: 8px; border-radius: 4px;">
                        <option value="both" ${settings.format === 'both' ? 'selected' : ''}>Songs & Time (e.g. 80 songs • 5hr 4m)</option>
                        <option value="time" ${settings.format === 'time' ? 'selected' : ''}>Time Only (e.g. 5hr 4m)</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="color: var(--spice-text); font-size: 14px;">Custom Color</label>
                    <input type="color" id="qt-color" value="${settings.color}" style="background: none; border: none; cursor: pointer;">
                </div>
                <button id="qt-save" style="margin-top: 10px; background: var(--spice-button-active); color: var(--spice-text); border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold;">Save & Apply</button>
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
    }

    // Register Menu Item
    if (Spicetify.Menu && Spicetify.Menu.Item) {
        new Spicetify.Menu.Item(
            "Queue Time Settings",
            false,
            openSettings,
            '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>'
        ).register();
    } else if (Spicetify.Topbar && Spicetify.Topbar.Button) {
        new Spicetify.Topbar.Button(
            "Queue Time Settings",
            '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg>',
            openSettings
        );
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
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: opacity 0.3s ease, transform 0.2s ease;
        opacity: 0;
        pointer-events: none;
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
    `;
    document.head.appendChild(qt_style);

    let pill = document.createElement('div');
    pill.id = 'mgn-queue-time-pill';
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

            if (numSongs > 0) {
                totalTimeMs = nextTracks.reduce((acc, cur) => {
                    const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                    return acc + duration;
                }, 0);
            } else {
                const domRows = document.querySelectorAll('.Root__right-sidebar .main-trackList-row, .queue-panel .main-trackList-row, [data-testid="right-sidebar"] .main-trackList-row');
                if (domRows.length > 0) {
                    numSongs = Math.max(1, domRows.length - 1);
                    totalTimeMs = numSongs * 210000;
                }
            }

            if (numSongs === 0) {
                currentFormattedText = "Empty";
                if (settings.mode === 'pill') pill.classList.add('visible');
            } else {
                const currentDur = Spicetify.Player.getDuration ? Spicetify.Player.getDuration() : 0;
                const currentProg = Spicetify.Player.getProgress ? Spicetify.Player.getProgress() : 0;
                totalTimeMs = Math.max(0, totalTimeMs + currentDur - currentProg);

                const totalMinutes = Math.floor(totalTimeMs / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                let timeStr = hours > 0 ? `${hours}hr ${minutes}m` : `${minutes}m`;
                let songString = numSongs === 1 ? '1 song' : `${numSongs} songs`;
                
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

            // In-Queue Text Injection
            if (settings.mode === 'text') {
                let headers = Array.from(document.querySelectorAll('.Root__right-sidebar h2, .queue-panel h2, [data-testid="right-sidebar"] h2'));
                
                headers.forEach(h2 => {
                    let text = h2.textContent.toLowerCase();
                    if (text.includes("now playing") || text.includes("next in queue") || text.includes("next from")) {
                        let container = h2.parentElement;
                        
                        if (container && !container.querySelector('.mgn-qt-inline')) {
                            if (window.getComputedStyle(container).display !== 'flex') {
                                container.style.display = 'flex';
                                container.style.alignItems = 'center';
                                container.style.justifyContent = 'space-between';
                                container.style.width = '100%';
                            }
                            let span = document.createElement('span');
                            span.className = 'mgn-qt-inline';
                            span.style.color = settings.color;
                            container.appendChild(span);
                        }
                        
                        let inlineSpan = container.querySelector('.mgn-qt-inline');
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

(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

    let qt_style = document.createElement("style");
    qt_style.innerHTML = `
    #mgn-queue-time-pill {
        position: fixed;
        bottom: 145px; /* Placed right above the beautiful release date pill */
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
    `;
    document.head.appendChild(qt_style);

    let pill = document.createElement('div');
    pill.id = 'mgn-queue-time-pill';
    pill.innerHTML = `<svg viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg><span id="mgn-qt-text"></span>`;
    document.body.appendChild(pill);
    const textNode = pill.querySelector('#mgn-qt-text');

    setInterval(() => {
        let nextTracks = Spicetify.Queue?.nextTracks || Spicetify.Queue?.next_tracks || [];
        let numSongs = nextTracks.length;
        let totalTimeMs = 0;

        if (numSongs > 0) {
            totalTimeMs = nextTracks.reduce((acc, cur) => {
                const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                return acc + duration;
            }, 0);
            totalTimeMs = Math.max(0, totalTimeMs + Spicetify.Player.getDuration() - Spicetify.Player.getProgress());
        } else {
            // DOM Fallback for Context Queues that Spotify hides from the API
            const domRows = document.querySelectorAll('.main-trackList-rowDuration');
            if (domRows.length > 0) {
                domRows.forEach(el => {
                    const txt = el.textContent.trim();
                    const parts = txt.split(':');
                    if (parts.length === 2) {
                        totalTimeMs += (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
                        numSongs++;
                    } else if (parts.length === 3) {
                        totalTimeMs += (parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])) * 1000;
                        numSongs++;
                    }
                });
            }
        }

        if (numSongs === 0) {
            pill.classList.remove('visible');
            return;
        }

        const totalMinutes = Math.floor(totalTimeMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        let timeStr = hours > 0 ? `${hours}hr ${minutes}m` : `${minutes}m`;
        const songString = numSongs === 1 ? '1 song' : `${numSongs} songs`;
        
        textNode.textContent = `${songString} • ${timeStr}`;
        pill.classList.add('visible');
    }, 1000);
})();

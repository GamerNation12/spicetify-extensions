// NAME: Queue Time
// AUTHOR: GN
// DESCRIPTION: Displays Queue Time
(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

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
    `;
    document.head.appendChild(qt_style);

    let pill = document.createElement('div');
    pill.id = 'mgn-queue-time-pill';
    pill.innerHTML = `<svg viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path></svg><span id="mgn-qt-text"></span>`;
    document.body.appendChild(pill);
    const textNode = pill.querySelector('#mgn-qt-text');

    setInterval(() => {
        try {
            // Try to find the queue from multiple possible Spicetify structures
            let nextTracks = [];
            if (Spicetify.Queue?.nextTracks?.length > 0) nextTracks = Spicetify.Queue.nextTracks;
            else if (Spicetify.Queue?.next_tracks?.length > 0) nextTracks = Spicetify.Queue.next_tracks;
            else if (Spicetify.Platform?.PlayerAPI?.getState()?.queue?.nextTracks?.length > 0) nextTracks = Spicetify.Platform.PlayerAPI.getState().queue.nextTracks;
            
            let numSongs = nextTracks.length;
            let totalTimeMs = 0;

            if (numSongs > 0) {
                totalTimeMs = nextTracks.reduce((acc, cur) => {
                    const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration || cur.metadata?.duration) || 0;
                    return acc + duration;
                }, 0);
            } else {
                // DOM Fallback: The right sidebar Queue panel does NOT show durations, so we estimate based on track count
                const domRows = document.querySelectorAll('.Root__right-sidebar .main-trackList-row, .queue-panel .main-trackList-row, [data-testid="right-sidebar"] .main-trackList-row');
                if (domRows.length > 0) {
                    // Usually there's the "Now Playing" track at the top, so we subtract 1.
                    numSongs = Math.max(1, domRows.length - 1);
                    totalTimeMs = numSongs * 210000; // ~3.5 mins average per song
                }
            }

            if (numSongs === 0) {
                textNode.textContent = "Queue Empty (or API blocked)";
                pill.classList.add('visible');
                return;
            }

            const currentDur = Spicetify.Player.getDuration ? Spicetify.Player.getDuration() : 0;
            const currentProg = Spicetify.Player.getProgress ? Spicetify.Player.getProgress() : 0;
            totalTimeMs = Math.max(0, totalTimeMs + currentDur - currentProg);

            const totalMinutes = Math.floor(totalTimeMs / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            let timeStr = hours > 0 ? `${hours}hr ${minutes}m` : `${minutes}m`;
            let songString = numSongs === 1 ? '1 song' : `${numSongs} songs`;
            
            // Add a ~ symbol if we used the DOM fallback estimate
            if (nextTracks.length === 0) {
                timeStr = "~" + timeStr;
            }
            
            textNode.textContent = `${songString} • ${timeStr}`;
            pill.classList.add('visible');
        } catch (e) {
            textNode.textContent = "Error: " + e.message;
            pill.classList.add('visible');
        }
    }, 1000);
})();

(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

    let qt_style = document.createElement("style");
    qt_style.innerHTML = `
    #mgn-queue-time-pill {
        position: fixed;
        bottom: 105px;
        right: 24px;
        z-index: 9999;
        background: rgba(30, 30, 30, 0.7);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        padding: 6px 16px;
        color: var(--spice-text, #fff);
        font-size: 0.8rem;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        backdrop-filter: blur(12px) saturate(150%);
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.3s ease, transform 0.2s ease;
        opacity: 0;
        pointer-events: none;
    }
    #mgn-queue-time-pill.visible {
        opacity: 1;
        pointer-events: auto;
    }
    #mgn-queue-time-pill:hover {
        transform: translateY(-2px) scale(1.02);
        background: rgba(40, 40, 40, 0.8);
        border-color: rgba(255,255,255,0.2);
    }
    #mgn-queue-time-pill svg {
        width: 14px;
        height: 14px;
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
        const nextTracks = Spicetify.Queue?.nextTracks || Spicetify.Queue?.next_tracks || [];
        const numSongs = nextTracks.length;
        
        if (numSongs === 0) {
            pill.classList.remove('visible');
            return;
        }

        const totalTimeMs = nextTracks.reduce((acc, cur) => {
            const duration = Number(cur.duration || cur.contextTrack?.metadata?.duration || cur.item?.duration?.milliseconds || cur.track?.metadata?.duration) || 0;
            return acc + duration;
        }, 0);

        const ms = Math.max(0, totalTimeMs + Spicetify.Player.getDuration() - Spicetify.Player.getProgress());
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        let timeStr = hours > 0 ? `${hours}hr ${minutes}m` : `${minutes}m`;
        const songString = numSongs === 1 ? '1 song' : `${numSongs} songs`;
        
        textNode.textContent = `${songString} • ${timeStr}`;
        pill.classList.add('visible');
    }, 1000);
})();

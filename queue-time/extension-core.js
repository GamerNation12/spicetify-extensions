(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Queue || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

    let qt_style = document.createElement("style");
    qt_style.innerHTML = `
    .mgn-queue-time-header::after {
        content: var(--queue-remaining);
        color: var(--spice-subtext, #a7a7a7);
        font-size: 0.875rem;
        font-weight: 400;
        white-space: nowrap;
    }
    `;
    document.head.appendChild(qt_style);

    setInterval(() => {
        const nextTracks = Spicetify.Queue?.nextTracks || Spicetify.Queue?.next_tracks || [];
        const numSongs = nextTracks.length;
        
        if (numSongs === 0) {
            document.querySelectorAll('.mgn-queue-time-header').forEach(el => {
                el.style.setProperty('--queue-remaining', "''");
            });
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
        
        // Put the bullet inside the JS variable to avoid CSS concatenation quirks
        const displayString = ` • ${songString} • ${timeStr}`;

        const targetTexts = ["Next from", "Next in queue", "Next In Queue"];
        
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.nodeValue?.trim() || "";
            if (targetTexts.some(t => text.startsWith(t))) {
                let targetEl = node.parentElement;
                
                if (targetEl && targetEl.tagName === 'SPAN') {
                    targetEl = targetEl.parentElement;
                }
                
                if (targetEl && !targetEl.classList.contains('mgn-queue-time-header')) {
                    targetEl.classList.add('mgn-queue-time-header');
                }
                if (targetEl) {
                    targetEl.style.setProperty('--queue-remaining', `'${displayString}'`);
                }
            }
        }
    }, 1000);
})();

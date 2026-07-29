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
        const nextTracks = Spicetify.Queue.nextTracks || [];
        const numSongs = nextTracks.length;
        
        if (numSongs === 0) {
            document.querySelectorAll('.mgn-queue-time-header').forEach(el => {
                el.style.setProperty('--queue-remaining', "''");
            });
            return;
        }

        const totalTimeMs = nextTracks.reduce((acc, cur) => {
            const duration = Number(cur.contextTrack?.metadata?.duration) || 0;
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
        
        // Scope the search to prevent performance hits and find text nodes reliably
        const containers = document.querySelectorAll('.Root__right-sidebar, .Root__main-view, [data-testid="right-sidebar"], [data-testid="main-view"], .queue-panel');
        
        containers.forEach(container => {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                const text = node.nodeValue?.trim() || "";
                if (targetTexts.some(t => text.startsWith(t))) {
                    let targetEl = node.parentElement;
                    
                    // Add class to the direct parent of the text node
                    if (targetEl && !targetEl.classList.contains('mgn-queue-time-header')) {
                        targetEl.classList.add('mgn-queue-time-header');
                    }
                    if (targetEl) {
                        targetEl.style.setProperty('--queue-remaining', `'${displayString}'`);
                    }
                }
            }
        });
    }, 1000);
})();

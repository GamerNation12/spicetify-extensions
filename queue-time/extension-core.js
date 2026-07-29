(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Queue || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

    let qt_style = document.createElement("style");
    qt_style.innerHTML = `
    .mgn-queue-time-header::after {
        content: " • " var(--queue-remaining);
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
        const displayString = `${songString} • ${timeStr}`;

        const targetTexts = ["Next from", "Next in queue", "Next In Queue"];
        const potentialHeaders = document.querySelectorAll('h2, h3, span, p');
        
        potentialHeaders.forEach(el => {
            const text = el.textContent?.trim();
            if (targetTexts.some(t => text?.startsWith(t))) {
                const hasMatchingChild = Array.from(el.children).some(child => {
                    const childText = child.textContent?.trim();
                    return targetTexts.some(t => childText?.startsWith(t));
                });
                
                if (!hasMatchingChild) {
                    el.classList.add('mgn-queue-time-header');
                    el.style.setProperty('--queue-remaining', `'${displayString}'`);
                }
            }
        });
    }, 1000);
})();

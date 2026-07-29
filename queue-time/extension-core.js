(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Queue || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

    setInterval(() => {
        const nextTracks = Spicetify.Queue?.nextTracks || Spicetify.Queue?.next_tracks || [];
        const numSongs = nextTracks.length;
        
        if (numSongs === 0) {
            document.querySelectorAll('.mgn-queue-time-node').forEach(el => {
                el.remove();
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
        
        const displayString = ` • ${songString} • ${timeStr}`;

        const targetTexts = ["Next from", "Next in queue", "Next In Queue", "Next up"];
        
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.nodeValue?.trim() || "";
            if (targetTexts.some(t => text.startsWith(t))) {
                let targetEl = node.parentElement;
                
                if (targetEl && targetEl.tagName === 'SPAN') {
                    targetEl = targetEl.parentElement;
                }
                
                if (targetEl) {
                    let timeNode = targetEl.querySelector('.mgn-queue-time-node');
                    if (!timeNode) {
                        timeNode = document.createElement('span');
                        timeNode.className = 'mgn-queue-time-node';
                        timeNode.style.color = 'var(--spice-subtext, #a7a7a7)';
                        timeNode.style.fontSize = '0.875rem';
                        timeNode.style.fontWeight = '400';
                        timeNode.style.whiteSpace = 'nowrap';
                        timeNode.style.marginLeft = '4px';
                        targetEl.appendChild(timeNode);
                    }
                    if (timeNode.textContent !== displayString) {
                        timeNode.textContent = displayString;
                    }
                }
            }
        }
    }, 1000);
})();

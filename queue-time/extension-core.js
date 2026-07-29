(function QueueTime() {
    if (!Spicetify || !Spicetify.Platform || !Spicetify.Player) {
        setTimeout(QueueTime, 300);
        return;
    }

    setInterval(() => {
        const nextTracks = Spicetify.Queue?.nextTracks || Spicetify.Queue?.next_tracks || [];
        const numSongs = nextTracks.length;
        
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
        
        const displayString = numSongs > 0 ? ` • ${songString} • ${timeStr}` : "";

        const targetTexts = ["Next from", "Next in queue", "Next In Queue", "Next up"];
        
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            let text = node.nodeValue || "";
            let baseText = text;
            
            // If we already injected our string, strip it to get the clean base text
            if (text.includes(" • ")) {
                baseText = text.substring(0, text.indexOf(" • "));
            }
            
            const trimmed = baseText.trim();
            if (targetTexts.some(t => trimmed.startsWith(t))) {
                const newText = baseText + displayString;
                if (node.nodeValue !== newText) {
                    node.nodeValue = newText;
                }
            }
        }
    }, 1000);
})();

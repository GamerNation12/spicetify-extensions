/* MGN Release Date - 2026 Stabilized Edition */
(() => {
    const log = (...args) => console.log('[Release Date]', ...args);
    const albumCache = new Map();

    async function getAlbumData(albumId) {
        if (albumCache.has(albumId)) return albumCache.get(albumId);

        try {
            // Using the official Web API - the only unblockable method in 2026
            const data = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/albums/${albumId}`);
            
            const result = {
                name: data.name,
                artist: data.artists[0].name,
                image: data.images[0].url,
                releaseDate: new Date(data.release_date),
                type: data.album_type.toUpperCase()
            };

            albumCache.set(albumId, result);
            return result;
        } catch (e) {
            console.error("[Release Date] Web API failed:", e);
            return null;
        }
    }

    async function render() {
        const item = Spicetify.Player.data?.item;
        if (!item || !item.album) return;

        const albumId = item.album.uri.split(':')[2];
        const data = await getAlbumData(albumId);
        if (!data) return;

        // Clean up old elements to prevent the "double date" bug
        document.querySelectorAll('#mgn-release-date').forEach(el => el.remove());

        // Target the artist name area (most stable anchor point)
        const target = document.querySelector(".main-trackInfo-artists");
        if (!target) return;

        const root = document.createElement('span');
        root.id = 'mgn-release-date';
        root.style.cssText = "color: var(--spice-subtext); font-size: 0.8rem; margin-left: 8px; cursor: pointer;";
        
        // Format: • March 12, 2000 (ALBUM)
        const dateString = data.releaseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        root.innerHTML = `• ${dateString} <span style="background: var(--spice-button); color: black; padding: 0px 6px; border-radius: 4px; font-weight: bold; font-size: 0.65rem; margin-left: 4px;">${data.type}</span>`;
        
        root.onclick = () => {
            Spicetify.showNotification(`Album: ${data.name} by ${data.artist}`);
        };

        target.appendChild(root);
    }

    // Initialize
    Spicetify.Player.addEventListener('songchange', () => {
        // Short delay to let Spotify's UI update before we inject our code
        setTimeout(render, 300);
    });

    // Run once on load
    render();
    log('Stabilized 2026 Version Loaded.');
})();
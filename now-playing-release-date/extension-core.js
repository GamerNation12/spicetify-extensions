/* MGN Release Date - 2026 Professional GraphQL Edition */
(() => {
    const log = (...args) => console.log('[Release Date]', ...args);
    const albumCache = new Map();

    async function getTrackDetailsRD() {
        const item = Spicetify.Player.data?.item;
        if (!item?.album) return null;
        const albumUri = item.album.uri;
        const albumId = albumUri.split(':')[2];

        if (albumCache.has(albumId)) return albumCache.get(albumId);

        try {
            // The unblockable 2026 GraphQL query
            const response = await Spicetify.GraphQL.Request({
                name: "getAlbum",
                sha256Hash: "46ae254517551c05bb920660c3c3060596b61066c3f04222a013ca3067da677a",
                variables: { uri: albumUri, locale: "en", offset: 0, limit: 1 }
            });

            const albumData = response.data.albumUnion;
            const releaseDate = albumData.date.isoString 
                ? new Date(albumData.date.isoString) 
                : new Date(albumData.date.year, (albumData.date.month || 1) - 1, albumData.date.day || 1);

            const result = {
                name: albumData.name,
                artist: albumData.artists.items[0].profile.name,
                image: albumData.coverArt.sources[0].url,
                type: albumData.type || "Album",
                date: releaseDate
            };

            albumCache.set(albumId, result);
            return result;
        } catch (e) {
            log("GraphQL Failed, using basic info", e);
            return {
                name: item.album.name,
                artist: item.artists[0].name,
                image: item.album.images[0].url,
                type: "Song",
                date: new Date(2000, 0, 1) // Safe fallback
            };
        }
    }

    function releaseDateCSS() {
        if (document.getElementById('mgn-style')) return;
        const style = document.createElement('style');
        style.id = 'mgn-style';
        style.innerHTML = `
            #settingsMenu { 
                display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(24, 24, 24, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
                padding: 24px; border-radius: 20px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); flex-direction: column; width: 400px; z-index: 10001; 
            }
            #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; backdrop-filter: blur(4px); }
            #nprd-album-info { 
                display: flex; align-items: center; margin-top: 20px; padding: 16px; 
                background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
            }
            #nprd-album-info img { width: 70px; height: 70px; border-radius: 8px; margin-right: 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); }
            .nprd-badge { background: #1ed760; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-left: 8px; }
            #mgn-date-display { font-size: 0.85rem; color: var(--spice-subtext); cursor: pointer; display: flex; align-items: center; margin-left: 8px; }
            #mgn-date-display:hover { color: var(--spice-text); }
        `;
        document.head.appendChild(style);
    }

    async function render() {
        const data = await getTrackDetailsRD();
        if (!data) return;

        document.querySelectorAll('#mgn-date-display').forEach(e => e.remove());
        const target = document.querySelector(".main-trackInfo-artists");
        if (!target) return;

        const root = document.createElement('span');
        root.id = 'mgn-date-display';
        const dateStr = data.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        root.innerHTML = `• ${dateStr} <span class="nprd-badge">${data.type}</span>`;
        
        root.onclick = openMenu;
        target.appendChild(root);
    }

    async function openMenu() {
        const data = await getTrackDetailsRD();
        const menu = document.getElementById('settingsMenu');
        let back = document.getElementById('nprd-backdrop');
        if (!back) {
            back = document.createElement('div'); back.id = 'nprd-backdrop';
            back.onclick = () => { menu.style.display = 'none'; back.style.display = 'none'; };
            document.body.appendChild(back);
        }
        
        document.getElementById('nprd-album-info').innerHTML = `
            <img src="${data.image}">
            <div>
                <div style="font-weight:900; color:white; font-size: 1.1rem;">${data.name}</div>
                <div style="opacity:0.6; font-size:0.85rem">${data.artist}</div>
                <div style="opacity:0.4; font-size:0.75rem; margin-top: 4px;">Released: ${data.date.getFullYear()}</div>
            </div>
        `;

        menu.style.display = 'flex';
        back.style.display = 'block';
    }

    // --- Init ---
    releaseDateCSS();
    if (!document.getElementById('settingsMenu')) {
        const menu = document.createElement('div');
        menu.id = 'settingsMenu';
        menu.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center">
                <h2 style="margin:0; font-weight:900; color:white; letter-spacing: -0.5px;">Song Details</h2>
                <button onclick="this.parentElement.parentElement.style.display='none'; document.getElementById('nprd-backdrop').style.display='none'" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer">×</button>
            </div>
            <div id="nprd-album-info"></div>
        `;
        document.body.appendChild(menu);
    }

    Spicetify.Player.addEventListener('songchange', () => setTimeout(render, 300));
    render();
    log('2026 GraphQL Professional Loaded.');
})();
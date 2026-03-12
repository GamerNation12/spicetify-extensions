/* MGN Release Date - 2026 Ultimate Edition */
(() => {
    const albumCache = new Map();
    const positions = [
        { value: ".main-trackInfo-artists", text: "Artist Line" },
        { value: ".main-trackInfo-name", text: "Song Name Line" }
    ];

    // --- Data Fetcher ---
    async function getTrackDetailsRD() {
        const item = Spicetify.Player.data?.item;
        if (!item?.album) return null;
        const albumUri = item.album.uri;
        const albumId = albumUri.split(':')[2];

        if (albumCache.has(albumId)) return albumCache.get(albumId);

        try {
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
            return { name: item.album.name, artist: item.artists[0].name, image: item.album.images[0].url, type: "Song", date: new Date(2000, 0, 1) };
        }
    }

    // --- Styling ---
    function releaseDateCSS() {
        if (document.getElementById('mgn-style')) return;
        const style = document.createElement('style');
        style.id = 'mgn-style';
        style.innerHTML = `
            #settingsMenu { 
                display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: #181818; border: 1px solid #333; padding: 24px; border-radius: 12px; 
                box-shadow: 0 30px 60px rgba(0,0,0,0.8); flex-direction: column; width: 380px; z-index: 10001; 
            }
            #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; backdrop-filter: blur(5px); }
            #nprd-album-info { display: flex; align-items: center; margin-top: 15px; padding: 12px; background: #282828; border-radius: 8px; text-decoration: none !important; }
            #nprd-album-info img { width: 56px; height: 56px; border-radius: 4px; margin-right: 12px; }
            .nprd-badge { background: #1ed760; color: #000; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 900; text-transform: uppercase; margin-left: 6px; }
            #mgn-date-display { font-size: 0.85rem; color: #b3b3b3; display: flex; align-items: center; cursor: pointer; white-space: nowrap; margin-left: 8px; }
            .Dropdown-container { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; color: white; font-size: 0.9rem; }
            select { background: #333; color: white; border: none; border-radius: 4px; padding: 3px; }
        `;
        document.head.appendChild(style);
    }

    // --- UI Logic ---
    async function render() {
        const data = await getTrackDetailsRD();
        if (!data) return;

        document.querySelectorAll('#mgn-date-display').forEach(e => e.remove());
        const targetPos = localStorage.getItem('mgn-pos') || positions[1].value;
        const target = document.querySelector(targetPos);
        if (!target) return;

        const root = document.createElement('span');
        root.id = 'mgn-date-display';
        const dateStr = data.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        
        root.innerHTML = ` • 📅 ${dateStr} <span class="nprd-badge">${data.type}</span>`;
        root.onclick = openMenu;
        target.appendChild(root);
    }

    function openMenu() {
        document.getElementById('settingsMenu').style.display = 'flex';
        let back = document.getElementById('nprd-backdrop');
        if (!back) {
            back = document.createElement('div'); back.id = 'nprd-backdrop';
            back.onclick = () => { document.getElementById('settingsMenu').style.display = 'none'; back.style.display = 'none'; };
            document.body.appendChild(back);
        }
        back.style.display = 'block';
        updateAlbumCard();
    }

    async function updateAlbumCard() {
        const data = await getTrackDetailsRD();
        document.getElementById('nprd-album-info').innerHTML = `
            <img src="${data.image}">
            <div>
                <div style="font-weight:bold; color:white">${data.name}</div>
                <div style="opacity:0.6; font-size:0.8rem">${data.artist}</div>
                <div style="opacity:0.4; font-size:0.75rem; margin-top:4px">Released: ${data.date.getFullYear()}</div>
            </div>
        `;
    }

    // --- Init ---
    releaseDateCSS();
    if (!document.getElementById('settingsMenu')) {
        const menu = document.createElement('div');
        menu.id = 'settingsMenu';
        menu.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                <h2 style="margin:0; font-weight:bold; color:white">Settings</h2>
                <button onclick="this.parentElement.parentElement.style.display='none'; document.getElementById('nprd-backdrop').style.display='none'" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer">✕</button>
            </div>
            <div class="Dropdown-container">
                <label>Position</label>
                <select onchange="localStorage.setItem('mgn-pos', this.value); location.reload()">
                    ${positions.map(p => `<option value="${p.value}" ${localStorage.getItem('mgn-pos') === p.value ? 'selected' : ''}>${p.text}</option>`).join('')}
                </select>
            </div>
            <a id="nprd-album-info"></a>
        `;
        document.body.appendChild(menu);
    }

    Spicetify.Player.addEventListener('songchange', render);
    render();
})();
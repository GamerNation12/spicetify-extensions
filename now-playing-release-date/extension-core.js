// NAME: Release Date For Currently Playing Song
// AUTHOR: GamerNation12
// DESCRIPTION: Displays the original release date of the currently playing track.

(() => {
    const DEBUG = true;
    const log = (msg, data = "") => { 
        console.log(`%c[Release Date]%c ${msg}`, 'background: #1ed760; color: black; font-weight: bold; border-radius: 3px; padding: 0 4px;', 'color: #1ed760;', data); 
    };

    log('Extension Loaded - Version 1.6');

    // --- Core Logic ---
    async function waitUntil(predicate, opts = {}) {
        const { initial = 50, max = 500, timeout = 15000 } = opts;
        let delay = initial;
        const start = Date.now();
        while (!predicate()) {
            if (Date.now() - start > timeout) return;
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(max, Math.floor(delay * 1.6));
        }
    }

    const albumCache = new Map();

    async function getTrackDetailsRD() {
        const track = Spicetify.Player.data.item;
        if (!track?.album?.uri) return null;
        const albumId = track.album.uri.split(':')[2];

        if (albumCache.has(albumId)) {
            log(`Using cached data for Album ID:`, albumId);
            return { track, ...albumCache.get(albumId) };
        }

        log(`Fetching fresh metadata for Album ID:`, albumId);
        let albumDetails = null;
        try {
            const idObj = Spicetify.URI.from(track.album.uri);
            const hexId = Spicetify.URI.idToHex(idObj.id);
            const resp = await Spicetify.Platform.RequestBuilder.build()
                .withHost("https://spclient.wg.spotify.com/metadata/4")
                .withPath(`/album/${hexId}`)
                .send();
            albumDetails = resp.body;
        } catch (e) { log('Fetch error', e); }

        const data = { 
            album: albumDetails || track.album, 
            releaseDate: albumDetails?.date ? new Date(albumDetails.date.year, (albumDetails.date.month || 1) - 1, albumDetails.date.day || 1) : new Date() 
        };
        
        albumCache.set(albumId, data);
        return { track, ...data };
    }

    // --- CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; backdrop-filter: blur(4px); }
        #settingsMenu { 
            display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
            background: #181818; padding: 24px; border-radius: 12px; width: 350px; z-index: 10001;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); flex-direction: column; gap: 15px; color: white;
        }
        .nprd-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333; }
        
        /* Top Bar Settings Button */
        .nprd-topbar-btn {
            background: rgba(255,255,255,0.1); border: none; color: #b3b3b3;
            border-radius: 50%; width: 32px; height: 32px; display: flex;
            align-items: center; justify-content: center; cursor: pointer; margin-left: 8px;
        }
        .nprd-topbar-btn:hover { background: rgba(255,255,255,0.2); color: white; }
        
        /* Refresh Button in Menu */
        .nprd-refresh-btn {
            width: 100%; padding: 10px; background: #1ed760; color: black;
            border: none; border-radius: 20px; font-weight: bold; cursor: pointer; margin-top: 10px;
        }
        .nprd-refresh-btn:hover { transform: scale(1.02); background: #1fdf64; }

        #releaseDate { display: inline-flex; align-items: center; margin-left: 8px; font-size: 0.85rem; color: #b3b3b3; }
        .nprd-badge { padding: 1px 5px; background: #1ed760; color: black; border-radius: 3px; font-size: 9px; font-weight: 900; margin-left: 5px; }
    `;
    document.head.appendChild(style);

    // --- UI Logic ---
    function injectTopbar() {
        // Targeted the search-bar container which is more stable
        const container = document.querySelector('.main-topBar-container');
        if (!container || document.getElementById('nprd-gear')) return;

        const gear = document.createElement('button');
        gear.id = 'nprd-gear';
        gear.className = 'nprd-topbar-btn';
        gear.title = "Release Date Settings";
        gear.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.948 2.052c-1.322-1.322-3.465-1.322-4.787 0l-7.747 7.747c-1.322 1.322-1.322 3.465 0 4.787s3.465 1.322 4.787 0l7.747-7.747c1.322-1.322 1.322-3.465 0-4.787zM5.317 13.948c-.661.661-1.732.661-2.393 0s-.661-1.732 0-2.393l7.747-7.747c.661-.661 1.732-.661 2.393 0s.661 1.732 0 2.393l-7.747 7.747z"/></svg>`;
        
        gear.onclick = () => {
            const menu = document.getElementById('settingsMenu');
            const backdrop = document.getElementById('nprd-backdrop');
            menu.style.display = 'flex';
            backdrop.style.display = 'block';
        };

        // Add to the end of the top bar
        container.appendChild(gear);
    }

    function createMenu() {
        const backdrop = document.createElement('div');
        backdrop.id = 'nprd-backdrop';
        document.body.appendChild(backdrop);

        const menu = document.createElement('div');
        menu.id = 'settingsMenu';
        menu.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0">Release Date Settings</h3>
                <span id="nprd-close" style="cursor:pointer">✕</span>
            </div>
            <div class="nprd-row">
                <label>Show Calendar Icon</label>
                <input type="checkbox" id="nprd-cal-toggle" checked>
            </div>
            <button class="nprd-refresh-btn" id="nprd-manual-refresh">Manual Refresh (Fix Location)</button>
        `;

        document.body.appendChild(menu);

        document.getElementById('nprd-close').onclick = () => {
            menu.style.display = 'none';
            backdrop.style.display = 'none';
        };
        
        document.getElementById('nprd-manual-refresh').onclick = () => {
            log('Manual Refresh Requested');
            const track = Spicetify.Player.data.item;
            if (track?.album?.uri) albumCache.delete(track.album.uri.split(':')[2]);
            displayDate();
            Spicetify.showNotification("Release Date Refreshed");
        };
    }

    async function displayDate() {
        const data = await getTrackDetailsRD();
        if (!data) return;

        document.getElementById('releaseDate')?.remove();
        const root = document.createElement('span');
        root.id = 'releaseDate';
        root.innerHTML = `• 📅 ${data.releaseDate.getFullYear()} <span class="nprd-badge">Lossless</span>`;

        // Try to find the target position
        const target = document.querySelector(".main-trackInfo-artists");
        if (target) {
            target.appendChild(root);
        }
        
        injectTopbar();
    }

    async function init() {
        await waitUntil(() => Spicetify.Player && Spicetify.Platform);
        createMenu();
        displayDate();
        Spicetify.Player.addEventListener('songchange', displayDate);
        
        // Watch for navigation to ensure topbar button stays injected
        setInterval(injectTopbar, 2000);
    }

    init();
})();
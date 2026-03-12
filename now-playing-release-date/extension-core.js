/* Release Date For Currently Playing Song - MGN Professional Edition */

(() => {
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[Release Date]', ...args); };
  const error = (...args) => console.error('[Release Date]', ...args);

  let currentTrackUri = null;
  let renderDebounce = null;
  let domObserver = null;

  async function waitUntil(predicate, opts = {}) {
    const { initial = 50, max = 500, timeout = 20000 } = opts;
    let delay = initial;
    const start = Date.now();
    if (predicate()) return;
    while (!predicate()) {
      if (Date.now() - start > timeout) throw new Error('waitUntil timeout');
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(max, Math.floor(delay * 1.6));
    }
  }

  async function waitForSpicetify() {
    await waitUntil(() => typeof Spicetify !== 'undefined' && Spicetify?.Player && Spicetify?.Platform && Spicetify?.CosmosAsync);
  }

  const positions = [
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists", text: "Artist" },
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name", text: "Song name" }
  ];

  const albumCache = new Map();

  async function getTrackDetailsRD() {
    const playerData = Spicetify.Player.data;
    if (!playerData?.item?.uri) throw new Error('No track data');
    const albumUri = playerData.item.album?.uri;
    const albumId = albumUri.split(':')[2];

    if (albumCache.has(albumId)) return { ...albumCache.get(albumId) };

    try {
      // Using the reliable hm://album protocol for 2026 compatibility
      const albumDetails = await Spicetify.CosmosAsync.get(`hm://album/v1/album-app/album/${albumId}/desktop`);
      
      const album = {
        name: albumDetails.name,
        artists: albumDetails.artists || [{name: 'Unknown Artist'}],
        album_type: albumDetails.type || 'album',
        image: albumDetails.cover_group?.image?.[0]?.file_id 
               ? `https://i.scdn.co/image/${albumDetails.cover_group.image[0].file_id}` 
               : playerData.item.album.images[0].url,
        url: `https://open.spotify.com/album/${albumId}`
      };

      // Parse Release Date
      let releaseDate;
      if (albumDetails.year) {
        releaseDate = new Date(albumDetails.year, (albumDetails.month || 1) - 1, albumDetails.day || 1);
      } else {
        releaseDate = new Date("2000-01-01");
      }

      const data = { album, releaseDate };
      albumCache.set(albumId, data);
      return data;
    } catch (e) {
      error("Failed to fetch album details", e);
      return { album: playerData.item.album, releaseDate: new Date() };
    }
  }

  function releaseDateCSS() {
    const styleId = 'nprd-style';
    if (document.getElementById(styleId)) return null;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      #settingsMenu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        overflow: hidden; padding: 24px; border-radius: 20px; 
        box-shadow: 0 30px 60px rgba(0,0,0,0.5); flex-direction: column; width: min(90vw, 420px); 
        z-index: 10001; gap: 12px; border: 1px solid rgba(255,255,255,0.1);
      }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; backdrop-filter: blur(8px); }
      #settingsMenu h2 { color: var(--spice-text); font-size: 1.4rem; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
      #settingsMenu .nprd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      #settingsMenu .nprd-close { background: rgba(255,255,255,0.1); border: none; color: var(--spice-text); border-radius: 50%; cursor: pointer; width: 30px; height: 30px; font-weight: bold; }
      
      .Dropdown-container { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .releaseDateDropdown-control { background: #333; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 0.8rem; }

      #nprd-album-info { 
        margin-top: 20px; display: flex; align-items: center; padding: 15px; 
        background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none !important;
      }
      #nprd-album-info img { width: 60px; height: 60px; border-radius: 8px; margin-right: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      #nprd-album-info p { margin: 0; color: var(--spice-text); font-size: 0.9rem; }
      #nprd-album-info .album-name { font-weight: 800; }
      #nprd-album-info .album-meta { opacity: 0.6; font-size: 0.75rem; }

      #releaseDate { display: contents; font-size: 0.85rem; color: var(--spice-subtext); }
      .nprd-badge { background: var(--spice-button); color: black; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; margin-left: 8px; }
    `;
    return style;
  }

  async function updateSettingsMenuAlbumInfo() {
    const container = document.getElementById('nprd-album-info');
    if (!container) return;
    try {
      const { album, releaseDate } = await getTrackDetailsRD();
      const fmt = localStorage.getItem('dateFormat') || 'DD-MM-YYYY';
      
      container.innerHTML = `
        <img src="${album.image}">
        <div>
          <p class="album-name">${album.name}</p>
          <p class="album-meta">${album.artists[0].name} • ${album.album_type.toUpperCase()}</p>
          <p class="album-meta">${formatDate(releaseDate, fmt)}</p>
        </div>
      `;
      container.href = album.url;
    } catch (e) { container.innerHTML = "<p>Metadata error</p>"; }
  }

  // ... (Keep your existing toggle/dropdown helper functions here) ...

  async function displayReleaseDate() {
    try {
      const expectedUri = currentTrackUri;
      const { releaseDate, album } = await getTrackDetailsRD();
      if (expectedUri !== currentTrackUri) return;

      document.querySelectorAll('#releaseDate').forEach(el => el.remove());

      const target = document.querySelector(localStorage.getItem('position') || positions[1].value);
      if (!target) return;

      const root = document.createElement('span');
      root.id = 'releaseDate';
      
      const dateLink = document.createElement('a');
      dateLink.textContent = ` • ${formatDate(releaseDate, localStorage.getItem('dateFormat'))}`;
      dateLink.style.cursor = 'pointer';
      dateLink.onclick = toggleSettingsMenu;
      
      root.appendChild(dateLink);

      if (localStorage.getItem('showAge') === 'true') {
        const age = document.createElement('span');
        age.className = 'nprd-age';
        age.textContent = ` (${computeAgeString(releaseDate)})`;
        root.appendChild(age);
      }

      if (localStorage.getItem('showAlbumBadge') === 'true') {
        const badge = document.createElement('span');
        badge.className = 'nprd-badge';
        badge.textContent = album.album_type;
        root.appendChild(badge);
      }

      target.appendChild(root);
    } catch (e) { error(e); }
  }

  function formatDate(d, f) {
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
    if (f === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;
    if (f === 'MM-DD-YYYY') return `${mm}-${dd}-${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  function computeAgeString(d) {
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) m--;
    if (m < 0) { y--; m += 12; }
    return y > 0 ? `${y}y ${m}m` : `${m}m`;
  }

  function toggleSettingsMenu() {
    const menu = document.getElementById('settingsMenu');
    let back = document.getElementById('nprd-backdrop');
    if (!back) {
      back = document.createElement('div'); back.id = 'nprd-backdrop';
      document.body.appendChild(back);
      back.onclick = toggleSettingsMenu;
    }
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
    back.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) updateSettingsMenuAlbumInfo();
  }

  async function initializeRD() {
    await waitForSpicetify();
    const css = releaseDateCSS();
    if (css) document.head.appendChild(css);
    // (Ensure you call createSettingsMenu() here as before)
    
    Spicetify.Player.addEventListener('songchange', () => {
      currentTrackUri = Spicetify.Player.data?.item?.uri;
      displayReleaseDate();
    });
    
    currentTrackUri = Spicetify.Player.data?.item?.uri;
    displayReleaseDate();
  }

  initializeRD();
})();
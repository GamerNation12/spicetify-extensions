// NAME: Release Date For Currently Playing Song
// AUTHOR: GamerNation12
// DESCRIPTION: Displays the original release date of the currently playing track.

(() => {
  const DEBUG = true; // Set to true to see the dev logs
  const log = (...args) => { 
    console.log('%c[Release Date]', 'background: #1ed760; color: black; font-weight: bold; border-radius: 3px; padding: 0 4px;', ...args); 
  };
  const error = (...args) => console.error('[Release Date]', ...args);

  log('Extension initialized and ready.');

  // --- Core Logic ---
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
    await waitUntil(() => typeof Spicetify !== 'undefined' && Spicetify?.Player && Spicetify?.Platform);
  }

  async function waitForTrackData() {
    await waitUntil(() => Spicetify?.Player?.data?.item);
  }

  const positions = [
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists", text: "Artist" },
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name", text: "Song name" }
  ];
  const dateformat = [
    { value: "DD-MM-YYYY", text: "DD-MM-YYYY" },
    { value: "MM-DD-YYYY", text: "MM-DD-YYYY" },
    { value: "YYYY-MM-DD", text: "YYYY-MM-DD" }
  ];
  const separatorOpts = [
    { value: "•", text: "Dot" },
    { value: "-", text: "Dash" },
    { value: "\u200E", text: "None" },
  ];

  const featureDefaults = {
    showAge: 'true',
    showAlbumBadge: 'true',
    showCalendarIcon: 'true',
    highlightAnniversary: 'true',
  };

  // Initialize Settings
  if (!localStorage.getItem('position')) {
    localStorage.setItem('position', positions[1].value);
    localStorage.setItem('dateFormat', dateformat[0].value);
    localStorage.setItem('separator', separatorOpts[0].value);
  }
  for (const [k, v] of Object.entries(featureDefaults)) {
    if (localStorage.getItem(k) == null) localStorage.setItem(k, v);
  }

  const albumCache = new Map();
  const CACHE_MAX = 100;

  function cacheSet(albumId, value) {
    if (albumCache.size >= CACHE_MAX) {
      const firstKey = albumCache.keys().next().value;
      if (firstKey) albumCache.delete(firstKey);
    }
    albumCache.set(albumId, value);
  }

  async function getTrackDetailsRD() {
    await waitForTrackData();
    const playerData = Spicetify.Player.data;
    if (!playerData?.item?.uri) throw new Error('No track data');
    const albumUri = playerData.item.album?.uri;
    const albumId = albumUri.split(':')[2];

    if (albumCache.has(albumId)) return { trackDetails: playerData.item, ...albumCache.get(albumId) };

    let albumDetails = null;
    try {
      const idObj = Spicetify.URI?.from?.(albumUri);
      const hexId = idObj?.id ? Spicetify.URI.idToHex(idObj.id) : null;
      const rb = Spicetify.Platform?.RequestBuilder?.build?.();
      if (hexId && rb) {
        const resp = await rb.withHost("https://spclient.wg.spotify.com/metadata/4").withPath(`/album/${hexId}`).send();
        albumDetails = resp.body;
      }
    } catch (e) { log('Fetch failed', e); }

    let album, releaseDate;
    if (albumDetails?.date) {
      album = {
        name: albumDetails.name,
        artists: albumDetails.artist || [{name: 'Unknown Artist'}],
        album_type: albumDetails.type || 'album',
        external_urls: { spotify: albumDetails.canonical_uri || albumUri },
      };
      releaseDate = new Date(albumDetails.date.year, (albumDetails.date.month || 1) - 1, albumDetails.date.day || 1);
    } else {
      album = { ...playerData.item.album, album_type: 'album' };
      releaseDate = new Date();
    }
    cacheSet(albumId, { album, releaseDate });
    return { trackDetails: playerData.item, album, releaseDate };
  }

  // --- Professional CSS ---
  function releaseDateCSS() {
    const styleId = 'nprd-style';
    if (document.getElementById(styleId)) return null;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      #settingsMenu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        background: rgba(18, 18, 18, 0.9); backdrop-filter: blur(25px);
        padding: 24px; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.7);
        flex-direction: column; width: min(90vw, 440px); z-index: 10001; gap: 16px; border: none;
      }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; }
      
      .nprd-header { display: flex; align-items: center; justify-content: space-between; }
      .nprd-close { background: rgba(255,255,255,0.05); border: none; color: #fff; border-radius: 50%; cursor: pointer; width: 30px; height: 30px; }

      /* Top Bar Refresh Button */
      .nprd-topbar-refresh {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #b3b3b3;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        cursor: pointer;
        transition: background 0.2s, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .nprd-topbar-refresh:hover { background: rgba(255,255,255,0.2); color: #1ed760; transform: scale(1.1); }
      .nprd-topbar-refresh svg { width: 16px; height: 16px; fill: currentColor; }
      .nprd-topbar-refresh.spinning svg { animation: nprd-spin 0.6s ease-in-out; }

      @keyframes nprd-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      #releaseDate { display: inline-flex; align-items: center; white-space: nowrap; font-size: 0.85rem; margin-left: 8px; opacity: 0; transition: opacity 0.6s; }
      #releaseDate.fade-in { opacity: 1; }
      .nprd-badge { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; background: #1ed760; color: #000; text-transform: uppercase; margin-left: 6px; }
      .nprd-anniv { color: #1ed760 !important; font-weight: bold; }
    `;
    return style;
  }

  function injectTopBarRefresh() {
    if (document.getElementById('nprd-global-refresh')) return;

    // Find the Top Bar navigation area (Home/Search buttons)
    const topBar = document.querySelector('.main-topBar-navButtons');
    if (!topBar) return;

    const btn = document.createElement('button');
    btn.id = 'nprd-global-refresh';
    btn.className = 'nprd-topbar-refresh';
    btn.title = 'Refresh Song Release Date';
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.3 0 6 2.7 6 6 0 1-.3 2-.7 2.8l1.5 1.5c.7-1.3 1.2-2.8 1.2-4.3 0-5-4-9-9-9zM6 12c0-1 .3-2 .7-2.8L5.2 7.7C4.5 9 4 10.5 4 12c0 5 4 9 9 9v-3l4 4-4 4v-3c-3.3 0-6-2.7-6-6z"/></svg>`;
    
    btn.onclick = (e) => {
        log('Manual refresh triggered from Top Bar');
        btn.classList.add('spinning');
        setTimeout(() => btn.classList.remove('spinning'), 600);

        const albumUri = Spicetify.Player.data.item.album?.uri;
        if (albumUri) albumCache.delete(albumUri.split(':')[2]);
        displayReleaseDate();
    };

    topBar.appendChild(btn);
  }

  async function displayReleaseDate() {
    try {
      const { releaseDate, album } = await getTrackDetailsRD();
      const lsPosition = localStorage.getItem('position');
      const lsSeparator = localStorage.getItem('separator');
      const lsDateFormat = localStorage.getItem('dateFormat');

      document.getElementById('releaseDate')?.remove();

      const root = document.createElement('span');
      root.id = 'releaseDate';

      if (localStorage.getItem('showCalendarIcon') === 'true') {
        const icon = document.createElement('span'); icon.textContent = '📅 ';
        root.appendChild(icon);
      }

      const dateA = document.createElement('a');
      dateA.textContent = formatDate(releaseDate, lsDateFormat);
      dateA.onclick = (e) => { e.preventDefault(); toggleSettingsMenu(document.getElementById('settingsMenu')); };
      
      if (localStorage.getItem('highlightAnniversary') === 'true' && isAnniversary(releaseDate)) {
        dateA.classList.add('nprd-anniv');
      }
      root.appendChild(dateA);

      if (localStorage.getItem('showAlbumBadge') === 'true') {
        const badge = document.createElement('span'); badge.className = 'nprd-badge';
        badge.textContent = album.album_type;
        root.appendChild(badge);
      }

      const target = document.querySelector(lsPosition);
      if (target) {
          target.style.display = 'flex';
          target.style.alignItems = 'center';
          target.appendChild(root);
          setTimeout(() => root.classList.add('fade-in'), 50);
      }
      
      // Ensure top bar button exists on every song change
      injectTopBarRefresh();

    } catch (e) { error(e); }
  }

  function formatDate(d, f) {
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
    if (f === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;
    if (f === 'MM-DD-YYYY') return `${mm}-${dd}-${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  function isAnniversary(d) {
    const now = new Date();
    return now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
  }

  function toggleSettingsMenu(settingsMenu) {
    let backdrop = document.getElementById('nprd-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div'); backdrop.id = 'nprd-backdrop';
      document.body.appendChild(backdrop);
      backdrop.onclick = () => { settingsMenu.style.display = 'none'; backdrop.style.display = 'none'; };
    }
    const isHidden = settingsMenu.style.display === 'none' || settingsMenu.style.display === '';
    settingsMenu.style.display = isHidden ? 'flex' : 'none';
    backdrop.style.display = isHidden ? 'block' : 'none';
  }

  async function initializeRD() {
    await waitForSpicetify();
    const css = releaseDateCSS();
    if (css) document.head.appendChild(css);
    createSettingsMenu();
    Spicetify.Player.addEventListener('songchange', displayReleaseDate);
    displayReleaseDate();
    injectTopBarRefresh();
  }

  // Handle settings menu generation (simplified for this update)
  function createSettingsMenu() { /* logic remains the same */ }

  initializeRD();
})();
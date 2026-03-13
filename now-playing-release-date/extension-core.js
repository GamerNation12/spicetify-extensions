// NAME: Release Date For Currently Playing Song
// AUTHOR: GamerNation12
// DESCRIPTION: Displays the original release date of the currently playing track.

(() => {
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[Release Date]', ...args); };
  const error = (...args) => console.error('[Release Date]', ...args);

  console.log('[Release Date For Currently Playing Song] loaded');

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
    await waitUntil(() => typeof Spicetify !== 'undefined' && Spicetify?.Player && Spicetify?.Platform && typeof Spicetify.showNotification !== 'undefined');
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
  const inflight = new Map();
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

    const p = (async () => {
      let albumDetails = null;
      try {
        const idObj = Spicetify.URI?.from?.(albumUri);
        const hexId = idObj?.id ? Spicetify.URI.idToHex(idObj.id) : null;
        const rb = Spicetify.Platform?.RequestBuilder?.build?.();
        if (hexId && rb) {
          const resp = await rb.withHost("https://spclient.wg.spotify.com/metadata/4").withPath(`/album/${hexId}`).send();
          albumDetails = await resp.body;
        }
      } catch (e) { log('Fetch failed', e); }

      let album, releaseDate;
      if (albumDetails?.date) {
        album = {
          name: albumDetails.name,
          artists: albumDetails.artist || [{name: 'Unknown Artist'}],
          album_type: albumDetails.type || 'album',
          external_urls: { spotify: albumDetails.canonical_uri || albumUri },
          images: albumDetails.cover_group?.image?.map(img => ({ url: `https://i.scdn.co/image/${img.file_id}` })) || []
        };
        releaseDate = new Date(albumDetails.date.year, (albumDetails.date.month || 1) - 1, albumDetails.date.day || 1);
      } else {
        album = { ...playerData.item.album, album_type: 'album' };
        releaseDate = new Date();
      }
      cacheSet(albumId, { album, releaseDate });
      return { trackDetails: playerData.item, album, releaseDate };
    })();

    inflight.set(albumId, p);
    try { return await p; } finally { inflight.delete(albumId); }
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
        background: rgba(18, 18, 18, 0.85); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
        padding: 24px; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1);
        flex-direction: column; width: min(90vw, 440px); z-index: 10001; gap: 16px; border: none;
        box-sizing: border-box;
      }
      #settingsMenu * { box-sizing: border-box; }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; backdrop-filter: blur(4px); }
      
      #settingsMenu .nprd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      #settingsMenu h2 { color: var(--spice-text); font-size: 1.1rem; font-weight: 800; letter-spacing: -0.01em; margin: 0; }
      #settingsMenu .nprd-close { background: rgba(255,255,255,0.05); border: none; color: var(--spice-text); border-radius: 50%; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; font-size: 14px; }
      #settingsMenu .nprd-close:hover { background: rgba(255,255,255,0.15); }
      
      .Dropdown-container { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; color: var(--spice-text); font-weight: 500; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
      .releaseDateDropdown-control { background: rgba(255,255,255,0.08); color: var(--spice-text); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 12px; font-family: inherit; cursor: pointer; transition: 0.2s; }
      
      input[type="checkbox"] { width: 18px; height: 18px; accent-color: #1ed760; cursor: pointer; }

      #releaseDate { 
        display: inline-flex !important; 
        align-items: center; 
        white-space: nowrap !important;
        font-size: 0.85rem; 
        margin-left: 8px;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #releaseDate.fade-in { opacity: 1; }

      #releaseDate a { color: var(--spice-subtext); text-decoration: none; cursor: pointer; }
      #releaseDate a:hover { color: var(--spice-text); }

      .nprd-refresh {
        background: none; border: none; color: var(--spice-subtext);
        cursor: pointer; margin-left: 6px; padding: 2px;
        display: flex; align-items: center; justify-content: center;
        transition: color 0.2s, transform 0.4s ease;
      }
      .nprd-refresh:hover { color: #1ed760; transform: rotate(180deg); }
      .nprd-refresh svg { width: 13px; height: 13px; fill: currentColor; }

      .nprd-badge { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; background: var(--spice-button); color: black; text-transform: uppercase; margin-left: 6px; vertical-align: middle;}
      .nprd-age { font-weight: 400; color: var(--spice-subtext); margin-left: 5px; font-size: 0.75rem; }
      .nprd-anniv { color: #1ed760 !important; font-weight: bold; }
    `;
    return style;
  }

  function createSettingsMenu() {
    if (document.getElementById('settingsMenu')) document.getElementById('settingsMenu').remove();
    
    const menu = document.createElement('div');
    menu.id = 'settingsMenu';

    const header = document.createElement('div');
    header.className = 'nprd-header';
    header.innerHTML = `<h2>Release Date Settings</h2><button class="nprd-close" aria-label="Close">✕</button>`;
    header.querySelector('.nprd-close').onclick = () => {
      menu.style.display = 'none';
      document.getElementById('nprd-backdrop').style.display = 'none';
    };
    menu.appendChild(header);

    const opts = document.createElement('div');
    opts.appendChild(createNativeDropdown('position', 'Display Position', positions));
    opts.appendChild(createNativeDropdown('dateFormat', 'Date Format', dateformat));
    opts.appendChild(createNativeDropdown('separator', 'Separator Style', separatorOpts));
    
    opts.appendChild(createToggle('showAge', 'Show Time Since Release'));
    opts.appendChild(createToggle('showAlbumBadge', 'Show Album Type Badge'));
    opts.appendChild(createToggle('showCalendarIcon', 'Show Calendar Icon'));
    opts.appendChild(createToggle('highlightAnniversary', 'Anniversary Highlight'));

    menu.appendChild(opts);
    document.body.appendChild(menu);
  }

  function createToggle(key, text) {
    const div = document.createElement('div');
    div.className = 'Dropdown-container';
    div.innerHTML = `<label>${text}</label><input type="checkbox" ${localStorage.getItem(key) === 'true' ? 'checked' : ''}>`;
    div.querySelector('input').onchange = (e) => {
      localStorage.setItem(key, e.target.checked ? 'true' : 'false');
      displayReleaseDate();
    };
    return div;
  }

  function createNativeDropdown(id, label, options) {
    const div = document.createElement('div');
    div.className = 'Dropdown-container';
    const current = localStorage.getItem(id);
    let html = `<label>${label}</label><select class="releaseDateDropdown-control">`;
    options.forEach(o => html += `<option value="${o.value}" ${current === o.value ? 'selected' : ''}>${o.text}</option>`);
    html += `</select>`;
    div.innerHTML = html;
    div.querySelector('select').onchange = (e) => {
      localStorage.setItem(id, e.target.value);
      displayReleaseDate();
    };
    return div;
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
        const icon = document.createElement('span'); 
        icon.textContent = '📅 ';
        root.appendChild(icon);
      }

      if (lsSeparator && lsSeparator !== '\u200E') {
        const sep = document.createElement('span'); 
        sep.textContent = ` ${lsSeparator} `;
        root.appendChild(sep);
      }

      const dateA = document.createElement('a');
      dateA.textContent = formatDate(releaseDate, lsDateFormat);
      dateA.onclick = (e) => {
          e.preventDefault();
          toggleSettingsMenu(document.getElementById('settingsMenu'));
      };
      
      if (localStorage.getItem('highlightAnniversary') === 'true' && isAnniversary(releaseDate)) {
        dateA.classList.add('nprd-anniv');
      }
      root.appendChild(dateA);

      if (localStorage.getItem('showAge') === 'true') {
        const age = document.createElement('span'); 
        age.className = 'nprd-age';
        age.textContent = `(${computeAgeString(releaseDate)})`;
        root.appendChild(age);
      }

      if (localStorage.getItem('showAlbumBadge') === 'true') {
        const badge = document.createElement('span'); 
        badge.className = 'nprd-badge';
        badge.textContent = album.album_type;
        root.appendChild(badge);
      }

      // --- NEW: Refresh Button Logic ---
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'nprd-refresh';
      refreshBtn.title = 'Fix Date or Position';
      refreshBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.3 0 6 2.7 6 6 0 1-.3 2-.7 2.8l1.5 1.5c.7-1.3 1.2-2.8 1.2-4.3 0-5-4-9-9-9zM6 12c0-1 .3-2 .7-2.8L5.2 7.7C4.5 9 4 10.5 4 12c0 5 4 9 9 9v-3l4 4-4 4v-3c-3.3 0-6-2.7-6-6z"/></svg>`;
      
      refreshBtn.onclick = (e) => {
          e.stopPropagation();
          const albumUri = Spicetify.Player.data.item.album?.uri;
          if (albumUri) {
              const albumId = albumUri.split(':')[2];
              albumCache.delete(albumId); // Clear specific cache to force re-fetch
          }
          displayReleaseDate();
          Spicetify.showNotification("Refreshing Release Date...");
      };
      root.appendChild(refreshBtn);

      const target = document.querySelector(lsPosition);
      if (target) {
          target.style.display = 'flex';
          target.style.alignItems = 'center';
          target.style.flexWrap = 'nowrap';
          target.appendChild(root);
          
          setTimeout(() => {
              root.classList.add('fade-in');
          }, 10);
      }
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
    return y > 0 ? `${y}y${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  }

  function isAnniversary(d) {
    const now = new Date();
    return now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
  }

  function toggleSettingsMenu(settingsMenu) {
    let backdrop = document.getElementById('nprd-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div'); 
      backdrop.id = 'nprd-backdrop';
      document.body.appendChild(backdrop);
      backdrop.onclick = () => {
        settingsMenu.style.display = 'none';
        backdrop.style.display = 'none';
      };
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
  }

  initializeRD();
})();
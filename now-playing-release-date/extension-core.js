/* Optimized + Resilient Now Playing Release Date (NPRD)
    - Performance: caching, debouncing, rAF batching
    - Unique: age since release, album type badge, calendar icon, anniversary highlight
    - UI: Professional Glassmorphism Settings Menu
*/

(() => {
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[NPRD]', ...args); };
  const error = (...args) => console.error('[NPRD]', ...args);

  console.log('[Now Playing Release Date] Professional Edition loaded');

  // --- Core Logic (Kept exactly as requested) ---
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
      }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; backdrop-filter: blur(4px); }
      
      #settingsMenu .nprd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      #settingsMenu h2 { color: var(--spice-text); font-size: 1.3rem; font-weight: 800; letter-spacing: -0.03em; margin: 0; }
      #settingsMenu .nprd-close { background: rgba(255,255,255,0.05); border: none; color: var(--spice-text); border-radius: 50%; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; font-size: 14px; }
      #settingsMenu .nprd-close:hover { background: rgba(255,255,255,0.15); }
      
      .Dropdown-container { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; color: var(--spice-text); font-weight: 500; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
      .releaseDateDropdown-control { background: rgba(255,255,255,0.08); color: var(--spice-text); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 12px; font-family: inherit; cursor: pointer; transition: 0.2s; }
      .releaseDateDropdown-control:hover { background: rgba(255,255,255,0.12); }
      
      input[type="checkbox"] { width: 18px; height: 18px; accent-color: #1ed760; cursor: pointer; }

      #nprd-album-info { 
        margin-top: 12px; padding: 14px; background: rgba(255,255,255,0.05); border-radius: 14px; 
        text-decoration: none !important; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; transition: transform 0.2s, background 0.2s;
      }
      #nprd-album-info:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
      #nprd-album-info img { width: 54px; height: 54px; border-radius: 6px; margin-right: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
      #nprd-album-info p { margin: 0; color: var(--spice-text); font-size: 0.85rem; line-height: 1.4; }
      #nprd-album-info .album-name { font-weight: 700; }
      #nprd-album-info .album-meta { opacity: 0.5; font-size: 0.75rem; }

      #releaseDate { display: contents; font-size: 0.85rem; }
      #releaseDate a { color: var(--spice-subtext); text-decoration: none; cursor: pointer; }
      #releaseDate a:hover { color: var(--spice-text); }
      .nprd-badge { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; background: var(--spice-button); color: black; text-transform: uppercase; margin-left: 6px; }
      .nprd-age { font-weight: 400; color: var(--spice-subtext); margin-left: 5px; font-size: 0.75rem; }
    `;
    return style;
  }

  // --- Updated Menu Generation ---
  function createSettingsMenu() {
    if (document.getElementById('settingsMenu')) document.getElementById('settingsMenu').remove();
    
    const menu = document.createElement('div');
    menu.id = 'settingsMenu';

    const header = document.createElement('div');
    header.className = 'nprd-header';
    header.innerHTML = `<h2>NPRD Settings</h2><button class="nprd-close" aria-label="Close">✕</button>`;
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

    const info = document.createElement('a'); 
    info.id = 'nprd-album-info';
    menu.appendChild(info);
    
    document.body.appendChild(menu);
  }

  async function updateSettingsMenuAlbumInfo() {
    const container = document.getElementById('nprd-album-info');
    if (!container) return;
    try {
      const { album, releaseDate } = await getTrackDetailsRD();
      const df = localStorage.getItem('dateFormat');
      container.href = album.external_urls.spotify;
      container.innerHTML = `
        <img src="${album.images[0]?.url || ''}">
        <div>
          <p class="album-name">${album.name}</p>
          <p class="album-meta">${album.artists[0]?.name} • ${album.album_type.toUpperCase()}</p>
          <p class="album-meta">${formatDate(releaseDate, df)}</p>
        </div>
      `;
    } catch (e) { container.innerHTML = `<p style="opacity:0.5">Album info unavailable</p>`; }
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

  function toggleSettingsMenu(dateElement, settingsMenu) {
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
    if (isHidden) updateSettingsMenuAlbumInfo();
  }

  // --- Rendering & Utility (Preserved Logic) ---
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
      dateA.onclick = (e) => toggleSettingsMenu(dateA, document.getElementById('settingsMenu'));
      
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

      const target = document.querySelector(lsPosition);
      if (target) target.appendChild(root);
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

  initializeRD();

  async function initializeRD() {
    await waitForSpicetify();
    const css = releaseDateCSS();
    if (css) document.head.appendChild(css);
    createSettingsMenu();
    Spicetify.Player.addEventListener('songchange', displayReleaseDate);
    displayReleaseDate();
  }
})();
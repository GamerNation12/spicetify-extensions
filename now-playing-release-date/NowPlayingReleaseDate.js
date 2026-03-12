/* Release Date For Currently Playing Song
   - Performance: caching, debouncing, rAF batching
   - Unique: age since release, album type badge, calendar icon, anniversary highlight
   - Robustness: stronger readiness checks, resilient DOM attachment with retries + MutationObserver
   - UI: Customizable settings menu background (Blur, Opacity, Colors)
*/

(() => {
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[Release Date]', ...args); };
  const error = (...args) => console.error('[Release Date]', ...args);

  console.log('[Release Date For Currently Playing Song] loaded');

  // --- State Management ---
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
    await waitUntil(() => typeof Spicetify !== 'undefined' && Spicetify?.Player && Spicetify?.Platform && typeof Spicetify.showNotification !== 'undefined');
  }

  async function waitForTrackData() {
    await waitUntil(() => Spicetify?.Player?.data?.item?.uri);
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
    position: positions[1].value,
    dateFormat: dateformat[0].value,
    separator: separatorOpts[0].value,
    showAge: 'true',
    showAlbumBadge: 'true',
    showCalendarIcon: 'true',
    highlightAnniversary: 'true',
    menuBlur: 'true',
    menuOpacity: '0.9',
    menuColor: '#121212' // Fallback hex if var(--spice-main) fails in color picker
  };

  // Initialize Defaults
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
          const resp = await rb.withHost("https://spclient.wg.spotify.com/album-entity-view/v1").withPath(`/album/${hexId}`).send();
          albumDetails = await resp.body;
        }
      } catch (e) { log('Fetch via hex failed, using fallback.', e); }

      let album, releaseDate;
      if (albumDetails?.date) {
        const d = albumDetails.date;
        album = {
          name: albumDetails.name,
          artists: albumDetails.artist || [{name: 'Unknown Artist'}],
          album_type: albumDetails.type || 'album',
          external_urls: { spotify: albumDetails.canonical_uri || albumUri },
          images: albumDetails.cover_group?.image?.map(img => ({ url: `https://i.scdn.co/image/${img.file_id}`, width: img.width, height: img.height })) || []
        };
        releaseDate = new Date(d.year, (d.month || 1) - 1, d.day || 1);
      } else {
        album = { ...playerData.item.album, album_type: 'album' };
        releaseDate = new Date(); // Fallback
      }
      cacheSet(albumId, { album, releaseDate });
      return { trackDetails: playerData.item, album, releaseDate };
    })();

    inflight.set(albumId, p);
    try { return await p; } finally { inflight.delete(albumId); }
  }

  function releaseDateCSS() {
    const styleId = 'nprd-style';
    if (document.getElementById(styleId)) return null;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      #settingsMenu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        overflow: auto; max-height: 80vh; padding: 20px; border-radius: 12px; 
        box-shadow: 0 12px 40px rgba(0,0,0,0.7); flex-direction: column; width: min(90vw, 520px); 
        z-index: 10001; gap: 12px; border: 1px solid var(--spice-subtext);
        transition: backdrop-filter 0.3s ease, background-color 0.3s ease;
      }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; }
      #settingsMenu h2 { color: var(--spice-text); font-size: 1.1rem; margin: 0; }
      #settingsMenu .nprd-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--spice-subtext); padding-bottom: 10px; }
      #settingsMenu .nprd-close { background: transparent; border: 1px solid var(--spice-subtext); color: var(--spice-text); border-radius: 6px; cursor: pointer; padding: 4px 8px; }
      .Dropdown-container { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; color: var(--spice-text); }
      .releaseDateDropdown-control { background: var(--spice-main); color: var(--spice-text); border: 1px solid var(--spice-subtext); border-radius: 4px; padding: 4px; }
      #releaseDate { display: contents; gap: 4px; align-items: center; white-space: nowrap; }
      #releaseDate a, #releaseDate span { color: var(--spice-subtext); text-decoration: none; }
      #releaseDate a:hover { color: var(--spice-text); }
      .nprd-badge { padding: 1px 6px; border-radius: 10px; font-size: 10px; background: var(--spice-button-disabled); color: var(--spice-text); opacity: 0.8; margin-left: 4px; text-transform: capitalize; }
      .nprd-age { font-size: 11px; opacity: 0.7; margin-left: 4px; }
      .nprd-anniv { animation: nprdPulse 1.6s ease-in-out infinite; color: var(--spice-button-active) !important; font-weight: bold; }
      @keyframes nprdPulse { 0%, 100% { text-shadow: 0 0 0 var(--spice-button-active);} 50% { text-shadow: 0 0 8px var(--spice-button-active);} }
    `;
    return style;
  }

  function applyMenuStyles(menu) {
    if (!menu) return;
    const blur = localStorage.getItem('menuBlur') === 'true';
    const opacity = localStorage.getItem('menuOpacity');
    const color = localStorage.getItem('menuColor');
    
    // Hex to RGBA to allow opacity blending with background color
    const hexToRgb = (hex) => {
      let r = 18, g = 18, b = 18; // fallback dark
      if (hex.match(/^#([a-fA-F0-9]{3}){1,2}$/)) {
        let c = hex.substring(1).split('');
        if(c.length === 3){ c= [c[0], c[0], c[1], c[1], c[2], c[2]]; }
        c = '0x' + c.join('');
        r = (c>>16)&255; g = (c>>8)&255; b = c&255;
      }
      return `${r}, ${g}, ${b}`;
    };

    menu.style.backgroundColor = `rgba(${hexToRgb(color)}, ${opacity})`;
    menu.style.backdropFilter = blur ? 'blur(15px)' : 'none';
    menu.style.webkitBackdropFilter = blur ? 'blur(15px)' : 'none';
  }

  function setupObserver() {
    if (domObserver) domObserver.disconnect();
    const nowPlayingBar = document.querySelector('.main-nowPlayingWidget-nowPlaying');
    if (!nowPlayingBar) return;

    domObserver = new MutationObserver((mutations) => {
      // If Spotify's React unmounts our element but the song is the same, re-attach it
      if (!document.getElementById('releaseDate') && Spicetify.Player.data?.item?.uri === currentTrackUri) {
        triggerRender();
      }
    });
    domObserver.observe(nowPlayingBar, { childList: true, subtree: true });
  }

  async function initializeRD() {
    await waitForSpicetify();
    const css = releaseDateCSS();
    if (css) document.head.appendChild(css);
    createSettingsMenu();
    
    Spicetify.Player.addEventListener('songchange', () => {
      const newUri = Spicetify.Player.data?.item?.uri;
      if (newUri !== currentTrackUri) {
        currentTrackUri = newUri;
        triggerRender();
        updateSettingsMenuAlbumInfo();
      }
    });

    currentTrackUri = Spicetify.Player.data?.item?.uri;
    triggerRender();
    
    // Attempt to hook the observer after UI loads
    setTimeout(setupObserver, 2000); 
  }

  function triggerRender() {
    if (renderDebounce) clearTimeout(renderDebounce);
    renderDebounce = setTimeout(() => {
      requestAnimationFrame(displayReleaseDate);
    }, 150);
  }

  async function displayReleaseDate() {
    try {
      const expectedUri = currentTrackUri;
      const { releaseDate, album } = await getTrackDetailsRD();
      
      // Prevent race conditions: if track changed while fetching, abort
      if (expectedUri !== currentTrackUri) return;

      // Clean up previous instance to prevent duplicates
      document.getElementById('releaseDate')?.remove();

      const targetSelector = localStorage.getItem('position');
      const target = document.querySelector(targetSelector);
      if (!target) {
        log('Target container not found, will retry via observer.');
        return;
      }

      const fmt = localStorage.getItem('dateFormat');
      const sepChar = localStorage.getItem('separator');
      
      // Use DocumentFragment for batched DOM insertion
      const frag = document.createDocumentFragment();
      const root = document.createElement('span');
      root.id = 'releaseDate';

      if (sepChar && sepChar !== '\u200E') {
        const s = document.createElement('span'); 
        s.textContent = ` ${sepChar} `;
        root.appendChild(s);
      }

      if (localStorage.getItem('showCalendarIcon') === 'true') {
        const icon = document.createElement('span'); 
        icon.textContent = '📅 ';
        root.appendChild(icon);
      }

      const dateA = document.createElement('a');
      dateA.textContent = formatDate(releaseDate, fmt);
      dateA.style.cursor = 'pointer';
      dateA.onclick = toggleSettingsMenu;
      
      if (localStorage.getItem('highlightAnniversary') === 'true' && isAnniversary(releaseDate)) {
        dateA.classList.add('nprd-anniv');
        dateA.title = "Happy Release Anniversary!";
      }
      root.appendChild(dateA);

      if (localStorage.getItem('showAge') === 'true') {
        const age = document.createElement('span'); 
        age.className = 'nprd-age';
        age.textContent = `(${computeAgeString(releaseDate)})`;
        root.appendChild(age);
      }

      if (localStorage.getItem('showAlbumBadge') === 'true' && album.album_type) {
        const badge = document.createElement('span'); 
        badge.className = 'nprd-badge';
        badge.textContent = album.album_type;
        root.appendChild(badge);
      }

      frag.appendChild(root);
      target.appendChild(frag);
    } catch (e) { error(e); }
  }

  function createSettingsMenu() {
    if (document.getElementById('settingsMenu')) document.getElementById('settingsMenu').remove();
    
    const menu = document.createElement('div');
    menu.id = 'settingsMenu';

    const header = document.createElement('div');
    header.className = 'nprd-header';
    header.innerHTML = `<h2>Release Date Settings</h2><button class="nprd-close">✕</button>`;
    header.querySelector('.nprd-close').onclick = toggleSettingsMenu;
    menu.appendChild(header);

    const opts = document.createElement('div');
    opts.appendChild(createNativeDropdown('position', 'Position', positions));
    opts.appendChild(createNativeDropdown('dateFormat', 'Format', dateformat));
    opts.appendChild(createNativeDropdown('separator', 'Separator', separatorOpts));
    
    opts.appendChild(createToggle('showAge', 'Show Age String'));
    opts.appendChild(createToggle('showAlbumBadge', 'Show Album Badge'));
    opts.appendChild(createToggle('showCalendarIcon', 'Show Calendar Icon'));
    opts.appendChild(createToggle('highlightAnniversary', 'Highlight Anniversaries'));
    opts.appendChild(createToggle('menuBlur', 'Enable Glass Blur Effect'));
    
    // Opacity Slider
    const opContainer = document.createElement('div');
    opContainer.className = 'Dropdown-container';
    opContainer.innerHTML = `<label>Menu Opacity</label><input type="range" min="0.3" max="1.0" step="0.05" value="${localStorage.getItem('menuOpacity')}">`;
    opContainer.querySelector('input').oninput = (e) => {
      localStorage.setItem('menuOpacity', e.target.value);
      applyMenuStyles(menu);
    };
    opts.appendChild(opContainer);

    // Color Picker
    const colorContainer = document.createElement('div');
    colorContainer.className = 'Dropdown-container';
    colorContainer.innerHTML = `<label>Menu Color</label><input type="color" value="${localStorage.getItem('menuColor')}">`;
    colorContainer.querySelector('input').oninput = (e) => {
      localStorage.setItem('menuColor', e.target.value);
      applyMenuStyles(menu);
    };
    opts.appendChild(colorContainer);

    menu.appendChild(opts);
    const info = document.createElement('a'); info.id = 'nprd-album-info';
    menu.appendChild(info);
    
    document.body.appendChild(menu);
    applyMenuStyles(menu);
  }

  function createToggle(key, text) {
    const div = document.createElement('div');
    div.className = 'Dropdown-container';
    div.innerHTML = `<label>${text}</label><input type="checkbox" ${localStorage.getItem(key) === 'true' ? 'checked' : ''}>`;
    div.querySelector('input').onchange = (e) => {
      localStorage.setItem(key, e.target.checked ? 'true' : 'false');
      applyMenuStyles(document.getElementById('settingsMenu'));
      triggerRender();
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
      triggerRender();
    };
    return div;
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

  async function updateSettingsMenuAlbumInfo() {
    const container = document.getElementById('nprd-album-info');
    if (!container) return;
    try {
      const { album, releaseDate } = await getTrackDetailsRD();
      container.innerHTML = `
        <div style="display:flex; align-items:center; margin-top:15px; text-decoration:none; color:var(--spice-text);">
          <img src="${album.images[0]?.url || ''}" style="width:50px; height:50px; border-radius:4px; margin-right:10px; background:var(--spice-subtext);">
          <div>
            <p style="margin:0; font-weight:bold;">${album.name}</p>
            <p style="margin:0; opacity:0.7; font-size:12px;">${album.artists[0]?.name} • ${formatDate(releaseDate, localStorage.getItem('dateFormat'))}</p>
          </div>
        </div>
      `;
      container.href = album.external_urls.spotify;
    } catch (e) {
      container.innerHTML = `<p style="color:var(--spice-error);">Could not load album info</p>`;
    }
  }

  function formatDate(d, f) {
    if (!(d instanceof Date) || isNaN(d)) return "Unknown Date";
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
    if (f === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;
    if (f === 'MM-DD-YYYY') return `${mm}-${dd}-${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  function computeAgeString(d) {
    if (!(d instanceof Date) || isNaN(d)) return "Unknown Age";
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) m--;
    if (m < 0) { y--; m += 12; }
    if (y < 0) return 'Unreleased';
    if (y === 0 && m === 0) return 'New';
    return y > 0 ? `${y}y ${m}m` : `${m}m`;
  }

  function isAnniversary(d) {
    if (!(d instanceof Date) || isNaN(d)) return false;
    const now = new Date();
    return now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
  }

  initializeRD();
})();
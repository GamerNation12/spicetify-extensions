// NAME: Release Date For Currently Playing Song
// AUTHOR: GamerNation12
// DESCRIPTION: Displays the original release date of the currently playing track.

(() => {
  const DEBUG = false;
  const PREFIX = '[Release Date]';
  const log = (...args) => { if (DEBUG) console.log(PREFIX, ...args); };
  const error = (...args) => console.error(PREFIX, ...args);

  // --- Utilities ---
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

  const POSITIONS = [
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists", text: "Below artist" },
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name", text: "Below track name" }
  ];
  const DATE_FORMATS = [
    { value: "DD-MM-YYYY", text: "DD-MM-YYYY" },
    { value: "MM-DD-YYYY", text: "MM-DD-YYYY" },
    { value: "YYYY-MM-DD", text: "YYYY-MM-DD" }
  ];
  const SEPARATORS = [
    { value: "•", text: "Dot" },
    { value: "-", text: "Dash" },
    { value: "\u200E", text: "None" }
  ];

  const FEATURE_DEFAULTS = {
    showAge: 'true',
    showAlbumBadge: 'true',
    showCalendarIcon: 'true',
    highlightAnniversary: 'true',
  };

  /** Initialize default settings if not set */
  if (!localStorage.getItem('position')) {
    localStorage.setItem('position', POSITIONS[1].value);
    localStorage.setItem('dateFormat', DATE_FORMATS[0].value);
    localStorage.setItem('separator', SEPARATORS[0].value);
  }
  for (const [k, v] of Object.entries(FEATURE_DEFAULTS)) {
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
    if (!albumUri) throw new Error('No album data');
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

  // --- Styles ---
  const CALENDAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>';

  function releaseDateCSS() {
    const styleId = 'nprd-style';
    if (document.getElementById(styleId)) return null;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #nprd-settings {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(25, 25, 25, 0.95);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        padding: 28px 24px;
        border-radius: 16px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
        flex-direction: column;
        width: min(90vw, 400px);
        z-index: 10001;
        gap: 0;
        border: none;
        box-sizing: border-box;
        font-family: var(--font-family, inherit);
      }
      #nprd-settings * { box-sizing: border-box; }
      #nprd-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        backdrop-filter: blur(2px);
      }
      #nprd-settings .nprd-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      #nprd-settings h2 {
        color: var(--spice-text);
        font-size: 1.125rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0;
      }
      #nprd-settings .nprd-close {
        background: transparent;
        border: none;
        color: var(--spice-subtext);
        border-radius: 50%;
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s, background 0.15s;
        font-size: 18px;
      }
      #nprd-settings .nprd-close:hover {
        color: var(--spice-text);
        background: rgba(255,255,255,0.08);
      }
      #nprd-settings .nprd-section {
        margin-bottom: 4px;
      }
      #nprd-settings .nprd-section-title {
        color: var(--spice-subtext);
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 16px 0 8px;
        padding: 0;
      }
      #nprd-settings .nprd-section-title:first-child { margin-top: 0; }
      #nprd-settings .nprd-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        color: var(--spice-text);
        font-size: 0.875rem;
        font-weight: 500;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      #nprd-settings .nprd-row:last-child { border-bottom: none; }
      #nprd-settings .nprd-select {
        background: rgba(255,255,255,0.06);
        color: var(--spice-text);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        min-width: 140px;
      }
      #nprd-settings input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: #1ed760;
        cursor: pointer;
      }
      #releaseDate {
        display: inline-flex !important;
        align-items: center;
        white-space: nowrap !important;
        font-size: 0.8125rem;
        margin-left: 8px;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      #releaseDate.fade-in { opacity: 1; }
      #releaseDate a {
        color: var(--spice-subtext);
        text-decoration: none;
        cursor: pointer;
        transition: color 0.15s;
      }
      #releaseDate a:hover { color: var(--spice-text); }
      .nprd-calendar-icon {
        display: inline-flex;
        align-items: center;
        margin-right: 4px;
      }
      .nprd-calendar-icon svg { width: 14px; height: 14px; fill: currentColor; }
      .nprd-refresh {
        background: none;
        border: none;
        color: var(--spice-subtext);
        cursor: pointer;
        margin-left: 4px;
        padding: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s, transform 0.35s ease;
      }
      .nprd-refresh:hover { color: #1ed760; transform: rotate(180deg); }
      .nprd-refresh svg { width: 14px; height: 14px; fill: currentColor; }
      .nprd-badge {
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.625rem;
        font-weight: 700;
        background: rgba(30, 215, 96, 0.2);
        color: var(--spice-text);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-left: 6px;
      }
      .nprd-age {
        font-weight: 400;
        color: var(--spice-subtext);
        margin-left: 6px;
        font-size: 0.75rem;
      }
      .nprd-anniv { color: #1ed760 !important; font-weight: 600; }
    `;
    return style;
  }

  function createSettingsMenu() {
    const existing = document.getElementById('nprd-settings');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'nprd-settings';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-labelledby', 'nprd-settings-title');

    const header = document.createElement('div');
    header.className = 'nprd-header';
    header.innerHTML = `<h2 id="nprd-settings-title">Release date</h2><button class="nprd-close" type="button" aria-label="Close settings">×</button>`;
    header.querySelector('.nprd-close').onclick = () => {
      menu.style.display = 'none';
      const b = document.getElementById('nprd-backdrop');
      if (b) b.style.display = 'none';
    };
    menu.appendChild(header);

    const layoutSection = document.createElement('div');
    layoutSection.className = 'nprd-section';
    layoutSection.innerHTML = '<div class="nprd-section-title">Layout</div>';
    layoutSection.appendChild(createRow('Position', 'position', POSITIONS));
    layoutSection.appendChild(createRow('Date format', 'dateFormat', DATE_FORMATS));
    layoutSection.appendChild(createRow('Separator', 'separator', SEPARATORS));
    menu.appendChild(layoutSection);

    const displaySection = document.createElement('div');
    displaySection.className = 'nprd-section';
    displaySection.innerHTML = '<div class="nprd-section-title">Display</div>';
    displaySection.appendChild(createToggle('showCalendarIcon', 'Calendar icon'));
    displaySection.appendChild(createToggle('showAge', 'Time since release'));
    displaySection.appendChild(createToggle('showAlbumBadge', 'Album type badge'));
    displaySection.appendChild(createToggle('highlightAnniversary', 'Highlight release anniversary'));
    menu.appendChild(displaySection);

    document.body.appendChild(menu);
  }

  function createToggle(key, text) {
    const div = document.createElement('div');
    div.className = 'nprd-row';
    div.innerHTML = `<label for="nprd-${key}">${text}</label><input id="nprd-${key}" type="checkbox" ${localStorage.getItem(key) === 'true' ? 'checked' : ''}>`;
    div.querySelector('input').onchange = (e) => {
      localStorage.setItem(key, e.target.checked ? 'true' : 'false');
      displayReleaseDate();
    };
    return div;
  }

  function createRow(label, id, options) {
    const div = document.createElement('div');
    div.className = 'nprd-row';
    const current = localStorage.getItem(id);
    let html = `<label for="nprd-${id}">${label}</label><select id="nprd-${id}" class="nprd-select">`;
    options.forEach(o => html += `<option value="${escapeAttr(o.value)}" ${current === o.value ? 'selected' : ''}>${escapeText(o.text)}</option>`);
    html += `</select>`;
    div.innerHTML = html;
    div.querySelector('select').onchange = (e) => {
      localStorage.setItem(id, e.target.value);
      displayReleaseDate();
    };
    return div;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        icon.className = 'nprd-calendar-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = CALENDAR_SVG;
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
        toggleSettingsMenu(document.getElementById('nprd-settings'));
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

      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'nprd-refresh';
      refreshBtn.type = 'button';
      refreshBtn.title = 'Refresh release date';
      refreshBtn.setAttribute('aria-label', 'Refresh release date');
      refreshBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4V1L8 5l4 4V6c3.3 0 6 2.7 6 6 0 1-.3 2-.7 2.8l1.5 1.5c.7-1.3 1.2-2.8 1.2-4.3 0-5-4-9-9-9zM6 12c0-1 .3-2 .7-2.8L5.2 7.7C4.5 9 4 10.5 4 12c0 5 4 9 9 9v-3l4 4-4 4v-3c-3.3 0-6-2.7-6-6z"/></svg>`;
      refreshBtn.onclick = (e) => {
        e.stopPropagation();
        const albumUri = Spicetify.Player.data?.item?.album?.uri;
        if (albumUri) {
          const albumId = albumUri.split(':')[2];
          albumCache.delete(albumId);
        }
        console.log(PREFIX, 'Refreshing release date');
        Spicetify.showNotification('Refreshing release date…');
        displayReleaseDate();
      };
      root.appendChild(refreshBtn);

      let target = document.querySelector(lsPosition);
      if (!target) {
        const fallback = POSITIONS.find(p => p.value !== lsPosition)?.value;
        if (fallback) target = document.querySelector(fallback);
      }
      if (target) {
        target.style.display = 'flex';
        target.style.alignItems = 'center';
        target.style.flexWrap = 'nowrap';
        target.appendChild(root);
        setTimeout(() => root.classList.add('fade-in'), 10);
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

  function toggleSettingsMenu(settingsEl) {
    if (!settingsEl) return;
    let backdrop = document.getElementById('nprd-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'nprd-backdrop';
      document.body.appendChild(backdrop);
      backdrop.onclick = () => {
        settingsEl.style.display = 'none';
        backdrop.style.display = 'none';
      };
    }
    const isHidden = settingsEl.style.display === 'none' || settingsEl.style.display === '';
    settingsEl.style.display = isHidden ? 'flex' : 'none';
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
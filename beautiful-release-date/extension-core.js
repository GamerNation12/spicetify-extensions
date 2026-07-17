// NAME: Beautiful Release Date
// AUTHOR: GamerNation12
// DESCRIPTION: Displays the currently playing track's original release date with beautiful dynamic themes.

(() => {
  const DEBUG = true;
  const log = (...args) => { if (DEBUG) console.log('[Release Date]', ...args); };
  const error = (...args) => console.error('[Release Date]', ...args);

  console.log('[Release Date For Currently Playing Song] loaded');

  // VERSIONING (Semantic Versioning: MAJOR.MINOR.PATCH)
  // Version and changelog are dynamically fetched from the website on boot.
  let BRD_VERSION = 'Loading...';
  let BRD_CHANGELOG_LINES = [];
  let currentPreviewRequestId = 0;
  let currentDisplayRequestId = 0;
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
    await waitUntil(() => {
        const item = Spicetify?.Player?.data?.item;
        if (!item) return false;
        if (!item.uri?.includes(':track:')) return true;
        return !!item.album?.uri;
    });
  }

  const positions = [
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name", text: "Song name" },
    { value: ".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists", text: "Artist" },
    { value: "top-header-pill", text: "Floating Pill (Above Track)" }
  ];
  const dateformat = [
    { value: "DD-MM-YYYY", text: "DD-MM-YYYY" },
    { value: "MM-DD-YYYY", text: "MM-DD-YYYY" },
    { value: "YYYY-MM-DD", text: "YYYY-MM-DD" }
  ];
  
  const themeOpts = [
    { value: "m3", text: "Material 3" },
    { value: "spotify", text: "Spotify Native" },
    { value: "aurora", text: "Aurora Gradients" },
    { value: "fluent", text: "Windows 11 Fluent" },
    { value: "oled", text: "Pure OLED Monochrome" },
  ];

  const separatorOpts = [
    { value: "•", text: "Dot" },
    { value: "-", text: "Dash" },
    { value: "\u200E", text: "None" },
  ];

  const featureDefaults = {
    showAge: 'true',
    showAlbumBadge: 'true',
    highlightAnniversary: 'true',
    showPopularity: 'true',
    showAudioFeatures: 'true',
    showLabel: 'true',
    showExplicitBadge: 'true',
    hideVideoBtn: 'true',
    textColor: 'inherit',
    fontSize: '0.75rem',
    fontWeight: '400',
  };

  // Initialize Settings
    if (!localStorage.getItem('menuTheme')) {
    localStorage.setItem('menuTheme', 'm3');
  }
  if (!localStorage.getItem('position')) {
    localStorage.setItem('position', positions[0].value);
    localStorage.setItem('dateFormat', dateformat[0].value);
    localStorage.setItem('separator', separatorOpts[0].value);
  }
  // Restore correct long selectors
  const curPos = localStorage.getItem('position');
  if (curPos && !curPos.includes('main-nowPlayingWidget-nowPlaying') && curPos !== 'top-header-pill') {
      if (curPos.includes('artists')) localStorage.setItem('position', '.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists');
      else localStorage.setItem('position', '.main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name');
  }
  for (const [k, v] of Object.entries(featureDefaults)) {
    if (localStorage.getItem(k) == null) localStorage.setItem(k, v);
  }

  const inflight = new Map();
  const CACHE_MAX = 100;
  const CACHE_KEY = 'brd_track_cache_v2';

  let trackCache;
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    trackCache = stored ? new Map(JSON.parse(stored).map(([k, v]) => [k, { ...v, releaseDate: v.releaseDate ? new Date(v.releaseDate) : null }])) : new Map();
  } catch (e) {
    trackCache = new Map();
  }

  function cacheSet(trackId, value, persist = true) {
    if (trackCache.size >= CACHE_MAX) {
      const firstKey = trackCache.keys().next().value;
      if (firstKey) trackCache.delete(firstKey);
    }
    trackCache.set(trackId, value);
    if (persist) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(trackCache.entries())));
      } catch (e) {}
    }
  }

  async function getTrackDetailsRD() {
    log('Waiting for track data...');
    await waitForTrackData();
    const playerData = Spicetify.Player.data;
    if (!playerData?.item?.uri) throw new Error('No track data');
    const trackUri = playerData.item.uri;
    const albumUri = playerData.item.album?.uri;
    log('Track Data Found:', trackUri);
    
    if (!trackUri || !trackUri.includes(':track:')) {
        const now = new Date();
        return { trackDetails: playerData.item, album: playerData.item.album || { name: 'Unknown' }, releaseDate: now, popularity: null };
    }
    const trackId = trackUri.split(':')[2];
    const albumId = albumUri?.split(':')[2];

    if (trackCache.has(trackId)) return { trackDetails: playerData.item, ...trackCache.get(trackId) };
    if (inflight.has(trackId)) return await inflight.get(trackId);

    const p = (async () => {
      let albumDetails = null;
      let popularity = null;
      let audioFeatures = null;
      let explicit = false;
      let label = null;
      let fetchFailed = false;
      try {
        if (albumUri && albumUri.includes(':album:')) {
          const idObj = Spicetify.URI?.from?.(albumUri);
          const hexId = idObj?.id ? Spicetify.URI.idToHex(idObj.id) : null;
          if (hexId) {
            let retries = 3;
            while (retries > 0) {
              try {
                const rb = Spicetify.Platform?.RequestBuilder?.build?.();
                if (!rb) break;
                const resp = await rb.withHost("https://spclient.wg.spotify.com/metadata/4").withPath(`/album/${hexId}`).send();
                albumDetails = await resp.body;
                break;
              } catch (retryErr) {
                retries--;
                if (retries > 0) await new Promise(r => setTimeout(r, 1000));
                else throw retryErr;
              }
            }
            label = albumDetails?.label || null;
          }
        }
        
        if (localStorage.getItem('showPopularity') === 'true' || localStorage.getItem('showExplicitBadge') === 'true') {
           try {
             const trackRes = await Spicetify.CosmosAsync.get('https://api.spotify.com/v1/tracks/' + trackId);
             if (trackRes) {
               if (trackRes.popularity !== undefined) popularity = trackRes.popularity;
               if (trackRes.explicit !== undefined) explicit = trackRes.explicit;
             }
           } catch (err) { log('Popularity fetch failed', err); }
        }

        if (localStorage.getItem('showAudioFeatures') === 'true') {
           try {
             const audioRes = await Spicetify.CosmosAsync.get('https://api.spotify.com/v1/audio-features/' + trackId);
             if (audioRes && audioRes.tempo) {
                audioFeatures = {
                    tempo: Math.round(audioRes.tempo),
                    key: audioRes.key,
                    mode: audioRes.mode
                };
             }
           } catch (err) { log('Audio Features fetch failed', err); }
        }
      } catch (e) { 
        log('Fetch failed', e); 
        fetchFailed = true;
      }

      let album, releaseDate;
      if (albumDetails?.date && albumDetails.date.year) {
        album = {
          name: albumDetails.name || 'Unknown Album',
          artists: albumDetails.artist || [{name: 'Unknown Artist'}],
          album_type: albumDetails.type || 'album',
          external_urls: { spotify: albumDetails.canonical_uri || albumUri },
          images: albumDetails.cover_group?.image?.map(img => ({ url: `https://i.scdn.co/image/${img.file_id}` })) || []
        };
        const y = albumDetails.date.year;
        const m = (albumDetails.date.month || 1) - 1;
        const d = albumDetails.date.day || 1;
        releaseDate = new Date(y, m, d);
      } else {
        album = { ...playerData.item.album, album_type: 'album' };
        const metaYear = playerData.item?.metadata?.year || playerData.item?.metadata?.album_year;
        if (metaYear) {
            releaseDate = new Date(parseInt(metaYear, 10), 0, 1);
        } else {
            releaseDate = null;
        }
      }
      cacheSet(trackId, { album, releaseDate, popularity, audioFeatures, explicit, label }, !fetchFailed);
      return { trackDetails: playerData.item, album, releaseDate, popularity, audioFeatures, explicit, label };
    })();

    inflight.set(trackId, p);
    try { return await p; } finally { inflight.delete(trackId); }
  }

  // --- Professional CSS ---
  
  function releaseDateCSS() {
    const styleId = 'brd-style';
    if (document.getElementById(styleId)) return null;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      /* BASE CSS (Structure & Layout) */
      #settingsMenu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.95); 
        padding: 24px; flex-direction: column; width: min(90vw, 440px); z-index: 10001; gap: 16px; 
        box-sizing: border-box; opacity: 0;
        transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s cubic-bezier(0.2, 0, 0, 1);
        font-family: var(--font-family, inherit);
      }
      #settingsMenu.brd-m3-animate { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      #settingsMenu * { box-sizing: border-box; }
      #brd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; opacity: 0; transition: opacity 0.25s linear; backdrop-filter: blur(4px); }
      #brd-backdrop.brd-m3-animate { opacity: 1; }
      
      #settingsMenu .brd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      #settingsMenu h2 { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.01em; margin: 0; }
      #settingsMenu .brd-close { border: none; border-radius: 50%; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background 0.2s, color 0.2s; font-size: 14px; }
      
      .Dropdown-container { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-weight: 500; font-size: 0.9rem; gap: 12px; }
      .brd-select {
        position: relative; min-width: 180px; border-radius: 8px; padding: 8px 30px 8px 12px; 
        font-family: inherit; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
        transition: border-color 0.18s ease, background 0.18s ease;
      }
      .brd-select-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .brd-options {
        position: absolute; inset-inline: 0; top: calc(100% + 6px); border-radius: 8px; padding: 4px; z-index: 10; max-height: 220px; overflow-y: auto;
      }
      .brd-option { padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
      
      /* Switches */
      .brd-switch { position: relative; display: inline-block; width: 52px; height: 32px; flex-shrink: 0; }
      .brd-switch input { opacity: 0; width: 0; height: 0; }
      .brd-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; transition: .25s cubic-bezier(0.2, 0, 0, 1); }
      .brd-slider:before { position: absolute; content: ""; transition: .25s cubic-bezier(0.2, 0, 0, 1); }
      
      /* Tabs */
      .brd-tabs-header { display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
      .brd-tab-btn { display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; border: none; font-weight: 600; font-size: 0.85rem; padding: 6px 12px; cursor: pointer; border-radius: 8px; transition: 0.2s; flex: 1; text-align: center; }
      .brd-tab-content { display: none; flex-direction: column; animation: brdFadeIn 0.3s cubic-bezier(0.2, 0, 0, 1); }
      .brd-tab-content.brd-active { display: flex; }
      @keyframes brdFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

      /* ========================================================
         THEME 1: MATERIAL 3 (Default Android look)
         ======================================================== */
      #settingsMenu.theme-m3 { background: #1c1b1f; color: #e6e1e5; border-radius: 28px; box-shadow: 0px 8px 24px rgba(0,0,0,0.4); border: none; }
      #settingsMenu.theme-m3 .brd-close { background: rgba(255,255,255,0.05); color: #e6e1e5; }
      #settingsMenu.theme-m3 .brd-close:hover { background: rgba(255,255,255,0.15); }
      #settingsMenu.theme-m3 .brd-select { background: #49454f; color: #e6e1e5; border: 1px solid #938f99; }
      #settingsMenu.theme-m3 .brd-select:hover { border-color: #e6e1e5; background: #605d66; }
      #settingsMenu.theme-m3 .brd-select.brd-open { border-color: #1ed760; background: #323035; }
      #settingsMenu.theme-m3 .brd-options { background: #323035; box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1); }
      #settingsMenu.theme-m3 .brd-option { color: #c8c5ca; }
      #settingsMenu.theme-m3 .brd-option:hover { background: rgba(255,255,255,0.08); color: #e6e1e5; }
      #settingsMenu.theme-m3 .brd-option.brd-selected { background: rgba(30,215,96,0.2); color: #1ed760; }
      #settingsMenu.theme-m3 .brd-slider { background-color: #49454f; border: 2px solid #938f99; border-radius: 32px; }
      #settingsMenu.theme-m3 .brd-slider:before { height: 16px; width: 16px; left: 6px; top: 6px; background-color: #938f99; border-radius: 50%; }
      #settingsMenu.theme-m3 .brd-switch input:checked + .brd-slider { background-color: #1ed760; border-color: #1ed760; }
      #settingsMenu.theme-m3 .brd-switch input:checked + .brd-slider:before { transform: translateX(20px) scale(1.5); background-color: #000; }
      #settingsMenu.theme-m3 .brd-tab-btn { color: #938f99; }
      #settingsMenu.theme-m3 .brd-tab-btn:hover { background: rgba(255,255,255,0.05); color: #e6e1e5; }
      #settingsMenu.theme-m3 .brd-tab-btn.brd-active { background: rgba(30,215,96,0.1); color: #1ed760; }

      /* ========================================================
         THEME 2: SPOTIFY NATIVE (Premium seamless integration)
         ======================================================== */
      #settingsMenu.theme-spotify { background: #242424; color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: 'CircularSp', 'CircularSp-Arab', 'CircularSp-Hebr', 'CircularSp-Cyrl', 'CircularSp-Grek', 'CircularSp-Deva', var(--fallback-fonts, sans-serif); }
      #settingsMenu.theme-spotify .brd-close { background: transparent; color: #b3b3b3; }
      #settingsMenu.theme-spotify .brd-close:hover { background: #333; color: #fff; }
      #settingsMenu.theme-spotify .brd-select { background: #242424; color: #fff; border: 1px solid #555; border-radius: 4px; font-weight: 400; }
      #settingsMenu.theme-spotify .brd-select:hover { border-color: #888; background: #2a2a2a; }
      #settingsMenu.theme-spotify .brd-select.brd-open { border-color: #fff; background: #333; }
      #settingsMenu.theme-spotify .brd-options { background: #282828; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 4px; }
      #settingsMenu.theme-spotify .brd-option { color: #b3b3b3; border-radius: 2px; }
      #settingsMenu.theme-spotify .brd-option:hover { background: #333; color: #fff; }
      #settingsMenu.theme-spotify .brd-option.brd-selected { color: #1ed760; background: rgba(30,215,96,0.1); }
      /* Spotify Switch */
      #settingsMenu.theme-spotify .brd-switch { width: 40px; height: 24px; }
      #settingsMenu.theme-spotify .brd-slider { background-color: #5a5a5a; border-radius: 24px; border: none; }
      #settingsMenu.theme-spotify .brd-slider:before { height: 18px; width: 18px; left: 3px; top: 3px; background-color: #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
      #settingsMenu.theme-spotify .brd-switch input:checked + .brd-slider { background-color: #1ed760; }
      #settingsMenu.theme-spotify .brd-switch input:checked + .brd-slider:before { transform: translateX(16px); background-color: #fff; }
      #settingsMenu.theme-spotify .brd-tab-btn { color: #b3b3b3; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 500px; padding: 8px; }
      #settingsMenu.theme-spotify .brd-tab-btn:hover { color: #fff; }
      #settingsMenu.theme-spotify .brd-tab-btn.brd-active { background: #333; color: #fff; }
      #settingsMenu.theme-spotify #brd-update-btn { background: #1ed760 !important; color: #000 !important; border-radius: 500px !important; text-transform: uppercase; font-weight: 700 !important; font-size: 0.8rem; letter-spacing: 0.1em; transform: scale(1); transition: transform 0.1s; }
      #settingsMenu.theme-spotify #brd-update-btn:hover { transform: scale(1.04); background: #1fdf64 !important; }

      /* ========================================================
         THEME 3: AURORA GRADIENTS (Ethereal flowing colors)
         ======================================================== */
      #settingsMenu.theme-aurora { 
        background: linear-gradient(135deg, #1f005c, #5b0060, #870160, #ac255e, #ca485c, #e16b5c, #f39060, #ffb56b);
        background-size: 300% 300%; animation: auroraShift 12s ease infinite;
        color: #fff; border-radius: 24px; box-shadow: 0 12px 40px rgba(172,37,94,0.4); border: 1px solid rgba(255,255,255,0.2); 
      }
      @keyframes auroraShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      #settingsMenu.theme-aurora .brd-close { background: rgba(255,255,255,0.1); color: #fff; }
      #settingsMenu.theme-aurora .brd-close:hover { background: rgba(255,255,255,0.3); }
      #settingsMenu.theme-aurora .brd-select { background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
      #settingsMenu.theme-aurora .brd-select:hover { background: rgba(0,0,0,0.5); }
      #settingsMenu.theme-aurora .brd-select.brd-open { border-color: #fff; }
      #settingsMenu.theme-aurora .brd-options { background: rgba(30,0,60,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); }
      #settingsMenu.theme-aurora .brd-option { color: rgba(255,255,255,0.8); }
      #settingsMenu.theme-aurora .brd-option:hover { background: rgba(255,255,255,0.15); color: #fff; }
      #settingsMenu.theme-aurora .brd-option.brd-selected { background: rgba(255,255,255,0.3); color: #fff; font-weight: bold; }
      #settingsMenu.theme-aurora .brd-switch { width: 50px; height: 28px; }
      #settingsMenu.theme-aurora .brd-slider { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.3); border-radius: 30px; }
      #settingsMenu.theme-aurora .brd-slider:before { height: 20px; width: 20px; left: 3px; top: 3px; background: rgba(255,255,255,0.6); border-radius: 50%; }
      #settingsMenu.theme-aurora .brd-switch input:checked + .brd-slider { background: rgba(255,255,255,0.4); border-color: #fff; }
      #settingsMenu.theme-aurora .brd-switch input:checked + .brd-slider:before { transform: translateX(22px); background: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.8); }
      #settingsMenu.theme-aurora .brd-tab-btn { color: rgba(255,255,255,0.6); }
      #settingsMenu.theme-aurora .brd-tab-btn.brd-active { background: rgba(255,255,255,0.2); color: #fff; box-shadow: inset 0 0 10px rgba(255,255,255,0.1); }
      #settingsMenu.theme-aurora #brd-update-btn { background: rgba(255,255,255,0.9) !important; color: #870160 !important; border-radius: 12px !important; font-weight: 800 !important; }

      /* ========================================================
         THEME 4: WINDOWS 11 FLUENT (Acrylic blur & glass)
         ======================================================== */
      #settingsMenu.theme-fluent { background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(40px) saturate(150%); color: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
      #settingsMenu.theme-fluent .brd-close { background: transparent; color: #fff; border-radius: 6px; }
      #settingsMenu.theme-fluent .brd-close:hover { background: rgba(255,255,255,0.1); }
      #settingsMenu.theme-fluent .brd-select { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-bottom: 2px solid rgba(255,255,255,0.2); border-radius: 6px; }
      #settingsMenu.theme-fluent .brd-select:hover { background: rgba(255,255,255,0.08); border-bottom-color: rgba(255,255,255,0.4); }
      #settingsMenu.theme-fluent .brd-select.brd-open { border-bottom-color: #60cdff; background: rgba(255,255,255,0.1); }
      #settingsMenu.theme-fluent .brd-options { background: rgba(40,40,40,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
      #settingsMenu.theme-fluent .brd-option { color: #eee; border-radius: 4px; }
      #settingsMenu.theme-fluent .brd-option:hover { background: rgba(255,255,255,0.06); }
      #settingsMenu.theme-fluent .brd-option.brd-selected { background: rgba(96,205,255,0.1); color: #60cdff; position: relative; }
      #settingsMenu.theme-fluent .brd-option.brd-selected::before { content: ""; position: absolute; left: 2px; top: 20%; bottom: 20%; width: 3px; background: #60cdff; border-radius: 2px; }
      #settingsMenu.theme-fluent .brd-switch { width: 44px; height: 22px; }
      #settingsMenu.theme-fluent .brd-slider { background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 11px; }
      #settingsMenu.theme-fluent .brd-slider:before { height: 14px; width: 14px; left: 3px; top: 3px; background-color: #ccc; border-radius: 50%; }
      #settingsMenu.theme-fluent .brd-switch input:checked + .brd-slider { background-color: #60cdff; border-color: #60cdff; }
      #settingsMenu.theme-fluent .brd-switch input:checked + .brd-slider:before { transform: translateX(22px); background-color: #000; }
      #settingsMenu.theme-fluent .brd-tab-btn { color: #ccc; border-radius: 6px; }
      #settingsMenu.theme-fluent .brd-tab-btn:hover { background: rgba(255,255,255,0.05); }
      #settingsMenu.theme-fluent .brd-tab-btn.brd-active { background: rgba(255,255,255,0.1); color: #fff; }
      #settingsMenu.theme-fluent #brd-update-btn { background: #60cdff !important; color: #000 !important; border-radius: 6px !important; font-weight: 600 !important; }

      /* ========================================================
         THEME 5: PURE OLED (Pitch black, white lines)
         ======================================================== */
      #settingsMenu.theme-oled { background: #000000; color: #ffffff; border-radius: 0; box-shadow: none; border: 1px solid #333; }
      #settingsMenu.theme-oled .brd-close { background: #000; border: 1px solid #333; color: #fff; border-radius: 0; }
      #settingsMenu.theme-oled .brd-close:hover { background: #fff; color: #000; }
      #settingsMenu.theme-oled .brd-select { background: #000; color: #fff; border: 1px solid #555; border-radius: 0; }
      #settingsMenu.theme-oled .brd-select:hover { border-color: #fff; }
      #settingsMenu.theme-oled .brd-select.brd-open { border-color: #fff; background: #111; }
      #settingsMenu.theme-oled .brd-options { background: #000; border: 1px solid #555; border-radius: 0; box-shadow: none; }
      #settingsMenu.theme-oled .brd-option { color: #aaa; border-radius: 0; }
      #settingsMenu.theme-oled .brd-option:hover { background: #111; color: #fff; }
      #settingsMenu.theme-oled .brd-option.brd-selected { background: #fff; color: #000; }
      #settingsMenu.theme-oled .brd-switch { width: 40px; height: 20px; }
      #settingsMenu.theme-oled .brd-slider { background-color: #000; border: 1px solid #555; border-radius: 0; }
      #settingsMenu.theme-oled .brd-slider:before { height: 12px; width: 18px; left: 2px; top: 3px; background-color: #555; border-radius: 0; }
      #settingsMenu.theme-oled .brd-switch input:checked + .brd-slider { border-color: #fff; }
      #settingsMenu.theme-oled .brd-switch input:checked + .brd-slider:before { transform: translateX(16px); background-color: #fff; }
      #settingsMenu.theme-oled .brd-tab-btn { color: #555; border-radius: 0; }
      #settingsMenu.theme-oled .brd-tab-btn:hover { color: #fff; }
      #settingsMenu.theme-oled .brd-tab-btn.brd-active { background: #fff; color: #000; }
      #settingsMenu.theme-oled #brd-update-btn { background: #000 !important; color: #fff !important; border: 1px solid #fff !important; border-radius: 0 !important; font-weight: 400 !important; }
      #settingsMenu.theme-oled #brd-update-btn:hover { background: #fff !important; color: #000 !important; }

      .brd-anniv { color: #1ed760 !important; font-weight: 600; }
      #releaseDate { display: inline-flex !important; align-items: center; white-space: nowrap !important; font-size: var(--brd-font-size, 0.75rem) !important; font-weight: var(--brd-font-weight, 400) !important; letter-spacing: 0.01em; margin-left: 2px; flex-shrink: 0; color: var(--spice-subtext, #a7a7a7); cursor: default; }
      #releaseDate .brd-sep { margin: 0 6px; font-weight: 900; opacity: 0.5; font-size: 0.9em; transform: translateY(-0.5px); }
      #releaseDate a { color: var(--brd-text-color, inherit) !important; text-decoration: none; position: relative; transition: color 0.15s ease; cursor: pointer; border-radius: 4px; }
      #releaseDate a:hover { color: var(--spice-text, #fff); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
      #releaseDate .brd-age { opacity: 0.7; margin-left: 5px; font-size: 0.9em; }
      #releaseDate .brd-badge { display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); color: var(--spice-text, #fff); padding: 1px 5px; border-radius: 3px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 6px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); }
      #releaseDate .brd-popularity { margin-left: 6px; display: inline-flex; align-items: center; font-size: 0.85em; font-weight: 600; opacity: 0.9; }
      #releaseDate .brd-explicit { display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); color: var(--spice-text, #fff); padding: 1px 4px; border-radius: 2px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; margin-left: 6px; }
      #releaseDate .brd-features { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; opacity: 0.8; font-size: 0.85em; }
      #releaseDate .brd-features span { display: inline-flex; align-items: center; background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 3px; }
      #releaseDate .brd-label { margin-left: 6px; font-size: 0.8em; opacity: 0.6; display: inline-flex; align-items: center; font-style: italic; }
      #releaseDate .brd-popularity svg, #releaseDate .brd-audio-features svg, #releaseDate .brd-label svg { margin-right: 4px; opacity: 0.9; }
      
      #releaseDate.brd-pill { position: fixed; bottom: 105px; left: 16px; z-index: 9999; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; padding: 4px 14px; color: var(--spice-text, #fff); box-shadow: 0 4px 12px rgba(0,0,0,0.4); backdrop-filter: blur(8px); pointer-events: auto; }
      #releaseDate.brd-pill:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.3); }
      #releaseDate.brd-pill .brd-sep { display: none; }
      #releaseDate.brd-pill a { border: none !important; padding: 0; }
      .brd-refresh { background: transparent; border: none; padding: 0; margin-left: 6px; cursor: pointer; display: inline-flex; align-items: center; opacity: 0.5; transition: opacity 0.2s, transform 0.2s; color: inherit; }

      .brd-refresh:hover { opacity: 1; transform: rotate(90deg); }
      .brd-refresh svg { width: 12px; height: 12px; fill: currentColor; }

      body.brd-hide-video .main-nowPlayingWidget-nowPlaying [aria-label*="video" i], 
      body.brd-hide-video .main-nowPlayingWidget-nowPlaying [aria-label*="Video" i] { display: none !important; }
      .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists:has(#releaseDate), .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name:has(#releaseDate) { min-width: 0 !important; overflow: hidden !important; display: flex !important; align-items: center !important; flex-wrap: nowrap !important; position: relative !important; width: 100% !important; justify-content: flex-start !important; text-align: left !important; direction: ltr !important; }
      .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists:has(#releaseDate) *, .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name:has(#releaseDate) * { &::before, &::after, &::marker { content: none !important; display: none !important; width: 0 !important; height: 0 !important; } }
      .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-artists:has(#releaseDate) > *:not(#releaseDate), .main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name:has(#releaseDate) > *:not(#releaseDate) { min-width: 0 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; flex: 0 1 auto !important; padding-right: 4px !important; }
    `;
    return style;
  }


  function createSettingsMenu() {
    if (document.getElementById('settingsMenu')) document.getElementById('settingsMenu').remove();
    
    const menu = document.createElement('div');
    menu.id = 'settingsMenu';
    menu.className = `theme-${localStorage.getItem('menuTheme') || 'm3'}`;

    const header = document.createElement('div');
    header.className = 'brd-header';
    header.innerHTML = `<div style="display:flex;align-items:baseline;gap:8px;"><h2>Settings</h2><span style="opacity:0.5;font-size:0.75rem;font-weight:600;">v${BRD_VERSION}</span></div><button class="brd-close" aria-label="Close">✕</button>`;
    header.querySelector('.brd-close').onclick = () => {
      toggleSettingsMenu(menu);
    };
    menu.appendChild(header);

    const previewContainer = document.createElement('div');
    previewContainer.className = 'brd-preview-container';
    previewContainer.style.padding = '12px';
    previewContainer.style.background = 'rgba(0,0,0,0.2)';
    previewContainer.style.borderRadius = '8px';
    previewContainer.style.marginBottom = '12px';
    previewContainer.style.display = 'flex';
    previewContainer.style.alignItems = 'center';
    previewContainer.style.justifyContent = 'center';
    previewContainer.style.border = '1px solid rgba(255,255,255,0.1)';
    menu.appendChild(previewContainer);
    window.BRD_STATE.previewContainer = previewContainer;

    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'brd-tabs-header';
    const tabNames = [
       { id: 'tab-layout', name: 'Layout', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' },
       { id: 'tab-style', name: 'Style', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z"></path></svg>' },
       { id: 'tab-analytics-info', name: 'Analytics & Info', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>' }
    ];
    
    const tabContents = document.createElement('div');
    tabContents.className = 'brd-tabs-body';

    tabNames.forEach((tab, index) => {
       const btn = document.createElement('button');
       btn.className = `brd-tab-btn ${index === 0 ? 'brd-active' : ''}`;
       btn.innerHTML = `${tab.icon} <span>${tab.name}</span>`;
       
       const content = document.createElement('div');
       content.className = `brd-tab-content ${index === 0 ? 'brd-active' : ''}`;
       content.id = tab.id;

       btn.onclick = () => {
          tabsHeader.querySelectorAll('.brd-tab-btn').forEach(b => b.classList.remove('brd-active'));
          tabContents.querySelectorAll('.brd-tab-content').forEach(c => c.classList.remove('brd-active'));
          btn.classList.add('brd-active');
          content.classList.add('brd-active');
       };

       tabsHeader.appendChild(btn);
       tabContents.appendChild(content);
    });

    menu.appendChild(tabsHeader);
    menu.appendChild(tabContents);

        const layoutTab = tabContents.querySelector('#tab-layout');
    layoutTab.appendChild(createCustomDropdown('position', 'Display Position', positions));
    layoutTab.appendChild(createCustomDropdown('dateFormat', 'Date Format', dateformat));
    layoutTab.appendChild(createCustomDropdown('separator', 'Separator Style', separatorOpts));
    layoutTab.appendChild(createToggle('hideVideoBtn', 'Hide Music Video Button'));

    const analyticsTab = tabContents.querySelector('#tab-analytics-info');
    analyticsTab.appendChild(createToggle('showAudioFeatures', 'BPM & Musical Key'));
    analyticsTab.appendChild(createToggle('showPopularity', 'Track Popularity'));
    analyticsTab.appendChild(createToggle('showExplicitBadge', 'Explicit Badge'));
    analyticsTab.appendChild(createToggle('showAge', 'Time Since Release'));
    analyticsTab.appendChild(createToggle('showLabel', 'Record Label'));
    analyticsTab.appendChild(createToggle('showAlbumBadge', 'Album Type Badge'));
    analyticsTab.appendChild(createToggle('highlightAnniversary', 'Anniversary Highlight'));

    const styleTab = tabContents.querySelector('#tab-style');
    const colorOpts = [
      { value: "inherit", text: "Default (Subtext)" },
      { value: "var(--spice-text)", text: "Dynamic: Text" },
      { value: "var(--spice-subtext)", text: "Dynamic: Subtext" },
      { value: "var(--spice-button)", text: "Dynamic: Button" },
      { value: "var(--spice-button-active)", text: "Dynamic: Button Active" },
      { value: "#ffffff", text: "Solid White" },
      { value: "#1ed760", text: "Spotify Green" },
      { value: "#60cdff", text: "Soft Blue" },
      { value: "#ff5e5e", text: "Bright Red" }
    ];
    const sizeOpts = [
      { value: "0.65rem", text: "Small" },
      { value: "0.75rem", text: "Default" },
      { value: "0.9rem", text: "Large" }
    ];
    const weightOpts = [
      { value: "400", text: "Normal" },
      { value: "600", text: "Semi-Bold" },
      { value: "900", text: "Black" }
    ];
    styleTab.appendChild(createCustomDropdown('menuTheme', 'Menu Theme', themeOpts, (newTheme) => {
        menu.className = `theme-${newTheme} brd-m3-animate`;
    }));
    styleTab.appendChild(createCustomDropdown('textColor', 'Text Color', colorOpts));
    styleTab.appendChild(createCustomDropdown('fontSize', 'Font Size', sizeOpts));
    styleTab.appendChild(createCustomDropdown('fontWeight', 'Font Weight', weightOpts));


    const updateBtnContainer = document.createElement('div');
    updateBtnContainer.style.display = 'flex';
    updateBtnContainer.style.justifyContent = 'center';
    updateBtnContainer.style.marginTop = '16px';
    const updateBtn = document.createElement('button');
    updateBtn.id = 'brd-update-btn';
    updateBtn.style.background = '#1ed760';
    updateBtn.style.color = '#000';
    updateBtn.style.border = 'none';
    updateBtn.style.borderRadius = '999px';
    updateBtn.style.padding = '8px 16px';
    updateBtn.style.fontWeight = '600';
    updateBtn.style.cursor = 'pointer';
    
    let cooldownInterval;
    function updateBtnState() {
        const lastCheck = parseInt(localStorage.getItem('brd_last_update_check') || '0', 10);
        const cooldown = 30 * 1000; // Reduced to 30 seconds for easier testing
        const now = Date.now();
        if (now - lastCheck < cooldown) {
            updateBtn.disabled = true;
            updateBtn.style.opacity = '0.5';
            updateBtn.style.cursor = 'not-allowed';
            const remainingSecs = Math.ceil((cooldown - (now - lastCheck)) / 1000);
            const m = Math.floor(remainingSecs / 60);
            const s = remainingSecs % 60;
            updateBtn.textContent = `Cooldown (${m}:${s.toString().padStart(2, '0')})`;
        } else {
            updateBtn.disabled = false;
            updateBtn.style.opacity = '1';
            updateBtn.style.cursor = 'pointer';
            updateBtn.textContent = 'Check for Updates';
            if (cooldownInterval) clearInterval(cooldownInterval);
        }
    }
    
    updateBtnState();
    cooldownInterval = setInterval(updateBtnState, 1000);

    updateBtn.onclick = () => {
        if (updateBtn.disabled) return;
        updateBtn.textContent = 'Checking...';
        updateBtn.disabled = true;
        updateBtn.style.opacity = '0.5';
        updateBtn.style.cursor = 'not-allowed';
        checkForUpdates(true).finally(() => {
            localStorage.setItem('brd_last_update_check', Date.now().toString());
            updateBtnState();
            if (cooldownInterval) clearInterval(cooldownInterval);
            cooldownInterval = setInterval(updateBtnState, 1000);
        });
    };
    updateBtnContainer.appendChild(updateBtn);
    menu.appendChild(updateBtnContainer);

    document.body.appendChild(menu);
  }

  function showChangelogPopup() {
    // Basic guard so we don't spam if something calls this twice.
    if (document.getElementById('brd-changelog')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'brd-changelog-backdrop';
    backdrop.style.position = 'fixed';
    backdrop.style.inset = '0';
    backdrop.style.background = 'rgba(0,0,0,0.6)';
    backdrop.style.zIndex = '10000';
    backdrop.style.backdropFilter = 'blur(4px)';

    const modal = document.createElement('div');
    modal.id = 'brd-changelog';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'rgba(18,18,18,0.9)';
    modal.style.backdropFilter = 'blur(25px)';
    modal.style.padding = '20px 22px';
    modal.style.borderRadius = '18px';
    modal.style.boxShadow = '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)';
    modal.style.color = 'var(--spice-text)';
    modal.style.width = 'min(90vw, 420px)';
    modal.style.fontSize = '0.9rem';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '10px';
    modal.style.zIndex = '10001';

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <span style="font-weight:800;letter-spacing:-0.01em;">Release Date updated</span>
          <span style="opacity:0.7;font-size:0.8rem;">Now Playing Release Date v${BRD_VERSION}</span>
        </div>
        <button id="brd-changelog-close" style="background:rgba(255,255,255,0.05);border:none;color:var(--spice-text);border-radius:999px;cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;">✕</button>
      </div>
      <ul id="brd-changelog-list" style="margin:4px 0 0 16px;padding:0;list-style:disc;"></ul>
      <button id="brd-changelog-ok" style="margin-top:10px;align-self:flex-end;background:#1ed760;border:none;border-radius:999px;padding:6px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;color:#000;">
        Okay
      </button>
    `;

    const listEl = modal.querySelector('#brd-changelog-list');
    const firstLines = BRD_CHANGELOG_LINES.slice(0, 3);
    firstLines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line;
      listEl.appendChild(li);
    });

    const close = () => {
      backdrop.remove();
      modal.remove();
    };

    modal.querySelector('#brd-changelog-close').onclick = close;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) close();
    };
    modal.querySelector('#brd-changelog-ok').onclick = (e) => {
      e.stopPropagation();
      close();
    };

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
  }

  function createToggle(key, text) {
    const div = document.createElement('div');
    div.className = 'Dropdown-container';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = text;
    
    const switchLabel = document.createElement('label');
    switchLabel.className = 'brd-switch';
    
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = localStorage.getItem(key) === 'true';
    inp.onchange = (e) => {
      localStorage.setItem(key, e.target.checked ? 'true' : 'false');
      displayReleaseDate();
    };
    
    const slider = document.createElement('span');
    slider.className = 'brd-slider';
    
    switchLabel.appendChild(inp);
    switchLabel.appendChild(slider);
    
    div.appendChild(labelEl);
    div.appendChild(switchLabel);
    return div;
  }

  function createCustomDropdown(id, label, options, onChange = null) {
    const div = document.createElement('div');
    div.className = 'Dropdown-container';

    const stored = localStorage.getItem(id) ?? options[0]?.value;
    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'brd-select';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'brd-select-label';
    valueSpan.textContent = options.find(o => o.value === stored)?.text ?? options[0]?.text ?? '';

    const chevron = document.createElement('div');
    chevron.className = 'brd-chevron';
    chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    chevron.style.display = 'flex';
    chevron.style.alignItems = 'center';
    chevron.style.transition = 'transform 0.2s';
    
    button.appendChild(valueSpan);
    button.appendChild(chevron);

    const list = document.createElement('div');
    list.className = 'brd-options';
    list.style.display = 'none';

    const closeAll = () => {
      button.classList.remove('brd-open');
      list.style.display = 'none';
      chevron.style.transform = 'rotate(0deg)';
      document.removeEventListener('click', onDocClick);
    };

    const onDocClick = (e) => {
      if (!wrapper.contains(e.target)) closeAll();
    };

    options.forEach(o => {
      const opt = document.createElement('div');
      opt.className = 'brd-option' + (o.value === stored ? ' brd-selected' : '');
      opt.textContent = o.text;
      opt.onclick = () => {
        localStorage.setItem(id, o.value);
        valueSpan.textContent = o.text;
        list.querySelectorAll('.brd-option').forEach(el => el.classList.remove('brd-selected'));
        opt.classList.add('brd-selected');
        closeAll();
        if (onChange) onChange(o.value);
        else displayReleaseDate();
      };
      list.appendChild(opt);
    });

    button.onclick = () => {
      const open = list.style.display === 'block';
      if (open) {
        closeAll();
      } else {
        document.querySelectorAll('.brd-options').forEach(el => {
          if (el !== list) {
            el.style.display = 'none';
            el.previousElementSibling.classList.remove('brd-open');
            const otherChevron = el.previousElementSibling.querySelector('.brd-chevron');
            if (otherChevron) otherChevron.style.transform = 'rotate(0deg)';
          }
        });
        button.classList.add('brd-open');
        list.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
        setTimeout(() => document.addEventListener('click', onDocClick), 10);
      }
    };

    wrapper.appendChild(button);
    wrapper.appendChild(list);

    div.appendChild(labelEl);
    div.appendChild(wrapper);
    return div;
  }

  function buildReleaseDateElement({ releaseDate, album, popularity, audioFeatures, explicit, label, trackId }) {
      const lsSeparator = localStorage.getItem('separator');
      const lsDateFormat = localStorage.getItem('dateFormat');

      const root = document.createElement('span');
      root.className = 'brd-pill-content';

      // Render our own separator (bigger dot / dash) unless "None"
      if (lsSeparator && lsSeparator !== '\u200E') {
        const sep = document.createElement('span');
        sep.className = 'brd-sep';
        sep.textContent = lsSeparator === '•' ? '•' : lsSeparator;
        root.appendChild(sep);
      }

      const dateA = document.createElement('a');
      dateA.textContent = formatDate(releaseDate, lsDateFormat);
      dateA.onclick = (e) => {
          e.preventDefault();
          let menu = document.getElementById('settingsMenu');
          if (!menu) {
              createSettingsMenu();
              menu = document.getElementById('settingsMenu');
          }
          toggleSettingsMenu(menu);
      };
      
      if (localStorage.getItem('highlightAnniversary') === 'true' && isAnniversary(releaseDate)) {
        dateA.classList.add('brd-anniv');
      }
      root.appendChild(dateA);

      if (localStorage.getItem('showPopularity') === 'true' && popularity != null) {
        const pop = document.createElement('span');
        pop.className = 'brd-popularity';
        pop.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c-2.276 0-3-2-3-2s-1 1.5-1 3.5a3.5 3.5 0 0 0 1.5 1"></path><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg><span>${popularity}</span>`;
        root.appendChild(pop);
      }

      if (localStorage.getItem('showAge') === 'true' && releaseDate) {
        const age = document.createElement('span'); 
        age.className = 'brd-age';
        age.textContent = `(${computeAgeString(releaseDate)})`;
        root.appendChild(age);
      }

      if (localStorage.getItem('showAlbumBadge') === 'true') {
        const badge = document.createElement('span'); 
        badge.className = 'brd-badge';
        badge.textContent = album.album_type;
        root.appendChild(badge);
      }
      
      if (localStorage.getItem('showExplicitBadge') === 'true' && explicit) {
        const expl = document.createElement('span');
        expl.className = 'brd-explicit';
        expl.textContent = 'E';
        expl.title = 'Explicit';
        root.appendChild(expl);
      }

      if (localStorage.getItem('showAudioFeatures') === 'true' && audioFeatures) {
        const af = document.createElement('span');
        af.className = 'brd-audio-features';
        const keys = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
        const keyStr = keys[audioFeatures.key] || '?';
        const modeStr = audioFeatures.mode === 1 ? 'Maj' : 'Min';
        af.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg><span>${audioFeatures.tempo} BPM • ${keyStr} ${modeStr}</span>`;
        root.appendChild(af);
      }

      if (localStorage.getItem('showLabel') === 'true' && label) {
        const lbl = document.createElement('span');
        lbl.className = 'brd-label';
        lbl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`;
        const txt = document.createElement('span');
        txt.textContent = label;
        lbl.appendChild(txt);
        root.appendChild(lbl);
      }

      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'brd-refresh';
      refreshBtn.title = 'Fix Date or Position';
      refreshBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.3 0 6 2.7 6 6 0 1-.3 2-.7 2.8l1.5 1.5c.7-1.3 1.2-2.8 1.2-4.3 0-5-4-9-9-9zM6 12c0-1 .3-2 .7-2.8L5.2 7.7C4.5 9 4 10.5 4 12c0 5 4 9 9 9v-3l4 4-4 4v-3c-3.3 0-6-2.7-6-6z"/></svg>`;
      
      refreshBtn.onclick = (e) => {
          e.stopPropagation();
          if (trackId) {
              trackCache.delete(trackId);
              try { localStorage.setItem('brd_track_cache_v2', JSON.stringify(Array.from(trackCache.entries()))); } catch (err) {}
          }
          displayReleaseDate();
          Spicetify.showNotification("Refreshing Track Metadata...");
      };
      root.appendChild(refreshBtn);



      return root;
  }

  function applyCSSVariables() {
      document.body.style.setProperty('--brd-font-size', localStorage.getItem('fontSize') || '0.75rem');
      document.body.style.setProperty('--brd-font-weight', localStorage.getItem('fontWeight') || '400');
      document.body.style.setProperty('--brd-text-color', localStorage.getItem('textColor') || 'inherit');
  }

  async function updateLivePreview() {
      const container = window.BRD_STATE?.previewContainer;
      if (!container) return;
      
      const reqId = ++currentPreviewRequestId;
      
      let trackData = null;
      if (Spicetify?.Player?.data?.item?.uri?.includes(':track:')) {
          trackData = await getTrackDetailsRD();
      } else {
          trackData = {
              releaseDate: new Date(2023, 0, 1),
              album: { album_type: 'album' },
              popularity: 85,
              audioFeatures: { tempo: 120, key: 0, mode: 1 },
              explicit: true,
              label: 'Mock Label',
              trackId: null
          };
      }
      
      if (reqId !== currentPreviewRequestId) return;
      if (!window.BRD_STATE?.previewContainer) return;
      
      const el = buildReleaseDateElement(trackData);
      el.id = 'releaseDate';
      
      const lsPosition = localStorage.getItem('position');
      if (lsPosition === 'top-header-pill') {
          el.classList.add('brd-pill');
          el.style.position = 'relative'; // Override fixed position so it stays in preview box
          el.style.inset = 'auto';
          // Keep the pill's background, border, and shadow intact
      } else {
          el.style.position = 'relative';
          el.style.inset = 'auto';
          el.style.background = 'transparent';
          el.style.border = 'none';
          el.style.boxShadow = 'none';
      }
      el.style.pointerEvents = 'none'; 
      container.innerHTML = '';
      container.appendChild(el);
  }

  async function displayReleaseDate() {
    log('displayReleaseDate() triggered');
    applyCSSVariables();
    updateLivePreview();
    const reqId = ++currentDisplayRequestId;
    try {
      const { releaseDate, album, popularity, audioFeatures, explicit, label } = await getTrackDetailsRD();
      if (reqId !== currentDisplayRequestId) return;
      log('displayReleaseDate(): Got track details', { releaseDate, popularity, explicit });
      const lsPosition = localStorage.getItem('position');
      
      const trackUri = Spicetify.Player.data?.item?.uri;
      const trackId = trackUri?.includes(':track:') ? trackUri.split(':')[2] : null;

      document.querySelectorAll('#releaseDate').forEach(el => {
          if (!el.closest('.brd-preview-container')) el.remove();
      });

      const root = buildReleaseDateElement({ releaseDate, album, popularity, audioFeatures, explicit, label, trackId });
      root.id = 'releaseDate';

      let target;
      if (lsPosition === 'top-header-pill') {
          target = document.body;
          root.classList.add('brd-pill');
      } else {
          target = document.querySelector(lsPosition);
      }
      
      if (!target) {
          Spicetify.showNotification("BRD Error: Could not find target container!");
      }

      if (target) {
          target.appendChild(root);
      }


      if (localStorage.getItem('hideVideoBtn') === 'true') {
          document.body.classList.add('brd-hide-video');
      } else {
          document.body.classList.remove('brd-hide-video');
      }
    } catch (e) { 
        Spicetify.showNotification("BRD Crash: " + e.message);
        error(e); 
    }
  }

  function formatDate(d, f) {
    if (!d || isNaN(d.getTime())) return 'Unknown Date';
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
    if (f === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;
    if (f === 'MM-DD-YYYY') return `${mm}-${dd}-${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }

  function computeAgeString(d) {
    if (!d) return '';
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) m--;
    if (m < 0) { y--; m += 12; }
    return y > 0 ? `${y}y${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  }

  function isAnniversary(d) {
    if (!d) return false;
    const now = new Date();
    return now.getMonth() === d.getMonth() && now.getDate() === d.getDate();
  }

  function toggleSettingsMenu(settingsMenu) {
    let backdrop = document.getElementById('brd-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div'); 
      backdrop.id = 'brd-backdrop';
      document.body.appendChild(backdrop);
    }
    
    const isHidden = settingsMenu.style.display === 'none' || settingsMenu.style.display === '';
    
    const close = () => {
        settingsMenu.classList.remove('brd-m3-animate');
        backdrop.classList.remove('brd-m3-animate');
        setTimeout(() => {
          settingsMenu.style.display = 'none';
          backdrop.style.display = 'none';
          backdrop.onclick = null;
        }, 250);
    };
    
    backdrop.onclick = close;
    const closeBtn = settingsMenu.querySelector('.brd-close');
    if (closeBtn) closeBtn.onclick = close;

    if (isHidden) {
      backdrop.style.display = 'block';
      settingsMenu.style.display = 'flex';
      // Force reflow for animation
      void settingsMenu.offsetWidth;
      backdrop.classList.add('brd-m3-animate');
      settingsMenu.classList.add('brd-m3-animate');
    } else {
      close();
    }
  }

  async function checkForUpdates(manual = false) {
    try {
      log('checkForUpdates(): fetching version.json from GitHub API');
      // Use raw.githubusercontent to completely bypass the 60 req/hr API limit!
      const REMOTE_VERSION = `https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/beautiful-release-date/version.json?t=${Math.random()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(REMOTE_VERSION, { 
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const latestVersion = json.version;

        if (json.changelogs && json.changelogs[BRD_VERSION]) {
          BRD_CHANGELOG_LINES = json.changelogs[BRD_VERSION];
        } else if (json.changelog && latestVersion === BRD_VERSION) {
          BRD_CHANGELOG_LINES = json.changelog;
        }

        if (latestVersion !== BRD_VERSION && BRD_VERSION !== 'Loading...') {
          log('New version found:', latestVersion);
          if (manual) {
            const btn = document.getElementById('brd-update-btn');
            if (btn) btn.textContent = 'Updating...';
            await applyOTAUpdate(latestVersion);
          } else {
            Spicetify.showNotification(`New version ${latestVersion} is available! Run 'spicetify apply' to update.`);
          }
        } else {
          log('Already on latest version.');
          if (manual) Spicetify.showNotification(`No new update (v${latestVersion}). If you just pushed code, GitHub cache takes ~5 mins to refresh!`);
        }
      } else {
        throw new Error('Non-200 OK response');
      }
    } catch (e) {
      log('Failed to check for updates', e);
      if (manual) {
        if (e.name === 'AbortError') {
            Spicetify.showNotification('Failed to check for updates (Connection Timeout).');
        } else {
            Spicetify.showNotification('Failed to check for updates (Network Error).');
        }
      }
    }
  }

  async function applyOTAUpdate(latestVersion) {
    try {
      Spicetify.showNotification('Downloading update...');
      const CODE_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/beautiful-release-date/extension-core.js";
      const res = await fetch(`${CODE_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch code');
      const code = await res.text();
      const blob = new Blob([code], { type: 'application/javascript' });
      const localUrl = URL.createObjectURL(blob);
      await import(localUrl);
      URL.revokeObjectURL(localUrl);
      Spicetify.showNotification(`Successfully updated to v${latestVersion}!`);
    } catch (e) {
      log('OTA Update failed', e);
      Spicetify.showNotification('Update failed. See console.');
    }
  }

  async function initializeRD() {
    await waitForSpicetify();
    try {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/beautiful-release-date/version.json?t=${Math.random()}`);
        if (res.ok) {
          const json = await res.json();
          BRD_VERSION = json.version;
          BRD_CHANGELOG_LINES = json.changelogs?.[BRD_VERSION] || json.changelog || [];
          localStorage.setItem('brd_last_version', BRD_VERSION);
          localStorage.setItem('brd_last_changelog', JSON.stringify(BRD_CHANGELOG_LINES));
        }
      } catch(e) {
        BRD_VERSION = localStorage.getItem('brd_last_version') || 'Unknown';
        try { BRD_CHANGELOG_LINES = JSON.parse(localStorage.getItem('brd_last_changelog') || '[]'); } catch(err) {}
      }
      Spicetify.showNotification(`BRD Booting: v${BRD_VERSION}`);
    // Hot-reload cleanup
    if (window.BRD_STATE) {
      if (window.BRD_STATE.songchange) Spicetify.Player.removeEventListener('songchange', window.BRD_STATE.songchange);
      if (window.BRD_STATE.interval) clearInterval(window.BRD_STATE.interval);
      if (window.BRD_STATE.observer) window.BRD_STATE.observer.disconnect();
      if (window.BRD_STATE.testPluginHandler) window.removeEventListener('testPluginToggle', window.BRD_STATE.testPluginHandler);
      if (document.getElementById('brd-style')) document.getElementById('brd-style').remove();
      if (document.getElementById('brd-backdrop')) document.getElementById('brd-backdrop').remove();
      if (document.getElementById('settingsMenu')) document.getElementById('settingsMenu').remove();
      if (document.getElementById('brd-changelog')) document.getElementById('brd-changelog').remove();
      if (document.getElementById('brd-changelog-backdrop')) document.getElementById('brd-changelog-backdrop').remove();
    }
    window.BRD_STATE = {};

    // Kill any rogue legacy observers
    try {
        if (document.body._brd_observer) {
            document.body._brd_observer.disconnect();
            delete document.body._brd_observer;
        }
        const titleEl = document.querySelector('.main-trackInfo-name');
        if (titleEl && titleEl._brd_observer) {
            titleEl._brd_observer.disconnect();
            delete titleEl._brd_observer;
        }
        const artistEl = document.querySelector('.main-trackInfo-artists');
        if (artistEl && artistEl._brd_observer) {
            artistEl._brd_observer.disconnect();
            delete artistEl._brd_observer;
        }
    } catch(e) {}

    const css = releaseDateCSS();
    if (css) {
      css.id = 'brd-style';
      document.head.appendChild(css);
    }
    createSettingsMenu();

    // Check for future updates on startup, then poll every hour
    const updateCheckPromise = checkForUpdates();
    window.BRD_STATE.interval = setInterval(checkForUpdates, 1000 * 60 * 60); 

    // --- NEW: Startup Version Check ---
    const seenVersion = localStorage.getItem('brd_version');
    const currentVerStr = String(BRD_VERSION);
    const sessionShown = sessionStorage.getItem('brd_popup_shown_' + currentVerStr);
    
    if (!sessionShown && seenVersion !== currentVerStr && currentVerStr !== 'Loading...' && currentVerStr !== 'Unknown' && currentVerStr !== 'undefined') {
      try { localStorage.setItem('brd_version', currentVerStr); } catch(e){}
      sessionStorage.setItem('brd_popup_shown_' + currentVerStr, 'true');
      // Delay popup slightly to ensure Spotify UI is fully ready AND wait for network
      Promise.all([
        updateCheckPromise.catch(() => {}),
        new Promise(r => setTimeout(r, 2500))
      ]).finally(() => {
        if (typeof showChangelogPopup === 'function') showChangelogPopup();
      });
    } else {
      updateCheckPromise.catch(() => {});
    }

    window.BRD_STATE.songchange = displayReleaseDate;
    Spicetify.Player.addEventListener('songchange', displayReleaseDate);
    
    displayReleaseDate();

    
    // Dynamic reactivity for test plugin toggle overriding
    window.BRD_STATE.testPluginHandler = (e) => {
      displayReleaseDate();
    };
    window.addEventListener('testPluginToggle', window.BRD_STATE.testPluginHandler);
    

    } catch (err) {
      Spicetify.showNotification("BRD Boot Crash: " + err.message);
      error("Boot crash", err);
    }
  }

  initializeRD();
})();

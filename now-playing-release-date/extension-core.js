/* MGN Release Date - Core (Pro Version) */
(() => {
  const log = (...args) => console.log('[Release Date]', ...args);
  const error = (...args) => console.error('[Release Date]', ...args);

  let currentTrackUri = null;
  const albumCache = new Map();

  async function getTrackDetailsRD() {
    const playerData = Spicetify.Player.data;
    if (!playerData?.item?.uri) return null;
    const albumUri = playerData.item.album?.uri;
    const albumId = albumUri.split(':')[2];

    if (albumCache.has(albumId)) return albumCache.get(albumId);

    try {
      // The reliable 2026 internal Spotify metadata path
      const albumDetails = await Spicetify.CosmosAsync.get(`hm://album/v1/album-app/album/${albumId}/desktop`);
      
      const data = {
        name: albumDetails.name,
        artist: albumDetails.artists?.[0]?.name || 'Unknown',
        type: albumDetails.type || 'Album',
        image: albumDetails.cover_group?.image?.[0]?.file_id 
               ? `https://i.scdn.co/image/${albumDetails.cover_group.image[0].file_id}` 
               : playerData.item.album.images[0].url,
        // Handling YYYY-MM-DD format
        date: albumDetails.year ? new Date(albumDetails.year, (albumDetails.month || 1) - 1, albumDetails.day || 1) : new Date(2000, 0, 1)
      };

      albumCache.set(albumId, data);
      return data;
    } catch (e) {
      return { name: 'Unknown', artist: 'Unknown', type: 'Album', image: '', date: new Date() };
    }
  }

  function releaseDateCSS() {
    if (document.getElementById('nprd-style')) return;
    const style = document.createElement('style');
    style.id = 'nprd-style';
    style.innerHTML = `
      #settingsMenu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        background: rgba(18, 18, 18, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
        padding: 24px; border-radius: 20px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); flex-direction: column; width: 400px; z-index: 10001; 
      }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; backdrop-filter: blur(4px); }
      #nprd-album-info { display: flex; align-items: center; margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 12px; }
      #nprd-album-info img { width: 64px; height: 64px; border-radius: 8px; margin-right: 16px; box-shadow: 0 8px 16px rgba(0,0,0,0.4); }
      .nprd-badge { background: var(--spice-button); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-left: 8px; }
    `;
    document.head.appendChild(style);
  }

  async function render() {
    const data = await getTrackDetailsRD();
    if (!data) return;

    document.querySelectorAll('#releaseDate').forEach(e => e.remove());
    const target = document.querySelector(".main-nowPlayingWidget-nowPlaying:not(#upcomingSongDiv) .main-trackInfo-name");
    if (!target) return;

    const root = document.createElement('span');
    root.id = 'releaseDate';
    root.style.fontSize = '0.8rem';
    root.style.color = 'var(--spice-subtext)';
    root.innerHTML = ` • <a style="cursor:pointer">${data.date.toLocaleDateString()}</a><span class="nprd-badge">${data.type}</span>`;
    
    root.querySelector('a').onclick = openMenu;
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
        <div style="font-weight:900; color:white">${data.name}</div>
        <div style="opacity:0.6; font-size:0.8rem">${data.artist}</div>
      </div>
    `;

    menu.style.display = 'flex';
    back.style.display = 'block';
  }

  // --- Start ---
  releaseDateCSS();
  if (!document.getElementById('settingsMenu')) {
    const menu = document.createElement('div');
    menu.id = 'settingsMenu';
    menu.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center">
        <h2 style="margin:0; font-weight:900">Settings</h2>
        <button onclick="this.parentElement.parentElement.style.display='none'; document.getElementById('nprd-backdrop').style.display='none'" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer">×</button>
      </div>
      <div id="nprd-album-info"></div>
    `;
    document.body.appendChild(menu);
  }

  Spicetify.Player.addEventListener('songchange', () => { render(); });
  render();
  log('Professional Edition Loaded.');
})();
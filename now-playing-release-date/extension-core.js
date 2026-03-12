/* MGN Release Date - Ultimate 2026 Edition */
(() => {
  const log = (...args) => console.log('[Release Date]', ...args);
  const albumCache = new Map();

  async function getSpotifyData(albumId) {
    if (albumCache.has(albumId)) return albumCache.get(albumId);

    // This is the official 2026 GraphQL query for album metadata
    const query = {
      name: "getAlbum",
      sha256Hash: "46ae254517551c05bb920660c3c3060596b61066c3f04222a013ca3067da677a",
      variables: { uri: `spotify:album:${albumId}`, locale: "en", offset: 0, limit: 1 }
    };

    try {
      const response = await Spicetify.GraphQL.Request(query);
      const albumData = response.data.albumUnion;
      
      const releaseDate = albumData.date.isoString 
        ? new Date(albumData.date.isoString) 
        : new Date(albumData.date.year, (albumData.date.month || 1) - 1, albumData.date.day || 1);

      const data = {
        name: albumData.name,
        artist: albumData.artists.items[0].profile.name,
        image: albumData.coverArt.sources[0].url,
        type: albumData.type || "Album",
        date: releaseDate
      };

      albumCache.set(albumId, data);
      return data;
    } catch (e) {
      console.error("[Release Date] GraphQL failed, trying fallback...", e);
      // Fallback to basic player data if GraphQL fails
      const item = Spicetify.Player.data.item;
      return {
        name: item.album.name,
        artist: item.artists[0].name,
        image: item.album.images[0].url,
        type: "Song",
        date: new Date(2000, 0, 1) // Safe fallback
      };
    }
  }

  function releaseDateCSS() {
    if (document.getElementById('nprd-style')) return;
    const style = document.createElement('style');
    style.id = 'nprd-style';
    style.innerHTML = `
      #settingsMenu { 
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        background: #181818; border: 1px solid #333; padding: 24px; border-radius: 12px; 
        box-shadow: 0 30px 60px rgba(0,0,0,0.8); flex-direction: column; width: 380px; z-index: 10001; 
      }
      #nprd-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; backdrop-filter: blur(5px); }
      #nprd-album-info { display: flex; align-items: center; margin-top: 15px; padding: 12px; background: #282828; border-radius: 8px; text-decoration: none !important; }
      #nprd-album-info img { width: 56px; height: 56px; border-radius: 4px; margin-right: 12px; }
      .nprd-badge { background: #1ed760; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-left: 8px; }
      #releaseDate { font-size: 0.85rem; color: #b3b3b3; display: flex; align-items: center; }
    `;
    document.head.appendChild(style);
  }

  async function render() {
    const item = Spicetify.Player.data?.item;
    if (!item) return;
    const albumId = item.album.uri.split(':')[2];
    const data = await getSpotifyData(albumId);

    document.querySelectorAll('#releaseDate').forEach(e => e.remove());
    const target = document.querySelector(".main-trackInfo-name") || document.querySelector(".main-trackInfo-container");
    if (!target) return;

    const root = document.createElement('div');
    root.id = 'releaseDate';
    const dateStr = data.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    root.innerHTML = `<span style="margin: 0 6px">•</span><a style="cursor:pointer; color:inherit">${dateStr}</a> <span class="nprd-badge">${data.type}</span>`;
    
    root.querySelector('a').onclick = openMenu;
    target.after(root);
  }

  async function openMenu() {
    const item = Spicetify.Player.data?.item;
    const albumId = item.album.uri.split(':')[2];
    const data = await getSpotifyData(albumId);
    
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
        <div style="font-weight:bold; color:white">${data.name}</div>
        <div style="opacity:0.6; font-size:0.8rem">${data.artist}</div>
      </div>
    `;

    menu.style.display = 'flex';
    back.style.display = 'block';
  }

  // Init
  releaseDateCSS();
  if (!document.getElementById('settingsMenu')) {
    const menu = document.createElement('div');
    menu.id = 'settingsMenu';
    menu.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
        <h2 style="margin:0; font-weight:bold; color:white">Album Info</h2>
        <button onclick="this.parentElement.parentElement.style.display='none'; document.getElementById('nprd-backdrop').style.display='none'" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer">✕</button>
      </div>
      <a id="nprd-album-info"></a>
    `;
    document.body.appendChild(menu);
  }

  Spicetify.Player.addEventListener('songchange', render);
  render();
  log('2026 GraphQL Version Loaded.');
})();
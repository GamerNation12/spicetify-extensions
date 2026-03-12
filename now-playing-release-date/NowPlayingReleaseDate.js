// MGN Auto-Updating Loader
(async function loadExtension() {
  // This points to your NEW cloud file
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/now-playing-release-date/extension-core.js";
  
  try {
    // Fetches the latest code and bypasses the cache
    const response = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`GitHub returned status: ${response.status}`);
    const code = await response.text();

    // Injects the code into Spotify
    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.log('[MGN Loader] Successfully fetched the newest Release Date extension!');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load:', error);
    if (typeof Spicetify !== 'undefined' && Spicetify.PopupModal) {
      Spicetify.PopupModal.display({
        title: "Extension Load Error",
        content: `<p style="color: var(--spice-text);">Failed to download the latest Release Date update from GitHub.</p>`,
      });
    }
  }
})();
// MGN Auto-Updating Loader - V3 (CORS Friendly)
(async function loadExtension() {
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/now-playing-release-date/extension-core.js";
  
  try {
    // We only use the random version query to bust the cache.
    // Removing 'headers' and 'cache' init options fixes the CORS Preflight error.
    const response = await fetch(`${GITHUB_RAW_URL}?v=${Math.random()}`);
    
    if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.log('[MGN Loader] Success: Core Extension synced from GitHub.');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load:', error);
  }
})();
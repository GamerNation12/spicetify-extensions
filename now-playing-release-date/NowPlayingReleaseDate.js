// MGN Auto-Updating Loader - V3 (CORS Fix)
(async function loadExtension() {
  // Direct path to your core extension file
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/now-playing-release-date/extension-core.js";
  
  try {
    // We only use the random query parameter to force a fresh download.
    // Removing the second argument (cache/headers) fixes the CORS preflight error.
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
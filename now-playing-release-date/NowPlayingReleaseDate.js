// MGN Auto-Updating Loader - V2 (Cache Killer)
(async function loadExtension() {
  // We use the 'refs/heads/main' path to be as direct as possible
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/now-playing-release-date/extension-core.js";
  
  try {
    // We add a random number AND the 'no-cache' header to force a fresh download
    const response = await fetch(`${GITHUB_RAW_URL}?v=${Math.random()}`, { 
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.log('[MGN Loader] Success: Forced fresh download of Core Extension.');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load:', error);
  }
})();
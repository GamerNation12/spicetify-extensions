// MGN Auto-Updating Loader - V3 (CORS & Throttle Fix)
(async function loadExtension() {
  // Direct Raw GitHub link avoids jsDelivr throttling limits
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/now-playing-release-date/extension-core.js";
  
  try {
    // We removed 'cache' and 'headers' to fix the CORS preflight error.
    // The random number is still here to ensure you get your latest GitHub edits.
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
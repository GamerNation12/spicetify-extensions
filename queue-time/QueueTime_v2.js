// NAME: Queue Time
// AUTHOR: GamerNation12
// DESCRIPTION: Displays Queue Time
// MGN Auto-Updating Loader - Instant API OTA Version
(async function loadExtension() {
  // Use raw.githubusercontent to bypass the 60 req/hr API rate limit!
  const API_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/main/queue-time/extension-core.js";
  
  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`);
    
    if (!response.ok) throw new Error(`GitHub fetch error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.log('[MGN Loader] Success: Queue Time Extension synced instantly from GitHub API.');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load Queue Time:', error);
  }
})();

// MGN Auto-Updating Loader - V3 (CORS & Throttle Fix)
// NAME: Queue Time
// AUTHOR: GamerNation12
// DESCRIPTION: See how much time is left in your Spicetify queue.
(async function loadExtension() {
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/queue-time/extension-core.js";
  
  try {
    const response = await fetch(`${GITHUB_RAW_URL}?v=${Math.random()}`);
    
    if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.log('[MGN Loader] Success: Queue Time Core synced from GitHub.');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load Queue Time:', error);
  }
})();

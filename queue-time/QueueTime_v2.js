// NAME: Queue Time
// AUTHOR: GamerNation12
// DESCRIPTION: Displays Queue Time
// VERSION: 2.0.20
// MGN Auto-Updating Loader - Instant API OTA Version
(async function loadExtension() {
  // Using the API bypasses the 5-minute CDN cache, ensuring instant updates.
  // Note: Unauthenticated API requests are limited to 60 per hour per IP.
  const API_URL = "https://api.github.com/repos/GamerNation12/spicetify-extensions/contents/queue-time/extension-core.js";
  
  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`, {
      headers: {
        "Accept": "application/vnd.github.v3.raw"
      }
    });
    
    if (!response.ok) throw new Error(`GitHub fetch error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.info('🟢 [GN Loader] Successfully synced: Queue Time');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load Queue Time:', error);
  }
})();

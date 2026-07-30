// MGN Auto-Updating Loader - V3 (CORS & Throttle Fix)
// NAME: Hide Podcasts & Audiobooks
// AUTHOR: GamerNation12
// DESCRIPTION: Hides the 'Podcasts & Shows' and 'Audiobooks' buttons from Spicetify UI.
(async function loadExtension() {
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/hide-podcasts/extension-core.js";
  
  try {
    const response = await fetch(`${GITHUB_RAW_URL}?v=${Math.random()}`);
    
    if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.info('🟢 [GN Loader] Successfully synced: Hide Podcasts & Audiobooks');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load Hide Podcasts & Audiobooks:', error);
  }
})();

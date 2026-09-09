// MGN Auto-Updating Loader - V3 (CORS & Throttle Fix)
// NAME: LiteDeck
// AUTHOR: GamerNation12
// DESCRIPTION: Ultra-lightweight fast controls + queue + search panel with one-click Lite Mode for laggy setups.
(async function loadExtension() {
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/lite-deck/extension-core.js";

  try {
    const response = await fetch(`${GITHUB_RAW_URL}?v=${Math.random()}`);

    if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);

    URL.revokeObjectURL(localUrl);
    console.info('🟢 [GN Loader] Successfully synced: LiteDeck');

  } catch (error) {
    console.error('[MGN Loader] Failed to load LiteDeck:', error);
  }
})();

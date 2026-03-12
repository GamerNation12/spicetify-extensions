// MGN Auto-Updating Loader
(async function loadExtension() {
  // This points directly to the cloud link you just pasted!
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/GamerNation12/spicetify-extensions/refs/heads/main/now-playing-release-date/extension-core.js";
  
  try {
    const response = await fetch(`${GITHUB_RAW_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`GitHub returned status: ${response.status}`);
    const code = await response.text();

    const blob = new Blob([code], { type: 'application/javascript' });
    const localUrl = URL.createObjectURL(blob);
    await import(localUrl);
    
    URL.revokeObjectURL(localUrl);
    console.log('[MGN Loader] Successfully fetched the newest Release Date extension!');
    
  } catch (error) {
    console.error('[MGN Loader] Failed to load:', error);
  }
})();
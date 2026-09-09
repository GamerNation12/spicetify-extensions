# LiteDeck — fast panel for laggy setups

Ultra-lightweight Spicetify extension. No blur, no animations, no canvas.
Adds a floating `⚡ Lite` button with fast controls + queue + search, plus a
one-click **Lite Mode** that kills `backdrop-filter` / animations / video-canvas
from heavy themes and extensions without uninstalling them.

## Install (Marketplace / manual)

Manual test:
1. Copy `LiteDeck.js` to your Spicetify Extensions folder
2. Run `spicetify config extensions LiteDeck.js` then `spicetify apply`
3. Restart Spotify → click `⚡ Lite` bottom-right.

## Files

- `LiteDeck.js` — MGN auto-updating loader (OTA from GitHub raw)
- `extension-core.js` — actual panel, vanilla DOM, 1s tick only
- `version.json` — version source of truth for dashboard + update checks

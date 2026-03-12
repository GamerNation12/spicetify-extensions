# Release Date For Currently Playing Song

![Preview image](https://raw.githubusercontent.com/Plueres/spicetify-extensions/main/now-playing-release-date/preview.jpg)

A high-performance, resilient Spicetify extension that displays exactly when your music was released. This version is optimized with caching and request coalescing to ensure a smooth, lag-free experience.

### ✨ Features
* **Smart UI Attachment:** Uses a `MutationObserver` to ensure the date stays visible even when Spotify updates the UI.
* **Age Tracker:** Displays the time since release (e.g., `1y 6m`) alongside the date.
* **Anniversary Highlights:** Celebrates an album's release anniversary with a pulse animation and notification.
* **Performance Focused:** Built with request batching to prevent duplicates and minimize API calls.

It creates a new element in the now playing bar like this:

![Smaller preview image](https://raw.githubusercontent.com/Plueres/spicetify-extensions/main/now-playing-release-date/preview-small.jpg)

This object is **clickable**. Once clicked, it brings up a settings menu where you can configure the placement, date format, and visual toggles.

![Settings menu image](https://raw.githubusercontent.com/Plueres/spicetify-extensions/main/now-playing-release-date/settingsMenu.jpg)

### ⚙️ Configuration Options

| Option | Description |
| :--- | :--- |
| **Position** | Choose between displaying after the **Artist** name or the **Song name**. |
| **Date Format** | Support for `DD-MM-YYYY`, `MM-DD-YYYY`, and `YYYY-MM-DD`. |
| **Separator** | Choose between a **Dot (•)**, a **Dash (-)**, or **None**. |
| **Visual Toggles** | Enable/Disable Calendar Icons, Age strings, Album Type badges, and Anniversary pulses. |

The bottom of the settings menu includes a direct link to the album/single/EP of the currently playing track, complete with a small cover art thumbnail.

---

### 🛠️ Installation

1. Download the `release-date-currently-playing.js` file.
2. Place it in your Spicetify **Extensions** folder.
3. Run the following commands in your terminal:

```bash
spicetify config extensions release-date-currently-playing.js
spicetify apply
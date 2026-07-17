# Spicetify Diagnostics & Accent Customizer (Test Plugin)

An isolated, lightweight diagnostics test plugin for Spicetify. It acts as an API sandbox and diagnostics utility, allowing you to easily test Spotify client integrations, CSS accents, and player lifecycle states.

### ✨ Features
* **Native Spotify Settings Integration:** Adds an `"Enable Diagnostics Plugin"` option in Spotify's top-right Profile Dropdown menu. Toggling it immediately mounts/unmounts all plugin features without requiring a player reload.
* **Diagnostics Control Panel:** A floating circular button (`⚡`) opens an overlay packed with:
  * **🎵 Active Track telemetry:** Track name, artists list, and album names.
  * **📊 Spicetify Namespace Validation:** Diagnostics showing active availability checkmarks for core API handlers (`Spicetify.Player`, `Spicetify.Platform`, etc.).
  * **⚡ Event Testing Hooks:** Direct quick-triggers to skip songs, play/pause, fire native alerts, and dump complex metadata directly into Spotify's web console.
* **🌈 Rainbow RGB Aura:** A toggle that adds a gorgeous animated rainbow underglow strip directly above Spotify's Now Playing player bar frame.

---

### ⚙️ Installation & Usage

1. Copy the `TestPlugin.js` file to your Spicetify **Extensions** directory.
2. In your terminal, run the following to add it to your configuration and apply:
   ```bash
   spicetify config extensions TestPlugin.js
   spicetify apply
   ```
3. To configure the plugin, click on your **User Profile Dropdown** in the top-right corner of Spotify:
   * Select **`Enable Diagnostics Plugin`** to toggle the test features on/off dynamically.

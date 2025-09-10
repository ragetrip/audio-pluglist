# Audio PlugList - How To

This guide walks you through setup, use, hotkeys, and common fixes for **Audio PlugList**.
It's very easy without the guild but full details are below if needed.

---

## Quick Start

1. In Obsidian, go to **Settings → Community plugins → Audio PlugList → Enable**.
  - **Alternative Method** - If installing via **BRAT**: Select **Add beta plugin**, then enter the repo address: https://github.com/ragetrip/audio-pluglist and select the latest release.
  - **Alternative Method** - If manual install. Simply download the latest release (main.js, manifest.json, and styles.css) and unzip into your vault at **.obsidian/plugins/audio-pluglist**
2. Open the plugin’s **Tab view** (the sidebar view), or use the **footer mini-player**.
3. Create at least one playlist:
   - **Folder playlist (📂)**: points to a local folder of audio files in your vault.
   - **Link playlist (🔗)**: paste a playlist URL (YouTube, SoundCloud, Spotify, etc.).

> Tip: In dropdowns, folder playlists are prefixed **📂**, link playlists are **🔗** (only in dropdowns; names in Settings remain clean).

---

## Creating Playlists

### 📂 Folder-based
- In **Settings → Audio PlugList**, click **Add Playlist From Folder**.
- Choose a folder in your vault containing audio files.
- Name the playlist.

**Behavior**
- Full control via the plugin’s `<audio>` element.
- Supports autoplay, hotkeys, and seek/skip (depending on your UI config).

### 🔗 Link-based
- In **Settings → Audio PlugList**, click **Add Playlist From Link**.
- Paste a share link to a playlist (YouTube, SoundCloud, Spotify, etc.).
- Name the playlist.

**Behavior**
- Renders an **embedded player** in the Tab view (iframe).
- Controls are provided by the service; browser policies may block autoplay.
- Optional **Open In Browser** launches the playlist in your default browser/app.

> Note: Some providers (e.g., Spotify without Premium SDK) only allow ~30s previews in embeds. “Open in Browser” is the recommended experience.

---

## Using the Footer Mini-Player

- Choose a playlist from the **footer dropdown** (📂/🔗 prefixes show type).
- Use the **Shuffle** and **Repeat** pills as desired.
- Footer controls fully manage **📂 folder** playlists.
- For **🔗 link** playlists, use the **Tab view** embed controls or **Open In Browser**.

---

## Using the Tab View

- Open Audio PlugList via Ribbon Icon (🎵) or via Commands.
- Select a playlist from the dropdown (📂/🔗 prefixes).
- For link based playlists, the embed renders in an **embed box**.

---

## Re-scan Options

- **Re-scan playlists (All)**: Refreshes all playlists (detect new tracks / update embeds).
- **Re-scan playlist (Single)**: In the Tab view, next to **Optional: Open In Browser**, click **Re-scan playlist** to refresh only the selected playlist.

---

## Hotkeys (Per-Playlist Commands)

**What you get**
- The plugin registers **one command per playlist** automatically:
  - `Toggle Play/Pause - <Playlist Name>`
- Bind keys in **Obsidian Settings → Hotkeys** or from **Community plugins → Audio PlugList → Hotkeys**.

**Behavior**
- If a different playlist is active, the command switches to that playlist and toggles play/pause.
- After **adding/renaming** playlists, the plugin updates command labels and callbacks when settings are saved (or after a re-scan).

> Tip: If you reorder playlists and a binding seems off, open the plugin settings and re-scan. Commands refresh in place without losing your keybindings.

---

## Known Limitations (Embeds)

- **Autoplay & control** for 🔗 link playlists depend on the provider:
  - YouTube/SoundCloud allow limited programmatic control; autoplay may still be blocked by browser policies.
  - **Spotify** embeds without the Web Playback SDK are limited to **previews**. Full playback requires Premium + OAuth + SDK, which this plugin deliberately avoids (use **Open In Browser**).
  - **Deezer** login overlays can block embed controls; when detected, use **Open In Browser**.

---

## Troubleshooting

### I can’t enable the plugin (red error)
- Ensure your plugin folder contains exactly:
  - `main.js`, `manifest.json`, `styles.css`.
- Confirm `manifest.json` has a valid `"version"` and `"minAppVersion"` that matches your Obsidian.
- If you’ve hand-edited `main.js`, check for missing braces/commas (use a linter or open dev tools).
- Restart Obsidian after replacing files or making changes to any of these three files.

### Audio keeps playing when I switch playlists between Footer/Tab
- Make sure you're running build 1.2.6 (current release at time of writing) or later, where switching playlists calls a universal stop (Footer audio pauses and Tab embeds are blanked).
- If an embed still keeps playing, open the Tab and pause/close the provider player; some providers buffer aggressively.

### My per-playlist hotkeys disappeared / look wrong
- Open **Settings → Audio PlugList** and click **re-scan**. Commands update in place without losing existing bindings.
- Re-bind only if you renamed and want a new label visible in Hotkeys search.

### Link playlist won’t autoplay in the Tab
- This is expected in many browsers due to autoplay policies. Use the embed’s native play button or **Open In Browser**.

### Deezer shows a login / blocked controls
- Use **Open In Browser**. Some Deezer embeds require an active session and won’t play reliably inside the iframe.

---

## Support / Issues

- If you run into something odd:
  - Copy the first error from **Developer Tools → Console** (View → Toggle Developer Tools).
  - Note which provider you’re using (YouTube, SoundCloud, Spotify, etc.).
  - Include your Obsidian version and plugin version.
  - Post this in the **Issues** section here: https://github.com/ragetrip/audio-pluglist/issues

---

## Feature Request / Suggestions

- If you'd like to suggest a feature or recommendation:
  - Visit the Repo's **Discussions** section here: https://github.com/ragetrip/audio-pluglist/discussions


Happy listening!

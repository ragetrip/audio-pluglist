# Audio PlugList

Playlist-based audio player for Obsidian. Point a playlist at a vault **folder** (auto-index audio files), an external **link** (with multi site support), then control playback from a clean **tab view** and a compact **footer mini-player** with shuffle/repeat, optional fade-out stop, EQ presets, and hotkey support.

> **Version:** 1.3.3 - **Obsidian:** 1.5.0+ - **Platforms:** Desktop & Mobile

---

## ✨ Features

- **Playlists**
  - Create from a **Folder** (recursively indexes supported audio files).
  - Create from a **Link** (external site support).
- **Footer mini-player** with segmented controls (⏮ ⏯ ⏭ ⏹ 🔀 🔁), seek, volume, and a marquee **Now Playing** title.
- **Tab view** showing current playlist, track list, and playback controls.
- **Shuffle / Repeat** (Off - All - One).
- **Fade-out on Stop** with adjustable duration.
- **Optional columns**: show Artist and/or Album in the track list.
- **Quick re-scan**: index one playlist or **Scan All** from settings.
- **File name parser**: `Artist - Title` (em dash or hyphen) convenience.
- **Hotkey support** for assignable play/pause command per playlist.
- **EQ support** with bypass option and 3 editable presets.
- **Browser Button** for easy access to external links if wanted or needed.

**Supported formats:** `mp3`, `wav`, `m4a`, `flac`, `ogg`, `aac`.

---

## 📸 PREVIEW | Easily create playlists from internal library or external links
| Library Based Playlist | External Link Based Playlist |
| --- | --- |
| ![Settings](https://raw.githubusercontent.com/ragetrip/audio-pluglist/main/repo-assets/1.3.2/Audio-Pluglist-LibraryPlaylist-(1.3.2).png) | ![Settings](https://raw.githubusercontent.com/ragetrip/audio-pluglist/main/repo-assets/1.2.6/Audio-Pluglist-LinkPlaylist-(1.2.6).png) |

---

## 📸 PREVIEW | Tab support, or Footer Mini-Player support (toggle mini-player on/off) with easy playlist selections
| Tab View | Footer Only View |
| --- | --- |
| ![Settings](https://raw.githubusercontent.com/ragetrip/audio-pluglist/main/repo-assets/1.2.6/Audio-Pluglist-PlaylistSelection-(1.2.6).png) | ![Settings](https://raw.githubusercontent.com/ragetrip/audio-pluglist/main/repo-assets/1.3.2/Audio-Pluglist-FooterMiniPlayer-(1.3.2).png) |

---

## 📸 PREVIEW | Easy menu with hotlink & EQ support
| Settings | Hotlink Support |
| --- | --- |
| ![Settings](https://raw.githubusercontent.com/ragetrip/audio-pluglist/main/repo-assets/1.3.2/Audio-Pluglist-Settings-(1.3.2).png) | ![Settings](https://raw.githubusercontent.com/ragetrip/audio-pluglist/main/repo-assets/1.2.6/Audio-Pluglist-HotkeySupport-(1.2.6).png) |

---

## 📦 Installation

### Option A: Manual
1. Download the latest release assets (`main.js`, `manifest.json`, `styles.css`) from this repository.
2. Create a folder inside your vault at:  
   `.obsidian/plugins/audio-pluglist/`
3. Copy the three files into that folder.
4. In Obsidian: **Settings → Community plugins → Installed plugins → Enable “Audio PlugList”.**

### Option B: BRAT (before it’s in the Community store)
If you use the **BRAT** plugin:
1. In BRAT, add this repo’s URL: https://github.com/ragetrip/audio-pluglist
2. Let BRAT install and enable the plugin.

### Community Store (once approved)
After the plugin is accepted into the Obsidian Community Plugin store, you’ll be able to install and update it directly from:
**Settings → Community plugins → Browse**.

---

## 🚀 Usage

1. Open **Settings → Audio PlugList**.
2. Under **Add New Playlist**, choose:
   - **From Folder** → pick a vault folder to index audio.
   - **From Link** → paste a direct URL.  
     *Note:* Please be aware that some services block external playback.
3. Click **Scan** on a playlist (or **Scan All**).
4. Open the view via **Ribbon button** (music icon) or the command **“Open Audio PlugList.”**
5. Use the **tab controls** or the **footer mini-player** to play, pause, skip, seek, adjust volume, toggle shuffle, and cycle repeat.

**Tips**  
- File names like `Artist - Title.mp3` or `Artist - Title.flac` are parsed into Artist/Title automatically.
- Turn on **Show Artist** / **Show Album** columns if you prefer richer lists.
- Enable **Fade out on Stop** and set a custom **Fade duration (ms)** if you like gentler stops.
- Footer mini-player will not directly control external link embeds, but will open the playlist to the working Tab view with controls.

---

## ⚙️ Settings Overview

- **Playlists (dynamic list)**
  - **Name** (optional label used in menus/views)
  - **Folder** (for folder playlists) + **Browse** + **Scan now**
  - **Link** (for link playlists)
  - **Delete playlist**
- **Custom Equilizer Settings**
    - **Active Preset** (current default EQ)
    - **EQ Table** (current editable presets)
        - **NOTE:** (10 comma separated numbers w/Reset button to revert back to default) 
- **Re-scan all playlists** - Index local folder playlists, re-sync external link connections. Also available on Tab and Footer Mini-Player.
- **YouTube privacy (youtube-nocookie.com)** - Assigns privacy-enhanced domain for youtube embeds to help with Error 153 from blocked youtube links.
- **Show Album in titles** - Based on local file data.
- **Show Artist in titles** - Based on local file data.
- **Show Footer mini-player** - Toggles Footer Mini-Player on/off.
- **Fade out on Stop** - Toggle to enable/disable a user configured fade out on Stop command.
- **Fade duration (ms)** - Adjust by ms to user preferred amount.

---

## 🔍 Known Limitations

- **External links**: Some linked playlists require **log-in**; some services block external playback. **Re-scan playlis(s)** feature added to help re-attempt broken links.
- **Mobile platforms** Behavior depends on OS media policies (e.g., background playback limits).

---

## 📝 Changelog

### 1.2.6 (initial) - Release Notes
- First expected community release of **Audio PlugList**.
- Dynamic playlists (Folder/Link), footer mini-player, shuffle/repeat, fade-out stop, artist/album columns, and scan tools.
- **Hotkey support** for single command play/pause or external link call.
- Added **FULLGUIDE.md** for detailed guide and **troubleshooting tips**.

### 1.3.2 (previous) - Release Notes
- Edits to comply with **Community Plugin** submission standards.
- Added **EQ** support for folder based playlists. Includes multiple presets plus a bypass option.
- Updated **Ribbon/Tab Icon**.
- Various bug cleanup.
    - Dynamic title lock-up addressed.
    - Footer player not updating current playlist on tab change addressed.
    - Icon and pill adjustments for tablet users.

### 1.3.3 (current) - Release Notes
- Edits to comply with **Community Plugin** submission standards.
- Various bug cleanup.
    - Track info appearances.
    - Folder playlist source selection process.

---

## 🤝 Contributing

Bug reports and PRs are welcome. Please include:
- Environment (OS, Obsidian version), repro steps, expected vs. actual behavior.
- If it’s a feature request, a short mockup or example helps.

---

## 📄 License

This project is licensed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.


---

## ☕ Support & More Plugins

If you like this plugin and want to support development, you can [**Buy Me a Coffee**](https://buymeacoffee.com/ragetrip).  

Check out my other Obsidian plugins and projects here: [**My GitHub Repositories**](https://github.com/ragetrip?tab=repositories).

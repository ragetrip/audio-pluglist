# Audio PlugList

Playlist-based audio player for Obsidian. Point a playlist at a vault **folder** (auto-index audio files), an external **link** (YouTube, Spotify, Deezer, SoundCloud, or External Media File), then control playback from a clean **tab view** and a compact **footer mini-player** with shuffle/repeat and optional fade-out stop.

> **Version:** 1.2.5 · **Obsidian:** 1.5.0+ · **Platforms:** Desktop & Mobile

---

## ✨ Features

- **Playlists**
  - Create from a **Folder** (recursively indexes supported audio files).
  - Create from a **Link** (direct audio URL).
- **Footer mini-player** with segmented controls (⏮ ⏯ ⏭ ⏹ 🔀 🔁), seek, volume, and a marquee **Now Playing** title.
- **Tab view** showing current playlist, track list, and playback controls.
- **Shuffle / Repeat** (Off · All · One).
- **Fade-out on Stop** with adjustable duration.
- **Optional columns**: show Artist and/or Album in the track list.
- **Quick re-scan**: index one playlist or **Scan All** from settings.
- **File name parser**: `Artist - Title` (em dash or hyphen) convenience.

**Supported formats:** `mp3`, `wav`, `m4a`, `flac`, `ogg`, `aac`.

---

## 📦 Installation

### Option A: Manual (first GitHub upload)
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
After the plugin is accepted into the Obsidian Community Plugin store, you’ll be able to install and update it directly from **Settings → Community plugins → Browse**.

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
- Footer mini-player will not directly control external link embed controls, but will open the playlist to the working Tab view with controls.

---

## ⚙️ Settings Overview

- **Playlists (dynamic list)**
  - **Name** (optional label used in menus/views)
  - **Folder** (for folder playlists) + **Browse** + **Scan now**
  - **Link** (for link playlists)
  - **Delete playlist**
- **Re-scan all playlists**
- **Show Album in titles**
- **Show Artist in titles**
- **Show Footer mini-player**
- **Fade out on Stop**
- **Fade duration (ms)**

---

## 🔍 Known Limitations

- **External links**: Some link playlists require **log-in**; many hosts don't allow cross-origin playback.
- Mobile platform behavior depends on OS media policies (e.g., background playback limits).

---

## 📝 Changelog

### 1.2.5 - Release Notes
- First expected community release of **Audio PlugList**.
- Dynamic playlists (Folder/Link), footer mini-player, shuffle/repeat, fade-out stop, artist/album columns, and scan tools.

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

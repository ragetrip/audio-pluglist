/* == Yes it's a train wreck, but it works and nobody else was making this.
TO DO LIST: 
1. Additional features
2. Discover bugs and resolve
3. Clean this mess == 
NOTE: If this was helpful to you, please feel free to visit https://buymeacoffee.com/ragetrip to show support. 
Anything is appreciated and motivates to continue creating more useful plugins for the community.
Thank you - Enjoy */

const { Plugin, PluginSettingTab, Setting, ItemView, TFile, TFolder, Notice } = require('obsidian');

const VIEW_TYPE = 'audio-pluglist-view';
const AUDIO_EXTS = { mp3:1, wav:1, m4a:1, flac:1, ogg:1, aac:1 };

function isDirectAudioUrl(u){ return /\.(mp3|m4a|wav|ogg|flac|aac)(\?|#|$)/i.test(u); }
function getYouTubePlaylistId(input){
  try { const u = new URL(input); const id = u.searchParams.get("list"); if (id) return id; } catch {}
  const m = input.match(/[?&]list=([a-zA-Z0-9_-]+)/); return m ? m[1] : null;
}
function ytPlaylistEmbedSrc(listId){
  return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}&rel=0&modestbranding=1&enablejsapi=1`;
}
function isSoundCloudUrl(u){ return /(^|\.)soundcloud\.com\/.+/i.test(u) || /(^|\.)on\.soundcloud\.com\//i.test(u); }
function isSoundCloudSet(u){ return /soundcloud\.com\/[^/]+\/sets\/[^/]+/i.test(u); }
function scEmbedSrc(u, visual=false){
  const clean = u.split('#')[0].split('?')[0];
  const enc = encodeURIComponent(clean);
  const base = `https://w.soundcloud.com/player/?url=${enc}&color=%23ff5500&auto_play=false&show_teaser=true&visual=true`;
  return base;
}

function fetchSoundCloudOEmbed(url, maxheight){
  try {
    const clean = url.split('#')[0].split('?')[0];
    const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(clean)}${maxheight?`&maxheight=${maxheight}`:''}`;
    return fetch(endpoint).then(r=>r.ok?r.json():null).then(j=>{
      if (j && j.html) return j.html;
      return null;
    }).catch(()=>null);
  } catch(e){ return Promise.resolve(null); }
}
function getSpotifyPlaylistId(input){
  try { const u = new URL(input); const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("playlist"); if (idx >= 0 && parts[idx+1]) return parts[idx+1];
  } catch {}
  return null;
}
function spotifyEmbedSrc(id){ return `https://open.spotify.com/embed/playlist/${id}`; }


function clamp(n, a, b){ if(n<a)return a; if(n>b)return b; return n; }
function fmtTime(s) {
  s = Math.floor(s || 0);
  var m = Math.floor(s/60);
  var r = s % 60;
  return m + ':' + (r<10?'0':'') + r;
}
function clearEl(el){ while(el.firstChild) el.removeChild(el.firstChild); }
function mk(tag, cls, text){
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}
function parseArtistTitle(basename){
  var parts = basename.split(/\s[-–]\s/);
  if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(' - ') };
  return { artist: '', title: basename };
}
function fillPlaylistOptions(plugin, sel){
  clearEl(sel);
  if (!plugin.settings.playlists.length){
    var opt = mk('option', '', 'No playlists');
    opt.value = '-1';
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  for (var i=0;i<plugin.settings.playlists.length;i++){
    var p = plugin.settings.playlists[i] || {};
    var label = (p.name && p.name.length) ? p.name : ('Playlist ' + (i+1));
    var opt = mk('option', '', label);
    opt.value = String(i);
    sel.appendChild(opt);
  }

}

/* Simple modal folder picker */
function FolderPicker(app, onPick){
  this.app = app; this.onPick = onPick; this.overlay = null;
}
FolderPicker.prototype.open = function(){
  var overlay = mk('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center;';
  var modal = mk('div');
  modal.style.cssText = 'background:var(--background-primary);border:1px solid var(--background-modifier-border);border-radius:8px;min-width:420px;max-height:70vh;display:flex;flex-direction:column;';
  overlay.appendChild(modal);

  var head = mk('div');
  head.style.cssText='padding:10px 12px;border-bottom:1px solid var(--background-modifier-border);display:flex;gap:8px;align-items:center;';
  head.appendChild(mk('b', '', 'Select a folder'));
  var search = mk('input'); search.type='search'; search.placeholder='Filter folders...'; search.style.cssText='flex:1;margin-left:8px;';
  head.appendChild(search);

  var body = mk('div'); body.style.cssText='padding:8px 12px;overflow:auto;display:flex;flex-direction:column;gap:6px;';
  var list = mk('div');

  var footer = mk('div'); footer.style.cssText='padding:10px 12px;border-top:1px solid var(--background-modifier-border);display:flex;gap:8px;justify-content:flex-end;';
  var cancel = mk('button', '', 'Cancel'); cancel.onclick = this.close.bind(this);
  footer.appendChild(cancel);

  modal.appendChild(head); modal.appendChild(body); body.appendChild(list); modal.appendChild(footer);
  document.body.appendChild(overlay);
  this.overlay = overlay;

  var folders = [];
  function walk(node){
    if (node instanceof TFolder){
      folders.push(node.path || '');
      for (var i=0;i<node.children.length;i++) walk(node.children[i]);
    }
  }
  walk(this.app.vault.getRoot());

  var self = this;
  function render(){
    clearEl(list);
    var q = (search.value||'').toLowerCase();
    for (var i=0;i<folders.length;i++){
      var f = folders[i];
      if (f.toLowerCase().indexOf(q) === -1) continue;
      var row = mk('div','', f || '/');
      row.style.cssText = 'padding:6px 8px;border-radius:6px;cursor:pointer;';
      row.onmouseenter = function(){ this.style.background = 'var(--background-modifier-hover)'; };
      row.onmouseleave = function(){ this.style.background = 'transparent'; };
      (function(folderPath){
        row.onclick = function(){ self.onPick(folderPath); self.close(); };
      })(f);
if (list) list.appendChild(row);
    }
  }
  render();
  search.oninput = render;
};
FolderPicker.prototype.close = function(){
  if (this.overlay){ this.overlay.remove(); this.overlay = null; }
};

// Settings tab //
function SettingsTab(app, plugin){ PluginSettingTab.call(this, app, plugin); this.plugin = plugin; }
SettingsTab.prototype = Object.create(PluginSettingTab.prototype);

SettingsTab.prototype.display = function(){
  var containerEl = this.containerEl;
  containerEl.empty();
  containerEl.createEl('h2', { text: 'Audio PlugList' });

  var self = this;

  // Add New Playlist panel // 
  var addWrap = containerEl.createEl('div', { cls: 'apl-settings-addwrap' });
  addWrap.createEl('div', { text: 'Add New Playlist', cls: 'apl-addlabel' });

  // Folder button //
  new Setting(addWrap)
    .setName('From Folder')
    .setDesc('Create a playlist that scans a vault folder')
    .addButton(b=>{
      b.setButtonText('Add Playlist From Folder').onClick(async ()=>{
        self.plugin.settings.playlists.push({ type:'folder', name:'', folderPath:'' });
        self.plugin.tracksByPlaylist.push([]);
        if (!self.plugin.embedByPlaylist) self.plugin.embedByPlaylist = [];
        self.plugin.embedByPlaylist.push(null);
        await self.plugin.saveSettings();
        self.display();
      });
    });

  // Link button // 
  new Setting(addWrap)
    .setName('From Link')
    .setDesc('Create a playlist from a link: YouTube playlist, SoundCloud track/set, Spotify playlist, or a direct audio URL (.mp3/.m4a/.wav/.ogg/.flac/.aac)')
    .addButton(b=>{
      b.setButtonText('Add Playlist From Link').onClick(async ()=>{
        self.plugin.settings.playlists.push({ type:'link', name:'', link:'' });
        self.plugin.tracksByPlaylist.push([]);
        if (!self.plugin.embedByPlaylist) self.plugin.embedByPlaylist = [];
        self.plugin.embedByPlaylist.push(null);
        await self.plugin.saveSettings();
        self.display();
      });
    });

  function makePlaylistSection(idx){
    var card = containerEl.createEl('div', { cls: 'apl-card' });
    var heading = card.createEl('div', { cls: 'setting-item setting-item-heading' });
    heading.createEl('div', { text: 'Playlist ' + (idx+1) });

    // Name (always) //
    new Setting(card)
      .setName('Name')
      .addText(function(t){
        var cfg = self.plugin.settings.playlists[idx] || {};
        t.setPlaceholder((idx===0 && !cfg.name) ? 'Main' : ('Playlist ' + (idx+1)))
         .setValue((cfg.name||''))
         .onChange(async (v) => { self.plugin.settings.playlists[idx].name = v; await self.plugin.saveSettings(); });
      });

    var cfg = self.plugin.settings.playlists[idx] || {};
    if (cfg.type === 'link'){
      new Setting(card)
        .setName('Link')
        .setDesc('Paste an external audio link (e.g., direct MP3 URL). Browser/CORS limits may apply.')
        .addText(function(t){
          t.setPlaceholder('https://...')
           .setValue((cfg.link||''))
           .onChange(async (v) => { self.plugin.settings.playlists[idx].link = (v||'').trim(); await self.plugin.saveSettings(); });
        });
    } else {
      // Default to folder type //
      self.plugin.settings.playlists[idx].type = 'folder';

      new Setting(card)
        .setName('Folder')
        .setDesc('Folder to scan')
        .addText(function(t){
          t.setPlaceholder('Browse to select...')
           .setValue((cfg.folderPath||''))
           .onChange(async (v) => { self.plugin.settings.playlists[idx].folderPath = (v||'').trim(); await self.plugin.saveSettings(); });
        })
        .addButton(function(btn){
          btn.setButtonText('Browse').onClick(async () => {
            var picker = new FolderPicker(self.app, async function(folderPath){
              self.plugin.settings.playlists[idx].folderPath = folderPath;
              await self.plugin.saveSettings();
              self.display();
            });
            picker.open();
          });
        });

      new Setting(card)
        .setName('Scan now')
        .setDesc('Index this playlist folder immediately')
        .addButton(function(btn){ btn.setButtonText('Scan').onClick(() => self.plugin.indexPlaylist(idx)); });
    }

    new Setting(card)
      .setName('Remove this playlist')
      .addButton(btn=>{
        btn.setButtonText('Delete').onClick(async ()=>{
          self.plugin.settings.playlists.splice(idx,1);
          self.plugin.tracksByPlaylist.splice(idx,1);
          if (self.plugin.embedByPlaylist) self.plugin.embedByPlaylist.splice(idx,1);
          if (self.plugin.currentPlaylist >= self.plugin.settings.playlists.length)
            self.plugin.currentPlaylist = self.plugin.settings.playlists.length - 1;
          await self.plugin.saveSettings();
          self.display();
        });
      });

    // divider moved inside card (not needed) //
  
}

  for (var i=0;i<self.plugin.settings.playlists.length;i++) makePlaylistSection(i);

  // Break line above "Re-scan all playlists" //
  containerEl.createEl('div', { cls: 'apl-section-break' });

  // Keep remaining settings area as-is for better grouping. Looks better in on smaller devices //
  new Setting(containerEl)
    .setName('Re-scan all playlists')
    .addButton(function(btn){ btn.setButtonText('Scan All').onClick(() => self.plugin.indexAll()); });

  new Setting(containerEl)
    .setName('Show Album in titles')
    .addToggle(t=>{
      t.setValue(self.plugin.settings.showAlbum)
       .onChange(async v=>{ self.plugin.settings.showAlbum = v; await self.plugin.saveSettings(); if (self.plugin.onUiRefresh) self.plugin.onUiRefresh(); });
    });

  new Setting(containerEl)
    .setName('Show Artist in titles')
    .addToggle(t=>{
      t.setValue(self.plugin.settings.showArtist)
       .onChange(async v=>{ self.plugin.settings.showArtist = v; await self.plugin.saveSettings(); if (self.plugin.onUiRefresh) self.plugin.onUiRefresh(); });
    });

  new Setting(containerEl)
    .setName('Show Footer mini-player')
    .addToggle(t=>{
      t.setValue(self.plugin.settings.showFooter)
       .onChange(async v=>{ self.plugin.settings.showFooter = v; await self.plugin.saveSettings(); if (self.plugin._applyFooterVisibility) self.plugin._applyFooterVisibility(); });
    });

  new Setting(containerEl)
    .setName('Fade out on Stop')
    .addToggle(t=>{
      t.setValue(self.plugin.settings.fadeOnStop)
       .onChange(async v=>{ self.plugin.settings.fadeOnStop = v; await self.plugin.saveSettings(); });
    });

  new Setting(containerEl)
    .setName('Fade duration (ms)')
    .addText(t=>{
      t.setPlaceholder('3000')
       .setValue(String(self.plugin.settings.fadeMs||3000))
       .onChange(async v=>{
         var n = parseInt(v,10);
         if (!isFinite(n) || n<=0) n = 3000;
         self.plugin.settings.fadeMs = n;
         await self.plugin.saveSettings();
       });
    });
};


// Tab View //
function View(leaf, plugin){ ItemView.call(this, leaf); this.plugin = plugin; }
View.prototype = Object.create(ItemView.prototype);
View.prototype.getViewType = function(){ return VIEW_TYPE; };
View.prototype.getDisplayText = function(){ return 'Audio PlugList'; };
View.prototype.getIcon = function(){ return 'music'; };
View.prototype.onOpen = async function(){ this.render(); };
View.prototype.onClose = async function(){};
View.prototype.render = function(){
  var container = this.containerEl.children[1];
  clearEl(container);

  var col = mk('div', 'ap-col');
  container.appendChild(col);

  // Top: playlist dropdown //
  var rowTop = mk('div', 'ap-row');
  col.appendChild(rowTop);
  var sel = mk('select');
  rowTop.appendChild(sel);
  fillPlaylistOptions(this.plugin, sel); if (this.plugin.currentPlaylist>=0) sel.value = String(this.plugin.currentPlaylist);
  sel.onchange = function(){ if (sel.value!=='-1') this.plugin.setCurrentPlaylist(Number(sel.value)); }.bind(this);

  // Now playing title //
  var title = mk('div', 'ap-title-large', this.plugin.currentTrackLabel());
  col.appendChild(title);

  // Embedded player for link-based playlists //
  var cp = this.plugin.currentPlaylist;
  var cfgp = (cp>=0) ? (this.plugin.settings.playlists[cp]||{}) : {};
  var activeEmbed = (cfgp && cfgp.type==='link') ? (this.plugin.embedByPlaylist && this.plugin.embedByPlaylist[cp] || null) : null;
  if (activeEmbed && activeEmbed.src){
    
    // APL_FORCE_SC_IFRAME - SoundCloud injection (track height fix) - was sensitive //
    try{
      if (activeEmbed && activeEmbed.provider === 'soundcloud'){
        var _raw = (activeEmbed.original || activeEmbed.src || (cfgp && cfgp.link) || '');
        var _clean = (_raw||'').split('#')[0].split('?')[0];
        var _isSet = _clean.indexOf('/sets/') !== -1;
        var targetHeight = _isSet ? 600 : 420; // ensures large UI for tracks

        // Dedicated container and iframe //
        var _wrap = mk('div','ap-embedbox');
        var _ifr  = document.createElement('iframe');
        _ifr.width = '100%';
        _ifr.height = String(targetHeight);
        _ifr.frameBorder = '0';
        _ifr.scrolling = 'no';
        _ifr.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture';
        _ifr.allowFullscreen = true;
        _ifr.src = 'https://w.soundcloud.com/player/?visual=true&url=' + encodeURIComponent(_clean) + '&show_artwork=true';

        // Insert at top of column and stop further renders //
        col.appendChild(_wrap);
        _wrap.appendChild(_ifr);
        return;
      }
    }catch(e){}
var wrap = mk('div','ap-embedbox');
    var iframe = wrap.createEl('iframe', { attr: {
      src: activeEmbed.src,
      width: '100%',
      height: String(activeEmbed.height||380),
      frameborder: '0',
      allow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
      allowfullscreen: 'true',
      scrolling: 'no'
    }});
    col.appendChild(wrap);
    // Try oEmbed for SoundCloud - fallback to iframe
    try {
      if (activeEmbed && activeEmbed.provider==='soundcloud'){
        var _src0 = (activeEmbed && (activeEmbed.original||activeEmbed.src)) || (cfgp && cfgp.link) || '';
        fetchSoundCloudOEmbed(_src0, activeEmbed.height||450).then(function(html){
          if (html){ wrap.innerHTML = html; }
        });
      }
    } catch(e){}

    try {
      var _openSrc = (activeEmbed && (activeEmbed.original || activeEmbed.src)) || (cfgp && cfgp.link) || '';
      var btnRow = mk('div','ap-row ap-embed-actions');
      var btn = mk('button','ap-open-ext ap-open-ext--mini','Optional: Open In Browser');
      btn.onclick = function(){ try{ window.open(_openSrc, '_blank'); }catch(e){} };
      btnRow.appendChild(btn);
      col.appendChild(btnRow);
    } catch(e){}

  }

  // Controls (hidden when an external embed is active) //
  var controls = null;
  if (!(activeEmbed && activeEmbed.src)) { controls = mk('div', 'ap-row ap-controls'); col.appendChild(controls); }
  var prev = mk('button', '', 'Prev ◀︎◀︎'); prev.title='Previous';
  var play = mk('button', '', (this.plugin.audio.paused ? 'Play ▶︎' : 'Pause Ⅱ')); play.title='Play/Pause';
  var next = mk('button', '', 'Skip ▶︎▶︎'); next.title='Next';
  var stop = mk('button', '', 'Stop ■'); stop.title='Stop (fade)';
  var shuffle = mk('button', '', this.plugin.shuffle ? 'Shuffle (ON)' : 'Shuffle'); shuffle.title='Shuffle';
  var rptLabel = this.plugin.repeatMode === 'all' ? 'Repeat (All)' : (this.plugin.repeatMode === 'one' ? 'Repeat (One)' : 'Repeat');
  var repeatBtn = mk('button', '', rptLabel); repeatBtn.title='Repeat mode';
  if (controls) { controls.appendChild(prev); controls.appendChild(play); controls.appendChild(next); controls.appendChild(stop); controls.appendChild(shuffle); controls.appendChild(repeatBtn); }

  if (controls) prev.onclick = function(){ this.plugin.prev(); }.bind(this);
  if (controls) play.onclick = function(){ this.plugin.togglePlay(); play.textContent = (this.plugin.audio.paused ? 'Play ▶︎' : 'Pause Ⅱ'); }.bind(this);
  if (controls) next.onclick = function(){ this.plugin.next(); }.bind(this);
  if (controls) stop.onclick = function(){ if (this.plugin.settings.fadeOnStop) this.plugin.stopFade(this.plugin.settings.fadeMs||3000); else this.plugin.stop(); }.bind(this);
  if (controls && this.plugin.shuffle) shuffle.classList.add('is-active');
  if (controls) shuffle.onclick = function(){ this.plugin.toggleShuffle(); shuffle.textContent = this.plugin.shuffle ? 'Shuffle (ON)' : 'Shuffle'; shuffle.classList.toggle('is-active', this.plugin.shuffle); }.bind(this);
  if (controls) repeatBtn.classList.toggle('is-active', this.plugin.repeatMode !== 'off');
  if (controls) repeatBtn.onclick = function(){ this.plugin.cycleRepeat(); var lbl = this.plugin.repeatMode === 'all' ? 'Repeat (All)' : (this.plugin.repeatMode === 'one' ? 'Repeat (One)' : 'Repeat'); repeatBtn.textContent = lbl; repeatBtn.classList.toggle('is-active', this.plugin.repeatMode !== 'off'); }.bind(this);

  // Seek //
  var seekRow = null;
  if (!(activeEmbed && activeEmbed.src)) { seekRow = mk('div', 'ap-row ap-seek'); col.appendChild(seekRow); }
  var cur = mk('span', '', '0:00');
  var range = mk('input'); range.type='range'; range.min='0'; range.max='1000'; range.value='0';
  var dur = mk('span', '', '0:00');
  if (seekRow) { seekRow.appendChild(cur); seekRow.appendChild(range); seekRow.appendChild(dur); }
  if (seekRow) range.oninput = function(){ this.plugin.seekToFraction(Number(range.value)/1000); }.bind(this);

  // Volume (centered, wide) //
  var volRow = null;
  if (!(activeEmbed && activeEmbed.src)) { volRow = mk('div', 'ap-row ap-vol-wide'); col.appendChild(volRow); if (volRow) volRow.appendChild(mk('span','', 'Vol')); }
  var vol = mk('input'); vol.type='range'; vol.min='0'; vol.max='100'; vol.value = String(Math.round(this.plugin.audio.volume*100));
  if (volRow) volRow.appendChild(vol);
  if (volRow) vol.oninput = function(){ this.plugin.setVolume(Number(vol.value)/100); }.bind(this);

  // Track list (row click to play, Title - Artist, duration right, current with 🔊 icon) //
  var list = null;
  if (!(activeEmbed && activeEmbed.src)) { list = mk('div', 'audio-list'); col.appendChild(list); }

  var showArtist = this.plugin.settings.showArtist;
  var showAlbum  = this.plugin.settings.showAlbum;
  function gridCols(){
    var cols = ['16px','1fr'];
    if (showArtist) cols.push('minmax(120px,0.8fr)');
    if (showAlbum)  cols.push('minmax(120px,0.8fr)');
    cols.push('56px');
    return cols.join(' ');
  }
  function gridColsFor(playing){
    var cols = [playing ? '16px' : '0px','1fr'];
    if (showArtist) cols.push('minmax(120px,0.8fr)');
    if (showAlbum)  cols.push('minmax(120px,0.8fr)');
    cols.push('56px');
    return cols.join(' ');
  }

  // Header //
  var header = list ? mk('div','audio-header') : null;
  if (header) header.style.gridTemplateColumns = gridCols();
  if (header) header.appendChild(mk('div','cell-icon',''));
  if (header) header.appendChild(mk('div','cell-title','Title'));
  if (header && showArtist) header.appendChild(mk('div','cell-artist','Artist'));
  if (header && showAlbum)  header.appendChild(mk('div','cell-album','Album'));
  if (header) { header.appendChild(mk('div','cell-time','Time')); if (list) list.appendChild(header); }
  if (list) list.appendChild(header);

  var tracks = this.plugin.getTracks();
  if (list && !tracks.length) list.appendChild(mk('div','', 'No audio files found for this playlist.'));
  for (var i=0;i<tracks.length;i++){ if (!list) break;
    (function(i, t, self){
      var row = mk('div', 'audio-row');
      row.style.gridTemplateColumns = gridColsFor(self.plugin.index===i);
      var meta = t.meta || {};
      var icon = mk('div','cell-icon', self.plugin.index===i ? '🔊' : '');
      if (self.plugin.index===i) row.classList.add('is-playing');
      var titleCell = mk('div','cell-title', t.title);
      row.appendChild(icon);
      row.appendChild(titleCell);
      if (showArtist) row.appendChild(mk('div','cell-artist', meta.artist || ''));
      if (showAlbum)  row.appendChild(mk('div','cell-album', meta.album || ''));
      var right = mk('div','cell-time', t.duration!=null ? fmtTime(t.duration) : '--:--');
      row.appendChild(right);
      row.onclick = function(){ self.plugin.playIndex(i); };
if (list) list.appendChild(row);
    })(i, tracks[i], this);
  }

  var self = this;
  function updateTime(){
    var ct = self.plugin.audio.currentTime || 0;
    var dd = self.plugin.audio.duration || 0;
    var frac = dd ? clamp(ct/dd, 0, 1) : 0;
    range.value = String(Math.round(frac*1000));
    cur.textContent = fmtTime(ct);
    dur.textContent = fmtTime(dd);
    title.textContent = self.plugin.currentTrackLabel();
  }
  this.plugin.audio.addEventListener('timeupdate', updateTime);
  this.plugin.audio.addEventListener('loadedmetadata', updateTime);
  this.plugin.onUiRefresh = function(){ self.render(); };
};

// Main plugin //
module.exports = class AudioPlugList extends Plugin {
  async onload() {
    this.settings = Object.assign({
      playlists: [],
      autoIndexOnLoad: true,
      currentPlaylist: 0,
      showAlbum: false,
      showArtist: false,
      showFooter: true,
      fadeOnStop: true,
      fadeMs: 3000
    }, await this.loadData());

    this.tracksByPlaylist = Array.from({length: this.settings.playlists.length}, ()=>[]);
    this.embedByPlaylist = Array.from({length: this.settings.playlists.length}, ()=>null);
    this.currentPlaylist = (this.settings.playlists.length ? clamp(this.settings.currentPlaylist, 0, this.settings.playlists.length-1) : -1);
    this.queue = [];
    this.index = -1;
    this.audio = new Audio();
    this.shuffle = true; // default 'true' by request //
    this.repeatMode = 'all'; // default 'all' by request //
    this.onUiRefresh = null;

    this.audio.addEventListener('ended', this._onEnded.bind(this));

    // Ribbon icon //
    this.addRibbonIcon('music', 'Audio PlugList', () => this.activateView());

    this.registerView(VIEW_TYPE, (leaf) => new View(leaf, this));

    this.addCommand({ id:'apl-open', name:'Open Audio PlugList', callback: () => this.activateView() });
    this.addCommand({ id:'apl-play-pause', name:'Play/Pause', callback: () => this.togglePlay() });
    this.addCommand({ id:'apl-next', name:'Next Track', callback: () => this.next() });
    this.addCommand({ id:'apl-prev', name:'Previous Track', callback: () => this.prev() });
    this.addCommand({ id:'apl-stop', name:'Stop (Fade Out)', callback: () => this.stopFade(3000) });
    this.addCommand({ id:'apl-rescan-all', name:'Re-scan All Playlists', callback: () => this.indexAll() });

    this.addSettingTab(new SettingsTab(this.app, this));

    if (this.settings.autoIndexOnLoad){
      const run = async ()=>{ try{ await this.indexAll(); }catch(e){} };
      if (this.app.workspace && this.app.workspace.onLayoutReady){ this.app.workspace.onLayoutReady(run); }
      else setTimeout(run, 800);
    }
    this._applyFooterVisibility = function(){ if (this.settings.showFooter){ this._attachFooter(); } else { this._detachFooter(); } };
    this._applyFooterVisibility();
  }

  onunload() {
    this._detachFooter();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    this.audio.pause(); this.audio.src = '';
  }

  async saveSettings(){ await this.saveData(this.settings); }

  async activateView(){
    var leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length){
      this.app.workspace.revealLeaf(leaves[0]);
    } else {
      var leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  // Footer //
  _attachFooter(){
    if (this.footerEl) return;
    var root = document.body.querySelector('.app-container, .mod-root') || document.body;
    var el = mk('div', 'ap-footer-player');

    var sel = mk('select');
    fillPlaylistOptions(this, sel); if (this.currentPlaylist>=0) sel.value = String(this.currentPlaylist);
    sel.onchange = function(){ if (sel.value!=='-1') this.setCurrentPlaylist(Number(sel.value)); }.bind(this);

    // Segmented controls ⏮ | ⏯ | ⏭ | ⏹ | 🔀 | 🔁 - some of these had to be done the way that are. Switched from 1.0.3 due to mobile and device view issues so below ones are different but working. //
    var controls = el.createEl('div', { cls:'ap-footer-group' });
    var bPrev = controls.createEl('button', { cls:'ap-footer-seg no-active plain', text:'◀︎◀︎', title:'Previous' }); bPrev.onclick = ()=>this.prev();
    var bPlay = controls.createEl('button', { cls:'ap-footer-seg', text:(this.audio.paused?'▶':'Ⅱ'), title:'Play/Pause' }); bPlay.onclick = ()=>{ this.togglePlay(); bPlay.textContent = this.audio.paused ? '▶' : 'Ⅱ'; };
    var bNext = controls.createEl('button', { cls:'ap-footer-seg no-active plain', text:'▶︎▶︎', title:'Skip' }); bNext.onclick = ()=>this.next();
    var bStop = controls.createEl('button', { cls:'ap-footer-seg no-active plain', text:'■', title:'Stop' }); bStop.onclick = ()=>{ if (this.settings.fadeOnStop) this.stopFade(this.settings.fadeMs||3000); else this.stop(); };
    var bShuf = controls.createEl('button', { cls:'ap-footer-seg', text:'🔀', title:'Shuffle' }); bShuf.onclick = ()=>{ this.toggleShuffle(); bShuf.classList.toggle('is-active', this.shuffle); };
    var bRpt  = controls.createEl('button', { cls:'ap-footer-seg', text:(this.repeatMode==='one'?'🔂':'🔁'), title:'Repeat' }); bRpt.onclick = ()=>{ this.cycleRepeat(); bRpt.textContent = (this.repeatMode==='one'?'🔂':'🔁'); bRpt.classList.toggle('is-active', this.repeatMode!=='off'); };

    var seekWrap = mk('div', 'ap-seek');
    var cur = mk('span','', '0:00');
    var seek = mk('input'); seek.type='range'; seek.min='0'; seek.max='1000'; seek.value='0';
    var dur = mk('span','', '0:00');
    seek.oninput = function(){ this.seekToFraction(Number(seek.value)/1000); }.bind(this);
    seekWrap.appendChild(cur); seekWrap.appendChild(seek); seekWrap.appendChild(dur);

    var volWrap = mk('div', 'ap-vol');
    var volLabel = mk('span','', 'Vol');
    var vol = mk('input'); vol.type='range'; vol.min='0'; vol.max='100'; vol.value = String(Math.round(this.audio.volume*100));
    vol.oninput = function(){ this.setVolume(Number(vol.value)/100); }.bind(this);
    volWrap.appendChild(volLabel); volWrap.appendChild(vol);

    var title = mk('div', 'ap-title');
    this._setFooterTitle(title, this.currentTrackLabel());

    el.appendChild(sel);
    el.appendChild(controls);
    el.appendChild(seekWrap);
    el.appendChild(volWrap);
    el.appendChild(title);
    root.appendChild(el);
    this.footerEl = el;

    // init active states only for shuffle/repeat
    if (this.shuffle) bShuf.classList.add('is-active');
    if (this.repeatMode !== 'off') bRpt.classList.add('is-active');

    var self = this;
    function updateTime(){
      var ct = self.audio.currentTime || 0;
      var dd = self.audio.duration || 0;
      var frac = dd ? clamp(ct/dd, 0, 1) : 0;
      seek.value = String(Math.round(frac*1000));
      cur.textContent = fmtTime(ct);
      dur.textContent = fmtTime(dd);
      self._setFooterTitle(title, self.currentTrackLabel());
    }
    this.audio.addEventListener('timeupdate', updateTime);
    this.audio.addEventListener('loadedmetadata', updateTime);
  }
  _detachFooter(){ if (this.footerEl){ this.footerEl.remove(); this.footerEl = null; } }

  _setFooterTitle(container, text){
    if (this._footerTitleText === text && container._marqueeInitialized) return;
    this._footerTitleText = text;
    while (container.firstChild) container.removeChild(container.firstChild);
    var span = mk('span','', text || '—');
    container.appendChild(span);
    container._marqueeInitialized = false;
    var self = this;
    requestAnimationFrame(function(){
      try{
        if (container.scrollWidth > container.clientWidth){
          while (container.firstChild) container.removeChild(container.firstChild);
          var wrap = mk('div','ap-marquee');
          var t1 = mk('span','', text + '   •   ');
          var t2 = mk('span','', text + '   •   ');
          wrap.appendChild(t1); wrap.appendChild(t2);
          var dur = Math.max(12, Math.ceil((text||'').length * 0.45));
          wrap.style.setProperty('--apl-marquee-duration', dur + 's');
          container.appendChild(wrap);
          container._marqueeInitialized = true;
        }
      }catch(e){}
    });
  }

  setCurrentPlaylist(i){ if (!this.settings.playlists.length){ this.currentPlaylist=-1; this._applyPlaylistQueue(); if(this.onUiRefresh) this.onUiRefresh(); return; } this.currentPlaylist = clamp(i,0,this.settings.playlists.length-1);
    this.settings.currentPlaylist = this.currentPlaylist;
    this.saveSettings();
    this._applyPlaylistQueue();
    if (typeof this.onUiRefresh === 'function') this.onUiRefresh();
  }

  // Indexing //
  async indexAll(){ for (var i=0;i<this.settings.playlists.length;i++) await this.indexPlaylist(i); this._applyPlaylistQueue(); }
  async indexPlaylist(i){
  var cfg = this.settings.playlists[i] || {};
  // LINK-based playlist support //
  if (cfg.type === 'link'){
    var link = (cfg.link||'').trim();
    var name = (cfg.name||link||('Playlist '+(i+1)));
    if (!link){ this.tracksByPlaylist[i]=[]; if (this.embedByPlaylist) this.embedByPlaylist[i]=null; new Notice('Audio PlugList: link missing for \"'+name+'\".'); return; }

    if (!this.embedByPlaylist) this.embedByPlaylist = Array.from({length: this.settings.playlists.length}, ()=>null);

    // YouTube playlist (iframe embed) //
    var ytid = getYouTubePlaylistId(link);
    if (ytid){
      this.tracksByPlaylist[i] = [];
      this.embedByPlaylist[i]  = { provider:'youtube', src: ytPlaylistEmbedSrc(ytid), height: 380, original: link };
      new Notice('Audio PlugList: embedded YouTube playlist.');
      return;
    }

    // SoundCloud (track or set) //
    if (isSoundCloudUrl(link)){
      this.tracksByPlaylist[i] = [];
      var _isSet = isSoundCloudSet(link);
      this.embedByPlaylist[i]  = { provider:'soundcloud', src: scEmbedSrc(link, _isSet), height: (_isSet?600:166) };
      new Notice('Audio PlugList: embedded SoundCloud.');
      return;
    }

    // Spotify playlist (embed; playback may be short previews without prem) //
    var spid = getSpotifyPlaylistId(link);
    if (spid){
      this.tracksByPlaylist[i] = [];
      this.embedByPlaylist[i]  = { provider:'spotify', src: spotifyEmbedSrc(spid), height: 380, original: link };
      new Notice('Audio PlugList: embedded Spotify playlist.');
      return;
    }

    // Direct audio URL //
    if (isDirectAudioUrl(link)){
      var t = { id: link, path: link, title: name, meta: { artist:'', title:name, album:'' }, duration: null };
      this.tracksByPlaylist[i] = [t];
      this.embedByPlaylist[i]  = null;
      this._preloadDurations(i);
      return;
    }

    // Fallback: not embeddable //
    this.tracksByPlaylist[i] = [];
    this.embedByPlaylist[i]  = { provider:'external', src: link, height: 0, openExternally:true };
    new Notice('Audio PlugList: link is not embeddable or a direct audio file.');
    return;
  }
  // FOLDER-based (default) //
  var cfg = this.settings.playlists[i] || { folderPath:'' };
    var fp = (cfg.folderPath||'').trim();
    var root = fp ? this.app.vault.getAbstractFileByPath(fp) : this.app.vault.getRoot();
    if (!root){ new Notice('Audio PlugList: folder not found for playlist ' + (i+1)); this.tracksByPlaylist[i] = []; return; }
    var tracks = [];
    var self = this;
    async function walk(node){
      if (node instanceof TFile){
        var ext = (node.extension||'').toLowerCase();
        if (AUDIO_EXTS[ext]) {
          var parsed = parseArtistTitle(node.basename);
          var album = (node.parent && node.parent.name) ? node.parent.name : '';
          tracks.push({ id: node.path, path: node.path, title: node.basename, meta: { artist: parsed.artist, title: parsed.title, album: album }, duration: null });
        }
      } else if (node instanceof TFolder){
        for (var j=0;j<node.children.length;j++) await walk(node.children[j]);
      }
    }
    await walk(root);
    this.tracksByPlaylist[i] = tracks;
    this._preloadDurations(i);
    new Notice('Audio PlugList: Playlist ' + (i+1) + ' indexed ' + tracks.length + ' tracks.');
  }

  _preloadDurations(i){
    var list = this.tracksByPlaylist[i] || [];
    var self = this;
    list.forEach(function(t){
      if (t.duration != null) return;
      var a = new Audio();
      a.preload = 'metadata';
      a.src = /^https?:\/\//i.test(t.path) ? t.path : self.app.vault.adapter.getResourcePath(t.path);
      a.addEventListener('loadedmetadata', function(){
        t.duration = a.duration || 0;
        if (typeof self.onUiRefresh === 'function') self.onUiRefresh();
      }, { once:true });
    });
  }

  _applyPlaylistQueue(){ var list = this.getTracks(); this.queue = list.slice(); this.index = -1; }
  getTracks(){ return (this.currentPlaylist>=0 && this.currentPlaylist<this.tracksByPlaylist.length) ? (this.tracksByPlaylist[this.currentPlaylist]||[]) : []; }
  current(){ return (this.index>=0 && this.index<this.queue.length) ? this.queue[this.index] : null; }
  currentTrackLabel(){ var t = this.current(); if (!t) return '—'; return buildLabel(this, t); }
  loadCurrent(){
    var t = this.current(); if (!t) return false;
    this.audio.src = (/^https?:\/\//i.test(t.path) ? t.path : this.app.vault.adapter.getResourcePath(t.path));
    return true;
  }
  playIndex(i){ if (i<0 || i>=this.queue.length) return; this.index = i; if (this.loadCurrent()) this.audio.play(); this._notifyUi(); }
  
  _activeEmbed(){
    try {
      var cp = this.currentPlaylist;
      var cfg = (cp>=0) ? (this.settings.playlists[cp]||{}) : null;
      if (!cfg || cfg.type!=='link') return null;
      return (this.embedByPlaylist && this.embedByPlaylist[cp]) || null;
    } catch(e){ return null; }
  }
togglePlay(){
    var __em = this._activeEmbed && this._activeEmbed();
    if (__em && __em.src){ new Notice('This playlist uses an embedded player. Use the player in the tab.'); if (this.activateView) this.activateView(); return; }

    if (!this.current() && this.queue.length){ this.index = 0; if (!this.loadCurrent()) return; }
    if (this.audio.paused) this.audio.play(); else this.audio.pause();
    this._notifyUi();
  }
  stop(){
    var __em = this._activeEmbed && this._activeEmbed();
    if (__em && __em.src){ new Notice('This playlist uses an embedded player. Use the player in the tab.'); if (this.activateView) this.activateView(); return; }
 this.audio.pause(); this.audio.currentTime = 0; this._notifyUi(); }
  stopFade(durationMs){
    durationMs = durationMs || 3000;
    var a = this.audio;
    var startVol = a.volume;
    var steps = 30;
    var step = 0;
    var self = this;
    var iv = setInterval(function(){
      step++;
      var frac = 1 - (step/steps);
      a.volume = Math.max(0, startVol * frac);
      if (step >= steps){
        clearInterval(iv);
        a.pause();
        a.currentTime = 0;
        a.volume = startVol;
        self._notifyUi();
      }
    }, Math.max(10, Math.floor(durationMs/steps)));
  }
  next(){
    var __em = this._activeEmbed && this._activeEmbed();
    if (__em && __em.src){ new Notice('This playlist uses an embedded player. Use the player in the tab.'); if (this.activateView) this.activateView(); return; }

    if (this.repeatMode === 'one' && this.current()){ this.audio.currentTime = 0; this.audio.play(); this._notifyUi(); return; }
    this.index = this._pickNextIndex(this.index);
    if (this.index === -1){
      if (this.repeatMode === 'all' && this.queue.length) this.index = 0;
    }
    if (this.index === -1){ this.stop(); return; }
    if (this.loadCurrent()) this.audio.play();
    this._notifyUi();
  }
  prev(){
    var __em = this._activeEmbed && this._activeEmbed();
    if (__em && __em.src){ new Notice('This playlist uses an embedded player. Use the player in the tab.'); if (this.activateView) this.activateView(); return; }

    if (this.index > 0) this.index--; else this.audio.currentTime = 0;
    if (this.loadCurrent()) this.audio.play();
    this._notifyUi();
  }
  _onEnded(){ this.next(); }

  toggleShuffle(){ this.shuffle = !this.shuffle; }
  cycleRepeat(){
    if (this.repeatMode === 'off') this.repeatMode = 'all';
    else if (this.repeatMode === 'all') this.repeatMode = 'one';
    else this.repeatMode = 'off';
  }

  _pickNextIndex(cur){
    var n = this.queue.length;
    if (!n) return -1;
    if (this.shuffle){
      if (n === 1) return 0;
      var r2 = Math.floor(Math.random()*n);
      if (r2 === cur) r2 = (r2+1)%n;
      return r2;
    }
    return (cur+1 < n) ? (cur+1) : -1;
  }

  seekToFraction(p){ var d = this.audio.duration || 0; if (d) this.audio.currentTime = clamp(p,0,1) * d; }
  setVolume(v){ this.audio.volume = clamp(v,0,1); }

  _notifyUi(){ if (typeof this.onUiRefresh === 'function') this.onUiRefresh(); }
};
function buildLabel(plugin, t){
  var meta = t.meta || {};
  var parts = [t.title]; // always start from the file basename //
  if (plugin && plugin.settings){
    if (plugin.settings.showArtist && meta.artist) parts.push(meta.artist);
    if (plugin.settings.showAlbum && meta.album) parts.push(meta.album);
  }
  return parts.join(' — ');
}

// APL SoundCloud guard: force widget URL + height //
(function(){
  var fixedFlag = 'data-apl-sc-fixed';
  function toWidgetUrl(pageUrl){
    try {
      var clean = String(pageUrl||'').split('#')[0].split('?')[0];
      return 'https://w.soundcloud.com/player/?visual=true&url=' + encodeURIComponent(clean) + '&show_artwork=true';
    } catch(e){ return pageUrl; }
  }
  function fixIn(root){
    if (!root) return;
    var frames = root.querySelectorAll('iframe[src*="://soundcloud.com/"]:not(['+fixedFlag+'])');
    frames.forEach(function(ifr){
      try {
        var w = toWidgetUrl(ifr.src);
        if (w && w.indexOf('w.soundcloud.com/player') !== -1) {
          ifr.setAttribute('src', w);
        }
        var h = parseInt(ifr.getAttribute('height') || '0', 10);
        if (!h || h < 200) ifr.setAttribute('height', '420');
        ifr.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture');
        ifr.setAttribute(fixedFlag, '1');
      } catch(_){}
    });
  }
  function activeViewContent(){
    return document.querySelector('.workspace-leaf.mod-active .view-content');
  }
  function kick(){
    var vc = activeViewContent();
    if (vc) fixIn(vc);
  }
  // initial nudges //
  var count = 0;
  var timer = setInterval(function(){
    kick();
    if (++count > 15) clearInterval(timer); // ~12s
  }, 800);

  // observe future DOM changes (lightweight filter) //
  var obs = new MutationObserver(function(muts){
    for (var i=0;i<muts.length;i++){
      var n = muts[i].target;
      if (!n) continue;
      // only re-scan iframes are being added or attributes change //
      if (muts[i].type === 'childList' || muts[i].type === 'attributes') {
        kick();
        break;
      }
    }
  });
  try {
    obs.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src','height'] });
  } catch(_){}
})();

// I know i don't have to end with "//" but i'm slightly color blind so it helps me when my eyes are tired. //
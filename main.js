/* == Yes it's a train wreck, but it works and nobody else was making this.
TO DO LIST: 
1. Additional features
2. Discover bugs and resolve
3. Clean this mess == 
NOTE: If this was helpful to you, please feel free to visit https://buymeacoffee.com/ragetrip to show support. 
Anything is appreciated and motivates to continue creating more useful plugins for the community.
Thank you - Enjoy */

const { Plugin, PluginSettingTab, Setting, ItemView, TFile, TFolder, Notice, normalizePath } = require('obsidian');
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

function getDeezerPlaylistId(input){
  try{
    const u = new URL(input);
    const m = u.pathname.match(/\/playlist\/(\d+)/i);
    if (m) return m[1];
  }catch(e){}
  const rx = /deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/i;
  const m2 = (input||'').match(rx);
  return m2 ? m2[1] : null;
}


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
function fillPlaylistOptions(self, sel){
  while (sel.firstChild) sel.removeChild(sel.firstChild);
  var pls = self.settings.playlists;
  var opt0 = document.createElement('option'); opt0.value='-1'; opt0.textContent='(no playlist selected)'; sel.appendChild(opt0);
  for (var i=0;i<pls.length;i++){
    var cfg = pls[i]||{};
    var name = (cfg.name||('Playlist '+(i+1)));
    if (cfg.type==='folder') name = '📂 ' + name;
    else if (cfg.type==='link') name = '🔗 ' + name;
    var opt = document.createElement('option'); opt.value=String(i); opt.textContent=name; sel.appendChild(opt);
  }
}

/* Simple modal folder picker */
function FolderPicker(app, onPick){
  this.app = app; this.onPick = onPick; this.overlay = null;
}
FolderPicker.prototype.open = function(){
  var overlay = mk('div','apl-modal-overlay');
  var modal = mk('div','apl-modal');
  overlay.appendChild(modal);

  var head = mk('div','apl-modal-head');
  head.appendChild(mk('b', '', 'Select a folder'));
  var search = mk('input','apl-modal-search'); search.type='search'; search.placeholder='Filter folders...'; head.appendChild(search);

  var body = mk('div','apl-modal-body');
  var list = mk('div');

  var footer = mk('div','apl-modal-footer');
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
  var self = this;

  // Add New Playlist panel // 
  var addWrap = containerEl.createEl('div', { cls: 'apl-settings-addwrap' });
  addWrap.createEl('div', { text: 'Add new playlist', cls: 'apl-addlabel' });

  // Folder button //
  new Setting(addWrap)
    .setName('From folder')
    .setDesc('Create a playlist that scans a vault folder')
    .addButton(b=>{
      b.setButtonText('Add playlist from folder').onClick(async ()=>{
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
    .setName('From link')
    .setDesc('Create a playlist from a link: YouTube playlist, SoundCloud track/set, Spotify playlist, or a direct audio URL (.mp3/.m4a/.wav/.ogg/.flac/.aac)')
    .addButton(b=>{
      b.setButtonText('Add playlist from link').onClick(async ()=>{
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
           .onChange(async (v) => { self.plugin.settings.playlists[idx].folderPath = normalizePath((v||'').trim()); await self.plugin.saveSettings(); });
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



// ====== Equalizer Settings ====== //
(function(){
  try{
    var eqCard = containerEl.createEl('div', { cls: 'apl-eq-card' });
    eqCard.createEl('div', { text: 'Custom Equalizer Settings', cls: 'apl-eq-title' });

    // Active preset dropdown (inside card at top) //
    new Setting(eqCard)
      .setName('Active Preset')
      .setDesc('Select which preset is applied to local audio playback (folder tracks / direct audio URLs). Embedded players cannot be EQ’d.')
      .addDropdown(function(drop){
        drop.addOption('none','None');
        drop.addOption('0','Preset 0 — Default (Flat)');
        drop.addOption('1','Preset 1 — Warm');
        drop.addOption('2','Preset 2 — Bright');
        drop.addOption('3','Preset 3 — V-Curve');
        drop.setValue(String(self.plugin.settings.activeEQ ?? 'none'));
        drop.onChange(async function(v){
          self.plugin.settings.activeEQ = (v === 'none') ? 'none' : Number(v);
          await self.plugin.saveSettings();
          try{ self.plugin._aplApplyEQ(); }catch(e){}
        });
      });

    eqCard.createEl('div', { text: 'Enter 10 comma-separated numbers (dB) for bands: 32, 62, 128, 250, 500, 1k, 2k, 4k, 8k, 16k Hz.', cls: 'apl-eq-sub' });

    function parsePreset(str){
      var nums = (str||'').split(',').map(function(s){ return Number(String(s).trim()); });
      if (nums.length !== 10) return null;
      for (var i=0;i<nums.length;i++){ if (!isFinite(nums[i])) return null; }
      return nums;
    }

    function makePresetRow(p){
      var row = eqCard.createEl('div', { cls:'apl-eq-row' });
      row.createEl('div', { text: 'EQ-' + p + ' gains (dB)', cls:'apl-eq-label' });

      var canvas = row.createEl('canvas', { cls:'apl-eq-graph' });
      canvas.width = 200; canvas.height = 50;

      var presetArr = (self.plugin.settings.eqPresets && self.plugin.settings.eqPresets[p]) ? self.plugin.settings.eqPresets[p] : [0,0,0,0,0,0,0,0,0,0];
      try{ self.plugin._aplDrawEQGraph(canvas, presetArr); }catch(e){}

      var input = row.createEl('input', { cls:'apl-eq-input', attr:{ value: presetArr.join(', ') } });

      input.addEventListener('change', async function(){
        var parsed = parsePreset(input.value);
        if (!parsed){
          new Notice('Invalid EQ preset. Must be 10 numbers, comma-separated.');
          input.value = presetArr.join(', ');
          return;
        }
        self.plugin.settings.eqPresets[p] = parsed;
        await self.plugin.saveSettings();
        presetArr = parsed;
        try{ self.plugin._aplDrawEQGraph(canvas, presetArr); }catch(e){}
        try{ self.plugin._aplApplyEQ(); }catch(e){}
      });

      var resetBtn = row.createEl('button', { cls:'apl-eq-reset' });
      resetBtn.textContent = 'Reset';
      resetBtn.onclick = async function(){
        // Reset Preset 0 to flat; others to built-in defaults //
        var defaults = [
          [0,0,0,0,0,0,0,0,0,0],
          [3,2.5,1.5,0.5,0,-0.5,0,0.5,1,1.5],
          [0,0.5,1,1.5,3,3.5,4,3.5,2,1.5],
          [3,2.5,2,0.5,-1.5,-2,-0.5,1.5,2.5,2]
        ];
        self.plugin.settings.eqPresets[p] = defaults[p].slice();
        await self.plugin.saveSettings();
        presetArr = self.plugin.settings.eqPresets[p];
        input.value = presetArr.join(', ');
        try{ self.plugin._aplDrawEQGraph(canvas, presetArr); }catch(e){}
        try{ self.plugin._aplApplyEQ(); }catch(e){}
      };
    }

    // Render Presets 0-3 //
    for (var p=0;p<4;p++) makePresetRow(p);

  }catch(e){ try{ console.error('APL EQ settings UI failed', e); }catch(_){ } }
})();

  // Break line above "Re-scan all playlists" //
  containerEl.createEl('div', { cls: 'apl-section-break' });

  // Keep remaining settings area as-is for better grouping. Looks better in on smaller devices like iPad and mobile devices //
  new Setting(containerEl)
    .setName('Re-scan all playlists')
    .addButton(function(btn){ btn.setButtonText('Scan All').onClick(() => self.plugin.indexAll());


  new Setting(containerEl)
    .setName('YouTube privacy (youtube-nocookie.com)')
    .setDesc('Use the privacy-enhanced domain for YouTube embeds. Helps avoid Error 153.')
    .addToggle(t=>{
      t.setValue(self.plugin.settings.youtubePrivacy === true)
       .onChange(async v=>{ self.plugin.settings.youtubePrivacy = !!v; await self.plugin.saveSettings(); });
    });
 });

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
View.prototype.getIcon = function(){ return 'cassette-tape'; };
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
  fillPlaylistOptions(this.plugin, sel);
  // Add refresh button next to playlist dropdown //
  var refreshBtn = mk('button','ap-refresh-btn','⟳');
  refreshBtn.title = 'Re-scan playlists';
  refreshBtn.onclick = function(){ try{ this.plugin.indexAll(); new Notice('Audio PlugList: Re-scanning playlists…'); }catch(e){} }.bind(this);
  rowTop.appendChild(refreshBtn);
 if (this.plugin.currentPlaylist>=0) sel.value = String(this.plugin.currentPlaylist);
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
        var targetHeight = _isSet ? 600 : 420; // ensures large UI for tracks //

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
          if (html){
            while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
            try {
              var doc = new DOMParser().parseFromString(html, 'text/html');
              var body = doc && doc.body;
              if (body){
                Array.from(body.childNodes).forEach(function(n){ wrap.appendChild(n); });
              }
            } catch(_e){
            }
          }
        });
      }
    } catch(e){}

    try {
      var _openSrc = (activeEmbed && (activeEmbed.original || activeEmbed.src)) || (cfgp && cfgp.link) || '';
      var btnRow = mk('div','ap-row ap-embed-actions');
      var btn = mk('button','ap-open-ext ap-open-ext--mini','Optional: Open In Browser');
      btn.onclick = function(){ try{ window.open(_openSrc, '_blank'); }catch(e){} };
      btnRow.appendChild(btn);
// Add single-playlist re-scan button (mini)
var resBtn = mk('button','ap-open-ext ap-open-ext--mini','Re-scan playlist');
resBtn.onclick = function(){ try{ var _cp = cp; this.plugin.indexPlaylist(_cp).then(()=>{ new Notice('Audio PlugList: re-scanned this playlist.'); if (this.plugin.onUiRefresh) this.plugin.onUiRefresh(); }); }catch(e){} }.bind(this);
btnRow.appendChild(resBtn);

      col.appendChild(btnRow);
    } catch(e){}

  }

  // Controls (hidden when an external embed is active) //
  var controls = null;
  if (!(activeEmbed && activeEmbed.src)) { controls = mk('div', 'ap-row ap-controls'); col.appendChild(controls); }
  var prev = mk('button', '', 'Prev ◀︎◀︎'); prev.title='Previous track';
  var play = mk('button', '', (this.plugin.audio.paused ? 'Play ▶︎' : 'Pause Ⅱ')); play.title='Play/pause';
  var next = mk('button', '', 'Skip ▶︎▶︎'); next.title='Next track';
  var stop = mk('button', '', 'Stop ■'); stop.title='Stop (fade)';
  var shuffle = mk('button', '', this.plugin.shuffle ? 'Shuffle (ON)' : 'Shuffle'); shuffle.title='Shuffle';
  var rptLabel = this.plugin.repeatMode === 'all' ? 'Repeat (All)' : (this.plugin.repeatMode === 'one' ? 'Repeat (One)' : 'Repeat');
  var repeatBtn = mk('button', '', rptLabel); repeatBtn.title='Repeat mode';
  var eqBtn = mk('button', '', 'EQ'); eqBtn.title='Equalizer preset (click to cycle)';
  if (controls) { controls.appendChild(prev); controls.appendChild(play); controls.appendChild(next); controls.appendChild(stop); controls.appendChild(shuffle); controls.appendChild(repeatBtn); controls.appendChild(eqBtn); }

  if (controls) prev.onclick = function(){ this.plugin.prev(); }.bind(this);
  if (controls) play.onclick = function(){ this.plugin.togglePlay(); play.textContent = (this.plugin.audio.paused ? 'Play ▶︎' : 'Pause Ⅱ'); }.bind(this);
  if (controls) next.onclick = function(){ this.plugin.next(); }.bind(this);
  if (controls) stop.onclick = function(){ if (this.plugin.settings.fadeOnStop) this.plugin.stopFade(this.plugin.settings.fadeMs||3000); else this.plugin.stop(); }.bind(this);
  if (controls && this.plugin.shuffle) shuffle.classList.add('is-active');
  if (controls) shuffle.onclick = function(){ this.plugin.toggleShuffle(); shuffle.textContent = this.plugin.shuffle ? 'Shuffle (ON)' : 'Shuffle'; shuffle.classList.toggle('is-active', this.plugin.shuffle); }.bind(this);
  if (controls) repeatBtn.classList.toggle('is-active', this.plugin.repeatMode !== 'off');
  if (controls) repeatBtn.onclick = function(){ this.plugin.cycleRepeat(); var lbl = this.plugin.repeatMode === 'all' ? 'Repeat (All)' : (this.plugin.repeatMode === 'one' ? 'Repeat (One)' : 'Repeat'); repeatBtn.textContent = lbl; repeatBtn.classList.toggle('is-active', this.plugin.repeatMode !== 'off'); }.bind(this);

  // EQ preset cycle button //
  if (controls) {
    try{ this.plugin._aplSyncEqButtonState(eqBtn); }catch(_){}
    eqBtn.onclick = function(){
      try{ this.plugin._aplCycleEqPreset(); }catch(_){}
      try{ this.plugin._aplSyncEqButtonState(eqBtn); }catch(_){}
    }.bind(this);
  }

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
      fadeMs: 3000,
      youtubePrivacy: true,
eqBands: [32,62,128,250,500,1000,2000,4000,8000,16000],
eqPresets: [
  [0,0,0,0,0,0,0,0,0,0],                                // Preset 0 — Default (Flat)
  [3,2.5,1.5,0.5,0,-0.5,0,0.5,1,1.5],                    // Preset 1 — Warm
  [0,0.5,1,1.5,3,3.5,4,3.5,2,1.5],                       // Preset 2 — Bright
  [3,2.5,2,0.5,-1.5,-2,-0.5,1.5,2.5,2]                   // Preset 3 — V-Curve
],
activeEQ: "none",
    }, await this.loadData());

    this.tracksByPlaylist = Array.from({length: this.settings.playlists.length}, ()=>[]);
    this.embedByPlaylist = Array.from({length: this.settings.playlists.length}, ()=>null);
    this.currentPlaylist = (this.settings.playlists.length ? clamp(this.settings.currentPlaylist, 0, this.settings.playlists.length-1) : -1);
    this.queue = [];
    this.index = -1;
    this.audio = new Audio();
// Equalizer (menu-only; applies to local audio playback only) //
this._aplEq = { ctx: null, source: null, filters: null };
try { this._aplInitEQ(this.audio); } catch(e) { try{console.error('APL EQ init failed', e);}catch(_){} }
    this.shuffle = true; // default 'true' by user request //
    this.repeatMode = 'all'; // default 'all' by user request //
    this.onUiRefresh = null;

    this.audio.addEventListener('ended', this._onEnded.bind(this));

    // Ribbon icon //
    this.addRibbonIcon('cassette-tape', 'Audio PlugList', () => this.activateView());

    this.registerView(VIEW_TYPE, (leaf) => new View(leaf, this));

    this.addCommand({ id:'apl-open', name:'Open Audio PlugList', callback: () => this.activateView() });
    this.addCommand({ id:'apl-play-pause', name:'Play/pause', callback: () => this.togglePlay() });
    this.addCommand({ id:'apl-next', name:'Next track', callback: () => this.next() });
    this.addCommand({ id:'apl-prev', name:'Previous track', callback: () => this.prev() });
    this.addCommand({ id:'apl-stop', name:'Stop (fade out)', callback: () => this.stopFade(3000) });
    this.addCommand({ id:'apl-rescan-all', name:'Rescan all playlists', callback: () => this.indexAll() });

    this.addSettingTab(new SettingsTab(this.app, this));

    // Register per-playlist hotkeys (one command per playlist) //
    this._registerPlaylistHotkeys();

    if (this.settings.autoIndexOnLoad){
      const run = async ()=>{ try{ await this.indexAll(); }catch(e){} };
      if (this.app.workspace && this.app.workspace.onLayoutReady){ this.app.workspace.onLayoutReady(run); }
      else setTimeout(run, 800);
    }
    this._applyFooterVisibility = function(){ if (this.settings.showFooter){ this._attachFooter(); } else { this._detachFooter(); } };
    this._applyFooterVisibility();
  }

  onunload() {
        try{ this._aplDestroyEQ(); }catch(e){}
this._detachFooter();
    this.audio.pause(); this.audio.src = '';
  }

  async saveSettings(){ await this.saveData(this.settings); try{ this._registerPlaylistHotkeys(); }catch(e){} }

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
    fillPlaylistOptions(this, sel);
 if (this.currentPlaylist>=0) sel.value = String(this.currentPlaylist);
    sel.onchange = function(){ if (sel.value!=='-1') this.setCurrentPlaylist(Number(sel.value)); }.bind(this);

    // Segmented controls ⏮ | ⏯ | ⏭ | ⏹ | 🔀 | 🔁 - some of these had to be done the way that are. Switched from 1.0.3 due to mobile and device view issues so below ones are different but working. //
    var controls = el.createEl('div', { cls:'ap-footer-group' });
    var bPrev = controls.createEl('button', { cls:'ap-footer-seg no-active plain', text:'◀︎◀︎', title:'Previous' }); bPrev.onclick = ()=>this.prev();
    var bPlay = controls.createEl('button', { cls:'ap-footer-seg', text:(this.audio.paused?'▶':'Ⅱ'), title:'Play/Pause' }); bPlay.onclick = ()=>{ this.togglePlay(); bPlay.textContent = this.audio.paused ? '▶' : 'Ⅱ'; };
    var bNext = controls.createEl('button', { cls:'ap-footer-seg no-active plain', text:'▶︎▶︎', title:'Skip' }); bNext.onclick = ()=>this.next();
    var bStop = controls.createEl('button', { cls:'ap-footer-seg no-active plain', text:'■', title:'Stop' }); bStop.onclick = ()=>{ if (this.settings.fadeOnStop) this.stopFade(this.settings.fadeMs||3000); else this.stop(); };
    var bShuf = controls.createEl('button', { cls:'ap-footer-seg', text:'🔀', title:'Shuffle' }); bShuf.onclick = ()=>{ this.toggleShuffle(); bShuf.classList.toggle('is-active', this.shuffle); };
    var bRpt  = controls.createEl('button', { cls:'ap-footer-seg', text:(this.repeatMode==='one'?'🔂':'🔁'), title:'Repeat' }); bRpt.onclick = ()=>{ this.cycleRepeat(); bRpt.textContent = (this.repeatMode==='one'?'🔂':'🔁'); bRpt.classList.toggle('is-active', this.repeatMode!=='off'); };


    // EQ preset cycle button (0-3) //
    var bEq = controls.createEl('button', { cls:'ap-footer-seg', text:'EQ', title:'Equalizer preset (click to cycle)' });
    this._aplEqFooterBtn = bEq;
    try{ this._aplSyncEqButtonState(bEq); }catch(_){}
    bEq.onclick = async () => {
      try{ this._aplCycleEqPreset(); }catch(_){}
      try{ this._aplSyncEqButtonState(bEq); }catch(_){}
    };

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

    // init active states only for shuffle/repeat //
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
  _detachFooter(){ if (this.footerEl){ this.footerEl.remove(); this.footerEl = null; } this._aplEqFooterBtn = null; }

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

  setCurrentPlaylist(i){
    if (!this.settings.playlists.length){
      this.currentPlaylist = -1;
      this._applyPlaylistQueue();
      if (typeof this.onUiRefresh === 'function') this.onUiRefresh();
      return;
    }
    var next = clamp(i,0,this.settings.playlists.length-1);
    if (this.currentPlaylist !== next){
      try{ this._stopAllPlayback(); }catch(_){ }
    }
    this.currentPlaylist = next;
    this.settings.currentPlaylist = this.currentPlaylist;
    this.saveSettings();
    this._applyPlaylistQueue();
    if (typeof this.onUiRefresh === 'function') this.onUiRefresh();
  }


  
  // Per-playlist Hotkeys //
  togglePlaylistByIndex(i){
    try{
      i = Number(i);
      if (!isFinite(i)) return;
      if (i<0 || i >= (this.settings.playlists ? this.settings.playlists.length : 0)) return;
      if (this.currentPlaylist !== i) this.setCurrentPlaylist(i);
      this.togglePlay();
    }catch(e){ try{console.error('APL togglePlaylistByIndex error', e);}catch(_){} }
  }

  _registerPlaylistHotkeys(){
    try{
      const cmdApi = (this.app && this.app.commands) ? this.app.commands : null;
      const cmds = cmdApi && cmdApi.commands ? cmdApi.commands : {};
      const pls = (this.settings && Array.isArray(this.settings.playlists)) ? this.settings.playlists : [];
      for (let i=0;i<pls.length;i++){
        const cfg = pls[i] || {};
        const id = `apl-toggle-playlist-${i}`;
        const label = `Toggle play/pause — ${cfg.name || ('Playlist ' + (i+1))}`;
        if (!(cmds && cmds[id])){
          this.addCommand({ id, name: label, callback: ()=> this.togglePlaylistByIndex(i) });
        } else {
          // Update name & callback in place so bindings persist //
          try { cmds[id].name = label; } catch(_){}
          try { cmds[id].callback = ()=> this.togglePlaylistByIndex(i); } catch(_){}
        }
      }
    }catch(e){ try{console.error('APL _registerPlaylistHotkeys error', e);}catch(_){} }
  }


  // Indexing //
  
  // Stop any active playback (internal audio + external embeds) //
  _stopAllPlayback(){
    try{
      if (this.audio){ try{ this.audio.pause(); }catch(_){ } try{ this.audio.currentTime = 0; }catch(_){ } }
      try{
        var frames = document.querySelectorAll('.ap-embedbox iframe');
        frames.forEach(function(fr){ try{ fr.src = 'about:blank'; }catch(_){ } });
      }catch(_){ }
    }catch(_){ }
    try{ if (this.onUiRefresh) this.onUiRefresh(); }catch(_){ }
  }
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
      this.embedByPlaylist[i]  = { provider:'youtube', src: (self?self.plugin.settings.youtubePrivacy:this.settings.youtubePrivacy) ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(ytid)}&rel=0&modestbranding=1&enablejsapi=1` : `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(ytid)}&rel=0&modestbranding=1&enablejsapi=1`, height: 480, original: link };
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
    // Deezer playlist (no iframe embed; open externally due to login overlay) //
    var dzid = getDeezerPlaylistId(link);
    if (dzid){
      this.tracksByPlaylist[i] = []; // avoid trying to parse tracks here //
      this.embedByPlaylist[i]  = null; // no embed; rely on action row buttons //
      try { new Notice('Deezer playlist detected. Use "Open In Browser" to play.'); } catch(e) {}
      return;
    }

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
    var fp = normalizePath((cfg.folderPath||'').trim());
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


// ===== Equalizer Engine (menu-only) ===== //
_aplHasWebAudio(){
  try{ return !!(window.AudioContext || window.webkitAudioContext); }catch(e){ return false; }
}
_aplInitEQ(audioEl){
  if (!audioEl || !this._aplHasWebAudio()) return;
  if (this._aplEq && this._aplEq.ctx && this._aplEq.source) return; // already init //

  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let source = null;
  try {
    source = ctx.createMediaElementSource(audioEl);
  } catch(e){
    // If this fails (rare), just skip EQ rather than breaking the plugin. //
    try{ console.warn('APL EQ: createMediaElementSource failed, bypassing EQ.', e); }catch(_){}
    try{ ctx.close(); }catch(_){}
    return;
  }

  const freqs = (this.settings && Array.isArray(this.settings.eqBands) && this.settings.eqBands.length===10)
    ? this.settings.eqBands
    : [32,62,128,250,500,1000,2000,4000,8000,16000];

  const filters = freqs.map((freq) => {
    const f = ctx.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = freq;
    f.Q.value = 1.1;
    f.gain.value = 0;
    return f;
  });

  // Chain: source -> f0 -> ... -> f9 -> destination //
  let chain = source;
  for (let i=0;i<filters.length;i++){ chain.connect(filters[i]); chain = filters[i]; }
  chain.connect(ctx.destination);

  this._aplEq = { ctx, source, filters };

  // Resume on user gesture/play //
  try{
    audioEl.addEventListener('play', () => {
      try{ if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{}); }catch(_){}
    });
  }catch(_){}

  // Apply current preset //
  this._aplApplyEQ();
}

_aplEqPresetName(i){
  try{
    const n = Number(i);
    if (n === 0) return "Preset 0 — Default";
    if (n === 1) return "Preset 1 — Warm";
    if (n === 2) return "Preset 2 — Bright";
    if (n === 3) return "Preset 3 — V-Curve";
  }catch(_){}
  return "Preset";
}

_aplSyncEqButtonState(btn){
  try{
    if (!btn) return;
    const active = (this.settings && (this.settings.activeEQ !== undefined)) ? this.settings.activeEQ : "none";
    let idx = (active === "none" || active === null || active === undefined || active === "") ? null : Number(active);
    if (idx === null || !isFinite(idx)) idx = null;

    const label = (idx === null) ? "EQ" : ("EQ" + idx);
    btn.textContent = label;

    if (idx === null){
      btn.title = "Equalizer: None (click to cycle presets 0–3)";
    } else {
      btn.title = "Equalizer: " + this._aplEqPresetName(idx) + " (click to cycle)";
    }
  }catch(_){}
}

_aplCycleEqPreset(){
  try{
    const active = (this.settings && (this.settings.activeEQ !== undefined)) ? this.settings.activeEQ : "none";
    let idx = (active === "none" || active === null || active === undefined || active === "") ? -1 : Number(active);
    if (!isFinite(idx)) idx = -1;

    // cycle: none -> 0 -> 1 -> 2 -> 3 -> 0 ... //
    idx = (idx < 0) ? 0 : ((idx + 1) % 4);

    this.settings.activeEQ = idx;

    // persist + apply //
    try{ this.saveSettings(); }catch(_){}
    try{ this._aplApplyEQ(); }catch(_){}

    // keep footer button in sync //
    try{ if (this._aplEqFooterBtn) this._aplSyncEqButtonState(this._aplEqFooterBtn); }catch(_){}
  }catch(e){
    try{ console.error("APL EQ cycle error", e); }catch(_){}
  }
}


_aplDestroyEQ(){
  try{
    if (this._aplEq && this._aplEq.filters){
      try{ this._aplEq.filters.forEach(f=>{ try{ f.disconnect(); }catch(_){}}); }catch(_){}
    }
    if (this._aplEq && this._aplEq.source){ try{ this._aplEq.source.disconnect(); }catch(_){ } }
    if (this._aplEq && this._aplEq.ctx){ try{ this._aplEq.ctx.close(); }catch(_){ } }
  }catch(_){}
  this._aplEq = { ctx:null, source:null, filters:null };
}

_aplApplyEQ(){
  try{
    if (!this._aplEq || !this._aplEq.filters) return;

    const filters = this._aplEq.filters;
    const active = (this.settings && (this.settings.activeEQ !== undefined)) ? this.settings.activeEQ : "none";

    // none => bypass (all gains 0) //
    if (active === "none" || active === null || active === undefined){
      for (let i=0;i<filters.length;i++) filters[i].gain.value = 0;
      return;
    }

    let idx = Number(active);
    if (!isFinite(idx)) idx = 0;
    idx = Math.max(0, Math.min(3, idx));

    const presets = (this.settings && Array.isArray(this.settings.eqPresets)) ? this.settings.eqPresets : null;
    const preset = (presets && presets[idx] && presets[idx].length===10) ? presets[idx] : [0,0,0,0,0,0,0,0,0,0];

    for (let i=0;i<filters.length;i++){
      const v = Number(preset[i] || 0);
      filters[i].gain.value = isFinite(v) ? v : 0;
    }
  }catch(e){ try{ console.warn('APL EQ apply failed', e); }catch(_){ } }
}

_aplDrawEQGraph(canvas, values){
  try{
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // background grid //
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--background-secondary') || '#222';
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    for (let i=1;i<5;i++){
      const y = (h/5)*i;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }

    ctx.strokeStyle = '#a78bfa'; // purple-ish //
    ctx.lineWidth = 2;
    ctx.beginPath();

    const arr = Array.isArray(values) ? values : [];
    const step = w / (10 - 1);
    for (let i=0;i<10;i++){
      const v = Number(arr[i] || 0);
      const y = (h/2) - (isFinite(v)?v:0) * 5.5;
      const x = i * step;
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }catch(_){}
}

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
    if (++count > 15) clearInterval(timer); // ~12s //
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
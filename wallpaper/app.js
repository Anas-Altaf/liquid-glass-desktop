(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res2) => function __init() {
    return fn && (res2 = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res2;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/js/core/bus.js
  var handlers, bus;
  var init_bus = __esm({
    "src/js/core/bus.js"() {
      handlers = /* @__PURE__ */ new Map();
      bus = {
        on(type, fn) {
          (handlers.get(type) || handlers.set(type, /* @__PURE__ */ new Set()).get(type)).add(fn);
          return () => handlers.get(type).delete(fn);
        },
        emit(type, detail) {
          (handlers.get(type) || []).forEach((fn) => {
            try {
              fn(detail);
            } catch (e) {
              console.error(e);
            }
          });
        }
      };
    }
  });

  // src/js/core/util.js
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = a + 1831565813 | 0;
      let t2 = Math.imul(a ^ a >>> 15, 1 | a);
      t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
      return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
    };
  }
  var $, $$, clamp, fmt, reducedMotion, hash, el;
  var init_util = __esm({
    "src/js/core/util.js"() {
      $ = (s, root = document) => root.querySelector(s);
      $$ = (s, root = document) => [...root.querySelectorAll(s)];
      clamp = (v, a, b) => Math.min(b, Math.max(a, v));
      fmt = (s) => {
        s = Math.max(0, Math.floor(s));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      };
      reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
      hash = (str) => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
      el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
      };
    }
  });

  // src/js/core/store.js
  var PREFIX, store;
  var init_store = __esm({
    "src/js/core/store.js"() {
      PREFIX = "glassdesk:";
      store = {
        get(key, fallback) {
          try {
            const v = localStorage.getItem(PREFIX + key);
            return v == null ? fallback : JSON.parse(v);
          } catch {
            return fallback;
          }
        },
        set(key, value) {
          try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
          } catch {
          }
        }
      };
    }
  });

  // src/js/core/settings.js
  function merge(base, over) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    if (!isObj(over)) return out;
    for (const k of Object.keys(over)) out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k];
    return out;
  }
  function update(patch, { silent = false, source = "" } = {}) {
    for (const [k, v] of Object.entries(patch)) cfg[k] = isObj(cfg[k]) && isObj(v) && !Array.isArray(v) ? merge(cfg[k], v) : v;
    persist();
    if (!silent) bus.emit("settings", { patch, source });
  }
  function set(path, value, opts) {
    const keys = path.split("."), top = keys[0];
    if (keys.length === 1) {
      cfg[top] = value;
      persist();
      emit(top, path, opts);
      return;
    }
    const obj = structuredClone(cfg[top] ?? {});
    let o = obj;
    keys.slice(1, -1).forEach((k) => {
      o[k] = isObj(o[k]) ? o[k] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = value;
    cfg[top] = obj;
    persist();
    emit(top, path, opts);
  }
  function unset(path, opts) {
    const keys = path.split("."), top = keys[0];
    if (keys.length === 1) {
      cfg[top] = structuredClone(DEFAULTS[top]);
      persist();
      emit(top, path, opts);
      return;
    }
    const obj = structuredClone(cfg[top] ?? {});
    let o = obj;
    for (const k of keys.slice(1, -1)) {
      if (!isObj(o[k])) return;
      o = o[k];
    }
    if (!(keys[keys.length - 1] in o)) return;
    delete o[keys[keys.length - 1]];
    cfg[top] = obj;
    persist();
    emit(top, path, opts);
  }
  function emit(top, path, opts) {
    if (!(opts && opts.silent)) bus.emit("settings", { patch: { [top]: cfg[top] }, source: opts && opts.source || "", path });
  }
  function resetAll() {
    saving = false;
    clearTimeout(t);
    store.set("settings", {});
    location.reload();
  }
  function exportAll() {
    return JSON.stringify({ settings: cfg, reminders: store.get("reminders", []), notes: store.get("notes", "") }, null, 2);
  }
  function importAll(json) {
    const d = JSON.parse(json);
    saving = false;
    clearTimeout(t);
    if (d.settings) store.set("settings", d.settings);
    if (d.reminders) store.set("reminders", d.reminders);
    if (typeof d.notes === "string") store.set("notes", d.notes);
    location.reload();
  }
  var WIDGETS, DEFAULTS, isObj, saved, cfg, t, persist, saving;
  var init_settings = __esm({
    "src/js/core/settings.js"() {
      init_store();
      init_bus();
      WIDGETS = [
        ["clock", "Clock", "Digital, analog and more"],
        ["weather", "Weather", "Conditions and the next hours"],
        ["music", "Music", "Player with playlist"],
        ["calendar", "Calendar", "This month at a glance"],
        ["world", "World Clock", "Time in other cities"],
        ["reminders", "Reminders", "A short to-do list"],
        ["notes", "Notes", "A scratch pad that saves itself"],
        ["focus", "Focus Timer", "Timed focus sessions"],
        ["system", "System", "Battery, network and display"],
        ["visualizer", "Visualizer", "Free-standing music visualizer"]
      ];
      DEFAULTS = {
        widgets: { clock: false, weather: true, music: true, calendar: true, world: false, reminders: true, notes: false, focus: false, system: false, visualizer: false },
        positions: {},
        // id -> {ax:"l"|"r", ay:"t"|"b", x, y} px from the anchored edges
        cards: {},
        // id -> per-card overrides {blur, sat, bright, tint, radius, rim, shine, refraction, width}
        glass: { blur: 14, sat: 180, bright: 1, tint: 0.06, radius: 26, rim: 0.45, shine: 0.5, refraction: 1, quality: "balanced", react: "near", reactRadius: 220, shadow: 0.24 },
        wallpaper: { kind: "theme", theme: "dusk", motion: true, speed: 1, fps: 60, colorA: "#1f2a6b", colorB: "#e0707a", gradStyle: "linear", gradAngle: 160, gradFlow: false, fit: "cover", slideEvery: 60, dim: 0, audioReactive: true, media: "" },
        island: { mode: "island", expandOnHover: true, showTime: true, showWeather: true, seconds: false, battery: "percent", showNetwork: true, showNowPlaying: true, showCC: true, showMenu: true },
        dock: { mode: "hidden", shortcuts: [
          { id: "s1", name: "Settings", kind: "action", target: "settings", icon: "gear" },
          { id: "s2", name: "Edit layout", kind: "action", target: "edit", icon: "grid" },
          { id: "s3", name: "Display settings", kind: "uri", target: "ms-settings:display", icon: "display" }
        ] },
        clock: {
          style: "digital",
          seconds: false,
          date: true,
          h24: !new Intl.DateTimeFormat(void 0, { hour: "numeric" }).resolvedOptions().hour12,
          size: 1,
          weight: "auto",
          font: "system",
          numerals: "four",
          leadingZero: false,
          ampm: true,
          blink: false,
          dateFormat: "long",
          align: "left"
        },
        hero: { show: true, style: "digital", size: 1, date: true, weight: "auto", seconds: false, font: "system", numerals: "four", color: "auto", opacity: 1, shadow: 0.25, plate: false, align: "center" },
        calendar: { weekStart: 0 },
        music: { source: "auto", repeat: "all", shuffle: false, continuous: true, volume: 0.8, order: [] },
        viz: { card: true, island: true, edge: false, style: "bars", color: "ink", sensitivity: 1, bars: 48, edgeHeight: 90 },
        style: "clear",
        look: "liquid",
        // last preset applied in Settings › Themes
        skin: "glass",
        // surface style: glass, brutal, neon, paper, retro, clay
        layoutMode: "columns",
        // where cards flow: columns, left, right, bento, row
        lockLayout: false,
        accent: "auto",
        uiFont: "system",
        keyboard: "auto",
        // on-screen keyboard: auto (Wallpaper Engine), on, off
        reduce: false,
        focusMode: false,
        city: "London",
        unit: "c",
        geo: null,
        // geo: {name, latitude, longitude, label} when picked from search
        cities: ["Europe/London", "America/New_York", "Asia/Tokyo"],
        weLast: {},
        // last values seen from Wallpaper Engine's properties
        version: 2
      };
      isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
      saved = store.get("settings", {});
      cfg = merge(DEFAULTS, saved);
      if (!(saved.version >= 2) && Object.keys(saved).length) {
        const was = saved.clock || {};
        cfg.hero.seconds = cfg.island.seconds = !!was.seconds;
        if (cfg.hero.weight === 700) cfg.hero.weight = "auto";
        cfg.version = 2;
      }
      persist = () => {
        clearTimeout(t);
        t = setTimeout(() => saving && store.set("settings", cfg), 120);
      };
      saving = true;
      addEventListener("pagehide", () => {
        if (saving) store.set("settings", cfg);
      });
    }
  });

  // src/js/core/idb.js
  function db() {
    if (!dbp) dbp = new Promise((res2, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("no idb"));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => res2(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  var DB, STORE, dbp, tx, files;
  var init_idb = __esm({
    "src/js/core/idb.js"() {
      DB = "glassdesk";
      STORE = "files";
      tx = async (mode, fn) => {
        const d = await db();
        return new Promise((res2, rej) => {
          const t2 = d.transaction(STORE, mode);
          const r = fn(t2.objectStore(STORE));
          t2.oncomplete = () => res2(r && r.result);
          t2.onerror = () => rej(t2.error);
        });
      };
      files = {
        put: (rec) => tx("readwrite", (s) => s.put(rec)).catch(() => null),
        get: (id) => tx("readonly", (s) => s.get(id)).catch(() => null),
        all: () => tx("readonly", (s) => s.getAll()).catch(() => []),
        del: (id) => tx("readwrite", (s) => s.delete(id)).catch(() => null)
      };
    }
  });

  // src/js/audio/tracks.js
  var TRACKS;
  var init_tracks = __esm({
    "src/js/audio/tracks.js"() {
      TRACKS = [
        {
          id: "salt",
          title: "Salt & Sodium",
          artist: "Marina Vale",
          album: "Tidal Hours",
          bpm: 92,
          root: 62,
          scale: [0, 2, 3, 5, 7, 9, 10],
          prog: [0, 5, 3, 4],
          bars: 64,
          kick: "1000000010100000",
          hat: "0010001000100010",
          snare: "0000100000001000",
          bass: "1000001010000010",
          pad: "sawtooth",
          lead: "triangle",
          arp: 2,
          pal: { bg: "#f2e4cc", a: "#ff5b3a", b: "#1c35c8", c: "#f2e4cc" },
          tint: null,
          accent: "#ffb09e",
          deep: "#1c35c8",
          glass: "light"
        },
        {
          id: "lanterns",
          title: "Paper Lanterns",
          artist: "Okoye & The Lows",
          album: "Lanternfield",
          bpm: 80,
          root: 65,
          scale: [0, 2, 4, 5, 7, 9, 11],
          prog: [0, 4, 5, 3],
          bars: 48,
          kick: "1000000000100000",
          hat: "0000100000001000",
          snare: "0000000010000000",
          bass: "1000000010000000",
          pad: "triangle",
          lead: "sine",
          arp: 2,
          pal: { bg: "#3e1450", a: "#f6b400", b: "#f0628f", c: "#f7e6d2" },
          tint: "rgba(40, 10, 54, 0.16)",
          accent: "#f6b400",
          deep: "#3e1450"
        },
        {
          id: "orbit",
          title: "Low Orbit",
          artist: "Kasia Wren",
          album: "Perigee",
          bpm: 108,
          root: 57,
          scale: [0, 2, 3, 5, 7, 8, 10],
          prog: [0, 5, 2, 6],
          bars: 72,
          kick: "1000001000100000",
          hat: "1010101010101010",
          snare: "0000100000001000",
          bass: "1001001000100100",
          pad: "sawtooth",
          lead: "square",
          arp: 1,
          pal: { bg: "#0f1b3d", a: "#14a699", b: "#9ef0dc", c: "#0b6e68" },
          tint: "rgba(6, 14, 38, 0.14)",
          accent: "#9ef0dc",
          deep: "#0f1b3d"
        },
        {
          id: "ostia",
          title: "Night Bus to Ostia",
          artist: "Ferro",
          album: "Linea 7",
          bpm: 120,
          root: 64,
          scale: [0, 1, 3, 5, 7, 8, 10],
          prog: [0, 1, 0, 6],
          bars: 80,
          kick: "1000100010001000",
          hat: "0010001000100010",
          snare: "0000100000001000",
          bass: "1010001010100010",
          pad: "square",
          lead: "sawtooth",
          arp: 1,
          pal: { bg: "#2b1c93", a: "#ff2e88", b: "#ffb627", c: "#f6e9ff" },
          tint: "rgba(22, 10, 74, 0.14)",
          accent: "#ffb627",
          deep: "#2b1c93"
        },
        {
          id: "glasshouse",
          title: "Glasshouse",
          artist: "Juno Park",
          album: "Greenhouse Tapes",
          bpm: 74,
          root: 60,
          scale: [0, 2, 4, 6, 7, 9, 11],
          prog: [0, 1, 4, 5],
          bars: 44,
          kick: "1000000000000000",
          hat: "0000000010000000",
          snare: "0000000000000000",
          bass: "1000000000100000",
          pad: "triangle",
          lead: "sine",
          arp: 2,
          pal: { bg: "#0e5a3c", a: "#ff9dc6", b: "#fbe9d2", c: "#3fb37f" },
          tint: "rgba(4, 38, 26, 0.16)",
          accent: "#ff9dc6",
          deep: "#0e5a3c"
        },
        {
          id: "signal",
          title: "Slow Signal",
          artist: "Ama Reyes",
          album: "Static Bloom",
          bpm: 100,
          root: 59,
          scale: [0, 2, 3, 5, 7, 8, 10],
          prog: [0, 6, 5, 4],
          bars: 64,
          kick: "1000000010000000",
          hat: "0010101000101010",
          snare: "0000100000001000",
          bass: "1000000110000100",
          pad: "sawtooth",
          lead: "triangle",
          arp: 2,
          pal: { bg: "#e8431f", a: "#3a0b12", b: "#fbe3cf", c: "#e8431f" },
          tint: "rgba(60, 10, 16, 0.22)",
          accent: "#fbe3cf",
          deep: "#3a0b12"
        }
      ];
      TRACKS.forEach((t2) => {
        t2.duration = t2.bars * 4 * 60 / t2.bpm;
      });
    }
  });

  // src/js/audio/engine.js
  var Engine;
  var init_engine = __esm({
    "src/js/audio/engine.js"() {
      init_util();
      Engine = class {
        constructor() {
          this.ctx = null;
          this.track = null;
          this.anchorPos = 0;
          this.anchorTime = 0;
          this.playing = false;
          this.volume = 0.8;
          this.muted = false;
        }
        ensure() {
          if (this.ctx) return;
          const AC = window.AudioContext || window.webkitAudioContext;
          const ctx = this.ctx = new AC();
          this.comp = ctx.createDynamicsCompressor();
          this.comp.threshold.value = -16;
          this.comp.ratio.value = 3.5;
          this.comp.attack.value = 0.01;
          this.comp.release.value = 0.2;
          this.out = ctx.createGain();
          this.applyVolume();
          this.analyser = ctx.createAnalyser();
          this.analyser.fftSize = 256;
          this.analyser.smoothingTimeConstant = 0.78;
          this.comp.connect(this.out);
          this.out.connect(this.analyser);
          this.analyser.connect(ctx.destination);
          this.verb = ctx.createConvolver();
          this.verb.buffer = this.impulse(2.4);
          this.verbOut = ctx.createGain();
          this.verbOut.gain.value = 0.5;
          this.verb.connect(this.verbOut);
          this.verbOut.connect(this.comp);
          const len = ctx.sampleRate;
          this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
          const d = this.noise.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          this.timer = setInterval(() => this.tick(), 25);
        }
        impulse(sec) {
          const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), buf2 = ctx.createBuffer(2, len, ctx.sampleRate);
          for (let c = 0; c < 2; c++) {
            const d = buf2.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
          }
          return buf2;
        }
        applyVolume() {
          if (this.out) this.out.gain.setTargetAtTime(this.muted ? 0 : this.volume * this.volume * 0.9, this.ctx.currentTime, 0.03);
        }
        setVolume(v) {
          this.volume = v;
          this.applyVolume();
        }
        setMuted(m) {
          this.muted = m;
          this.applyVolume();
        }
        get position() {
          if (!this.ctx || !this.track) return this.anchorPos;
          return clamp(this.anchorPos + Math.max(0, this.ctx.currentTime - this.anchorTime), 0, this.track.duration);
        }
        load(track, pos = 0) {
          this.track = track;
          this.anchorPos = pos;
          if (this.ctx) this.startSession(pos);
        }
        startSession(pos) {
          const ctx = this.ctx, t2 = this.track;
          if (this.session) {
            const old = this.session;
            old.dry.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
            old.wet.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
            setTimeout(() => {
              old.dry.disconnect();
              old.wet.disconnect();
            }, 400);
          }
          const dry = ctx.createGain(), wet = ctx.createGain();
          dry.connect(this.comp);
          wet.connect(this.verb);
          this.session = { dry, wet };
          this.sps = 60 / t2.bpm / 4;
          this.step = Math.ceil(pos / this.sps - 1e-6);
          this.anchorPos = pos;
          this.anchorTime = ctx.currentTime + 0.04;
          this.nextTime = this.anchorTime + (this.step * this.sps - pos);
          this.ended = false;
          if (this.step % 16 !== 0) {
            const bar = Math.floor(pos / (this.sps * 16));
            const left = (bar + 1) * 16 * this.sps - pos;
            this.padChord(bar, this.anchorTime, left);
          }
        }
        async play() {
          this.ensure();
          if (!this.session) this.startSession(this.anchorPos);
          if (this.ctx.state !== "running") await this.ctx.resume();
          this.playing = true;
        }
        async pause() {
          this.playing = false;
          if (this.ctx && this.ctx.state === "running") await this.ctx.suspend();
        }
        seek(pos) {
          pos = clamp(pos, 0, this.track.duration - 0.05);
          if (this.ctx) this.startSession(pos);
          else this.anchorPos = pos;
        }
        tick() {
          if (!this.session || !this.track || this.ctx.state !== "running") return;
          const ahead = document.hidden ? 1.5 : 0.14, total = this.track.bars * 16;
          while (this.nextTime < this.ctx.currentTime + ahead && this.step < total) {
            this.schedule(this.step, this.nextTime);
            this.step++;
            this.nextTime += this.sps;
          }
          if (!this.ended && this.position >= this.track.duration - 0.02) {
            this.ended = true;
            this.onended && this.onended();
          }
        }
        freq(deg, oct) {
          const t2 = this.track, L = t2.scale.length, o = Math.floor(deg / L), i = (deg % L + L) % L;
          return 440 * Math.pow(2, (t2.root + 12 * (oct + o) + t2.scale[i] - 69) / 12);
        }
        chord(bar) {
          const d = this.track.prog[bar % this.track.prog.length];
          return [d, d + 2, d + 4, d + 6];
        }
        section(bar) {
          const n = this.track.bars;
          if (bar < 4) return "intro";
          if (bar >= n - 4) return "outro";
          if (bar < Math.floor(n * 0.4)) return "a";
          if (bar < Math.floor(n * 0.5)) return "break";
          return "b";
        }
        schedule(step, time) {
          const t2 = this.track, s = step % 16, bar = Math.floor(step / 16), sec = this.section(bar), ch = this.chord(bar);
          const r = rng(hash(t2.id) + step * 7919);
          if (s === 0) this.padChord(bar, time, this.sps * 16);
          const drums = sec === "b" || sec === "a" && t2.bpm > 100;
          if (drums && t2.kick[s] === "1") this.kick(time);
          if ((sec === "a" || sec === "b") && t2.hat[s] === "1") this.hat(time, r() * 0.4 + 0.6);
          if (sec === "b" && t2.snare[s] === "1") this.snare(time);
          if ((sec === "a" || sec === "b" || sec === "break") && t2.bass[s] === "1" && sec !== "break") this.bass(this.freq(ch[0], -2), time, this.sps * 2.5);
          if (s % t2.arp === 0 && sec !== "intro") {
            const idx2 = s / t2.arp % 4, oct = s >= 8 && t2.arp === 1 ? 1 : 0;
            const shape = [0, 1, 2, 1, 3, 2, 1, 2];
            const deg = ch[shape[s / t2.arp % shape.length] % (sec === "break" ? 3 : 4)];
            this.pluck(this.freq(deg, oct), time, sec === "outro" ? 0.035 : 0.05, t2.lead === "square" ? "square" : "triangle");
            void idx2;
          }
          if (sec === "intro" && s % 4 === 0) this.pluck(this.freq(ch[s / 4 % 3], 1), time, 0.03, "sine");
          if (sec === "b" && s % 2 === 0 && r() < 0.42) {
            const pool = [ch[0], ch[1], ch[2], ch[0] + 1, ch[2] + 1];
            this.lead(this.freq(pool[Math.floor(r() * pool.length)], 1), time, this.sps * (2 + Math.floor(r() * 3) * 2));
          }
        }
        env(g, time, peak, a, dur, rel) {
          g.gain.setValueAtTime(1e-4, time);
          g.gain.exponentialRampToValueAtTime(peak, time + a);
          g.gain.setValueAtTime(peak, time + Math.max(a, dur - rel));
          g.gain.exponentialRampToValueAtTime(1e-4, time + dur);
        }
        padChord(bar, time, dur) {
          const ctx = this.ctx, t2 = this.track, ch = this.chord(bar);
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = t2.pad === "sawtooth" ? 1100 : 1800;
          lp.Q.value = 0.6;
          const g = ctx.createGain();
          this.env(g, time, 0.11, Math.min(0.8, dur * 0.4), dur + 0.4, Math.min(0.9, dur * 0.5));
          lp.connect(g);
          g.connect(this.session.dry);
          g.connect(this.session.wet);
          ch.slice(0, 3).forEach((deg, i) => {
            [-7, 7].forEach((cents) => {
              const o = ctx.createOscillator();
              o.type = t2.pad;
              o.frequency.value = this.freq(deg, i === 0 ? -1 : 0);
              o.detune.value = cents;
              const vg = ctx.createGain();
              vg.gain.value = 0.22;
              o.connect(vg);
              vg.connect(lp);
              o.start(time);
              o.stop(time + dur + 0.5);
            });
          });
        }
        bass(f, time, dur) {
          const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
          o.type = "triangle";
          o.frequency.value = f;
          o2.type = "sine";
          o2.frequency.value = f / 2;
          this.env(g, time, 0.3, 0.01, dur, dur * 0.6);
          o.connect(g);
          o2.connect(g);
          g.connect(this.session.dry);
          o.start(time);
          o2.start(time);
          o.stop(time + dur + 0.05);
          o2.stop(time + dur + 0.05);
        }
        pluck(f, time, peak, type) {
          const ctx = this.ctx, o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
          o.type = type;
          o.frequency.value = f;
          lp.type = "lowpass";
          lp.frequency.setValueAtTime(3200, time);
          lp.frequency.exponentialRampToValueAtTime(500, time + 0.3);
          this.env(g, time, peak, 5e-3, 0.42, 0.35);
          o.connect(lp);
          lp.connect(g);
          g.connect(this.session.dry);
          g.connect(this.session.wet);
          o.start(time);
          o.stop(time + 0.5);
        }
        lead(f, time, dur) {
          const ctx = this.ctx, t2 = this.track, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
          o.type = t2.lead;
          o.frequency.value = f;
          lfo.frequency.value = 5.2;
          lg.gain.value = f * 6e-3;
          lfo.connect(lg);
          lg.connect(o.frequency);
          lp.type = "lowpass";
          lp.frequency.value = t2.lead === "sawtooth" || t2.lead === "square" ? 1600 : 4e3;
          this.env(g, time, t2.lead === "sine" ? 0.09 : 0.055, 0.03, dur, dur * 0.5);
          o.connect(lp);
          lp.connect(g);
          g.connect(this.session.dry);
          g.connect(this.session.wet);
          o.start(time);
          lfo.start(time);
          o.stop(time + dur + 0.05);
          lfo.stop(time + dur + 0.05);
        }
        kick(time) {
          const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(150, time);
          o.frequency.exponentialRampToValueAtTime(42, time + 0.13);
          g.gain.setValueAtTime(0.85, time);
          g.gain.exponentialRampToValueAtTime(1e-4, time + 0.38);
          o.connect(g);
          g.connect(this.session.dry);
          o.start(time);
          o.stop(time + 0.4);
        }
        noiseHit(time, type, freq, peak, decay, wet) {
          const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
          src.buffer = this.noise;
          f.type = type;
          f.frequency.value = freq;
          g.gain.setValueAtTime(peak, time);
          g.gain.exponentialRampToValueAtTime(1e-4, time + decay);
          src.connect(f);
          f.connect(g);
          g.connect(this.session.dry);
          if (wet) g.connect(this.session.wet);
          src.start(time, Math.random() * 0.5);
          src.stop(time + decay + 0.02);
        }
        hat(time, v) {
          this.noiseHit(time, "highpass", 7600, 0.06 * v, 0.05, false);
        }
        snare(time) {
          this.noiseHit(time, "bandpass", 1900, 0.22, 0.2, true);
          const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(220, time);
          o.frequency.exponentialRampToValueAtTime(150, time + 0.08);
          g.gain.setValueAtTime(0.12, time);
          g.gain.exponentialRampToValueAtTime(1e-4, time + 0.12);
          o.connect(g);
          g.connect(this.session.dry);
          o.start(time);
          o.stop(time + 0.14);
        }
      };
    }
  });

  // src/js/audio/visualizer.js
  function feedWE(arr) {
    for (let i = 0; i < N; i++) spec[i] = spec[i] * 0.4 + (arr[i] + arr[64 + i]) / 2 * 0.6;
    weAt = performance.now();
  }
  function useAnalyser(a) {
    analyser = a;
    buf = a ? new Uint8Array(a.frequencyBinCount) : null;
  }
  function level() {
    let s = 0;
    for (let i = 0; i < 10; i++) s += spec[i];
    return Math.min(1, s / 10 * 1.4);
  }
  function sample() {
    if (performance.now() - weAt < 500) return;
    if (!analyser) {
      for (let i = 0; i < N; i++) spec[i] *= 0.9;
      return;
    }
    analyser.getByteFrequencyData(buf);
    for (let i = 0; i < N; i++) {
      const idx2 = Math.floor(Math.pow(i / N, 1.7) * buf.length * 0.75);
      spec[i] = spec[i] * 0.35 + buf[idx2] / 255 * 0.65;
    }
  }
  function attach(canvas, opts = {}) {
    const v = { canvas, opts };
    views.add(v);
    return () => views.delete(v);
  }
  function colorFor(i, n, ink) {
    const c = cfg.viz.color;
    if (c === "rainbow") return `hsl(${i / n * 300 + 200}, 85%, 62%)`;
    if (c === "white") return "#fff";
    if (c === "accent") return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#5e5ce6";
    return ink;
  }
  function draw(v, ink) {
    const c = v.canvas;
    if (!c.isConnected || c.offsetParent === null && getComputedStyle(c).position !== "fixed") return;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const x = c.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    const style = v.opts.style || cfg.viz.style, n = Math.max(8, Math.min(N, v.opts.bars || cfg.viz.bars)), sens = cfg.viz.sensitivity;
    const align = v.opts.align || "bottom", rev = v.opts.reverse;
    const val = (i) => Math.min(1, spec[Math.floor((rev ? n - 1 - i : i) / n * N)] * sens);
    if (style === "wave") {
      x.lineWidth = 2.2;
      x.lineJoin = "round";
      x.strokeStyle = colorFor(0, 1, ink);
      x.beginPath();
      for (let i = 0; i < n; i++) {
        const px2 = i / (n - 1) * w, a = val(i) * h * 0.45, y = h / 2 + Math.sin(i * 0.9 + performance.now() / 180) * a;
        i ? x.lineTo(px2, y) : x.moveTo(px2, y);
      }
      x.stroke();
      return;
    }
    if (style === "ring") {
      const cx = w / 2, cy = h / 2, r0 = Math.min(w, h) * 0.26;
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.2832, l = r0 * 0.15 + val(i) * r0 * 0.9;
        x.strokeStyle = colorFor(i, n, ink);
        x.lineWidth = Math.max(2, 6.2832 * r0 / n * 0.5);
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        x.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l));
        x.stroke();
      }
      return;
    }
    const gap = w / n, bw = Math.min(style === "dots" ? 7 : 9, Math.max(1.5, gap * (style === "dots" ? 0.5 : 0.56)));
    for (let i = 0; i < n; i++) {
      const v2 = val(i), px2 = i * gap + (gap - bw) / 2;
      x.fillStyle = colorFor(i, n, ink);
      if (style === "dots") {
        const k = Math.round(v2 * 6);
        for (let j = 0; j <= k; j++) {
          x.beginPath();
          x.arc(px2 + bw / 2, h - bw / 2 - j * (bw + 2), bw / 2, 0, 6.2832);
          x.fill();
        }
        continue;
      }
      const bh = Math.max(2, v2 * h * (style === "mirror" ? 0.95 : 1));
      const y = style === "mirror" || align === "center" ? (h - bh) / 2 : align === "top" ? 0 : h - bh;
      x.beginPath();
      x.roundRect ? x.roundRect(px2, y, bw, bh, Math.min(bw, bh) / 2) : x.rect(px2, y, bw, bh);
      x.fill();
    }
  }
  function frame() {
    if (!views.size) return;
    sample();
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#fff";
    views.forEach((v) => draw(v, ink));
  }
  var N, spec, weAt, analyser, buf, views;
  var init_visualizer = __esm({
    "src/js/audio/visualizer.js"() {
      init_settings();
      N = 64;
      spec = new Float32Array(N);
      weAt = 0;
      analyser = null;
      buf = null;
      views = /* @__PURE__ */ new Set();
    }
  });

  // src/js/audio/player.js
  var player_exports = {};
  __export(player_exports, {
    addFiles: () => addFiles,
    current: () => current,
    engine: () => engine,
    isFile: () => isFile,
    list: () => list,
    loadLibrary: () => loadLibrary,
    player: () => player,
    removeTrack: () => removeTrack,
    setIncludeBuiltin: () => setIncludeBuiltin,
    setWEFolder: () => setWEFolder2
  });
  function wireAudio() {
    engine.ensure();
    if (!mediaNode) {
      try {
        mediaNode = engine.ctx.createMediaElementSource(audio);
        mediaNode.connect(engine.out);
        audio.volume = 1;
      } catch {
      }
    }
    useAnalyser(engine.analyser);
  }
  function ended() {
    if (cfg.music.repeat === "one") {
      player.seek(0);
      player.play();
      return;
    }
    if (!cfg.music.continuous) {
      player.pause();
      player.seek(0);
      return;
    }
    player.next(true);
  }
  function emit2() {
    bus.emit("player", { track: current(), playing: player.playing });
  }
  function split(name) {
    const n = nice(name), m = n.split(/\s+-\s+/);
    return m.length > 1 ? { artist: m[0], title: m.slice(1).join(" - ") } : { artist: "", title: n };
  }
  async function addFiles(fileList) {
    const added = [];
    for (const f of fileList) {
      if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(f.name)) continue;
      const id = "file:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await files.put({ id, type: "audio", name: f.name, blob: f, added: Date.now() });
      const { title, artist } = split(f.name);
      const t2 = { id, kind: "file", title, artist, src: URL.createObjectURL(f) };
      user.push(t2);
      added.push(t2);
    }
    bus.emit("playlist");
    return added;
  }
  async function removeTrack(id) {
    if (id.startsWith("synth:")) return;
    const cur = current(), wasCurrent = cur && cur.id === id, i = list().findIndex((t2) => t2.id === id);
    await files.del(id);
    user = user.filter((t2) => t2.id !== id);
    history = [];
    if (i >= 0 && i < idx) idx--;
    if (idx >= list().length) idx = 0;
    if (wasCurrent) {
      audio.pause();
      audio.removeAttribute("src");
      const t2 = current();
      if (t2 && t2.kind === "file") audio.src = t2.src;
      else if (t2) engine.load(t2.synth, 0);
    }
    bus.emit("playlist");
    emit2();
  }
  function setIncludeBuiltin(on) {
    store.set("includeBuiltin", on);
    idx = 0;
    bus.emit("playlist");
    emit2();
  }
  function setWEFolder2(paths) {
    weFolder = paths.filter((p) => /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(p)).map((p) => {
      const name = p.split(/[\\/]/).pop();
      return { id: "we:" + p, kind: "file", ...split(name), src: "file:///" + p };
    });
    bus.emit("playlist");
  }
  async function loadLibrary() {
    const recs = (await files.all()).filter((r) => r.type === "audio").sort((a, b) => a.added - b.added);
    user = recs.map((r) => ({ id: r.id, kind: "file", ...split(r.name), src: URL.createObjectURL(r.blob) }));
    const want = store.get("current", "");
    const j = list().findIndex((t3) => t3.id === want);
    if (j >= 0) idx = j;
    const t2 = current();
    if (t2 && t2.kind === "file") audio.src = t2.src;
    else if (t2) engine.load(t2.synth, 0);
    bus.emit("playlist");
    emit2();
  }
  var engine, audio, mediaNode, builtin, user, weFolder, list, idx, history, current, isFile, player, nice;
  var init_player = __esm({
    "src/js/audio/player.js"() {
      init_tracks();
      init_engine();
      init_settings();
      init_bus();
      init_store();
      init_idb();
      init_visualizer();
      engine = new Engine();
      audio = new Audio();
      audio.preload = "auto";
      mediaNode = null;
      builtin = TRACKS.map((t2, i) => ({ id: "synth:" + t2.id, kind: "synth", title: t2.title, artist: t2.artist, album: t2.album, synth: t2 }));
      user = [];
      weFolder = [];
      list = () => [...builtin.filter(() => store.get("includeBuiltin", true)), ...user, ...weFolder];
      idx = Math.max(0, list().findIndex((t2) => t2.id === store.get("current", "")));
      history = [];
      current = () => list()[idx] || list()[0];
      isFile = () => current() && current().kind === "file";
      player = {
        get playing() {
          return isFile() ? !audio.paused : engine.playing;
        },
        get position() {
          return isFile() ? audio.currentTime || 0 : engine.track ? engine.position : 0;
        },
        get duration() {
          return isFile() ? isFinite(audio.duration) ? audio.duration : 0 : current() ? current().synth.duration : 0;
        },
        async toggle() {
          player.playing ? await player.pause() : await player.play();
        },
        async play() {
          const t2 = current();
          if (!t2) return;
          if (t2.kind === "file") {
            if (engine.playing) await engine.pause();
            wireAudio();
            if (engine.ctx.state !== "running") await engine.ctx.resume();
            if (!audio.src) audio.src = t2.src;
            await audio.play().catch(() => {
            });
          } else {
            audio.pause();
            if (!engine.track || engine.track !== t2.synth) engine.load(t2.synth, 0);
            await engine.play();
            useAnalyser(engine.analyser);
          }
          emit2();
        },
        async pause() {
          audio.pause();
          if (engine.playing) await engine.pause();
          emit2();
        },
        seek(sec) {
          if (isFile()) audio.currentTime = sec;
          else {
            const t2 = current();
            if (!engine.track) engine.load(t2.synth, 0);
            engine.seek(sec);
          }
          emit2();
        },
        async go(i, autoplay, back) {
          const L = list();
          if (!L.length) return;
          const was = autoplay ?? player.playing;
          if (!back) history.push(idx);
          idx = (i + L.length) % L.length;
          store.set("current", current().id);
          audio.pause();
          audio.removeAttribute("src");
          const t2 = current();
          if (t2.kind === "synth") engine.load(t2.synth, 0);
          else {
            if (engine.playing) await engine.pause();
            audio.src = t2.src;
          }
          emit2();
          if (was) await player.play();
        },
        next(auto) {
          const L = list();
          if (cfg.music.shuffle && L.length > 1) {
            let j;
            do {
              j = Math.floor(Math.random() * L.length);
            } while (j === idx);
            return player.go(j, true);
          }
          if (auto && idx === L.length - 1 && cfg.music.repeat === "off") {
            player.pause();
            return player.go(0, false);
          }
          return player.go(idx + 1, auto ? true : void 0);
        },
        prev() {
          if (player.position > 3) return player.seek(0);
          if (cfg.music.shuffle && history.length) return player.go(history.pop(), void 0, true);
          return player.go(idx - 1);
        },
        setVolume(v) {
          engine.setVolume(v);
          audio.volume = mediaNode ? 1 : v;
        },
        index: () => idx
      };
      engine.onended = ended;
      audio.addEventListener("ended", ended);
      audio.addEventListener("loadedmetadata", () => emit2());
      audio.addEventListener("play", () => emit2());
      audio.addEventListener("pause", () => emit2());
      nice = (name) => name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ");
      player.setVolume(cfg.music.volume);
      bus.on("settings", ({ patch }) => {
        if (patch.music) player.setVolume(cfg.music.volume);
      });
    }
  });

  // src/js/platform/wallpaper-engine.js
  init_bus();
  var inWallpaperEngine = () => !!(window.wallpaperRegisterAudioListener || window.__weProps);
  var queue = [];
  var ready = false;
  var dirs = {};
  var send = (type, data) => ready ? bus.emit(type, data) : queue.push([type, data]);
  window.wallpaperPropertyListener = {
    applyUserProperties(props) {
      window.__weProps = true;
      const out = {};
      for (const [k, v] of Object.entries(props)) out[k] = v && typeof v === "object" && "value" in v ? v.value : v;
      send("we:props", out);
    },
    applyGeneralProperties(p) {
      if (p.fps) send("we:fps", p.fps);
    },
    setPaused(p) {
      send("we:paused", p);
    },
    userDirectoryFilesAddedOrChanged(name, list2) {
      dirs[name] = [.../* @__PURE__ */ new Set([...dirs[name] || [], ...list2])];
      send("we:dir", { name, files: dirs[name] });
    },
    userDirectoryFilesRemoved(name, list2) {
      dirs[name] = (dirs[name] || []).filter((f) => !list2.includes(f));
      send("we:dir", { name, files: dirs[name] });
    }
  };
  function startWallpaperEngine() {
    ready = true;
    queue.forEach(([t2, d]) => bus.emit(t2, d));
    queue = [];
    const M2 = window;
    if (M2.wallpaperRegisterAudioListener) M2.wallpaperRegisterAudioListener((arr) => bus.emit("we:audio", arr));
    if (M2.wallpaperRegisterMediaPropertiesListener) {
      M2.wallpaperRegisterMediaStatusListener && M2.wallpaperRegisterMediaStatusListener((e) => bus.emit("media:status", e.enabled));
      M2.wallpaperRegisterMediaPropertiesListener((e) => bus.emit("media:props", e));
      M2.wallpaperRegisterMediaThumbnailListener && M2.wallpaperRegisterMediaThumbnailListener((e) => bus.emit("media:thumb", e));
      M2.wallpaperRegisterMediaPlaybackListener && M2.wallpaperRegisterMediaPlaybackListener((e) => {
        const P = M2.wallpaperMediaIntegration || {};
        bus.emit("media:state", e.state === P.PLAYBACK_PLAYING ? "playing" : e.state === P.PLAYBACK_PAUSED ? "paused" : "stopped");
      });
      M2.wallpaperRegisterMediaTimelineListener && M2.wallpaperRegisterMediaTimelineListener((e) => bus.emit("media:timeline", e));
    }
  }

  // src/js/main.js
  init_util();
  init_settings();
  init_bus();

  // src/js/glass/displacement.js
  var cache = /* @__PURE__ */ new Map();
  function smoothStep(a, b, t2) {
    t2 = Math.max(0, Math.min(1, (t2 - a) / (b - a)));
    return t2 * t2 * (3 - 2 * t2);
  }
  function roundedRectSDF(x, y, w, h, r) {
    const qx = Math.abs(x) - w + r, qy = Math.abs(y) - h + r;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }
  function encode(w, h, field) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d"), raw = new Float32Array(w * h * 2);
    let max = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [dx, dy] = field(x, y);
      const i = (y * w + x) * 2;
      raw[i] = dx;
      raw[i + 1] = dy;
      max = Math.max(max, Math.abs(dx), Math.abs(dy));
    }
    max = Math.max(max, 1e-6);
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, edge = Math.min(1, Math.min(x, y, w - x - 1, h - y - 1) / 2);
      const r = raw[i * 2] * edge / max + 0.5, g = raw[i * 2 + 1] * edge / max + 0.5;
      d[i * 4] = r * 255;
      d[i * 4 + 1] = g * 255;
      d[i * 4 + 2] = g * 255;
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }
  function res(w, h, limit = 320) {
    const s = Math.min(1, limit / Math.max(w, h));
    return [Math.max(8, Math.round(w * s)), Math.max(8, Math.round(h * s))];
  }
  function lensMap(w, h) {
    const [mw, mh] = res(w, h);
    const key = `lens:${mw}x${mh}`;
    if (!cache.has(key)) {
      cache.set(key, encode(mw, mh, (x, y) => {
        const ix = x / mw - 0.5, iy = y / mh - 0.5;
        const d = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
        const s = smoothStep(0, 1, smoothStep(0.8, 0, d - 0.15));
        return [(ix * s + 0.5) * mw - x, (iy * s + 0.5) * mh - y];
      }));
    }
    return cache.get(key);
  }
  function magnifyMap(w, h, zoom = 0.35) {
    const [mw, mh] = res(w, h, 160);
    const key = `mag:${mw}x${mh}:${zoom}`;
    if (!cache.has(key)) {
      cache.set(key, encode(mw, mh, (x, y) => {
        const nx = (x + 0.5) / mw * 2 - 1, ny = (y + 0.5) / mh * 2 - 1;
        const r = Math.min(1, Math.hypot(nx, ny));
        const rim = Math.pow(r, 6);
        const k = zoom * (1 - rim) + rim * 1.2;
        return [-nx * k * mw * 0.5, -ny * k * mh * 0.5];
      }));
    }
    return cache.get(key);
  }

  // src/js/glass/glass.js
  var UA = navigator.userAgent;
  var refractionSupported = /Chrome\/|Chromium|CefSharp|Wallpaper ?Engine/i.test(UA) && !/Firefox\//.test(UA);
  var PRESETS = {
    panel: { map: "lens", scale: -64, aberration: 2 },
    bar: { map: "lens", scale: -44, aberration: 1.6 },
    menu: { map: "lens", scale: -56, aberration: 2 },
    control: { map: "lens", scale: -26, aberration: 1.2 },
    droplet: { map: "magnify", scale: 38, aberration: 2.4, zoom: 0.32 }
  };
  var NS = "http://www.w3.org/2000/svg";
  var defs = null;
  var seq = 0;
  var G = { quality: "balanced", strength: 1, react: "near", reactRadius: 220 };
  var state = /* @__PURE__ */ new WeakMap();
  var live = /* @__PURE__ */ new Set();
  function ensureDefs() {
    if (defs) return defs;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML = "<defs></defs>";
    document.body.prepend(svg);
    return defs = svg.firstChild;
  }
  var mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  function makeFilter(id, quality, a) {
    const f = mk("filter", { id, x: "-35%", y: "-35%", width: "170%", height: "170%", "color-interpolation-filters": "sRGB" });
    const img = mk("feImage", { x: 0, y: 0, width: 1, height: 1, result: "MAP", preserveAspectRatio: "none" });
    f.append(img);
    const disp = [];
    if (quality === "high") {
      f.append(mk("feColorMatrix", { in: "MAP", type: "matrix", values: "0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0", result: "EI" }));
      const ct = mk("feComponentTransfer", { in: "EI", result: "EM" });
      ct.append(mk("feFuncA", { type: "discrete", tableValues: `0 ${a * 0.05} 1` }));
      f.append(ct);
      f.append(mk("feOffset", { in: "SourceGraphic", dx: 0, dy: 0, result: "C0" }));
      [["R", "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", 1], ["G", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", 1 - a * 0.05], ["B", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0", 1 - a * 0.1]].forEach(([n, m, k]) => {
        const d = mk("feDisplacementMap", { in: "SourceGraphic", in2: "MAP", xChannelSelector: "R", yChannelSelector: "B", result: n + "D" });
        d.dataset.k = k;
        disp.push(d);
        f.append(d);
        f.append(mk("feColorMatrix", { in: n + "D", type: "matrix", values: m, result: n }));
      });
      f.append(mk("feBlend", { in: "G", in2: "B", mode: "screen", result: "GB" }));
      f.append(mk("feBlend", { in: "R", in2: "GB", mode: "screen", result: "RGB" }));
      f.append(mk("feGaussianBlur", { in: "RGB", stdDeviation: Math.max(0.1, 0.5 - a * 0.1), result: "AB" }));
      f.append(mk("feComposite", { in: "AB", in2: "EM", operator: "in", result: "E" }));
      const inv = mk("feComponentTransfer", { in: "EM", result: "INV" });
      inv.append(mk("feFuncA", { type: "table", tableValues: "1 0" }));
      f.append(inv);
      f.append(mk("feComposite", { in: "C0", in2: "INV", operator: "in", result: "C" }));
      f.append(mk("feComposite", { in: "E", in2: "C", operator: "over" }));
    } else {
      const d = mk("feDisplacementMap", { in: "SourceGraphic", in2: "MAP", xChannelSelector: "R", yChannelSelector: "B" });
      d.dataset.k = 1;
      disp.push(d);
      f.append(d);
    }
    return { f, img, disp };
  }
  function build(el2, force) {
    const s = state.get(el2);
    if (!s) return;
    const w = el2.offsetWidth, h = el2.offsetHeight;
    if (!w || !h) return;
    const q = s.over.quality || G.quality, str = (s.over.refraction ?? 1) * G.strength;
    if (!force && Math.abs(w - s.w) < 2 && Math.abs(h - s.h) < 2 && q === s.q && str === s.str) return;
    const sizeChanged = Math.abs(w - s.w) >= 2 || Math.abs(h - s.h) >= 2;
    s.w = w;
    s.h = h;
    if (!refractionSupported || q === "fast" || str <= 0) {
      s.warp.style.filter = "";
      s.q = q;
      s.str = str;
      return;
    }
    const host = ensureDefs();
    if (!s.filter || s.q !== q) {
      const nf = makeFilter(s.id + (q === "high" ? "h" : "b"), q, s.p.aberration);
      if (s.filter) s.filter.f.replaceWith(nf.f);
      else host.append(nf.f);
      s.filter = nf;
      s.mapKey = "";
    }
    s.q = q;
    s.str = str;
    const href = s.p.map === "magnify" ? magnifyMap(w, h, s.p.zoom) : lensMap(w, h);
    if (href !== s.mapKey || sizeChanged) {
      s.filter.img.setAttribute("href", href);
      s.mapKey = href;
    }
    s.filter.img.setAttribute("width", w);
    s.filter.img.setAttribute("height", h);
    s.filter.disp.forEach((d) => d.setAttribute("scale", String(s.p.scale * str * d.dataset.k)));
    const url2 = `url(#${s.filter.f.id})`;
    if (s.warp.style.filter !== url2) s.warp.style.filter = url2;
  }
  var roQueue = /* @__PURE__ */ new Set();
  var roRaf = 0;
  var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
    entries.forEach((e) => roQueue.add(e.target));
    if (!roRaf) roRaf = requestAnimationFrame(() => {
      roRaf = 0;
      roQueue.forEach((el2) => build(el2));
      roQueue.clear();
    });
  }) : null;
  function glassify(el2, preset = "panel", over = {}) {
    if (state.has(el2)) return el2;
    const warp = document.createElement("span");
    warp.className = "lg-warp";
    const sheen = document.createElement("span");
    sheen.className = "lg-sheen";
    const rim = document.createElement("span");
    rim.className = "lg-rim";
    el2.prepend(warp, sheen, rim);
    el2.classList.add("lg", `lg-${preset}`);
    state.set(el2, { id: `lg${++seq}`, p: { ...PRESETS[preset], ...over }, over: {}, warp, w: 0, h: 0, q: "", str: -1, glow: -1 });
    live.add(el2);
    build(el2);
    ro && ro.observe(el2);
    return el2;
  }
  function setOverrides(el2, o = {}) {
    const s = state.get(el2);
    if (!s) return;
    s.over = { ...o };
    const map = { blur: ["--lg-blur", "px"], sat: ["--lg-sat", "%"], bright: ["--lg-bright", ""], tint: ["--lg-tint", ""], radius: ["--lg-radius", "px"], rim: ["--lg-rim", ""], shine: ["--lg-shine", ""], shadow: ["--lg-shadow", ""] };
    for (const [k, [v, u]] of Object.entries(map)) {
      if (o[k] != null) el2.style.setProperty(v, o[k] + u);
      else el2.style.removeProperty(v);
    }
    build(el2, true);
  }
  function setGlobal(g) {
    Object.assign(G, g);
    live.forEach((el2) => build(el2, true));
    light(true);
  }
  function refresh(el2) {
    (el2 ? [el2] : [...live]).forEach((e) => build(e, true));
  }
  var px = -9999;
  var py = -9999;
  var raf = 0;
  function light(all) {
    raf = 0;
    const R = G.reactRadius;
    for (const el2 of live) {
      const s = state.get(el2);
      if (!el2.isConnected) {
        live.delete(el2);
        continue;
      }
      if (G.react === "off") {
        if (s.glow !== 0) {
          el2.style.setProperty("--lg-glow", "0");
          s.glow = 0;
        }
        continue;
      }
      const r = el2.getBoundingClientRect();
      if (!r.width) continue;
      const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom), d = Math.hypot(dx, dy);
      const g = G.react === "all" ? 1 : Math.max(0, 1 - d / R);
      if (g === 0 && s.glow === 0 && !all) continue;
      s.glow = +g.toFixed(2);
      el2.style.setProperty("--lg-glow", s.glow);
      if (g > 0) {
        const ang = Math.atan2(py - (r.top + r.height / 2), px - (r.left + r.width / 2)) * 57.3 + 90;
        el2.style.setProperty("--lg-angle", ang.toFixed(0) + "deg");
        el2.style.setProperty("--lg-mx", ((px - r.left) / r.width * 100).toFixed(0) + "%");
        el2.style.setProperty("--lg-my", ((py - r.top) / r.height * 100).toFixed(0) + "%");
      }
    }
  }
  addEventListener("pointermove", (e) => {
    px = e.clientX;
    py = e.clientY;
    if (!raf) raf = requestAnimationFrame(() => light(false));
  }, { passive: true });
  document.addEventListener("pointerleave", () => {
    px = py = -9999;
    if (!raf) raf = requestAnimationFrame(() => light(false));
  });
  var repaintLight = () => light(true);

  // src/js/wallpaper/themes.js
  var THEMES = {
    dusk: { name: "Dusk", style: "waves", glass: "dark", bg: "#141a45", bands: ["#1f2a6b", "#34389a", "#5b45b0", "#9a55a8", "#e0707a", "#ffad86"], sun: "#ffcf9e", amp: 0.07, tilt: -0.05, hero: "#ffffff" },
    lagoon: { name: "Lagoon", style: "waves", glass: "light", bg: "#eaf6f3", bands: ["#cdeee8", "#a3dfd9", "#6fc8c6", "#3aa9b0", "#178795", "#0c5f70"], sun: null, amp: 0.05, tilt: 0.04, hero: "#0c3f4a" },
    ember: { name: "Ember", style: "waves", glass: "dark", bg: "#22081a", bands: ["#43102b", "#6f1736", "#a32437", "#d24d2f", "#f08a35", "#fbc65a"], sun: "#ffd27a", amp: 0.09, tilt: 0.03, hero: "#ffffff" },
    mist: { name: "Mist", style: "waves", glass: "light", bg: "#f4f2f8", bands: ["#e6e2f2", "#d4cdea", "#bdb3df", "#a397cf", "#8679bd", "#6b5ea6"], sun: null, amp: 0.06, tilt: -0.03, hero: "#2c2452" },
    aurora: { name: "Aurora", style: "waves", glass: "dark", bg: "#04121c", bands: ["#062a3a", "#0a4150", "#0e5d63", "#147a70", "#1f9a7c", "#33b388"], sun: null, amp: 0.11, tilt: 0.06, hero: "#e9fff4" },
    lava: { name: "Lava Lamp", style: "blobs", glass: "dark", bg: "#160433", colors: ["#ff4d6d", "#ff9e00", "#7b2cbf", "#3a0ca3", "#f72585"], hero: "#ffffff" },
    pastel: { name: "Pastel", style: "blobs", glass: "light", bg: "#fbf4ff", colors: ["#ffc8dd", "#bde0fe", "#cdb4db", "#a2d2ff", "#fff1a8"], hero: "#3d2c5c" },
    outrun: { name: "Outrun", style: "synth", glass: "dark", bg: "#12002b", sky: ["#12002b", "#5a0f6e", "#ff2bd6"], sunA: "#ffe25c", sunB: "#ff2b8a", grid: "#ff2bd6", ground: "#0b0018", hero: "#fff2fb" },
    nebula: { name: "Nebula", style: "stars", glass: "dark", bg: "#03010d", colors: ["#5b2a86", "#1b4b8f", "#a3195b"], hero: "#ffffff" },
    bauhaus: { name: "Bauhaus", style: "bauhaus", glass: "light", bg: "#f1e9d6", colors: ["#e63946", "#1d3557", "#f4a261", "#2a9d8f", "#111111"], hero: "#111111" },
    topo: { name: "Topography", style: "contour", glass: "dark", bg: "#0d2520", line: "#3ddc97", hero: "#e8fff5" },
    acid: { name: "Acid", style: "plasma", glass: "dark", bg: "#000000", hue: 280, hero: "#ffffff" },
    image: { name: "Your image", style: "none", glass: "dark", bg: "#111", hero: "#ffffff" }
  };

  // src/js/wallpaper/wallpaper.js
  init_util();
  var TAU = Math.PI * 2;
  function waves(ctx, W2, H, w, t2, energy) {
    ctx.fillStyle = w.bg;
    ctx.fillRect(0, 0, W2, H);
    if (w.sun) {
      ctx.fillStyle = w.sun;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(W2 * 0.66, H * (0.42 + Math.sin(t2 * 0.2) * 0.012), Math.min(W2, H) * 0.16 * (1 + energy * 0.08), 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const step = Math.max(6, W2 / 120);
    w.bands.forEach((col, i) => {
      const base = H * (0.34 + i * 0.105), amp = H * w.amp * (1 - i * 0.08) * (1 + energy * 0.6);
      const f = 1.1 + i * 0.22, ph = i * 1.7 + t2 * (0.35 + i * 0.09) * (i % 2 ? -1 : 1);
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W2 + step; x += step) {
        const u = x / W2;
        ctx.lineTo(x, base + Math.sin(u * 6.2832 * f + ph) * amp + Math.sin(u * 16.65 + ph * 2) * amp * 0.22 + (x - W2 / 2) * w.tilt);
      }
      ctx.lineTo(W2, H);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    });
  }
  function blobs(ctx, W2, H, w, t2, energy) {
    ctx.fillStyle = w.bg;
    ctx.fillRect(0, 0, W2, H);
    const m = Math.max(W2, H), light2 = w.glass === "light";
    w.colors.forEach((c, i) => {
      const x = W2 * (0.5 + 0.38 * Math.sin(t2 * (0.11 + i * 0.03) + i * 2.1)), y = H * (0.5 + 0.36 * Math.cos(t2 * (0.09 + i * 0.025) + i * 1.3));
      const r = m * (0.34 + 0.08 * Math.sin(t2 * 0.2 + i) + energy * 0.08);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c);
      g.addColorStop(1, c + "00");
      ctx.globalAlpha = light2 ? 0.85 : 0.9;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W2, H);
    });
    ctx.globalAlpha = 1;
  }
  function synth(ctx, W2, H, w, t2, energy) {
    const hz = H * 0.62, sky = ctx.createLinearGradient(0, 0, 0, hz);
    w.sky.forEach((c, i) => sky.addColorStop(i / (w.sky.length - 1), c));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W2, hz);
    const R = Math.min(W2, H) * 0.24 * (1 + energy * 0.05), cx = W2 / 2, cy = hz - R * 0.32;
    const sun = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    sun.addColorStop(0, w.sunA);
    sun.addColorStop(1, w.sunB);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = sun;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = w.sky[1];
    for (let i = 0; i < 7; i++) {
      const yy = cy + R * (0.05 + i * 0.14), hh = R * (0.02 + i * 0.016);
      ctx.fillRect(cx - R, yy, R * 2, hh);
    }
    ctx.restore();
    ctx.fillStyle = w.ground;
    ctx.fillRect(0, hz, W2, H - hz);
    ctx.strokeStyle = w.grid;
    ctx.lineWidth = Math.max(1, H / 500);
    ctx.shadowColor = w.grid;
    ctx.shadowBlur = 8 + energy * 14;
    ctx.globalAlpha = 0.75 + energy * 0.25;
    ctx.beginPath();
    for (let i = -24; i <= 24; i++) {
      ctx.moveTo(cx + i * W2 * 0.012, hz);
      ctx.lineTo(cx + i * W2 * 0.11, H);
    }
    const N2 = 14, ph = t2 * 0.6 % 1;
    for (let k = 0; k < N2; k++) {
      const f = (k + ph) / N2, y = hz + (H - hz) * f * f;
      ctx.moveTo(0, y);
      ctx.lineTo(W2, y);
    }
    ctx.moveTo(0, hz);
    ctx.lineTo(W2, hz);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  var starCache = /* @__PURE__ */ new Map();
  function stars(ctx, W2, H, w, t2, energy) {
    ctx.fillStyle = w.bg;
    ctx.fillRect(0, 0, W2, H);
    const m = Math.max(W2, H);
    w.colors.forEach((c, i) => {
      const x = W2 * (0.3 + 0.4 * (i * 0.37 % 1) + 0.04 * Math.sin(t2 * 0.05 + i)), y = H * (0.3 + 0.4 * (i * 0.61 % 1) + 0.04 * Math.cos(t2 * 0.04 + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, m * 0.45);
      g.addColorStop(0, c + "aa");
      g.addColorStop(1, c + "00");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W2, H);
    });
    const key = 260;
    if (!starCache.has(key)) {
      const r = rng(42);
      starCache.set(key, [...Array(key)].map(() => [r(), r(), r(), r() * TAU]));
    }
    ctx.fillStyle = "#fff";
    starCache.get(key).forEach(([x, y, z, p]) => {
      const px2 = (x + t2 * 4e-3 * (0.3 + z)) % 1 * W2, py2 = y * H;
      ctx.globalAlpha = Math.min(1, (0.35 + 0.65 * Math.abs(Math.sin(t2 * (0.6 + z) + p))) * (0.5 + z * 0.5) + energy * 0.3);
      ctx.fillRect(px2, py2, 0.6 + z * 1.6, 0.6 + z * 1.6);
    });
    ctx.globalAlpha = 1;
  }
  function bauhaus(ctx, W2, H, w, t2, energy) {
    ctx.fillStyle = w.bg;
    ctx.fillRect(0, 0, W2, H);
    const cols = W2 > H ? 5 : 3, rows = Math.ceil(H / (W2 / cols)), s = W2 / cols, r = rng(7);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const kind = Math.floor(r() * 5), c = w.colors[Math.floor(r() * w.colors.length)], c2 = w.colors[Math.floor(r() * w.colors.length)], dir = r() < 0.5 ? -1 : 1;
      const x = i * s + s / 2, y = j * s + s / 2, rot = Math.round(r() * 4) * Math.PI / 2 + Math.sin(t2 * 0.25 + i + j) * 0.5 * dir;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1 + energy * 0.06, 1 + energy * 0.06);
      ctx.fillStyle = c;
      const h = s * 0.42;
      if (kind === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, h, 0, TAU);
        ctx.fill();
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(0, 0, h * 0.45, 0, TAU);
        ctx.fill();
      } else if (kind === 1) {
        ctx.beginPath();
        ctx.arc(0, h * 0.4, h, Math.PI, TAU);
        ctx.fill();
      } else if (kind === 2) {
        ctx.beginPath();
        ctx.moveTo(-h, -h);
        ctx.arc(-h, -h, h * 2, 0, Math.PI / 2);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 3) {
        ctx.fillRect(-h, -h * 0.35, h * 2, h * 0.7);
        ctx.fillStyle = c2;
        ctx.fillRect(-h * 0.35, -h, h * 0.7, h * 2);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(h, h);
        ctx.lineTo(-h, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function contour(ctx, W2, H, w, t2, energy) {
    ctx.fillStyle = w.bg;
    ctx.fillRect(0, 0, W2, H);
    ctx.strokeStyle = w.line;
    ctx.lineWidth = Math.max(1, H / 700);
    const m = Math.max(W2, H), centers = [[0.28, 0.4, 1], [0.76, 0.66, 1.4]];
    centers.forEach(([cx, cy, k], ci) => {
      for (let ring2 = 1; ring2 <= 18; ring2++) {
        const base = ring2 * m * 0.03 * k;
        ctx.globalAlpha = (0.15 + 0.5 * (1 - ring2 / 18)) * (0.8 + energy * 0.4);
        ctx.beginPath();
        for (let a = 0; a <= 96; a++) {
          const ang = a / 96 * TAU, rr = base * (1 + 0.13 * Math.sin(ang * 3 + t2 * 0.3 + ring2 * 0.35 + ci) + 0.06 * Math.sin(ang * 7 - t2 * 0.22 + ring2 * 0.2));
          const x = cx * W2 + Math.cos(ang) * rr, y = cy * H + Math.sin(ang) * rr * 0.8;
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }
  var plasmaCv = typeof document !== "undefined" ? document.createElement("canvas") : null;
  function plasma(ctx, W2, H, w, t2, energy) {
    const pw = 96, ph = Math.max(24, Math.round(96 * H / W2));
    plasmaCv.width = pw;
    plasmaCv.height = ph;
    const p = plasmaCv.getContext("2d"), img = p.createImageData(pw, ph), d = img.data;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const v = Math.sin(x * 0.07 + t2) + Math.sin(y * 0.09 - t2 * 0.7) + Math.sin((x + y) * 0.05 + t2 * 0.5) + Math.sin(Math.hypot(x - pw / 2, y - ph / 2) * 0.12 - t2);
      const hue = (w.hue + v * 50 + t2 * 12) % 360, l = 0.45 + 0.1 * Math.sin(v * 2) + energy * 0.08;
      const [r, g, b] = hsl(hue / 360, 0.85, l), i = (y * pw + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
    p.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(plasmaCv, 0, 0, W2, H);
  }
  function hsl(h, s, l) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t2) => {
      t2 = (t2 + 1) % 1;
      return 255 * (t2 < 1 / 6 ? p + (q - p) * 6 * t2 : t2 < 0.5 ? q : t2 < 2 / 3 ? p + (q - p) * (2 / 3 - t2) * 6 : p);
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }
  function gradient({ colorA: a, colorB: b, gradStyle = "linear", gradAngle = 160, gradFlow = false }) {
    if (gradStyle === "radial") return `radial-gradient(circle at 30% 25%, ${a}, ${b} 75%)`;
    if (gradStyle === "conic") return `conic-gradient(from ${gradAngle}deg at 50% 50%, ${a}, ${b}, ${a})`;
    if (gradStyle === "mesh") return `radial-gradient(at 15% 20%, ${a} 0, transparent 55%), radial-gradient(at 85% 15%, ${b} 0, transparent 50%), radial-gradient(at 70% 85%, ${a} 0, transparent 55%), radial-gradient(at 20% 90%, ${b} 0, transparent 55%), linear-gradient(${gradAngle}deg, ${a}, ${b})`;
    return `linear-gradient(${gradAngle}deg, ${a}, ${b}${gradFlow ? ", " + a : ""})`;
  }
  var STYLES = { waves, blobs, synth, stars, bauhaus, contour, plasma };
  function drawTheme(ctx, W2, H, key, t2 = 0, energy = 0) {
    const w = THEMES[key] || THEMES.dusk;
    (STYLES[w.style] || waves)(ctx, W2, H, w, t2, energy);
  }
  var Wallpaper = class {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector("#wallpaper");
      this.ctx = this.canvas.getContext("2d", { alpha: false });
      this.img = root.querySelector("#wpImage");
      this.img2 = root.querySelector("#wpImage2");
      this.video = root.querySelector("#wpVideo");
      this.o = { kind: "theme", theme: "dusk", motion: true, speed: 1, fps: 60, colorA: "#1f2a6b", colorB: "#e0707a", fit: "cover", slideEvery: 60 };
      this.t = 0;
      this.last = 0;
      this.energy = 0;
      this.target = 0;
      this.paused = false;
      this.slides = [];
      this.slideIdx = 0;
      this.slideTimer = 0;
      this.resize();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    resize() {
      const scale = Math.min(1.25, devicePixelRatio || 1) * 0.8;
      this.W = innerWidth;
      this.H = innerHeight;
      this.canvas.width = Math.round(this.W * scale);
      this.canvas.height = Math.round(this.H * scale);
      this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.draw();
    }
    set(o) {
      Object.assign(this.o, o);
      const k = this.o.kind;
      this.canvas.hidden = k !== "theme";
      this.img.hidden = !(k === "image" || k === "gif" || k === "slideshow");
      this.img2.hidden = k !== "slideshow";
      this.video.hidden = k !== "video";
      if (k !== "video") {
        this.video.pause();
      }
      [this.img, this.img2, this.video].forEach((e) => e.style.objectFit = this.o.fit);
      this.root.style.background = k === "color" ? gradient(this.o) : "";
      this.root.classList.toggle("flow", k === "color" && !!this.o.gradFlow && this.o.motion !== false);
      clearInterval(this.slideTimer);
      if (k === "slideshow" && this.slides.length > 1) this.slideTimer = setInterval(() => this.nextSlide(), Math.max(5, this.o.slideEvery) * 1e3);
      this.draw();
    }
    media(kind, src) {
      if (kind === "video") {
        if (this.video.src !== src) {
          this.video.src = src;
        }
        this.video.play().catch(() => {
        });
      } else if (src) {
        this.img.src = src;
      }
    }
    setSlides(list2) {
      this.slides = list2;
      this.slideIdx = 0;
      if (list2[0]) this.img.src = list2[0];
      this.set({});
    }
    nextSlide() {
      if (!this.slides.length) return;
      this.slideIdx = (this.slideIdx + 1) % this.slides.length;
      const [a, b] = [this.img, this.img2];
      b.src = this.slides[this.slideIdx];
      b.style.opacity = "0";
      b.hidden = false;
      b.onload = () => {
        b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, fill: "forwards" }).finished.then(() => {
          a.src = b.src;
          b.style.opacity = "0";
          b.getAnimations().forEach((x) => x.cancel());
        });
      };
    }
    audio(level2) {
      this.target = level2;
    }
    draw() {
      if (this.o.kind === "theme") drawTheme(this.ctx, this.W, this.H, this.o.theme, this.t, this.energy);
    }
    loop(now) {
      requestAnimationFrame(this.loop);
      const dt = Math.min(0.05, (now - this.last) / 1e3 || 0);
      if (this.paused || document.hidden || this.o.kind !== "theme") {
        this.last = now;
        return;
      }
      const min = 1e3 / Math.max(10, this.o.fps) - 2;
      if (now - this.last < min) return;
      this.last = now;
      const moving = this.o.motion;
      this.energy += (this.target - this.energy) * 0.18;
      if (!moving && Math.abs(this.target - this.energy) < 3e-3) return;
      if (moving) this.t += dt * 0.25 * this.o.speed;
      this.draw();
    }
  };

  // src/js/wallpaper/media.js
  init_idb();
  init_bus();
  var urls = /* @__PURE__ */ new Map();
  var url = (rec) => {
    if (!urls.has(rec.id)) urls.set(rec.id, URL.createObjectURL(rec.blob));
    return urls.get(rec.id);
  };
  var typeOf = (name, mime = "") => /gif$/i.test(mime) || /\.gif$/i.test(name) ? "gif" : /^video\//.test(mime) || /\.(mp4|webm|mov|m4v|ogv)$/i.test(name) ? "video" : "image";
  var MEDIA_RE = /\.(jpe?g|png|webp|gif|bmp|avif|mp4|webm|mov|m4v|ogv)$/i;
  var wpMedia = { local: [], we: { image: "", video: "", folder: [] } };
  function mediaItems(type) {
    const we = [];
    if (wpMedia.we.image) we.push({ id: "we:image", url: wpMedia.we.image, type: typeOf(wpMedia.we.image), name: "Image property", source: "we" });
    if (wpMedia.we.video) we.push({ id: "we:video", url: wpMedia.we.video, type: "video", name: "Video property", source: "we" });
    const all = [...wpMedia.local, ...we, ...wpMedia.we.folder];
    return type ? all.filter((i) => type === "slides" ? i.type !== "video" : i.type === type) : all;
  }
  var findMedia = (id) => mediaItems().find((i) => i.id === id);
  async function loadWallpaperMedia() {
    const all = await files.all();
    wpMedia.local = all.filter((r) => r.type === "wallpaper").sort((a, b) => b.added - a.added).map((r) => ({ id: r.id, url: url(r), type: typeOf(r.name || "", r.mime), name: r.name || "File", source: "local" }));
    bus.emit("wallpaper:media");
  }
  function setWEFolder(paths) {
    wpMedia.we.folder = paths.filter((p) => MEDIA_RE.test(p)).map((p) => ({ id: "we:" + p, url: "file:///" + p.replace(/\\/g, "/"), type: typeOf(p), name: p.split(/[\\/]/).pop(), source: "we" }));
    bus.emit("wallpaper:media");
  }
  async function addMedia(list2) {
    const ids = [];
    for (const f of list2) {
      if (!/^(image|video)\//.test(f.type) && !MEDIA_RE.test(f.name)) continue;
      const id = "wp:lib:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await files.put({ id, type: "wallpaper", mime: f.type, name: f.name, blob: f, added: Date.now() });
      ids.push(id);
    }
    await loadWallpaperMedia();
    return ids.map(findMedia).filter(Boolean);
  }
  async function removeMedia(id) {
    await files.del(id);
    if (urls.has(id)) {
      URL.revokeObjectURL(urls.get(id));
      urls.delete(id);
    }
    await loadWallpaperMedia();
  }

  // src/js/components/keyboard.js
  init_util();
  init_settings();

  // src/js/glass/motion.js
  init_util();
  var SPRING = "cubic-bezier(0.2, 1.3, 0.32, 1)";
  var EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
  var parts = (el2) => [...el2.children].filter((c) => !c.matches("svg"));
  function liquidOpen(el2, from) {
    el2.hidden = false;
    if (reducedMotion()) return Promise.resolve();
    const r = el2.getBoundingClientRect();
    let ox = "50%", oy = "0%";
    if (from) {
      const f = from.getBoundingClientRect();
      ox = `${((f.left + f.width / 2 - r.left) / r.width * 100).toFixed(1)}%`;
      oy = `${((f.top + f.height / 2 - r.top) / r.height * 100).toFixed(1)}%`;
    }
    el2.style.transformOrigin = `${ox} ${oy}`;
    const base = getComputedStyle(el2).translate === "none" ? "" : "";
    el2.getAnimations().forEach((a2) => a2.cancel());
    const a = el2.animate([
      { transform: `${base} scale(0.82, 0.7)` },
      { transform: `${base} scale(1.015, 1.03)`, offset: 0.62 },
      { transform: `${base} scale(1)` }
    ], { duration: 480, easing: EASE_OUT, composite: "add" });
    parts(el2).forEach((p, i) => p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: i === parts(el2).length - 1 ? 300 : 200, delay: i === parts(el2).length - 1 ? 60 : 0, easing: "ease-out", fill: "backwards" }));
    return a.finished.catch(() => {
    });
  }
  function liquidClose(el2, to) {
    if (el2.hidden) return Promise.resolve();
    if (reducedMotion()) {
      el2.hidden = true;
      return Promise.resolve();
    }
    if (to) {
      const r = el2.getBoundingClientRect(), f = to.getBoundingClientRect();
      el2.style.transformOrigin = `${((f.left + f.width / 2 - r.left) / r.width * 100).toFixed(1)}% ${((f.top + f.height / 2 - r.top) / r.height * 100).toFixed(1)}%`;
    }
    el2.getAnimations().forEach((a2) => a2.cancel());
    const a = el2.animate([{ transform: "scale(1)" }, { transform: "scale(0.86, 0.76)" }], { duration: 220, easing: "cubic-bezier(0.4, 0, 1, 1)", composite: "add" });
    parts(el2).forEach((p) => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in", fill: "forwards" }));
    return a.finished.catch(() => {
    }).then(() => {
      el2.hidden = true;
      parts(el2).forEach((p) => p.getAnimations().forEach((x) => x.cancel()));
    });
  }
  function flip(els, before) {
    if (reducedMotion()) return;
    els.forEach((el2) => {
      const a = before.get(el2);
      if (!a) return;
      const b = el2.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el2.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: 520, easing: SPRING, composite: "add" });
    });
  }
  function press(el2) {
    if (reducedMotion()) return;
    el2.animate([{ transform: "scale(1)" }, { transform: "scale(0.94, 0.9)" }, { transform: "scale(1.02, 1.04)" }, { transform: "scale(1)" }], { duration: 380, easing: EASE_OUT, composite: "add" });
  }

  // src/js/components/keyboard.js
  var LAYOUTS = {
    abc: [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l"], ["shift", "z", "x", "c", "v", "b", "n", "m", "back"], ["num", ",", "space", ".", "enter", "done"]],
    num: [["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], ["-", "/", ":", ";", "(", ")", "&", "@", '"'], ["#", "=", "+", "?", "!", "'", "_", "\\", "back"], ["abc", ",", "space", ".", "enter", "done"]]
  };
  var LABEL = { shift: "⇧", back: "⌫", num: "123", abc: "ABC", space: "space", enter: "return", done: "Done" };
  var isText = (t2) => t2 && (t2.tagName === "TEXTAREA" || t2.tagName === "INPUT" && /^(text|search|url|email|)$/i.test(t2.type)) && !t2.readOnly && !t2.disabled;
  var keyboardOn = () => cfg.keyboard === "on" || cfg.keyboard !== "off" && inWallpaperEngine();
  function initKeyboard() {
    const kb = el("div", "glass kb");
    kb.hidden = true;
    kb.setAttribute("role", "group");
    kb.setAttribute("aria-label", "On-screen keyboard");
    const pane2 = el("div", "pane");
    kb.append(pane2);
    document.body.append(kb);
    glassify(kb, "panel");
    let target = null, layout2 = "abc", shift = false;
    function draw2() {
      pane2.textContent = "";
      LAYOUTS[layout2].forEach((keys) => {
        const r = el("div", "kb-row");
        keys.forEach((k) => {
          const special = k in LABEL;
          const b = el("button", "kb-key" + (special ? " act k-" + k : ""), special ? LABEL[k] : shift ? k.toUpperCase() : k);
          b.type = "button";
          b.dataset.k = k;
          if (k === "shift" && shift) b.classList.add("on");
          r.append(b);
        });
        pane2.append(r);
      });
    }
    function insert(text) {
      const t2 = target;
      if (!t2) return;
      const s = t2.selectionStart ?? t2.value.length, e = t2.selectionEnd ?? s;
      t2.setRangeText(text, s, e, "end");
      t2.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function press2(k) {
      const t2 = target;
      if (!t2) return;
      if (k === "shift") {
        shift = !shift;
        return draw2();
      }
      if (k === "num" || k === "abc") {
        layout2 = k;
        shift = false;
        return draw2();
      }
      if (k === "done") return hide(true);
      if (k === "back") {
        const s = t2.selectionStart ?? t2.value.length, e = t2.selectionEnd ?? s;
        if (s !== e) t2.setRangeText("", s, e, "end");
        else if (s > 0) t2.setRangeText("", s - 1, s, "end");
        return t2.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (k === "enter") {
        if (t2.tagName === "TEXTAREA") return insert("\n");
        if (t2.form) t2.form.requestSubmit();
        else t2.dispatchEvent(new CustomEvent("kbenter", { bubbles: true }));
        return;
      }
      insert(k === "space" ? " " : shift ? k.toUpperCase() : k);
      if (shift) {
        shift = false;
        draw2();
      }
    }
    kb.addEventListener("pointerdown", (e) => e.preventDefault());
    kb.addEventListener("click", (e) => {
      const b = e.target.closest(".kb-key");
      if (b) press2(b.dataset.k);
    });
    function show(t2) {
      target = t2;
      layout2 = "abc";
      shift = !t2.value;
      draw2();
      if (kb.hidden) liquidOpen(kb, null);
      requestAnimationFrame(() => t2.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
    function hide(blur) {
      if (blur && target) target.blur();
      target = null;
      if (!kb.hidden) liquidClose(kb, null);
    }
    addEventListener("focusin", (e) => {
      if (keyboardOn() && isText(e.target)) show(e.target);
    });
    addEventListener("focusout", () => setTimeout(() => {
      if (target && !isText(document.activeElement)) hide(false);
    }, 0));
    return { hide };
  }

  // src/js/components/drag-scroll.js
  var SCROLLERS = "#setMain, .set-side, .mu-list, .rm-list";
  var SKIP = ".slider, input, textarea, select, .seg, .switch, .kb";
  function initDragScroll() {
    let d = null, raf2 = 0;
    addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const sc = e.target.closest(SCROLLERS);
      if (!sc || e.target.closest(SKIP)) return;
      const canY = sc.scrollHeight > sc.clientHeight + 1, canX = sc.scrollWidth > sc.clientWidth + 1;
      if (!canY && !canX) return;
      cancelAnimationFrame(raf2);
      d = { sc, x: e.clientX, y: e.clientY, top: sc.scrollTop, left: sc.scrollLeft, canX, canY, on: false, v: 0, lt: performance.now(), lp: canY ? e.clientY : e.clientX };
    }, true);
    addEventListener("pointermove", (e) => {
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.on) {
        if (Math.hypot(dx, dy) < 6) return;
        d.on = true;
        d.sc.classList.add("drag-scrolling");
      }
      if (d.canY) d.sc.scrollTop = d.top - dy;
      else d.sc.scrollLeft = d.left - dx;
      const now = performance.now(), p = d.canY ? e.clientY : e.clientX, dt = Math.max(1, now - d.lt);
      d.v = 0.8 * ((d.lp - p) / dt) + 0.2 * d.v;
      d.lp = p;
      d.lt = now;
    }, true);
    const end = () => {
      if (!d) return;
      const { sc, on, canY } = d;
      let v = d.v * 16;
      d = null;
      if (!on) return;
      sc.classList.remove("drag-scrolling");
      const swallow = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      addEventListener("click", swallow, true);
      setTimeout(() => removeEventListener("click", swallow, true), 0);
      const glide = () => {
        if (Math.abs(v) < 0.4) return;
        if (canY) sc.scrollTop += v;
        else sc.scrollLeft += v;
        v *= 0.94;
        raf2 = requestAnimationFrame(glide);
      };
      raf2 = requestAnimationFrame(glide);
    };
    addEventListener("pointerup", end, true);
    addEventListener("pointercancel", end, true);
  }

  // src/js/components/menu.js
  init_util();
  var open = null;
  var CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function closeMenus() {
    if (open) {
      const m = open;
      open = null;
      m.trigger && m.trigger.setAttribute("aria-expanded", "false");
      liquidClose(m.node, m.trigger).then(() => m.node.remove());
    }
  }
  function showMenu(items, at, label = "Menu") {
    closeMenus();
    const node = el("div", "glass menu");
    node.setAttribute("role", "menu");
    node.setAttribute("aria-label", label);
    const pane2 = el("div", "pane");
    items.forEach((it) => {
      if (it === "-") {
        pane2.append(el("div", "menu-sep"));
        return;
      }
      const b = el("button", "menu-item");
      b.setAttribute("role", it.checked != null ? "menuitemcheckbox" : "menuitem");
      if (it.checked != null) b.setAttribute("aria-checked", String(!!it.checked));
      if (it.disabled) b.disabled = true;
      const chk = el("span", "menu-check");
      chk.innerHTML = it.checked ? CHECK : "";
      b.append(chk, el("span", "menu-label", it.label));
      if (it.hint) b.append(el("span", "menu-hint", it.hint));
      b.onclick = () => {
        closeMenus();
        it.action && it.action();
      };
      pane2.append(b);
    });
    node.append(pane2);
    document.body.append(node);
    glassify(node, "menu");
    const trigger = at instanceof Element ? at : null;
    let x, y;
    if (trigger) {
      const r = trigger.getBoundingClientRect();
      x = r.left;
      y = r.bottom + 8;
      trigger.setAttribute("aria-expanded", "true");
    } else {
      x = at.x;
      y = at.y;
    }
    node.style.left = "0px";
    node.style.top = "0px";
    const w = node.offsetWidth, h = node.offsetHeight;
    node.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px";
    node.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + "px";
    open = { node, trigger };
    liquidOpen(node, trigger || null);
    const first = node.querySelector(".menu-item:not(:disabled)");
    first && first.focus({ preventScroll: true });
    node.addEventListener("keydown", (e) => {
      const list2 = [...node.querySelectorAll(".menu-item:not(:disabled)")], i = list2.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        list2[(i + 1) % list2.length].focus();
        e.preventDefault();
      }
      if (e.key === "ArrowUp") {
        list2[(i - 1 + list2.length) % list2.length].focus();
        e.preventDefault();
      }
      if (e.key === "Escape") {
        closeMenus();
        trigger && trigger.focus();
      }
    });
    return node;
  }
  addEventListener("pointerdown", (e) => {
    if (open && !e.target.closest(".menu") && e.target !== open.trigger && !(open.trigger && open.trigger.contains(e.target))) closeMenus();
  }, true);
  addEventListener("blur", closeMenus);

  // src/js/widgets/clock.js
  init_util();
  init_settings();

  // src/js/core/time.js
  init_settings();
  var fmtTime = (d, opts = {}) => new Intl.DateTimeFormat(void 0, { hour: "numeric", minute: "2-digit", hour12: !cfg.clock.h24, ...opts }).format(d);
  function timeParts(d) {
    const parts2 = new Intl.DateTimeFormat(void 0, { hour: cfg.clock.leadingZero ? "2-digit" : "numeric", minute: "2-digit", second: "2-digit", hour12: !cfg.clock.h24 }).formatToParts(d);
    const v = (t2) => (parts2.find((p) => p.type === t2) || {}).value || "";
    let h = v("hour");
    if (cfg.clock.h24 && h === "24") h = "00";
    if (cfg.clock.leadingZero && h.length < 2) h = h.padStart(2, "0");
    const sep = (parts2.find((p, i) => p.type === "literal" && parts2[i - 1] && parts2[i - 1].type === "hour") || {}).value || ":";
    return { h, m: v("minute"), s: v("second"), sep: sep.trim() || ":", ap: cfg.clock.ampm ? v("dayPeriod") : "" };
  }
  var DATE = {
    long: { weekday: "long", day: "numeric", month: "long" },
    medium: { weekday: "short", day: "numeric", month: "short" },
    short: { day: "numeric", month: "short" },
    numeric: { year: "numeric", month: "numeric", day: "numeric" },
    weekday: { weekday: "long" }
  };
  var DATE_FORMATS = Object.keys(DATE);
  var longDate = (d, f = cfg.clock.dateFormat) => new Intl.DateTimeFormat(void 0, DATE[f] || DATE.long).format(d);

  // src/js/widgets/clock.js
  var CLOCK_STYLES = [["digital", "Digital"], ["analog", "Analog"], ["minimal", "Minimal"], ["stacked", "Stacked"], ["flip", "Flip"], ["words", "Words"], ["rings", "Rings"], ["outline", "Outline"], ["neon", "Neon"], ["lcd", "LCD"]];
  var CLOCK_FONTS = [["system", "System"], ["rounded", "Rounded"], ["serif", "Serif"], ["mono", "Mono"], ["condensed", "Condensed"], ["pixel", "Pixel"]];
  var DIGITAL = ["digital", "minimal", "outline", "neon", "lcd"];
  var ONES = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
  var num = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  function timeWords(d) {
    const h = d.getHours() % 12, m = d.getMinutes();
    return ["It’s", h === 0 ? "twelve" : ONES[h], m === 0 ? "o’clock" : m < 10 ? "oh " + ONES[m] : num(m)];
  }
  var ring = (r, cls) => {
    const C = 2 * Math.PI * r;
    return `<circle cx="60" cy="60" r="${r}" fill="none" class="rg-track" stroke-width="7"/><circle cx="60" cy="60" r="${r}" fill="none" class="rg ${cls}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-c="${C.toFixed(1)}" transform="rotate(-90 60 60)"/>`;
  };
  var CLOCK_WEIGHTS = [["auto", "Auto"], ["300", "Light"], ["500", "Medium"], ["700", "Bold"], ["800", "Heavy"]];
  var CLOCK_NUMERALS = [["four", "12 · 3 · 6 · 9"], ["all", "All"], ["none", "None"]];
  function analogSVG(size, numerals) {
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const a = i * 6 * Math.PI / 180, major = i % 5 === 0, r1 = major ? 40 : 43, r2 = 46;
      ticks += `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * r2}" y2="${50 - Math.cos(a) * r2}" stroke="currentColor" stroke-opacity="${major ? 0.9 : 0.35}" class="${major ? "tk-major" : "tk-minor"}" stroke-linecap="round"/>`;
    }
    const list2 = numerals === "all" ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : numerals === "none" ? [] : [12, 3, 6, 9];
    let nums = "";
    list2.forEach((n) => {
      const a = n % 12 * 30 * Math.PI / 180, r = numerals === "all" ? 32 : 31;
      nums += `<text x="${50 + Math.sin(a) * r}" y="${50 - Math.cos(a) * r + 4.2}" text-anchor="middle" font-size="${numerals === "all" ? 10 : 12}" fill="currentColor">${n}</text>`;
    });
    return `<svg class="analog" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="var(--wash)" stroke="currentColor" stroke-opacity=".15"/>${ticks}${nums}
    <line class="h-h" x1="50" y1="54" x2="50" y2="27" stroke="currentColor" stroke-linecap="round"/>
    <line class="h-m" x1="50" y1="56" x2="50" y2="14" stroke="currentColor" stroke-linecap="round"/>
    <line class="h-s" x1="50" y1="60" x2="50" y2="10" stroke="#ff9f0a" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.6" fill="#ff9f0a" stroke="currentColor" stroke-width="1"/></svg>`;
  }
  function clockFace(host, getOpts) {
    let built = "";
    const q = (s) => host.querySelector(s);
    function build2(o) {
      host.textContent = "";
      if (o.style === "analog") host.innerHTML = analogSVG(o.size || 140, o.numerals) + `<div class="cf-date"></div>`;
      else if (o.style === "stacked") host.innerHTML = `<div class="cf-h num"></div><div class="cf-m num"><span class="cf-mm"></span><span class="cf-ap"></span></div><div class="cf-s num"></div><div class="cf-date"></div>`;
      else if (o.style === "flip") host.innerHTML = `<div class="cf-flip num"><span class="fl" data-i="0"></span><span class="fl" data-i="1"></span><span class="fl-sep"></span><span class="fl" data-i="2"></span><span class="fl" data-i="3"></span><span class="fl-s"><span class="fl sm" data-i="4"></span><span class="fl sm" data-i="5"></span></span><span class="cf-ap"></span></div><div class="cf-date"></div>`;
      else if (o.style === "words") host.innerHTML = `<div class="cf-words"><span class="w0"></span><b class="w1"></b><span class="w2"></span></div><div class="cf-date"></div>`;
      else if (o.style === "rings") host.innerHTML = `<div class="cf-rings"><svg viewBox="0 0 120 120" aria-hidden="true">${ring(54, "rg-h")}${ring(44, "rg-m")}${ring(34, "rg-s")}</svg><div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span></div></div><div class="cf-date"></div>`;
      else if (o.style === "lcd") host.innerHTML = `<div class="cf-lcd"><div class="cf-time num cf-ghost" aria-hidden="true"></div><div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span><span class="cf-sec"></span><span class="cf-ap"></span></div></div><div class="cf-date"></div>`;
      else host.innerHTML = `<div class="cf-time num"><span class="cf-hh"></span><span class="cf-colon"></span><span class="cf-mm"></span><span class="cf-sec"></span><span class="cf-ap"></span></div><div class="cf-date"></div>`;
      built = `${o.style}|${o.size || ""}|${o.numerals || ""}`;
    }
    return {
      tick(now) {
        const o = getOpts();
        if (built !== `${o.style}|${o.size || ""}|${o.numerals || ""}`) build2(o);
        host.className = `clockface cf-${o.style}${o.blink ? " blink" : ""}${DIGITAL.includes(o.style) ? " cf-digitalish" : ""}`;
        host.dataset.font = o.font || "system";
        const w = o.weight && o.weight !== "auto" ? +o.weight : 0;
        if (w) {
          host.style.setProperty("--cf-weight", w);
          host.style.setProperty("--cf-wf", (w / 600).toFixed(2));
        } else {
          host.style.removeProperty("--cf-weight");
          host.style.removeProperty("--cf-wf");
        }
        const d = q(".cf-date");
        d.hidden = !o.date;
        if (o.date) d.textContent = longDate(now);
        if (o.style === "analog") {
          const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = now.getHours() % 12 + m / 60;
          q(".h-h").setAttribute("transform", `rotate(${h * 30} 50 50)`);
          q(".h-m").setAttribute("transform", `rotate(${m * 6} 50 50)`);
          const sh = q(".h-s");
          sh.style.display = o.seconds ? "" : "none";
          sh.setAttribute("transform", `rotate(${s * 6} 50 50)`);
          return;
        }
        const t2 = timeParts(now);
        if (o.style === "words") {
          const [a, b, c] = timeWords(now);
          q(".w0").textContent = a;
          q(".w1").textContent = b;
          q(".w2").textContent = c;
          return;
        }
        if (o.style === "flip") {
          const digits = (t2.h.padStart(2, "0") + t2.m + t2.s).split("");
          host.querySelectorAll(".fl").forEach((f) => {
            const v = digits[+f.dataset.i];
            if (f.textContent !== v) {
              const first = !f.textContent;
              f.textContent = v;
              if (!first && !matchMedia("(prefers-reduced-motion: reduce)").matches) f.animate([{ transform: "perspective(400px) rotateX(-90deg)" }, { transform: "perspective(400px) rotateX(0)" }], { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
            }
          });
          q(".fl-sep").textContent = t2.sep;
          q(".fl-s").hidden = !o.seconds;
          q(".cf-ap").textContent = t2.ap;
          q(".cf-ap").hidden = !t2.ap;
          return;
        }
        if (o.style === "rings") {
          const H = now.getHours() % 12 + now.getMinutes() / 60, Mi = now.getMinutes() + now.getSeconds() / 60, Se = now.getSeconds();
          [[".rg-h", H / 12], [".rg-m", Mi / 60], [".rg-s", Se / 60]].forEach(([sel, f]) => {
            const c = q(sel), C = +c.dataset.c;
            c.setAttribute("stroke-dashoffset", (C * (1 - f)).toFixed(1));
          });
          q(".rg-s").style.display = o.seconds ? "" : "none";
          host.querySelectorAll(".rg-track")[2].style.display = o.seconds ? "" : "none";
          q(".cf-hh").textContent = t2.h;
          q(".cf-colon").textContent = t2.sep;
          q(".cf-mm").textContent = t2.m;
          return;
        }
        if (o.style === "lcd") q(".cf-ghost").textContent = `88${t2.sep}88${o.seconds ? "88" : ""}`;
        if (o.style === "stacked") {
          q(".cf-h").textContent = t2.h.padStart(2, "0");
          q(".cf-mm").textContent = t2.m;
          q(".cf-ap").textContent = t2.ap;
          q(".cf-ap").hidden = !t2.ap;
          q(".cf-s").textContent = t2.s;
          q(".cf-s").hidden = !o.seconds;
          return;
        }
        q(".cf-hh").textContent = t2.h;
        q(".cf-colon").textContent = t2.sep;
        q(".cf-mm").textContent = t2.m;
        q(".cf-sec").textContent = t2.s;
        q(".cf-sec").hidden = !o.seconds;
        q(".cf-ap").textContent = t2.ap;
        q(".cf-ap").hidden = !t2.ap;
      }
    };
  }
  var cardClockOpts = () => ({ style: cfg.clock.style, seconds: cfg.clock.seconds, date: cfg.clock.date, size: Math.round(150 * cfg.clock.size), font: cfg.clock.font, weight: cfg.clock.weight, numerals: cfg.clock.numerals, blink: cfg.clock.blink });
  var heroClockOpts = () => ({ style: cfg.hero.style, seconds: cfg.hero.seconds, date: cfg.hero.date, size: Math.round(260 * cfg.hero.size), font: cfg.hero.font, weight: cfg.hero.weight, numerals: cfg.hero.numerals, blink: cfg.clock.blink });
  function mountClock(pane2) {
    const host = el("div");
    pane2.append(host);
    const card = pane2.parentElement, face = clockFace(host, cardClockOpts);
    const look = () => {
      card.style.setProperty("--cf-scale", cfg.clock.size);
      card.style.setProperty("--cf-align", cfg.clock.align);
      card.style.setProperty("--cf-justify", { left: "start", right: "end" }[cfg.clock.align] || "center");
    };
    look();
    return { tick(now) {
      look();
      face.tick(now);
    } };
  }

  // src/js/widgets/weather.js
  init_util();
  init_settings();
  init_bus();
  var ICONS = {
    sun: '<circle cx="12" cy="12" r="5" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g>',
    moon: '<path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z" fill="#f2f2f7"/>',
    partly: '<circle cx="9" cy="9" r="4" fill="#ffd60a"/><path d="M8 20h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.6A2.9 2.9 0 0 0 8 20Z" fill="#f2f2f7" stroke="rgba(0,0,0,.08)"/>',
    cloud: '<path d="M7 19h10.5a4 4 0 0 0 0-8 6 6 0 0 0-11.4 1.8A3.2 3.2 0 0 0 7 19Z" fill="#e5e5ea" stroke="rgba(0,0,0,.08)"/>',
    fog: '<g stroke="#c7c7cc" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h16M6 13h14M4 17h12"/></g>',
    rain: '<path d="M7 15h10.5a3.6 3.6 0 0 0 0-7.2 5.6 5.6 0 0 0-10.6 1.6A2.8 2.8 0 0 0 7 15Z" fill="#e5e5ea" stroke="rgba(0,0,0,.08)"/><g stroke="#40c8e0" stroke-width="2" stroke-linecap="round"><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/></g>',
    snow: '<path d="M7 15h10.5a3.6 3.6 0 0 0 0-7.2 5.6 5.6 0 0 0-10.6 1.6A2.8 2.8 0 0 0 7 15Z" fill="#e5e5ea" stroke="rgba(0,0,0,.08)"/><g fill="#8fd3ff"><circle cx="8.5" cy="19" r="1.2"/><circle cx="12.5" cy="20" r="1.2"/><circle cx="16.5" cy="19" r="1.2"/></g>',
    storm: '<path d="M7 14h10.5a3.6 3.6 0 0 0 0-7.2 5.6 5.6 0 0 0-10.6 1.6A2.8 2.8 0 0 0 7 14Z" fill="#c7c7cc"/><path d="M12.5 14l-2.5 4h3l-2 4" fill="none" stroke="#ffd60a" stroke-width="2" stroke-linejoin="round"/>'
  };
  var icon = (k, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
  function codeInfo(code, day = true) {
    if (code === 0) return [day ? "sun" : "moon", "Clear"];
    if (code <= 2) return [day ? "partly" : "moon", code === 1 ? "Mostly Clear" : "Partly Cloudy"];
    if (code === 3) return ["cloud", "Cloudy"];
    if (code === 45 || code === 48) return ["fog", "Fog"];
    if (code >= 51 && code <= 67) return ["rain", code < 61 ? "Drizzle" : "Rain"];
    if (code >= 71 && code <= 77) return ["snow", "Snow"];
    if (code >= 80 && code <= 82) return ["rain", "Showers"];
    if (code >= 85 && code <= 86) return ["snow", "Snow Showers"];
    if (code >= 95) return ["storm", "Thunderstorms"];
    return ["cloud", "Cloudy"];
  }
  async function searchCities(q) {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8`).then((r) => r.json());
    return (g.results || []).map((r) => ({ name: r.name, latitude: r.latitude, longitude: r.longitude, label: [r.name, r.admin1, r.country_code].filter(Boolean).join(", ") }));
  }
  async function locateByIP() {
    const r = await fetch("https://ipapi.co/json/").then((r2) => r2.json());
    if (!r || !r.city) throw new Error("unknown");
    return { name: r.city, latitude: r.latitude, longitude: r.longitude, label: [r.city, r.region, r.country_code].filter(Boolean).join(", ") };
  }
  function mountWeather(pane2) {
    pane2.innerHTML = `<div class="wx-top"><div><div class="wx-city"></div><div class="wx-temp num"></div></div>
    <div class="wx-cond"><span class="wx-icon"></span><span class="wx-label">Loading</span><div class="soft num wx-hilo"></div></div></div>
    <div class="wx-hours num"></div><div class="wx-note"></div>`;
    const q = (s) => pane2.querySelector(s);
    let timer, last = null;
    const render = (d, live2, reason) => {
      last = [d, live2, reason];
      q(".wx-city").textContent = d.city;
      q(".wx-temp").textContent = Math.round(d.temp) + "°";
      const [ic, label] = codeInfo(d.code, d.isDay);
      q(".wx-icon").innerHTML = icon(ic, 30);
      q(".wx-label").textContent = label;
      q(".wx-hilo").textContent = `H:${Math.round(d.hi)}°  L:${Math.round(d.lo)}°`;
      const hrs = q(".wx-hours");
      hrs.textContent = "";
      d.hours.slice(0, 6).forEach((h, i) => {
        const c = el("div");
        c.append(el("div", "soft", i === 0 ? "Now" : new Intl.DateTimeFormat(void 0, { hour: "numeric", hour12: !cfg.clock.h24 }).format(h.time)));
        const ico = el("div");
        ico.innerHTML = icon(codeInfo(h.code, h.isDay)[0], 20);
        c.append(ico, el("div", null, Math.round(h.temp) + "°"));
        hrs.append(c);
      });
      const note = q(".wx-note");
      note.textContent = live2 ? `Updated ${fmtTime(/* @__PURE__ */ new Date())} · Open-Meteo` : reason === "city" ? `Couldn’t find “${cfg.city}”. Pick a city in Settings › Weather. Showing a sample.` : "Sample forecast. Live weather can’t load right now (offline?). It retries every few minutes.";
      note.classList.toggle("warn", !live2);
      bus.emit("weather", { temp: d.temp, code: d.code, isDay: d.isDay, live: live2 });
      bus.emit("layout");
    };
    const sample2 = () => {
      const now = /* @__PURE__ */ new Date(), base = cfg.unit === "f" ? 61 : 16, isDay = (t2) => t2.getHours() > 6 && t2.getHours() < 19;
      return {
        city: cfg.city,
        temp: base,
        code: 2,
        isDay: isDay(now),
        hi: base + 3,
        lo: base - 5,
        hours: [2, 2, 3, 61, 3, 1].map((c, i) => {
          const t2 = new Date(now.getTime() + i * 36e5);
          return { time: t2, temp: base + [0, 1, 1, -1, -2, -3][i], code: c, isDay: isDay(t2) };
        })
      };
    };
    async function load() {
      clearTimeout(timer);
      let notFound = false;
      try {
        const ctl = new AbortController();
        setTimeout(() => ctl.abort(), 7e3);
        let p = cfg.geo && cfg.geo.name === cfg.city ? cfg.geo : null;
        if (!p) {
          const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cfg.city)}&count=1`, { signal: ctl.signal }).then((r) => r.json());
          if (!g.results || !g.results.length) {
            notFound = true;
            throw new Error("No such city");
          }
          p = { name: g.results[0].name, latitude: g.results[0].latitude, longitude: g.results[0].longitude };
        }
        const u = cfg.unit === "f" ? "&temperature_unit=fahrenheit" : "";
        const f = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=2&timezone=auto${u}`, { signal: ctl.signal }).then((r) => r.json());
        let idx2 = f.hourly.time.findIndex((t2) => t2.slice(0, 13) === f.current.time.slice(0, 13));
        if (idx2 < 0) idx2 = 0;
        const hours = [0, 1, 2, 3, 4, 5].map((i) => ({ time: new Date(Date.now() + i * 36e5), temp: f.hourly.temperature_2m[idx2 + i], code: f.hourly.weather_code[idx2 + i], isDay: !!f.hourly.is_day[idx2 + i] }));
        render({ city: p.name, temp: f.current.temperature_2m, code: f.current.weather_code, isDay: !!f.current.is_day, hi: f.daily.temperature_2m_max[0], lo: f.daily.temperature_2m_min[0], hours }, true);
        timer = setTimeout(load, 15 * 6e4);
      } catch {
        render(sample2(), false, notFound ? "city" : "net");
        timer = setTimeout(load, 5 * 6e4);
      }
    }
    load();
    return { load, render: () => last && render(...last) };
  }

  // src/js/widgets/music.js
  init_util();
  init_settings();
  init_bus();

  // src/js/audio/cover-art.js
  init_util();
  function fitFont(ctx, text, maxW, maxSize, weight = 800) {
    let size = maxSize;
    ctx.font = `${weight} ${size}px Unbounded, "Arial Black", sans-serif`;
    const w = ctx.measureText(text).width;
    if (w > maxW) size = Math.floor(size * maxW / w);
    ctx.font = `${weight} ${size}px Unbounded, "Arial Black", sans-serif`;
    return size;
  }
  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function titleBox(W2, H) {
    const wide = W2 > 900;
    return wide ? { x: W2 * 0.045, y: H * 0.17, w: Math.min(W2 - 460, W2 * 0.6), size: H * 0.2 } : { x: W2 * 0.06, y: H * 0.14, w: W2 * 0.88, size: H * 0.13 };
  }
  function drawTitle(ctx, W2, H, text, color) {
    const box = titleBox(W2, H);
    const size = fitFont(ctx, text, box.w, box.size);
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.fillText(text, box.x, box.y);
    return size;
  }
  var ART = {
    salt(ctx, W2, H, t2, title) {
      const m = Math.min(W2, H), p = t2.pal;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W2, H);
      const sx = W2 * (W2 > 900 ? 0.58 : 0.62), sy = H * 0.5, sr = m * 0.26;
      circle(ctx, sx, sy, sr, p.a);
      const sea = H * 0.6;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, sea, W2, H - sea);
      let y = sea, i = 0;
      while (y < H) {
        const th = m * (6e-3 + i * 42e-4), gap = th * 0.8;
        ctx.fillStyle = p.b;
        ctx.fillRect(0, y, W2, th);
        const rw = sr * 1.6 * Math.max(0.12, 1 - i * 0.075);
        ctx.fillStyle = p.a;
        ctx.fillRect(sx - rw / 2, y + th, rw, gap);
        y += th + gap;
        i++;
      }
      if (title) drawTitle(ctx, W2, H, t2.album, p.b);
    },
    lanterns(ctx, W2, H, t2, title) {
      const m = Math.min(W2, H), p = t2.pal;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W2, H);
      const cell = Math.max(m * 0.15, 18), cols = Math.ceil(W2 / cell) + 1, rows = Math.ceil(H / cell) + 1;
      const r = rng(7);
      const colors = [p.a, p.b, p.c];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const cx = i * cell + (j % 2 ? cell / 2 : 0), cy = j * cell + cell * 0.5;
        const k = r(), rad = cell * (0.14 + 0.26 * k);
        ctx.strokeStyle = "rgba(247,230,210,0.35)";
        ctx.lineWidth = Math.max(1, cell * 0.012);
        ctx.beginPath();
        ctx.moveTo(cx, cy - cell * 0.5);
        ctx.lineTo(cx, cy - rad);
        ctx.stroke();
        circle(ctx, cx, cy, rad, colors[Math.floor(r() * 3)]);
      }
      if (title) {
        const box = titleBox(W2, H);
        const size = fitFont(ctx, t2.album, box.w, box.size);
        ctx.fillStyle = p.bg;
        ctx.fillRect(box.x - size * 0.25, box.y - size * 0.18, ctx.measureText(t2.album).width + size * 0.5, size * 1.32);
        drawTitle(ctx, W2, H, t2.album, p.c);
      }
    },
    orbit(ctx, W2, H, t2, title) {
      const m = Math.min(W2, H), p = t2.pal;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W2, H);
      ctx.save();
      ctx.translate(W2 / 2, H / 2);
      ctx.rotate(-0.42);
      const d = Math.hypot(W2, H), step = m * 0.07;
      ctx.fillStyle = "rgba(158,240,220,0.55)";
      for (let x = -d; x < d; x += step) ctx.fillRect(x, -d, Math.max(1, m * 0.012), d * 2);
      ctx.restore();
      const px2 = W2 * (W2 > 900 ? 0.56 : 0.6), py2 = H * 0.6, pr = m * 0.27;
      const ring2 = (front) => {
        ctx.save();
        ctx.translate(px2, py2);
        ctx.rotate(-0.28);
        ctx.beginPath();
        ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.strokeStyle = p.b;
        ctx.lineWidth = m * 0.03;
        ctx.stroke();
        ctx.restore();
      };
      ring2(false);
      circle(ctx, px2, py2, pr, p.a);
      ctx.save();
      ctx.beginPath();
      ctx.arc(px2, py2, pr, 0, Math.PI * 2);
      ctx.clip();
      circle(ctx, px2 + pr * 0.55, py2 + pr * 0.2, pr, p.c);
      ctx.restore();
      ring2(true);
      if (title) drawTitle(ctx, W2, H, t2.album, p.b);
    },
    ostia(ctx, W2, H, t2, title) {
      const m = Math.min(W2, H), p = t2.pal;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W2, H);
      const s = Math.max(m * 0.065, 8), top = H * 0.58, rows = 3;
      for (let j = 0; j < rows; j++) for (let i = 0; i * s < W2; i++) {
        if ((i + j) % 2 === 0) {
          ctx.fillStyle = p.a;
          ctx.fillRect(i * s, top + j * s, s, s);
        }
      }
      ctx.fillStyle = p.b;
      ctx.fillRect(0, top + rows * s + s * 0.5, W2, s * 0.35);
      ctx.fillStyle = p.b;
      ctx.textBaseline = "alphabetic";
      ctx.font = `800 ${H * 1.05}px Unbounded, "Arial Black", sans-serif`;
      ctx.fillText("7", W2 * (W2 > 900 ? 0.5 : 0.52), H * 0.98);
      if (title) drawTitle(ctx, W2, H, t2.album, p.c);
    },
    glasshouse(ctx, W2, H, t2, title) {
      const m = Math.min(W2, H), p = t2.pal;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W2, H);
      const n = W2 > 900 ? 7 : 4, w = W2 / n, base = H, archH = H * 0.6;
      const cols = [p.a, p.b, p.c];
      for (let i = 0; i < n; i++) {
        const x = i * w, r = w * 0.42, cx = x + w / 2, topY = base - archH;
        ctx.fillStyle = cols[i % 3];
        ctx.beginPath();
        ctx.moveTo(cx - r, base);
        ctx.lineTo(cx - r, topY + r);
        ctx.arc(cx, topY + r, r, Math.PI, 0);
        ctx.lineTo(cx + r, base);
        ctx.closePath();
        ctx.fill();
        const r2 = r * 0.55;
        ctx.fillStyle = p.bg;
        ctx.beginPath();
        ctx.moveTo(cx - r2, base);
        ctx.lineTo(cx - r2, topY + r + r * 0.5);
        ctx.arc(cx, topY + r + r * 0.5, r2, Math.PI, 0);
        ctx.lineTo(cx + r2, base);
        ctx.closePath();
        ctx.fill();
      }
      if (title) drawTitle(ctx, W2, H, t2.album, p.a);
    },
    signal(ctx, W2, H, t2, title) {
      const m = Math.min(W2, H), p = t2.pal;
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W2, H);
      const rings = (cx, cy, max, step) => {
        for (let r = max, k = 0; r > 0; r -= step, k++) circle(ctx, cx, cy, r, k % 2 ? p.bg : k % 4 === 0 ? p.a : p.b);
      };
      rings(W2 * 0.3, H * 0.78, m * 0.62, m * 0.055);
      rings(W2 * (W2 > 900 ? 0.6 : 0.85), H * 0.3, m * 0.2, m * 0.04);
      if (title) drawTitle(ctx, W2, H, t2.album, p.a);
    }
  };
  function paintArt(canvas, track, W2, H, title) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W2 * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ART[track.id](ctx, W2, H, track, title);
  }

  // src/js/components/slider.js
  init_util();
  function slider(root, { value = 0, label, step = 0.05, format = (v) => `${Math.round(v * 100)}%`, onInput, onChange, knob = true } = {}) {
    root.classList.add("slider");
    root.setAttribute("role", "slider");
    root.tabIndex = 0;
    root.setAttribute("aria-label", label);
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    root.innerHTML = `<span class="sl-track"><span class="sl-fill"></span></span>`;
    const fill = root.querySelector(".sl-fill");
    let thumb = null;
    if (knob) {
      thumb = document.createElement("span");
      thumb.className = "sl-thumb";
      thumb.innerHTML = `<span class="pane"><span class="sl-knob"></span></span>`;
      root.append(thumb);
      glassify(thumb, "droplet");
    }
    let v = clamp(value, 0, 1), drag = false;
    const draw2 = () => {
      fill.style.width = v * 100 + "%";
      if (thumb) thumb.style.left = v * 100 + "%";
      root.setAttribute("aria-valuenow", String(Math.round(v * 100)));
      root.setAttribute("aria-valuetext", format(v));
    };
    const at = (e) => {
      const r = root.getBoundingClientRect();
      return clamp((e.clientX - r.left) / r.width, 0, 1);
    };
    root.addEventListener("pointerdown", (e) => {
      drag = true;
      root.classList.add("active");
      root.setPointerCapture(e.pointerId);
      v = at(e);
      draw2();
      onInput && onInput(v);
      e.preventDefault();
    });
    root.addEventListener("pointermove", (e) => {
      if (!drag) return;
      v = at(e);
      draw2();
      onInput && onInput(v);
    });
    const end = () => {
      if (!drag) return;
      drag = false;
      root.classList.remove("active");
      onChange && onChange(v);
    };
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
    root.addEventListener("keydown", (e) => {
      const map = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 4, PageDown: -step * 4 };
      if (e.key in map) v = clamp(v + map[e.key], 0, 1);
      else if (e.key === "Home") v = 0;
      else if (e.key === "End") v = 1;
      else return;
      e.preventDefault();
      draw2();
      onInput && onInput(v);
      onChange && onChange(v);
    });
    draw2();
    return { set(nv) {
      if (!drag) {
        v = clamp(nv, 0, 1);
        draw2();
      }
    }, get value() {
      return v;
    }, get dragging() {
      return drag;
    } };
  }

  // src/js/widgets/music.js
  init_player();
  init_visualizer();
  var PLAY = "M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z";
  var PAUSE = "M6 4.5a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM13.4 4.5a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1z";
  var SKIP2 = `<svg width="26" height="26" viewBox="0 0 32 32" fill="currentColor"><path d="M4 9.2v13.6a1 1 0 0 0 1.55.83l9.55-6.6a1.2 1.2 0 0 0 0-2.06L5.55 8.37A1 1 0 0 0 4 9.2Z"/><path d="M17 9.2v13.6a1 1 0 0 0 1.55.83l9.55-6.6a1.2 1.2 0 0 0 0-2.06l-9.55-6.6A1 1 0 0 0 17 9.2Z"/></svg>`;
  var ICON = {
    shuffle: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h4v4M4 20 20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/></svg>',
    repeat: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
    list: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>'
  };
  var sys = { title: "", artist: "", state: "stopped", pos: 0, dur: 0, at: 0, thumb: null, enabled: false };
  function paintCover(canvas, t2, size) {
    if (t2 && t2.kind === "synth") return paintArt(canvas, t2.synth, size, size, false);
    const dpr = 2;
    canvas.width = canvas.height = size * dpr;
    const x = canvas.getContext("2d");
    x.scale(dpr, dpr);
    let h = 0;
    for (const c of t2 ? t2.title : "?") h = (h * 31 + c.charCodeAt(0)) % 360;
    const g = x.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, `hsl(${h},70%,55%)`);
    g.addColorStop(1, `hsl(${(h + 60) % 360},75%,40%)`);
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    x.fillStyle = "rgba(255,255,255,.9)";
    x.font = `700 ${size * 0.42}px -apple-system, "Inter Tight", sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText((t2 ? t2.title : "?").trim().charAt(0).toUpperCase(), size / 2, size / 2 + 1);
  }
  function mountMusic(pane2, card) {
    pane2.innerHTML = `<div class="mu-row"><span class="mu-art"><canvas class="mu-thumb" aria-hidden="true"></canvas><img class="mu-img" alt="" hidden></span>
      <div class="mu-meta"><div class="mu-title"></div><div class="mu-artist"></div></div>
      <button class="icon-btn mu-listbtn" aria-label="Playlist" aria-expanded="false">${ICON.list}</button></div>
    <canvas class="mu-viz" aria-hidden="true"></canvas>
    <div class="mu-scrub"><div class="mu-seek"></div><div class="mu-times num"><span class="mu-el">0:00</span><span class="mu-rem"></span></div></div>
    <div class="mu-ctrl">
      <button class="icon-btn mu-mode mu-shuffle" aria-label="Shuffle" aria-pressed="false">${ICON.shuffle}</button>
      <button class="icon-btn mu-prev" aria-label="Previous track"><span style="display:inline-flex;transform:scaleX(-1)">${SKIP2}</span></button>
      <button class="icon-btn mu-play" aria-label="Play"><svg width="34" height="34" viewBox="0 0 24 24"><path fill="currentColor" d="${PLAY}"/></svg></button>
      <button class="icon-btn mu-next" aria-label="Next track">${SKIP2}</button>
      <button class="icon-btn mu-mode mu-repeat" aria-label="Repeat">${ICON.repeat}<span class="mu-one" hidden>1</span></button>
    </div>
    <div class="mu-src faint" hidden>Playing on your PC</div>
    <ol class="mu-list" hidden></ol>
    <div class="mu-drop" aria-hidden="true">Drop to add to playlist</div>`;
    const q = (s) => pane2.querySelector(s);
    const mode = () => cfg.music.source === "system" || cfg.music.source === "auto" && sys.enabled && sys.title ? "system" : "player";
    const duration = () => mode() === "system" ? sys.dur : player.duration;
    const position = () => mode() === "system" ? Math.min(sys.dur, sys.pos + (sys.state === "playing" ? (performance.now() - sys.at) / 1e3 : 0)) : player.position;
    const playing = () => mode() === "system" ? sys.state === "playing" : player.playing;
    const seek = slider(q(".mu-seek"), {
      label: "Seek",
      knob: false,
      step: 0.03,
      format: (v) => fmt(v * duration()),
      onInput: (v) => {
        q(".mu-el").textContent = fmt(v * duration());
      },
      onChange: (v) => {
        if (mode() === "player") player.seek(v * duration());
      }
    });
    attach(q(".mu-viz"), { align: "bottom" });
    function render() {
      const s = mode() === "system", t2 = current();
      q(".mu-src").hidden = !s;
      q(".mu-ctrl").hidden = s;
      q(".mu-listbtn").hidden = s;
      q(".mu-seek").classList.toggle("readonly", s);
      q(".mu-viz").hidden = !cfg.viz.card;
      q(".mu-title").textContent = s ? sys.title || "Nothing playing" : t2 ? t2.title : "No tracks";
      q(".mu-artist").textContent = s ? sys.artist : t2 ? t2.artist || "Unknown artist" : "Drop audio files here";
      const img = q(".mu-img"), cv = q(".mu-thumb");
      if (s && sys.thumb) {
        img.src = sys.thumb;
        img.hidden = false;
        cv.hidden = true;
      } else {
        img.hidden = true;
        cv.hidden = false;
        paintCover(cv, t2, 52);
      }
      q(".mu-play path").setAttribute("d", playing() ? PAUSE : PLAY);
      q(".mu-play").setAttribute("aria-label", playing() ? "Pause" : "Play");
      q(".mu-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle));
      const r = cfg.music.repeat;
      q(".mu-repeat").setAttribute("aria-pressed", String(r !== "off"));
      q(".mu-one").hidden = r !== "one";
      q(".mu-repeat").setAttribute("aria-label", `Repeat: ${r === "one" ? "one" : r === "all" ? "all" : "off"}`);
      renderList();
      progress(true);
      bus.emit("music", { title: q(".mu-title").textContent, artist: q(".mu-artist").textContent, playing: playing(), thumb: s ? sys.thumb : null, track: t2, mode: s ? "system" : "player" });
    }
    function renderList() {
      const ol = q(".mu-list");
      if (ol.hidden) return;
      ol.textContent = "";
      const L = list(), cur = current();
      if (!L.length) ol.append(el("li", "empty", "Playlist is empty. Drop audio files on this card."));
      L.forEach((t2, i) => {
        const li = el("li"), b = el("button", "mu-li" + (t2 === cur ? " on" : ""));
        b.append(el("span", "mu-li-n num", t2 === cur && playing() ? "♪" : String(i + 1)), el("span", "mu-li-t", t2.title), el("span", "mu-li-a", t2.artist || ""));
        b.onclick = () => player.go(i, true);
        li.append(b);
        ol.append(li);
      });
    }
    let lastQ = -1;
    function progress(force) {
      const d = duration() || 0, p = position(), qn = Math.floor(p * 2);
      if (!force && qn === lastQ) return;
      lastQ = qn;
      seek.set(d ? p / d : 0);
      if (!seek.dragging) q(".mu-el").textContent = fmt(p);
      q(".mu-rem").textContent = d ? "-" + fmt(d - p) : "";
    }
    q(".mu-play").onclick = () => player.toggle();
    q(".mu-next").onclick = () => player.next(false);
    q(".mu-prev").onclick = () => player.prev();
    q(".mu-shuffle").onclick = () => set("music.shuffle", !cfg.music.shuffle);
    q(".mu-repeat").onclick = () => set("music.repeat", { off: "all", all: "one", one: "off" }[cfg.music.repeat]);
    q(".mu-listbtn").onclick = () => {
      const ol = q(".mu-list");
      ol.hidden = !ol.hidden;
      q(".mu-listbtn").setAttribute("aria-expanded", String(!ol.hidden));
      renderList();
      bus.emit("layout");
    };
    let depth = 0;
    card.addEventListener("dragenter", (e) => {
      if ([...e.dataTransfer.items || []].some((i) => i.kind === "file")) {
        depth++;
        card.classList.add("dropping");
        e.preventDefault();
      }
    });
    card.addEventListener("dragover", (e) => {
      if (card.classList.contains("dropping")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    });
    card.addEventListener("dragleave", () => {
      if (--depth <= 0) {
        depth = 0;
        card.classList.remove("dropping");
      }
    });
    card.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      card.classList.remove("dropping");
      const added = await addFiles(e.dataTransfer.files);
      if (added.length) {
        const i = list().findIndex((t2) => t2.id === added[0].id);
        player.go(i, true);
      }
    });
    bus.on("player", render);
    bus.on("playlist", render);
    bus.on("settings", ({ patch }) => {
      if (patch.music || patch.viz) render();
    });
    bus.on("media:status", (on) => {
      sys.enabled = on;
      render();
    });
    bus.on("media:props", (e) => {
      sys.title = e.title || "";
      sys.artist = e.artist || "";
      sys.enabled = true;
      render();
    });
    bus.on("media:thumb", (e) => {
      sys.thumb = e.thumbnail || null;
      render();
    });
    bus.on("media:state", (s) => {
      sys.state = s;
      sys.at = performance.now();
      if (s === "stopped") sys.title = "";
      render();
    });
    bus.on("media:timeline", (e) => {
      sys.pos = e.position || 0;
      sys.dur = e.duration || 0;
      sys.at = performance.now();
      progress(true);
    });
    if ("mediaSession" in navigator) {
      const s = (a, f) => {
        try {
          navigator.mediaSession.setActionHandler(a, f);
        } catch {
        }
      };
      s("play", () => player.play());
      s("pause", () => player.pause());
      s("nexttrack", () => player.next());
      s("previoustrack", () => player.prev());
    }
    render();
    return { frame() {
      if (playing()) progress(false);
    }, render };
  }

  // src/js/widgets/calendar.js
  init_util();
  init_bus();
  init_settings();
  var chevron = (d) => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  function mountCalendar(pane2) {
    const now0 = /* @__PURE__ */ new Date(), view = { y: now0.getFullYear(), m: now0.getMonth() };
    const head = el("div", "cal-head"), month = el("div", "cal-month");
    const prev = el("button", "icon-btn");
    prev.setAttribute("aria-label", "Previous month");
    prev.innerHTML = chevron("M15 5l-7 7 7 7");
    const next = el("button", "icon-btn");
    next.setAttribute("aria-label", "Next month");
    next.innerHTML = chevron("M9 5l7 7-7 7");
    const grid = el("div", "cal-grid num");
    head.append(month, prev, next);
    pane2.append(head, grid);
    const render = () => {
      const now = /* @__PURE__ */ new Date(), { y, m } = view, first = new Date(y, m, 1);
      const ws = cfg.calendar.weekStart || 0, start = (first.getDay() - ws + 7) % 7, days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
      month.textContent = "";
      month.append(el("b", null, new Intl.DateTimeFormat(void 0, { month: "long" }).format(first)), y !== now.getFullYear() ? ` ${y}` : "");
      grid.textContent = "";
      const dow = new Intl.DateTimeFormat(void 0, { weekday: "narrow" });
      for (let i = 0; i < 7; i++) grid.append(el("div", "dow", dow.format(new Date(2024, 8, 1 + (i + ws) % 7))));
      const cells = Math.ceil((start + days) / 7) * 7;
      for (let i = 0; i < cells; i++) {
        let day2, out = false;
        if (i < start) {
          day2 = prevDays - start + i + 1;
          out = true;
        } else if (i >= start + days) {
          day2 = i - start - days + 1;
          out = true;
        } else day2 = i - start + 1;
        const c = el("div", "d" + (out ? " out" : "") + ([0, 6].includes((i + ws) % 7) ? " wknd" : ""), day2);
        if (!out && y === now.getFullYear() && m === now.getMonth() && day2 === now.getDate()) {
          c.classList.add("today");
          c.setAttribute("aria-current", "date");
        }
        grid.append(c);
      }
      bus.emit("layout");
    };
    prev.onclick = () => {
      view.m--;
      if (view.m < 0) {
        view.m = 11;
        view.y--;
      }
      render();
    };
    next.onclick = () => {
      view.m++;
      if (view.m > 11) {
        view.m = 0;
        view.y++;
      }
      render();
    };
    render();
    let day = now0.toDateString();
    return { render, minute() {
      const d = (/* @__PURE__ */ new Date()).toDateString();
      if (d !== day) {
        day = d;
        render();
      }
    } };
  }

  // src/js/widgets/world-clock.js
  init_util();
  init_settings();
  var ZONES = [
    ["Pacific/Honolulu", "Honolulu"],
    ["America/Los_Angeles", "Los Angeles"],
    ["America/Denver", "Denver"],
    ["America/Chicago", "Chicago"],
    ["America/Mexico_City", "Mexico City"],
    ["America/New_York", "New York"],
    ["America/Toronto", "Toronto"],
    ["America/Sao_Paulo", "São Paulo"],
    ["Europe/London", "London"],
    ["Europe/Lisbon", "Lisbon"],
    ["Europe/Paris", "Paris"],
    ["Europe/Berlin", "Berlin"],
    ["Europe/Madrid", "Madrid"],
    ["Europe/Rome", "Rome"],
    ["Africa/Cairo", "Cairo"],
    ["Africa/Lagos", "Lagos"],
    ["Africa/Johannesburg", "Johannesburg"],
    ["Europe/Istanbul", "Istanbul"],
    ["Europe/Moscow", "Moscow"],
    ["Asia/Riyadh", "Riyadh"],
    ["Asia/Dubai", "Dubai"],
    ["Asia/Karachi", "Karachi"],
    ["Asia/Kolkata", "Kolkata"],
    ["Asia/Dhaka", "Dhaka"],
    ["Asia/Bangkok", "Bangkok"],
    ["Asia/Singapore", "Singapore"],
    ["Asia/Shanghai", "Shanghai"],
    ["Asia/Hong_Kong", "Hong Kong"],
    ["Asia/Seoul", "Seoul"],
    ["Asia/Tokyo", "Tokyo"],
    ["Australia/Sydney", "Sydney"],
    ["Pacific/Auckland", "Auckland"]
  ];
  var nameOf = (tz) => (ZONES.find((z) => z[0] === tz) || [0, tz.split("/").pop().replace(/_/g, " ")])[1];
  function offsetMinutes(tz, now) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(now);
    const g = (t2) => +p.find((x) => x.type === t2).value;
    const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
    return Math.round((asUTC - (now.getTime() - now.getSeconds() * 1e3 - now.getMilliseconds())) / 6e4);
  }
  function mountWorld(pane2) {
    pane2.append(el("div", "w-title", "World Clock"));
    const list2 = el("div");
    pane2.append(list2);
    const render = () => {
      const now = /* @__PURE__ */ new Date(), local = -now.getTimezoneOffset();
      list2.textContent = "";
      if (!cfg.cities.length) {
        list2.append(el("div", "empty", "No cities yet. Pick some in Settings › Clock."));
        return;
      }
      cfg.cities.forEach((tz) => {
        let off;
        try {
          off = offsetMinutes(tz, now);
        } catch {
          return;
        }
        const diff = (off - local) / 60;
        const day = +new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "numeric" }).format(now) - now.getDate();
        const row = el("div", "wc-row"), left = el("div");
        left.append(el("div", "wc-city", nameOf(tz)), el("div", "wc-off", `${day > 0 ? "Tomorrow" : day < 0 ? "Yesterday" : "Today"}, ${diff === 0 ? "same time" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} h`}`));
        row.append(left, el("div", "wc-time num", fmtTime(now, { timeZone: tz })));
        list2.append(row);
      });
    };
    render();
    return { minute: render, render };
  }

  // src/js/widgets/reminders.js
  init_util();
  init_store();
  init_bus();
  var CHECK2 = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var X = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function mountReminders(pane2) {
    let items = store.get("reminders", [
      { id: 1, text: "Pick a wallpaper in Settings", done: false },
      { id: 2, text: "Right-click the desktop for more", done: false },
      { id: 3, text: "Turn on the Focus Timer widget", done: true }
    ]);
    const title = el("div", "w-title"), count = el("span", "faint num");
    title.append(el("span", "grow", "Reminders"), count);
    const list2 = el("ul", "rm-list");
    const form = el("form", "rm-add");
    form.innerHTML = `<label class="sr-only" for="rmIn">New reminder</label><input class="field" id="rmIn" placeholder="New reminder" autocomplete="off"><button class="pill" type="submit">Add</button>`;
    pane2.append(title, list2, form);
    const save = () => store.set("reminders", items);
    function render() {
      list2.textContent = "";
      const open2 = items.filter((r) => !r.done).length;
      count.textContent = open2 ? `${open2} open` : "";
      if (!items.length) list2.append(el("li", "empty", "All clear. Add a reminder below."));
      items.forEach((r) => {
        const li = el("li", "rm-item" + (r.done ? " done" : ""));
        const chk = el("button", "rm-check");
        chk.setAttribute("aria-label", `${r.done ? "Mark not done" : "Mark done"}: ${r.text}`);
        chk.innerHTML = r.done ? CHECK2 : "";
        chk.onclick = () => {
          r.done = !r.done;
          save();
          render();
        };
        const del = el("button", "icon-btn rm-del");
        del.setAttribute("aria-label", `Delete: ${r.text}`);
        del.innerHTML = X;
        del.onclick = () => {
          items = items.filter((x) => x !== r);
          save();
          render();
        };
        li.append(chk, el("span", "rm-text", r.text), del);
        list2.append(li);
      });
      bus.emit("layout");
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      const inp = form.querySelector("input"), v = inp.value.trim();
      if (!v) return;
      items.push({ id: Date.now(), text: v, done: false });
      inp.value = "";
      save();
      render();
    };
    bus.on("reminders:set", (text) => {
      const want = String(text || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
      want.forEach((w) => {
        if (!items.some((i) => i.text === w)) items.push({ id: Date.now() + Math.random(), text: w, done: false });
      });
      save();
      render();
    });
    render();
    return {};
  }

  // src/js/widgets/notes.js
  init_util();
  init_store();
  init_bus();
  function mountNotes(pane2) {
    const title = el("div", "w-title"), status = el("span", "faint", "Saved");
    title.append(el("span", "grow", "Notes"), status);
    const ta = el("textarea", "notes");
    ta.placeholder = "Jot something down. It stays on this device.";
    ta.setAttribute("aria-label", "Note");
    ta.value = store.get("notes", "");
    let t2;
    ta.addEventListener("input", () => {
      status.textContent = "Saving";
      clearTimeout(t2);
      t2 = setTimeout(() => {
        store.set("notes", ta.value);
        status.textContent = "Saved";
      }, 500);
    });
    bus.on("notes:set", (v) => {
      if (typeof v === "string" && v !== ta.value) {
        ta.value = v;
        store.set("notes", v);
      }
    });
    pane2.append(title, ta);
    return {};
  }

  // src/js/widgets/focus.js
  init_util();

  // src/js/components/segmented.js
  init_util();
  function segmented({ options, value, label, onChange }) {
    const root = document.createElement("div");
    root.className = "seg";
    root.setAttribute("role", "radiogroup");
    root.setAttribute("aria-label", label);
    const drop = document.createElement("span");
    drop.className = "seg-drop";
    drop.innerHTML = `<span class="pane"></span>`;
    root.append(drop);
    const buttons = options.map(([v, text]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.setAttribute("role", "radio");
      b.dataset.v = v;
      b.setAttribute("aria-checked", String(v === value));
      b.onclick = () => select(v, true);
      root.append(b);
      return b;
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = buttons.findIndex((b) => b.dataset.v === value), n = buttons[(i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
      select(n.dataset.v, true);
      n.focus();
      e.preventDefault();
    });
    let placed = false;
    function place(animate) {
      const b = buttons.find((x) => x.dataset.v === value);
      if (!b || !b.offsetWidth) return;
      const from = { l: drop.offsetLeft, w: drop.offsetWidth };
      drop.style.left = b.offsetLeft + "px";
      drop.style.width = b.offsetWidth + "px";
      if (animate && placed && !reducedMotion() && from.w) {
        const dx = from.l - b.offsetLeft;
        drop.animate([
          { transform: `translateX(${dx}px) scale(${from.w / b.offsetWidth}, 1)` },
          { transform: `translateX(${dx * 0.35}px) scale(1.18, 0.82)`, offset: 0.45 },
          { transform: "translateX(0) scale(1)" }
        ], { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
      }
      placed = true;
    }
    function select(v, user2) {
      if (v === value && placed) return;
      value = v;
      buttons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === v)));
      place(true);
      if (user2 && onChange) onChange(v);
    }
    requestAnimationFrame(() => {
      glassify(drop, "control");
      place(false);
    });
    new ResizeObserver(() => place(false)).observe(root);
    return root;
  }

  // src/js/widgets/focus.js
  function mountFocus(pane2) {
    const C = 2 * Math.PI * 48;
    pane2.innerHTML = `<div class="w-title">Focus Timer</div><div class="fc-body"><div class="fc-ring">
    <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="48" fill="none" stroke="var(--track-bg)" stroke-width="9"/><circle class="fc-arc" cx="55" cy="55" r="48" fill="none" style="stroke: var(--accent, #bf5af2)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
    <span class="t num" role="timer" aria-live="off"></span></div><div class="fc-btns"><button class="pill fc-start">Start</button><button class="pill fc-reset">Reset</button></div></div>`;
    const q = (s2) => pane2.querySelector(s2);
    const s = { total: 1500, left: 1500, running: false, endAt: 0 };
    const seg = segmented({ label: "Session length", options: [["15", "15m"], ["25", "25m"], ["50", "50m"]], value: "25", onChange: (v) => {
      s.total = s.left = +v * 60;
      s.running = false;
      render();
    } });
    q(".fc-btns").append(seg);
    function render() {
      q(".t").textContent = `${Math.floor(s.left / 60)}:${String(Math.floor(s.left % 60)).padStart(2, "0")}`;
      q(".fc-arc").setAttribute("stroke-dashoffset", String(C * (1 - s.left / s.total)));
      q(".fc-start").textContent = s.running ? "Pause" : s.left < s.total ? "Resume" : "Start";
    }
    function chime() {
      try {
        const c = new (window.AudioContext || window.webkitAudioContext)();
        setTimeout(() => c.close(), 1500);
        [880, 1175, 1568].forEach((f, i) => {
          const o = c.createOscillator(), g = c.createGain(), t2 = c.currentTime + i * 0.18;
          o.frequency.value = f;
          g.gain.setValueAtTime(1e-4, t2);
          g.gain.exponentialRampToValueAtTime(0.25, t2 + 0.02);
          g.gain.exponentialRampToValueAtTime(1e-4, t2 + 0.6);
          o.connect(g);
          g.connect(c.destination);
          o.start(t2);
          o.stop(t2 + 0.7);
        });
      } catch {
      }
    }
    q(".fc-start").onclick = () => {
      if (s.running) s.running = false;
      else {
        s.running = true;
        s.endAt = Date.now() + s.left * 1e3;
      }
      render();
    };
    q(".fc-reset").onclick = () => {
      s.running = false;
      s.left = s.total;
      render();
    };
    render();
    return { tick() {
      if (!s.running) return;
      s.left = Math.max(0, (s.endAt - Date.now()) / 1e3);
      if (s.left <= 0) {
        s.running = false;
        chime();
        s.left = s.total;
      }
      render();
    } };
  }

  // src/js/widgets/system.js
  init_util();
  init_bus();
  function mountSystem(pane2) {
    pane2.innerHTML = `<div class="w-title">System</div><div class="sys-grid num">
    <div class="sys-cell"><div class="sys-k">Battery</div><div class="sys-v" data-k="bat">Not reported</div></div>
    <div class="sys-cell"><div class="sys-k">Network</div><div class="sys-v" data-k="net">Online</div></div>
    <div class="sys-cell"><div class="sys-k">Display</div><div class="sys-v" data-k="disp">-</div></div>
    <div class="sys-cell"><div class="sys-k">Session</div><div class="sys-v" data-k="up">0 min</div></div></div>`;
    const v = (k) => pane2.querySelector(`[data-k="${k}"]`);
    const net = () => {
      const c = navigator.connection;
      v("net").textContent = navigator.onLine ? c && c.effectiveType ? `Online, ${c.effectiveType.toUpperCase()}` : "Online" : "Offline";
      bus.emit("net", navigator.onLine);
    };
    addEventListener("online", net);
    addEventListener("offline", net);
    net();
    const disp = () => {
      v("disp").textContent = `${screen.width}×${screen.height}`;
    };
    disp();
    addEventListener("resize", disp);
    if (navigator.getBattery) navigator.getBattery().then((b) => {
      const upd = () => {
        v("bat").textContent = `${Math.round(b.level * 100)}%${b.charging ? ", charging" : ""}`;
        bus.emit("battery", { level: b.level, charging: b.charging });
      };
      upd();
      b.addEventListener("levelchange", upd);
      b.addEventListener("chargingchange", upd);
    }).catch(() => {
    });
    return { minute() {
      v("up").textContent = `${Math.floor(performance.now() / 6e4)} min`;
    } };
  }

  // src/js/main.js
  init_player();
  init_visualizer();

  // src/js/shell/layout.js
  init_util();
  init_settings();
  var ORDER = ["clock", "weather", "music", "calendar", "visualizer", "world", "reminders", "notes", "focus", "system"];
  var widgetEl = (id) => $(`.widget[data-w="${id}"]`);
  var TOP = () => 64 + (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0);
  var M = 16;
  function placeSaved(node, p) {
    const W2 = innerWidth, H = innerHeight, w = node.offsetWidth, h = node.offsetHeight;
    const left = p.ax === "r" ? W2 - p.x - w : p.x, top = p.ay === "b" ? H - p.y - h : p.y;
    node.style.left = clamp(left, 0, Math.max(0, W2 - w)) + "px";
    node.style.top = clamp(top, 0, Math.max(0, H - h)) + "px";
  }
  var autoWidth = (W2) => W2 >= 1800 ? 320 : W2 >= 760 ? 300 : Math.min(360, W2 - 24);
  var LAYOUTS2 = [["columns", "Columns"], ["left", "Sidebar left"], ["right", "Sidebar right"], ["bento", "Bento grid"], ["row", "Bottom row"]];
  function layout({ animate = false } = {}) {
    const W2 = innerWidth, H = innerHeight, gap = 14, bottom = H - (cfg.dock.mode === "always" ? 104 : 24);
    const before = /* @__PURE__ */ new Map();
    if (animate) $$(".widget").forEach((w) => {
      if (!w.hidden) before.set(w, w.getBoundingClientRect());
    });
    const vis = ORDER.filter((id) => cfg.widgets[id] && widgetEl(id) && !widgetEl(id).dataset.closing);
    const cw = autoWidth(W2);
    vis.forEach((id) => {
      const n = widgetEl(id), own = cfg.cards[id] && cfg.cards[id].width;
      n.style.width = (own || cw) + "px";
    });
    const free = vis.filter((id) => !cfg.positions[id]);
    const mode = W2 < 700 ? "columns" : cfg.layoutMode;
    placeHero();
    const box = (n) => {
      const l = parseFloat(n.style.left) || 0, t2 = parseFloat(n.style.top) || 0;
      return { l, t: t2, r: l + n.offsetWidth, b: t2 + n.offsetHeight };
    };
    const hit = (occ, l, t2, w, h) => occ.find((o) => o.l < l + w + gap && o.r + gap > l && o.t < t2 + h + gap && o.b + gap > t2);
    const saved2 = vis.filter((id) => cfg.positions[id]).map((id) => {
      const n = widgetEl(id);
      placeSaved(n, cfg.positions[id]);
      return { n, ay: cfg.positions[id].ay };
    });
    const taken = [];
    [
      ...saved2.filter((c) => c.ay !== "b").sort((a, b) => parseFloat(a.n.style.top) - parseFloat(b.n.style.top)),
      ...saved2.filter((c) => c.ay === "b").sort((a, b) => parseFloat(b.n.style.top) - parseFloat(a.n.style.top))
    ].forEach(({ n, ay }) => {
      let r = box(n), o, guard = 0;
      const over = (q) => taken.find((o2) => o2.l < q.r - 1 && o2.r > q.l + 1 && o2.t < q.b - 1 && o2.b > q.t + 1);
      while ((o = over(r)) && guard++ < 20) {
        const top = ay === "b" ? o.t - gap - (r.b - r.t) : o.b + gap;
        if (top < 0 || top + (r.b - r.t) > H) break;
        n.style.top = top + "px";
        r = box(n);
      }
      taken.push(r);
    });
    let place = {};
    if (mode === "row") {
      const occ = [...taken];
      let x = M, base = bottom, rowTop = bottom;
      free.forEach((id) => {
        const n = widgetEl(id), w = n.offsetWidth, h = n.offsetHeight;
        if (x + w > W2 - M && x > M) {
          x = M;
          base = rowTop - gap;
          rowTop = base;
        }
        let o;
        while ((o = hit(occ, x, base - h, w, h)) && x + w <= W2 - M) x = o.r + gap;
        place[id] = [x, Math.max(TOP(), base - h)];
        occ.push({ l: x, t: base - h, r: x + w, b: base });
        rowTop = Math.min(rowTop, base - h);
        x += w + gap;
      });
    } else {
      let cands = [], top = TOP();
      const col = (i) => M + i * (cw + gap), colR = (i) => W2 - M - cw - i * (cw + gap);
      if (mode === "left") cands = [[col(0)], [col(0), col(1)], [col(0), col(1), col(2)]];
      else if (mode === "right") cands = [[colR(0)], [colR(0), colR(1)], [colR(0), colR(1), colR(2)]];
      else if (mode === "bento") {
        const n = clamp(Math.floor((W2 - 2 * M + gap) / (cw + gap)), 1, 4);
        for (let k = Math.min(3, n); k <= n; k++) {
          const s0 = Math.round((W2 - (k * cw + (k - 1) * gap)) / 2);
          cands.push([...Array(k)].map((_, i) => s0 + i * (cw + gap)));
        }
        const hero3 = $("#hero");
        if (hero3 && !hero3.hidden && !cfg.positions.hero) top = Math.max(top, (parseFloat(hero3.style.top) || 0) + hero3.offsetHeight + 28);
      } else {
        if (W2 >= 1e3) cands.push([M, W2 - M - cw]);
        if (W2 >= 1240) cands.push([M, M + cw + gap, W2 - M - cw, W2 - M - 2 * cw - gap]);
        if (W2 >= 700 && W2 < 1e3) cands.push([Math.round(W2 / 2 - cw - gap / 2), Math.round(W2 / 2 + gap / 2)]);
      }
      if (!cands.length) cands.push([Math.round((W2 - cw) / 2)]);
      for (const xs of cands) {
        const ys = xs.map(() => top), occ = [...taken];
        place = {};
        free.forEach((id) => {
          const n = widgetEl(id), w = n.offsetWidth, h = n.offsetHeight;
          let c = 0;
          ys.forEach((y2, i) => {
            if (y2 < ys[c] - 1) c = i;
          });
          let y = ys[c], o;
          while (o = hit(occ, xs[c], y, w, h)) y = o.b + gap;
          place[id] = [xs[c], y];
          occ.push({ l: xs[c], t: y, r: xs[c] + w, b: y + h });
          ys[c] = y + h + gap;
        });
        if (Math.max(...ys) - gap <= bottom) break;
      }
    }
    free.forEach((id) => {
      const n = widgetEl(id);
      n.style.left = place[id][0] + "px";
      n.style.top = place[id][1] + "px";
    });
    if (animate) flip([...before.keys()].filter((n) => !n.hidden), before);
  }
  function placeHero() {
    const hero3 = $("#hero");
    if (!hero3 || hero3.hidden) return;
    const p = cfg.positions.hero, W2 = innerWidth, H = innerHeight, w = hero3.offsetWidth, h = hero3.offsetHeight, cw = autoWidth(W2);
    hero3.style.transform = "none";
    if (p) return placeSaved(hero3, p);
    const mode = W2 < 700 ? "columns" : cfg.layoutMode;
    let x = (W2 - w) / 2, y = Math.round(H * 0.14);
    if (mode === "left") {
      x = M + cw + (W2 - M - cw - w) / 2;
      y = (H - h) / 2;
    } else if (mode === "right") {
      x = (W2 - M - cw - w) / 2;
      y = (H - h) / 2;
    } else if (mode === "row") {
      x = M + 12;
      y = TOP() + 12;
    } else if (mode === "bento") y = TOP() + 8;
    hero3.style.left = clamp(Math.round(x), 0, Math.max(0, W2 - w)) + "px";
    hero3.style.top = clamp(Math.round(y), 0, Math.max(0, H - h)) + "px";
  }
  function placeHeroAt(spot) {
    const hero3 = $("#hero");
    if (!hero3) return;
    if (spot === "auto") {
      const p = { ...cfg.positions };
      delete p.hero;
      set("positions", p);
      return;
    }
    const W2 = innerWidth, H = innerHeight, w = hero3.offsetWidth, h = hero3.offsetHeight, pad = 40;
    const [v, hz] = spot;
    const left = hz === "l" ? pad : hz === "r" ? W2 - pad - w : (W2 - w) / 2;
    const top = v === "t" ? TOP() + 8 : v === "b" ? H - pad - h - (cfg.dock.mode === "always" ? 90 : 0) : (H - h) / 2;
    const ax = hz === "r" ? "r" : "l", ay = v === "b" ? "b" : "t";
    set("positions", { ...cfg.positions, hero: { ax, ay, x: Math.round(ax === "r" ? W2 - left - w : left), y: Math.round(ay === "b" ? H - top - h : top) } });
  }
  function setWidgetVisible(id, on) {
    const n = widgetEl(id);
    if (!n) return;
    if (on && n.hidden) {
      n.hidden = false;
      layout({ animate: true });
      refresh(n);
      liquidOpen(n);
    } else if (!on && !n.hidden) {
      n.dataset.closing = "1";
      liquidClose(n).then(() => {
        delete n.dataset.closing;
        layout({ animate: true });
      });
    }
  }
  var guideX = document.createElement("div");
  var guideY = document.createElement("div");
  guideX.className = "snap-guide gx";
  guideY.className = "snap-guide gy";
  function enableDragging() {
    document.body.append(guideX, guideY);
    let d = null;
    const blocked = (t2) => t2.closest("button, input, textarea, select, a, .slider, .seg, .mu-list, .rm-list, [contenteditable]");
    addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || cfg.lockLayout) return;
      const node = e.target.closest(".widget, #hero");
      if (!node || blocked(e.target)) return;
      const r = node.getBoundingClientRect();
      d = { node, id: node.id === "hero" ? "hero" : node.dataset.w, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, on: false, pid: e.pointerId };
    });
    addEventListener("pointermove", (e) => {
      if (!d) return;
      if (!d.on) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
        d.on = true;
        d.node.classList.add("dragging");
        d.node.style.transform = "none";
        document.documentElement.classList.add("is-dragging");
        try {
          d.node.setPointerCapture(d.pid);
        } catch {
        }
        d.others = $$(".widget").filter((w2) => !w2.hidden && w2 !== d.node).map((w2) => w2.getBoundingClientRect());
      }
      const w = d.node.offsetWidth, h = d.node.offsetHeight, W2 = innerWidth, H = innerHeight;
      let x = e.clientX - d.dx, y = e.clientY - d.dy, sx = null, sy = null;
      const T = 10, xs = [[M, M], [W2 - M - w, W2 - M]], ys = [[TOP(), TOP()], [H - M - h, H - M]];
      d.others.forEach((o) => {
        xs.push([o.left, o.left], [o.right - w, o.right], [o.right + 14, o.right + 14], [o.left - w - 14, o.left - 14]);
        ys.push([o.top, o.top], [o.bottom - h, o.bottom], [o.bottom + 14, o.bottom + 14], [o.top - h - 14, o.top - 14]);
      });
      for (const [v, line] of xs) if (Math.abs(x - v) < T) {
        x = v;
        sx = line;
        break;
      }
      for (const [v, line] of ys) if (Math.abs(y - v) < T) {
        y = v;
        sy = line;
        break;
      }
      if (sx == null) x = Math.round(x / 8) * 8;
      if (sy == null) y = Math.round(y / 8) * 8;
      x = clamp(x, 0, Math.max(0, W2 - w));
      y = clamp(y, 0, Math.max(0, H - h));
      d.node.style.left = x + "px";
      d.node.style.top = y + "px";
      guideX.style.display = sx == null ? "none" : "block";
      guideX.style.left = sx + "px";
      guideY.style.display = sy == null ? "none" : "block";
      guideY.style.top = sy + "px";
    });
    const end = () => {
      if (!d) return;
      if (d.on) {
        const W2 = innerWidth, H = innerHeight;
        const rect = (n) => {
          const left = parseFloat(n.style.left) || 0, top = parseFloat(n.style.top) || 0;
          return { left, top, width: n.offsetWidth, height: n.offsetHeight, right: left + n.offsetWidth, bottom: top + n.offsetHeight };
        };
        const anchor = (rr) => {
          const ax = rr.left + rr.width / 2 > W2 / 2 ? "r" : "l", ay = rr.top + rr.height / 2 > H / 2 ? "b" : "t";
          return { ax, ay, x: Math.round(ax === "r" ? W2 - rr.right : rr.left), y: Math.round(ay === "b" ? H - rr.bottom : rr.top) };
        };
        const pos = { ...cfg.positions };
        $$(".widget").forEach((w) => {
          if (!w.hidden && !w.dataset.closing && w !== d.node && !pos[w.dataset.w]) pos[w.dataset.w] = anchor(rect(w));
        });
        pos[d.id] = anchor(rect(d.node));
        update({ positions: pos }, { silent: true });
        d.node.classList.remove("dragging");
        document.documentElement.classList.remove("is-dragging");
        guideX.style.display = guideY.style.display = "none";
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        addEventListener("click", swallow, true);
        setTimeout(() => removeEventListener("click", swallow, true), 0);
      }
      d = null;
    };
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }
  function resetLayout() {
    set("positions", {}, { silent: true });
    layout({ animate: true });
  }

  // src/js/shell/island.js
  init_util();
  init_settings();
  init_bus();
  init_player();
  init_visualizer();
  function initIsland({ openMenu, openSettings: openSettings2, toggleCC }) {
    const wrap = $("#islandWrap"), isl = $("#island");
    const q = (s) => isl.querySelector(s);
    attach($("#ivL"), { align: "center", reverse: true, bars: 18 });
    attach($("#ivR"), { align: "center", bars: 18 });
    let pinned = false, hover = false, music = { playing: false }, wx = null, battery = null;
    function mode() {
      const m = cfg.island.mode;
      wrap.dataset.mode = m;
      wrap.hidden = m === "hidden";
      sync();
    }
    function sync() {
      const expanded = cfg.island.mode !== "bar" && (pinned || hover && cfg.island.expandOnHover);
      if (isl.classList.contains("expanded") !== expanded) {
        isl.classList.toggle("expanded", expanded);
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          isl.animate(
            expanded ? [{ transform: "scale(.72, .5)" }, { transform: "scale(1.02, 1.04)", offset: 0.6 }, { transform: "scale(1)" }] : [{ transform: "scale(1.25, 2.2)" }, { transform: "scale(.97, .94)", offset: 0.6 }, { transform: "scale(1)" }],
            { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)", composite: "add" }
          );
          const pn = isl.querySelector(".pane");
          pn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 80, fill: "backwards" });
        }
      }
      isl.classList.toggle("playing", !!music.playing);
      const I = cfg.island;
      q(".isl-time").hidden = !I.showTime;
      q(".isl-wx").hidden = !I.showWeather || !wx;
      q(".isl-net").style.display = I.showNetwork ? "" : "none";
      q(".isl-np-wrap").hidden = !I.showNowPlaying;
      q(".isl-cc").hidden = !I.showCC;
      q(".isl-menu").hidden = !I.showMenu;
      drawBattery();
      wrap.classList.toggle("viz-on", cfg.viz.island && !!music.playing && cfg.island.mode !== "bar");
    }
    let hoverT = 0;
    isl.addEventListener("pointerenter", () => {
      clearTimeout(hoverT);
      hoverT = setTimeout(() => {
        hover = true;
        sync();
      }, 120);
    });
    wrap.addEventListener("pointerleave", () => {
      clearTimeout(hoverT);
      hoverT = setTimeout(() => {
        if (!wrap.matches(":hover")) {
          hover = false;
          sync();
        }
      }, 320);
    });
    q(".isl-compact").addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      pinned = !pinned;
      sync();
    });
    addEventListener("pointerdown", (e) => {
      if (pinned && !e.target.closest("#islandWrap")) {
        pinned = false;
        sync();
      }
    });
    let hideT = 0;
    addEventListener("pointermove", (e) => {
      if (cfg.island.mode !== "auto") return;
      const shown = wrap.classList.contains("revealed"), reach = 10 + isl.offsetHeight + 40;
      if (e.clientY < 10 || shown && (e.clientY < reach || pinned || wrap.matches(":hover, :focus-within"))) {
        clearTimeout(hideT);
        hideT = 0;
        if (!shown) wrap.classList.add("revealed");
      } else if (shown && !hideT) hideT = setTimeout(() => {
        hideT = 0;
        wrap.classList.remove("revealed");
      }, 450);
    }, { passive: true });
    q(".isl-menu").onclick = (e) => openMenu(e.currentTarget);
    q(".isl-cc").onclick = (e) => toggleCC(e.currentTarget);
    q(".isl-set").onclick = (e) => openSettings2(null, e.currentTarget);
    q(".isl-play").onclick = () => player.toggle();
    q(".isl-next").onclick = () => player.next();
    q(".isl-prev").onclick = () => player.prev();
    q(".isl-shuffle").onclick = () => set("music.shuffle", !cfg.music.shuffle);
    bus.on("music", (m) => {
      music = m;
      q(".isl-title").textContent = m.title;
      q(".isl-artist").textContent = m.artist || "";
      q(".isl-np").textContent = m.playing ? m.title : "";
      const img = q(".isl-img"), cv = q(".isl-art"), img2 = q(".isl-img-s"), cv2 = q(".isl-art-s");
      if (m.thumb) {
        img.src = img2.src = m.thumb;
        img.hidden = img2.hidden = false;
        cv.hidden = cv2.hidden = true;
      } else {
        img.hidden = img2.hidden = true;
        cv.hidden = cv2.hidden = false;
        paintCover(cv, m.track, 64);
        paintCover(cv2, m.track, 24);
      }
      q(".isl-play path").setAttribute("d", m.playing ? "M6 4.5a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM13.4 4.5a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1z" : "M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z");
      q(".isl-play").setAttribute("aria-label", m.playing ? "Pause" : "Play");
      q(".isl-ctrl").hidden = m.mode === "system";
      q(".isl-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle));
      sync();
    });
    bus.on("weather", (w) => {
      wx = w;
      q(".isl-wx").textContent = `${Math.round(w.temp)}°`;
      sync();
    });
    bus.on("net", (on) => {
      q(".isl-net").style.opacity = on ? "1" : ".35";
    });
    bus.on("battery", (b) => {
      battery = b;
      drawBattery();
    });
    function drawBattery() {
      const s = q(".isl-bat"), m = cfg.island.battery;
      s.hidden = !battery || m === "off";
      if (s.hidden) return;
      const pctN = Math.round(battery.level * 100), low = battery.level <= 0.2 && !battery.charging;
      const fill = low ? "#ff453a" : battery.charging ? "#30d158" : "currentColor";
      const bolt = battery.charging ? '<path d="M13.6 2.2 9.4 7.3h3l-1.2 4.5 4.3-5.4h-3z" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>' : "";
      const icon2 = (inside) => inside ? `<svg class="bat-ic big" width="34" height="16" viewBox="0 0 34 16" aria-hidden="true"><rect x=".75" y=".75" width="29" height="14.5" rx="4.2" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/><rect x="31" y="5.2" width="2.2" height="5.6" rx="1.1" fill="currentColor" fill-opacity=".5"/><rect x="2.5" y="2.5" width="${(25.5 * battery.level).toFixed(1)}" height="11" rx="2.6" fill="${fill}" fill-opacity="${low || battery.charging ? 0.9 : 0.35}"/><text x="15.2" y="11.6" text-anchor="middle" font-size="9.5" font-weight="800" fill="currentColor">${pctN}</text></svg>` : `<svg class="bat-ic" width="25" height="13" viewBox="0 0 25 13" aria-hidden="true"><rect x=".75" y=".75" width="21" height="11.5" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/><rect x="22.8" y="4.3" width="1.8" height="4.4" rx=".9" fill="currentColor" fill-opacity=".5"/><rect x="2.5" y="2.5" width="${(17.5 * battery.level).toFixed(1)}" height="8" rx="1.8" fill="${fill}"/>${bolt}</svg>`;
      s.innerHTML = m === "inside" ? icon2(true) : m === "icon" ? icon2(false) : m === "both" ? `${pctN}% ${icon2(false)}` : `${pctN}%`;
      s.setAttribute("aria-label", `Battery ${pctN}%${battery.charging ? ", charging" : ""}`);
    }
    bus.on("settings", ({ patch }) => {
      if (patch.island || patch.viz) mode();
      if (patch.music) q(".isl-shuffle").setAttribute("aria-pressed", String(cfg.music.shuffle));
    });
    mode();
    return {
      tick(now) {
        const t2 = timeParts(now);
        q(".isl-time").textContent = `${t2.h}${t2.sep}${t2.m}${cfg.island.seconds ? t2.sep + t2.s : ""}${t2.ap ? " " + t2.ap : ""}`;
        q(".isl-date").textContent = longDate(now);
      }
    };
  }

  // src/js/shell/dock.js
  init_util();
  init_settings();
  init_bus();
  var GLYPHS = {
    gear: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/>',
    app: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6M12 9v6"/>',
    music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>'
  };
  var ACTIONS = {
    settings: "Open Settings",
    cc: "Control Center",
    edit: "Customize this desktop",
    "next-wallpaper": "Next wallpaper",
    "play-pause": "Play / pause",
    "reset-layout": "Reset layout"
  };
  var PRESETS2 = [
    ["Display settings", "uri", "ms-settings:display", "display"],
    ["Sound settings", "uri", "ms-settings:sound", "sliders"],
    ["Personalization", "uri", "ms-settings:personalization", "image"],
    ["Downloads folder", "folder", "%USERPROFILE%\\Downloads", "folder"],
    ["Spotify", "uri", "spotify:", "music"],
    ["Steam", "uri", "steam://open/main", "app"],
    ["Terminal", "uri", "wt:", "terminal"]
  ];
  function runShortcut(s, actions2) {
    if (s.kind === "action") return actions2[s.target] && actions2[s.target]();
    let url2 = s.target.trim();
    if (s.kind === "folder" && !/^file:/i.test(url2)) url2 = "file:///" + url2.replace(/\\/g, "/");
    if (s.kind === "url" && !/^[a-z][a-z0-9+.-]*:/i.test(url2)) url2 = "https://" + url2;
    const a = document.createElement("a");
    a.href = url2;
    a.target = s.kind === "url" ? "_blank" : "_self";
    a.rel = "noopener";
    try {
      a.click();
    } catch {
      window.open(url2, "_blank");
    }
  }
  function initDock(actions2) {
    const dock = $("#dock"), row = dock.querySelector(".dock-row");
    function render() {
      dock.dataset.mode = cfg.dock.mode;
      dock.hidden = cfg.dock.mode === "hidden" || !cfg.dock.shortcuts.length;
      row.textContent = "";
      cfg.dock.shortcuts.forEach((s) => {
        const b = el("button", "app");
        b.title = s.name;
        b.setAttribute("aria-label", s.name);
        b.dataset.kind = s.kind;
        b.innerHTML = GLYPHS[s.icon] ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[s.icon]}</svg>` : `<b>${(s.name[0] || "?").toUpperCase()}</b>`;
        b.onclick = () => {
          press(b);
          runShortcut(s, actions2);
        };
        row.append(b);
      });
    }
    let hideT = 0;
    addEventListener("pointermove", (e) => {
      if (cfg.dock.mode !== "auto") return;
      const shown = dock.classList.contains("revealed"), reach = innerHeight - dock.offsetHeight - 50;
      if (e.clientY > innerHeight - 12 || shown && (e.clientY > reach || dock.matches(":hover"))) {
        clearTimeout(hideT);
        hideT = 0;
        if (!shown) dock.classList.add("revealed");
      } else if (shown && !hideT) hideT = setTimeout(() => {
        hideT = 0;
        dock.classList.remove("revealed");
      }, 450);
    }, { passive: true });
    let raf2 = 0, mx = null;
    dock.addEventListener("pointermove", (e) => {
      mx = e.clientX;
      if (!raf2) raf2 = requestAnimationFrame(mag);
    });
    dock.addEventListener("pointerleave", () => {
      mx = null;
      if (!raf2) raf2 = requestAnimationFrame(mag);
    });
    function mag() {
      raf2 = 0;
      row.querySelectorAll(".app").forEach((a) => {
        if (mx == null) return a.style.setProperty("--mag", "1");
        const r = a.getBoundingClientRect(), d = Math.abs(mx - (r.left + r.width / 2));
        a.style.setProperty("--mag", (1 + 0.3 * Math.max(0, 1 - d / 120) ** 2).toFixed(3));
      });
    }
    bus.on("settings", ({ patch }) => {
      if (patch.dock) render();
    });
    render();
    return { render };
  }

  // src/js/shell/control-center.js
  init_util();
  init_settings();
  init_bus();
  init_player();
  function initControlCenter() {
    const cc2 = $("#cc");
    let trigger = null;
    const pct2 = (v) => Math.round(v * 100) + "%";
    const bri = slider($("#ccBri"), { label: "Wallpaper brightness", value: 1 - cfg.wallpaper.dim / 0.8, onInput: (v) => {
      $("#ccBriV").textContent = pct2(v);
      set("wallpaper.dim", +((1 - v) * 0.8).toFixed(3));
    } });
    const vol = slider($("#ccVol"), { label: "Volume", value: cfg.music.volume, onInput: (v) => {
      $("#ccVolV").textContent = pct2(v);
      set("music.volume", +v.toFixed(3));
    } });
    const tiles = [
      ["#ccFocus", () => update({ focusMode: !cfg.focusMode }), () => cfg.focusMode, ["On", "Off"]],
      ["#ccStyle", () => update({ style: cfg.style === "tinted" ? "clear" : "tinted" }), () => cfg.style === "tinted", ["Tinted", "Clear"]],
      ["#ccMotion", () => set("wallpaper.motion", !cfg.wallpaper.motion), () => cfg.wallpaper.motion, ["On", "Off"]],
      ["#ccIsland", () => set("island.mode", cfg.island.mode === "island" ? "auto" : "island"), () => cfg.island.mode === "island", ["Island", "Auto-hide"]]
    ];
    tiles.forEach(([sel, act]) => {
      const b = $(sel);
      b.onclick = () => {
        press(b);
        act();
      };
    });
    const sync = () => {
      tiles.forEach(([sel, , on, txt]) => {
        const b = $(sel), v = on();
        b.setAttribute("aria-pressed", String(v));
        b.querySelector(".tile-v").textContent = v ? txt[0] : txt[1];
      });
      bri.set(1 - cfg.wallpaper.dim / 0.8);
      vol.set(cfg.music.volume);
      $("#ccBriV").textContent = pct2(1 - cfg.wallpaper.dim / 0.8);
      $("#ccVolV").textContent = pct2(cfg.music.volume);
    };
    bus.on("settings", sync);
    $("#ccPlay").onclick = () => player.toggle();
    $("#ccNext").onclick = () => player.next();
    bus.on("music", (m) => {
      $("#ccTitle").textContent = m.title;
      $("#ccArtist").textContent = m.artist || "";
      const img = $("#ccImg"), cv = $("#ccThumb");
      if (m.thumb) {
        img.src = m.thumb;
        img.hidden = false;
        cv.hidden = true;
      } else {
        img.hidden = true;
        cv.hidden = false;
        paintCover(cv, m.track, 44);
      }
      $("#ccPlay path").setAttribute("d", m.playing ? "M6 4.5a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM13.4 4.5a1 1 0 0 1 1-1H17a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1z" : "M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z");
      $("#ccPlay").hidden = $("#ccNext").hidden = m.mode === "system";
    });
    sync();
    const api = {
      open(from) {
        trigger = from;
        liquidOpen(cc2, trigger);
      },
      close() {
        return liquidClose(cc2, trigger);
      },
      toggle(from) {
        cc2.hidden ? api.open(from) : api.close();
      },
      get isOpen() {
        return !cc2.hidden;
      }
    };
    addEventListener("pointerdown", (e) => {
      if (!cc2.hidden && !e.target.closest("#cc, .isl-cc, .app")) api.close();
    });
    return api;
  }

  // src/js/shell/settings-window.js
  init_util();
  init_settings();
  init_bus();

  // src/js/components/switch.js
  function toggle({ checked = false, label, onChange }) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "switch";
    b.setAttribute("role", "switch");
    b.setAttribute("aria-checked", String(checked));
    b.setAttribute("aria-label", label);
    const knob = document.createElement("span");
    knob.className = "sw-knob";
    knob.innerHTML = `<span class="pane"></span>`;
    b.append(knob);
    glassify(knob, "droplet", { zoom: 0.2, scale: 26 });
    b.addEventListener("pointerdown", () => b.classList.add("pressing"));
    const up = () => b.classList.remove("pressing");
    b.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("click", () => {
      const v = b.getAttribute("aria-checked") !== "true";
      b.setAttribute("aria-checked", String(v));
      onChange && onChange(v);
    });
    return b;
  }

  // src/js/core/looks.js
  init_settings();
  var SKINS = [["glass", "Liquid Glass"], ["brutal", "Brutalist"], ["neon", "Neon"], ["paper", "Paper"], ["retro", "Retro OS"], ["clay", "Clay"], ["bare", "Bare"]];
  var UI_FONTS = [["system", "System"], ["rounded", "Rounded"], ["serif", "Serif"], ["mono", "Mono"], ["condensed", "Condensed"]];
  var hero = (o) => ({ hero: { color: "auto", font: "system", weight: "auto", plate: false, numerals: "four", align: "center", ...o } });
  var LOOKS = [
    {
      id: "liquid",
      name: "Liquid Glass",
      sub: "Clear glass, columns, Dusk",
      skin: "glass",
      layoutMode: "columns",
      accent: "auto",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "theme", theme: "dusk" },
      ...hero({ style: "digital" }),
      island: { mode: "island" }
    },
    {
      id: "brutal",
      name: "Brutalist",
      sub: "Hard edges on Bauhaus shapes",
      skin: "brutal",
      layoutMode: "bento",
      accent: "#ffd60a",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "theme", theme: "bauhaus" },
      ...hero({ style: "outline", font: "mono", weight: 800, color: "#111111" }),
      island: { mode: "bar" }
    },
    {
      id: "cyber",
      name: "Cyberpunk",
      sub: "Neon panels, Outrun sunset",
      skin: "neon",
      layoutMode: "right",
      accent: "#ff2bd6",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "theme", theme: "outrun" },
      ...hero({ style: "neon", font: "condensed" }),
      island: { mode: "island" }
    },
    {
      id: "paper",
      name: "Paper Desk",
      sub: "Sticky notes along the bottom",
      skin: "paper",
      layoutMode: "row",
      accent: "#e63946",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "color", colorA: "#efe3c8", colorB: "#c9b28f", gradStyle: "radial", gradFlow: false },
      ...hero({ style: "words", font: "serif", color: "#3a2f25", align: "left" }),
      island: { mode: "island" }
    },
    {
      id: "retro",
      name: "Retro OS",
      sub: "Bevels, title bars, LCD clock",
      skin: "retro",
      layoutMode: "left",
      accent: "#000080",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "color", colorA: "#008080", colorB: "#006a6a", gradStyle: "linear", gradAngle: 180, gradFlow: false },
      ...hero({ style: "lcd" }),
      island: { mode: "bar" }
    },
    {
      id: "clay",
      name: "Clay",
      sub: "Soft and puffy on pastel",
      skin: "clay",
      layoutMode: "bento",
      accent: "#7c5cff",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "theme", theme: "pastel" },
      ...hero({ style: "rings", font: "rounded" }),
      island: { mode: "island" }
    },
    {
      id: "zen",
      name: "Zen",
      sub: "No panels, just type",
      skin: "bare",
      layoutMode: "row",
      accent: "auto",
      uiFont: "system",
      style: "clear",
      wallpaper: { kind: "theme", theme: "topo" },
      ...hero({ style: "minimal", font: "system" }),
      island: { mode: "auto" }
    },
    {
      id: "space",
      name: "Deep Space",
      sub: "Tinted glass in a nebula",
      skin: "glass",
      layoutMode: "right",
      accent: "#64d2ff",
      uiFont: "system",
      style: "tinted",
      wallpaper: { kind: "theme", theme: "nebula" },
      ...hero({ style: "analog", numerals: "none" }),
      island: { mode: "island" }
    },
    {
      id: "acid",
      name: "Acid",
      sub: "Flip clock on plasma",
      skin: "neon",
      layoutMode: "bento",
      accent: "#c6ff00",
      uiFont: "mono",
      style: "clear",
      wallpaper: { kind: "theme", theme: "acid" },
      ...hero({ style: "flip", font: "mono" }),
      island: { mode: "island" }
    },
    {
      id: "lava",
      name: "Lava Lamp",
      sub: "Glass sidebar, warm blobs",
      skin: "glass",
      layoutMode: "left",
      accent: "#ff9e00",
      uiFont: "rounded",
      style: "clear",
      wallpaper: { kind: "theme", theme: "lava" },
      ...hero({ style: "stacked", font: "rounded", align: "left" }),
      island: { mode: "island" }
    }
  ];
  function applyLook(id) {
    const L = LOOKS.find((l) => l.id === id);
    if (!L) return;
    const { id: _, name, sub, ...patch } = L;
    set("positions", {}, { silent: true });
    update({ ...patch, look: id });
  }

  // src/js/shell/settings-window.js
  init_player();
  init_store();
  var SECTIONS = [
    ["themes", "Themes", '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.9 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15.5" cy="7.5" r="1.2"/>'],
    ["widgets", "Widgets", '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'],
    ["glass", "Glass", '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9.5 15a2.6 2.6 0 0 0 2.5 2.5"/>'],
    ["cards", "Cards", '<rect x="3" y="7" width="14" height="13" rx="2.5"/><path d="M7 4h11.5A2.5 2.5 0 0 1 21 6.5V16"/>'],
    ["wallpaper", "Wallpaper", '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 15.5-5-5-9 9"/>'],
    ["island", "Top Bar", '<rect x="5" y="4" width="14" height="5" rx="2.5"/><path d="M4 20h16M4 15h16" opacity=".5"/>'],
    ["dock", "Shortcuts", '<rect x="3" y="14" width="18" height="6.5" rx="2.5"/><path d="M8 17.3h.01M12 17.3h.01M16 17.3h.01"/><path d="M12 4v6m-3-3 3 3 3-3"/>'],
    ["clock", "Clock", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    ["music", "Music", '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>'],
    ["viz", "Visualizer", '<path d="M4 14v4M8 9v9M12 5v13M16 10v8M20 13v5"/>'],
    ["weather", "Weather", '<path d="M7 18h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 7 18Z"/><path d="M8.5 6.5 7.6 5.6M13 4.5V3.3M4 10.5H2.8"/>'],
    ["data", "Data & Backup", '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>'],
    ["access", "Accessibility", '<circle cx="12" cy="4.8" r="1.8"/><path d="M5 8.5c2.4.8 4.7 1.2 7 1.2s4.6-.4 7-1.2M12 9.7v4.6m0 0-3 6.2m3-6.2 3 6.2"/>']
  ];
  var SRC = { source: "settings" };
  var S = (path, v) => set(path, v, SRC);
  var U = (path) => unset(path, SRC);
  var get = (path) => path.split(".").reduce((o, k) => o == null ? o : o[k], cfg);
  var pct = (v) => Math.round(v * 100) + "%";
  var TITLED = ["world", "reminders", "notes", "focus", "system"];
  var COLORS = ["#ffffff", "#1d1d1f", "#ffd60a", "#ff9f0a", "#ff375f", "#bf5af2", "#5e5ce6", "#0a84ff", "#64d2ff", "#30d158"];
  var GRADIENTS = [
    ["#1f2a6b", "#e0707a"],
    ["#0f2027", "#2c5364"],
    ["#ff9a8b", "#ff6a88"],
    ["#355c7d", "#c06c84"],
    ["#11998e", "#38ef7d"],
    ["#232526", "#414345"],
    ["#fc5c7d", "#6a82fb"],
    ["#f7971e", "#ffd200"],
    ["#8e2de2", "#4a00e0"],
    ["#00c6ff", "#0072ff"],
    ["#f953c6", "#b91d73"],
    ["#a8e063", "#56ab2f"],
    ["#ffecd2", "#fcb69f"],
    ["#e0eafc", "#cfdef3"],
    ["#141e30", "#243b55"],
    ["#ee0979", "#ff6a00"]
  ];
  var ACCENTS = ["#0a84ff", "#5e5ce6", "#bf5af2", "#ff2d55", "#ff375f", "#ff9f0a", "#ffd60a", "#30d158", "#64d2ff", "#ff2bd6", "#c6ff00", "#111111"];
  var CITIES = ["London", "New York", "Los Angeles", "Toronto", "São Paulo", "Paris", "Berlin", "Madrid", "Istanbul", "Dubai", "Karachi", "Lahore", "Islamabad", "Delhi", "Mumbai", "Singapore", "Tokyo", "Seoul", "Sydney", "Cairo", "Lagos", "Riyadh"];
  var RESETS = {
    themes: ["look", "skin", "layoutMode", "accent", "uiFont"],
    widgets: ["widgets", "lockLayout", "positions"],
    glass: ["glass", "style"],
    cards: ["cards"],
    wallpaper: ["wallpaper"],
    island: ["island"],
    dock: ["dock"],
    clock: ["clock", "hero", "calendar", "cities"],
    music: ["music"],
    viz: ["viz"],
    weather: ["city", "unit", "geo"],
    access: ["reduce", "keyboard"]
  };
  function initSettings({ resetLayout: resetLayout2 }) {
    const win = $("#settings"), side = $("#setSide"), main = $("#setMain");
    let current_ = "themes", trigger = null, cardSel = "music", clockTarget = "hero", cleanup = [], cityResults = null, cityStatus = "";
    SECTIONS.forEach(([id, name, icon2]) => {
      const b = el("button", "set-nav");
      b.setAttribute("role", "tab");
      b.dataset.sec = id;
      const ic = el("span", "nav-ic");
      ic.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon2}</svg>`;
      b.append(ic, name);
      b.onclick = () => render(id);
      side.append(b);
    });
    const group = (label, rows, note) => {
      const f = document.createDocumentFragment();
      if (label) f.append(el("div", "group-label", label));
      const g = el("div", "group");
      rows.filter(Boolean).forEach((r) => g.append(r));
      f.append(g);
      if (note) f.append(el("p", "group-note", note));
      return f;
    };
    const row = (label, sub, control) => {
      const r = el("div", "row"), l = el("span", "label", label);
      if (sub) l.append(el("span", "sub", sub));
      r.append(l);
      if (control) r.append(control);
      return r;
    };
    const stack = (label, sub, control) => {
      const r = row(label, sub);
      r.classList.add("stack");
      r.append(control);
      return r;
    };
    const sw = (label, path, sub, fn) => row(label, sub, toggle({ checked: !!get(path), label, onChange: (v) => {
      S(path, v);
      fn && fn(v);
    } }));
    const seg = (label, path, options, sub, fn) => row(label, sub, segmented({ label, options, value: String(get(path)), onChange: (v) => {
      S(path, isNaN(+v) || v === "" ? v : +v);
      fn && fn(v);
    } }));
    const rng2 = (label, path, min, max, step = 1, unit = "", fmt2) => {
      const wrap = el("div", "row-slider"), out = el("span", "row-val num");
      const show = (v) => out.textContent = fmt2 ? fmt2(v) : `${+v.toFixed(2)}${unit}`;
      const toV = (t2) => +(Math.round((min + t2 * (max - min)) / step) * step).toFixed(4);
      slider(wrap, { label, value: (get(path) - min) / (max - min), step: step / (max - min), format: (t2) => fmt2 ? fmt2(toV(t2)) : toV(t2) + unit, onInput: (t2) => {
        const v = toV(t2);
        show(v);
        S(path, v);
      } });
      show(get(path));
      const r = row(label, null, wrap);
      r.append(out);
      return r;
    };
    const chips = (label, value, options, onChange) => {
      const box = el("div", "chips");
      box.setAttribute("role", "radiogroup");
      box.setAttribute("aria-label", label);
      options.forEach(([v, text, cls]) => {
        const b = el("button", "chip" + (cls ? " " + cls : ""), text);
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(String(v) === String(value)));
        b.onclick = () => {
          box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
          onChange(v);
        };
        box.append(b);
      });
      return box;
    };
    const chipRow = (label, path, options, sub, fn) => stack(label, sub, chips(label, get(path), options, (v) => {
      S(path, v);
      fn && fn(v);
    }));
    const swatches = (label, path, { auto = false, colors = COLORS } = {}) => {
      const box = el("div", "swatches");
      box.setAttribute("role", "radiogroup");
      box.setAttribute("aria-label", label);
      const cur = String(get(path)).toLowerCase(), all = [...auto ? ["auto"] : [], ...colors];
      const mark = (b) => box.querySelectorAll(".swatch").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      all.forEach((c) => {
        const b = el("button", "swatch" + (c === "auto" ? " auto" : ""));
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-label", c === "auto" ? "Automatic" : c);
        b.title = c === "auto" ? "Follows the wallpaper" : c;
        if (c !== "auto") b.style.background = c;
        else b.textContent = "A";
        b.setAttribute("aria-checked", String(cur === c));
        b.onclick = () => {
          mark(b);
          S(path, c);
        };
        box.append(b);
      });
      if (!inWallpaperEngine()) {
        const i = el("input", "swatch custom");
        i.type = "color";
        i.title = "Custom colour";
        i.setAttribute("aria-label", "Custom colour");
        i.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : "#ffffff";
        if (!all.includes(cur)) i.setAttribute("aria-checked", "true");
        i.oninput = () => {
          mark(null);
          i.setAttribute("aria-checked", "true");
          S(path, i.value);
        };
        box.append(i);
      }
      return box;
    };
    const confirmBtn = (text, ask, fn) => {
      const b = btn(text, () => {
        if (b.dataset.armed) return fn();
        b.dataset.armed = "1";
        b.textContent = ask;
        b.classList.add("danger");
        setTimeout(() => {
          delete b.dataset.armed;
          b.textContent = text;
          b.classList.remove("danger");
        }, 4e3);
      });
      return b;
    };
    const pickFile = (accept, multiple, cb) => {
      const i = el("input");
      i.type = "file";
      i.accept = accept;
      i.multiple = multiple;
      i.onchange = () => i.files.length && cb([...i.files]);
      i.click();
    };
    const btn = (text, fn, cls = "pill") => {
      const b = el("button", cls, text);
      b.type = "button";
      b.onclick = fn;
      return b;
    };
    const WE2 = inWallpaperEngine;
    const heroSpots = () => {
      const g = el("div", "spots");
      g.setAttribute("aria-label", "Clock position");
      const cur = cfg.positions.hero;
      ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"].forEach((k) => {
        const b = btn("", () => {
          placeHeroAt(k);
          g.querySelectorAll(".spot").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        }, "spot");
        b.setAttribute("aria-label", { t: "Top", m: "Middle", b: "Bottom" }[k[0]] + " " + { l: "left", c: "centre", r: "right" }[k[1]]);
        b.setAttribute("aria-pressed", "false");
        g.append(b);
      });
      const auto = btn("Auto", () => {
        placeHeroAt("auto");
        g.querySelectorAll(".spot").forEach((x) => x.setAttribute("aria-pressed", String(x === auto)));
      }, "spot auto");
      auto.setAttribute("aria-pressed", String(!cur));
      g.append(auto);
      return g;
    };
    const views2 = {
      widgets() {
        main.append(group("On the desktop", WIDGETS.map(([id, name, sub]) => sw(name, `widgets.${id}`, sub))));
        main.append(group(
          "Arrange",
          [chipRow("Layout", "layoutMode", LAYOUTS2, "Where cards go until you drag them"), sw("Lock layout", "lockLayout", "Stops cards and the clock from being dragged by accident")],
          "Drag any card to move it. It snaps to screen edges and to other cards, and stays where you leave it. Tidy up puts every card back into the layout."
        ));
        const br = el("div", "btn-row");
        br.append(btn("Tidy up", resetLayout2), btn("Customize a card", () => render("cards")));
        main.append(br);
      },
      glass() {
        main.append(group("Material", [
          seg("Style", "style", [["clear", "Clear"], ["tinted", "Tinted"]]),
          seg("Quality", "glass.quality", [["high", "High"], ["balanced", "Balanced"], ["fast", "Fast"]], refractionSupported ? "High adds the colour-split rim; Fast is blur only" : "Refraction shows in Chromium browsers and Wallpaper Engine"),
          rng2("Blur", "glass.blur", 0, 40, 1, "px"),
          rng2("Saturation", "glass.sat", 50, 250, 5, "%"),
          rng2("Light", "glass.bright", 0.6, 1.4, 0.02),
          rng2("Tint", "glass.tint", 0, 0.6, 0.01, "", pct),
          rng2("Refraction", "glass.refraction", 0, 2, 0.05, "", pct),
          rng2("Shadow", "glass.shadow", 0, 0.6, 0.02, "", pct)
        ]));
        main.append(group("Shape & edge", [
          rng2("Roundness", "glass.radius", 8, 44, 1, "px"),
          rng2("Border", "glass.rim", 0, 1, 0.05, "", pct),
          rng2("Shine", "glass.shine", 0, 1, 0.05, "", pct),
          seg("Light follows pointer", "glass.react", [["off", "Off"], ["near", "Nearby"], ["all", "All"]]),
          rng2("Reach", "glass.reactRadius", 60, 600, 10, "px")
        ]));
        const br = el("div", "btn-row");
        br.append(btn("Restore glass defaults", () => {
          update({ glass: DEFAULTS.glass, style: "clear" });
          render("glass");
        }), btn("Customize a card", () => render("cards")));
        main.append(br);
      },
      cards() {
        const id = WIDGETS.some((w) => w[0] === cardSel) ? cardSel : "music";
        main.append(group(null, [
          stack("Card", "Changes apply to this card only", chips("Card", id, WIDGETS.map(([w, name]) => [w, name, cfg.widgets[w] ? "" : "off"]), (v) => {
            cardSel = v;
            render("cards", true);
          })),
          sw("Show on desktop", `widgets.${id}`)
        ]));
        const base = `cards.${id}`, c = cfg.cards[id] || {};
        const dflt = { width: () => widgetEl(id) && widgetEl(id).offsetWidth || 300, zoom: () => 1, pad: () => 16 };
        const resetBtn = (key) => btn("Reset", () => {
          U(`${base}.${key}`);
          render("cards", true);
        }, "pill small");
        const ov = (label, key, min, max, step, unit, fmt2, follows = "Follows Glass settings") => {
          if (c[key] == null) return row(label, follows, btn("Adjust", () => {
            const v = dflt[key] ? dflt[key]() : cfg.glass[key] ?? 1;
            S(`${base}.${key}`, Math.min(max, Math.max(min, v)));
            render("cards", true);
          }, "pill small"));
          const r = rng2(label, `${base}.${key}`, min, max, step, unit, fmt2);
          r.append(resetBtn(key));
          return r;
        };
        const ovSeg = (label, key, options, sub) => row(label, sub, segmented({ label, options, value: String(c[key] ?? options[0][0]), onChange: (v) => v === options[0][0] ? U(`${base}.${key}`) : S(`${base}.${key}`, v) }));
        main.append(group("Size", [
          ov("Width", "width", 220, 560, 4, "px", null, "Automatic"),
          ov("Content size", "zoom", 0.7, 1.5, 0.05, "×", null, "Normal"),
          ov("Padding", "pad", 6, 32, 1, "px", null, "Normal")
        ]));
        main.append(group("Glass", [
          ovSeg("Style", "style", [["auto", "Follow"], ["clear", "Clear"], ["tinted", "Tinted"]]),
          ovSeg("Quality", "quality", [["auto", "Follow"], ["high", "High"], ["balanced", "Balanced"], ["fast", "Fast"]]),
          ov("Blur", "blur", 0, 40, 1, "px"),
          ov("Saturation", "sat", 50, 250, 5, "%"),
          ov("Light", "bright", 0.6, 1.4, 0.02),
          ov("Tint", "tint", 0, 0.7, 0.01, "", pct),
          ov("Roundness", "radius", 8, 44, 1, "px"),
          ov("Border", "rim", 0, 1, 0.05, "", pct),
          ov("Shine", "shine", 0, 1, 0.05, "", pct),
          ov("Refraction", "refraction", 0, 2, 0.05, "", pct),
          ov("Shadow", "shadow", 0, 0.6, 0.02, "", pct)
        ]));
        main.append(group("Text", [
          ovSeg("Text colour", "ink", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], "Auto follows the wallpaper"),
          TITLED.includes(id) && ovSeg("Title", "title", [["show", "Show"], ["hide", "Hide"]])
        ]));
        const br = el("div", "btn-row wrap");
        br.append(
          btn("Reset this card", () => {
            U(base);
            render("cards", true);
          }),
          btn("Apply to all cards", () => {
            const { width, ...look } = cfg.cards[id] || {};
            S("cards", Object.fromEntries(WIDGETS.map(([w]) => {
              const own = (cfg.cards[w] || {}).width;
              return [w, { ...look, ...own != null ? { width: own } : {} }];
            })));
            render("cards", true);
          }),
          confirmBtn("Reset all cards", "Click again to reset all", () => {
            S("cards", {});
            render("cards", true);
          })
        );
        main.append(br, el("p", "group-note", "Apply to all copies this card’s look (not its width) to every card. Right-click a card on the desktop to jump here."));
      },
      wallpaper() {
        main.append(group("Type", [seg("Wallpaper", "wallpaper.kind", [["theme", "Animated"], ["image", "Image"], ["gif", "GIF"], ["video", "Video"], ["color", "Gradient"], ["slideshow", "Slideshow"]], null, () => render("wallpaper", true))]));
        const k = cfg.wallpaper.kind;
        if (k === "theme") {
          const walls = el("div", "group walls");
          Object.entries(THEMES).filter(([t2]) => t2 !== "image").forEach(([t2, th]) => {
            const b = el("button", "wall-opt");
            b.setAttribute("aria-pressed", String(cfg.wallpaper.theme === t2));
            const c = el("canvas");
            c.width = 160;
            c.height = 100;
            drawTheme(c.getContext("2d"), 160, 100, t2, 3);
            b.append(c, th.name);
            b.onclick = () => {
              S("wallpaper.theme", t2);
              walls.querySelectorAll(".wall-opt").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            };
            walls.append(b);
          });
          main.append(el("div", "group-label", "Theme"), walls);
          main.append(group("Motion", [sw("Animate", "wallpaper.motion"), rng2("Speed", "wallpaper.speed", 0.2, 3, 0.1, "×"), seg("Frame rate", "wallpaper.fps", [["30", "30"], ["60", "60"], ["120", "120"]]), sw("React to sound", "wallpaper.audioReactive", "Moves with the music")]));
        }
        if (k === "image" || k === "gif" || k === "video" || k === "slideshow") {
          const type = k === "slideshow" ? "slides" : k, items = mediaItems(type), noun = { image: "images", gif: "GIFs", video: "videos", slides: "images" }[type];
          const grid = el("div", "group media-grid");
          const chosen = cfg.wallpaper.media, active = items.find((i) => i.id === chosen) || items[0];
          items.forEach((it) => {
            const t2 = el("div", "media-tile");
            t2.setAttribute("role", k === "slideshow" ? "listitem" : "radio");
            if (k !== "slideshow") {
              t2.setAttribute("aria-checked", String(it === active));
              t2.tabIndex = 0;
              t2.onclick = () => {
                update({ wallpaper: { media: it.id } }, SRC);
                render("wallpaper", true);
              };
            }
            const th = it.type === "video" ? Object.assign(el("video"), { muted: true, preload: "metadata", src: it.url + "#t=1" }) : Object.assign(el("img"), { src: it.url, alt: "", loading: "lazy" });
            t2.append(th, el("span", "media-badge", it.type === "gif" ? "GIF" : it.type === "video" ? "Video" : it.source === "we" ? "Folder" : ""));
            t2.title = it.name;
            if (it.source === "local") {
              const x = btn("✕", async (e) => {
                e.stopPropagation();
                await removeMedia(it.id);
                render("wallpaper", true);
              }, "media-del");
              x.setAttribute("aria-label", "Remove " + it.name);
              t2.append(x);
            }
            grid.append(t2);
          });
          if (!WE2()) {
            const add = btn("", () => pickFile(k === "video" ? "video/*" : k === "gif" ? "image/gif" : "image/*", true, async (l) => {
              const added = await addMedia(l);
              const first = added.find((a) => type === "slides" ? a.type !== "video" : a.type === type);
              if (first && k !== "slideshow") update({ wallpaper: { media: first.id } }, SRC);
              render("wallpaper", true);
            }), "media-tile add");
            add.innerHTML = `<span>＋</span><small>Add ${noun}</small>`;
            grid.append(add);
          }
          if (!items.length && WE2()) grid.append(el("p", "group-note", `No ${noun} yet.`));
          main.append(el("div", "group-label", k === "slideshow" ? `Slideshow (${items.length} images)` : "Choose"), grid);
          main.append(el("p", "group-note", WE2() ? "In Wallpaper Engine’s properties panel, choose a Wallpapers folder once. Every image, GIF and video in it shows up here." : "Files you add stay in this browser. You can also drop files anywhere on the desktop."));
          main.append(group("Options", [k === "slideshow" && rng2("Change every", "wallpaper.slideEvery", 5, 600, 5, "s"), seg("Fit", "wallpaper.fit", [["cover", "Fill"], ["contain", "Fit"]])]));
        }
        if (k === "color") {
          const W2 = cfg.wallpaper, pre = el("div", "group grad-grid");
          GRADIENTS.forEach(([a, b]) => {
            const p = btn("", () => {
              update({ wallpaper: { colorA: a, colorB: b } }, SRC);
              render("wallpaper", true);
            }, "grad-tile");
            p.style.background = gradient({ ...W2, colorA: a, colorB: b, gradFlow: false });
            p.setAttribute("aria-label", `Gradient ${a} to ${b}`);
            p.setAttribute("aria-pressed", String(W2.colorA === a && W2.colorB === b));
            pre.append(p);
          });
          main.append(el("div", "group-label", "Presets"), pre);
          main.append(group("Style", [
            seg("Shape", "wallpaper.gradStyle", [["linear", "Linear"], ["radial", "Radial"], ["mesh", "Mesh"], ["conic", "Conic"]], null, () => render("wallpaper", true)),
            W2.gradStyle !== "radial" && rng2("Angle", "wallpaper.gradAngle", 0, 360, 5, "°"),
            sw("Slow flow", "wallpaper.gradFlow", "The colours drift gently")
          ]));
          main.append(group("Colours", [stack("From", null, swatches("From", "wallpaper.colorA", { colors: [.../* @__PURE__ */ new Set([...GRADIENTS.map((g) => g[0]), ...COLORS])].slice(0, 14) })), stack("To", null, swatches("To", "wallpaper.colorB", { colors: [.../* @__PURE__ */ new Set([...GRADIENTS.map((g) => g[1]), ...COLORS])].slice(0, 14) }))]));
        }
        main.append(group("Look", [rng2("Dim", "wallpaper.dim", 0, 0.8, 0.02, "", pct)]));
      },
      island() {
        main.append(group(
          "Top bar",
          [
            seg("Mode", "island.mode", [["island", "Island"], ["bar", "Full bar"], ["auto", "Auto-hide"], ["hidden", "Hidden"]]),
            sw("Expand on hover", "island.expandOnHover", "Shows now playing and quick actions")
          ],
          "Auto-hide slides the island in when the pointer touches the top edge. When hidden, right-click the desktop for menus."
        ));
        main.append(group("Show in the island", [
          sw("Time", "island.showTime"),
          sw("Seconds", "island.seconds"),
          sw("Weather", "island.showWeather"),
          sw("Now playing", "island.showNowPlaying"),
          sw("Network", "island.showNetwork"),
          sw("Control Center button", "island.showCC"),
          sw("Menu button (•••)", "island.showMenu", "Right-click the desktop for the same menu"),
          seg("Battery", "island.battery", [["off", "Off"], ["percent", "87%"], ["icon", "Icon"], ["both", "Both"], ["inside", "In icon"]], "Desktop PCs without a battery report 100%")
        ], "Time and date format are in Clock."));
      },
      dock() {
        main.append(group("Shortcut bar", [seg("Show", "dock.mode", [["hidden", "Hidden"], ["auto", "Auto-hide"], ["always", "Always"]])]));
        const L = cfg.dock.shortcuts;
        main.append(el("div", "group-label", "Shortcuts"));
        const g = el("div", "group");
        if (!L.length) g.append(row("No shortcuts yet", "Add one below"));
        L.forEach((s, i) => {
          const r = row(s.name, `${s.kind === "action" ? ACTIONS[s.target] : s.target}`);
          const move = (d) => {
            const n = [...L];
            [n[i + d], n[i]] = [n[i], n[i + d]];
            S("dock.shortcuts", n);
            render("dock", true);
          };
          const up = btn("↑", () => move(-1), "pill small");
          up.disabled = i === 0;
          up.setAttribute("aria-label", "Move up");
          const dn = btn("↓", () => move(1), "pill small");
          dn.disabled = i === L.length - 1;
          dn.setAttribute("aria-label", "Move down");
          const rm = btn("Remove", () => {
            S("dock.shortcuts", L.filter((x) => x !== s));
            render("dock", true);
          }, "pill small");
          r.append(up, dn, rm);
          g.append(r);
        });
        main.append(g);
        const draft = { kind: "action", action: "settings", icon: "gear" };
        const name = el("input", "field");
        name.placeholder = "Name (optional)";
        name.setAttribute("aria-label", "Name");
        const tgt = el("input", "field");
        tgt.placeholder = "https://… , C:\\Users\\… , ms-settings:display";
        tgt.setAttribute("aria-label", "Target");
        const actions2 = chips("Action", draft.action, Object.entries(ACTIONS), (v) => {
          draft.action = v;
        });
        const tRow = row("Target", null, tgt), aRow = stack("Action", null, actions2);
        const showKind = () => {
          tRow.hidden = draft.kind === "action";
          aRow.hidden = draft.kind !== "action";
        };
        const icons = el("div", "chips icons");
        icons.setAttribute("role", "radiogroup");
        icons.setAttribute("aria-label", "Icon");
        [...Object.keys(GLYPHS), "letter"].forEach((k) => {
          const b = el("button", "chip icon");
          b.type = "button";
          b.setAttribute("role", "radio");
          b.setAttribute("aria-label", k);
          b.title = k;
          b.setAttribute("aria-checked", String(k === draft.icon));
          b.innerHTML = GLYPHS[k] ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[k]}</svg>` : "<b>A</b>";
          b.onclick = () => {
            draft.icon = k;
            icons.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
          };
          icons.append(b);
        });
        const add = () => {
          const target = draft.kind === "action" ? draft.action : tgt.value.trim();
          if (!target) {
            tgt.focus();
            return;
          }
          const n = name.value.trim() || (draft.kind === "action" ? ACTIONS[draft.action] : target);
          S("dock.shortcuts", [...cfg.dock.shortcuts, { id: "s" + Date.now(), name: n, kind: draft.kind, target, icon: draft.icon }]);
          if (cfg.dock.mode === "hidden") S("dock.mode", "always");
          render("dock", true);
        };
        main.append(group("Add a shortcut", [
          row("Type", null, segmented({ label: "Type", value: draft.kind, options: [["action", "Action"], ["url", "Web page"], ["folder", "Folder"], ["uri", "App link"]], onChange: (v) => {
            draft.kind = v;
            showKind();
          } })),
          aRow,
          tRow,
          row("Name", null, name),
          stack("Icon", null, icons),
          row("", null, btn("Add shortcut", add))
        ], WE2() ? "Wallpaper Engine doesn’t pass typing to wallpapers, so add built-in actions or use Quick add below." : null));
        showKind();
        const pre = el("div", "btn-row wrap");
        PRESETS2.forEach(([n, k, t2, ic]) => pre.append(btn("+ " + n, () => {
          S("dock.shortcuts", [...cfg.dock.shortcuts, { id: "s" + Date.now(), name: n, kind: k, target: t2, icon: ic }]);
          if (cfg.dock.mode === "hidden") S("dock.mode", "always");
          render("dock", true);
        }, "pill small")));
        main.append(el("div", "group-label", "Quick add"), pre, el("p", "group-note", "Folders and app links open through your system. Browsers ask first; Wallpaper Engine may block links that leave the wallpaper."));
      },
      clock() {
        const now = /* @__PURE__ */ new Date();
        main.append(group("Time format", [
          sw("24-hour time", "clock.h24", null, () => render("clock", true)),
          sw("Leading zero", "clock.leadingZero", "09:05 instead of 9:05"),
          !cfg.clock.h24 && sw("Show AM/PM", "clock.ampm"),
          sw("Blinking colon", "clock.blink"),
          chipRow("Date", "clock.dateFormat", DATE_FORMATS.map((f) => [f, longDate(now, f)]))
        ], "Shared by the desktop clock, the Clock card, the top bar and World Clock."));
        const pick = segmented({ label: "Clock", value: clockTarget, options: [["hero", "Desktop clock"], ["card", "Clock card"], ["island", "Top bar"]], onChange: (v) => {
          clockTarget = v;
          render("clock", true);
        } });
        const pickRow = el("div", "btn-row");
        pickRow.append(pick);
        main.append(pickRow);
        if (clockTarget !== "island") {
          const prev = el("div", "clock-preview" + (clockTarget === "hero" ? " hero-prev" : "")), face = el("div");
          prev.append(face);
          const opts = clockTarget === "hero" ? () => ({ ...heroClockOpts(), size: Math.round(150 * Math.min(1.3, cfg.hero.size)) }) : cardClockOpts;
          const look = () => {
            if (clockTarget === "hero") {
              prev.style.setProperty("--cf-scale", Math.min(1.3, cfg.hero.size));
              prev.style.color = cfg.hero.color !== "auto" ? cfg.hero.color : "";
              face.style.opacity = cfg.hero.opacity;
              prev.style.textAlign = cfg.hero.align;
            } else prev.style.setProperty("--cf-scale", cfg.clock.size);
          };
          const f = clockFace(face, opts), tick2 = () => {
            look();
            f.tick(/* @__PURE__ */ new Date());
          };
          tick2();
          const iv = setInterval(tick2, 1e3), off = bus.on("settings", tick2);
          cleanup.push(() => {
            clearInterval(iv);
            off();
          });
          main.append(prev);
        }
        const styleRows = (p, extra) => [
          chipRow("Style", `${p}.style`, CLOCK_STYLES, null, () => render("clock", true)),
          chipRow("Font", `${p}.font`, CLOCK_FONTS.map(([v, n]) => [v, n, "font-" + v])),
          seg("Weight", `${p}.weight`, CLOCK_WEIGHTS, "Auto uses each style’s own weight"),
          ...extra,
          sw("Show seconds", `${p}.seconds`),
          sw("Show date", `${p}.date`),
          get(`${p}.style`) === "analog" && seg("Numerals", `${p}.numerals`, CLOCK_NUMERALS)
        ];
        if (clockTarget === "hero") {
          main.append(group("Desktop clock", [sw("Show on wallpaper", "hero.show"), ...styleRows("hero", [rng2("Size", "hero.size", 0.4, 2.5, 0.05, "×")])], "Very large sizes shrink to fit the screen."));
          main.append(group("Look", [
            stack("Colour", "Automatic follows the wallpaper theme", swatches("Colour", "hero.color", { auto: true })),
            rng2("Opacity", "hero.opacity", 0.2, 1, 0.05, "", pct),
            rng2("Shadow", "hero.shadow", 0, 1, 0.05, "", pct),
            sw("Glass plate", "hero.plate", "Puts the clock on a pane of glass"),
            seg("Text align", "hero.align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]]),
            stack("Position", "Or drag the clock anywhere", heroSpots())
          ]));
        } else if (clockTarget === "card") {
          main.append(group(
            "Clock card",
            [sw("Show card", "widgets.clock"), ...styleRows("clock", [rng2("Size", "clock.size", 0.6, 1.6, 0.05, "×"), seg("Align", "clock.align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]])])],
            cfg.widgets.clock ? "Glass, width and text colour are in Cards." : "The card is hidden; turn on Show card to see it on the desktop."
          ));
        } else {
          main.append(group("Top bar clock", [sw("Show time", "island.showTime"), sw("Show seconds", "island.seconds")], "The expanded island shows the date in the format above."));
        }
        main.append(group("Calendar", [seg("Week starts on", "calendar.weekStart", [["0", "Sunday"], ["1", "Monday"], ["6", "Saturday"]])]));
        const cities = el("div", "chips");
        ZONES.forEach(([tz, nm]) => {
          const b = el("button", "chip", nm);
          b.type = "button";
          b.setAttribute("aria-pressed", String(cfg.cities.includes(tz)));
          b.onclick = () => {
            const on = !cfg.cities.includes(tz);
            b.setAttribute("aria-pressed", String(on));
            S("cities", on ? [...cfg.cities, tz] : cfg.cities.filter((x) => x !== tz));
          };
          cities.append(b);
        });
        main.append(group("World Clock cities", [stack("Cities", "Shown in the order you pick them", cities)]));
      },
      music() {
        main.append(group("Playback", [
          seg("Repeat", "music.repeat", [["off", "Off"], ["all", "All"], ["one", "One"]]),
          sw("Shuffle", "music.shuffle"),
          sw("Play next automatically", "music.continuous", "Off stops after each track"),
          seg("Source", "music.source", [["auto", "Auto"], ["system", "System"], ["player", "Player"]], "System follows Spotify and other apps (Wallpaper Engine)"),
          rng2("Volume", "music.volume", 0, 1, 0.01, "", pct)
        ]));
        const g = el("div", "group");
        g.append(row("Built-in mixtape", "Six synthesised tracks", toggle({ checked: store.get("includeBuiltin", true), label: "Built-in mixtape", onChange: (v) => {
          setIncludeBuiltin(v);
          render("music", true);
        } })));
        list().filter((t2) => t2.kind === "file").forEach((t2) => {
          const r = row(t2.title, t2.artist || (t2.id.startsWith("we:") ? "From your music folder" : "Added file"));
          if (!t2.id.startsWith("we:")) r.append(btn("Remove", async () => {
            await removeTrack(t2.id);
            render("music", true);
          }, "pill small"));
          g.append(r);
        });
        main.append(el("div", "group-label", "Playlist"), g);
        if (!WE2()) {
          const br = el("div", "btn-row");
          br.append(btn("Add audio files…", () => pickFile("audio/*", true, async (l) => {
            await addFiles(l);
            render("music", true);
          })));
          main.append(br);
        }
        main.append(el("p", "group-note", WE2() ? "In Wallpaper Engine, pick a Music folder in the properties panel; its tracks join this playlist." : "You can also drop audio files onto the Music card. Files stay in this browser’s storage."));
      },
      viz() {
        main.append(group("Show it", [sw("In the Music card", "viz.card"), sw("Beside the island", "viz.island", "Bars on both sides of the Dynamic Island"), sw("Along the screen bottom", "viz.edge", "Drawn on the wallpaper, so the glass refracts it"), sw("As its own card", "widgets.visualizer", "Drag it anywhere")]));
        main.append(group("Look", [
          seg("Style", "viz.style", [["bars", "Bars"], ["mirror", "Mirror"], ["wave", "Wave"], ["dots", "Dots"], ["ring", "Ring"]]),
          seg("Colour", "viz.color", [["ink", "Text"], ["white", "White"], ["accent", "Accent"], ["rainbow", "Rainbow"]]),
          rng2("Sensitivity", "viz.sensitivity", 0.3, 2.5, 0.05, "×"),
          rng2("Bars", "viz.bars", 12, 64, 1),
          rng2("Bottom height", "viz.edgeHeight", 30, 260, 5, "px")
        ]));
      },
      weather() {
        const cur = cfg.geo && cfg.geo.name === cfg.city ? cfg.geo.label : cfg.city;
        const form = el("form", "row");
        const inp = el("input", "field");
        inp.id = "cityIn";
        inp.autocomplete = "off";
        inp.placeholder = "Search a city";
        inp.setAttribute("aria-label", "City");
        form.append(el("span", "label", "Search"), inp, btn("Search", null));
        form.lastChild.type = "submit";
        form.onsubmit = async (e) => {
          e.preventDefault();
          const q = inp.value.trim();
          if (!q) return;
          cityStatus = "Searching…";
          cityResults = null;
          render("weather", true);
          try {
            cityResults = await searchCities(q);
            cityStatus = cityResults.length ? "" : `No city called “${q}”.`;
          } catch {
            cityStatus = "Search needs an internet connection.";
          }
          render("weather", true);
        };
        const pick = (r) => {
          cityResults = null;
          cityStatus = "";
          update({ city: r.name, geo: r }, SRC);
          render("weather", true);
        };
        const results = el("div", "chips");
        (cityResults || []).forEach((r) => {
          const b = btn(r.label, () => pick(r), "chip");
          results.append(b);
        });
        const locate = btn("Use my location", async () => {
          cityStatus = "Finding you…";
          render("weather", true);
          try {
            pick(await locateByIP());
          } catch {
            cityStatus = "Couldn’t detect a location. Search or pick a city instead.";
            render("weather", true);
          }
        }, "pill small");
        main.append(group("Location", [
          row("Current", cur, locate),
          form,
          cityResults && cityResults.length ? stack("Results", "Pick the right one", results) : null,
          cityStatus ? row(cityStatus) : null,
          stack("Popular", null, chips("Popular cities", cfg.geo ? "" : cfg.city, CITIES.map((c) => [c, c]), (c) => {
            update({ city: c, geo: null }, SRC);
            render("weather", true);
          })),
          seg("Units", "unit", [["c", "°C"], ["f", "°F"]])
        ], keyboardOn() ? "Click the search box and type with the on-screen keyboard." : "Weather comes from Open-Meteo. “Use my location” looks up your approximate city from your internet connection."));
      },
      data() {
        main.append(el("p", "group-note", "Everything saves automatically: layout, settings, reminders, notes, playlist files and wallpaper files. It stays after closing the browser or Wallpaper Engine and after a restart, as long as that app’s storage isn’t cleared. Keep a backup to be safe."));
        const ta = el("textarea", "notes backup");
        ta.setAttribute("aria-label", "Backup");
        ta.placeholder = "Backup text appears here, or paste one to restore.";
        main.append(group("Backup", [
          row("Create backup", "Settings, layout, reminders and notes as text", btn("Create", () => {
            ta.value = exportAll();
            ta.select();
            try {
              navigator.clipboard.writeText(ta.value).catch(() => {
              });
            } catch {
            }
          })),
          row("Restore", "Paste a backup above first", btn("Restore", () => {
            try {
              importAll(ta.value);
            } catch {
              ta.value = "That doesn’t look like a backup. Paste the whole text.";
            }
          }))
        ]));
        main.append(ta);
        main.append(group("Start over", [row("Reset everything", "Settings and layout go back to defaults", confirmBtn("Reset", "Click again to reset", resetAll))]));
      },
      access() {
        main.append(group("Display", [sw("Reduce transparency", "reduce", "Solid surfaces instead of glass")], "Animations also calm down when your system asks for reduced motion."));
        main.append(group("Typing", [seg("On-screen keyboard", "keyboard", [["auto", "Auto"], ["on", "Always"], ["off", "Off"]], "Auto shows it in Wallpaper Engine, which doesn’t pass key presses to wallpapers")]));
      },
      themes() {
        const looks = el("div", "looks");
        LOOKS.forEach((L) => {
          const b = el("button", "look-tile");
          b.type = "button";
          b.setAttribute("aria-pressed", String(cfg.look === L.id));
          const pv = el("div", "look-pv");
          pv.dataset.skin = L.skin;
          pv.dataset.layout = L.layoutMode;
          if (L.accent !== "auto") pv.style.setProperty("--accent", L.accent);
          if (L.wallpaper.kind === "theme") {
            const c = el("canvas");
            c.width = 200;
            c.height = 120;
            drawTheme(c.getContext("2d"), 200, 120, L.wallpaper.theme, 3);
            pv.append(c);
          } else pv.style.background = gradient({ ...DEFAULTS.wallpaper, ...L.wallpaper });
          const cards = el("div", "lp-cards");
          for (let i = 0; i < 3; i++) cards.append(el("span", "lp-card"));
          pv.append(el("span", "lp-clock", L.hero.style === "words" ? "four" : L.hero.style === "analog" ? "◷" : "9:41"), cards);
          b.append(pv, el("b", null, L.name), el("small", null, L.sub));
          b.onclick = () => {
            applyLook(L.id);
            render("themes", true);
          };
          looks.append(b);
        });
        main.append(el("div", "group-label", "Presets"), looks, el("p", "group-note", "A preset sets the surface style, layout, wallpaper, clock and accent together. Fine-tune anything afterwards."));
        main.append(group("Mix your own", [
          chipRow("Surface style", "skin", SKINS, "Liquid Glass refracts the wallpaper; the others are solid styles"),
          chipRow("Layout", "layoutMode", LAYOUTS2, "Where cards go until you drag them"),
          stack("Accent colour", "Calendar today, focus ring, switches, selections", swatches("Accent", "accent", { auto: true, colors: ACCENTS })),
          chipRow("Interface font", "uiFont", UI_FONTS.map(([v, n]) => [v, n, "font-" + v]))
        ]));
      }
    };
    function render(sec, keepScroll) {
      current_ = sec || current_;
      cleanup.forEach((f) => f());
      cleanup = [];
      $$(".set-nav", side).forEach((n) => n.setAttribute("aria-selected", String(n.dataset.sec === current_)));
      const scroll = main.scrollTop;
      main.textContent = "";
      main.append(el("h3", null, SECTIONS.find((s) => s[0] === current_)[1]));
      views2[current_]();
      const keys = RESETS[current_];
      if (keys) {
        const name = SECTIONS.find((x) => x[0] === current_)[1];
        const br = el("div", "btn-row tab-reset");
        br.append(confirmBtn(`Reset ${name}`, "Click again to reset", () => {
          keys.forEach((k) => S(k, structuredClone(DEFAULTS[k])));
          if (current_ === "music") setIncludeBuiltin(true);
          render(current_, true);
        }));
        main.append(br);
      }
      main.scrollTop = keepScroll ? scroll : 0;
    }
    function open2(sec, from, card) {
      if (card) cardSel = card;
      trigger = from || trigger;
      render(sec || current_);
      if (win.hidden) liquidOpen(win, trigger);
    }
    const close = () => {
      cleanup.forEach((f) => f());
      cleanup = [];
      return liquidClose(win, trigger);
    };
    $("#setClose").onclick = close;
    let rt;
    bus.on("settings", ({ source }) => {
      if (win.hidden || source === "settings") return;
      clearTimeout(rt);
      rt = setTimeout(() => render(current_, true), 250);
    });
    return { open: open2, close, get isOpen() {
      return !win.hidden;
    } };
  }

  // src/js/main.js
  var wall = new Wallpaper($("#wall"));
  var pane = (id) => $(`.widget[data-w="${id}"] .pane`);
  glassify($("#island"), "bar");
  glassify($("#dock"), "bar");
  $$(".widget").forEach((w) => glassify(w, "panel"));
  glassify($("#cc"), "menu");
  glassify($("#settings"), "panel");
  glassify($("#hero"), "panel");
  $$("#cc .tile").forEach((t2) => {
    glassify(t2, "control");
    setOverrides(t2, { blur: 6, sat: 120 });
  });
  var W = {
    clock: mountClock(pane("clock")),
    weather: mountWeather(pane("weather")),
    music: mountMusic(pane("music"), widgetEl("music")),
    calendar: mountCalendar(pane("calendar")),
    world: mountWorld(pane("world")),
    reminders: mountReminders(pane("reminders")),
    notes: mountNotes(pane("notes")),
    focus: mountFocus(pane("focus")),
    system: mountSystem(pane("system"))
  };
  attach($("#vizCard"), {});
  attach($("#edgeViz"), { align: "bottom" });
  var hero2 = clockFace($("#heroFace"), heroClockOpts);
  var settings = initSettings({ resetLayout });
  var cc = initControlCenter();
  var openSettings = (sec, from, card) => {
    if (cc.isOpen) cc.close();
    closeMenus();
    settings.open(sec, from, card);
  };
  var themeKeys = Object.keys(THEMES).filter((k) => k !== "image");
  var actions = {
    settings: () => openSettings(),
    cc: () => cc.toggle(document.querySelector("#dock")),
    edit: () => openSettings("widgets"),
    "next-wallpaper": () => {
      set("wallpaper.kind", "theme");
      set("wallpaper.theme", themeKeys[(themeKeys.indexOf(cfg.wallpaper.theme) + 1) % themeKeys.length]);
    },
    "play-pause": () => player.toggle(),
    "reset-layout": resetLayout
  };
  function mainMenu(at) {
    showMenu([
      { label: "Settings…", hint: "Ctrl ,", action: () => openSettings(null, at instanceof Element ? at : null) },
      { label: "Glass…", action: () => openSettings("glass") },
      { label: "Wallpaper…", action: () => openSettings("wallpaper") },
      "-",
      ...themeKeys.map((k) => ({ label: THEMES[k].name, checked: cfg.wallpaper.kind === "theme" && cfg.wallpaper.theme === k, action: () => update({ wallpaper: { kind: "theme", theme: k } }) })),
      "-",
      { label: "Island", checked: cfg.island.mode === "island", action: () => set("island.mode", "island") },
      { label: "Full Bar", checked: cfg.island.mode === "bar", action: () => set("island.mode", "bar") },
      { label: "Auto-hide Top Bar", checked: cfg.island.mode === "auto", action: () => set("island.mode", "auto") },
      { label: "Shortcut Bar", checked: cfg.dock.mode !== "hidden", action: () => set("dock.mode", cfg.dock.mode === "hidden" ? "always" : "hidden") },
      { label: "Desktop Clock", checked: cfg.hero.show, action: () => set("hero.show", !cfg.hero.show) },
      "-",
      { label: "Lock Layout", checked: cfg.lockLayout, action: () => set("lockLayout", !cfg.lockLayout) },
      { label: "Tidy Up Layout", action: resetLayout }
    ], at, "Desktop");
  }
  var island = initIsland({ openMenu: mainMenu, openSettings, toggleCC: (from) => cc.toggle(from) });
  initDock(actions);
  enableDragging();
  initKeyboard();
  initDragScroll();
  addEventListener("contextmenu", (e) => {
    if (e.target.closest("input, textarea, .menu, #settings, #cc")) return;
    e.preventDefault();
    const card = e.target.closest(".widget");
    if (card) {
      const id = card.dataset.w;
      return showMenu([
        { label: "Customize This Card…", action: () => openSettings("cards", card, id) },
        { label: "Reset Position", action: () => {
          unset(`positions.${id}`, { silent: true });
          layout({ animate: true });
        } },
        { label: "Hide Card", action: () => set(`widgets.${id}`, false) }
      ], { x: e.clientX, y: e.clientY }, "Card");
    }
    if (e.target.closest("#hero")) return showMenu([{ label: "Clock Settings…", action: () => openSettings("clock") }, { label: "Centre", action: () => {
      unset("positions.hero", { silent: true });
      placeHero();
    } }, { label: "Hide", action: () => set("hero.show", false) }], { x: e.clientX, y: e.clientY }, "Clock");
    mainMenu({ x: e.clientX, y: e.clientY });
  });
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      openSettings();
    }
    if (e.key === "Escape") {
      closeMenus();
      if (cc.isOpen) cc.close();
      else if (settings.isOpen) settings.close();
    }
  });
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", async (e) => {
    e.preventDefault();
    const fl = [...e.dataTransfer.files];
    if (!fl.length) return;
    const media = fl.find((f) => /^(image|video)\//.test(f.type));
    if (media) {
      const [it] = await addMedia(fl.filter((f) => /^(image|video)\//.test(f.type)));
      if (it) update({ wallpaper: { kind: it.type, media: it.id } });
    }
    if (fl.some((f) => f.type.startsWith("audio/"))) {
      const { addFiles: addFiles2 } = await Promise.resolve().then(() => (init_player(), player_exports));
      await addFiles2(fl);
    }
  });
  function applyGlass() {
    const g = cfg.glass, r = document.documentElement.style;
    r.setProperty("--lg-blur", g.blur + "px");
    r.setProperty("--lg-sat", g.sat + "%");
    r.setProperty("--lg-bright", g.bright);
    r.setProperty("--lg-tint", g.tint);
    r.setProperty("--lg-radius", g.radius + "px");
    r.setProperty("--lg-rim", g.rim);
    r.setProperty("--lg-shine", g.shine);
    r.setProperty("--lg-shadow", g.shadow);
    setGlobal({ quality: cfg.reduce ? "fast" : g.quality, strength: cfg.reduce ? 0 : g.refraction, react: g.react, reactRadius: g.reactRadius });
    applyCards();
    setOverrides($("#settings"), { blur: Math.max(24, g.blur * 2), tint: Math.min(0.6, g.tint + 0.1) });
    setOverrides($("#cc"), { blur: Math.max(20, g.blur * 1.6), tint: Math.min(0.6, g.tint + 0.06) });
  }
  var CARD_LOOK = ["width", "style", "ink", "zoom", "pad", "title"];
  function applyCards() {
    ORDER.forEach((id) => {
      const n = widgetEl(id);
      if (!n) return;
      const c = cfg.cards[id] || {}, o = {};
      for (const k in c) if (!CARD_LOOK.includes(k)) o[k] = c[k];
      setOverrides(n, o);
      const attr = (k, v) => v ? n.setAttribute(k, v) : n.removeAttribute(k), prop = (k, v) => v != null ? n.style.setProperty(k, v) : n.style.removeProperty(k);
      attr("data-style", c.style);
      attr("data-ink", c.ink);
      attr("data-title", c.title);
      prop("--card-zoom", c.zoom);
      prop("--card-pad", c.pad != null ? c.pad + "px" : null);
    });
  }
  var lastKind = "";
  function applyWallpaper() {
    const w = cfg.wallpaper, root = document.documentElement;
    const th = THEMES[w.theme] || THEMES.dusk;
    root.dataset.glass = w.kind === "theme" ? th.glass : "dark";
    root.style.setProperty("--page", w.kind === "theme" ? th.bg : "#111");
    root.style.setProperty("--hero-ink", w.kind === "theme" ? th.hero : "#fff");
    wall.set({ ...w, motion: w.motion && !reducedMotion() });
    const pick = (type) => {
      const it = findMedia(w.media);
      if (it && it.type === type) return it.url;
      const first = mediaItems(type)[0];
      return first ? first.url : "";
    };
    if (w.kind === "image" || w.kind === "gif") wall.media("image", pick(w.kind));
    if (w.kind === "video") wall.media("video", pick("video"));
    if (w.kind === "slideshow") {
      const slides = mediaItems("slides").map((i) => i.url);
      if (slides.join() !== wall.slides.join() || lastKind !== "slideshow") wall.setSlides(slides);
    }
    lastKind = w.kind;
    $("#dim").style.opacity = String(w.dim);
  }
  function applyMisc() {
    const root = document.documentElement;
    root.dataset.style = cfg.style;
    root.dataset.reduce = String(cfg.reduce);
    root.dataset.skin = cfg.skin || "glass";
    if (cfg.uiFont && cfg.uiFont !== "system") root.dataset.uifont = cfg.uiFont;
    else delete root.dataset.uifont;
    if (cfg.accent && cfg.accent !== "auto") {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(cfg.accent.slice(i, i + 2), 16) / 255);
      root.style.setProperty("--accent", cfg.accent);
      root.style.setProperty("--on-accent", 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#111" : "#fff");
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--on-accent");
    }
    const h = $("#hero"), hc = cfg.hero;
    h.hidden = !hc.show;
    h.classList.toggle("plate", !!hc.plate);
    h.style.setProperty("--hero-size", hc.size);
    h.style.setProperty("--hero-opacity", hc.opacity);
    h.style.setProperty("--hero-shadow", hc.shadow);
    h.style.setProperty("--hero-align", hc.align);
    h.style.setProperty("--hero-justify", { left: "start", right: "end" }[hc.align] || "center");
    if (hc.color && hc.color !== "auto") h.style.setProperty("--hero-color", hc.color);
    else h.style.removeProperty("--hero-color");
    $("#edgeViz").hidden = !cfg.viz.edge;
    $("#edgeViz").style.height = cfg.viz.edgeHeight + "px";
  }
  function fitHero() {
    const h = $("#hero");
    if (h.hidden) return;
    h.style.setProperty("--hero-fit", "1");
    const k = Math.min(1, (innerWidth - 32) / h.offsetWidth, (innerHeight - 120) / h.offsetHeight);
    if (k < 1) h.style.setProperty("--hero-fit", k.toFixed(3));
  }
  var heroRefresh = () => {
    fitHero();
    placeHero();
  };
  function syncWidgets() {
    ORDER.forEach((id) => {
      const n = widgetEl(id);
      if (n && n.hidden === !!cfg.widgets[id]) setWidgetVisible(id, !!cfg.widgets[id]);
    });
  }
  bus.on("settings", ({ patch }) => {
    if (patch.glass || "reduce" in patch || patch.cards) applyGlass();
    if (patch.wallpaper) applyWallpaper();
    if (patch.hero || patch.viz || "style" in patch || "reduce" in patch || "skin" in patch || "accent" in patch || "uiFont" in patch) {
      applyMisc();
      tick(true);
      requestAnimationFrame(heroRefresh);
    }
    if (patch.widgets) syncWidgets();
    if (patch.cards || patch.dock) layout({ animate: true });
    if (patch.positions || "layoutMode" in patch) layout({ animate: true });
    if ("skin" in patch || "uiFont" in patch) requestAnimationFrame(() => {
      layout({ animate: true });
      refresh();
    });
    if (patch.clock) {
      tick(true);
      W.world.render();
      W.weather.render();
      layout();
      requestAnimationFrame(heroRefresh);
    }
    if (patch.calendar) W.calendar.render();
    if ("city" in patch || "unit" in patch) W.weather.load();
    if (patch.cities) {
      W.world.render();
      layout({ animate: true });
    }
  });
  bus.on("wallpaper:media", applyWallpaper);
  var lt;
  bus.on("layout", () => {
    clearTimeout(lt);
    lt = setTimeout(() => layout({ animate: true }), 40);
  });
  var WE = {
    theme: (v) => ({ wallpaper: { kind: "theme", theme: v } }),
    motion: (v) => ({ wallpaper: { motion: !!v } }),
    speed: (v) => ({ wallpaper: { speed: +v / 100 } }),
    audioreactive: (v) => ({ wallpaper: { audioReactive: !!v } }),
    glassstyle: (v) => ({ style: v }),
    quality: (v) => ({ glass: { quality: v } }),
    refraction: (v) => ({ glass: { refraction: +v / 100 } }),
    blur: (v) => ({ glass: { blur: +v } }),
    roundness: (v) => ({ glass: { radius: +v } }),
    border: (v) => ({ glass: { rim: +v / 100 } }),
    topbar: (v) => ({ island: { mode: v } }),
    shortcutbar: (v) => ({ dock: { mode: v } }),
    desktopclock: (v) => ({ hero: { show: !!v } }),
    clockstyle: (v) => ({ hero: { style: v } }),
    clocksize: (v) => ({ hero: { size: +v / 100 } }),
    clockfont: (v) => ({ hero: { font: v } }),
    clockseconds: (v) => ({ hero: { seconds: !!v } }),
    clockplate: (v) => ({ hero: { plate: !!v } }),
    clock24: (v) => ({ clock: { h24: !!v } }),
    city: (v) => ({ city: String(v || "London"), geo: null }),
    units: (v) => ({ unit: v }),
    musicsource: (v) => ({ music: { source: v } }),
    reducetransparency: (v) => ({ reduce: !!v })
  };
  bus.on("we:props", (props) => {
    const changed = Object.entries(props).filter(([k, v]) => JSON.stringify(cfg.weLast[k]) !== JSON.stringify(v));
    if (!changed.length) return;
    const patch = {};
    const merge2 = (a, b) => {
      for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...a[k] || cfg[k], ...v } : v;
    };
    changed.forEach(([k, v]) => {
      if (WE[k]) merge2(patch, WE[k](v));
      else if (k.startsWith("show") && k.slice(4) in cfg.widgets) merge2(patch, { widgets: { [k.slice(4)]: !!v } });
      else if (k === "customimage") {
        wpMedia.we.image = v ? "file:///" + v : "";
        if (v) merge2(patch, { wallpaper: { kind: /\.gif$/i.test(v) ? "gif" : "image", media: "we:image" } });
      } else if (k === "customvideo") {
        wpMedia.we.video = v ? "file:///" + v : "";
        if (v) merge2(patch, { wallpaper: { kind: "video", media: "we:video" } });
      } else if (k === "reminders") bus.emit("reminders:set", v);
      else if (k === "notes") {
        if (v || cfg.weLast.notes) bus.emit("notes:set", String(v || ""));
      } else if (k === "wallpaperfolder" && v) merge2(patch, { wallpaper: { kind: "slideshow" } });
    });
    merge2(patch, { weLast: { ...cfg.weLast, ...Object.fromEntries(changed) } });
    update(patch);
    if (props.customimage) wpMedia.we.image = "file:///" + props.customimage;
    if (props.customvideo) wpMedia.we.video = "file:///" + props.customvideo;
    applyWallpaper();
  });
  bus.on("we:dir", ({ name, files: files2 }) => {
    if (name === "musicfolder") setWEFolder2(files2);
    if (name === "wallpaperfolder") setWEFolder(files2);
  });
  bus.on("we:fps", (fps) => set("wallpaper.fps", Math.max(10, Math.min(144, fps)), { silent: true }));
  bus.on("we:paused", (p) => {
    wall.paused = p;
  });
  bus.on("we:audio", (arr) => feedWE(arr));
  document.documentElement.classList.toggle("in-we", inWallpaperEngine());
  var lastMin = -1;
  function tick(force) {
    const now = /* @__PURE__ */ new Date();
    if (cfg.widgets.clock) W.clock.tick(now);
    if (cfg.hero.show) hero2.tick(now);
    island.tick(now);
    W.focus.tick();
    if (force || now.getMinutes() !== lastMin) {
      lastMin = now.getMinutes();
      W.calendar.minute();
      W.world.minute();
      W.system.minute();
      if (!force) heroRefresh();
    }
  }
  setInterval(tick, 1e3);
  (function loop() {
    W.music.frame();
    frame();
    wall.audio(cfg.wallpaper.audioReactive ? level() : 0);
    requestAnimationFrame(loop);
  })();
  var rs;
  addEventListener("resize", () => {
    wall.resize();
    clearTimeout(rs);
    rs = setTimeout(() => {
      layout();
      heroRefresh();
      refresh();
    }, 60);
  });
  ORDER.forEach((id) => {
    const n = widgetEl(id);
    if (n) n.hidden = !cfg.widgets[id];
  });
  applyGlass();
  applyWallpaper();
  applyMisc();
  tick(true);
  layout();
  heroRefresh();
  startWallpaperEngine();
  loadLibrary();
  loadWallpaperMedia();
  document.fonts && document.fonts.ready.then(() => {
    layout();
    heroRefresh();
    refresh();
    repaintLight();
  });
  requestAnimationFrame(() => document.documentElement.classList.add("ready"));
})();

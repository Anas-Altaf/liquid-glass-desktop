/* Web Audio synthesiser: schedules each track step by step so seeking is exact. */
import { clamp, rng, hash } from "../core/util.js";
/* =========================================================
   Audio engine
   ========================================================= */
export class Engine {
  constructor() { this.ctx = null; this.track = null; this.anchorPos = 0; this.anchorTime = 0; this.playing = false; this.volume = 0.8; this.muted = false; }
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.ratio.value = 3.5; this.comp.attack.value = 0.01; this.comp.release.value = 0.2;
    this.out = ctx.createGain(); this.applyVolume();
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.78;
    this.comp.connect(this.out); this.out.connect(this.analyser); this.analyser.connect(ctx.destination);
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.4);
    this.verbOut = ctx.createGain(); this.verbOut.gain.value = 0.5; this.verb.connect(this.verbOut); this.verbOut.connect(this.comp);
    const len = ctx.sampleRate; this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.tick(), 25);
  }
  impulse(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return buf;
  }
  applyVolume() { if (this.out) this.out.gain.setTargetAtTime(this.muted ? 0 : this.volume * this.volume * 0.9, this.ctx.currentTime, 0.03); }
  setVolume(v) { this.volume = v; this.applyVolume(); }
  setMuted(m) { this.muted = m; this.applyVolume(); }
  get position() {
    if (!this.ctx || !this.track) return this.anchorPos;
    return clamp(this.anchorPos + Math.max(0, this.ctx.currentTime - this.anchorTime), 0, this.track.duration);
  }
  load(track, pos = 0) { this.track = track; this.anchorPos = pos; if (this.ctx) this.startSession(pos); }
  startSession(pos) {
    const ctx = this.ctx, t = this.track;
    if (this.session) { const old = this.session; old.dry.gain.setTargetAtTime(0, ctx.currentTime, 0.02); old.wet.gain.setTargetAtTime(0, ctx.currentTime, 0.02); setTimeout(() => { old.dry.disconnect(); old.wet.disconnect(); }, 400); }
    const dry = ctx.createGain(), wet = ctx.createGain(); dry.connect(this.comp); wet.connect(this.verb);
    this.session = { dry, wet };
    this.sps = 60 / t.bpm / 4;
    this.step = Math.ceil(pos / this.sps - 1e-6);
    this.anchorPos = pos; this.anchorTime = ctx.currentTime + 0.04;
    this.nextTime = this.anchorTime + (this.step * this.sps - pos);
    this.ended = false;
    if (this.step % 16 !== 0) { const bar = Math.floor(pos / (this.sps * 16)); const left = (bar + 1) * 16 * this.sps - pos; this.padChord(bar, this.anchorTime, left); }
  }
  async play() { this.ensure(); if (!this.session) this.startSession(this.anchorPos); if (this.ctx.state !== "running") await this.ctx.resume(); this.playing = true; }
  async pause() { this.playing = false; if (this.ctx && this.ctx.state === "running") await this.ctx.suspend(); }
  seek(pos) { pos = clamp(pos, 0, this.track.duration - 0.05); if (this.ctx) this.startSession(pos); else this.anchorPos = pos; }
  tick() {
    if (!this.session || !this.track || this.ctx.state !== "running") return;
    const ahead = document.hidden ? 1.5 : 0.14, total = this.track.bars * 16;
    while (this.nextTime < this.ctx.currentTime + ahead && this.step < total) { this.schedule(this.step, this.nextTime); this.step++; this.nextTime += this.sps; }
    if (!this.ended && this.position >= this.track.duration - 0.02) { this.ended = true; this.onended && this.onended(); }
  }
  freq(deg, oct) {
    const t = this.track, L = t.scale.length, o = Math.floor(deg / L), i = ((deg % L) + L) % L;
    return 440 * Math.pow(2, (t.root + 12 * (oct + o) + t.scale[i] - 69) / 12);
  }
  chord(bar) { const d = this.track.prog[bar % this.track.prog.length]; return [d, d + 2, d + 4, d + 6]; }
  section(bar) {
    const n = this.track.bars;
    if (bar < 4) return "intro";
    if (bar >= n - 4) return "outro";
    if (bar < Math.floor(n * 0.4)) return "a";
    if (bar < Math.floor(n * 0.5)) return "break";
    return "b";
  }
  schedule(step, time) {
    const t = this.track, s = step % 16, bar = Math.floor(step / 16), sec = this.section(bar), ch = this.chord(bar);
    const r = rng(hash(t.id) + step * 7919);
    if (s === 0) this.padChord(bar, time, this.sps * 16);
    const drums = sec === "b" || (sec === "a" && t.bpm > 100);
    if (drums && t.kick[s] === "1") this.kick(time);
    if ((sec === "a" || sec === "b") && t.hat[s] === "1") this.hat(time, r() * 0.4 + 0.6);
    if (sec === "b" && t.snare[s] === "1") this.snare(time);
    if ((sec === "a" || sec === "b" || sec === "break") && t.bass[s] === "1" && sec !== "break") this.bass(this.freq(ch[0], -2), time, this.sps * 2.5);
    if (s % t.arp === 0 && sec !== "intro") {
      const idx = (s / t.arp) % 4, oct = (s >= 8 && t.arp === 1) ? 1 : 0;
      const shape = [0, 1, 2, 1, 3, 2, 1, 2];
      const deg = ch[shape[(s / t.arp) % shape.length] % (sec === "break" ? 3 : 4)];
      this.pluck(this.freq(deg, oct), time, sec === "outro" ? 0.035 : 0.05, t.lead === "square" ? "square" : "triangle");
      void idx;
    }
    if (sec === "intro" && s % 4 === 0) this.pluck(this.freq(ch[(s / 4) % 3], 1), time, 0.03, "sine");
    if (sec === "b" && s % 2 === 0 && r() < 0.42) {
      const pool = [ch[0], ch[1], ch[2], ch[0] + 1, ch[2] + 1];
      this.lead(this.freq(pool[Math.floor(r() * pool.length)], 1), time, this.sps * (2 + Math.floor(r() * 3) * 2));
    }
  }
  env(g, time, peak, a, dur, rel) {
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + a);
    g.gain.setValueAtTime(peak, time + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  }
  padChord(bar, time, dur) {
    const ctx = this.ctx, t = this.track, ch = this.chord(bar);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = t.pad === "sawtooth" ? 1100 : 1800; lp.Q.value = 0.6;
    const g = ctx.createGain(); this.env(g, time, 0.11, Math.min(0.8, dur * 0.4), dur + 0.4, Math.min(0.9, dur * 0.5));
    lp.connect(g); g.connect(this.session.dry); g.connect(this.session.wet);
    ch.slice(0, 3).forEach((deg, i) => {
      [-7, 7].forEach(cents => {
        const o = ctx.createOscillator(); o.type = t.pad; o.frequency.value = this.freq(deg, i === 0 ? -1 : 0); o.detune.value = cents;
        const vg = ctx.createGain(); vg.gain.value = 0.22; o.connect(vg); vg.connect(lp);
        o.start(time); o.stop(time + dur + 0.5);
      });
    });
  }
  bass(f, time, dur) {
    const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f / 2;
    this.env(g, time, 0.3, 0.01, dur, dur * 0.6);
    o.connect(g); o2.connect(g); g.connect(this.session.dry);
    o.start(time); o2.start(time); o.stop(time + dur + 0.05); o2.stop(time + dur + 0.05);
  }
  pluck(f, time, peak, type) {
    const ctx = this.ctx, o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(3200, time); lp.frequency.exponentialRampToValueAtTime(500, time + 0.3);
    this.env(g, time, peak, 0.005, 0.42, 0.35);
    o.connect(lp); lp.connect(g); g.connect(this.session.dry); g.connect(this.session.wet);
    o.start(time); o.stop(time + 0.5);
  }
  lead(f, time, dur) {
    const ctx = this.ctx, t = this.track, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = t.lead; o.frequency.value = f;
    lfo.frequency.value = 5.2; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency);
    lp.type = "lowpass"; lp.frequency.value = t.lead === "sawtooth" || t.lead === "square" ? 1600 : 4000;
    this.env(g, time, t.lead === "sine" ? 0.09 : 0.055, 0.03, dur, dur * 0.5);
    o.connect(lp); lp.connect(g); g.connect(this.session.dry); g.connect(this.session.wet);
    o.start(time); lfo.start(time); o.stop(time + dur + 0.05); lfo.stop(time + dur + 0.05);
  }
  kick(time) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    g.gain.setValueAtTime(0.85, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
    o.connect(g); g.connect(this.session.dry); o.start(time); o.stop(time + 0.4);
  }
  noiseHit(time, type, freq, peak, decay, wet) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(peak, time); g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    src.connect(f); f.connect(g); g.connect(this.session.dry); if (wet) g.connect(this.session.wet);
    src.start(time, Math.random() * 0.5); src.stop(time + decay + 0.02);
  }
  hat(time, v) { this.noiseHit(time, "highpass", 7600, 0.06 * v, 0.05, false); }
  snare(time) {
    this.noiseHit(time, "bandpass", 1900, 0.22, 0.2, true);
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(220, time); o.frequency.exponentialRampToValueAtTime(150, time + 0.08);
    g.gain.setValueAtTime(0.12, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    o.connect(g); g.connect(this.session.dry); o.start(time); o.stop(time + 0.14);
  }
}


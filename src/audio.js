// Procedural ambience and sound effects with the Web Audio API. No audio files.
// Audio starts only after the first click or key press, as browsers require.

export class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try { this.enabled = localStorage.getItem('dungeon-forge:sound') !== 'off'; } catch { /* default on */ }
    this.params = { wind: 0.3, fire: 0, insects: 0, drips: 0, rumble: 0 };
    const start = () => { if (this.enabled) this.start(); };
    window.addEventListener('pointerdown', start, { once: false, passive: true });
    window.addEventListener('keydown', start, { passive: true });
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.55 : 0;
    this.master.connect(ctx.destination);

    // shared noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
    this.brown = buf;
    const wbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const wd = wbuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    this.white = wbuf;

    // echo bus for caves and halls
    this.echo = ctx.createDelay(1.0);
    this.echo.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const echoOut = ctx.createGain(); echoOut.gain.value = 0.5;
    this.echo.connect(fb); fb.connect(this.echo); this.echo.connect(echoOut); echoOut.connect(this.master);

    // wind bed
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 500;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wind.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.master);
    wind.start();

    // fire bed (crackle layer is scheduled below)
    const fire = ctx.createBufferSource(); fire.buffer = buf; fire.loop = true; fire.playbackRate.value = 1.7;
    const ff = ctx.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 900; ff.Q.value = 0.6;
    this.fireGain = ctx.createGain(); this.fireGain.gain.value = 0;
    fire.connect(ff); ff.connect(this.fireGain); this.fireGain.connect(this.master);
    fire.start();

    this.timer = setInterval(() => this.tick(), 60);
  }

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem('dungeon-forge:sound', on ? 'on' : 'off'); } catch { /* ignore */ }
    if (on) this.start();
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.1);
  }

  // called every frame with what the listener should hear
  set(p) { Object.assign(this.params, p); }

  tick() {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime, p = this.params;
    const gust = 0.65 + 0.35 * Math.sin(t * 0.23) * Math.sin(t * 0.071 + 1);
    this.windGain.gain.setTargetAtTime(p.wind * gust * 0.5, t, 0.4);
    this.windFilter.frequency.setTargetAtTime(280 + gust * 520, t, 0.5);
    this.fireGain.gain.setTargetAtTime(p.fire * 0.09, t, 0.2);
    if (p.fire > 0.05 && Math.random() < p.fire * 0.55) this.crackle(p.fire);
    if (p.insects > 0.05 && Math.random() < 0.18 * p.insects) this.chirp(p.insects);
    if (p.drips > 0.05 && Math.random() < 0.035 * p.drips) this.drip(p.drips);
  }

  env(g, peak, attack, decay, t = this.ctx.currentTime) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  noiseBurst({ freq = 2000, q = 1, peak = 0.3, attack = 0.002, decay = 0.05, type = 'bandpass', to = this.master, rate = 1 } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.white; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(to);
    this.env(g, peak, attack, decay);
    s.start(ctx.currentTime, Math.random() * 0.5, attack + decay + 0.05);
  }

  tone({ freq = 440, to = freq, type = 'sine', peak = 0.2, attack = 0.005, decay = 0.3, dest = this.master, delay = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type;
    const t0 = ctx.currentTime + delay;
    o.frequency.setValueAtTime(freq, t0);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, t0 + attack + decay);
    const g = ctx.createGain();
    o.connect(g); g.connect(dest);
    this.env(g, peak, attack, decay, t0);
    o.start(t0); o.stop(t0 + attack + decay + 0.05);
  }

  crackle(level) { this.noiseBurst({ freq: 1500 + Math.random() * 3000, q: 2, peak: 0.05 + 0.15 * level * Math.random(), decay: 0.01 + Math.random() * 0.03 }); }
  chirp(level) { const f = 4200 + Math.random() * 900; for (let k = 0; k < 3; k++) this.tone({ freq: f, peak: 0.012 * level, attack: 0.004, decay: 0.03, delay: k * 0.06 }); }
  drip(level) { const f = 900 + Math.random() * 900; this.tone({ freq: f, to: f * 1.9, peak: 0.07 * level, attack: 0.002, decay: 0.12, dest: this.echo }); }

  // ---- one-shots ----
  place() { if (this.ready()) this.noiseBurst({ freq: 700, q: 1.2, peak: 0.25, decay: 0.06, type: 'lowpass' }); }
  door(open) {
    if (!this.ready()) return;
    const base = open ? 140 : 110;
    this.tone({ freq: base, to: base * (open ? 1.8 : 0.7), type: 'sawtooth', peak: 0.05, attack: 0.05, decay: 0.7, dest: this.echo });
    this.noiseBurst({ freq: 180, type: 'lowpass', peak: 0.35, attack: 0.005, decay: 0.25 });
  }
  coins() { if (!this.ready()) return; for (let k = 0; k < 9; k++) this.tone({ freq: 2200 + Math.random() * 2400, peak: 0.06, attack: 0.002, decay: 0.18, delay: k * 0.045 + Math.random() * 0.03 }); }
  hit() { if (!this.ready()) return; this.noiseBurst({ freq: 300, type: 'lowpass', peak: 0.6, decay: 0.18 }); this.tone({ freq: 160, to: 60, type: 'triangle', peak: 0.3, decay: 0.2 }); }
  growl(big = false) {
    if (!this.ready()) return;
    for (const det of [0, 7, -5]) this.tone({ freq: (big ? 55 : 95) + det, to: (big ? 40 : 70) + det, type: 'sawtooth', peak: big ? 0.08 : 0.05, attack: 0.15, decay: big ? 1.6 : 0.8, dest: this.echo });
  }
  ready() { return this.ctx && this.enabled && this.ctx.state === 'running'; }
}

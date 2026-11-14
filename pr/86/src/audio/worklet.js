// AudioWorklet processor: runs two APU engines at a sample-accurate 60 Hz
// tick. The game engine plays what the cart asks for and freezes while the
// game is paused; the preview engine plays notes, SFX and songs from the
// editors (SPEC 5.5).

import { Engine, TICK_HZ } from './synth.js';

class NovaApu extends AudioWorkletProcessor {
  constructor() {
    super();
    this.game = new Engine(sampleRate);
    this.preview = new Engine(sampleRate);
    this.paused = false;
    this.untilTick = 0;
    this.lastRow = null;
    this.preview.onRow = (info) => { this.lastRow = info; };
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(msg) {
    switch (msg.type) {
      case 'load':
        this.game.setData(msg.data);
        this.preview.setData(msg.data);
        this.game.reset();
        this.game.master = 1;
        break;
      case 'data':
        this.game.setData(msg.data);
        this.preview.setData(msg.data);
        break;
      case 'cmd':
        for (const c of msg.cmds) this.game.command(c);
        break;
      case 'pause':
        this.paused = true;
        break;
      case 'resume':
        this.paused = false;
        break;
      case 'reset':
        this.game.reset();
        break;
      case 'preview':
        this.previewCommand(msg.cmd);
        break;
    }
  }

  previewCommand(cmd) {
    const p = this.preview;
    switch (cmd[0]) {
      case 'note': p.noteOn(cmd[1], cmd[2], cmd[3], cmd[4] ?? 15, cmd[5] ?? 18); break;
      case 'sfx': p.reset(); p.playSfx(cmd[1], cmd[2] ?? -1); break;
      case 'music': p.reset(); p.playMusic(cmd[1], cmd[2] ?? 0); break;
      case 'stop': p.reset(); this.port.postMessage({ type: 'row', info: null }); break;
    }
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const perTick = sampleRate / TICK_HZ;
    let i = 0;
    while (i < n) {
      if (this.untilTick <= 0) {
        if (!this.paused) this.game.tick();
        this.preview.tick();
        this.untilTick += perTick;
      }
      const run = Math.min(n - i, Math.ceil(this.untilTick));
      if (!this.paused) this.game.render(L, R, i, i + run);
      this.preview.render(L, R, i, i + run);
      i += run;
      this.untilTick -= run;
    }
    for (let k = 0; k < n; k++) {
      L[k] = Math.max(-1, Math.min(1, L[k]));
      if (R !== L) R[k] = Math.max(-1, Math.min(1, R[k]));
    }
    if (this.lastRow) {
      this.port.postMessage({ type: 'row', info: this.lastRow });
      this.lastRow = null;
    }
    return true;
  }
}

registerProcessor('nova-apu', NovaApu);

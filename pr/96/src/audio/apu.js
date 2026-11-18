// Main-thread side of the APU: creates the AudioContext and worklet, and
// relays commands to it. The console never sends per-sample data (SPEC 5.5).

import { engineData } from './synth.js';

// The player's own volume (not the cart's `volume()`): a level from 0 to 1 in steps of a tenth, remembered between
// visits. The gain follows a square law, so each step sounds about the same and 10% is quiet but not silent.
const LEVEL_KEY = 'nova16.volume';
const LEVEL_STEP = 0.1;
const gainFor = (level) => level * level;
function readLevel() {
  try {
    const v = Number(localStorage.getItem(LEVEL_KEY));
    return localStorage.getItem(LEVEL_KEY) !== null && Number.isFinite(v) ? Math.max(0, Math.min(1, Math.round(v * 10) / 10)) : 1;
  } catch {
    return 1;
  }
}

export class Apu {
  constructor() {
    this.ctx = null;
    this.node = null;
    this.queue = [];
    this.onRow = null; // (info | null) => void: preview playback position
    this.failed = false;
    this.level = readLevel();
    this.unmuteTo = 1; // the level M restores
  }

  /** Create the audio graph. Browsers keep it suspended until a user gesture. */
  async start() {
    try {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      await this.ctx.audioWorklet.addModule(new URL('./worklet.js', import.meta.url));
      this.node = new AudioWorkletNode(this.ctx, 'nova-apu', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
      });
      this.out = this.ctx.createGain(); // the player's volume; clips are recorded before it
      this.out.gain.value = gainFor(this.level);
      this.node.connect(this.out);
      this.out.connect(this.ctx.destination);
      this.node.port.onmessage = (e) => {
        if (e.data.type === 'row') this.onRow?.(e.data.info);
      };
      for (const m of this.queue) this.node.port.postMessage(m);
      this.queue = [];
      const unlock = () => {
        if (this.ctx.state !== 'running') this.ctx.resume();
      };
      for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, true);
    } catch (e) {
      this.failed = true;
      throw e;
    }
  }

  /** Set the player's volume (0 to 1, in tenths) and remember it. Returns the level. */
  setLevel(level) {
    this.level = Math.max(0, Math.min(1, Math.round(level * 10) / 10));
    if (this.out) this.out.gain.value = gainFor(this.level);
    try { localStorage.setItem(LEVEL_KEY, String(this.level)); } catch { /* storage blocked: the level lasts for this visit */ }
    return this.level;
  }

  /** One step up or down (+1 or -1). */
  stepLevel(dir) {
    return this.setLevel(this.level + dir * LEVEL_STEP);
  }

  /** Mute, or bring the volume back to where it was. Returns the level. */
  toggleMute() {
    if (this.level > 0) { this.unmuteTo = this.level; return this.setLevel(0); }
    return this.setLevel(this.unmuteTo || 1);
  }

  /** A MediaStream of the APU output, for recording clips; null without audio. */
  mediaStream() {
    if (!this.ctx || !this.node) return null;
    if (!this.dest) {
      this.dest = this.ctx.createMediaStreamDestination();
      this.node.connect(this.dest);
    }
    return this.dest.stream;
  }

  post(msg) {
    if (this.failed) return;
    if (this.node) this.node.port.postMessage(msg);
    else this.queue.push(msg);
  }

  /** Load a cart's audio and stop anything the game engine was playing. */
  load(cart) {
    this.post({ type: 'load', data: engineData(cart) });
  }

  /** Replace the audio data without stopping playback (after an edit). */
  update(cart) {
    this.post({ type: 'data', data: engineData(cart) });
  }

  /** Relay one frame's commands from the console. */
  commands(cmds) {
    this.post({ type: 'cmd', cmds });
  }

  pause() {
    this.post({ type: 'pause' });
  }

  resume() {
    this.post({ type: 'resume' });
  }

  /** Stop everything the game started. */
  reset() {
    this.post({ type: 'reset' });
  }

  /** Stop anything the editors are previewing. */
  stopPreview() {
    this.post({ type: 'preview', cmd: ['stop'] });
  }

  /** Editor preview: ['note', ch, inst, note, vol, hold], ['sfx', n], ['music', song, pos] or ['stop']. */
  preview(cmd) {
    this.ctx?.state === 'suspended' && this.ctx.resume();
    this.post({ type: 'preview', cmd });
  }
}

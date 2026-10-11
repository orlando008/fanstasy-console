// Main-thread side of the APU: creates the AudioContext and worklet, and
// relays commands to it. The console never sends per-sample data (SPEC 5.5).

import { engineData } from './synth.js';

export class Apu {
  constructor() {
    this.ctx = null;
    this.node = null;
    this.queue = [];
    this.onRow = null; // (info | null) => void: preview playback position
    this.failed = false;
  }

  /** Create the audio graph. Browsers keep it suspended until a user gesture. */
  async start() {
    try {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      await this.ctx.audioWorklet.addModule(new URL('./worklet.js', import.meta.url));
      this.node = new AudioWorkletNode(this.ctx, 'nova-apu', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
      });
      this.node.connect(this.ctx.destination);
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

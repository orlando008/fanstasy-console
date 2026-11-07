// Clip recording (SPEC M9): the console streams each rendered frame here
// while a clip records. Frames are drawn 3x with nearest-neighbor scaling
// into a canvas that MediaRecorder turns into WebM along with the APU's
// audio, and every second frame is kept, palette-indexed, for GIF export.

import { GifEncoder, indexFrame } from './gif.js';
import { withDuration } from './webm-duration.js';

export const CLIP_MAX_SECONDS = 30;
const W = 256, H = 224;
const VIDEO_SCALE = 3;

export class ClipRecorder {
  /** @param {MediaStream | null} audio stream to mix into the WebM */
  constructor(audio) {
    this.small = new OffscreenCanvas(W, H);
    this.smallCtx = this.small.getContext('2d');
    this.canvas = document.createElement('canvas');
    this.canvas.width = W * VIDEO_SCALE;
    this.canvas.height = H * VIDEO_SCALE;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.frames = 0;
    this.gifFrames = [];
    this.chunks = [];

    const stream = this.canvas.captureStream(60);
    for (const t of audio?.getAudioTracks() || []) stream.addTrack(t);
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((t) => MediaRecorder.isTypeSupported(t));
    this.recorder = type ? new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4e6 }) : null;
    if (this.recorder) {
      this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
      this.recorder.start(1000);
      this.startTime = performance.now();
    }
  }

  /** Seconds recorded so far. */
  get seconds() {
    return this.frames / 60;
  }

  /** Add one 60 Hz frame (Uint32Array of 256x224 RGBA pixels). */
  frame(px) {
    this.smallCtx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, px.byteLength), W, H), 0, 0);
    this.ctx.drawImage(this.small, 0, 0, W * VIDEO_SCALE, H * VIDEO_SCALE);
    if (this.frames % 2 === 0) this.gifFrames.push(indexFrame(px));
    this.frames++;
  }

  /** Stop recording. Resolves to a Clip. */
  stop() {
    return new Promise((resolve) => {
      const done = async () => {
        let webm = this.chunks.length ? new Blob(this.chunks, { type: 'video/webm' }) : null;
        // MediaRecorder leaves the duration out, which breaks seeking in some players.
        if (webm) webm = await withDuration(webm, performance.now() - this.startTime);
        resolve(new Clip(webm, this.gifFrames, this.frames));
      };
      if (!this.recorder || this.recorder.state === 'inactive') {
        done();
        return;
      }
      this.recorder.onstop = done;
      this.recorder.stop();
    });
  }
}

/** A finished clip: the WebM recording and the frames for a GIF. */
export class Clip {
  constructor(webm, gifFrames, frames) {
    this.webm = webm;
    this.gifFrames = gifFrames;
    this.frames = frames;
  }

  get seconds() {
    return this.frames / 60;
  }

  /**
   * Encode the GIF at 30 fps. Yields to the page between frames and reports
   * progress (0-1) through onProgress.
   */
  async gif(scale = 2, onProgress = () => {}) {
    const enc = new GifEncoder(W, H, scale);
    const n = this.gifFrames.length;
    for (let i = 0; i < n; i++) {
      // 30 fps in hundredths of a second: alternate 3 and 4 to average 3.33.
      const delay = Math.round(((i + 1) * 10) / 3) - Math.round((i * 10) / 3);
      enc.addFrame(this.gifFrames[i], delay);
      if (i % 8 === 7) {
        onProgress(i / n);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    onProgress(1);
    return enc.finish();
  }
}

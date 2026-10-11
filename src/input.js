// Keyboard and gamepad sampling. The main thread samples once per frame and
// sends each pad to the console as a 12-bit button mask (SPEC section 6).

// Bit order matches the cart constants UP=0 ... SELECT=11.
const KEYS = {
  ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3,
  KeyX: 4, KeyZ: 5, KeyS: 6, KeyA: 7, KeyQ: 8, KeyW: 9,
  Enter: 10, ShiftLeft: 11, ShiftRight: 11,
};

// Standard gamepad button index -> bit.
const PAD_BUTTONS = [
  [12, 0], [13, 1], [14, 2], [15, 3],
  [1, 4], [0, 5], [3, 6], [2, 7],
  [4, 8], [5, 9], [9, 10], [8, 11],
];

const DEADZONE = 0.4;

export class Input {
  constructor(target = window) {
    this.held = new Set();
    // Keys pressed since the last sample, so a tap shorter than a frame
    // still registers for one frame.
    this.tapped = new Set();
    this.enabled = true;
    this.masks = new Uint16Array(4);
    // Gamepad index assigned to each player, or null. A pad joins the first
    // free player slot when one of its buttons is pressed, so P1 is the first
    // pad used rather than whatever the browser put in slot 0 (Steam's
    // virtual pads, a duplicate of the same controller, and so on).
    this.players = [null, null, null, null];

    target.addEventListener('keydown', (e) => {
      if (!this.enabled || isTextField(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code in KEYS) {
        this.held.add(e.code);
        this.tapped.add(e.code);
        e.preventDefault();
      }
    });
    target.addEventListener('keyup', (e) => {
      if (e.code in KEYS) this.held.delete(e.code);
    });
    target.addEventListener('blur', () => this.clear());
  }

  /** Current masks for pads 0-3. Returns a new array each call. */
  sample() {
    const masks = new Uint16Array(4);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.assignPads(pads);
    for (let p = 0; p < 4; p++) {
      const pad = this.players[p] === null ? null : pads[this.players[p]];
      if (!pad || !pad.connected) continue;
      let mask = 0;
      for (const [b, bit] of PAD_BUTTONS) {
        if (pad.buttons[b]?.pressed) mask |= 1 << bit;
      }
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      if (ay < -DEADZONE) mask |= 1 << 0;
      if (ay > DEADZONE) mask |= 1 << 1;
      if (ax < -DEADZONE) mask |= 1 << 2;
      if (ax > DEADZONE) mask |= 1 << 3;
      masks[p] = mask;
    }
    if (this.enabled) {
      for (const code of this.held) masks[0] |= 1 << KEYS[code];
      for (const code of this.tapped) masks[0] |= 1 << KEYS[code];
    }
    this.tapped.clear();
    return masks;
  }

  /** Free the players of disconnected pads and seat pads that press a button. */
  assignPads(pads) {
    for (let p = 0; p < 4; p++) {
      const i = this.players[p];
      if (i !== null && !pads[i]?.connected) this.players[p] = null;
    }
    for (const pad of pads) {
      if (!pad || !pad.connected || this.players.includes(pad.index)) continue;
      if (!pad.buttons.some((b) => b.pressed)) continue;
      const free = this.players.indexOf(null);
      if (free < 0) return;
      this.players[free] = pad.index;
    }
  }

  clear() {
    this.held.clear();
    this.tapped.clear();
  }
}

function isTextField(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

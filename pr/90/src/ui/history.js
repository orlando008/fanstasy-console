// Undo/redo for the graphics editors. An edit is bracketed by begin() and
// commit(); only the elements that changed are stored, so long histories of
// small strokes stay cheap even on the 64 KB tile sheet.

export class History {
  /**
   * @param {() => ArrayLike<number>} getData the typed array being edited
   * @param {() => void} onApply called after undo or redo changes the data
   */
  constructor(getData, onApply, limit = 200) {
    this.getData = getData;
    this.onApply = onApply;
    this.limit = limit;
    this.clear();
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.snap = null;
  }

  /** Start an edit. Calling begin() again before commit() is a no-op. */
  begin() {
    if (!this.snap) this.snap = this.getData().slice();
  }

  /** Finish an edit. Returns true if anything changed. */
  commit() {
    const before = this.snap;
    this.snap = null;
    if (!before) return false;
    const after = this.getData();
    const idx = [];
    for (let i = 0; i < after.length; i++) if (after[i] !== before[i]) idx.push(i);
    if (!idx.length) return false;
    const Ctor = after.constructor;
    this.undoStack.push({
      idx: Uint32Array.from(idx),
      before: Ctor.from(idx, (i) => before[i]),
      after: Ctor.from(idx, (i) => after[i]),
    });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return true;
  }

  /** The data as it was when begin() was called (during an edit). */
  get base() {
    return this.snap;
  }

  undo() {
    return this.step(this.undoStack, this.redoStack, 'before');
  }

  redo() {
    return this.step(this.redoStack, this.undoStack, 'after');
  }

  step(from, to, side) {
    const e = from.pop();
    if (!e) return false;
    const data = this.getData();
    for (let k = 0; k < e.idx.length; k++) data[e.idx[k]] = e[side][k];
    to.push(e);
    this.onApply();
    return true;
  }
}

/**
 * Undo/redo for structured data (the audio editors). Each edit snapshots just
 * the unit it touches, such as one pattern or one instrument.
 */
export class SnapshotHistory {
  constructor(onApply, limit = 200) {
    this.onApply = onApply;
    this.limit = limit;
    this.clear();
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Run mutate() and record the change. get() returns the unit's current
   * value and set(v) replaces it; key identifies the unit so consecutive
   * edits to one field can merge (for example dragging a slider).
   */
  edit(get, set, mutate, key = null) {
    const before = structuredClone(get());
    mutate();
    const after = structuredClone(get());
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    const top = this.undoStack[this.undoStack.length - 1];
    if (key && top && top.key === key) {
      top.after = after;
    } else {
      this.undoStack.push({ get, set, before, after, key });
      if (this.undoStack.length > this.limit) this.undoStack.shift();
    }
    this.redoStack = [];
    return true;
  }

  /** Stop merging into the last entry. */
  seal() {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top) top.key = null;
  }

  undo() {
    return this.step(this.undoStack, this.redoStack, 'before');
  }

  redo() {
    return this.step(this.redoStack, this.undoStack, 'after');
  }

  step(from, to, side) {
    const e = from.pop();
    if (!e) return false;
    e.set(structuredClone(e[side]));
    e.key = null;
    to.push(e);
    this.onApply();
    return true;
  }
}

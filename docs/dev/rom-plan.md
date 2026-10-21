# Cartridge ROM: plan and progress

A SNES cartridge held its graphics, music and levels in ROM (256 KB to 6 MB), and games copied what they needed into
video memory as they ran. A NOVA-16 cart has nowhere to keep data beyond what is loaded at boot (32 KB of tiles, 64 KB
of map, 32 KB of samples) and its 64 KB of code. Streamed animations (`art.stream()`, docs/dev/snes-picture.md) show
the cost: one 96 px fighter's frames take about 20 KB of `code.js`, a third of the code budget. This document is the plan
for a ROM section, and the record of how far the work has got. Read it before working on the cart format, the packer,
the ROM API or streaming.

Decided with the user (October 2026):
- **128 KB of ROM** (a 1 megabit cartridge, the size of the earliest SNES games), as a new fixed limit in the spec. It
  needs no change to `.nova.png`: the PNG holds 147,443 bytes after compression, the biggest games today use 57 to
  84 KB of it, and packed frames compress to about 60 %.
- **Old carts are unchanged.** A cart without ROM is written and read exactly as now.
- Later, if games outgrow it: a 1024 x 768 `.nova.png` (four times the capacity, a version byte tells it apart) and a
  ROM of 512 KB to 1 MB.

## What it is

| | |
|---|---|
| Size | 128 KB in all, read-only |
| Layout | named blobs (`"hero"`, `"level3"` ...), each a run of bytes |
| In `.nova` | `"rom": { "hero": "<base64>", ... }`, present only when the cart has ROM; such a cart is format version 3 |
| In a cart's source | `carts/src/<name>/rom/<blob>.bin`, one file a blob; `tools/pack.js` gathers them |
| API | `rom(name)`: the blob as a read-only `Uint8Array` (the same object each call); `rom()`: the names |
| Errors | a cart over 128 KB is refused by the packer and the loader; `rom('missing')` throws, naming the blobs there are |

Why named blobs and not one address space: each tool that makes data (the art kit, a level script) owns its own
files, nothing has to agree on offsets, and `code.js` never holds addresses that go stale.

## Steps

| Step | What | Checks |
|---|---|---|
| R1 | The console: SPEC sections 3 (the limit), 8 (`rom()`), 9.1 (the field, version 3); the loader and writer in `src/`; `tools/pack.js` reads `rom/`; `tools/check.js` reports ROM use and fails over the limit | a console test: a cart with ROM reads its bytes back; a version 2 cart loads and saves byte for byte as before; every cart's fingerprints match before and after |
| R2 | The editor: ROM use beside the code counter and in the PNG capacity meter on the Cart tab; ROM carried through `.nova` and `.nova.png` export and import | export and re-import a cart with ROM, the blobs unchanged |
| R3 | The art kit: `art.stream(..., rom=True)` writes its tiles and frames as a binary blob (8 bits a byte instead of 6 a character: about 15 KB for the street fighter instead of 20 KB), and `streamSprite()` reads it with `rom()`; the `street` cart moves its fighter there | the stream self-test through ROM, on the console's screen; `street`'s `code.js` back to its game code (about 7 KB) |
| R4 | Docs: the playbook (when to use ROM, the budget), `docs/dev/snes-picture.md`, the cart template from `tools/new-cart.js` | `node tools/check-docs.js` |

## Progress

| Step | State | Notes |
|---|---|---|
| R1 | built | SPEC 3, 8 and 9.1; `src/formats/cart.js` (`ROM_LIMIT`, `checkRom()`, `romBytes()`), `nova-json.js` (the `rom` field, version 3 only for a cart with ROM), `rom()` in `src/console/api.js`, the worker and the harness; `tools/pack.js` reads `rom/`, `tools/unpack.js` writes it, `tools/check.js` reports it. `tests/console/rom.mjs` (20 checks) in CI. Every cart packs to the same `.nova`, and the fingerprints of all 22 carts (900 frames of random play, CPU stat pinned) are the same before and after. |
| R2 | built | The Cart tab shows ROM use beside the code counter (red over the limit); the PNG capacity meter already sizes the whole payload, ROM included. Export and import go through `writeNova()` and `readNova()`: `tests/console/rom.mjs` builds the `.nova.png` payload with the editor's own `cartPayload()` and reads the ROM back unchanged. |
| R3 | built | `art.stream(..., rom=True)` writes `rom/<name>.bin` (a byte a run: copies from the row above of 1 to 64 pixels, or a colour for 1 to 12; 16-bit tile indices), `Art.write()` removes a blob it no longer makes, and `streamSprite()` unpacks it with `rom()`. The `street` fighter: 18,519 bytes of ROM (the estimate above was 15 KB; it was 20.5 KB as text), `code.js` 7,583 bytes, the `.nova.png` payload 31 KB of 147 KB. The art self-test runs the stream on the console's screen both ways; the browser smoke test plays `street`. |
| R4 | built | The playbook (the source folder's `rom/`, `rom=True` for big fighters, the budget), `docs/dev/snes-picture.md`, `tools/pack.js` and `tools/unpack.js` headers, SPEC 3, 8 and 9.1. |

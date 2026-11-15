# A small reader of standard MIDI files (formats 0 and 1), for scores.py: no packages needed. read(path) gives
# { 'tpq': ticks a quarter, 'tracks': [[(start tick, MIDI pitch, length in ticks, channel), ...], ...], 'meta': {...} }.
import struct


def _var(b, i):
    v = 0
    while True:
        c = b[i]; i += 1; v = (v << 7) | (c & 127)
        if not c & 128: return v, i


def read(path):
    b = open(path, 'rb').read()
    if b[:4] != b'MThd': raise ValueError('%s is not a MIDI file' % path)
    hl, fmt, ntrk, tpq = struct.unpack('>IHHH', b[4:14])
    i = 8 + hl; tracks = []; meta = {'tempo': [], 'time': [], 'key': [], 'names': []}
    for _ in range(ntrk):
        if b[i:i + 4] != b'MTrk': raise ValueError('bad track chunk')
        n = struct.unpack('>I', b[i + 4:i + 8])[0]; j = i + 8; end = j + n; i = end
        t, status, on, notes, name = 0, 0, {}, [], ''
        while j < end:
            d, j = _var(b, j); t += d
            c = b[j]
            if c & 128: status = c; j += 1
            if status == 0xFF:
                typ = b[j]; ln, j = _var(b, j + 1); data = b[j:j + ln]; j += ln
                if typ == 0x51: meta['tempo'].append((t, int.from_bytes(data, 'big')))
                elif typ == 0x58: meta['time'].append((t, data[0], 2 ** data[1]))
                elif typ == 0x59: meta['key'].append((t, struct.unpack('b', data[:1])[0], data[1]))
                elif typ == 0x03: name = data.decode('latin1')
                continue
            if status in (0xF0, 0xF7): ln, j = _var(b, j); j += ln; continue
            kind, ch = status & 0xF0, status & 15
            if kind in (0xC0, 0xD0): j += 1; continue
            p, v = b[j], b[j + 1]; j += 2
            if kind == 0x90 and v > 0: on.setdefault((ch, p), []).append(t)
            elif kind == 0x80 or (kind == 0x90 and v == 0):
                if on.get((ch, p)): s = on[(ch, p)].pop(0); notes.append((s, p, t - s, ch))
        meta['names'].append(name)
        tracks.append(sorted(notes))
    return {'tpq': tpq, 'format': fmt, 'tracks': tracks, 'meta': meta}

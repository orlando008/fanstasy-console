"""What the library's songs share when they are added to a game's Audio: their instruments, under names that start
with a prefix ('L.' for the classics, 'RD.' for Rush D) so they never meet the game's own, each added once however many
songs use it, and the kick and snare samples, made once for all of them."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import kick, snare


def drum_samples(a):
    """The kick and snare sample numbers in this Audio (made the first time a song asks)."""
    lib = a.__dict__.setdefault('_library', {})
    if 'drums' not in lib: lib['drums'] = (a.sample(kick()), a.sample(snare()))
    return lib['drums']


def instruments(a, prefix, table):
    """Add the instruments of `table` ({name: (wave, a, d, s, r, vol, {options})}, a sample named 'kick' or 'snare')
    under prefix + name, unless already there. An instrument the Audio already has with the very same settings (the
    game's own, or another song's) is used again instead of added, since a game has only 32. Returns
    {name: instrument number}."""
    k, s = drum_samples(a) if any(t[0] == 'sample' for t in table.values()) else (None, None)
    out = {}
    for name, (wave, at, d, sus, r, vol, opt) in table.items():
        full = prefix + name
        if full not in a.I:
            opt = dict(opt)
            if 'sample' in opt: opt['sample'] = {'kick': k, 'snare': s}[opt['sample']]
            a.instrument(full, wave, at, d, sus, r, vol, **opt)
            same = a.instruments.index(a.instruments[-1])       # the first with these settings
            if same < len(a.instruments) - 1: a.instruments.pop(); a.I[full] = same
        out[name] = a.I[full]
    return out


def room(a, name):
    """Fail, naming the song, if adding it took the Audio past what one audio.json holds."""
    over = [what for what, n, most in (('songs', len(a.songs), 8), ('patterns', len(a.patterns), 64),
                                       ('instruments', len(a.instruments), 32), ('samples', len(a.samples), 32)) if n > most]
    if over: raise SystemExit('adding %s takes the audio past what a game holds (%s): leave out a song, or some of the '
                              "game's own instruments" % (name, ', '.join('%s %d of %d' % (w, n, m) for w, n, m in
                              (('songs', len(a.songs), 8), ('patterns', len(a.patterns), 64), ('instruments', len(a.instruments), 32),
                               ('samples', len(a.samples), 32)) if w in over)))

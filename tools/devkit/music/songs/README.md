# The song library

Ready-made songs for the NOVA-16 sound chip that any game can take. Each is a name you pass to `library.add()` in the
game's `audio.py`; it comes in with its own instruments and plays as one of the game's songs.

| Name | Piece | Length | For |
|---|---|---|---|
| `rush_d` | *Rush D*, the toolkit's own: a calm tune in D that keeps speeding up and filling in until it is chaos, stops dead, and ends on a big chord | 81 s | a rhythm game, a boss, a timer running out |
| `alla_turca` | Mozart, *Rondo alla Turca* (K. 331), bars 1 to 32 | 26 s | a quick level, an action scene |
| `entertainer` | Joplin, *The Entertainer*, bars 1 to 36 | 48 s | a town, a shop, a menu |
| `toccata` | Bach, *Toccata and Fugue in D minor*, bars 1 to 16, on an organ of pulse and saw | 45 s | a boss, a castle, a villain's entrance |
| `minute_waltz` | Chopin, *Minute Waltz* (Op. 64 No. 1), bars 1 to 36 | 22 s | a chase, a timer running out |
| `canon` | Pachelbel, *Canon in D*, bars 1 to 24, looping on its ground bass | 90 s | a title, credits, a peaceful place |
| `jesu` | Bach, *Jesu, Joy of Man's Desiring* (BWV 147), the whole piece | 2 min 32 s | an ending, a church, a hall of heroes |
| `ode_to_joy` | Beethoven, the *Ode to Joy* (Symphony No. 9): plain, a variation over drums, then a step up | 85 s | a victory, a level cleared, a festival |
| `greensleeves` | *Greensleeves* (traditional): plain over a harp, then a variation over drums | 48 s | a village, a tavern, a forest, a sad scene |
| `william_tell` | Rossini, the *William Tell* overture's gallop, 8 bars three times: plain, doubled over galloping drums, in thirds | 16 s | a chase, a race, a horse ride, a cartoon dash |

Every song loops. Before a game ships one, check its licence in `scores/SOURCES.md`: the *Canon*'s notes come from a
CC BY file, so the game credits its engraver, and the source of *Jesu, Joy*'s file is still to be confirmed.

## Hear them

    node tools/devkit/music/songs/listen.mjs out/ [name ...]

writes `out/<name>.wav` for each song named (every song when none is), played by the console's own synth.

## Put one in a game

In the game's `audio.py`, after its own songs (so their numbers stay what `code.js` expects):

```python
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music/songs'))
from library import add
BOSS = add(a, 'toccata')            # 2: the song's number, for music(2) in code.js
WIN = add(a, 'ode_to_joy')          # 3
a.write(sys.argv[1], songs=4)
```

- `add(a, name)` takes the game's `Audio(chip=2)` and returns the song's number.
- It adds the song's instruments under their own names (`L.LEAD`, `RD.BASS`...), so they never meet the game's. Each is
  added once, however many songs use it. An instrument the game already has with the very same settings is used again.
- It adds the kick and snare samples once, and the song's patterns.
- A game holds at most 8 songs, 64 patterns and 32 instruments. `add()` stops with a message naming the song that goes
  past one of these. The classics share 10 instruments, and Rush D brings 10 (8 beside the classics, whose bass and kick it shares); the patterns each song takes
  are in `python3 tools/devkit/music/songs/library.py out/audio.json <name>`.
- Songs play on channels 0 to 6 with the speed on 7, and Rush D on all 8. An effect on channel 6 mutes a song's hats
  while it plays; the playbook's channel rules have the rest.
- Run the game's checks as for any song: `loud.mjs --check` and `clash.py` (playbook section 5).

## Add a song to the library

1. **The notes.** For a public domain piece with a public domain file (Mutopia, as collected in `marmooo/classical-midi-db`),
   add the excerpt to `PIECES` in `import_scores.py` (or `PLAYED` for a performance played in by hand). For a tune
   written out by hand, add it there as `ODE`, `GREEN` and `TELL` are. Run `python3 tools/devkit/music/songs/import_scores.py
   [folder with the MIDI files]` to write `scores/<name>.txt`, and record the source and licence in `scores/SOURCES.md`.
2. **The arrangement.** Add a function to `library.py` (which voice plays on which channel, with which instrument, at
   what speed) and put it in `CLASSICS`; a song made another way (as `rush_d.py` is) needs an `add(a)` of its own.
3. **Check it.** `listen.mjs`, then the levels and clashes of a file with it alone: `library.py out/audio.json <name>`,
   pack it in any cart folder, and run `loud.mjs --check` and `clash.py`. Add it to the table above.

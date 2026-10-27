# Where the notes of Flow State come from

The notes are the public domain compositions' own (Bach died in 1750, Beethoven in 1827). What matters for a game that ships them is the licence of the file
they were read from, so each source is recorded here. `import_score.py` turns one voice of a MIDI file into the text kept in this folder: only note pitches,
starts and lengths are kept (rounded to a grid, ornaments shorter than a grid step dropped); the MIDI files themselves are not in the repository.

| Piece | Text files | Source | Licence of the source |
|---|---|---|---|
| Minuet in G (BWV Anh. 114, by Christian Petzold) | `minuet.*` | Mutopia Project, Notebook for Anna Magdalena Bach (`BachJS/BWVAnh114`), found in `marmooo/classical-midi-db` | Mutopia: public domain or Creative Commons (the file does not say which) |
| Air on the G String (Orchestral Suite 3, BWV 1068) | `air.*` | Mutopia Project, the flute and guitar arrangement (`BachJS/BWV1068`) | as above |
| Für Elise (WoO 59) | `elise.*` | Mutopia Project (`BeethovenLv/WoO59`) | as above |
| Moonlight Sonata, first movement (Op. 27 no. 2) | `moon.*` | Mutopia Project (`BeethovenLv/O27/moonlight`, `moonlight1-a4.mid`) | as above |
| Prelude in C (BWV 846) | `prelude.*` | Mutopia Project (`BachJS/BWV846/wtk1-prelude1`) | as above |
| Badinerie (Orchestral Suite 2, BWV 1067) | `badinerie.*` | John Hamm's 1995 General MIDI sequence of the Orchestral Suites, as shipped in the `jikol1906/bach-visualizer` repository (`midi/badinerie.mid`) | **not stated**: the repository has no licence file |

**Open before a public release:** the Badinerie. A sequence can carry its own copyright (its timing, its ornaments, its choice of parts); the notes kept here are
only pitches and rhythms rounded to a grid, from the flute part, but the licence is not clear. To replace it: find an engraving or a MIDI with a clear licence
(Mutopia has none of this suite; IMSLP and MuseScore list public domain typesettings), and run `import_score.py` on it as in `docs/carts/flow-state.md`
(the commands are in the header of the script), then `python3 carts/src/flow-state/audio.py carts/src/flow-state/audio.json` and the tests (`04-music.mjs`
checks that every chart agrees with its song).

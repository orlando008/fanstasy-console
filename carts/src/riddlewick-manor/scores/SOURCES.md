# Where the notes of Riddlewick Manor's music come from

Bach died in 1750 and Beethoven in 1827, so the compositions are in the public domain. A game that ships them also has
to respect the licence of the file the notes were read from, so each source is recorded here. Both files are engravings
from the **Mutopia Project** (LilyPond typesettings) whose own licence is **Public Domain**, as collected in the
`marmooo/classical-midi-db` repository (its `docs/mutopia/` folder; the licence of each file is in its
`docs/json/mutopia/en.json`).

`carts/src/riddlewick-manor/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths. It
takes an excerpt of bars, on a grid, dealt out to a tune, a bass and two inner voices, and writes them to the text files
of this folder. The MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/mutopia/` of the collection) | Licence |
|---|---|---|---|---|
| 0, the title and the menus | `toccata.txt` | Bach, *Toccata and Fugue in D minor* (BWV 565), the toccata's opening, bars 1 to 11, on a grid of 64th notes | `BachJS/BWV565/ToccataFugue/ToccataFugue.mid` | Public domain (Mutopia-2011/09/11-1780, after the Bach-Gesellschaft edition, 1867) |
| 1, exploring the manor | `moonlight.txt` | Beethoven, *Piano Sonata No. 14* (the Moonlight), first movement, bars 1 to 21, in an arrangement for two guitars (in D minor), on a grid of triplet quavers | `BeethovenLv/O27/moonlight-guitar-duo/moonlight-guitar-duo.mid` | Public domain (Mutopia-2016/01/21-2101, engraved by Jeffrey Olson) |

Other candidates were left out for their files' licences: Mussorgsky's *Night on Bald Mountain* (CC BY 3.0) and the
Moonlight's piano engraving (no licence given); no public domain file of Saint-Saens's *Danse macabre* was found.

To make the text again: fetch the two files (the paths above, from the collection) into a folder, then run:

    python3 carts/src/riddlewick-manor/scores.py <that folder>
    python3 carts/src/riddlewick-manor/audio.py carts/src/riddlewick-manor/audio.json

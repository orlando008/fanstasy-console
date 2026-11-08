# Where the notes of Royal Chess's music come from

Both pieces are by Johann Sebastian Bach (died 1750), so the compositions are in the public domain. A game that ships them
also has to respect the licence of the file the notes were read from, so each source is recorded here. Both files are
engravings from the **Mutopia Project** (LilyPond typesettings) whose own licence is **Public Domain** (Mutopia's entries
Mutopia-2017/01/19-75, engraved by Allen Garvin after the Bach-Gesellschaft, and Mutopia-2011/10/25-1794, engraved by
Jeremy Visser after Breitkopf & Härtel, 1881), as collected in the
`marmooo/classical-midi-db` repository (its `docs/mutopia/` folder; the licence of each file is in its
`docs/json/mutopia/en.json`).

`carts/src/royal-chess/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths. It takes an
excerpt of bars, on a grid, dealt out to a tune, a bass and two inner voices, and writes them to the text files of this
folder. The MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/mutopia/` of the collection) | Licence |
|---|---|---|---|---|
| 0, the title and the menus | `minuet.txt` | Bach, *Minuet in G* (BWV Anh. 114, from the Notebook for Anna Magdalena Bach), all 32 bars, on a grid of quavers | `BachJS/BWVAnh114/anna-magdalena-04/anna-magdalena-04.mid` | Public domain (Mutopia) |
| 1, the game | `sheep.txt` | Bach, *Sheep May Safely Graze* (Schafe können sicher weiden, from the Hunting Cantata, BWV 208), bars 1 to 20, on a grid of semiquavers | `BachJS/BWV208/Sheep/Sheep.mid` | Public domain (Mutopia) |

To make the text again: fetch the two files (the paths above, from the collection) into a folder, then run:

    python3 carts/src/royal-chess/scores.py <that folder>
    python3 carts/src/royal-chess/audio.py carts/src/royal-chess/audio.json

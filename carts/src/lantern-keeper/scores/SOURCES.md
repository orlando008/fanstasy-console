# Where the notes of Lantern Keeper's music come from

The compositions are in the public domain (Debussy died in 1918, Satie in 1925, Bach in 1750, Chopin in 1849, Grieg in 1907). What
matters for a game that ships them is the licence of the file they were read from, so each source is recorded here. All six are
engravings from the **Mutopia Project** (LilyPond typesettings, released into the public domain or under Creative Commons licences:
mutopiaproject.org/legal.html), as collected in the `marmooo/classical-midi-db` repository (its `docs/mutopia/` folder).
`carts/src/lantern-keeper/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths (on a grid, an excerpt
of bars, dealt out to voices) in the text files of this folder; the MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/mutopia/` of the collection) |
|---|---|---|---|
| 0, the title | `clair.txt` | Debussy, *Clair de lune* (Suite bergamasque, L. 75), bars 1 to 21 | `DebussyC/L75/debussy_Ste_Bergamesq_Clair/debussy_Ste_Bergamesq_Clair.mid` |
| 1, the Stair | `gymnopedie.txt` | Satie, *Gymnopédie no. 1*, bars 1 to 39 | `SatieE/gymnopedie_1/gymnopedie_1.mid` |
| 2, the Glass Room | `prelude.txt` | Bach, *Prelude in C major*, BWV 846 (the Well-Tempered Clavier, book 1), bars 1 to 16 | `BachJS/BWV846/wtk1-prelude1/wtk1-prelude1.mid` |
| 3, the Clockwork | `gnossienne.txt` | Satie, *Gnossienne no. 1*, bars 1 to 16 (of the engraving's 4/4) | `SatieE/Gnossienne/no_1/no_1.mid` |
| 4, the Lamp Gallery | `chopin.txt` | Chopin, *Prelude in E minor*, Op. 28 no. 4, all 25 bars | `ChopinFF/O28/Chop-28-4/Chop-28-4.mid` |
| 5, the ending | `hjemkomst.txt` | Grieg, *Hjemkomst* (Homecoming), the first 192 rows (a quaver each) | `GriegE/O58/Hjemkomst/Hjemkomst.mid` |

To make the text again: fetch the six files (the paths above, from the collection) into a folder and run
`python3 carts/src/lantern-keeper/scores.py <that folder>`, then `python3 carts/src/lantern-keeper/audio.py carts/src/lantern-keeper/audio.json`.

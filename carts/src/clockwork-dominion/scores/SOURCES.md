# Where the notes of Clockwork Dominion's music come from

Every composer here died more than a century ago, so the compositions are in the public domain. A game that ships them
also has to respect the licence of the file the notes were read from, so each source is recorded here. Seven are
engravings from the **Mutopia Project** (LilyPond typesettings) whose own licence is **Public Domain**, as collected in
the `marmooo/classical-midi-db` repository (its `docs/mutopia/` folder; the licence of each file is in its
`docs/json/mutopia/en.json`). The eighth, the theme of *Ah, vous dirai-je, Maman*, is a traditional French tune of the
1760s, written out by hand in `scores.py`.

`carts/src/clockwork-dominion/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths. It
takes an excerpt of bars, on a grid, dealt out to a tune, a bass and two inner voices, and writes them to the text files
of this folder. The MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/mutopia/` of the collection) | Licence |
|---|---|---|---|---|
| 0, the title and the opening | `theme.txt`, `twinkle.txt` | Mozart, *Ah, vous dirai-je, Maman* (K. 265): the theme (the traditional tune, by hand), then a variation as arranged for two guitars, bars 1 to 16 | `MozartWA/KV265/guitar-duo-complete/guitar-duo-complete-lys/guitar-duo-complete.mid` | Public domain (Mutopia-2018/12/07-2236; Paris: Porro, plate 79) |
| 1, Act I | `soldiers.txt` | Tchaikovsky, *March of the Wooden Soldiers* (Album for the Young, Op. 39 No. 5), bars 1 to 48 | `TchaikovskyPI/O39/05MarchOfTheWoodenSoldiers/05MarchOfTheWoodenSoldiers.mid` | Public domain (Mutopia-2015/01/17-1806; Schirmer, 1904) |
| 2, Paulo's rest | `lullaby.txt` | Brahms, *Wiegenlied* (Op. 49 No. 4), the whole song, twice | `BrahmsJ/LullabyBrahms-C/LullabyBrahms-C.mid` | Public domain (Mutopia-2014/08/05-481; arranged by its typesetter) |
| 3, Act II | `mountain.txt` | Grieg, *In the Hall of the Mountain King* (Peer Gynt, Op. 46), bars 2 to 25 | `GriegE/O46/Dans_l_antre_du_roi_de_la_montagne/Dans_l_antre_du_roi_de_la_montagne.mid` | Public domain (Mutopia-2013/12/07-1888; The University Society, 1918) |
| 4, Act III | `clair.txt` | Debussy, *Clair de lune* (Suite bergamasque), bars 1 to 14 | `DebussyC/L75/debussy_Ste_Bergamesq_Clair/debussy_Ste_Bergamesq_Clair.mid` | Public domain (Mutopia-2010/12/21-1778; E. Fromont, 1905) |
| 5, the Rust | `dwarfs.txt` | Grieg, *Troldtog* (March of the Dwarfs, Lyric Pieces Op. 54 No. 3), bars 2 to 17 | `GriegE/O54/Troldtog/Troldtog.mid` | Public domain (Mutopia-2015/06/14-2014; C.F. Peters, c. 1891) |
| 6, the Dominion ending | `canon.txt` | Bach, *The Art of Fugue* (BWV 1080), Contrapunctus XII, the canon at the octave, bars 1 to 28 | `BachJS/BWV1080/contrapunctusXII/contrapunctusXII.mid` | Public domain (Mutopia-2006/04/28-746; Breitkopf & Härtel, 1885) |
| 7, the Rest ending and the credits | `gymno.txt` | Satie, *Gymnopédie No. 1*, bars 1 to 32 | `SatieE/gymnopedie_1/gymnopedie_1.mid` | Public domain (Mutopia-2014/12/14-37; Dover edition) |

The kickoff's first choices had no public domain file in the collection, and were replaced, with the user's agreement:
Tchaikovsky's *Dance of the Sugar Plum Fairy*, Haydn's "Clock" symphony, Saint-Saëns's *Aquarium* and *Danse macabre*,
and Mussorgsky's *Great Gate of Kiev*.

To make the text again: fetch the eight files (the paths above, from the collection) into a folder, then run:

    python3 carts/src/clockwork-dominion/scores.py <that folder>
    python3 carts/src/clockwork-dominion/audio.py carts/src/clockwork-dominion/audio.json

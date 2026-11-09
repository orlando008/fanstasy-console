# Where the notes of Clockwork Dominion's music come from

Every composer here died more than a century ago, so the compositions are in the public domain. A game that ships them
also has to respect the licence of the file the notes were read from, so each source is recorded here. All are
engravings from the **Mutopia Project** (LilyPond typesettings) whose own licence is **Public Domain**, as collected in
the `marmooo/classical-midi-db` repository (its `docs/mutopia/` folder; the licence of each file is in its
`docs/json/mutopia/en.json`). **Marco's theme** (`marco.txt`, `marco2.txt`) is the game's own: an original waltz for a
music box, written out by hand in `scores.py`.

`carts/src/clockwork-dominion/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths. It
takes an excerpt of bars, on a grid, dealt out to a tune, a bass and two inner voices, and writes them to the text files
of this folder. The MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/mutopia/` of the collection) | Licence |
|---|---|---|---|---|
| 0 (the title), 1, 3, 4, 6, 7 | `marco.txt`, `marco2.txt` | Marco's theme and its variation, the game's own (by hand, in `scores.py`) | — | the game's |
| 1, Act I | `soldiers.txt` | Tchaikovsky, *March of the Wooden Soldiers* (Album for the Young, Op. 39 No. 5), bars 1 to 48 | `TchaikovskyPI/O39/05MarchOfTheWoodenSoldiers/05MarchOfTheWoodenSoldiers.mid` | Public domain (Mutopia-2015/01/17-1806; Schirmer, 1904) |
| 1, Act I | `menuet.txt` | Haydn, Sonata in G (Hob. XVI:27), the Menuet, bars 1 to 42 (the menuet without its trio) | `HaydnFJ/HOB-XVI-27/hob-xvi-27-ii-menuet-trio/hob-xvi-27-ii-menuet-trio.mid` | Public domain (Mutopia-2013/07/07-186; C. F. Peters, 1880s) |
| 2, Paulo's rest | `lullaby.txt` | Brahms, *Wiegenlied* (Op. 49 No. 4), the whole song, twice | `BrahmsJ/LullabyBrahms-C/LullabyBrahms-C.mid` | Public domain (Mutopia-2014/08/05-481; arranged by its typesetter) |
| 3, Act II | `mountain.txt` | Grieg, *In the Hall of the Mountain King* (Peer Gynt, Op. 46), bars 2 to 25 | `GriegE/O46/Dans_l_antre_du_roi_de_la_montagne/Dans_l_antre_du_roi_de_la_montagne.mid` | Public domain (Mutopia-2013/12/07-1888; The University Society, 1918) |
| 3, Act II | `troldhaugen.txt` | Grieg, *Wedding Day at Troldhaugen* (Lyric Pieces, Op. 65 No. 6), bars 1 to 20 | `GriegE/O65/troldhaugen/troldhaugen.mid` | Public domain (Mutopia-2006/06/17-781; Schirmer, 1903) |
| 4, Act III | `clair.txt` | Debussy, *Clair de lune* (Suite bergamasque), bars 1 to 28 | `DebussyC/L75/debussy_Ste_Bergamesq_Clair/debussy_Ste_Bergamesq_Clair.mid` | Public domain (Mutopia-2010/12/21-1778; E. Fromont, 1905) |
| 4, Act III | `arabesque.txt` | Debussy, *Première Arabesque* (L. 66 No. 1), bars 1 to 26 | `DebussyC/L66/debussy_Arabesque_1/debussy_Arabesque_1.mid` | Public domain (Mutopia-2011/10/25-1777; Durand et Fils, 1904) |
| 5, the Rust | `dwarfs.txt` | Grieg, *Troldtog* (March of the Dwarfs, Lyric Pieces Op. 54 No. 3), bars 2 to 29 (to the return of its tune) | `GriegE/O54/Troldtog/Troldtog.mid` | Public domain (Mutopia-2015/06/14-2014; C.F. Peters, c. 1891) |
| 6, the Dominion ending | `canon.txt` | Bach, *The Art of Fugue* (BWV 1080), Contrapunctus XII, the canon at the octave, bars 1 to 28 | `BachJS/BWV1080/contrapunctusXII/contrapunctusXII.mid` | Public domain (Mutopia-2006/04/28-746; Breitkopf & Härtel, 1885) |
| 7, the Rest ending and the credits | `gymno.txt` | Satie, *Gymnopédie No. 1*, bars 1 to 32 | `SatieE/gymnopedie_1/gymnopedie_1.mid` | Public domain (Mutopia-2014/12/14-37; Dover edition) |

The kickoff's first choices had no public domain file in the collection, and were replaced, with the user's agreement:
Tchaikovsky's *Dance of the Sugar Plum Fairy*, Haydn's "Clock" symphony, Saint-Saëns's *Aquarium* and *Danse macabre*,
and Mussorgsky's *Great Gate of Kiev*. After the release, a game magazine's notes found the pieces very familiar and
Marco without a theme of his own: Marco's theme replaced *Ah, vous dirai-je, Maman* (Mozart's variations, as arranged
for two guitars) on the title, and the Haydn, the *Wedding Day* and the *Arabesque* (the user's choice) joined the acts.

To make the text again: fetch the ten files (the paths above, from the collection) into a folder, then run:

    python3 carts/src/clockwork-dominion/scores.py <that folder>
    python3 carts/src/clockwork-dominion/audio.py carts/src/clockwork-dominion/audio.json

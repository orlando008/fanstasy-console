# Where the notes of Wick's music come from

Bach died in 1750 and Scarlatti in 1757, so the compositions are in the public domain. A game that ships them also has
to respect the licence of the file the notes were read from, so each source is recorded here. All are engravings from
the **Mutopia Project** (LilyPond typesettings) whose own licence is **Public Domain**, as collected in the
`marmooo/classical-midi-db` repository (its `docs/mutopia/` folder; the licence of each file is in its
`docs/json/mutopia/en.json`).

`carts/src/wick/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths. It takes an
excerpt of bars, on a grid, dealt out to a tune, a bass and two inner voices, and writes them to the text files of this
folder. The MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/mutopia/` of the collection) | Licence |
|---|---|---|---|---|
| 0, the title and the map | `toccata.txt`, `toccata2.txt` | Bach, *Toccata and Fugue in D minor* (BWV 565): the Toccata, bars 1 to 3, then bars 4 to 10 | `BachJS/BWV565/ToccataFugue/ToccataFugue.mid` | Public domain (Mutopia-2011/09/11-1780; Bach-Gesellschaft Ausgabe, 1867) |
| 1, the Dungeon (and the Chimney) | `invention4.txt` | Bach, *Invention No. 4 in D minor* (BWV 775), the whole piece | `BachJS/BWV775/bach-invention-04/bach-invention-04.mid` | Public domain (Mutopia-2008/06/15-67; Bach-Gesellschaft) |
| 1, the Dungeon (and the Chimney) | `invention13.txt` | Bach, *Invention No. 13 in A minor* (BWV 784), the whole piece | `BachJS/BWV784/bach-invention-13/bach-invention-13.mid` | Public domain (Mutopia-2008/06/15-59; Bach-Gesellschaft) |
| 2, the Laboratory | `k11.txt` | Scarlatti, *Sonata in C minor* K. 11 (Essercizi per Gravicembalo, XI), its first half: bars 1 to 15 | `ScarlattiD/K11/sonatensatz/sonatensatz.mid` | Public domain (Mutopia-2013/01/08-141; P.J. Tonger Musik Verlag) |
| 2, the Laboratory | `prelude6.txt` | Bach, *Prelude No. 6 in D minor* (The Well-Tempered Clavier I, BWV 851), bars 1 to 8 | `BachJS/BWV851/bwv851a/bwv851a.mid` | Public domain (Mutopia-2006/07/02-538; Breitkopf & Härtel, 1866) |
| 3, the Clock Tower | `prelude2.txt` | Bach, *Prelude No. 2 in C minor* (The Well-Tempered Clavier I, BWV 847), bars 1 to 24 (to before its Presto) | `BachJS/BWV847/bwv847a/bwv847a.mid` | Public domain (Mutopia-2006/07/02-550; Breitkopf & Härtel, 1866) |
| 4, the Rooftops | `fantasia.txt` | Bach, *Fantasia and Fugue in G minor* (BWV 542): the Fantasia, bars 1 to 10 | `BachJS/BWV542/bwv542/bwv542.mid` | Public domain (Mutopia-2007/05/20-984; C. F. Peters) |
| 5, the chase rooms | `fugue.txt` | Bach, *Toccata and Fugue in D minor* (BWV 565): the Fugue, its first 24 bars (from the middle of bar 30) | `BachJS/BWV565/ToccataFugue/ToccataFugue.mid` | Public domain (as song 0) |
| 6, the ending | `prelude1.txt` | Bach, *Prelude No. 1 in C major* (The Well-Tempered Clavier I, BWV 846), the whole piece | `BachJS/BWV846/wtk1-prelude1/wtk1-prelude1.mid` | Public domain (Mutopia-2011/09/12-5) |

The kickoff's first choices that had no public domain file in the collection were replaced, with the user's agreement
(2026-11-11): Scarlatti's Sonatas K. 141 and K. 1 (by K. 11 and Bach's Prelude in D minor), Handel's *Harmonious
Blacksmith* (the Clock Tower keeps Bach's Prelude in C minor alone), Vivaldi's *Summer* storm (by the Fantasia in G
minor) and Bach's "Little" Fugue in G minor (by the Fugue in D minor that follows the title's Toccata).

To make the text again: fetch the eight files (the paths above, from the collection) into a folder, then run:

    python3 carts/src/wick/scores.py <that folder>
    python3 carts/src/wick/audio.py carts/src/wick/audio.json

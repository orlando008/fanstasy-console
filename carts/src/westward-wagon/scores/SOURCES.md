# Where the notes of Westward Wagon's music come from

Every tune here was written or first printed before 1870, so the compositions are in the public domain. A game that ships them
also has to respect the licence of the file the notes were read from, so each source is recorded here. All are engravings from
the **Mutopia Project** (LilyPond typesettings, <https://www.mutopiaproject.org/>), each released by its typesetter into the
**Public Domain**.

`carts/src/westward-wagon/scores.py` reads each MIDI file (with `midi.py`) and keeps only the notes' pitches, starts and lengths:
an excerpt of bars on a grid, dealt out to a tune, a bass and two inner voices, written to the text files of this folder. The
MIDI files are not in the repository. The drone under Amazing Grace (the engraving is the tune alone) is the game's own.

| Songs | Text file | Piece | Source (on the Mutopia Project's server, `ftp/`) |
|---|---|---|---|
| 0 (the title), 1 (the prairie) | `joy.txt` | *Soldier's Joy*, traditional fiddle tune, the whole tune (18 bars) | `Traditional/soldiers-joy/soldiers-joy.mid` |
| 1 (the prairie) | `air.txt` | G. F. Root, *There's Music in the Air* (1857), the tune and its accompaniment, bars 9 to 24 | `RootGF/musicinair/musicinair.mid` |
| 2 (the bluffs) | `oldfolks.txt` | S. C. Foster, *The Old Folks at Home* (1851), arranged for guitar by W. L. Hayden (1881), the whole piece (24 bars) | `FosterSC/oldfolks/oldfolks.mid` |
| 3 (the mountains), 6 (a grave) | `grace.txt` | *Amazing Grace* (the tune *New Britain*, 1835), engraved for the bagpipes, 16 bars, the grace notes left out | `Traditional/amazing-mutopia/amazing-mutopia.mid` |
| 4 (the desert) | `hanson.txt` | R. Lowry, *Hanson Place* (1864), hymn tune for four voices, 16 bars | `LowryR/hanson_place/hanson_place.mid` |
| 5 (the forests) | `slumber.txt` | S. C. Foster, *Slumber My Darling* (1862), for voice and piano, the whole song (36 bars) | `FosterSC/slumber/slumber.mid` |
| 7 (the arrival) | `home.txt` | H. R. Bishop, *Home! Sweet Home!* (1823), for voice and piano, 24 bars | `BishopHR/homeshome/homeshome.mid` |

The spec's first choices (*Oh! Susanna*, *Camptown Races*, *Buffalo Gals*, *Old Dan Tucker*, *Shenandoah*, *Sweet Betsy from
Pike*) had no public domain engraving that could be fetched: Mutopia has none of them, and the public domain MIDI files of the first
two on Wikimedia Commons could not be downloaded (the server refused this machine's requests). They can be added the same way
later, from a public domain file.

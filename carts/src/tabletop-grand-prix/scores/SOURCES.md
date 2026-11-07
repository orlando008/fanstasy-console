# Where the notes of Tabletop Grand Prix's music come from

The compositions are in the public domain: Lumbye died in 1874, Suppé in 1895, Bellak in 1891, Grieg in 1907 and Elgar in
1934. A game that ships them also has to respect the licence of the file the notes were read from, so each source is
recorded here. All five files are public domain or CC0 1.0, as collected in the `marmooo/classical-midi-db` repository
(its `docs/` folder; the licence of each of its collections is in its `docs/collections.json`).

`carts/src/tabletop-grand-prix/scores.py` reads each MIDI file and keeps only the notes' pitches, starts and lengths. It
takes an excerpt of bars, on a grid of sixteenths, dealt out to a tune, a bass and two inner voices, and writes them to
the text files of this folder. The MIDI files are not in the repository.

| Song | Text file | Piece | Source (in `docs/` of the collection) | Licence |
|---|---|---|---|---|
| 0, the title | `champagne.txt` | Lumbye, *Champagne Galop*, Op. 14, bars 5 to 36 (a brass arrangement by Adams) | `imslp-midi-cc0-1.0/PMLP579773-Lumbye_Champagne_Galop_Brass_arrangement_Adams.mid` | CC0 1.0 |
| 1, the menus | `poet.txt` | Suppé, *Poet and Peasant* (Dichter und Bauer) overture, the opening, bars 1 to 16 (a low brass quintet arrangement by Adams) | `imslp-midi-cc0-1.0/PMLP36358-Suppe-Fv-Ouverture_zu_Dichter-und-Bauer_low_brass_quintet_Adams.mid` | CC0 1.0 |
| 2, the Breakfast races | `musket.txt` | Bellak, *Musket Galop*, Op. 176, bars 1 to 32 | `imslp-midi-cc0-1.0/PMLP490166-Musket_Galop.mid` | CC0 1.0 |
| 3, the Workshop races | `mountain.txt` | Grieg, *In the Hall of the Mountain King* (Peer Gynt Suite No. 1, Op. 46 No. 4), bars 2 to 17 (the composer's piano version) | `mutopia/GriegE/O46/Dans_l_antre_du_roi_de_la_montagne/Dans_l_antre_du_roi_de_la_montagne.mid` | Public domain (Mutopia) |
| 4, the results and the podium | `pomp.txt` | Elgar, *Pomp and Circumstance* March No. 1, the trio's tune, 40 bars | `PublicDomainSongAnthology/POMP AND CIRCUMSTANCE.mid` | CC0 1.0 |

To make the text again: fetch the five files (the paths above, from the collection) into a folder, then run:

    python3 carts/src/tabletop-grand-prix/scores.py <that folder>
    python3 carts/src/tabletop-grand-prix/audio.py carts/src/tabletop-grand-prix/audio.json

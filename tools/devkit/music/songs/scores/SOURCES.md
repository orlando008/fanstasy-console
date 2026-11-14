# Where the notes of the toolkit's classics come from

Every composer here died more than a century ago, so the compositions are in the public domain. A game that ships them
also has to respect the licence of the file the notes were read from, so each source is recorded here. All are
engravings from the **Mutopia Project** (LilyPond typesettings), as collected in
the `marmooo/classical-midi-db` repository (its mutopia folder; the licence of each file is in the collection's index of
Mutopia files, json/mutopia/en.json). `../import_scores.py` reads each file and keeps only the notes' pitches, starts and
lengths, as an excerpt on a grid. Four of the files are **Public Domain**; the Canon's is **CC BY 4.0**, which
allows any use with credit: a game that ships it credits the engraving to Michael Fischer v. Mollard (Mutopia Project). The MIDI files are not in the repository. **Rush D** (`../rush_d.py`) is the
toolkit's own, an original piece written in code.

| Song (`classics.py`) | Text file | Piece | Source (in the collection's mutopia folder) | Licence |
|---|---|---|---|---|
| 0 | `alla_turca.txt` | Mozart, Piano Sonata No. 11 (K. 331), *Rondo alla Turca*, bars 1 to 32 | `MozartWA/KV331/KV331_3_RondoAllaTurca/KV331_3_RondoAllaTurca-lys/KV331_3_RondoAllaTurca.mid` | Public domain (Mutopia-2015/08/13-108; from IMSLP) |
| 1 | `entertainer.txt` | Joplin, *The Entertainer* (1902), bars 1 to 36 | `JoplinS/entertainer/entertainer.mid` | Public domain (Mutopia-2016/11/25-263; the original edition, 1902) |
| 2 | `toccata.txt` | Bach, *Toccata and Fugue in D minor* (BWV 565), bars 1 to 16 | `BachJS/BWV565/ToccataFugue/ToccataFugue.mid` | Public domain (Mutopia-2011/09/11-1780; Bach-Gesellschaft Ausgabe, 1867) |
| 3 | `minute_waltz.txt` | Chopin, Waltz in D-flat (Op. 64 No. 1, the "Minute Waltz"), bars 1 to 36 | `ChopinFF/O64/chopin_valse_op64_no1/chopin_valse_op64_no1-lys/chopin_valse_op64_no1.m2.mid` | Public domain (Mutopia-2015/01/17-483; Edition Peters) |
| 4 | `canon.txt` | Pachelbel, *Canon per 3 Violini e Basso* (the Canon in D), bars 1 to 24 | `PachelbelJ/Canon_per_3_Violini_e_Basso/Canon_per_3_Violini_e_Basso-lys/canon_per_3_violini_e_basso.mid` (tracks 1 to 4; 5 to 8 repeat them) | **CC BY 4.0**: credit Michael Fischer v. Mollard, Mutopia Project (Mutopia-2015/09/02-2047; from IMSLP) |

# Bit’s Console Quest

**Version:** 1.0

**Status:** Released (step 9 of 9): in the Library, on the Arcade shelf, and as the PNG cart `carts/bits-console-quest.nova.png`. Not yet merged: the art of step 7 waits for the user's look, and first-clear pacing for a playtest in the preview. The user approved the softened zone songs (2026-11-18).

**Shelf and players:** Arcade, one player

**Cart source:** [Source](../../carts/src/bits-console-quest/) · [Packed cart](../../carts/bits-console-quest.nova)

## 1. Concept

Bit is a little robot who loves the NOVA-16. He explores four colorful, side-scrolling worlds built around its hardware and brings his favorite finds back to his lab. His cable tail plugs into sockets to wake up gadgets, move platforms, and make new routes. The main path gives players time to look around and room to recover. The harder jumps and switch puzzles hide treasures and puzzle pieces.

Use the supplied Bit sprite sheet for his cream shell, dark faceplate, cyan eyes and soles, purple cartridge backpack, and cable tail. The supplied console and wired controller set the look of the lab’s hardware. The lab is purple and cyan. Each world gets its own palette, silhouettes, and mechanical theme.

## 2. Core loop

1. Start in the lab and use its console to select an unlocked stage.
2. Run and jump through the stage. Plug into marked sockets to power devices and follow side paths to collectibles.
3. Reach the exit terminal to clear the stage. Continue to the second stage of the zone or return to the lab. Clearing the second stage unlocks the next zone and returns Bit to the lab.
4. Visit the display case and puzzle wall to see what Bit brought home. Return to a cleared stage at any time to pick up missing items.
5. Clear all eight stages to power up the lab’s NOVA-16 and see the ending. The lab and all eight stages stay open afterward.

## 3. Controls

| Input | Action |
|---|---|
| LEFT / RIGHT | Move Bit |
| D-pad in menus | Move the selection |
| A | Jump. Hold for more height. Confirm in menus. |
| B | Plug the cable tail into the highlighted socket. Back out of menus. |
| START | Pause. Resume, restart the current stage or practice course, or return to the lab. In the lab, resume or return to title. |

Stage selection, displays, the puzzle wall, and the practice entrance use B at lab sockets. The platformer and lab use the console’s normal keyboard, gamepad, and touch controls.

## 4. Screen layout

| Area | Contents |
|---|---|
| Top 16 px | Compact HUD with stage number, treasure status, and collected puzzle pieces for the current stage |
| Below the HUD | Side-scrolling playfield with Bit, platforms, devices, collectibles, and the in-world B prompt |
| Lab | A walkable workshop with the console, display shelves, puzzle wall, and a door to the practice course |
| Menus | Small overlay panels in the title, stage selector, pause, stage clear, and ending screens |

Use a 256 × 224 viewport. Follow Bit along the horizontal axis with a 64 px dead zone centered on the screen, clamped to stage bounds. Keep the camera still at the safe approach to a timed obstacle whenever possible so the player can watch its warning.

## 5. The rules

These are the first tuning values for the test course. Speeds are in pixels per frame at 60 frames per second.

| Rule | Initial value |
|---|---|
| Bit’s collision body | 14 × 22 px under a 32 × 32 sprite |
| Run speed | 2.25 top speed, 0.35 ground acceleration, 0.22 air acceleration, 0.45 ground braking |
| Jump | Initial vertical velocity −4.7. Apply gravity of 0.22 while rising with A held, 0.30 otherwise. Cap fall speed at 5.5. |
| Forgiveness | 6 frames of coyote time and 6 frames of jump buffering |
| Main-route jumps | Start with mandatory gaps of at most 48 px and rises of at most 28 px. Validate combined gaps and rises through the actual movement code. |
| Socket reach | Up to 20 px horizontally and 12 px vertically from the body center, with a clear path to the socket. Highlight the nearest eligible socket. |
| Plug action | One activation per B press. A one-shot socket stays powered for that attempt. A switch socket toggles its marked device. |
| Checkpoints | Start and one midpoint per stage. Touch the midpoint to capture the state of required devices and set the respawn point. |
| Hazard recovery | Return to the latest checkpoint after 24 frames. Restore local devices to checkpoint state and restart timed hazards from their checkpoint phase. A one-shot socket comes back unplugged, with its devices as the stage began, so a checkpoint can never keep a shelf or lift that has already left. |
| Collectibles | 1 treasure and 2 puzzle pieces per stage. Pickups save on contact and disappear from replays. |

Bit has unlimited attempts. To keep checkpoints safe and prevent a locked route, each checkpoint includes a stable landing and a verified route to the exit from its saved device state. Every timed main-route obstacle has a place to wait. Practice uses the same controls and device types, with a flat landing under its first exercise and a reset point at each exercise.

## 6. Levels or content

Each stage targets 2–4 minutes on a first clear. The first stage of each zone introduces a device. The second uses it in a longer sequence. Stage and treasure names below are working names.

| Zone | Palette | Stage 1 | Stage 2 |
|---|---|---|---|
| 1. Controller Foundry | Coral, gold, charcoal | **Button Assembly.** Power spring buttons that launch Bit across the assembly line. Treasure: Prototype D-pad. | **Cable Works.** Link spring buttons with a socket-powered lift. Treasure: Braided Controller Cable. |
| 2. Cartridge Caverns | Violet, copper, teal | **Contact Mine.** Extend cartridge shelves to cross bays of exposed contacts. Treasure: Clear-Shell Cart. | **Slot Elevator.** Switch shelf positions at a moving cartridge rack. Treasure: Gold Contact Board. |
| 3. Circuit Gardens | Mint, green, citrus | **Trace Trail.** Route current along marked circuit traces to raise bridges. Treasure: Ceramic Logic Chip. | **Relay Grove.** Choose which of two marked branches to power and switch between them. Treasure: Relay Module. |
| 4. CRT Skyline | Indigo, orange, phosphor cyan | **Phosphor Rooftops.** Power scanline platforms and cross them in their visible safe phase. Treasure: Phosphor Swatch. | **Picture Lock.** Synchronize lifts and scanline platforms, then close the last relay. Treasure: CRT Tuning Dial. |

Each stage puts one puzzle piece near a route the player can see from the main path and the other behind a tougher optional jump or socket puzzle. Each zone’s four pieces reveal one illustrated hardware cutaway on the lab wall. Treasures fill eight display slots as soon as Bit returns.

The **practice course** is available from the first lab visit. Its three short stations teach a held jump, a socket next to a safe landing, and a moving lift. Bit can leave through the exit or the pause menu.

## 7. Opponents or hazards

| Hazard | Behaviour |
|---|---|
| Gaps | Falling below the stage returns Bit to his checkpoint. Early gaps use visible lower landings before the first checkpoint. |
| Button-assembly presses | A press telegraphs with a flashing outline for at least 24 frames. A safe ledge sits beside each mandatory crossing. |
| Live contacts | Marked contact pads flash for at least 24 frames before electrifying. Contact while live returns Bit to his checkpoint. |
| Lifts and shelves | Carry Bit if he is standing on them. Side contact is forgiving. All paths have safe endpoints. |
| Scanline platforms | Default 120-frame cycle: 72 solid, 24 warning while still solid, 24 off. A socket starts the cycle from its solid phase. |

Stage layout and machine timing carry the challenge. Hazards use a distinct silhouette and a visible warning so their state also reads with sound muted.

## 8. Modes

- **Campaign.** Eight stages, one unlocked path through the zones, and replay of cleared stages.
- **Lab practice.** Repeatable exercises for jumps and sockets.

## 9. Scoring

Progress is measured by **8 stages cleared**, **8 treasures found**, **16 puzzle pieces found**, and **4 lab puzzles completed**. Adventure completion is all eight stage clears. Collection completion is all eight treasures and all sixteen pieces.

## 10. Screens and flow

| Screen | Flow |
|---|---|
| Title | A enters the lab and resumes the saved campaign, or starts one on a fresh save. B is a shortcut to practice. |
| Lab | Walk to the console, display case, puzzle wall, or practice door and press B. |
| Stage selector | Shows the unlocked stages and the collectibles found in each. A enters the selected stage. |
| Stage | The exit terminal opens the clear card. START opens pause. |
| Stage clear | A advances within a zone or returns to the lab after a zone finale. Left replays the stage and B returns to the lab. |
| Practice | Work through the three stations. Finish or return to the lab from pause. |
| Ending | After all eight clears, press B beside the console to boot it. A acknowledges the result and returns to the open lab. |

## 11. Audio

Use the new sound chip. Write original chiptunes for the title and four zones, with one track shared by the two stages in each zone. The lab and practice course use the song library’s arrangement of Scott Joplin’s *The Entertainer*. Keep the arrangement’s source credit with the cart using the repository’s [song source list](../../tools/devkit/music/songs/scores/SOURCES.md). A respawn leaves the stage music running.

Short cues cover menu move, confirm, jump, plug, device power, checkpoint, treasure, puzzle piece, respawn, and stage clear. Route effects through channels 6 and 7 for the original tracks. Reserve 7 for lab effects if the library arrangement uses 6. Measure loudness and effect levels during the audio pass.

## 12. Video layers

| Layer | Use |
|---|---|
| BG2 | Distant parallax shapes such as circuit traces, casing ribs, or a CRT glow |
| BG1 | Scrolling stage tiles and solid terrain, or the lab’s shelves and console wall |
| BG0 | Selected foreground trim and lit cables. Keep Bit and hazard warnings visible. |
| Sprites | Bit, sockets, moving devices, collectibles, and short effects |
| Overlay | HUD, prompts, menu panels, and clear cards |

Draw Bit at native console resolution from the supplied reference and proof idle, run, jump, plug, landing, and celebration poses. Use the supplied hardware designs for the lab console, controller, and related exhibit shapes. The first art proof includes Bit, the lab and Controller Foundry palettes, and a real Foundry screen. Regenerate tiles, palettes, and sprite metadata from the cart’s art script.

## 13. Persistence (save slots)

| Slot | Contents |
|---|---|
| 0 | Format version. The campaign gets a new version when it replaces the starter’s high-score format. |
| 1 | Stage clears, bits 0–7 |
| 2 | Treasures, bits 0–7 |
| 3 | Puzzle pieces, bits 0–15, two consecutive bits per stage |
| 4 | Last stage entered, 0–7 |
| 5 | Ending seen, 0 or 1 |
| 6–255 | Reserved |

Use stable stage and item IDs. Derive unlocked stages and complete lab puzzles from the masks. Save clear and collection bits on the frame that grants them. Resuming from title enters the lab. Checkpoint state lives in the current stage attempt.

## 14. Asset budget

| Asset | Campaign target |
|---|---|
| Code | Up to 48 KiB planned of the 64 KiB limit; 52.7 KB (80%) after step 7. Keep stage layouts in ROM, or set `strip` in `meta.json`, if the audio and balance work needs room. |
| ROM | Up to 32 KiB planned of the 128 KiB limit for stage data and exhibit assets |
| Tiles | Up to 900 of 1,024, with shared device tiles and reusable background tiles. After step 7: 831 used (BG 213 of 255, sprites 320 of 384, zone backdrops 311 of 384). |
| Sprites | Up to 48 in a frame and 24 on a line, below the 128 / 32 limits |
| Songs / SFX | 6 songs, up to 48 patterns, about 10 effects. After step 8: 6 songs, 21 patterns, 13 effects, 18 KB of the 32 KB sample RAM. |
| PNG cart | Check the 147,443-byte payload limit as the backgrounds and audio land. |

## 15. Implementation plan

**Scaffold results.** The repository verifier regenerated the art and audio, repacked the cart, and passed 39 starter checks and a 3,000-frame soak. The starter bot completed six runs. Browser smoke is pending because Chromium could not start in the workspace. The initials screen, high scores, and starter art and audio belong to the placeholder.

1. **Vertical slice.** Replace the starter minigame with a short Controller Foundry course. Implement scrolling, jumping, one powered lift, a checkpoint, one pickup, and a reachable exit. Exercise all of them with recorded inputs.
   - **Built:** A 768 px course with gaps of 40, 32, 40, and 40 px, a checkpoint at x = 304, and a treasure on an optional ledge 32 px above the upper deck. Bit plugs into the lift on board. The powered lift travels at 1 px per frame between y = 192 and y = 112, waits 60 frames at the top and 45 at the bottom, and cycles so Bit can catch it again. Plug into the exit to clear the course. Save version 2 uses the first stage and treasure bits. The prototype uses the robot’s reference colors and silhouette as a starting point for the art proof, with two starter tracks and gameplay cues.
   - **Results:** 47 checks, a 3,000-frame soak, and four runs apiece of the recorded exit and treasure routes. All runs cleared without a fall. The production console worker rendered the treasure route under Node and emitted both save bits. Reviewed seven rendered screens. The browser smoke test is pending because the workspace blocks a socket Chromium needs to start. The packed code is about 15 KB, with 203 source tiles used and at most four sprites queued by the scene.
2. **Art proof.** Draw Bit’s gameplay poses from the supplied sheet, make the purple-and-cyan lab and Foundry palettes, and render a real Foundry screen. Review the proof before drawing the remaining zones.
   - **Built:** Eleven 32 × 32 frames for Bit, including idle and blink, four running frames, jump, fall, plug, land, and cheer. Kept the cream shell, cyan soles and eyes, purple cartridge backpack, and two-pin cable from the reference. Added controller moulds to the Foundry’s distant layer and a short spark when Bit powers the lift. The lab study uses a dark casing, purple trim, and cyan ports from the supplied NOVA-16 image.
   - **Results:** The proof shows the sprites at native and 4× size with both palettes and the live upper-deck frame. All 50 checks and eight recorded routes pass. The production worker rendered the treasure route with matching output. The art diagnostic flags overlay edges and a socket covered by the pause panel. The browser smoke test still cannot start in this workspace.
   - **Review:** The first playable Foundry look was well received. The updated character frames and lab palette were approved.
3. **Core mechanics.** Add the full socket and device behaviors, collectible bookkeeping, and practice stations. Test repeated B presses, checkpoint restores, and revisiting a collected item.
   - **Built:** The same course runner handles Foundry and practice. Sockets check reach and line of sight, choose the closest eligible target, and react to a fresh B press. Foundry adds a spring launch at −6.2 px per frame and two independently saved puzzle pieces. The existing clear and treasure bits retain their save format.
   - **Practice:** The 800 px wing starts with a 48 px held-jump ledge over a safe floor. Next, a relay switches power from a shelf that slides 40 px at 1 px per frame to a 128 px bridge. A final lift rises 80 px, then Bit plugs into the exit. The two beacons snapshot devices and switches for recovery after a fall. Practice has its own purple-and-cyan scenery and plays Scott Joplin’s *The Entertainer*, with effects on channel 7.
   - **Results:** 78 checks and a 3,000-frame soak passed. Four runs each of the Foundry exit route, Foundry collection route, and practice route cleared without a fall. The production worker rendered both modes with their expected save data. All three songs meet the loudness limits. Reviewed 13 rendered screens. Chromium still cannot start the browser smoke test in this workspace.
4. **Hazards.** Implement warned presses, live contacts, and timed platforms. Verify they remain readable and reset consistently.
   - **Built:** Extended the Foundry test course to 1,152 px with a second beacon before the new hazards. The socket-powered scanline bridge spans 128 px and cycles through 72 steady frames, 24 flashing gold walkable frames, and 24 off frames. The contacts use a 120-frame cycle with 24 warning frames and 30 live frames. The press uses 28 warning frames, then 10 to descend, 22 down, and 12 to retract. Its moving head is the hitbox. There is a safe waiting area on each approach.
   - **Recovery:** Pause freezes hazard and device timing. A fall or hit restores the latest beacon’s device state and hazard clock after 24 frames. The pre-bridge beacon starts the retry on solid ground with the bridge unpowered. Save version 2 and existing collectibles carry forward.
   - **Results:** 97 checks and a 3,000-frame soak passed. Twelve recorded runs cleared Foundry or practice without a reboot. The production console worker rendered both modes with expected save data. Reviewed the scanline warning, press warning and descent, and live contacts at console resolution. The browser smoke test still cannot start in this workspace.
5. **Stage content.** Build and clear all eight stages. Record a route to every exit and collectible.
   - **Built:** Two playable stages per zone, 1,152–1,568 px wide. Cable Works combines a spring climb and a lift. Contact Mine carries Bit over a gap on a sliding cartridge shelf, and Slot Elevator has two lift rides. Trace Trail opens two bridges, while Relay Grove routes power between a spring cache and a bridge. Phosphor Rooftops links two timed spans. Picture Lock combines lift, spring, scanline, and hazard timing. Each zone has its own backdrop and deck colors. Foundry and the other zones share the current stage music for this pass.
   - **Progress:** Clearing a stage unlocks the next and immediately saves its clear bit. Eight treasure bits and sixteen piece bits are independent of stage clears. Existing version 2 saves retain Foundry progress. The title stage selector and last-played slot provide access while the lab hub is in development.
   - **Results:** 134 checks, a 3,000-frame soak, and 40 route runs passed. A fresh-save replay in the production console worker cleared all eight stages and saved all 24 collectibles over 5,714 frames. Recorded perfect routes take roughly 10–16 seconds per stage. First-clear pacing still needs human playtesting. The browser smoke test could not start in this workspace.
6. **Lab and campaign flow.** Implement stage selection, clear cards, exhibits, puzzle cutaways, replay, and save and resume. Verify that the ending and completed campaign reopen correctly.
   - **Built:** A 640 px walkable lab with four B-button stations. The NOVA-16 console lists all eight stages with unlock and item status. The cabinet shows eight hardware treasures. The puzzle wall maps each zone’s four saved piece bits to the four quadrants of its cutaway. The practice door and title shortcut open the same practice course. The lab and practice share Scott Joplin’s *The Entertainer*.
   - **Flow and saves:** The first clear in a zone offers the second stage. Zone finales return to the lab and highlight the next available stage. Exit and pause also return to the lab. After all eight clears, the console boots even if collectibles are still missing. Acknowledging the ending records slot 5 in the existing save format and the console resumes stage selection. Older clear and collection bits stay intact.
   - **Results:** 161 checks, a 3,000-frame soak, and 40 recorded runs passed. Walk-to-station input tests cover the console, exhibits, practice door, and pause. The production console worker played through all eight stages and the ending in 5,856 frames and persisted all clear, collection, and ending bits. Reviewed all lab screens. Chromium still cannot start the browser smoke test in this workspace.
   - **Review fixes (2026-11-18):** A beacon touched after a one-shot socket was plugged saved that device mid-move. In Contact Mine, jumping over the first beacon, plugging in on the shelf and jumping back made every reboot bring the shelf back already leaving, out of reach across the gap, until Restart Stage. One-shot sockets now come back unplugged, with their devices as the stage began (`04-devices-and-practice` plays that case). The B POWER prompt now follows the socket's device, so the scanline sockets in Phosphor Rooftops and Picture Lock say POWER as Foundry's does. Foundry and practice are built with the same stage helpers as the other stages. Exhibits are drawn as runs of one colour worked out once per picture (2,096 calls in place of 5,678 pixels across the exhibits and the console picture, and no sget a frame), with identical pictures on all 32 gallery screens. The browser smoke test runs: no errors at 60 fps.
7. **Remaining art.** Draw the zones, lab furnishings, treasures, cutaways, and ending. Review screenshots of each stage and screen.
   - **Found at the start of the step:** the lab, its furnishings, the eight treasures, the four cutaways, the ending and a backdrop for each zone were already drawn in steps 5 and 6. Every zone's ground used Foundry's two tiles in other colours, and the exit was a bare socket.
   - **Built:** Each zone has its own terrain set (`terrain()` in `art.py`): a top, an end cap (flipped for the right end), two walls that alternate, and a one-way ledge with its end, open beneath on brackets so it reads as something to jump up through. Foundry is a conveyor on riveted plate, the Caverns cut rock with a copper rail and contact pins, the Gardens a circuit board with traces and solder pads, and the Skyline rooftop coping over panelled walls with lit windows. Practice and the lab use Foundry's set in their own colours. The exit is a terminal with an arrow on its screen, with its socket in the front panel. The Skyline backdrop has a lower band of distant rooftops with dim windows and antenna masts. The scenery and deck colours follow the zone table: copper and teal in the Caverns; orange and phosphor cyan on the Skyline. Signs, the stage banner and the B prompts have a trim border. The sprite region moved to tiles 256–639 and the backdrops to 640–1023, to make room.
   - **Results:** `verify.js` and all 165 checks pass; the smoke test runs with no errors at 60 fps. The gallery lists 35 screens (three new: the far end of Contact Mine, Trace Trail and Picture Lock, with the terminal); all were looked over. The art review's warnings went from 23 to 22: the Skyline is no longer a flat picture. The rest are menus and cards that cover the world on purpose, and dark panels on dark scenes.
8. **Audio.** Compose and test the chiptune tracks and effects. Add *The Entertainer* for the lab and practice course. Verify cues and check levels on the new chip.
   - **Built:** Each zone has its own song (`SONG.zones`). Song 0, the title, is A minor with a soft horn. Song 1, Foundry, is C major with a flute (both from step 1). Song 2, the Caverns, is D minor and slow, with electric piano over marimba and strings in a long cave echo. Song 3, the Gardens, is G major and bouncy, with a flute over marimba. Song 4, the Skyline, is E minor and driving, with a soft square lead over a fast arpeggio. Each new song starts with four bars without the lead, and the last bar has a drum fill before it loops. Song 5 is the song library's *The Entertainer* for the lab and practice. New effects: a treasure fanfare (4), the puzzle piece's blip (5), device power when a socket powers something (10), a boot chirp on respawn (11), and a spring launch (12) in place of the jump sound.
   - **Results:** `loud.mjs --check` passes all six songs. The new leads are 0.026–0.035 RMS (0.52–0.61 of the mix), pierce at most 0.009, and the leads enter at most 1.32x. `clash.py` finds no clash in the game's own songs; the library arrangement has 8, which are its own. Effects measure 0.007–0.063 RMS on channels 6 and 7. A test checks that each of the eight stages plays its zone's song; the effects test now covers power, treasure and piece; all 173 checks pass. The smoke test runs with no errors at 60 fps.
   - **The user's note on the three zone songs (2026-11-18):** "long sustained notes that are shrill sounding and slightly too loud relative to the parts underneath that are quicker and quieter". Rendering each channel alone showed which parts those were. In the Caverns and Gardens it was the strings pad (two channels holding the chord's third and fifth in octave 4, each as loud as the marimba or louder, and brighter), and the Gardens flute lead. In the Skyline it was the square lead, held at a high sustain: 0.030 RMS against the arpeggio's 0.013. The fixes: the pad is an octave lower (the kit's new `pbase=36`) and quieter (`ZPAD`, strings at 4); the marimba is up from 9 to 12; the Gardens flute (`GFLUTE`) is at 4 and eases off as it holds (sustain 7); the Skyline lead is a square (pulse50, not the brighter pulse25) at 4 that fades as it holds (sustain 4). Per channel, the pads' brightness fell from 0.058 and 0.093 to 0.015 and 0.024, and each pad channel is now at or under the marimba. The Gardens lead went from 0.026 to 0.014, under the marimba's 0.017. The Skyline lead went from 0.030 to 0.019, and its pierce from 0.0087 to 0.0056. All six songs still pass `loud.mjs --check` and `clash.py`. The user's verdict on the new versions: "Sounds good."
9. **Balance and release.** Check main-route jumps at human timing, replay the hardest optional routes, and verify the cart in the console. Produce the label and PNG cart and add the Arcade Library entry.
   - **Built:** `tests/carts/bits-console-quest/jump-windows.mjs` measures each main-route jump's take-off window: from where the recorded route presses A, how many frames early or late (up to 8 each way) the press can come and still land on the same platform. It is a tool rather than a numbered test, since it takes a minute or two, and it fails on a window under 10 frames. The label is the title screen (`release.js`). The cart is in the Library on the Arcade shelf, as `carts/bits-console-quest.nova.png`, with a README row.
   - **Results:** All 41 main-route jumps have windows of 12 to 17 frames; the tightest are Slot Elevator's step up to the high ledge and Trace Trail's ledge (−3 to +8 frames). The routes to every treasure and piece (the optional, harder ones) clear in the campaign test. The hazards' safe phases are long: contacts are live for 30 frames of 120, the press for 44 of 144, and scanline spans are off for 24 of 120. No stage needed changing. `release.js`: the PNG decodes to the packed cart (payload 52.7 KB of 147 KB). Human playtesting of first-clear pacing and difficulty is still to do in the preview.

## 16. Open questions

- Working names, device assignments, and treasure designs in the zone table.
- First-clear stage length, movement tuning, and whether a midpoint is enough for each stage.
- The initial collection model of one treasure and two pieces per stage, with a cutaway for each four-piece puzzle.
- Linear zone unlocks and the lab’s final boot sequence.
- Optional time medals and written treasure stories are ideas for a later pass.

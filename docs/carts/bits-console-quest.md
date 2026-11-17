# Bit’s Console Quest

**Version:** 0.2 (Foundry prototype)

**Status:** The packed cart runs the first playable Controller Foundry course. The full campaign, lab, and art direction are specified below.

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
| Hazard recovery | Return to the latest checkpoint after 24 frames. Restore local devices to checkpoint state and restart timed hazards from their checkpoint phase. |
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
| Title | A enters the lab and resumes the saved campaign, or starts one on a fresh save. |
| Lab | Walk to the console, display case, puzzle wall, or practice door and press B. |
| Stage selector | Shows the unlocked stages and the collectibles found in each. A enters the selected stage. |
| Stage | The exit terminal opens the clear card. START opens pause. |
| Stage clear | After a first stage, pick the next stage or the lab. After a zone finale, return to the lab. A previously cleared stage stays cleared on replay. |
| Practice | Work through the three stations. Finish or return to the lab from pause. |
| Ending | The lab console boots after the last relay. A returns to the open lab. |

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
| 4 | Last selected stage, 0–7 |
| 5 | Ending seen, 0 or 1 |
| 6–255 | Reserved |

Use stable stage and item IDs. Derive unlocked stages and complete lab puzzles from the masks. Save clear and collection bits on the frame that grants them. Resuming from title enters the lab. Checkpoint state lives in the current stage attempt.

## 14. Asset budget

| Asset | Campaign target |
|---|---|
| Code | Up to 48 KiB planned of the 64 KiB limit. Keep stage layouts in ROM if needed. |
| ROM | Up to 32 KiB planned of the 128 KiB limit for stage data and exhibit assets |
| Tiles | Up to 900 of 1,024, with shared device tiles and reusable background tiles |
| Sprites | Up to 48 in a frame and 24 on a line, below the 128 / 32 limits |
| Songs / SFX | 6 songs, up to 48 patterns, about 10 effects |
| PNG cart | Check the 147,443-byte payload limit as the backgrounds and audio land. |

## 15. Implementation plan

**Scaffold results.** The repository verifier regenerated the art and audio, repacked the cart, and passed 39 starter checks and a 3,000-frame soak. The starter bot completed six runs. Browser smoke is pending because Chromium could not start in the workspace. The initials screen, high scores, and starter art and audio belong to the placeholder.

1. **Vertical slice.** Replace the starter minigame with a short Controller Foundry course. Implement scrolling, jumping, one powered lift, a checkpoint, one pickup, and a reachable exit. Exercise all of them with recorded inputs.
   - **Built:** A 768 px course with gaps of 40, 32, 40, and 40 px, a checkpoint at x = 304, and a treasure on an optional ledge 32 px above the upper deck. Bit plugs into the lift on board. The powered lift travels at 1 px per frame between y = 192 and y = 112, waits 60 frames at the top and 45 at the bottom, and cycles so Bit can catch it again. Plug into the exit to clear the course. Save version 2 uses the first stage and treasure bits. The prototype uses the robot’s reference colors and silhouette as a starting point for the art proof, with two starter tracks and gameplay cues.
   - **Results:** 47 checks, a 3,000-frame soak, and four runs apiece of the recorded exit and treasure routes. All runs cleared without a fall. The production console worker rendered the treasure route under Node and emitted both save bits. Reviewed seven rendered screens. The browser smoke test is pending because the workspace blocks a socket Chromium needs to start. The packed code is about 15 KB, with 203 source tiles used and at most four sprites queued by the scene.
2. **Art proof.** Draw Bit’s gameplay poses from the supplied sheet, make the purple-and-cyan lab and Foundry palettes, and render a real Foundry screen. Review the proof before drawing the remaining zones.
3. **Core mechanics.** Add the full socket and device behaviors, collectible bookkeeping, and practice stations. Test repeated B presses, checkpoint restores, and revisiting a collected item.
4. **Hazards.** Implement warned presses, live contacts, and timed platforms. Verify they remain readable and reset consistently.
5. **Stage content.** Build and clear all eight stages. Record a route to every exit and collectible.
6. **Lab and campaign flow.** Implement stage selection, clear cards, exhibits, puzzle cutaways, replay, and save and resume. Verify that the ending and completed campaign reopen correctly.
7. **Remaining art.** Draw the zones, lab furnishings, treasures, cutaways, and ending. Review screenshots of each stage and screen.
8. **Audio.** Compose and test the chiptune tracks and effects. Add *The Entertainer* for the lab and practice course. Verify cues and check levels on the new chip.
9. **Balance and release.** Check main-route jumps at human timing, replay the hardest optional routes, and verify the cart in the console. Produce the label and PNG cart and add the Arcade Library entry.

## 16. Open questions

- Working names, device assignments, and treasure designs in the zone table.
- First-clear stage length, movement tuning, and whether a midpoint is enough for each stage.
- The initial collection model of one treasure and two pieces per stage, with a cutaway for each four-piece puzzle.
- Linear zone unlocks and the lab’s final boot sequence.
- Optional time medals and written treasure stories are ideas for a later pass.

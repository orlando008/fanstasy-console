// Each stage's waypoints for the route solver (solve.mjs): the goals a recorded route reaches, in order. The route
// collects everything (the campaign test checks a stage's treasure and both pieces), so the items are waypoints too.
export const STAGE_WAYPOINTS = {
  0: [{ item: 0 }, { plug: 'lift' }, { plug: 'spring' }, { item: 'treasure' }, { item: 1 }, { plug: 'scanline' },
    { at: [1120, 112] }, { at: [1424, 112] }, { plug: 'lift2' }, { at: [1820, 48] }, { plug: 'scan2' },
    { at: [2300, 120] }, { at: [2420, 104] }, { at: [2720, 152] }, { exit: true }],
  1: [{ item: 0 }, { plug: 'spring' }, { plug: 'lift' }, { item: 'treasure' }, { item: 1 }, { at: [1300, 104] },
    { plug: 'lift2' }, { at: [1540, 64] }, { plug: 'spring2' }, { at: [1900, 48] }, { plug: 'lift3' },
    { at: [2190, 168] }, { at: [2300, 136] }, { plug: 'lift4' }, { at: [2600, 72] }, { at: [2960, 104] }, { exit: true }],
  2: [{ item: 0 }, { plug: 'shelf' }, { item: 'treasure' }, { item: 1 }, { at: [1250, 184] }, { plug: 'shelf2' },
    { at: [1620, 184] }, { at: [1900, 168] }, { at: [2150, 184] }, { plug: 'shelf3' }, { at: [2500, 152] },
    { at: [2810, 152] }, { plug: 'shelf4' }, { exit: true }],
  3: [{ plug: 'lift' }, { item: 0 }, { plug: 'upperLift' }, { item: 1 }, { item: 'treasure' }, { at: [1340, 104] },
    { plug: 'lift3' }, { at: [1620, 184] }, { plug: 'lift4' }, { at: [1800, 120] }, { plug: 'lift5' },
    { at: [2000, 48] }, { at: [2300, 144] }, { plug: 'lift6' }, { at: [2560, 64] }, { at: [2700, 96] },
    { at: [2840, 128] }, { at: [2916, 128] }, { at: [3050, 104] }, { exit: true }],
};

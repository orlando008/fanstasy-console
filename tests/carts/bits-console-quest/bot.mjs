// Recorded Foundry and practice inputs for the packed cart.
import { M, newGame as boot, saveWith } from './lib.mjs';
import { campaignRoutes } from './campaign-routes.mjs';

export const toLift = [
  [56, M('RIGHT')], [42, M('RIGHT', 'A')], [54, M('RIGHT')],
  [36, M('RIGHT', 'A')], [5, 0],
];
export const toUpperDeck = [
  [1, M('B')], [80, 0], [5, M('RIGHT')], [40, M('RIGHT', 'A')], [1, M('RIGHT')],
];
export const hazardApproach = [
  [34, M('RIGHT')], [42, M('RIGHT', 'A')], [17, M('RIGHT')],
];
export const crossScanline = [[1, M('RIGHT', 'B')], [84, M('RIGHT')]];
export const clearHazards = [[33, M('RIGHT', 'A')], [48, 0], [38, M('RIGHT')]];
// Step 11 made Button Assembly longer: from where the first version's exit was, to the new one (found by solve.mjs, each
// from where its route reaches that point: the hazards' phases differ)
const wait = 0;
const treasureFinish = [[20, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [8, M('RIGHT', 'A')], [20, M('RIGHT')], [4, M('RIGHT', 'A')], [40, M('RIGHT')], [4, M('RIGHT', 'A')], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, wait], [44, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [2, M('B')], [4, wait], [16, M('RIGHT')], [8, M('RIGHT', 'A')], [4, M('RIGHT')], [8, M('RIGHT', 'A')], [64, M('RIGHT')], [4, wait], [60, M('RIGHT')], [1, M('B')], [40, wait], [56, M('RIGHT')], [4, wait], [4, M('RIGHT', 'A')], [108, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT')], [4, wait], [60, M('RIGHT')], [4, wait], [4, M('RIGHT', 'A')], [4, wait], [52, M('RIGHT')], [4, M('RIGHT', 'A')], [60, M('RIGHT')], [4, M('RIGHT', 'A')], [108, M('RIGHT')], [1, M('B')]];
const mainFinish = [[20, M('RIGHT')], [4, M('RIGHT', 'A')], [36, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, M('RIGHT', 'A')], [20, M('RIGHT')], [4, M('RIGHT', 'A')], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [76, M('RIGHT')], [4, M('LEFT')], [12, M('RIGHT')], [1, M('B')], [4, wait], [16, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT', 'A')], [4, M('LEFT', 'A')], [4, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [8, M('RIGHT', 'A')], [24, M('RIGHT')], [4, wait], [24, M('RIGHT')], [4, wait], [36, M('RIGHT')], [1, M('B')], [32, wait], [64, M('RIGHT')], [4, wait], [4, M('RIGHT', 'A')], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [8, M('RIGHT', 'A')], [67, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, wait], [4, M('RIGHT')], [12, M('RIGHT', 'A')], [39, M('RIGHT')], [4, wait], [4, M('RIGHT', 'A')], [56, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [4, wait], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [24, M('RIGHT')], [4, wait], [80, M('RIGHT')], [1, M('RIGHT', 'B')]];

export const treasureRoute = [
  [30, M('RIGHT', 'A')], [5, M('RIGHT')], [36, M('RIGHT', 'A')], [23, M('RIGHT')],
  ...crossScanline, ...clearHazards, ...treasureFinish,
];
export const mainRoute = [...hazardApproach, ...crossScanline, ...clearHazards, ...mainFinish];

export const toPracticeRelay = [[39, M('RIGHT')], [34, M('RIGHT', 'A')], [13, M('RIGHT')]];
export const toPracticeLift = [[1, M('RIGHT', 'B')], [129, M('RIGHT')], [27, M('RIGHT', 'A')], [22, 0]];
export const practiceFinish = [
  [1, M('B')], [80, 0], [5, M('RIGHT')], [42, M('RIGHT', 'A')], [35, M('RIGHT')], [1, M('B')],
];

export const replay = (vm, inputs) => {
  for (const [frames, buttons] of inputs) vm.run(frames, buttons);
};

const expand = (inputs) => inputs.flatMap(([frames, buttons]) => Array(frames).fill(buttons));
const routes = {
  main: expand([...toLift, ...toUpperDeck, ...mainRoute]),
  treasure: expand([...toLift, ...toUpperDeck, ...treasureRoute]),
  practice: expand([[1, M('B')], [1, 0], ...toPracticeRelay, ...toPracticeLift, ...practiceFinish]),
};

const campaignKeys = campaignRoutes.map((inputs, i) => {
  const key = 'stage' + (i + 2);
  routes[key] = expand([
    [1, M('A')], [1, 0], [1, M('B')], [1, 0], [1, M('A')], [1, 0], ...inputs,
  ]);
  return key;
});

export const defaults = { frames: 2400, seeds: 4, set: { route: ['main', 'treasure', 'practice', ...campaignKeys] } };
export const newGame = (seed, { route }) => {
  const index = campaignKeys.indexOf(route) + 1;
  const save = index ? saveWith({ clears: (1 << index) - 1, stage: index }) : null;
  return boot(seed, { title: route === 'practice' || index > 0, save });
};
export const pad = (_vm, _probe, frame, { route }) => routes[route][frame] ?? 0;
export const finished = (probe) => probe.state === 'clear';

export function result(probe) {
  return {
    reboots: probe.reboots, treasure: Number(probe.hasTreasure()),
    checkpoints: (probe.checkpoint?.index ?? -1) + 1,
    problems: probe.reboots ? ['rebooted during replay'] : [],
  };
}

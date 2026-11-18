// Recorded Foundry and practice inputs for the packed cart.
import { M, newGame as boot } from './lib.mjs';
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
export const clearHazards = [[33, M('RIGHT', 'A')], [48, 0], [38, M('RIGHT')], [1, M('B')]];

export const treasureRoute = [
  [30, M('RIGHT', 'A')], [5, M('RIGHT')], [36, M('RIGHT', 'A')], [23, M('RIGHT')],
  ...crossScanline, ...clearHazards,
];
export const mainRoute = [...hazardApproach, ...crossScanline, ...clearHazards];

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
  routes[key] = expand([[1, M('A')], [1, 0], ...inputs]);
  return key;
});

export const defaults = { frames: 1100, seeds: 4, set: { route: ['main', 'treasure', 'practice', ...campaignKeys] } };
export const newGame = (seed, { route }) => {
  const index = campaignKeys.indexOf(route) + 1;
  const save = index ? Int32Array.from([2, (1 << index) - 1, 0, 0, index]) : null;
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

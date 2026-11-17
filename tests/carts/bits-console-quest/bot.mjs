// Inputs recorded against the packed cart. Both routes share the three mandatory jumps and the lift.
import { M } from './lib.mjs';

export const toLift = [
  [56, M('RIGHT')], [42, M('RIGHT', 'A')], [54, M('RIGHT')],
  [36, M('RIGHT', 'A')], [5, 0],
];
export const toUpperDeck = [
  [1, M('B')], [80, 0], [5, M('RIGHT')], [40, M('RIGHT', 'A')], [1, M('RIGHT')],
];
export const treasureRoute = [
  [30, M('RIGHT', 'A')], [5, M('RIGHT')], [36, M('RIGHT', 'A')], [11, M('RIGHT')], [1, M('B')],
];
export const mainRoute = [
  [34, M('RIGHT')], [42, M('RIGHT', 'A')], [5, M('RIGHT')], [1, M('B')],
];

export const replay = (vm, inputs) => {
  for (const [frames, buttons] of inputs) vm.run(frames, buttons);
};

const expand = (inputs) => inputs.flatMap(([frames, buttons]) => Array(frames).fill(buttons));
const routes = {
  main: expand([...toLift, ...toUpperDeck, ...mainRoute]),
  treasure: expand([...toLift, ...toUpperDeck, ...treasureRoute]),
};

export const defaults = { frames: 600, seeds: 4, set: { route: ['main', 'treasure'] } };
export const pad = (_vm, _probe, frame, { route }) => routes[route][frame] ?? 0;
export const finished = (probe) => probe.state === 'clear';

export function result(probe) {
  return { falls: probe.falls, treasure: Number(probe.hasTreasure()), problems: probe.falls ? ['fell during replay'] : [] };
}

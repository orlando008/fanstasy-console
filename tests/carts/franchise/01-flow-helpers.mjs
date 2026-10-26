// Helpers shared by the Franchise tests.
/** Moves the hub's cursor down to a menu item. */
export const go = (vm, p, name) => { for (let i = 0; i < 20 && p.hubItems()[p.hubSel] !== name; i++) vm.press('DOWN'); };

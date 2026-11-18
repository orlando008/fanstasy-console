// Recorded through the normal title and clear screen inputs.
import { M } from './lib.mjs';

const wait = 0, left = M('LEFT'), right = M('RIGHT'), jumpRight = M('RIGHT', 'A');
const plug = M('B'), plugRight = M('B', 'RIGHT');

export const campaignRoutes = [
  [ // Cable Works  (solve.mjs)
    [47, M('RIGHT')], [4, wait], [8, M('LEFT')], [1, M('B')], [4, wait], [16, M('RIGHT')], [4, wait], [124, M('RIGHT')], [4, M('RIGHT', 'A')], [24, M('RIGHT')], [4, wait], [2, M('B')], [24, M('RIGHT')], [4, M('RIGHT', 'A')], [52, M('RIGHT')], [4, M('RIGHT', 'A')], [44, M('RIGHT')], [4, wait], [48, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [8, M('RIGHT', 'A')], [84, M('RIGHT')], [4, wait], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [24, M('RIGHT', 'A')], [16, M('RIGHT')], [4, M('RIGHT', 'A')], [24, M('RIGHT')], [8, wait], [12, M('RIGHT')], [1, M('B')], [56, wait], [16, M('RIGHT')], [8, M('RIGHT', 'A')], [4, M('LEFT', 'A')], [4, M('RIGHT', 'A')], [51, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [32, M('RIGHT')], [4, wait], [1, M('B')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT')], [4, wait], [20, M('RIGHT')], [12, M('RIGHT', 'A')], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [16, M('RIGHT')], [4, wait], [20, M('RIGHT')], [4, wait], [1, M('B')], [16, wait], [76, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, wait], [8, M('RIGHT')], [8, M('RIGHT', 'A')], [31, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [12, M('RIGHT', 'A')], [4, M('RIGHT')], [4, wait], [4, M('RIGHT')], [44, wait], [12, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [36, M('RIGHT')], [4, M('RIGHT', 'A')], [24, M('RIGHT')], [4, wait], [8, M('RIGHT')], [3, M('B')], [52, wait], [16, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT', 'A')], [8, M('RIGHT')], [4, wait], [4, M('RIGHT')], [4, wait], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [48, M('RIGHT')], [4, M('RIGHT', 'A')], [20, M('RIGHT')], [4, M('RIGHT', 'A')], [39, M('RIGHT')], [52, wait], [52, M('RIGHT')], [4, wait], [1, M('RIGHT', 'B')],
  ],
  [ // Contact Mine  (solve.mjs)
    [52, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT')], [4, wait], [83, M('RIGHT')], [1, M('B')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [8, M('RIGHT', 'A')], [52, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [8, M('RIGHT', 'A')], [88, M('RIGHT')], [4, M('RIGHT', 'A')], [195, M('RIGHT')], [4, wait], [1, M('RIGHT', 'B')], [12, wait], [32, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [56, M('RIGHT')], [4, M('RIGHT', 'A')], [24, M('RIGHT')], [20, M('RIGHT', 'A')], [16, M('RIGHT')], [20, M('RIGHT', 'A')], [48, M('RIGHT')], [4, M('RIGHT', 'A')], [48, M('RIGHT')], [4, M('RIGHT', 'A')], [51, M('RIGHT')], [1, M('B')], [24, wait], [28, M('RIGHT')], [12, M('RIGHT', 'A')], [76, M('RIGHT')], [4, wait], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [112, M('RIGHT')], [1, M('B')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('RIGHT')], [16, M('RIGHT', 'A')], [16, M('RIGHT')], [4, wait], [56, M('RIGHT')], [4, wait], [1, M('RIGHT', 'B')],
  ],
  [ // Slot Elevator  (solve.mjs)
    [52, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT')], [4, wait], [16, M('RIGHT')], [2, M('B')], [16, wait], [16, M('RIGHT')], [16, M('RIGHT', 'A')], [116, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [16, M('RIGHT')], [4, wait], [4, M('RIGHT')], [2, M('B')], [24, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [4, M('RIGHT', 'A')], [175, M('RIGHT')], [4, M('RIGHT', 'A')], [104, M('RIGHT')], [3, wait], [1, M('B')], [20, M('RIGHT')], [4, wait], [48, M('RIGHT')], [4, M('RIGHT', 'A')], [16, M('RIGHT')], [4, wait], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, wait], [4, M('RIGHT')], [4, wait], [4, M('RIGHT')], [4, wait], [4, M('RIGHT', 'A')], [16, wait], [12, M('RIGHT')], [2, M('B')], [4, wait], [16, M('RIGHT')], [4, M('RIGHT', 'A')], [4, M('LEFT', 'A')], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [23, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, wait], [8, M('RIGHT')], [4, wait], [2, M('RIGHT', 'B')], [8, wait], [16, M('RIGHT')], [8, M('RIGHT', 'A')], [4, M('LEFT', 'A')], [8, M('RIGHT')], [4, wait], [23, M('RIGHT')], [4, wait], [24, M('RIGHT')], [4, M('LEFT')], [24, M('RIGHT')], [4, wait], [4, M('RIGHT')], [4, wait], [8, M('RIGHT')], [4, M('RIGHT', 'A')], [60, M('RIGHT')], [3, wait], [4, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [2, M('B')], [16, wait], [12, M('RIGHT')], [12, M('RIGHT', 'A')], [4, M('LEFT', 'A')], [52, M('RIGHT')], [3, wait], [24, M('RIGHT')], [4, M('RIGHT', 'A')], [32, M('RIGHT')], [4, wait], [24, M('RIGHT')], [4, M('RIGHT', 'A')], [32, M('RIGHT')], [40, wait], [36, M('RIGHT')], [32, wait], [4, M('LEFT')], [4, wait], [32, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [24, M('RIGHT')], [4, M('RIGHT', 'A')], [28, M('RIGHT')], [4, M('RIGHT', 'A')], [12, M('RIGHT')], [4, M('RIGHT', 'A')], [4, wait], [8, M('RIGHT')], [4, wait], [1, M('RIGHT', 'B')],
  ],
  [ // Trace Trail
    [78, right], [1, plugRight], [148, right], [36, jumpRight], [4, right],
    [30, jumpRight], [2, wait], [34, right], [1, plugRight], [88, right],
    [27, jumpRight], [14, wait], [29, right], [36, jumpRight], [41, right],
    [1, plug],
  ],
  [ // Relay Grove
    [92, right], [1, plugRight], [181, right], [17, wait], [7, left],
    [4, wait], [1, plugRight], [85, right], [28, jumpRight], [13, wait],
    [17, right], [27, jumpRight], [14, wait], [7, right], [36, jumpRight],
    [63, right], [38, jumpRight], [53, right], [1, plug],
  ],
  [ // Phosphor Rooftops
    [64, right], [1, plugRight], [101, right], [28, jumpRight], [13, wait],
    [28, right], [1, plugRight], [75, right], [32, jumpRight], [48, right],
    [37, jumpRight], [6, right], [28, jumpRight], [13, wait], [23, right],
    [36, jumpRight], [66, right], [1, plug],
  ],
  [ // Picture Lock
    [27, right], [27, jumpRight], [14, wait], [11, right], [29, jumpRight],
    [12, wait], [1, plug], [80, wait], [8, right], [34, jumpRight],
    [7, wait], [21, right], [84, wait], [49, right], [1, plugRight],
    [83, right], [33, jumpRight], [18, right], [12, wait], [1, plugRight],
    [103, right], [1, plugRight], [96, right], [71, wait], [60, right],
    [27, jumpRight], [14, wait], [33, right], [1, plug],
  ],
];

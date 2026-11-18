// Recorded through the normal title and clear screen inputs.
import { M } from './lib.mjs';

const wait = 0, left = M('LEFT'), right = M('RIGHT'), jumpRight = M('RIGHT', 'A');
const plug = M('B'), plugRight = M('B', 'RIGHT');

export const campaignRoutes = [
  [ // Cable Works
    [36, right], [1, plugRight], [154, right], [29, jumpRight], [12, wait],
    [1, plug], [64, wait], [5, right], [33, jumpRight], [8, wait],
    [35, right], [29, jumpRight], [5, wait], [57, right], [35, jumpRight],
    [9, wait], [55, right], [39, jumpRight], [5, wait], [5, right],
    [70, wait], [73, right], [1, plug],
  ],
  [ // Contact Mine
    [45, right], [27, jumpRight], [14, wait], [82, right], [6, wait],
    [1, plug], [136, wait], [21, right], [28, jumpRight], [13, wait],
    [37, jumpRight], [46, right], [35, jumpRight], [1, wait], [59, right],
    [33, jumpRight], [13, wait], [26, jumpRight], [15, wait], [37, right],
    [1, plug],
  ],
  [ // Slot Elevator
    [59, right], [30, jumpRight], [11, wait], [1, plug], [80, wait],
    [4, right], [31, jumpRight], [10, wait], [47, right], [28, jumpRight],
    [13, wait], [32, right], [30, jumpRight], [11, wait], [1, plug],
    [64, wait], [5, right], [34, jumpRight], [7, wait], [123, right],
    [33, jumpRight], [17, wait], [3, right], [29, jumpRight], [5, wait],
    [20, right], [47, wait], [52, right], [1, plug],
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

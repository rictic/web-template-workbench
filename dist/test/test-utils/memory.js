/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const canRunMemoryTests = globalThis.performance?.memory?.usedJSHeapSize && window.gc;
export const memorySuite = canRunMemoryTests ? suite : suite.skip;
//# sourceMappingURL=memory.js.map
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const DEV_MODE = true;
const ENABLE_EXTRA_SECURITY_HOOKS = true;
const NODE_MODE = true;
const domPartsSupported = typeof ChildNodePart !== 'undefined';
const useDomParts = domPartsSupported;

export { DEV_MODE, ENABLE_EXTRA_SECURITY_HOOKS, NODE_MODE, domPartsSupported, useDomParts };
//# sourceMappingURL=modes.js.map

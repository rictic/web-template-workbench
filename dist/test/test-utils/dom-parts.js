/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { useDomParts } from '../../modes.js';
export const skipIfDomParts = (() => {
    if (useDomParts) {
        return test.skip;
    }
    else {
        return test;
    }
})();
// We don't have dev mode warnings and errors implemented yet in the
// DOM Parts implementation.
export const devModeTest = skipIfDomParts;
// We don't yet support compiled templates in the DOM Parts implementation.
export const compiledSuite = (() => {
    if (useDomParts) {
        return suite.skip;
    }
    else {
        return suite;
    }
})();
// Raw elements don't work with our DOM Parts implementation yet.
export const rawTest = skipIfDomParts;
// Looks like I broke bindings in comments more generally.
export const commentTest = test.skip;
//# sourceMappingURL=dom-parts.js.map
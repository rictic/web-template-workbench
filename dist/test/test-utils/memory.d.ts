/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/// <reference types="mocha" />
declare global {
    interface Window {
        gc: () => void;
    }
    interface Performance {
        memory: {
            usedJSHeapSize: number;
        };
    }
}
export declare const memorySuite: Mocha.PendingSuiteFunction;
//# sourceMappingURL=memory.d.ts.map
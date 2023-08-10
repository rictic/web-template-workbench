/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { RenderOptions } from '../../index.js';
export declare const makeAsserts: (getContainer: () => HTMLElement) => {
    assertRender: (r: unknown, expected: string | string[], options?: RenderOptions, message?: string) => import("../../template.js").RootPart;
    assertContent: (expected: string | string[], message?: string) => void;
};
//# sourceMappingURL=assert-render.d.ts.map
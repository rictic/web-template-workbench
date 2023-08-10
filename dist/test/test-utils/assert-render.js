/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { render } from '../../index.js';
import { assert } from '@esm-bundle/chai';
import { stripExpressionComments } from '@lit-labs/testing';
export const makeAsserts = (getContainer) => {
    const assertRender = (r, expected, options, message) => {
        const container = getContainer();
        const part = render(r, container, options);
        assertContent(expected, message);
        return part;
    };
    const assertContent = (expected, message) => {
        const container = getContainer();
        const cleanActual = stripExpressionComments(container.innerHTML);
        if (Array.isArray(expected)) {
            assert.oneOf(cleanActual, expected, message);
        }
        else {
            assert.equal(cleanActual, expected, message);
        }
    };
    return { assertRender, assertContent };
};
//# sourceMappingURL=assert-render.js.map
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { html } from '../../index.js';
import { makeAsserts } from '../test-utils/assert-render.js';
import { when } from '../../directives/when.js';
suite('when', () => {
    let container;
    const { assertRender } = makeAsserts(() => container);
    setup(() => {
        container = document.createElement('div');
    });
    test('true condition with false case', () => {
        assertRender(when(true, () => html `X`, () => html `Y`), 'X');
    });
    test('true condition without false case', () => {
        assertRender(when(true, () => html `X`), 'X');
    });
    test('false condition with false case', () => {
        assertRender(when(false, () => html `X`, () => html `Y`), 'Y');
    });
    test('false condition without false case', () => {
        assertRender(when(false, () => html `X`), '');
    });
});
//# sourceMappingURL=when_test.js.map
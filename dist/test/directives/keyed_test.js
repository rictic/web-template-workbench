/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { keyed } from '../../directives/keyed.js';
import { render, html } from '../../index.js';
import { assert } from '@esm-bundle/chai';
import { makeAsserts } from '../test-utils/assert-render.js';
suite('keyed directive', () => {
    let container;
    setup(() => {
        container = document.createElement('div');
    });
    const { assertContent } = makeAsserts(() => container);
    test('re-renders when the key changes', () => {
        const go = (k) => render(keyed(k, html `<div .foo=${k}></div>`), container);
        // Initial render
        go(1);
        const div = container.querySelector('div');
        assertContent('<div></div>');
        assert.equal(div.foo, 1);
        // Rerendering with same key should reuse the DOM
        go(1);
        const div2 = container.querySelector('div');
        assertContent('<div></div>');
        assert.equal(div2.foo, 1);
        assert.strictEqual(div, div2);
        // Rerendering with a different key should not reuse the DOM
        go(2);
        const div3 = container.querySelector('div');
        assertContent('<div></div>');
        assert.equal(div3.foo, 2);
        assert.notStrictEqual(div, div3);
    });
});
//# sourceMappingURL=keyed_test.js.map
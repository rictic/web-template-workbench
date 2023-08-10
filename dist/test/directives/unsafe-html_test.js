/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { unsafeHTML } from '../../directives/unsafe-html.js';
import { render, html, nothing, noChange } from '../../index.js';
import { assert } from '@esm-bundle/chai';
import { makeAsserts } from '../test-utils/assert-render.js';
suite('unsafeHTML directive', () => {
    let container;
    setup(() => {
        container = document.createElement('div');
    });
    const { assertContent } = makeAsserts(() => container);
    test('renders HTML', () => {
        render(html `<div>before${unsafeHTML('<span>inner</span>after')}</div>`, container);
        assertContent('<div>before<span>inner</span>after</div>');
    });
    test('rendering `nothing` renders empty string to content', () => {
        render(html `<div>before${unsafeHTML(nothing)}after</div>`, container);
        assertContent('<div>beforeafter</div>');
    });
    test('rendering `noChange` does not change the previous content', () => {
        const template = (v) => html `<div>before${unsafeHTML(v)}after</div>`;
        render(template('<p>Hi</p>'), container);
        assertContent('<div>before<p>Hi</p>after</div>');
        render(template(noChange), container);
        assertContent('<div>before<p>Hi</p>after</div>');
    });
    test('rendering `undefined` renders empty string to content', () => {
        render(html `<div>before${unsafeHTML(undefined)}after</div>`, container);
        assertContent('<div>beforeafter</div>');
    });
    test('rendering `null` renders empty string to content', () => {
        render(html `<div>before${unsafeHTML(null)}after</div>`, container);
        assertContent('<div>beforeafter</div>');
    });
    test('dirty checks primitive values', () => {
        const value = 'aaa';
        const t = () => html `<div>${unsafeHTML(value)}</div>`;
        // Initial render
        render(t(), container);
        assertContent('<div>aaa</div>');
        // Modify instance directly. Since lit-html doesn't dirty check against
        // actual DOM, but against previous part values, this modification should
        // persist through the next render if dirty checking works.
        const text = container.querySelector('div').childNodes[1];
        text.textContent = 'bbb';
        assertContent('<div>bbb</div>', 'A');
        // Re-render with the same value
        render(t(), container);
        assertContent('<div>bbb</div>', 'B');
        const text2 = container.querySelector('div').childNodes[1];
        assert.strictEqual(text, text2);
    });
    test('throws on non-string values', () => {
        const value = ['aaa'];
        const t = () => html `<div>${unsafeHTML(value)}</div>`;
        assert.throws(() => render(t(), container));
    });
    test('renders after other values', () => {
        const value = '<span></span>';
        const primitive = 'aaa';
        const t = (content) => html `<div>${content}</div>`;
        // Initial unsafeHTML render
        render(t(unsafeHTML(value)), container);
        assertContent('<div><span></span></div>');
        // Re-render with a non-unsafeHTML value
        render(t(primitive), container);
        assertContent('<div>aaa</div>');
        // Re-render with unsafeHTML again
        render(t(unsafeHTML(value)), container);
        assertContent('<div><span></span></div>');
    });
});
//# sourceMappingURL=unsafe-html_test.js.map
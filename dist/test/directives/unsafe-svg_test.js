/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { unsafeSVG } from '../../directives/unsafe-svg.js';
import { render, nothing, html, noChange } from '../../index.js';
import { assert } from '@esm-bundle/chai';
import { makeAsserts } from '../test-utils/assert-render.js';
suite('unsafeSVG', () => {
    let container;
    setup(() => {
        container = document.createElement('div');
    });
    const { assertContent } = makeAsserts(() => container);
    test('renders SVG', () => {
        render(
        // prettier-ignore
        html `<svg>before${unsafeSVG('<line x1="0" y1="0" x2="10" y2="10" stroke="black"/>')}</svg>`, container);
        assertContent([
            '<svg>before<line x1="0" y1="0" x2="10" y2="10" stroke="black"></line></svg>',
            '<svg>before<line stroke="black" x1="0" y1="0" x2="10" y2="10"></line></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg">before<line stroke="black" x1="0" y1="0" x2="10" y2="10" /></svg>',
        ]);
        const lineElement = container.querySelector('line');
        assert.equal(lineElement.namespaceURI, 'http://www.w3.org/2000/svg');
    });
    test('rendering `nothing` renders empty string to content', () => {
        render(html `<svg>before${unsafeSVG(nothing)}after</svg>`, container);
        assertContent('<svg>beforeafter</svg>');
    });
    test('rendering `noChange` does not change the previous content', () => {
        const template = (v) => html `<svg>before${unsafeSVG(v)}after</svg>`;
        render(template('<g>Hi</g>'), container);
        assertContent('<svg>before<g>Hi</g>after</svg>');
        render(template(noChange), container);
        assertContent('<svg>before<g>Hi</g>after</svg>');
    });
    test('rendering `undefined` renders empty string to content', () => {
        render(html `<svg>before${unsafeSVG(undefined)}after</svg>`, container);
        assertContent('<svg>beforeafter</svg>');
    });
    test('rendering `null` renders empty string to content', () => {
        render(html `<svg>before${unsafeSVG(null)}after</svg>`, container);
        assertContent('<svg>beforeafter</svg>');
    });
    test('dirty checks primitive values', () => {
        const value = 'aaa';
        const t = () => html `<svg>${unsafeSVG(value)}</svg>`;
        // Initial render
        render(t(), container);
        assertContent([
            '<svg>aaa</svg>',
            '<svg xmlns="http://www.w3.org/2000/svg">aaa</svg>',
        ]);
        // Modify instance directly. Since lit-html doesn't dirty check against
        // actual DOM, but against previous part values, this modification should
        // persist through the next render if dirty checking works.
        const text = container.querySelector('svg').childNodes[1];
        text.textContent = 'bbb';
        assertContent([
            '<svg>bbb</svg>',
            '<svg xmlns="http://www.w3.org/2000/svg">bbb</svg>',
        ]);
        // Re-render with the same value
        render(t(), container);
        assertContent([
            '<svg>bbb</svg>',
            '<svg xmlns="http://www.w3.org/2000/svg">bbb</svg>',
        ]);
        const text2 = container.querySelector('svg').childNodes[1];
        assert.strictEqual(text, text2);
    });
    test('throws on non-string values', () => {
        const value = ['aaa'];
        const t = () => html `<div>${unsafeSVG(value)}</div>`;
        assert.throws(() => render(t(), container));
    });
    test('renders after other values', () => {
        const value = '<text></text>';
        const primitive = 'aaa';
        const t = (content) => html `<svg>${content}</svg>`;
        // Initial unsafeSVG render
        render(t(unsafeSVG(value)), container);
        assertContent([
            '<svg><text></text></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><text /></svg>',
        ]);
        // Re-render with a non-unsafeSVG value
        render(t(primitive), container);
        assertContent([
            '<svg>aaa</svg>',
            '<svg xmlns="http://www.w3.org/2000/svg">aaa</svg>',
        ]);
        // Re-render with unsafeSVG again
        render(t(unsafeSVG(value)), container);
        assertContent([
            '<svg><text></text></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><text /></svg>',
        ]);
    });
});
//# sourceMappingURL=unsafe-svg_test.js.map
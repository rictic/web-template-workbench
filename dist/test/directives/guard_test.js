/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { nothing, html, render } from '../../index.js';
import { guard } from '../../directives/guard.js';
import { Directive, directive } from '../../directive.js';
import { assert } from '@esm-bundle/chai';
import { makeAsserts } from '../test-utils/assert-render.js';
suite('guard', () => {
    let container;
    function renderGuarded(value, f) {
        render(html `<div>${guard(value, f)}</div>`, container);
    }
    setup(() => {
        container = document.createElement('div');
    });
    const { assertContent } = makeAsserts(() => container);
    test('re-renders only on identity changes', () => {
        let callCount = 0;
        let renderCount = 0;
        const guardedTemplate = () => {
            callCount += 1;
            return html `Template ${renderCount}`;
        };
        renderCount += 1;
        renderGuarded('foo', guardedTemplate);
        assertContent('<div>Template 1</div>');
        renderCount += 1;
        renderGuarded('foo', guardedTemplate);
        assertContent('<div>Template 1</div>');
        renderCount += 1;
        renderGuarded('bar', guardedTemplate);
        assertContent('<div>Template 3</div>');
        assert.equal(callCount, 2);
    });
    test('renders with undefined the first time', () => {
        let callCount = 0;
        let renderCount = 0;
        const guardedTemplate = () => {
            callCount += 1;
            return html `${renderCount}`;
        };
        renderCount += 1;
        renderGuarded(undefined, guardedTemplate);
        assertContent('<div>1</div>');
        renderCount += 1;
        renderGuarded(undefined, guardedTemplate);
        assertContent('<div>1</div>');
        assert.equal(callCount, 1);
    });
    test('renders with nothing the first time', () => {
        let callCount = 0;
        let renderCount = 0;
        const guardedTemplate = () => {
            callCount += 1;
            return html `${renderCount}`;
        };
        renderCount += 1;
        renderGuarded(nothing, guardedTemplate);
        assertContent('<div>1</div>');
        renderCount += 1;
        renderGuarded(nothing, guardedTemplate);
        assertContent('<div>1</div>');
        assert.equal(callCount, 1);
    });
    test('dirty checks array values', () => {
        let callCount = 0;
        let items = ['foo', 'bar'];
        const guardedTemplate = () => {
            callCount += 1;
            return html `<ul>${items.map((i) => html `<li>${i}</li>`)}</ul>`;
        };
        renderGuarded([items], guardedTemplate);
        assertContent('<div><ul><li>foo</li><li>bar</li></ul></div>');
        items.push('baz');
        renderGuarded([items], guardedTemplate);
        assertContent('<div><ul><li>foo</li><li>bar</li></ul></div>');
        items = [...items];
        renderGuarded([items], guardedTemplate);
        assertContent('<div><ul><li>foo</li><li>bar</li><li>baz</li></ul></div>');
        assert.equal(callCount, 2);
    });
    test('dirty checks arrays of values', () => {
        let callCount = 0;
        const items = ['foo', 'bar'];
        const guardedTemplate = () => {
            callCount += 1;
            return html `<ul>${items.map((i) => html `<li>${i}</li>`)}</ul>`;
        };
        renderGuarded(items, guardedTemplate);
        assertContent('<div><ul><li>foo</li><li>bar</li></ul></div>');
        renderGuarded(['foo', 'bar'], guardedTemplate);
        assertContent('<div><ul><li>foo</li><li>bar</li></ul></div>');
        items.push('baz');
        renderGuarded(items, guardedTemplate);
        assertContent('<div><ul><li>foo</li><li>bar</li><li>baz</li></ul></div>');
        assert.equal(callCount, 2);
    });
    test('guards directive from running', () => {
        let directiveRenderCount = 0;
        let directiveConstructedCount = 0;
        let renderCount = 0;
        class MyDirective extends Directive {
            constructor(partInfo) {
                super(partInfo);
                directiveConstructedCount++;
            }
            render() {
                directiveRenderCount++;
                return directiveRenderCount;
            }
        }
        const testDirective = directive(MyDirective);
        const guardedTemplate = () => {
            renderCount += 1;
            return testDirective();
        };
        renderGuarded('foo', guardedTemplate);
        assertContent('<div>1</div>');
        renderGuarded('foo', guardedTemplate);
        assertContent('<div>1</div>');
        renderGuarded('bar', guardedTemplate);
        assertContent('<div>2</div>');
        assert.equal(renderCount, 2);
        assert.equal(directiveConstructedCount, 1);
    });
});
//# sourceMappingURL=guard_test.js.map
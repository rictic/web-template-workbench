/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { html, render } from '../../index.js';
import { styleMap } from '../../directives/style-map.js';
import { assert } from '@esm-bundle/chai';
const ua = window.navigator.userAgent;
const isChrome41 = ua.indexOf('Chrome/41') > 0;
const isIE = ua.indexOf('Trident/') > 0;
const supportsCSSVariables = !isIE && !isChrome41;
const testIfSupportsCSSVariables = (test) => supportsCSSVariables ? test : test.skip;
suite('styleMap', () => {
    let container;
    function renderStyleMap(cssInfo) {
        render(html `<div style="${styleMap(cssInfo)}"></div>`, container);
    }
    function renderStyleMapStatic(cssInfo) {
        render(html `<div style="height: 1px; ${styleMap(cssInfo)} color: red"></div>`, container);
    }
    setup(() => {
        container = document.createElement('div');
    });
    test('first render skips undefined properties', () => {
        renderStyleMap({ marginTop: undefined, marginBottom: null });
        const el = container.firstElementChild;
        // Note calling `setAttribute('style', '') does results in
        // `getAttribute('style') === null` on IE11; test cssText instead
        assert.equal(el.style.cssText, '');
        assert.equal(el.style.marginTop, '');
        assert.equal(el.style.marginBottom, '');
    });
    test('adds and updates properties', () => {
        renderStyleMap({
            marginTop: '2px',
            'padding-bottom': '4px',
            opacity: '0.5',
            'z-index': 10,
        });
        const el = container.firstElementChild;
        assert.equal(el.style.marginTop, '2px');
        assert.equal(el.style.paddingBottom, '4px');
        assert.equal(el.style.opacity, '0.5');
        assert.equal(el.style.zIndex, '10');
        renderStyleMap({
            marginTop: '4px',
            paddingBottom: '8px',
            opacity: '0.55',
            'z-index': 1,
        });
        assert.equal(el.style.marginTop, '4px');
        assert.equal(el.style.paddingBottom, '8px');
        assert.equal(el.style.opacity, '0.55');
        assert.equal(el.style.zIndex, '1');
    });
    test('removes properties', () => {
        renderStyleMap({
            marginTop: '2px',
            'padding-bottom': '4px',
            borderRadius: '5px',
            borderColor: 'blue',
        });
        const el = container.firstElementChild;
        assert.equal(el.style.marginTop, '2px');
        assert.equal(el.style.paddingBottom, '4px');
        assert.equal(el.style.borderRadius, '5px');
        assert.equal(el.style.borderColor, 'blue');
        renderStyleMap({ borderRadius: undefined, borderColor: null });
        assert.equal(el.style.marginTop, '');
        assert.equal(el.style.paddingBottom, '');
        assert.equal(el.style.borderRadius, '');
        assert.equal(el.style.borderColor, '');
    });
    test('works with static properties', () => {
        renderStyleMapStatic({ marginTop: '2px', 'padding-bottom': '4px' });
        const el = container.firstElementChild;
        assert.equal(el.style.height, '1px');
        assert.equal(el.style.color, 'red');
        assert.equal(el.style.marginTop, '2px');
        assert.equal(el.style.paddingBottom, '4px');
        renderStyleMapStatic({});
        assert.equal(el.style.height, '1px');
        assert.equal(el.style.color, 'red');
        assert.equal(el.style.marginTop, '');
        assert.equal(el.style.paddingBottom, '');
    });
    testIfSupportsCSSVariables(test)('adds and removes CSS variables', () => {
        renderStyleMap({ '--size': '2px' });
        const el = container.firstElementChild;
        assert.equal(el.style.getPropertyValue('--size'), '2px');
        renderStyleMap({ '--size': '4px' });
        assert.equal(el.style.getPropertyValue('--size'), '4px');
        renderStyleMap({});
        assert.equal(el.style.getPropertyValue('--size'), '');
    });
    // IE does not seeem to properly handle priority argument to
    // CSSStyleDeclaration.setProperty()
    (isIE ? test.skip : test)('adds priority in updated properties', () => {
        renderStyleMap({ color: 'blue !important' });
        const el = container.firstElementChild;
        assert.equal(el.style.getPropertyValue('color'), 'blue');
        assert.equal(el.style.getPropertyPriority('color'), 'important');
        renderStyleMap({ color: 'green !important' });
        assert.equal(el.style.getPropertyValue('color'), 'green');
        assert.equal(el.style.getPropertyPriority('color'), 'important');
        renderStyleMap({ color: 'red' });
        assert.equal(el.style.getPropertyValue('color'), 'red');
        assert.equal(el.style.getPropertyPriority('color'), '');
        renderStyleMap({});
        assert.equal(el.style.getPropertyValue('color'), '');
    });
    test('works when used with the same object', () => {
        const styleInfo = { marginTop: '2px', 'padding-bottom': '4px' };
        renderStyleMap(styleInfo);
        const el = container.firstElementChild;
        assert.equal(el.style.marginTop, '2px');
        assert.equal(el.style.paddingBottom, '4px');
        styleInfo.marginTop = '6px';
        styleInfo['padding-bottom'] = '8px';
        renderStyleMap(styleInfo);
        assert.equal(el.style.marginTop, '6px');
        assert.equal(el.style.paddingBottom, '8px');
    });
    test('works when same object adds and removes properties', () => {
        const styleInfo = { marginTop: '2px', 'padding-bottom': '4px' };
        renderStyleMap(styleInfo);
        const el = container.firstElementChild;
        assert.equal(el.style.marginTop, '2px');
        assert.equal(el.style.paddingBottom, '4px');
        assert.equal(el.style.color, '');
        delete styleInfo['marginTop'];
        styleInfo.color = 'green';
        renderStyleMap(styleInfo);
        assert.equal(el.style.marginTop, '');
        assert.equal(el.style.color, 'green');
    });
    test('throws when used on non-style attribute', () => {
        assert.throws(() => {
            render(html `<div id="${styleMap({})}"></div>`, container);
        });
    });
    test('throws when used in attribute with more than 1 part', () => {
        assert.throws(() => {
            render(html `<div style="${'height: 2px;'} ${styleMap({})}"></div>`, container);
        });
    });
    test('throws when used in ChildPart', () => {
        assert.throws(() => {
            render(html `<div>${styleMap({})}</div>`, container);
        });
    });
});
//# sourceMappingURL=style-map_test.js.map
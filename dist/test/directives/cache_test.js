/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { render, html, nothing } from '../../index.js';
import { cache } from '../../directives/cache.js';
import { assert } from '@esm-bundle/chai';
import { directive, AsyncDirective } from '../../async-directive.js';
import { makeAsserts } from '../test-utils/assert-render.js';
suite('cache directive', () => {
    let container;
    setup(() => {
        container = document.createElement('div');
    });
    const { assertContent, assertRender } = makeAsserts(() => container);
    test('caches templates', () => {
        const renderCached = (condition, v) => render(html `${cache(condition ? html `<div v=${v}></div>` : html `<span v=${v}></span>`)}`, container);
        renderCached(true, 'A');
        assertContent('<div v="A"></div>');
        const element1 = container.querySelector('div');
        renderCached(false, 'B');
        assertContent('<span v="B"></span>');
        const element2 = container.querySelector('span');
        assert.notStrictEqual(element1, element2);
        renderCached(true, 'C');
        assertContent('<div v="C"></div>');
        assert.strictEqual(container.querySelector('div'), element1);
        renderCached(false, 'D');
        assertContent('<span v="D"></span>');
        assert.strictEqual(container.querySelector('span'), element2);
    });
    test('renders non-TemplateResults', () => {
        assertRender(html `${cache('abc')}`, 'abc');
    });
    test('caches templates when switching against non-TemplateResults', () => {
        const renderCached = (condition, v) => render(html `${cache(condition ? html `<div v=${v}></div>` : v)}`, container);
        renderCached(true, 'A');
        assertContent('<div v="A"></div>');
        const element1 = container.firstElementChild?.firstElementChild;
        renderCached(false, 'B');
        assertContent('B');
        renderCached(true, 'C');
        assertContent('<div v="C"></div>');
        assert.strictEqual(container.firstElementChild?.firstElementChild, element1);
        renderCached(false, 'D');
        assertContent('D');
    });
    test('caches templates when switching against TemplateResult and undefined values', () => {
        const renderCached = (v) => render(html `<div>${cache(v)}</div>`, container);
        renderCached(html `A`);
        assertContent('<div>A</div>');
        renderCached(undefined);
        assertContent('<div></div>');
        renderCached(html `B`);
        assertContent('<div>B</div>');
    });
    test('cache can be dynamic', () => {
        const renderMaybeCached = (condition, v) => render(html `${condition ? cache(html `<div v=${v}></div>`) : v}`, container);
        renderMaybeCached(true, 'A');
        assertContent('<div v="A"></div>');
        renderMaybeCached(false, 'B');
        assertContent('B');
        renderMaybeCached(true, 'C');
        assertContent('<div v="C"></div>');
        renderMaybeCached(false, 'D');
        assertContent('D');
    });
    test('cache can switch between TemplateResult and non-TemplateResult', () => {
        const renderCache = (bool) => render(html `${cache(bool ? html `<p></p>` : nothing)}`, container);
        renderCache(true);
        assertContent('<p></p>');
        renderCache(false);
        assertContent('');
        renderCache(true);
        assertContent('<p></p>');
        renderCache(true);
        assertContent('<p></p>');
        renderCache(false);
        assertContent('');
        renderCache(true);
        assertContent('<p></p>');
        renderCache(false);
        assertContent('');
        renderCache(false);
        assertContent('');
    });
    test('async directives disconnect/reconnect when moved in/out of cache', () => {
        const disconnectable = directive(class extends AsyncDirective {
            render(log, id) {
                this.log = log;
                this.id = id;
                this.log.push(`render-${this.id}`);
                return id;
            }
            disconnected() {
                this.log.push(`disconnected-${this.id}`);
            }
            reconnected() {
                this.log.push(`reconnected-${this.id}`);
            }
        });
        const renderCached = (log, condition) => render(html `<div>${cache(condition
            ? html `<div>${disconnectable(log, 'a')}</div>`
            : html `<span>${disconnectable(log, 'b')}</span>`)}</div>`, container);
        const log = [];
        renderCached(log, true);
        assertContent('<div><div>a</div></div>');
        assert.deepEqual(log, ['render-a']);
        log.length = 0;
        renderCached(log, false);
        assertContent('<div><span>b</span></div>');
        assert.deepEqual(log, ['disconnected-a', 'render-b']);
        log.length = 0;
        renderCached(log, true);
        assertContent('<div><div>a</div></div>');
        assert.deepEqual(log, ['disconnected-b', 'reconnected-a', 'render-a']);
        log.length = 0;
        renderCached(log, false);
        assertContent('<div><span>b</span></div>');
        assert.deepEqual(log, ['disconnected-a', 'reconnected-b', 'render-b']);
    });
});
//# sourceMappingURL=cache_test.js.map
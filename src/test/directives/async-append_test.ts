/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {asyncAppend} from '../../directives/async-append.js';
import {render, nothing} from '../../index.js';
import {TestAsyncIterable} from './test-async-iterable.js';
import {assert} from '@esm-bundle/chai';
import {memorySuite} from '../test-utils/memory.js';
import {makeAsserts} from '../test-utils/assert-render.js';
import {html} from '../test-utils/dom-parts.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));

suite('asyncAppend', () => {
  let container: HTMLDivElement;
  let iterable: TestAsyncIterable<string>;

  setup(() => {
    container = document.createElement('div');
    iterable = new TestAsyncIterable<string>();
  });

  const {assertContent} = makeAsserts(() => container);

  test('appends content as the async iterable yields new values', async () => {
    render(html`<div>${asyncAppend(iterable)}</div>`, container);
    assertContent('<div></div>');

    await iterable.push('foo');
    assertContent('<div>foo</div>');

    await iterable.push('bar');
    assertContent('<div>foobar</div>');
  });

  test('appends nothing with a value is undefined', async () => {
    render(html`<div>${asyncAppend(iterable)}</div>`, container);
    assertContent('<div></div>');

    await iterable.push('foo');
    assertContent('<div>foo</div>');

    await iterable.push(undefined as unknown as string);
    assertContent('<div>foo</div>');
  });

  test('uses a mapper function', async () => {
    render(
      html`<div>${asyncAppend(iterable, (v, i) => html`${i}: ${v} `)}</div>`,
      container
    );
    assertContent('<div></div>');

    await iterable.push('foo');
    assertContent('<div>0: foo </div>');

    await iterable.push('bar');
    assertContent('<div>0: foo 1: bar </div>');
  });

  test('renders new iterable over a pending iterable', async () => {
    const t = (iterable: any) => html`<div>${asyncAppend(iterable)}</div>`;
    render(t(iterable), container);
    assertContent('<div></div>');

    await iterable.push('foo');
    assertContent('<div>foo</div>');

    const iterable2 = new TestAsyncIterable<string>();
    render(t(iterable2), container);

    // The last value is preserved until we receive the first
    // value from the new iterable
    assertContent('<div>foo</div>');

    await iterable2.push('hello');
    assertContent('<div>hello</div>');

    await iterable.push('bar');
    assertContent('<div>hello</div>');
  });

  test('renders new value over a pending iterable', async () => {
    const t = (v: any) => html`<div>${v}</div>`;
    // This is a little bit of an odd usage of directives as values, but it
    // is possible, and we check here that asyncAppend plays nice in this case
    render(t(asyncAppend(iterable)), container);
    assertContent('<div></div>');

    await iterable.push('foo');
    assertContent('<div>foo</div>');

    render(t('hello'), container);
    assertContent('<div>hello</div>');

    await iterable.push('bar');
    assertContent('<div>hello</div>');
  });

  test('does not render the first value if it is replaced first', async () => {
    const iterable2 = new TestAsyncIterable<string>();

    const component = (value: any) => html`<p>${asyncAppend(value)}</p>`;

    render(component(iterable), container);
    render(component(iterable2), container);

    await iterable2.push('fast');

    // This write should not render, since the whole iterator was replaced
    await iterable.push('slow');

    assertContent('<p>fast</p>');
  });

  suite('disconnection', () => {
    test('does not render when iterable resolves while disconnected', async () => {
      const component = (value: any) => html`<p>${asyncAppend(value)}</p>`;
      const part = render(component(iterable), container);
      await iterable.push('1');
      assertContent('<p>1</p>');
      part.setConnected(false);
      await iterable.push('2');
      assertContent('<p>1</p>');
      part.setConnected(true);
      await nextFrame();
      assertContent('<p>12</p>');
      await iterable.push('3');
      assertContent('<p>123</p>');
    });

    test('disconnection thrashing', async () => {
      const component = (value: any) => html`<p>${asyncAppend(value)}</p>`;
      const part = render(component(iterable), container);
      await iterable.push('1');
      assertContent('<p>1</p>');
      part.setConnected(false);
      await iterable.push('2');
      part.setConnected(true);
      part.setConnected(false);
      await nextFrame();
      assertContent('<p>1</p>');
      part.setConnected(true);
      await nextFrame();
      assertContent('<p>12</p>');
      await iterable.push('3');
      assertContent('<p>123</p>');
    });

    test('does not render when newly rendered while disconnected', async () => {
      const component = (value: any) => html`<p>${value}</p>`;
      const part = render(component('static'), container);
      assertContent('<p>static</p>');
      part.setConnected(false);
      render(component(asyncAppend(iterable)), container);
      await iterable.push('1');
      assertContent('<p>static</p>');
      part.setConnected(true);
      await nextFrame();
      assertContent('<p>1</p>');
      await iterable.push('2');
      assertContent('<p>12</p>');
    });

    test('does not render when resolved and changed while disconnected', async () => {
      const component = (value: any) => html`<p>${value}</p>`;
      const part = render(component('staticA'), container);
      assertContent('<p>staticA</p>');
      part.setConnected(false);
      render(component(asyncAppend(iterable)), container);
      await iterable.push('1');
      assertContent('<p>staticA</p>');
      render(component('staticB'), container);
      assertContent('<p>staticB</p>');
      part.setConnected(true);
      await nextFrame();
      assertContent('<p>staticB</p>');
      await iterable.push('2');
      assertContent('<p>staticB</p>');
    });

    test('the same promise can be rendered into two asyncAppend instances', async () => {
      const component = (iterable: AsyncIterable<unknown>) =>
        html`<p>${asyncAppend(iterable)}</p><p>${asyncAppend(iterable)}</p>`;
      render(component(iterable), container);
      assertContent('<p></p><p></p>');
      await iterable.push('1');
      assertContent('<p>1</p><p>1</p>');
      await iterable.push('2');
      assertContent('<p>12</p><p>12</p>');
    });
  });

  memorySuite('memory leak tests', () => {
    test('tree with asyncAppend cleared while iterables are pending', async () => {
      const template = (v: unknown) => html`<div>${v}</div>`;
      // Make a big array set on an expando to exaggerate any leaked DOM
      const big = () => new Array(10000).fill(0);
      // Hold onto the iterables to prevent them from being gc'ed
      const iterables: Array<TestAsyncIterable<string>> = [];
      window.gc();
      const heap = performance.memory.usedJSHeapSize;
      for (let i = 0; i < 1000; i++) {
        // Iterable passed to asyncAppend that will never yield
        const iterable = new TestAsyncIterable<string>();
        iterables.push(iterable);
        // Render the directive into a `<span>` with a 10kb expando, to exaggerate
        // when DOM is not being gc'ed
        render(
          template(html`<span .p=${big()}>${asyncAppend(iterable)}</span>`),
          container
        );
        // Clear the `<span>` + directive
        render(template(nothing), container);
      }
      window.gc();
      // Allow a 50% margin of heap growth; due to the 10kb expando, an actual
      // DOM leak will be orders of magnitude larger
      assert.isAtMost(
        performance.memory.usedJSHeapSize,
        heap * 1.5,
        'memory leak detected'
      );
    });
  });
});

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {templateContent} from '../../directives/template-content.js';
import {render, html} from '../../index.js';
import {assert} from '@esm-bundle/chai';
import {makeAsserts} from '../test-utils/assert-render.js';

suite('templateContent', () => {
  let container: HTMLElement;
  const template = document.createElement('template');
  template.innerHTML = '<div>aaa</div>';

  setup(() => {
    container = document.createElement('div');
  });

  const {assertContent} = makeAsserts(() => container);

  test('renders a template', () => {
    render(html`<div>${templateContent(template)}</div>`, container);
    assertContent('<div><div>aaa</div></div>');
  });

  test('clones a template only once', () => {
    const go = () =>
      render(html`<div>${templateContent(template)}</div>`, container);
    go();
    assertContent('<div><div>aaa</div></div>');
    const templateDiv = container.querySelector('div > div') as HTMLDivElement;

    go();
    const templateDiv2 = container.querySelector('div > div') as HTMLDivElement;
    assert.equal(templateDiv, templateDiv2);
  });

  test('renders a new template over a previous one', () => {
    const go = (t: HTMLTemplateElement) =>
      render(html`<div>${templateContent(t)}</div>`, container);
    go(template);
    assertContent('<div><div>aaa</div></div>');

    const newTemplate = document.createElement('template');
    newTemplate.innerHTML = '<span>bbb</span>';
    go(newTemplate);
    assertContent('<div><span>bbb</span></div>');
  });

  test('re-renders a template over a non-templateContent value', () => {
    const go = (v: unknown) => render(html`<div>${v}</div>`, container);
    go(templateContent(template));
    assertContent('<div><div>aaa</div></div>');

    go('ccc');
    assertContent('<div>ccc</div>');

    go(templateContent(template));
    assertContent('<div><div>aaa</div></div>');
  });
});

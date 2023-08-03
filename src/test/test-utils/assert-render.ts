/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {RenderOptions, render} from '../../index.js';
import {assert} from '@esm-bundle/chai';
import {stripExpressionComments} from '@lit-labs/testing';

export const makeAsserts = (getContainer: () => HTMLElement) => {
  const assertRender = (
    r: unknown,
    expected: string | string[],
    options?: RenderOptions,
    message?: string
  ) => {
    const container = getContainer();
    const part = render(r, container, options);
    assertContent(expected, message);
    return part;
  };

  const assertContent = (expected: string | string[], message?: string) => {
    const container = getContainer();
    const cleanActual = stripExpressionComments(container.innerHTML);
    if (Array.isArray(expected)) {
      assert.oneOf(cleanActual, expected, message);
    } else {
      assert.equal(cleanActual, expected, message);
    }
  };
  return {assertRender, assertContent};
};

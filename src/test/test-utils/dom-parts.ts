/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {useDomParts} from '../../modes.js';
import {html as htmlImpl} from '../../ttl.js';
import {html as staticHtmlImpl} from '../../static.js';

// force a wrapper around html to always create a div to work around
// https://lit.dev/playground/#gist=fed0fb43c92cd1198e66f84b34ad48d4?
const wrapperMap = new WeakMap<TemplateStringsArray, TemplateStringsArray>();
export const html = (
  origStrings: TemplateStringsArray,
  ...values: unknown[]
) => {
  const wrapped = wrapperMap.get(origStrings);
  if (wrapped !== undefined) {
    return htmlImpl(wrapped, ...values);
  }
  interface FakeTemplateStringsArray extends Array<string> {
    raw: string[];
  }
  const strings = [...origStrings] as FakeTemplateStringsArray;
  strings[0] = '<fake>' + strings[0];
  strings[strings.length - 1] += '</fake>';
  strings.raw = strings;
  wrapperMap.set(origStrings, strings);
  return htmlImpl(strings as TemplateStringsArray, ...values);
};
export const fakeNodeMatcher = /<\/?fake>/g;

// force a wrapper around html to always create a div to work around
// https://lit.dev/playground/#gist=fed0fb43c92cd1198e66f84b34ad48d4?
const staticWrapperMap = new WeakMap<
  TemplateStringsArray,
  TemplateStringsArray
>();
export const staticHtml = (
  origStrings: TemplateStringsArray,
  ...values: unknown[]
) => {
  const wrapped = staticWrapperMap.get(origStrings);
  if (wrapped !== undefined) {
    return staticHtmlImpl(wrapped, ...values);
  }
  interface FakeTemplateStringsArray extends Array<string> {
    raw: string[];
  }
  const strings = [...origStrings] as FakeTemplateStringsArray;
  strings[0] = '<fake>' + strings[0];
  strings[strings.length - 1] += '</fake>';
  strings.raw = strings;
  wrapperMap.set(origStrings, strings);
  return staticHtmlImpl(strings as TemplateStringsArray, ...values);
};

export const skipIfDomParts = (() => {
  if (useDomParts) {
    return test.skip;
  } else {
    return test;
  }
})();

// We don't have dev mode warnings and errors implemented yet in the
// DOM Parts implementation.
export const devModeTest = skipIfDomParts;

// We don't yet support compiled templates in the DOM Parts implementation.
export const compiledSuite = (() => {
  if (useDomParts) {
    return suite.skip;
  } else {
    return suite;
  }
})();

// Marks tests that are broken by our <fake> wrappers.
export const brokenByFakeWrapper = test.skip;

// Our <fake> wrappers break tests that render raw content.
export const rawTest = brokenByFakeWrapper;

// Our <fake> wrappers break tests that render into comments
export const commentTest = brokenByFakeWrapper;

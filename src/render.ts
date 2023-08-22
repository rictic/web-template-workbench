/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ChildPart, RootPart} from './template.js';
import {DEV_MODE, domPartsSupported} from './modes.js';

/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
export interface RenderOptions {
  /**
   * An object to use as the `this` value for event listeners. It's often
   * useful to set this to the host component rendering a template.
   */
  host?: object;
  /**
   * A DOM node before which to render content in the container.
   */
  renderBefore?: ChildNode | null;
  /**
   * Node used for cloning the template (`importNode` will be called on this
   * node). This controls the `ownerDocument` of the rendered DOM, along with
   * any inherited context. Defaults to the global `document`.
   */
  creationScope?: {importNode(node: Node, deep?: boolean): Node};
  /**
   * The initial connected state for the top-level part being rendered. If no
   * `isConnected` option is set, `AsyncDirective`s will be connected by
   * default. Set to `false` if the initial render occurs in a disconnected tree
   * and `AsyncDirective`s should see `isConnected === false` for their initial
   * render. The `part.setConnected()` method must be used subsequent to initial
   * render to change the connected state of the part.
   */
  isConnected?: boolean;

  /**
   * Whether to use DOM parts for rendering. Defaults to `true` if DOM parts are
   * supported in the current browser, otherwise `false`.
   */
  useDomParts: boolean;
}

/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 *
 * This example renders the text "Hello, Zoe!" inside a paragraph tag, appending
 * it to the container `document.body`.
 *
 * ```js
 * import {html, render} from 'lit';
 *
 * const name = "Zoe";
 * render(html`<p>Hello, ${name}!</p>`, document.body);
 * ```
 *
 * @param value Any [renderable
 *   value](https://lit.dev/docs/templates/expressions/#child-expressions),
 *   typically a {@linkcode TemplateResult} created by evaluating a template tag
 *   like {@linkcode html} or {@linkcode svg}.
 * @param container A DOM container to render to. The first render will append
 *   the rendered value to the container, and subsequent renders will
 *   efficiently update the rendered value if the same result type was
 *   previously rendered there.
 * @param options See {@linkcode RenderOptions} for options documentation.
 * @see
 * {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Rendering Lit HTML Templates}
 */
export const render = (
  value: unknown,
  container: HTMLElement | DocumentFragment,
  options?: RenderOptions
): RootPart => {
  if (DEV_MODE && container == null) {
    // Give a clearer error message than
    //     Uncaught TypeError: Cannot read properties of null (reading
    //     '_$litPart$')
    // which reads like an internal Lit error.
    throw new TypeError(`The container to render into may not be ${container}`);
  }
  let part = new ChildPart(
    container.insertBefore(document.createComment(''), null),
    null,
    undefined,
    options ?? {useDomParts: domPartsSupported}
  );
  part._$setValue(value);
  return part as RootPart;
};

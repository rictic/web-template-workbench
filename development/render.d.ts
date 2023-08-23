/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
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
    creationScope?: {
        importNode(node: Node, deep?: boolean): Node;
    };
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
//# sourceMappingURL=render.d.ts.map
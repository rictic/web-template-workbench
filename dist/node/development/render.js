import { domPartsTemplateCache, manualTemplateCache, DomPartsTemplate, ManualTemplate, DomPartsTemplateInstance, ManualTemplateInstance } from './template.js';

/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
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
const render = (value, _container, options) => {
    const templateCache = options.useDomParts
        ? domPartsTemplateCache
        : manualTemplateCache;
    let template = templateCache.get(value.strings);
    if (template === undefined) {
        const Template = options.useDomParts
            ? DomPartsTemplate
            : ManualTemplate;
        templateCache.set(value.strings, (template = new Template(value)));
    }
    const TemplateInstance = options?.useDomParts
        ? DomPartsTemplateInstance
        : ManualTemplateInstance;
    const instance = new TemplateInstance(template);
    instance._clone(options);
};

export { render };
//# sourceMappingURL=render.js.map

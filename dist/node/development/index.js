import { isIterable, resolveDirective, ChildPart, AttributePart, BooleanAttributePart, EventPart, PropertyPart, ElementPart } from './template.js';
export { AttributePart, BooleanAttributePart, ChildPart, ElementPart, EventPart, PropertyPart, isIterable, noChange, nothing, resolveDirective } from './template.js';
import { boundAttributeSuffix, marker, markerMatch, getTemplateHtml } from './get-template-html.js';
import { HTML_RESULT } from './ttl.js';
export { HTML_RESULT, SVG_RESULT, html, svg } from './ttl.js';
export { render } from './render.js';
export { _testOnlyClearSanitizerFactoryDoNotCallOrElse, createSanitizer, noopSanitizer, sanitizerActive, setSanitizer } from './sanitizer.js';

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports  mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-element, which re-exports all of lit-html.
 *
 * @private
 */
const _$LH = {
    // Used in lit-ssr
    _boundAttributeSuffix: boundAttributeSuffix,
    _marker: marker,
    _markerMatch: markerMatch,
    _HTML_RESULT: HTML_RESULT,
    _getTemplateHtml: getTemplateHtml,
    // Used in tests and private-ssr-support
    // _TemplateInstance: TemplateInstance,
    _isIterable: isIterable,
    _resolveDirective: resolveDirective,
    _ChildPart: ChildPart,
    _AttributePart: AttributePart,
    _BooleanAttributePart: BooleanAttributePart,
    _EventPart: EventPart,
    _PropertyPart: PropertyPart,
    _ElementPart: ElementPart,
};

export { _$LH };
//# sourceMappingURL=index.js.map

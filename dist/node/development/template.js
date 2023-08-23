import { getTemplateHtml, marker, boundAttributeSuffix, rawTextElement, markerMatch } from './get-template-html.js';
import { templateFromLiterals } from './template-from-literals.js';
import { SVG_RESULT } from './ttl.js';

/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const d = document;
// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = () => d.createComment('');
const isArray = Array.isArray;
const isIterable = (value) => isArray(value) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof value?.[Symbol.iterator] === 'function';
// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;
/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - the must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const manualTemplateCache = new WeakMap();
const domPartsTemplateCache = new WeakMap();
const walker = d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */);
class ManualTemplate {
    constructor(
    // This property needs to remain unminified.
    { strings, ['_$litType$']: type }, options) {
        this.parts = [];
        console.log(`creating a manual template`);
        let node;
        let nodeIndex = 0;
        let attrNameIndex = 0;
        const partCount = strings.length - 1;
        const parts = this.parts;
        // Create template element
        const [html, attrNames] = getTemplateHtml(strings, type);
        this.el = ManualTemplate.createElement(html, options);
        walker.currentNode = this.el.content;
        // Re-parent SVG nodes into template root
        if (type === SVG_RESULT) {
            const svgElement = this.el.content.firstChild;
            svgElement.replaceWith(...svgElement.childNodes);
        }
        // Walk the template to find binding markers and create TemplateParts
        while ((node = walker.nextNode()) !== null && parts.length < partCount) {
            if (node.nodeType === 1) {
                {
                    const tag = node.localName;
                    // Warn if `textarea` includes an expression and throw if `template`
                    // does since these are not supported. We do this by checking
                    // innerHTML for anything that looks like a marker. This catches
                    // cases like bindings in textarea there markers turn into text nodes.
                    if (/^(?:textarea|template)$/i.test(tag) &&
                        node.innerHTML.includes(marker)) {
                        const m = `Expressions are not supported inside \`${tag}\` ` +
                            `elements. See https://lit.dev/msg/expression-in-${tag} for more ` +
                            `information.`;
                        if (tag === 'template') {
                            throw new Error(m);
                        }
                    }
                }
                // TODO (justinfagnani): for attempted dynamic tag names, we don't
                // increment the bindingIndex, and it'll be off by 1 in the element
                // and off by two after it.
                if (node.hasAttributes()) {
                    for (const name of node.getAttributeNames()) {
                        if (name.endsWith(boundAttributeSuffix)) {
                            const realName = attrNames[attrNameIndex++];
                            const value = node.getAttribute(name);
                            const statics = value.split(marker);
                            const m = /([.?@])?(.*)/.exec(realName);
                            parts.push({
                                type: ATTRIBUTE_PART,
                                index: nodeIndex,
                                name: m[2],
                                strings: statics,
                                ctor: AttributePart,
                            });
                            node.removeAttribute(name);
                        }
                        else if (name.startsWith(marker)) {
                            parts.push({
                                type: ELEMENT_PART,
                                index: nodeIndex,
                            });
                            node.removeAttribute(name);
                        }
                    }
                }
                // TODO (justinfagnani): benchmark the regex against testing for each
                // of the 3 raw text element names.
                if (rawTextElement.test(node.tagName)) {
                    // For raw text elements we need to split the text content on
                    // markers, create a Text node for each segment, and create
                    // a TemplatePart for each marker.
                    const strings = node.textContent.split(marker);
                    const lastIndex = strings.length - 1;
                    if (lastIndex > 0) {
                        node.textContent = window.trustedTypes
                            ? window.trustedTypes.emptyScript
                            : '';
                        // Generate a new text node for each literal section
                        // These nodes are also used as the markers for node parts
                        // We can't use empty text nodes as markers because they're
                        // normalized when cloning in IE (could simplify when
                        // IE is no longer supported)
                        for (let i = 0; i < lastIndex; i++) {
                            node.append(strings[i], createMarker());
                            // Walk past the marker node we just added
                            walker.nextNode();
                            parts.push({ type: CHILD_PART, index: ++nodeIndex });
                        }
                        // Note because this marker is added after the walker's current
                        // node, it will be walked to in the outer loop (and ignored), so
                        // we don't need to adjust nodeIndex here
                        node.append(strings[lastIndex], createMarker());
                    }
                }
            }
            else if (node.nodeType === 8) {
                const data = node.data;
                if (data === markerMatch) {
                    parts.push({ type: CHILD_PART, index: nodeIndex });
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        parts.push({ type: COMMENT_PART, index: nodeIndex });
                        // Move to the end of the match
                        i += marker.length - 1;
                    }
                }
            }
            nodeIndex++;
        }
        // We could set walker.currentNode to another node here to prevent a memory
        // leak, but every time we prepare a template, we immediately render it
        // and re-use the walker in new TemplateInstance._clone().
    }
    // Overridden via `litHtmlPolyfillSupport` to provide platform support.
    /** @nocollapse */
    static createElement(html, _options) {
        const el = d.createElement('template');
        el.innerHTML = html;
        return el;
    }
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class ManualTemplateInstance {
    constructor(template) {
        this._$parts = [];
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$template = template;
    }
    // This method is separate from the constructor because we need to return a
    // DocumentFragment and we don't want to hold onto it with an instance field.
    _clone(options) {
        const { el: { content }, parts: parts, } = this._$template;
        const fragment = (options?.creationScope ?? d).importNode(content, true);
        walker.currentNode = fragment;
        let node = walker.nextNode();
        let nodeIndex = 0;
        let partIndex = 0;
        let templatePart = parts[0];
        while (templatePart !== undefined) {
            if (nodeIndex === templatePart.index) {
                let part;
                if (templatePart.type === CHILD_PART) {
                    part = new ChildPart(node, node.nextSibling, this, options);
                }
                else if (templatePart.type === ATTRIBUTE_PART) {
                    part = new templatePart.ctor(node, templatePart.name, templatePart.strings, this, options);
                }
                this._$parts.push(part);
                templatePart = parts[++partIndex];
            }
            if (nodeIndex !== templatePart?.index) {
                node = walker.nextNode();
                nodeIndex++;
            }
        }
        // We need to set the currentNode away from the cloned tree so that we
        // don't hold onto the tree even if the tree is detached and should be
        // freed.
        walker.currentNode = d;
        return fragment;
    }
}
class DomPartsTemplate {
    constructor(
    // This property needs to remain unminified.
    { strings, ['_$litType$']: type }, _options) {
        this.parts = [];
        console.log(`creating a DOM Parts template`);
        // Create template element
        this.el = templateFromLiterals(strings, type, true);
        // Re-parent SVG nodes into template root
        if (type === SVG_RESULT) {
            const svgElement = this.el.content.firstChild;
            svgElement.replaceWith(...svgElement.childNodes);
        }
        const parts = this.el.content.getPartRoot().getParts();
        let index = -1;
        for (const part of parts) {
            index++;
            if (part instanceof NodePart) {
                let attributePart;
                for (let i = 0; i < part.metadata.length; i++) {
                    const code = part.metadata[i];
                    if (code === 'd') {
                        if (attributePart !== undefined) {
                            this.parts.push(attributePart);
                            attributePart = undefined;
                        }
                        this.parts.push({
                            type: ELEMENT_PART,
                            index,
                        });
                    }
                    else if (code === 'attr') {
                        if (attributePart !== undefined) {
                            this.parts.push(attributePart);
                        }
                        let name = part.metadata[++i];
                        attributePart = {
                            type: ATTRIBUTE_PART,
                            index,
                            name,
                            ctor: AttributePart,
                            strings: [],
                        };
                    }
                    else if (code[0] === '"') {
                        attributePart.strings.push(JSON.parse(code));
                    }
                }
                if (attributePart !== undefined) {
                    this.parts.push(attributePart);
                }
            }
            else if (part instanceof ChildNodePart) {
                this.parts.push({
                    type: CHILD_PART,
                    index,
                });
            }
        }
    }
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class DomPartsTemplateInstance {
    constructor(template) {
        this._$parts = [];
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$template = template;
    }
    // This method is separate from the constructor because we need to return a
    // DocumentFragment and we don't want to hold onto it with an instance field.
    _clone(options) {
        const { el: { content }, parts: parts, } = this._$template;
        const domPartRoot = content.getPartRoot().clone();
        const domParts = domPartRoot.getParts();
        const fragment = document.adoptNode(domPartRoot.rootContainer);
        // See: https://github.com/tbondwilkinson/dom-parts/issues/6
        // customElements.upgrade(fragment);
        for (const part of parts) {
            const domPart = domParts[part.index];
            switch (part.type) {
                case CHILD_PART:
                    this._$parts.push(new ChildPart(domPart.previousSibling, domPart.nextSibling, this, options));
                    break;
                case ATTRIBUTE_PART: {
                    this._$parts.push(new part.ctor(domPart.node, part.name, part.strings, this, options));
                    break;
                }
            }
        }
        return fragment;
    }
}
class ChildPart {
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        // ChildParts that are not at the root should always be created with a
        // parent; only RootChildNode's won't, so they return the local isConnected
        // state
        return this._$parent?._$isConnected ?? this.__isConnected;
    }
    constructor(startNode, endNode, _parent, options) {
        this.type = CHILD_PART;
        this._$committedValue = '';
        // The following fields will be patched onto ChildParts when required by
        // AsyncDirective
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$startNode = startNode;
        this._$endNode = endNode;
        this.options = options;
        // Note __isConnected is only ever accessed on RootParts (i.e. when there is
        // no _$parent); the value on a non-root-part is "don't care", but checking
        // for parent would be more code
        this.__isConnected = options?.isConnected ?? true;
    }
}
class AttributePart {
    get tagName() {
        return this.element.tagName;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    constructor(element, name, strings, parent, options) {
        this.type = ATTRIBUTE_PART;
        /** @internal */
        this._$committedValue = [];
        /** @internal */
        this._$disconnectableChildren = undefined;
        this.element = element;
        this.name = name;
        this._$parent = parent;
        this.options = options;
        if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
            this._$committedValue = new Array(strings.length - 1).fill(new String());
            this.strings = strings;
        }
        else {
            this._$committedValue = '';
        }
    }
}

export { AttributePart, ChildPart, DomPartsTemplate, DomPartsTemplateInstance, ManualTemplate, ManualTemplateInstance, domPartsTemplateCache, isIterable, manualTemplateCache };
//# sourceMappingURL=template.js.map

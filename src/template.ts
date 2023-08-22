/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  boundAttributeSuffix,
  getTemplateHtml,
  marker,
  markerMatch,
  rawTextElement,
} from './get-template-html.js';
import {DEV_MODE} from './modes.js';
import {RenderOptions} from './render.js';
import {templateFromLiterals} from './template-from-literals.js';
import {SVG_RESULT, TemplateResult} from './ttl.js';

const d = document;

// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = () => d.createComment('');

// https://tc39.github.io/ecma262/#sec-typeof-operator
type Primitive = null | undefined | boolean | number | string | symbol | bigint;
const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value != 'object' && typeof value != 'function');
const isArray = Array.isArray;
export const isIterable = (value: unknown): value is Iterable<unknown> =>
  isArray(value) ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (value as any)?.[Symbol.iterator] === 'function';

// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;

/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - the must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const manualTemplateCache = new WeakMap<TemplateStringsArray, ManualTemplate>();
const domPartsTemplateCache = new WeakMap<
  TemplateStringsArray,
  DomPartsTemplate
>();

const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */
);

export interface Disconnectable {
  _$parent?: Disconnectable;
  _$disconnectableChildren?: Set<Disconnectable>;
  // Rather than hold connection state on instances, Disconnectables recursively
  // fetch the connection state from the RootPart they are connected in via
  // getters up the Disconnectable tree via _$parent references. This pushes the
  // cost of tracking the isConnected state to `AsyncDirectives`, and avoids
  // needing to pass all Disconnectables (parts, template instances, and
  // directives) their connection state each time it changes, which would be
  // costly for trees that have no AsyncDirectives.
  _$isConnected: boolean;
}

export type Template = ManualTemplate | DomPartsTemplate;
class ManualTemplate {
  /** @internal */
  el!: HTMLTemplateElement;

  parts: Array<TemplatePart> = [];

  constructor(
    // This property needs to remain unminified.
    {strings, ['_$litType$']: type}: TemplateResult,
    options?: RenderOptions
  ) {
    console.log(`creating a manual template`);
    let node: Node | null;
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
      const svgElement = this.el.content.firstChild!;
      svgElement.replaceWith(...svgElement.childNodes);
    }

    // Walk the template to find binding markers and create TemplateParts
    while ((node = walker.nextNode()) !== null && parts.length < partCount) {
      if (node.nodeType === 1) {
        if (DEV_MODE) {
          const tag = (node as Element).localName;
          // Warn if `textarea` includes an expression and throw if `template`
          // does since these are not supported. We do this by checking
          // innerHTML for anything that looks like a marker. This catches
          // cases like bindings in textarea there markers turn into text nodes.
          if (
            /^(?:textarea|template)$/i!.test(tag) &&
            (node as Element).innerHTML.includes(marker)
          ) {
            const m =
              `Expressions are not supported inside \`${tag}\` ` +
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
        if ((node as Element).hasAttributes()) {
          for (const name of (node as Element).getAttributeNames()) {
            if (name.endsWith(boundAttributeSuffix)) {
              const realName = attrNames[attrNameIndex++];
              const value = (node as Element).getAttribute(name)!;
              const statics = value.split(marker);
              const m = /([.?@])?(.*)/.exec(realName)!;
              parts.push({
                type: ATTRIBUTE_PART,
                index: nodeIndex,
                name: m[2],
                strings: statics,
                ctor: AttributePart,
              });
              (node as Element).removeAttribute(name);
            } else if (name.startsWith(marker)) {
              parts.push({
                type: ELEMENT_PART,
                index: nodeIndex,
              });
              (node as Element).removeAttribute(name);
            }
          }
        }
        // TODO (justinfagnani): benchmark the regex against testing for each
        // of the 3 raw text element names.
        if (rawTextElement.test((node as Element).tagName)) {
          // For raw text elements we need to split the text content on
          // markers, create a Text node for each segment, and create
          // a TemplatePart for each marker.
          const strings = (node as Element).textContent!.split(marker);
          const lastIndex = strings.length - 1;
          if (lastIndex > 0) {
            (node as Element).textContent = window.trustedTypes
              ? (window.trustedTypes.emptyScript as unknown as '')
              : '';
            // Generate a new text node for each literal section
            // These nodes are also used as the markers for node parts
            // We can't use empty text nodes as markers because they're
            // normalized when cloning in IE (could simplify when
            // IE is no longer supported)
            for (let i = 0; i < lastIndex; i++) {
              (node as Element).append(strings[i], createMarker());
              // Walk past the marker node we just added
              walker.nextNode();
              parts.push({type: CHILD_PART, index: ++nodeIndex});
            }
            // Note because this marker is added after the walker's current
            // node, it will be walked to in the outer loop (and ignored), so
            // we don't need to adjust nodeIndex here
            (node as Element).append(strings[lastIndex], createMarker());
          }
        }
      } else if (node.nodeType === 8) {
        const data = (node as Comment).data;
        if (data === markerMatch) {
          parts.push({type: CHILD_PART, index: nodeIndex});
        } else {
          let i = -1;
          while ((i = (node as Comment).data.indexOf(marker, i + 1)) !== -1) {
            // Comment node has a binding marker inside, make an inactive part
            // The binding won't work, but subsequent bindings will
            parts.push({type: COMMENT_PART, index: nodeIndex});
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
  static createElement(html: TrustedHTML, _options?: RenderOptions) {
    const el = d.createElement('template');
    el.innerHTML = html as unknown as string;
    return el;
  }
}

/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class ManualTemplateInstance implements Disconnectable {
  _$template: Template;
  _$parts: Array<Part | undefined> = [];

  /** @internal */
  _$parent: ChildPart;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  constructor(template: Template, parent: ChildPart) {
    this._$template = template;
    this._$parent = parent;
  }

  // Called by ChildPart parentNode getter
  get parentNode() {
    return this._$parent.parentNode;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  _clone(options: RenderOptions) {
    const {
      el: {content},
      parts: parts,
    } = this._$template;
    const fragment = (options?.creationScope ?? d).importNode(content, true);
    walker.currentNode = fragment;

    let node = walker.nextNode()!;
    let nodeIndex = 0;
    let partIndex = 0;
    let templatePart = parts[0];

    while (templatePart !== undefined) {
      if (nodeIndex === templatePart.index) {
        let part: Part | undefined;
        if (templatePart.type === CHILD_PART) {
          part = new ChildPart(
            node as HTMLElement,
            node.nextSibling,
            this,
            options
          );
        } else if (templatePart.type === ATTRIBUTE_PART) {
          part = new templatePart.ctor(
            node as HTMLElement,
            templatePart.name,
            templatePart.strings,
            this,
            options
          );
        }
        this._$parts.push(part);
        templatePart = parts[++partIndex];
      }
      if (nodeIndex !== templatePart?.index) {
        node = walker.nextNode()!;
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
  /** @internal */
  el!: HTMLTemplateElement;

  readonly parts: Array<TemplatePart> = [];

  constructor(
    // This property needs to remain unminified.
    {strings, ['_$litType$']: type}: TemplateResult,
    _options?: RenderOptions
  ) {
    console.log(`creating a DOM Parts template`);
    // Create template element
    this.el = templateFromLiterals(strings, type, true);
    // Re-parent SVG nodes into template root
    if (type === SVG_RESULT) {
      const svgElement = this.el.content.firstChild!;
      svgElement.replaceWith(...svgElement.childNodes);
    }

    const parts = this.el.content.getPartRoot().getParts();
    let index = -1;
    for (const part of parts) {
      index++;
      if (part instanceof NodePart) {
        let attributePart:
          | undefined
          | (Omit<AttributeTemplatePart, 'strings'> & {strings: string[]});

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
          } else if (code === 'attr') {
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
          } else if (code[0] === '"') {
            attributePart!.strings.push(JSON.parse(code));
          }
        }
        if (attributePart !== undefined) {
          this.parts.push(attributePart);
        }
      } else if (part instanceof ChildNodePart) {
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
class DomPartsTemplateInstance implements Disconnectable {
  _$template: Template;
  _$parts: Array<Part | undefined> = [];

  /** @internal */
  _$parent: ChildPart;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  constructor(template: DomPartsTemplate, parent: ChildPart) {
    this._$template = template;
    this._$parent = parent;
  }

  // Called by ChildPart parentNode getter
  get parentNode() {
    return this._$parent.parentNode;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  _clone(options: RenderOptions) {
    const {
      el: {content},
      parts: parts,
    } = this._$template;
    const domPartRoot = content.getPartRoot().clone();
    const domParts = domPartRoot.getParts();
    const fragment = document.adoptNode(domPartRoot.rootContainer);
    // See: https://github.com/tbondwilkinson/dom-parts/issues/6
    // customElements.upgrade(fragment);
    for (const part of parts) {
      const domPart = domParts[part.index];
      switch (part.type) {
        case CHILD_PART:
          this._$parts.push(
            new ChildPart(
              (domPart as ChildNodePart).previousSibling,
              (domPart as ChildNodePart).nextSibling as ChildNode,
              this,
              options
            )
          );
          break;
        case ATTRIBUTE_PART: {
          this._$parts.push(
            new (part as AttributeTemplatePart).ctor(
              (domPart as NodePart).node as HTMLElement,
              (part as AttributeTemplatePart).name,
              (part as AttributeTemplatePart).strings,
              this,
              options
            )
          );
          break;
        }
      }
    }
    return fragment;
  }
}

export type TemplateInstance =
  | DomPartsTemplateInstance
  | ManualTemplateInstance;

/*
 * Parts
 */
type AttributeTemplatePart = {
  readonly type: typeof ATTRIBUTE_PART;
  readonly index: number;
  readonly name: string;
  readonly ctor: typeof AttributePart;
  readonly strings: ReadonlyArray<string>;
};
type ChildTemplatePart = {
  readonly type: typeof CHILD_PART;
  readonly index: number;
};
type ElementTemplatePart = {
  readonly type: typeof ELEMENT_PART;
  readonly index: number;
};
type CommentTemplatePart = {
  readonly type: typeof COMMENT_PART;
  readonly index: number;
};

/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
type TemplatePart =
  | ChildTemplatePart
  | AttributeTemplatePart
  | ElementTemplatePart
  | CommentTemplatePart;

export type Part = ChildPart | AttributePart;

export class ChildPart implements Disconnectable {
  readonly type = CHILD_PART;
  readonly options: RenderOptions;
  _$committedValue: unknown = '';
  /** @internal */
  _$startNode: ChildNode;
  /** @internal */
  _$endNode: ChildNode | null;
  /** @internal */
  _$parent: Disconnectable | undefined;
  /**
   * Connection state for RootParts only (i.e. ChildPart without _$parent
   * returned from top-level `render`). This field is unsed otherwise. The
   * intention would clearer if we made `RootPart` a subclass of `ChildPart`
   * with this field (and a different _$isConnected getter), but the subclass
   * caused a perf regression, possibly due to making call sites polymorphic.
   * @internal
   */
  __isConnected: boolean;

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    // ChildParts that are not at the root should always be created with a
    // parent; only RootChildNode's won't, so they return the local isConnected
    // state
    return this._$parent?._$isConnected ?? this.__isConnected;
  }

  // The following fields will be patched onto ChildParts when required by
  // AsyncDirective
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;
  /** @internal */
  _$notifyConnectionChanged?(
    isConnected: boolean,
    removeFromParent?: boolean,
    from?: number
  ): void;
  /** @internal */
  _$reparentDisconnectables?(parent: Disconnectable): void;

  constructor(
    startNode: ChildNode,
    endNode: ChildNode | null,
    parent: TemplateInstance | ChildPart | undefined,
    options: RenderOptions
  ) {
    this._$startNode = startNode;
    this._$endNode = endNode;
    this._$parent = parent;
    this.options = options;
    // Note __isConnected is only ever accessed on RootParts (i.e. when there is
    // no _$parent); the value on a non-root-part is "don't care", but checking
    // for parent would be more code
    this.__isConnected = options?.isConnected ?? true;
  }

  /**
   * The parent node into which the part renders its content.
   *
   * A ChildPart's content consists of a range of adjacent child nodes of
   * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
   * `.endNode`).
   *
   * - If both `.startNode` and `.endNode` are non-null, then the part's content
   * consists of all siblings between `.startNode` and `.endNode`, exclusively.
   *
   * - If `.startNode` is non-null but `.endNode` is null, then the part's
   * content consists of all siblings following `.startNode`, up to and
   * including the last child of `.parentNode`. If `.endNode` is non-null, then
   * `.startNode` will always be non-null.
   *
   * - If both `.endNode` and `.startNode` are null, then the part's content
   * consists of all child nodes of `.parentNode`.
   */
  get parentNode(): Node {
    let parentNode: Node = this._$startNode.parentNode!;
    const parent = this._$parent;
    if (
      parent !== undefined &&
      parentNode?.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */
    ) {
      // If the parentNode is a DocumentFragment, it may be because the DOM is
      // still in the cloned fragment during initial render; if so, get the real
      // parentNode the part will be committed into by asking the parent.
      parentNode = (parent as ChildPart | TemplateInstance).parentNode;
    }
    return parentNode;
  }

  /**
   * The part's leading marker node, if any. See `.parentNode` for more
   * information.
   */
  get startNode(): Node | null {
    return this._$startNode;
  }

  /**
   * The part's trailing marker node, if any. See `.parentNode` for more
   * information.
   */
  get endNode(): Node | null {
    return this._$endNode;
  }

  _$setValue(value: unknown): void {
    if (DEV_MODE && this.parentNode === null) {
      throw new Error(
        `This \`ChildPart\` has no \`parentNode\` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's \`innerHTML\` or \`textContent\` can do this.`
      );
    }
    if (isPrimitive(value)) {
      // Non-rendering child values. It's important that these do not render
      // empty text nodes to avoid issues with preventing default <slot>
      // fallback content.
      if (value == null || value === '') {
        this._$clear();
        this._$committedValue = '';
      } else if (value !== this._$committedValue) {
        this._commitText(value);
      }
      // This property needs to remain unminified.
    } else if ((value as TemplateResult)['_$litType$'] !== undefined) {
      this._commitTemplateResult(value as TemplateResult);
    } else if ((value as Node).nodeType !== undefined) {
      if (DEV_MODE && this.options?.host === value) {
        this._commitText(
          `[probable mistake: rendered a template's host in itself ` +
            `(commonly caused by writing \${this} in a template]`
        );
        console.warn(
          `Attempted to render the template host`,
          value,
          `inside itself. This is almost always a mistake, and in dev mode `,
          `we render some warning text. In production however, we'll `,
          `render it, which will usually result in an error, and sometimes `,
          `in the element disappearing from the DOM.`
        );
        return;
      }
      this._commitNode(value as Node);
    } else if (isIterable(value)) {
      this._commitIterable(value);
    } else {
      // Fallback, will render the string representation
      this._commitText(value);
    }
  }

  private _insert<T extends Node>(node: T) {
    return this._$startNode.parentNode!.insertBefore(node, this._$endNode);
  }

  private _commitNode(value: Node): void {
    if (this._$committedValue !== value) {
      this._$clear();
      this._$committedValue = this._insert(value);
    }
  }

  private _commitText(value: unknown): void {
    // If the committed value is a primitive it means we called _commitText on
    // the previous render, and we know that this._$startNode.nextSibling is a
    // Text node. We can now just replace the text content (.data) of the node.
    if (isPrimitive(this._$committedValue)) {
      const node = this._$startNode.nextSibling as Text;
      (node as Text).data = value as string;
    } else {
      this._commitNode(d.createTextNode(value as string));
    }
    this._$committedValue = value;
  }

  private _commitTemplateResult(result: TemplateResult): void {
    const template: Template = this._$getTemplate(result);

    if ((this._$committedValue as TemplateInstance)?._$template === template) {
    } else {
      const TemplateInstance = this.options?.useDomParts
        ? DomPartsTemplateInstance
        : ManualTemplateInstance;
      const instance = new TemplateInstance(template as Template, this);
      instance._clone(this.options);
    }
  }

  // Overridden via `litHtmlPolyfillSupport` to provide platform support.
  /** @internal */
  _$getTemplate(result: TemplateResult) {
    const templateCache = this.options.useDomParts
      ? domPartsTemplateCache
      : manualTemplateCache;
    let template = templateCache.get(result.strings);
    if (template === undefined) {
      const Template = this.options.useDomParts
        ? DomPartsTemplate
        : ManualTemplate;
      templateCache.set(result.strings, (template = new Template(result)));
    }
    return template;
  }

  private _commitIterable(value: Iterable<unknown>): void {
    // For an Iterable, we create a new InstancePart per item, then set its
    // value to the item. This is a little bit of overhead for every item in
    // an Iterable, but it lets us recurse easily and efficiently update Arrays
    // of TemplateResults that will be commonly returned from expressions like:
    // array.map((i) => html`${i}`), by reusing existing TemplateInstances.

    // If value is an array, then the previous render was of an
    // iterable and value will contain the ChildParts from the previous
    // render. If value is not an array, clear this part and make a new
    // array for ChildParts.
    if (!isArray(this._$committedValue)) {
      this._$committedValue = [];
      this._$clear();
    }

    // Lets us keep track of how many items we stamped so we can clear leftover
    // items from a previous render
    const itemParts = this._$committedValue as ChildPart[];
    let partIndex = 0;
    let itemPart: ChildPart | undefined;

    for (const item of value) {
      if (partIndex === itemParts.length) {
        // If no existing part, create a new one
        // TODO (justinfagnani): test perf impact of always creating two parts
        // instead of sharing parts between nodes
        // https://github.com/lit/lit/issues/1266
        itemParts.push(
          (itemPart = new ChildPart(
            this._insert(createMarker()),
            this._insert(createMarker()),
            this,
            this.options
          ))
        );
      } else {
        // Reuse an existing part
        itemPart = itemParts[partIndex];
      }
      itemPart._$setValue(item);
      partIndex++;
    }

    if (partIndex < itemParts.length) {
      // itemParts always have end nodes
      this._$clear(itemPart && itemPart._$endNode!.nextSibling, partIndex);
      // Truncate the parts array so _value reflects the current state
      itemParts.length = partIndex;
    }
  }

  /**
   * Removes the nodes contained within this Part from the DOM.
   *
   * @param start Start node to clear from, for clearing a subset of the part's
   *     DOM (used when truncating iterables)
   * @param from  When `start` is specified, the index within the iterable from
   *     which ChildParts are being removed, used for disconnecting directives in
   *     those Parts.
   *
   * @internal
   */
  _$clear(
    start: ChildNode | null = this._$startNode.nextSibling,
    from?: number
  ) {
    this._$notifyConnectionChanged?.(false, true, from);
    while (start && start !== this._$endNode) {
      const n = start!.nextSibling;
      (start! as Element).remove();
      start = n;
    }
  }
  /**
   * Implementation of RootPart's `isConnected`. Note that this metod
   * should only be called on `RootPart`s (the `ChildPart` returned from a
   * top-level `render()` call). It has no effect on non-root ChildParts.
   * @param isConnected Whether to set
   * @internal
   */
  setConnected(isConnected: boolean) {
    if (this._$parent === undefined) {
      this.__isConnected = isConnected;
      this._$notifyConnectionChanged?.(isConnected);
    } else if (DEV_MODE) {
      throw new Error(
        'part.setConnected() may only be called on a ' +
          'RootPart returned from render().'
      );
    }
  }
}

/**
 * A top-level `ChildPart` returned from `render` that manages the connected
 * state of `AsyncDirective`s created throughout the tree below it.
 */
export interface RootPart extends ChildPart {
  /**
   * Sets the connection state for `AsyncDirective`s contained within this root
   * ChildPart.
   *
   * lit-html does not automatically monitor the connectedness of DOM rendered;
   * as such, it is the responsibility of the caller to `render` to ensure that
   * `part.setConnected(false)` is called before the part object is potentially
   * discarded, to ensure that `AsyncDirective`s have a chance to dispose of
   * any resources being held. If a `RootPart` that was previously
   * disconnected is subsequently re-connected (and its `AsyncDirective`s should
   * re-connect), `setConnected(true)` should be called.
   *
   * @param isConnected Whether directives within this tree should be connected
   * or not
   */
  setConnected(isConnected: boolean): void;
}

export class AttributePart implements Disconnectable {
  readonly type = ATTRIBUTE_PART as
    | typeof ATTRIBUTE_PART
    | typeof PROPERTY_PART
    | typeof BOOLEAN_ATTRIBUTE_PART
    | typeof EVENT_PART;
  readonly element: HTMLElement;
  readonly name: string;
  readonly options: RenderOptions | undefined;

  /**
   * If this attribute part represents an interpolation, this contains the
   * static strings of the interpolation. For single-value, complete bindings,
   * this is undefined.
   */
  readonly strings?: ReadonlyArray<string>;
  /** @internal */
  _$committedValue: unknown | Array<unknown> = [];
  /** @internal */
  _$parent: Disconnectable;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  get tagName() {
    return this.element.tagName;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    this.element = element;
    this.name = name;
    this._$parent = parent;
    this.options = options;
    if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
      this._$committedValue = new Array(strings.length - 1).fill(new String());
      this.strings = strings;
    } else {
      this._$committedValue = '';
    }
  }

  /**
   * Sets the value of this part by resolving the value from possibly multiple
   * values and static strings and committing it to the DOM.
   * If this part is single-valued, `this._strings` will be undefined, and the
   * method will be called with a single value argument. If this part is
   * multi-value, `this._strings` will be defined, and the method is called
   * with the value array of the part's owning TemplateInstance, and an offset
   * into the value array from which the values should be read.
   * This method is overloaded this way to eliminate short-lived array slices
   * of the template instance values, and allow a fast-path for single-valued
   * parts.
   *
   * @param value The part value, or an array of values for multi-valued parts
   * @param valueIndex the index to start reading values from. `undefined` for
   *   single-valued parts
   * @param noCommit causes the part to not commit its value to the DOM. Used
   *   in hydration to prime attribute parts with their first-rendered value,
   *   but not set the attribute, and in SSR to no-op the DOM operation and
   *   capture the value for serialization.
   *
   * @internal
   */
  _$setValue(
    value: unknown | Array<unknown>,
    valueIndex?: number,
    noCommit?: boolean
  ) {
    const strings = this.strings;

    // Whether any of the values has changed, for dirty-checking
    let change = false;

    if (strings === undefined) {
      change = !isPrimitive(value) || value !== this._$committedValue;
      if (change) {
        this._$committedValue = value;
      }
    } else {
      // Interpolation case
      const values = value as Array<unknown>;
      value = strings[0];

      let i, v;
      for (i = 0; i < strings.length - 1; i++) {
        v = values[valueIndex! + i];

        change ||=
          !isPrimitive(v) || v !== (this._$committedValue as Array<unknown>)[i];
        value += (v ?? '') + strings[i + 1];
        // We always record each value, even if one is `nothing`, for future
        // change detection.
        (this._$committedValue as Array<unknown>)[i] = v;
      }
    }
    if (change && !noCommit) {
      this._commitValue(value);
    }
  }

  /** @internal */
  _commitValue(value: unknown) {
    this.element.setAttribute(this.name, (value ?? '') as string);
  }
}

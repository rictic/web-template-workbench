/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Directive, DirectiveResult, PartInfo} from './directive.js';
import {
  boundAttributeSuffix,
  getTemplateHtml,
  marker,
  markerMatch,
  rawTextElement,
  trustFromTemplateString,
} from './get-template-html.js';
import {
  DEV_MODE,
  ENABLE_EXTRA_SECURITY_HOOKS,
  NODE_MODE,
  mustSortParts,
  sortDomParts,
  useDomParts,
} from './modes.js';
import {RenderOptions} from './render.js';
import {ValueSanitizer, createSanitizer, sanitizerActive} from './sanitizer.js';
import {templateFromLiterals} from './template-from-literals.js';
import {SVG_RESULT, TemplateResult} from './ttl.js';

// Allows minifiers to rename references to globalThis
const global = globalThis;

const d =
  NODE_MODE && global.document === undefined
    ? ({
        createTreeWalker() {
          return {};
        },
      } as unknown as Document)
    : document;

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

export interface CompiledTemplate extends Omit<Template, 'el'> {
  // el is overridden to be optional. We initialize it on first render
  el?: HTMLTemplateElement;

  // The prepared HTML string to create a template element from.
  // The type is a TemplateStringsArray to guarantee that the value came from
  // source code, preventing a JSON injection attack.
  h: TemplateStringsArray;
}

export interface CompiledTemplateResult {
  // This property needs to remain unminified.
  ['_$litType$']: CompiledTemplate;
  values: unknown[];
}

/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
export const noChange = Symbol.for('lit-noChange');

/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Prefer using `nothing` over other falsy values as it provides a consistent
 * behavior between various expression binding contexts.
 *
 * In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
 * same and render no nodes. In attribute expressions, `nothing` _removes_ the
 * attribute, while `undefined` and `null` will render an empty string. In
 * property expressions `nothing` becomes `undefined`.
 */
export const nothing = Symbol.for('lit-nothing');

/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - the must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const templateCache = new WeakMap<TemplateStringsArray, Template>();

const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */
);

// Type for classes that have a `_directive` or `_directives[]` field, used by
// `resolveDirective`
export interface DirectiveParent {
  _$parent?: DirectiveParent;
  _$isConnected: boolean;
  __directive?: Directive;
  __directives?: Array<Directive | undefined>;
}

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

export function resolveDirective(
  part: ChildPart | AttributePart | ElementPart,
  value: unknown,
  parent: DirectiveParent = part,
  attributeIndex?: number
): unknown {
  // Bail early if the value is explicitly noChange. Note, this means any
  // nested directive is still attached and is not run.
  if (value === noChange) {
    return value;
  }
  let currentDirective =
    attributeIndex !== undefined
      ? (parent as AttributePart).__directives?.[attributeIndex]
      : (parent as ChildPart | ElementPart | Directive).__directive;
  const nextDirectiveConstructor = isPrimitive(value)
    ? undefined
    : // This property needs to remain unminified.
      (value as DirectiveResult)['_$litDirective$'];
  if (currentDirective?.constructor !== nextDirectiveConstructor) {
    // This property needs to remain unminified.
    currentDirective?.['_$notifyDirectiveConnectionChanged']?.(false);
    if (nextDirectiveConstructor === undefined) {
      currentDirective = undefined;
    } else {
      currentDirective = new nextDirectiveConstructor(part as PartInfo);
      currentDirective._$initialize(part, parent, attributeIndex);
    }
    if (attributeIndex !== undefined) {
      ((parent as AttributePart).__directives ??= [])[attributeIndex] =
        currentDirective;
    } else {
      (parent as ChildPart | Directive).__directive = currentDirective;
    }
  }
  if (currentDirective !== undefined) {
    value = resolveDirective(
      part,
      currentDirective._$resolve(part, (value as DirectiveResult).values),
      currentDirective,
      attributeIndex
    );
  }
  return value;
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
                ctor:
                  m[1] === '.'
                    ? PropertyPart
                    : m[1] === '?'
                    ? BooleanAttributePart
                    : m[1] === '@'
                    ? EventPart
                    : AttributePart,
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
  _clone(options: RenderOptions | undefined) {
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
        } else if (templatePart.type === ELEMENT_PART) {
          part = new ElementPart(node as HTMLElement, this, options);
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

  _update(values: Array<unknown>) {
    let i = 0;
    for (const part of this._$parts) {
      if (part !== undefined) {
        if ((part as AttributePart).strings !== undefined) {
          (part as AttributePart)._$setValue(values, part as AttributePart, i);
          // The number of values the part consumes is part.strings.length - 1
          // since values are in between template spans. We increment i by 1
          // later in the loop, so increment it by part.strings.length - 2 here
          i += (part as AttributePart).strings!.length - 2;
        } else {
          part._$setValue(values[i]);
        }
      }
      i++;
    }
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
    // Create template element
    this.el = templateFromLiterals(strings, type);
    // Re-parent SVG nodes into template root
    if (type === SVG_RESULT) {
      const svgElement = this.el.content.firstChild!;
      svgElement.replaceWith(...svgElement.childNodes);
    }

    const parts = (() => {
      const unsorted = this.el.content.getPartRoot().getParts();
      if (mustSortParts) {
        return sortDomParts(unsorted);
      }
      return unsorted;
    })();
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
            let ctor: typeof AttributePart = AttributePart;
            if (name.startsWith('.')) {
              ctor = PropertyPart;
              name = name.slice(1);
            } else if (name.startsWith('@')) {
              ctor = EventPart;
              name = name.slice(1);
            } else if (name.startsWith('?')) {
              ctor = BooleanAttributePart;
              name = name.slice(1);
            }
            attributePart = {
              type: ATTRIBUTE_PART,
              index,
              name,
              ctor,
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
  _clone(options: RenderOptions | undefined) {
    const {
      el: {content},
      parts: parts,
    } = this._$template;
    const domPartRoot = content.getPartRoot().clone();
    const domParts = (() => {
      const unsorted = domPartRoot.getParts();
      if (mustSortParts) {
        return sortDomParts(unsorted);
      }
      return unsorted;
    })();
    const fragment = domPartRoot.rootContainer;

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
        case ELEMENT_PART:
          this._$parts.push(
            new ElementPart(
              (domPart as NodePart).node as Element,
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

  _update(values: Array<unknown>) {
    let i = 0;
    for (const part of this._$parts) {
      if (part !== undefined) {
        if ((part as AttributePart).strings !== undefined) {
          (part as AttributePart)._$setValue(values, part as AttributePart, i);
          // The number of values the part consumes is part.strings.length - 1
          // since values are in between template spans. We increment i by 1
          // later in the loop, so increment it by part.strings.length - 2 here
          i += (part as AttributePart).strings!.length - 2;
        } else {
          part._$setValue(values[i]);
        }
      }
      i++;
    }
  }
}

const Template = useDomParts ? DomPartsTemplate : ManualTemplate;
export const TemplateInstance = useDomParts
  ? DomPartsTemplateInstance
  : ManualTemplateInstance;
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

export type Part =
  | ChildPart
  | AttributePart
  | PropertyPart
  | BooleanAttributePart
  | ElementPart
  | EventPart;

export class ChildPart implements Disconnectable {
  readonly type = CHILD_PART;
  readonly options: RenderOptions | undefined;
  _$committedValue: unknown = nothing;
  /** @internal */
  __directive?: Directive;
  /** @internal */
  _$startNode: ChildNode;
  /** @internal */
  _$endNode: ChildNode | null;
  private _textSanitizer: ValueSanitizer | undefined;
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
    options: RenderOptions | undefined
  ) {
    this._$startNode = startNode;
    this._$endNode = endNode;
    this._$parent = parent;
    this.options = options;
    // Note __isConnected is only ever accessed on RootParts (i.e. when there is
    // no _$parent); the value on a non-root-part is "don't care", but checking
    // for parent would be more code
    this.__isConnected = options?.isConnected ?? true;
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      // Explicitly initialize for consistent class shape.
      this._textSanitizer = undefined;
    }
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

  _$setValue(value: unknown, directiveParent: DirectiveParent = this): void {
    if (DEV_MODE && this.parentNode === null) {
      throw new Error(
        `This \`ChildPart\` has no \`parentNode\` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's \`innerHTML\` or \`textContent\` can do this.`
      );
    }
    value = resolveDirective(this, value, directiveParent);
    if (isPrimitive(value)) {
      // Non-rendering child values. It's important that these do not render
      // empty text nodes to avoid issues with preventing default <slot>
      // fallback content.
      if (value === nothing || value == null || value === '') {
        if (this._$committedValue !== nothing) {
          this._$clear();
        }
        this._$committedValue = nothing;
      } else if (value !== this._$committedValue && value !== noChange) {
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
      if (ENABLE_EXTRA_SECURITY_HOOKS && sanitizerActive()) {
        const parentNodeName = this._$startNode.parentNode?.nodeName;
        if (parentNodeName === 'STYLE' || parentNodeName === 'SCRIPT') {
          let message = 'Forbidden';
          if (DEV_MODE) {
            if (parentNodeName === 'STYLE') {
              message =
                `Lit does not support binding inside style nodes. ` +
                `This is a security risk, as style injection attacks can ` +
                `exfiltrate data and spoof UIs. ` +
                `Consider instead using css\`...\` literals ` +
                `to compose styles, and make do dynamic styling with ` +
                `css custom properties, ::parts, <slot>s, ` +
                `and by mutating the DOM rather than stylesheets.`;
            } else {
              message =
                `Lit does not support binding inside script nodes. ` +
                `This is a security risk, as it could allow arbitrary ` +
                `code execution.`;
            }
          }
          throw new Error(message);
        }
      }
      this._$committedValue = this._insert(value);
    }
  }

  private _commitText(value: unknown): void {
    // If the committed value is a primitive it means we called _commitText on
    // the previous render, and we know that this._$startNode.nextSibling is a
    // Text node. We can now just replace the text content (.data) of the node.
    if (
      this._$committedValue !== nothing &&
      isPrimitive(this._$committedValue)
    ) {
      const node = this._$startNode.nextSibling as Text;
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this._textSanitizer === undefined) {
          this._textSanitizer = createSanitizer(node, 'data', 'property');
        }
        value = this._textSanitizer(value);
      }
      (node as Text).data = value as string;
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        const textNode = d.createTextNode('');
        this._commitNode(textNode);
        // When setting text content, for security purposes it matters a lot
        // what the parent is. For example, <style> and <script> need to be
        // handled with care, while <span> does not. So first we need to put a
        // text node into the document, then we can sanitize its content.
        if (this._textSanitizer === undefined) {
          this._textSanitizer = createSanitizer(textNode, 'data', 'property');
        }
        value = this._textSanitizer(value);
        textNode.data = value as string;
      } else {
        this._commitNode(d.createTextNode(value as string));
      }
    }
    this._$committedValue = value;
  }

  private _commitTemplateResult(
    result: TemplateResult | CompiledTemplateResult
  ): void {
    // This property needs to remain unminified.
    const {values, ['_$litType$']: type} = result;
    // If $litType$ is a number, result is a plain TemplateResult and we get
    // the template from the template cache. If not, result is a
    // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
    // to create the <template> element the first time we see it.
    const template: Template | CompiledTemplate =
      typeof type === 'number'
        ? this._$getTemplate(result as TemplateResult)
        : (type.el === undefined &&
            (type.el = ManualTemplate.createElement(
              trustFromTemplateString(type.h, type.h[0]),
              this.options
            )),
          type);

    if ((this._$committedValue as TemplateInstance)?._$template === template) {
      (this._$committedValue as TemplateInstance)._update(values);
    } else {
      const instance = new TemplateInstance(template as Template, this);
      const fragment = instance._clone(this.options);
      instance._update(values);
      this._commitNode(fragment);
      this._$committedValue = instance;
    }
  }

  // Overridden via `litHtmlPolyfillSupport` to provide platform support.
  /** @internal */
  _$getTemplate(result: TemplateResult) {
    let template = templateCache.get(result.strings);
    if (template === undefined) {
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
  _$committedValue: unknown | Array<unknown> = nothing;
  /** @internal */
  __directives?: Array<Directive | undefined>;
  /** @internal */
  _$parent: Disconnectable;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  protected _sanitizer: ValueSanitizer | undefined;

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
      this._$committedValue = nothing;
    }
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      this._sanitizer = undefined;
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
    directiveParent: DirectiveParent = this,
    valueIndex?: number,
    noCommit?: boolean
  ) {
    const strings = this.strings;

    // Whether any of the values has changed, for dirty-checking
    let change = false;

    if (strings === undefined) {
      // Single-value binding case
      value = resolveDirective(this, value, directiveParent, 0);
      change =
        !isPrimitive(value) ||
        (value !== this._$committedValue && value !== noChange);
      if (change) {
        this._$committedValue = value;
      }
    } else {
      // Interpolation case
      const values = value as Array<unknown>;
      value = strings[0];

      let i, v;
      for (i = 0; i < strings.length - 1; i++) {
        v = resolveDirective(this, values[valueIndex! + i], directiveParent, i);

        if (v === noChange) {
          // If the user-provided value is `noChange`, use the previous value
          v = (this._$committedValue as Array<unknown>)[i];
        }
        change ||=
          !isPrimitive(v) || v !== (this._$committedValue as Array<unknown>)[i];
        if (v === nothing) {
          value = nothing;
        } else if (value !== nothing) {
          value += (v ?? '') + strings[i + 1];
        }
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
    if (value === nothing) {
      this.element.removeAttribute(this.name);
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this._sanitizer === undefined) {
          this._sanitizer = createSanitizer(
            this.element,
            this.name,
            'attribute'
          );
        }
        value = this._sanitizer(value ?? '');
      }
      this.element.setAttribute(this.name, (value ?? '') as string);
    }
  }
}

export class PropertyPart extends AttributePart {
  override readonly type = PROPERTY_PART;

  /** @internal */
  override _commitValue(value: unknown) {
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      if (this._sanitizer === undefined) {
        this._sanitizer = createSanitizer(this.element, this.name, 'property');
      }
      value = this._sanitizer(value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.element as any)[this.name] = value === nothing ? undefined : value;
  }
}

export class BooleanAttributePart extends AttributePart {
  override readonly type = BOOLEAN_ATTRIBUTE_PART;

  /** @internal */
  override _commitValue(value: unknown) {
    this.element.toggleAttribute(this.name, !!value && value !== nothing);
  }
}

type EventListenerWithOptions = EventListenerOrEventListenerObject &
  Partial<AddEventListenerOptions>;

/**
 * An AttributePart that manages an event listener via add/removeEventListener.
 *
 * This part works by adding itself as the event listener on an element, then
 * delegating to the value passed to it. This reduces the number of calls to
 * add/removeEventListener if the listener changes frequently, such as when an
 * inline function is used as a listener.
 *
 * Because event options are passed when adding listeners, we must take case
 * to add and remove the part as a listener when the event options change.
 */
export class EventPart extends AttributePart {
  override readonly type = EVENT_PART;

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    super(element, name, strings, parent, options);

    if (DEV_MODE && this.strings !== undefined) {
      throw new Error(
        `A \`<${element.localName}>\` has a \`@${name}=...\` listener with ` +
          'invalid content. Event listeners in templates must have exactly ' +
          'one expression and no surrounding text.'
      );
    }
  }

  // EventPart does not use the base _$setValue/_resolveValue implementation
  // since the dirty checking is more complex
  /** @internal */
  override _$setValue(
    newListener: unknown,
    directiveParent: DirectiveParent = this
  ) {
    newListener =
      resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
    if (newListener === noChange) {
      return;
    }
    const oldListener = this._$committedValue;

    // If the new value is nothing or any options change we have to remove the
    // part as a listener.
    const shouldRemoveListener =
      (newListener === nothing && oldListener !== nothing) ||
      (newListener as EventListenerWithOptions).capture !==
        (oldListener as EventListenerWithOptions).capture ||
      (newListener as EventListenerWithOptions).once !==
        (oldListener as EventListenerWithOptions).once ||
      (newListener as EventListenerWithOptions).passive !==
        (oldListener as EventListenerWithOptions).passive;

    // If the new value is not nothing and we removed the listener, we have
    // to add the part as a listener.
    const shouldAddListener =
      newListener !== nothing &&
      (oldListener === nothing || shouldRemoveListener);

    if (shouldRemoveListener) {
      this.element.removeEventListener(
        this.name,
        this,
        oldListener as EventListenerWithOptions
      );
    }
    if (shouldAddListener) {
      // Beware: IE11 and Chrome 41 don't like using the listener as the
      // options object. Figure out how to deal w/ this in IE11 - maybe
      // patch addEventListener?
      this.element.addEventListener(
        this.name,
        this,
        newListener as EventListenerWithOptions
      );
    }
    this._$committedValue = newListener;
  }

  handleEvent(event: Event) {
    if (typeof this._$committedValue === 'function') {
      this._$committedValue.call(this.options?.host ?? this.element, event);
    } else {
      (this._$committedValue as EventListenerObject).handleEvent(event);
    }
  }
}

export class ElementPart implements Disconnectable {
  readonly type = ELEMENT_PART;

  /** @internal */
  __directive?: Directive;

  // This is to ensure that every Part has a _$committedValue
  _$committedValue: undefined;

  /** @internal */
  _$parent!: Disconnectable;

  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  options: RenderOptions | undefined;

  constructor(
    public element: Element,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    this._$parent = parent;
    this.options = options;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  _$setValue(value: unknown): void {
    resolveDirective(this, value);
  }
}

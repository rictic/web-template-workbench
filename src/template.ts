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
import {RenderOptions} from './render.js';
import {templateFromLiterals} from './template-from-literals.js';
import {SVG_RESULT, TemplateResult} from './ttl.js';

const d = document;

// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = () => d.createComment('');

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

const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */
);

export type Template = ManualTemplate | DomPartsTemplate;
export class ManualTemplate {
  /** @internal */
  el!: HTMLTemplateElement;

  parts: Array<TemplatePart> = [];

  constructor(
    // This property needs to remain unminified.
    {strings, ['_$litType$']: type}: TemplateResult,
    _options?: RenderOptions
  ) {
    console.log(`creating a manual template`);
    let node: Node | null;
    let nodeIndex = 0;
    let attrNameIndex = 0;
    const partCount = strings.length - 1;
    const parts = this.parts;

    // Create template element
    const [html, attrNames] = getTemplateHtml(strings, type);
    const el = d.createElement('template');
    el.innerHTML = html as unknown as string;
    this.el = el;
    walker.currentNode = this.el.content;

    // Re-parent SVG nodes into template root
    if (type === SVG_RESULT) {
      const svgElement = this.el.content.firstChild!;
      svgElement.replaceWith(...svgElement.childNodes);
    }

    // Walk the template to find binding markers and create TemplateParts
    while ((node = walker.nextNode()) !== null && parts.length < partCount) {
      if (node.nodeType === 1) {
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
    // and re-use the walker in new TemplateInstance.clone().
  }
}

/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
export class ManualTemplateInstance {
  template: Template;
  parts: Array<Part | undefined> = [];

  constructor(template: Template) {
    this.template = template;
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  clone(options: RenderOptions) {
    const {
      el: {content},
      parts: parts,
    } = this.template;
    const startClone = performance.now();
    const fragment = (options?.creationScope ?? d).importNode(content, true);
    performance.measure('clone template', {
      start: startClone,
      end: performance.now(),
    });

    const getPartsStart = performance.now();
    // No get parts, so it takes zero times
    performance.measure('get parts', {
      start: getPartsStart,
      end: getPartsStart,
    });

    // adoption happens as part of clone, so it also takes zero time
    const adoptNodeStart = performance.now();
    performance.measure('adopt', {
      start: adoptNodeStart,
      end: adoptNodeStart,
    });

    const partCreationStart = performance.now();
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
            templatePart.strings
          );
        }
        this.parts.push(part);
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
    performance.measure('create part wrappers', {
      start: partCreationStart,
      end: performance.now(),
    });
    return fragment;
  }
}

export class DomPartsTemplate {
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
export class DomPartsTemplateInstance {
  template: Template;
  parts: Array<Part | undefined> = [];

  constructor(template: DomPartsTemplate) {
    this.template = template;
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  clone(options: RenderOptions) {
    const {
      el: {content},
      parts: parts,
    } = this.template;
    const cloneStart = performance.now();
    const domPartRoot = content.getPartRoot().clone();
    performance.measure('clone template', {
      start: cloneStart,
      end: performance.now(),
    });

    const getPartsStart = performance.now();
    const domParts = domPartRoot.getParts();
    performance.measure('get parts', {
      start: getPartsStart,
      end: performance.now(),
    });
    const adoptNodeStart = performance.now();
    const fragment = document.adoptNode(domPartRoot.rootContainer);
    performance.measure('adopt', {
      start: adoptNodeStart,
      end: performance.now(),
    });

    const partCreationStart = performance.now();
    // See: https://github.com/tbondwilkinson/dom-parts/issues/6
    // customElements.upgrade(fragment);
    for (const part of parts) {
      const domPart = domParts[part.index];
      switch (part.type) {
        case CHILD_PART:
          this.parts.push(
            new ChildPart(
              (domPart as ChildNodePart).previousSibling,
              (domPart as ChildNodePart).nextSibling as ChildNode,
              this,
              options
            )
          );
          break;
        case ATTRIBUTE_PART: {
          this.parts.push(
            new (part as AttributeTemplatePart).ctor(
              (domPart as NodePart).node as HTMLElement,
              (part as AttributeTemplatePart).name,
              (part as AttributeTemplatePart).strings
            )
          );
          break;
        }
      }
    }
    performance.measure('create part wrappers', {
      start: partCreationStart,
      end: performance.now(),
    });
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

export class ChildPart {
  readonly type = CHILD_PART;
  readonly options: RenderOptions;
  committedValue: unknown = '';
  startNode: ChildNode;
  endNode: ChildNode | null;

  constructor(
    startNode: ChildNode,
    endNode: ChildNode | null,
    _parent: TemplateInstance | ChildPart | undefined,
    options: RenderOptions
  ) {
    this.startNode = startNode;
    this.endNode = endNode;
    this.options = options;
  }
}

export class AttributePart {
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
  value: unknown | Array<unknown> = [];

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>
  ) {
    this.element = element;
    this.name = name;
    if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
      this.value = new Array(strings.length - 1).fill(new String());
      this.strings = strings;
    } else {
      this.value = '';
    }
  }
}

/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {getTemplateHtml} from './get-template-html.js';
import {useDomParts} from './modes.js';
import {HTML_RESULT} from './ttl.js';

// Typings for the DOM Parts proposed standard as described by
// https://github.com/tbondwilkinson/dom-parts and then implemented in
// Chrome Canary v117.0.5890.0 with experimental web platform features
// enabled.
declare global {
  interface PartRoot {
    // In-order DOM array of parts.
    getParts(): Part[];
  }

  class DocumentPart implements PartRoot {
    constructor(rootContainer: Document | DocumentFragment);

    getParts(): Part[];

    clone(): DocumentPart;

    readonly rootContainer: Document | DocumentFragment;
  }

  interface Document {
    getPartRoot(): DocumentPart;
  }

  interface DocumentFragment {
    getPartRoot(): DocumentPart;
  }
  interface Part {
    readonly root?: PartRoot;
    readonly metadata: string[];

    disconnect(): void;
  }
  class NodePart implements Part {
    readonly root?: PartRoot;
    readonly metadata: string[];

    readonly node: Node;

    constructor(root: PartRoot, node: Node, init?: {metadata?: string[]});

    disconnect(): void;
  }
  class ChildNodePart implements Part, PartRoot {
    readonly root?: PartRoot;
    readonly metadata: string[];

    readonly previousSibling: ChildNode;
    readonly nextSibling: ChildNode;

    constructor(
      root: PartRoot,
      previousSibling: Node,
      nextSibling: Node,
      init?: {metadata?: string[]}
    );

    children(): Node[];

    // All parts in this subtree.
    getParts(): Part[];

    // Replaces the children and parts in this range.
    replaceChildren(...nodes: Array<Node | string>): void;

    disconnect(): void;
  }
}

/**
 * A crack at a simple ponyfill of
 * https://github.com/WICG/webcomponents/issues/1019 extended with an encoding
 * for attribute and element bindings in the returned NodePart's metadata.
 *
 * See the tests at ./test/template-from-literals_test.ts for more info.
 */
export function templateFromLiterals(
  strings: TemplateStringsArray
): HTMLTemplateElement {
  const [html, attrNames] = getTemplateHtml(strings, HTML_RESULT);
  let attrNameIdx = 0;
  const template = document.createElement('template');
  template.innerHTML = html as unknown as string;
  const treeWalker = document.createTreeWalker(template.content);
  let node;
  let root;
  if (useDomParts) {
    root = template.content.getPartRoot();
  }
  while ((node = treeWalker.nextNode())) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const comment = node as Comment;
      if (/lit\$\d+/.test(comment.data)) {
        if (useDomParts) {
          const before = new Text();
          const after = new Text();
          comment.before(before);
          comment.after(after);
          new ChildNodePart(root!, before, after);
          comment.remove();
        } else {
          comment.data = '?child-node-part?';
          comment.after(new Comment('?/child-node-part?'));
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const metadata: string[] = [];
      const badAttributes: string[] = [];
      for (const attr of element.attributes) {
        if (/lit\$\d+\$\d+/.test(attr.name)) {
          metadata.push('d');
          badAttributes.push(attr.name);
          continue;
        }
        const match = attr.name.match(/^(.*)\$lit\$$/);
        if (match !== null) {
          metadata.push('attr', attrNames[attrNameIdx]);
          attrNameIdx++;
          // const value = attr.value;
          const regex = /(?:(lit\$\d+\$))|(?:(.+?)(?:lit\$\d+\$))|(.+)/g;
          let endMatched = false;
          for (const [_, bindingStart, lit, end] of attr.value.matchAll(
            regex
          )) {
            if (bindingStart !== undefined) {
              metadata.push('""');
            } else if (lit !== undefined) {
              metadata.push(JSON.stringify(lit));
            } else {
              metadata.push(JSON.stringify(end));
              endMatched = true;
            }
          }
          if (endMatched === false) {
            metadata.push('""');
          }
          badAttributes.push(attr.name);
        }
      }
      for (const attr of badAttributes) {
        element.removeAttribute(attr);
      }
      if (metadata.length > 0) {
        if (useDomParts) {
          new NodePart(root!, element, {metadata});
        } else {
          element.before(new Comment(`?node-part ${metadata.join(' ')} ?`));
        }
      }
    }
  }
  return template;
}

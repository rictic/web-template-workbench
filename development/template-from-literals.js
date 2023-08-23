/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { getTemplateHtml } from './get-template-html.js';
import { HTML_RESULT } from './ttl.js';
/**
 * A crack at a simple ponyfill of
 * https://github.com/WICG/webcomponents/issues/1019 extended with an encoding
 * for attribute and element bindings in the returned NodePart's metadata.
 *
 * See the tests at ./test/template-from-literals_test.ts for more info.
 */
export function templateFromLiterals(strings, type = HTML_RESULT, useDomParts) {
    const [html, attrNames] = getTemplateHtml(strings, type);
    let attrNameIdx = 0;
    const template = document.createElement('template');
    template.innerHTML = html;
    const treeWalker = document.createTreeWalker(template.content);
    let node = treeWalker.nextNode();
    let root;
    if (useDomParts) {
        root = template.content.getPartRoot();
    }
    while (node !== null) {
        if (node.nodeType === Node.COMMENT_NODE) {
            const comment = node;
            if (/lit\$\d+/.test(comment.data)) {
                if (useDomParts) {
                    const before = new Text();
                    const after = new Text();
                    comment.before(before);
                    comment.after(after);
                    new ChildNodePart(root, before, after);
                    node = treeWalker.nextNode();
                    comment.remove();
                    continue;
                }
                else {
                    comment.data = '?child-node-part?';
                    comment.after(new Comment('?/child-node-part?'));
                }
            }
        }
        else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            const metadata = [];
            const badAttributes = [];
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
                    for (const [_, bindingStart, lit, end] of attr.value.matchAll(regex)) {
                        if (bindingStart !== undefined) {
                            metadata.push('""');
                        }
                        else if (lit !== undefined) {
                            metadata.push(JSON.stringify(lit));
                        }
                        else {
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
                    new NodePart(root, element, { metadata });
                }
                else {
                    element.before(new Comment(`?node-part ${metadata.join(' ')} ?`));
                }
            }
        }
        node = treeWalker.nextNode();
    }
    return template;
}
//# sourceMappingURL=template-from-literals.js.map
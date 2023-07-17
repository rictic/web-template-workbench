/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

export const DEV_MODE = true;
export const ENABLE_EXTRA_SECURITY_HOOKS = true;
export const NODE_MODE = false;

export const domPartsSupported = typeof ChildNodePart !== 'undefined';

export const useDomParts = domPartsSupported;

export const mustSortParts = (() => {
  if (!useDomParts) {
    return false;
  }
  const template = document.createElement('template');
  template.innerHTML = `<div><p></p></div>`;
  const fragment = template.content;
  const root = fragment.getPartRoot();
  const p = fragment.querySelector('p')!;
  const pText1 = document.createTextNode('');
  const pText2 = document.createTextNode('');
  p.appendChild(pText1);
  p.appendChild(pText2);
  const pPart = new ChildNodePart(root, pText1, pText2);
  const divText1 = document.createTextNode('');
  const divText2 = document.createTextNode('');
  const div = fragment.querySelector('div')!;
  div.appendChild(divText1);
  div.appendChild(divText2);
  const divPart = new ChildNodePart(root, divText1, divText2);

  const parts = root.getParts();
  if (parts[0] === pPart && parts[1] === divPart) {
    return false;
  }
  const sorted = sortDomParts(parts);
  if (sorted[0] !== pPart || sorted[1] !== divPart) {
    throw new Error('DOM part manual sorting is wrong');
  }
  return true;
})();

export function sortDomParts(parts: Part[]) {
  const getNode = (part: Part) => {
    if (part instanceof ChildNodePart) {
      return part.previousSibling;
    } else if (part instanceof NodePart) {
      return part.node;
    }
    throw new Error('unknown part type');
  };
  return [...parts].sort((a, b) => {
    const position = getNode(a)?.compareDocumentPosition(getNode(b));
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return -1;
  });
}

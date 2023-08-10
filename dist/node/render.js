import{ChildPart as o}from"./template.js";import{domPartsSupported as t}from"./modes.js";
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const e=(e,m,r)=>{const s=r?.renderBefore??m;let n=s._$litPart$;if(void 0===n){const e=r?.renderBefore??null;s._$litPart$=n=new o(m.insertBefore(document.createComment(""),e),e,void 0,r??{useDomParts:t})}return n._$AI(e),n};export{e as render};
//# sourceMappingURL=render.js.map

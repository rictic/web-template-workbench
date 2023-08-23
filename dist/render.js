import{domPartsTemplateCache as t,manualTemplateCache as o,DomPartsTemplate as e,ManualTemplate as n,DomPartsTemplateInstance as s,ManualTemplateInstance as c}from"./template.js";
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const i=(i,m,p)=>{const r=p.useDomParts?t:o;let f=r.get(i.strings);if(void 0===f){const t=p.useDomParts?e:n;r.set(i.strings,f=new t(i))}new(p?.useDomParts?s:c)(f).t(p)};export{i as render};
//# sourceMappingURL=render.js.map

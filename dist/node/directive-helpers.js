import{_$LH as o}from"./index.js";
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{M:t}=o,i=o=>null===o||"object"!=typeof o&&"function"!=typeof o,n={HTML:1,SVG:2},e=(o,t)=>void 0===t?void 0!==o?._$litType$:o?._$litType$===t,c=o=>void 0!==o?._$litDirective$,d=o=>o?._$litDirective$,f=o=>void 0===o.strings,s=()=>document.createComment(""),r=(o,i,n)=>{const e=o._$AA.parentNode,c=void 0===i?o._$AB:i._$AA;if(void 0===n){const i=e.insertBefore(s(),c),d=e.insertBefore(s(),c);n=new t(i,d,o,o.options)}else{const t=n._$AB.nextSibling,i=n._$AM,d=i!==o;if(d){let t;n._$AQ?.(o),n._$AM=o,void 0!==n._$AP&&(t=o._$AU)!==i._$AU&&n._$AP(t)}if(t!==c||d){let o=n._$AA;for(;o!==t;){const t=o.nextSibling;e.insertBefore(o,c),o=t}}}return n},l=(o,t,i=o)=>(o._$AI(t,i),o),v={},p=(o,t=v)=>o._$AH=t,u=o=>o._$AH,m=o=>{o._$AP?.(!1,!0);let t=o._$AA;const i=o._$AB.nextSibling;for(;t!==i;){const o=t.nextSibling;t.remove(),t=o}},j=o=>{o._$AR()};export{n as TemplateResultType,j as clearPart,u as getCommittedValue,d as getDirectiveClass,r as insertPart,c as isDirectiveResult,i as isPrimitive,f as isSingleExpression,e as isTemplateResult,m as removePart,l as setChildPartValue,p as setCommittedValue};
//# sourceMappingURL=directive-helpers.js.map

import{noChange as r}from"../template.js";import"../get-template-html.js";import{directive as t,Directive as e}from"../directive.js";
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const s={},i=t(class extends e{constructor(){super(...arguments),this.it=s}render(r,t){return t()}update(t,[e,s]){if(Array.isArray(e)){if(Array.isArray(this.it)&&this.it.length===e.length&&e.every(((r,t)=>r===this.it[t])))return r}else if(this.it===e)return r;return this.it=Array.isArray(e)?Array.from(e):e,this.render(e,s)}});export{i as guard};
//# sourceMappingURL=guard.js.map
import{nothing as t}from"../template.js";import"../get-template-html.js";import{render as i}from"../render.js";import{directive as s,Directive as e}from"../directive.js";import{isTemplateResult as r,getCommittedValue as o,setCommittedValue as h,insertPart as m,clearPart as n}from"../directive-helpers.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const d=s(class extends e{constructor(t){super(t),this.X=new WeakMap}render(t){return[t]}update(s,[e]){if(r(this.q)&&(!r(e)||this.q.strings!==e.strings)){const e=o(s).pop();let r=this.X.get(this.q.strings);if(void 0===r){const s=document.createDocumentFragment();r=i(t,s),r.setConnected(!1),this.X.set(this.q.strings,r)}h(r,[e]),m(r,void 0,e)}if(r(e)){if(!r(this.q)||this.q.strings!==e.strings){const t=this.X.get(e.strings);if(void 0!==t){const i=o(t).pop();n(s),m(s,void 0,i),h(s,[i])}}this.q=e}else this.q=void 0;return this.render(e)}});export{d as cache};
//# sourceMappingURL=cache.js.map

import{nothing as t}from"../template.js";import"../get-template-html.js";import{render as i}from"../render.js";import{directive as s,Directive as e}from"../directive.js";import{isTemplateResult as r,getCommittedValue as o,setCommittedValue as h,insertPart as m,clearPart as n}from"../directive-helpers.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const d=s(class extends e{constructor(t){super(t),this.q=new WeakMap}render(t){return[t]}update(s,[e]){if(r(this.tt)&&(!r(e)||this.tt.strings!==e.strings)){const e=o(s).pop();let r=this.q.get(this.tt.strings);if(void 0===r){const s=document.createDocumentFragment();r=i(t,s),r.setConnected(!1),this.q.set(this.tt.strings,r)}h(r,[e]),m(r,void 0,e)}if(r(e)){if(!r(this.tt)||this.tt.strings!==e.strings){const t=this.q.get(e.strings);if(void 0!==t){const i=o(t).pop();n(s),m(s,void 0,i),h(s,[i])}}this.tt=e}else this.tt=void 0;return this.render(e)}});export{d as cache};
//# sourceMappingURL=cache.js.map

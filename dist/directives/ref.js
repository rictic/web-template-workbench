import{nothing as t}from"../template.js";import"../get-template-html.js";import{AsyncDirective as i}from"../async-directive.js";import{directive as s}from"../directive.js";
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const e=()=>new h;class h{}const o=new WeakMap,n=s(class extends i{render(i){return t}update(i,[s]){const e=s!==this.W;return e&&void 0!==this.W&&this.ot(void 0),(e||this.nt!==this.rt)&&(this.W=s,this.lt=i.options?.host,this.ot(this.rt=i.element)),t}ot(t){if("function"==typeof this.W){const i=this.lt??globalThis;let s=o.get(i);void 0===s&&(s=new WeakMap,o.set(i,s)),void 0!==s.get(this.W)&&this.W.call(this.lt,void 0),s.set(this.W,t),void 0!==t&&this.W.call(this.lt,t)}else this.W.value=t}get nt(){return"function"==typeof this.W?o.get(this.lt??globalThis)?.get(this.W):this.W?.value}disconnected(){this.nt===this.rt&&this.ot(void 0)}reconnected(){this.ot(this.rt)}});export{e as createRef,n as ref};
//# sourceMappingURL=ref.js.map

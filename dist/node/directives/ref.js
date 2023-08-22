import{nothing as t}from"../template.js";import"../get-template-html.js";import{AsyncDirective as i}from"../async-directive.js";import{directive as s}from"../directive.js";
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const e=()=>new h;class h{}const o=new WeakMap,n=s(class extends i{render(i){return t}update(i,[s]){const e=s!==this.F;return e&&void 0!==this.F&&this.it(void 0),(e||this.ot!==this.nt)&&(this.F=s,this.rt=i.options?.host,this.it(this.nt=i.element)),t}it(t){if("function"==typeof this.F){const i=this.rt??globalThis;let s=o.get(i);void 0===s&&(s=new WeakMap,o.set(i,s)),void 0!==s.get(this.F)&&this.F.call(this.rt,void 0),s.set(this.F,t),void 0!==t&&this.F.call(this.rt,t)}else this.F.value=t}get ot(){return"function"==typeof this.F?o.get(this.rt??globalThis)?.get(this.F):this.F?.value}disconnected(){this.ot===this.nt&&this.it(void 0)}reconnected(){this.it(this.nt)}});export{e as createRef,n as ref};
//# sourceMappingURL=ref.js.map

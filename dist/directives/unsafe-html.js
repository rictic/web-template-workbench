import{nothing as t,noChange as r}from"../template.js";import"../get-template-html.js";import{Directive as i,PartType as s,directive as e}from"../directive.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class n extends i{constructor(r){if(super(r),this.tt=t,r.type!==s.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(i){if(i===t||null==i)return this.ft=void 0,this.tt=i;if(i===r)return i;if("string"!=typeof i)throw Error(this.constructor.directiveName+"() called with a non-string value");if(i===this.tt)return this.ft;this.tt=i;const s=[i];return s.raw=s,this.ft={_$litType$:this.constructor.resultType,strings:s,values:[]}}}n.directiveName="unsafeHTML",n.resultType=1;const o=e(n);export{n as UnsafeHTMLDirective,o as unsafeHTML};
//# sourceMappingURL=unsafe-html.js.map
import{noChange as t}from"../template.js";import"../get-template-html.js";import{isPrimitive as s}from"../directive-helpers.js";import{AsyncDirective as i}from"../async-directive.js";import{PseudoWeakRef as e,Pauser as r}from"./private-async-helpers.js";import{directive as o}from"../directive.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const n=t=>!s(t)&&"function"==typeof t.then,h=1073741823;class c extends i{constructor(){super(...arguments),this._$C_t=h,this._$Cvt=[],this._$CJ=new e(this),this._$CZ=new r}render(...s){return s.find((t=>!n(t)))??t}update(s,i){const e=this._$Cvt;let r=e.length;this._$Cvt=i;const o=this._$CJ,c=this._$CZ;this.isConnected||this.disconnected();for(let t=0;t<i.length&&!(t>this._$C_t);t++){const s=i[t];if(!n(s))return this._$C_t=t,s;t<r&&s===e[t]||(this._$C_t=h,r=0,Promise.resolve(s).then((async t=>{for(;c.get();)await c.get();const i=o.deref();if(void 0!==i){const e=i._$Cvt.indexOf(s);e>-1&&e<i._$C_t&&(i._$C_t=e,i.setValue(t))}})))}return t}disconnected(){this._$CJ.disconnect(),this._$CZ.pause()}reconnected(){this._$CJ.reconnect(this),this._$CZ.resume()}}const m=o(c);export{c as UntilDirective,m as until};
//# sourceMappingURL=until.js.map

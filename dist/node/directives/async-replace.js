import{noChange as t}from"../template.js";import"../get-template-html.js";import{AsyncDirective as e}from"../async-directive.js";import{PseudoWeakRef as s,Pauser as i,forAwaitOf as r}from"./private-async-helpers.js";import{directive as o}from"../directive.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class n extends e{constructor(){super(...arguments),this._$CY=new s(this),this._$CJ=new i}render(e,s){return t}update(e,[s,i]){if(this.isConnected||this.disconnected(),s===this._$CZ)return;this._$CZ=s;let o=0;const{_$CY:n,_$CJ:h}=this;return r(s,(async t=>{for(;h.get();)await h.get();const e=n.deref();if(void 0!==e){if(e._$CZ!==s)return!1;void 0!==i&&(t=i(t,o)),e.commitValue(t,o),o++}return!0})),t}commitValue(t,e){this.setValue(t)}disconnected(){this._$CY.disconnect(),this._$CJ.pause()}reconnected(){this._$CY.reconnect(this),this._$CJ.resume()}}const h=o(n);export{n as AsyncReplaceDirective,h as asyncReplace};
//# sourceMappingURL=async-replace.js.map

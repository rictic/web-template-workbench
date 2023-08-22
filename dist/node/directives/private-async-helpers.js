/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=async(t,s)=>{for await(const i of t)if(!1===await s(i))return};class s{constructor(t){this.F=t}disconnect(){this.F=void 0}reconnect(t){this.F=t}deref(){return this.F}}class i{constructor(){this.W=void 0,this.G=void 0}get(){return this.W}pause(){this.W??=new Promise((t=>this.G=t))}resume(){this.G?.(),this.W=this.G=void 0}}export{i as Pauser,s as PseudoWeakRef,t as forAwaitOf};
//# sourceMappingURL=private-async-helpers.js.map

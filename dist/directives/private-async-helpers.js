/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=async(t,s)=>{for await(const i of t)if(!1===await s(i))return};class s{constructor(t){this.W=t}disconnect(){this.W=void 0}reconnect(t){this.W=t}deref(){return this.W}}class i{constructor(){this.G=void 0,this.Y=void 0}get(){return this.G}pause(){this.G??=new Promise((t=>this.Y=t))}resume(){this.Y?.(),this.G=this.Y=void 0}}export{i as Pauser,s as PseudoWeakRef,t as forAwaitOf};
//# sourceMappingURL=private-async-helpers.js.map

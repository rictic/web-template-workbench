import"./template.js";import"./get-template-html.js";import{html as t,svg as e}from"./ttl.js";
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const r=Symbol.for(""),o=t=>{if(t?.r===r)return t?._$litStatic$},s=t=>({_$litStatic$:t,r}),a=(t,...e)=>({_$litStatic$:e.reduce(((e,r,o)=>e+(t=>{if(void 0!==t._$litStatic$)return t._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${t}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(r)+t[o+1]),t[0]),r}),i=new Map,l=t=>(e,...r)=>{const s=r.length;let a,l;const n=[],u=[];let c,m=0,p=!1;for(;m<s;){for(c=e[m];m<s&&void 0!==(l=r[m],a=o(l));)c+=a+e[++m],p=!0;m!==s&&u.push(l),n.push(c),m++}if(m===s&&n.push(e[s]),p){const t=n.join("$$lit$$");void 0===(e=i.get(t))&&(n.raw=n,i.set(t,e=n)),r=u}return t(e,...r)},n=l(t),u=l(e);export{n as html,a as literal,u as svg,s as unsafeStatic,l as withStatic};
//# sourceMappingURL=static.js.map

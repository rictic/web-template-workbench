import{noChange as e}from"../template.js";import"../get-template-html.js";import{directive as t,Directive as s,PartType as r}from"../directive.js";import{getCommittedValue as l,setChildPartValue as o,insertPart as i,removePart as n,setCommittedValue as f}from"../directive-helpers.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const u=(e,t,s)=>{const r=new Map;for(let l=t;l<=s;l++)r.set(e[l],l);return r},c=t(class extends s{constructor(e){if(super(e),e.type!==r.CHILD)throw Error("repeat() can only be used in text expressions")}ct(e,t,s){let r;void 0===s?s=t:void 0!==t&&(r=t);const l=[],o=[];let i=0;for(const t of e)l[i]=r?r(t,i):i,o[i]=s(t,i),i++;return{values:o,keys:l}}render(e,t,s){return this.ct(e,t,s).values}update(t,[s,r,c]){const p=l(t),{values:a,keys:d}=this.ct(s,r,c);if(!Array.isArray(p))return this.ht=d,a;const m=this.ht??=[],h=[];let v,y,j=0,x=p.length-1,g=0,k=a.length-1;for(;j<=x&&g<=k;)if(null===p[j])j++;else if(null===p[x])x--;else if(m[j]===d[g])h[g]=o(p[j],a[g]),j++,g++;else if(m[x]===d[k])h[k]=o(p[x],a[k]),x--,k--;else if(m[j]===d[k])h[k]=o(p[j],a[k]),i(t,h[k+1],p[j]),j++,k--;else if(m[x]===d[g])h[g]=o(p[x],a[g]),i(t,p[j],p[x]),x--,g++;else if(void 0===v&&(v=u(d,g,k),y=u(m,j,x)),v.has(m[j]))if(v.has(m[x])){const e=y.get(d[g]),s=void 0!==e?p[e]:null;if(null===s){const e=i(t,p[j]);o(e,a[g]),h[g]=e}else h[g]=o(s,a[g]),i(t,p[j],s),p[e]=null;g++}else n(p[x]),x--;else n(p[j]),j++;for(;g<=k;){const e=i(t,h[k+1]);o(e,a[g]),h[g++]=e}for(;j<=x;){const e=p[j++];null!==e&&n(e)}return this.ht=d,f(t,h),e}});export{c as repeat};
//# sourceMappingURL=repeat.js.map

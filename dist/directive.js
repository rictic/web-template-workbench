export{AttributePart,BooleanAttributePart,ChildPart,ElementPart,EventPart,PropertyPart}from"./template.js";import"./get-template-html.js";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const t={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},e=t=>(...e)=>({_$litDirective$:t,values:e});class r{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,r){this._$CB=t,this._$AM=e,this._$CU=r}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}export{r as Directive,t as PartType,e as directive};
//# sourceMappingURL=directive.js.map

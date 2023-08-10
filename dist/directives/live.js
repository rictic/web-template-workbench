import{noChange as e,nothing as r}from"../template.js";import"../get-template-html.js";import{directive as t,Directive as i,PartType as n}from"../directive.js";import{isSingleExpression as o,setCommittedValue as s}from"../directive-helpers.js";
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const l=t(class extends i{constructor(e){if(super(e),e.type!==n.PROPERTY&&e.type!==n.ATTRIBUTE&&e.type!==n.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!o(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(t,[i]){if(i===e||i===r)return i;const o=t.element,l=t.name;if(t.type===n.PROPERTY){if(i===o[l])return e}else if(t.type===n.BOOLEAN_ATTRIBUTE){if(!!i===o.hasAttribute(l))return e}else if(t.type===n.ATTRIBUTE&&o.getAttribute(l)===i+"")return e;return s(t),i}});export{l as live};
//# sourceMappingURL=live.js.map

import{nothing as t}from"../template.js";import"../get-template-html.js";import{directive as e,Directive as r}from"../directive.js";import{setCommittedValue as s}from"../directive-helpers.js";
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const i=e(class extends r{constructor(){super(...arguments),this.key=t}render(t,e){return this.key=t,e}update(t,[e,r]){return e!==this.key&&(s(t),this.key=e),r}});export{i as keyed};
//# sourceMappingURL=keyed.js.map

import{noChange as t}from"../template.js";import"../get-template-html.js";import{directive as e,Directive as r,PartType as o}from"../directive.js";
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const n=e(class extends r{constructor(t){if(super(t),t.type!==o.CHILD)throw Error("templateContent can only be used in child bindings")}render(e){return this.dt===e?t:(this.dt=e,document.importNode(e.content,!0))}});export{n as templateContent};
//# sourceMappingURL=template-content.js.map

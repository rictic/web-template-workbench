import{noChange as t}from"../template.js";import"../get-template-html.js";import{directive as s,Directive as e,PartType as i}from"../directive.js";
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const r=s(class extends e{constructor(t){if(super(t),t.type!==i.ATTRIBUTE||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter((s=>t[s])).join(" ")+" "}update(s,[e]){if(void 0===this.tt){this.tt=new Set,void 0!==s.strings&&(this.et=new Set(s.strings.join(" ").split(/\s/).filter((t=>""!==t))));for(const t in e)e[t]&&!this.et?.has(t)&&this.tt.add(t);return this.render(e)}const i=s.element.classList;for(const t of this.tt)t in e||(i.remove(t),this.tt.delete(t));for(const t in e){const s=!!e[t];s===this.tt.has(t)||this.et?.has(t)||(s?(i.add(t),this.tt.add(t)):(i.remove(t),this.tt.delete(t)))}return t}});export{r as classMap};
//# sourceMappingURL=class-map.js.map

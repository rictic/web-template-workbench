import{getTemplateHtml as t}from"./get-template-html.js";import{HTML_RESULT as o}from"./ttl.js";
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function e(e,n=o,d){const[l,i]=t(e,n);let r=0;const c=document.createElement("template");c.innerHTML=l;const f=document.createTreeWalker(c.content);let m,s=f.nextNode();for(d&&(m=c.content.getPartRoot());null!==s;){if(s.nodeType===Node.COMMENT_NODE){const t=s;if(/lit\$\d+/.test(t.data)){if(d){const o=new Text,e=new Text;t.before(o),t.after(e),new ChildNodePart(m,o,e),s=f.nextNode(),t.remove();continue}t.data="?child-node-part?",t.after(new Comment("?/child-node-part?"))}}else if(s.nodeType===Node.ELEMENT_NODE){const t=s,o=[],e=[];for(const n of t.attributes)if(/lit\$\d+\$\d+/.test(n.name))o.push("d"),e.push(n.name);else if(null!==n.name.match(/^(.*)\$lit\$$/)){o.push("attr",i[r]),r++;const t=/(?:(lit\$\d+\$))|(?:(.+?)(?:lit\$\d+\$))|(.+)/g;let d=!1;for(const[e,l,i,r]of n.value.matchAll(t))void 0!==l?o.push('""'):void 0!==i?o.push(JSON.stringify(i)):(o.push(JSON.stringify(r)),d=!0);!1===d&&o.push('""'),e.push(n.name)}for(const o of e)t.removeAttribute(o);o.length>0&&(d?new NodePart(m,t,{metadata:o}):t.before(new Comment(`?node-part ${o.join(" ")} ?`)))}s=f.nextNode()}return c}export{e as templateFromLiterals};
//# sourceMappingURL=template-from-literals.js.map

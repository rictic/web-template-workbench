import{getTemplateHtml as t,boundAttributeSuffix as s,marker as i,rawTextElement as e,markerMatch as o}from"./get-template-html.js";import{templateFromLiterals as h}from"./template-from-literals.js";import{SVG_RESULT as n}from"./ttl.js";
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const r=document,c=()=>r.createComment(""),l=t=>null===t||"object"!=typeof t&&"function"!=typeof t,a=Array.isArray,d=t=>a(t)||"function"==typeof t?.[Symbol.iterator],f=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),m=new WeakMap,p=new WeakMap,g=r.createTreeWalker(r,129);class v{constructor({strings:h,_$litType$:r},l){let a;this.parts=[],console.log("creating a manual template");let d=0,f=0;const u=h.length-1,m=this.parts,[p,_]=t(h,r);if(this.el=v.createElement(p,l),g.currentNode=this.el.content,r===n){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(a=g.nextNode())&&m.length<u;){if(1===a.nodeType){if(a.hasAttributes())for(const t of a.getAttributeNames())if(t.endsWith(s)){const s=_[f++],e=a.getAttribute(t).split(i),o=/([.?@])?(.*)/.exec(s);m.push({type:1,index:d,name:o[2],strings:e,ctor:x}),a.removeAttribute(t)}else t.startsWith(i)&&(m.push({type:6,index:d}),a.removeAttribute(t));if(e.test(a.tagName)){const t=a.textContent.split(i),s=t.length-1;if(s>0){a.textContent=window.trustedTypes?window.trustedTypes.emptyScript:"";for(let i=0;i<s;i++)a.append(t[i],c()),g.nextNode(),m.push({type:2,index:++d});a.append(t[s],c())}}}else if(8===a.nodeType)if(a.data===o)m.push({type:2,index:d});else{let t=-1;for(;-1!==(t=a.data.indexOf(i,t+1));)m.push({type:7,index:d}),t+=i.length-1}d++}}static createElement(t,s){const i=r.createElement("template");return i.innerHTML=t,i}}class _{constructor(t,s){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=s}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}t(t){const{el:{content:s},parts:i}=this._$AD,e=(t?.creationScope??r).importNode(s,!0);g.currentNode=e;let o=g.nextNode(),h=0,n=0,c=i[0];for(;void 0!==c;){if(h===c.index){let s;2===c.type?s=new $(o,o.nextSibling,this,t):1===c.type&&(s=new c.ctor(o,c.name,c.strings,this,t)),this._$AV.push(s),c=i[++n]}h!==c?.index&&(o=g.nextNode(),h++)}return g.currentNode=r,e}i(t){let s=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,s),s+=i.strings.length-2):i._$AI(t[s])),s++}}class y{constructor({strings:t,_$litType$:s},i){if(this.parts=[],console.log("creating a DOM Parts template"),this.el=h(t,s,!0),s===n){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}const e=this.el.content.getPartRoot().getParts();let o=-1;for(const t of e)if(o++,t instanceof NodePart){let s;for(let i=0;i<t.metadata.length;i++){const e=t.metadata[i];"d"===e?(void 0!==s&&(this.parts.push(s),s=void 0),this.parts.push({type:6,index:o})):"attr"===e?(void 0!==s&&this.parts.push(s),s={type:1,index:o,name:t.metadata[++i],ctor:x,strings:[]}):'"'===e[0]&&s.strings.push(JSON.parse(e))}void 0!==s&&this.parts.push(s)}else t instanceof ChildNodePart&&this.parts.push({type:2,index:o})}}class w{constructor(t,s){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=s}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}t(t){const{el:{content:s},parts:i}=this._$AD,e=s.getPartRoot().clone(),o=e.getParts(),h=document.adoptNode(e.rootContainer);for(const s of i){const i=o[s.index];switch(s.type){case 2:this._$AV.push(new $(i.previousSibling,i.nextSibling,this,t));break;case 1:this._$AV.push(new s.ctor(i.node,s.name,s.strings,this,t))}}return h}i(t){let s=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,s),s+=i.strings.length-2):i._$AI(t[s])),s++}}class ${get _$AU(){return this._$AM?._$AU??this._$Co}constructor(t,s,i,e){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=t,this._$AB=s,this._$AM=i,this.options=e,this._$Co=e?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const s=this._$AM;return void 0!==s&&11===t?.nodeType&&(t=s.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t){l(t)?t===u||null==t||""===t?(this._$AH!==u&&this._$AR(),this._$AH=u):t!==this._$AH&&t!==f&&this.h(t):void 0!==t._$litType$?this.u(t):void 0!==t.nodeType?this.p(t):d(t)?this.m(t):this.h(t)}g(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}p(t){this._$AH!==t&&(this._$AR(),this._$AH=this.g(t))}h(t){this._$AH!==u&&l(this._$AH)?this._$AA.nextSibling.data=t:this.p(r.createTextNode(t)),this._$AH=t}u(t){const{values:s}=t,i=this._$AC(t);if(this._$AH?._$AD===i)this._$AH.i(s);else{const t=new(this.options?.useDomParts?w:_)(i,this),e=t.t(this.options);t.i(s),this.p(e),this._$AH=t}}_$AC(t){const s=this.options.useDomParts?p:m;let i=s.get(t.strings);if(void 0===i){const e=this.options.useDomParts?y:v;s.set(t.strings,i=new e(t))}return i}m(t){a(this._$AH)||(this._$AH=[],this._$AR());const s=this._$AH;let i,e=0;for(const o of t)e===s.length?s.push(i=new $(this.g(c()),this.g(c()),this,this.options)):i=s[e],i._$AI(o),e++;e<s.length&&(this._$AR(i&&i._$AB.nextSibling,e),s.length=e)}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(!1,!0,s);t&&t!==this._$AB;){const s=t.nextSibling;t.remove(),t=s}}setConnected(t){void 0===this._$AM&&(this._$Co=t,this._$AP?.(t))}}class x{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,s,i,e,o){this.type=1,this._$AH=u,this._$AN=void 0,this.element=t,this.name=s,this._$AM=e,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=u}_$AI(t,s,i){const e=this.strings;let o=!1;if(void 0===e)o=!l(t)||t!==this._$AH&&t!==f,o&&(this._$AH=t);else{const i=t;let h,n;for(t=e[0],h=0;h<e.length-1;h++)n=i[s+h],n===f&&(n=this._$AH[h]),o||=!l(n)||n!==this._$AH[h],n===u?t=u:t!==u&&(t+=(n??"")+e[h+1]),this._$AH[h]=n}o&&!i&&this._(t)}_(t){t===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}export{x as AttributePart,$ as ChildPart,d as isIterable,f as noChange,u as nothing};
//# sourceMappingURL=template.js.map

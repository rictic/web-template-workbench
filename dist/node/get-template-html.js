import{SVG_RESULT as t}from"./ttl.js";const r="$lit$",o=`lit$${(Math.random()+"").slice(9)}$`,e="?"+o,i=`<${e}>`,n=window.trustedTypes,s=n?n.createPolicy("web-template-workbench",{createHTML:t=>t}):void 0;function a(t,r){if(!Array.isArray(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==s?s.createHTML(r):r}const l=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,g=/-->/g,$=/>/g,v="[ \t\n\f\r]",d=/^(?:script|style|textarea|title)$/i,c=RegExp(`>|${v}(?:([^\\s"'>=/]+)(${v}*=${v}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),f=/'/g,p=/"/g,w=(e,n)=>{const s=e.length-1,v=[];let w,m=n===t?"<svg>":"",u=l;for(let t=0;t<s;t++){const n=e[t];let s,a,x=-1,h=0;for(;h<n.length&&(u.lastIndex=h,a=u.exec(n),null!==a);)h=u.lastIndex,u===l?"!--"===a[1]?u=g:void 0!==a[1]?u=$:void 0!==a[2]?(d.test(a[2])&&(w=RegExp("</"+a[2],"g")),u=c):void 0!==a[3]&&(u=c):u===c?">"===a[0]?(u=w??l,x=-1):void 0===a[1]?x=-2:(x=u.lastIndex-a[2].length,s=a[1],u=void 0===a[3]?c:'"'===a[3]?p:f):u===p||u===f?u=c:u===g||u===$?u=l:(u=c,w=void 0);const y=u===c&&e[t+1].startsWith("/>")?" ":"";m+=u===l?n+i:x>=0?(v.push(s),n.slice(0,x)+r+n.slice(x)+o+y):n+o+(-2===x?t:y)}return[a(e,m+(e[s]||"<?>")+(n===t?"</svg>":"")),v]};export{r as boundAttributeSuffix,w as getTemplateHtml,o as marker,e as markerMatch,d as rawTextElement,a as trustFromTemplateString};
//# sourceMappingURL=get-template-html.js.map

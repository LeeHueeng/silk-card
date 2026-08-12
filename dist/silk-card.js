var Wt=Object.defineProperty;var Gt=Object.getOwnPropertyDescriptor;var _=(i,t,e,s)=>{for(var r=s>1?void 0:s?Gt(t,e):t,n=i.length-1,o;n>=0;n--)(o=i[n])&&(r=(s?o(t,e,r):o(r))||r);return s&&r&&Wt(t,e,r),r};var q=globalThis,B=q.ShadowRoot&&(q.ShadyCSS===void 0||q.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Z=Symbol(),dt=new WeakMap,O=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==Z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(B&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=dt.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&dt.set(e,t))}return t}toString(){return this.cssText}},mt=i=>new O(typeof i=="string"?i:i+"",void 0,Z),tt=(i,...t)=>{let e=i.length===1?i[0]:t.reduce((s,r,n)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+i[n+1],i[0]);return new O(e,i,Z)},ft=(i,t)=>{if(B)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),r=q.litNonce;r!==void 0&&s.setAttribute("nonce",r),s.textContent=e.cssText,i.appendChild(s)}},et=B?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return mt(e)})(i):i;var{is:Kt,defineProperty:Jt,getOwnPropertyDescriptor:Qt,getOwnPropertyNames:Xt,getOwnPropertySymbols:Zt,getPrototypeOf:te}=Object,Y=globalThis,_t=Y.trustedTypes,ee=_t?_t.emptyScript:"",se=Y.reactiveElementPolyfillSupport,F=(i,t)=>i,H={toAttribute(i,t){switch(t){case Boolean:i=i?ee:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},V=(i,t)=>!Kt(i,t),gt={attribute:!0,type:String,converter:H,reflect:!1,useDefault:!1,hasChanged:V};Symbol.metadata??=Symbol("metadata"),Y.litPropertyMetadata??=new WeakMap;var x=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=gt){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),r=this.getPropertyDescriptor(t,s,e);r!==void 0&&Jt(this.prototype,t,r)}}static getPropertyDescriptor(t,e,s){let{get:r,set:n}=Qt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:r,set(o){let c=r?.call(this);n?.call(this,o),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??gt}static _$Ei(){if(this.hasOwnProperty(F("elementProperties")))return;let t=te(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(F("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(F("properties"))){let e=this.properties,s=[...Xt(e),...Zt(e)];for(let r of s)this.createProperty(r,e[r])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,r]of e)this.elementProperties.set(s,r)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let r=this._$Eu(e,s);r!==void 0&&this._$Eh.set(r,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let r of s)e.unshift(et(r))}else t!==void 0&&e.push(et(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ft(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),r=this.constructor._$Eu(t,s);if(r!==void 0&&s.reflect===!0){let n=(s.converter?.toAttribute!==void 0?s.converter:H).toAttribute(e,s.type);this._$Em=t,n==null?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(t,e){let s=this.constructor,r=s._$Eh.get(t);if(r!==void 0&&this._$Em!==r){let n=s.getPropertyOptions(r),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:H;this._$Em=r;let c=o.fromAttribute(e,n.type);this[r]=c??this._$Ej?.get(r)??c,this._$Em=null}}requestUpdate(t,e,s,r=!1,n){if(t!==void 0){let o=this.constructor;if(r===!1&&(n=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??V)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:r,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),n!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),r===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[r,n]of this._$Ep)this[r]=n;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[r,n]of s){let{wrapped:o}=n,c=this[r];o!==!0||this._$AL.has(r)||c===void 0||this.C(r,void 0,n,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[F("elementProperties")]=new Map,x[F("finalized")]=new Map,se?.({ReactiveElement:x}),(Y.reactiveElementVersions??=[]).push("2.1.2");var ct=globalThis,bt=i=>i,W=ct.trustedTypes,$t=W?W.createPolicy("lit-html",{createHTML:i=>i}):void 0,St="$lit$",w=`lit$${Math.random().toFixed(9).slice(2)}$`,Et="?"+w,re=`<${Et}>`,C=document,U=()=>C.createComment(""),D=i=>i===null||typeof i!="object"&&typeof i!="function",lt=Array.isArray,ie=i=>lt(i)||typeof i?.[Symbol.iterator]=="function",st=`[ 	
\f\r]`,k=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,yt=/-->/g,vt=/>/g,S=RegExp(`>|${st}(?:([^\\s"'>=/]+)(${st}*=${st}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),xt=/'/g,At=/"/g,Ct=/^(?:script|style|textarea|title)$/i,ht=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),b=ht(1),A=ht(2),Ce=ht(3),P=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),wt=new WeakMap,E=C.createTreeWalker(C,129);function Pt(i,t){if(!lt(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return $t!==void 0?$t.createHTML(t):t}var ne=(i,t)=>{let e=i.length-1,s=[],r,n=t===2?"<svg>":t===3?"<math>":"",o=k;for(let c=0;c<e;c++){let a=i[c],l,u,h=-1,d=0;for(;d<a.length&&(o.lastIndex=d,u=o.exec(a),u!==null);)d=o.lastIndex,o===k?u[1]==="!--"?o=yt:u[1]!==void 0?o=vt:u[2]!==void 0?(Ct.test(u[2])&&(r=RegExp("</"+u[2],"g")),o=S):u[3]!==void 0&&(o=S):o===S?u[0]===">"?(o=r??k,h=-1):u[1]===void 0?h=-2:(h=o.lastIndex-u[2].length,l=u[1],o=u[3]===void 0?S:u[3]==='"'?At:xt):o===At||o===xt?o=S:o===yt||o===vt?o=k:(o=S,r=void 0);let f=o===S&&i[c+1].startsWith("/>")?" ":"";n+=o===k?a+re:h>=0?(s.push(l),a.slice(0,h)+St+a.slice(h)+w+f):a+w+(h===-2?c:f)}return[Pt(i,n+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},L=class i{constructor({strings:t,_$litType$:e},s){let r;this.parts=[];let n=0,o=0,c=t.length-1,a=this.parts,[l,u]=ne(t,e);if(this.el=i.createElement(l,s),E.currentNode=this.el.content,e===2||e===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(r=E.nextNode())!==null&&a.length<c;){if(r.nodeType===1){if(r.hasAttributes())for(let h of r.getAttributeNames())if(h.endsWith(St)){let d=u[o++],f=r.getAttribute(h).split(w),v=/([.?@])?(.*)/.exec(d);a.push({type:1,index:n,name:v[2],strings:f,ctor:v[1]==="."?it:v[1]==="?"?nt:v[1]==="@"?ot:T}),r.removeAttribute(h)}else h.startsWith(w)&&(a.push({type:6,index:n}),r.removeAttribute(h));if(Ct.test(r.tagName)){let h=r.textContent.split(w),d=h.length-1;if(d>0){r.textContent=W?W.emptyScript:"";for(let f=0;f<d;f++)r.append(h[f],U()),E.nextNode(),a.push({type:2,index:++n});r.append(h[d],U())}}}else if(r.nodeType===8)if(r.data===Et)a.push({type:2,index:n});else{let h=-1;for(;(h=r.data.indexOf(w,h+1))!==-1;)a.push({type:7,index:n}),h+=w.length-1}n++}}static createElement(t,e){let s=C.createElement("template");return s.innerHTML=t,s}};function R(i,t,e=i,s){if(t===P)return t;let r=s!==void 0?e._$Co?.[s]:e._$Cl,n=D(t)?void 0:t._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),n===void 0?r=void 0:(r=new n(i),r._$AT(i,e,s)),s!==void 0?(e._$Co??=[])[s]=r:e._$Cl=r),r!==void 0&&(t=R(i,r._$AS(i,t.values),r,s)),t}var rt=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,r=(t?.creationScope??C).importNode(e,!0);E.currentNode=r;let n=E.nextNode(),o=0,c=0,a=s[0];for(;a!==void 0;){if(o===a.index){let l;a.type===2?l=new j(n,n.nextSibling,this,t):a.type===1?l=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(l=new at(n,this,t)),this._$AV.push(l),a=s[++c]}o!==a?.index&&(n=E.nextNode(),o++)}return E.currentNode=C,r}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},j=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,r){this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=R(this,t,e),D(t)?t===p||t==null||t===""?(this._$AH!==p&&this._$AR(),this._$AH=p):t!==this._$AH&&t!==P&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ie(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==p&&D(this._$AH)?this._$AA.nextSibling.data=t:this.T(C.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,r=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=L.createElement(Pt(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===r)this._$AH.p(e);else{let n=new rt(r,this),o=n.u(this.options);n.p(e),this.T(o),this._$AH=n}}_$AC(t){let e=wt.get(t.strings);return e===void 0&&wt.set(t.strings,e=new L(t)),e}k(t){lt(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,r=0;for(let n of t)r===e.length?e.push(s=new i(this.O(U()),this.O(U()),this,this.options)):s=e[r],s._$AI(n),r++;r<e.length&&(this._$AR(s&&s._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=bt(t).nextSibling;bt(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},T=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,r,n){this.type=1,this._$AH=p,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=n,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=p}_$AI(t,e=this,s,r){let n=this.strings,o=!1;if(n===void 0)t=R(this,t,e,0),o=!D(t)||t!==this._$AH&&t!==P,o&&(this._$AH=t);else{let c=t,a,l;for(t=n[0],a=0;a<n.length-1;a++)l=R(this,c[s+a],e,a),l===P&&(l=this._$AH[a]),o||=!D(l)||l!==this._$AH[a],l===p?t=p:t!==p&&(t+=(l??"")+n[a+1]),this._$AH[a]=l}o&&!r&&this.j(t)}j(t){t===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},it=class extends T{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===p?void 0:t}},nt=class extends T{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==p)}},ot=class extends T{constructor(t,e,s,r,n){super(t,e,s,r,n),this.type=5}_$AI(t,e=this){if((t=R(this,t,e,0)??p)===P)return;let s=this._$AH,r=t===p&&s!==p||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==p&&(s===p||r);r&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},at=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){R(this,t)}};var oe=ct.litHtmlPolyfillSupport;oe?.(L,j),(ct.litHtmlVersions??=[]).push("3.3.3");var Rt=(i,t,e)=>{let s=e?.renderBefore??t,r=s._$litPart$;if(r===void 0){let n=e?.renderBefore??null;s._$litPart$=r=new j(t.insertBefore(U(),n),n,void 0,e??{})}return r._$AI(i),r};var ut=globalThis,y=class extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Rt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return P}};y._$litElement$=!0,y.finalized=!0,ut.litElementHydrateSupport?.({LitElement:y});var ae=ut.litElementPolyfillSupport;ae?.({LitElement:y});(ut.litElementVersions??=[]).push("4.2.2");var G=i=>(t,e)=>{e!==void 0?e.addInitializer(()=>{customElements.define(i,t)}):customElements.define(i,t)};var ce={attribute:!0,type:String,converter:H,reflect:!1,hasChanged:V},le=(i=ce,t,e)=>{let{kind:s,metadata:r}=e,n=globalThis.litPropertyMetadata.get(r);if(n===void 0&&globalThis.litPropertyMetadata.set(r,n=new Map),s==="setter"&&((i=Object.create(i)).wrapped=!0),n.set(e.name,i),s==="accessor"){let{name:o}=e;return{set(c){let a=t.get.call(this);t.set.call(this,c),this.requestUpdate(o,a,i,!0,c)},init(c){return c!==void 0&&this.C(o,void 0,i,c),c}}}if(s==="setter"){let{name:o}=e;return function(c){let a=this[o];t.call(this,c),this.requestUpdate(o,a,i,!0,c)}}throw Error("Unsupported decorator location: "+s)};function N(i){return(t,e)=>typeof e=="object"?le(i,t,e):((s,r,n)=>{let o=r.hasOwnProperty(n);return r.constructor.createProperty(n,s),o?Object.getOwnPropertyDescriptor(r,n):void 0})(i,t,e)}function $(i){return N({...i,state:!0,attribute:!1})}var he=new Set(["unavailable","unknown","none",""]);function ue(i,t){let e=(t??"").toLowerCase();if(he.has(e))return{t:i,v:NaN};let s=Number(t);return{t:i,v:Number.isFinite(s)?s:NaN}}async function Tt(i,t,e,s){let r=await i.callWS({type:"history/history_during_period",start_time:new Date(e*1e3).toISOString(),end_time:new Date(s*1e3).toISOString(),entity_ids:t,minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),n={};for(let o of t){let c=r?.[o]??[];n[o]=c.map(a=>{let l=a.s??a.state,u=a.lu??a.last_updated??a.lc??a.last_changed,h=typeof u=="number"?u:Date.parse(u)/1e3;return ue(h,l)}).filter(a=>Number.isFinite(a.t)).sort((a,l)=>a.t-l.t)}return n}async function pe(i,t,e,s){let r=await i.callWS({type:"recorder/statistics_during_period",start_time:new Date(e*1e3).toISOString(),end_time:new Date(s*1e3).toISOString(),statistic_ids:t,period:"hour",types:["mean","state"]}),n={};for(let o of t){let c=r?.[o]??[];n[o]=c.map(a=>{let l=a.start,u=typeof l=="number"?l/1e3:Date.parse(l)/1e3,h=a.mean??a.state;return{t:u,v:typeof h=="number"&&Number.isFinite(h)?h:NaN}}).filter(a=>Number.isFinite(a.t)).sort((a,l)=>a.t-l.t)}return n}async function Nt(i,t,e,s,r){if(r<=48)return Tt(i,t,e,s);let n=await pe(i,t,e,s),o=t.filter(c=>!n[c]?.length);if(o.length)try{let c=await Tt(i,o,e,s);for(let a of o)n[a]=c[a]??[]}catch{for(let c of o)n[c]=n[c]??[]}return n}function Mt(i,t,e,s){let r=new Float64Array(s).fill(NaN);if(!i.length||e<=t)return r;let n=0;for(let o=0;o<s;o++){let c=t+(e-t)*o/(s-1);for(;n<i.length&&i[n].t<=c;)n++;n>0&&(r[o]=i[n-1].v)}return r}function It(i,t,e){let s=1/0,r=-1/0;for(let o of i)for(let c=0;c<o.length;c++){let a=o[c];Number.isFinite(a)&&(a<s&&(s=a),a>r&&(r=a))}if(!Number.isFinite(s))return[0,1];if(s===r){let o=Math.max(Math.abs(s)*.05,.5);s-=o,r+=o}let n=(r-s)*.08;return[t??s-n,e??r+n]}function Ot(i,t,e,s,r){let[n,o]=t,c=o-n||1,a=Math.max(e-s-r,1),l=new Float64Array(i.length);for(let u=0;u<i.length;u++){let h=i[u];l[u]=Number.isFinite(h)?s+(1-(h-n)/c)*a:NaN}return l}var m=i=>(Math.round(i*100)/100).toString();function Ft(i,t,e,s){let r=e-t,n=new Float64Array(r);if(r===1)return n;let o=new Float64Array(r-1);for(let c=0;c<r-1;c++)o[c]=(i[t+c+1]-i[t+c])/s;n[0]=o[0],n[r-1]=o[r-2];for(let c=1;c<r-1;c++)n[c]=o[c-1]*o[c]<=0?0:2*o[c-1]*o[c]/(o[c-1]+o[c]);return n}function Ht(i,t){let e=-1;for(let s=0;s<=i.length;s++){let r=s<i.length&&Number.isFinite(i[s]);r&&e<0&&(e=s),!r&&e>=0&&(t(e,s),e=-1)}}function kt(i,t){let e=i.length;if(e<2)return"";let s=t/(e-1),r=[];return Ht(i,(n,o)=>{if(o-n===1){r.push(`M ${m(n*s)} ${m(i[n])} l 0.01 0`);return}let c=Ft(i,n,o,s);r.push(`M ${m(n*s)} ${m(i[n])}`);for(let a=n;a<o-1;a++){let l=a-n,u=a*s,h=(a+1)*s,d=u+s/3,f=i[a]+c[l]*s/3,v=h-s/3,Q=i[a+1]-c[l+1]*s/3;r.push(`C ${m(d)} ${m(f)} ${m(v)} ${m(Q)} ${m(h)} ${m(i[a+1])}`)}}),r.join(" ")}function Ut(i,t,e){let s=i.length;if(s<2)return"";let r=t/(s-1),n=[];return Ht(i,(o,c)=>{if(c-o===1)return;let a=Ft(i,o,c,r);n.push(`M ${m(o*r)} ${m(e)} L ${m(o*r)} ${m(i[o])}`);for(let l=o;l<c-1;l++){let u=l-o,h=l*r,d=(l+1)*r;n.push(`C ${m(h+r/3)} ${m(i[l]+a[u]*r/3)} ${m(d-r/3)} ${m(i[l+1]-a[u+1]*r/3)} ${m(d)} ${m(i[l+1])}`)}n.push(`L ${m((c-1)*r)} ${m(e)} Z`)}),n.join(" ")}function Dt(i){for(let t=0;t<i.length;t++)if(Number.isFinite(i[t]))return t;return-1}function pt(i){for(let t=i.length-1;t>=0;t--)if(Number.isFinite(i[t]))return t;return-1}function Lt(i){let t=-1,e=-1;for(let s=0;s<i.length;s++){let r=i[s];Number.isFinite(r)&&((t<0||r<i[t])&&(t=s),(e<0||r>i[e])&&(e=s))}return{min:t,max:e}}var jt=i=>1-Math.pow(1-i,3),zt=i=>1-Math.pow(1-i,4);function qt(i){return i?.locale?.language??i?.language??"en"}function J(i,t,e){if(!Number.isFinite(e))return"\u2014";let s=i?.entities?.[t]?.display_precision??(Math.abs(e)>=100?0:Math.abs(e)>=10?1:2);return new Intl.NumberFormat(qt(i),{minimumFractionDigits:s,maximumFractionDigits:s}).format(e)}function Bt(i,t,e){return`${e>=0?"\u2191":"\u2193"} ${J(i,t,Math.abs(e))}`}function Yt(i,t,e){let s=new Date(t*1e3),r=qt(i);return e<=26?new Intl.DateTimeFormat(r,{hour:"numeric",minute:"2-digit"}).format(s):e<=24*8?new Intl.DateTimeFormat(r,{weekday:"short",hour:"numeric",minute:"2-digit"}).format(s):new Intl.DateTimeFormat(r,{month:"short",day:"numeric",hour:"numeric"}).format(s)}var de=[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"line_width",selector:{number:{min:1,max:8,step:.5,mode:"box"}}}]},{name:"",type:"grid",schema:[{name:"fill",selector:{boolean:{}}},{name:"extremes",selector:{boolean:{}}},{name:"range_selector",selector:{boolean:{}}},{name:"delta",selector:{boolean:{}}}]}],me={entity:"Entity",name:"Name",hours_to_show:"Hours to show",line_width:"Line width",fill:"Gradient fill",extremes:"Min/max markers",range_selector:"Range selector",delta:"Change badge"},M=class extends y{setConfig(t){this._config=t}render(){if(!this.hass||!this._config)return p;let t={hours_to_show:24,line_width:2.5,fill:!0,extremes:!0,range_selector:!0,delta:!0,...this._config};return b`
      <ha-form
        .hass=${this.hass}
        .data=${t}
        .schema=${de}
        .computeLabel=${e=>me[e.name]??e.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(t){t.stopPropagation();let e=t.detail.value;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}};_([N({attribute:!1})],M.prototype,"hass",2),_([$()],M.prototype,"_config",2),M=_([G("silk-card-editor")],M);var fe="0.1.0",Vt=["var(--primary-color, #4aa8ff)","#ef6c6c","#5ec78d","#f0b357","#a97ee8","#e879b9","#6ad4d4"],_e=["1h","12h","1d","1w","1m"],ge={h:1,d:24,w:168,m:720},be=15e3,$e=3e5,ye=0;function ve(i){let t=/^(\d+)([hdwm])$/i.exec(i.trim());return t?Number(t[1])*ge[t[2].toLowerCase()]:null}var g=class extends y{constructor(){super(...arguments);this._hours=24;this._scrubIndex=null;this._focusIndex=null;this._width=0;this._height=0;this._drawProgress=0;this._rev=0;this._uid=`silk${++ye}`;this._seriesCfgs=[];this._points=[];this._vals=[];this._pxYs=[];this._domain=[0,1];this._windowStart=0;this._windowEnd=0;this._hasDrawn=!1;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastUpdated={}}static getStubConfig(e){let s=Object.keys(e.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(e.states[n].state))&&e.states[n].attributes.unit_of_measurement);return{type:"custom:silk-card",entity:s.find(n=>e.states[n].attributes.device_class==="temperature")??s[0]}}static async getConfigElement(){return document.createElement("silk-card-editor")}setConfig(e){if(!e.entity&&!e.entities?.length)throw new Error("silk-card: define an `entity` or a list of `entities`");let s=e.entities??[e.entity];this._seriesCfgs=s.map((r,n)=>{let o=typeof r=="string"?{entity:r}:r;return{entity:o.entity,name:o.name,color:o.color??e.color??Vt[n%Vt.length]}}),this._config=e,this._hours=e.hours_to_show??24,this._fetchStarted=!1,this._hasDrawn=!1,this._vals=[],this._pxYs=[],this._focusIndex=null}getCardSize(){return 3}getGridOptions(){return{columns:12,rows:3,min_rows:2,min_columns:4}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(!0),$e)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._animId&&cancelAnimationFrame(this._animId),this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(e){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh(!1);return}e.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let e=this.renderRoot.querySelector(".graph");e&&(this._resizeObserver=new ResizeObserver(s=>{let r=s[0].contentRect;r.width===this._width&&r.height===this._height||(this._width=r.width,this._height=r.height,this._recompute(!1))}),this._resizeObserver.observe(e))}_onStatesChanged(){let e=!1;for(let r of this._seriesCfgs){let n=this.hass.states[r.entity]?.last_updated;n&&n!==this._lastUpdated[r.entity]&&(this._lastUpdated[r.entity]=n,e=!0)}if(!e||this._refreshTimer)return;let s=Math.max(0,be-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh(!0)},s)}async _refresh(e){if(!this.hass||!this._seriesCfgs.length)return;let s=++this._fetchSeq,r=Date.now()/1e3,n=r-this._hours*3600,o;try{o=await Nt(this.hass,this._seriesCfgs.map(a=>a.entity),n,r,this._hours)}catch(a){console.warn("silk-card: history fetch failed",a);return}if(s!==this._fetchSeq)return;this._lastFetch=Date.now(),this._windowStart=n,this._windowEnd=r;let c=this._config?.points??120;this._points=this._seriesCfgs.map(a=>o[a.entity]??[]),this._vals=this._points.map(a=>Mt(a,n,r,c)),this._domain=It(this._vals,this._config?.y_min,this._config?.y_max),this._recompute(e)}_recompute(e){if(!this._vals.length||!this._width||!this._height)return;let s=this._config?.extremes!==!1,r=s?22:10,n=s?18:8,o=this._vals.map(c=>Ot(c,this._domain,this._height,r,n));this._setDisplay(o,e)}_setDisplay(e,s){if(this._animId&&cancelAnimationFrame(this._animId),!(s&&this._pxYs.length===e.length&&this._pxYs[0]?.length===e[0]?.length)){this._pxYs=e,this._rev++,this._hasDrawn?this._drawProgress=1:(this._hasDrawn=!0,this._animateDrawIn());return}let n=this._pxYs.map(l=>Float64Array.from(l)),o=performance.now(),c=420,a=l=>{let u=Math.min((l-o)/c,1),h=jt(u);for(let d=0;d<e.length;d++){let f=n[d],v=e[d],Q=this._pxYs[d];for(let I=0;I<v.length;I++){let z=f[I],X=v[I];Q[I]=!Number.isFinite(z)||!Number.isFinite(X)?u<.5?z:X:z+(X-z)*h}}this._rev++,u<1&&(this._animId=requestAnimationFrame(a))};this._animId=requestAnimationFrame(a)}_animateDrawIn(){let e=performance.now(),s=900,r=n=>{let o=Math.min((n-e)/s,1);this._drawProgress=zt(o),o<1&&(this._animId=requestAnimationFrame(r))};this._animId=requestAnimationFrame(r)}_selectRange(e){e!==this._hours&&(this._hours=e,this._scrubIndex=null,this._refresh(!0))}_onPointerDown(e){e.currentTarget.setPointerCapture(e.pointerId),this._scrub(e)}_onPointerMove(e){this._scrubIndex!==null&&this._scrub(e)}_onPointerEnd(){this._scrubIndex=null}_scrub(e){if(!this._width||!this._vals.length)return;let s=e.currentTarget.getBoundingClientRect(),r=Math.min(Math.max(e.clientX-s.left,0),this._width),n=this._vals[0].length;this._scrubIndex=Math.round(r/this._width*(n-1))}_toggleFocus(e){this._focusIndex=this._focusIndex===e?null:e}get _primaryIndex(){return this._focusIndex??0}_valueAt(e,s){return this._vals[e]?.[s]??NaN}_timeAt(e){let s=this._vals[0]?.length??1;return this._windowStart+(this._windowEnd-this._windowStart)*e/Math.max(s-1,1)}render(){if(!this._config)return p;this._rev;let e=this.hass,s=this._seriesCfgs[this._primaryIndex],r=e?.states[s.entity];if(e&&!r)return b`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let n=this._scrubIndex!==null&&this._vals.length>0,o=n?this._valueAt(this._primaryIndex,this._scrubIndex):Number(r?.state),c=this._config.unit??r?.attributes.unit_of_measurement??"",a=this._config.name??s.name??r?.attributes.friendly_name??s.entity;return b`
      <ha-card>
        <div class="header">
          <div class="title-row">
            <span class="name">
              ${this._config.icon?b`<ha-icon .icon=${this._config.icon}></ha-icon>`:p}
              ${a}
            </span>
            ${this._renderRangeChips()}
          </div>
          <div class="value-row">
            <span class="value">${J(e,s.entity,o)}</span>
            <span class="unit">${c}</span>
            ${n?this._renderScrubTime():this._renderDelta(s.entity)}
          </div>
          ${this._seriesCfgs.length>1?this._renderLegend():p}
        </div>
        <div
          class="graph"
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerEnd}
          @pointercancel=${this._onPointerEnd}
        >
          ${this._renderSvg()}
        </div>
      </ha-card>
    `}_renderRangeChips(){if(this._config?.range_selector===!1)return p;let e=this._config?.ranges??_e;return b`
      <span class="ranges">
        ${e.map(s=>{let r=ve(s);return r===null?p:b`
            <button
              class="chip ${r===this._hours?"active":""}"
              @click=${()=>this._selectRange(r)}
            >
              ${s.toUpperCase()}
            </button>
          `})}
      </span>
    `}_renderDelta(e){if(this._config?.delta===!1||!this._vals.length)return p;let s=this._vals[this._primaryIndex],r=Dt(s),n=pt(s);if(r<0||n<=r)return p;let o=s[n]-s[r];return b`<span class="delta">${Bt(this.hass,e,o)}</span>`}_renderScrubTime(){return b`<span class="scrub-time">${Yt(this.hass,this._timeAt(this._scrubIndex),this._hours)}</span>`}_renderLegend(){return b`
      <div class="legend">
        ${this._seriesCfgs.map((e,s)=>{let r=this.hass?.states[e.entity],n=e.name??r?.attributes.friendly_name??e.entity,o=this._focusIndex!==null&&this._focusIndex!==s;return b`
            <button class="legend-chip ${o?"dim":""}" @click=${()=>this._toggleFocus(s)}>
              <span class="dot" style="background:${e.color}"></span>
              ${n}
            </button>
          `})}
      </div>
    `}_renderSvg(){let e=this._width,s=this._height;if(!e||!s||!this._pxYs.length)return p;let r=this._config?.line_width??2.5,n=this._config?.fill!==!1,o=`${this._uid}-clip`;return b`
      <svg viewBox="0 0 ${e} ${s}" width=${e} height=${s}>
        <defs>
          <clipPath id=${o}>
            <rect x="0" y="0" width=${e*this._drawProgress} height=${s}></rect>
          </clipPath>
          ${this._seriesCfgs.map((c,a)=>A`
              <linearGradient id="${this._uid}-fill-${a}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.30" style="color:${c.color}"></stop>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" style="color:${c.color}"></stop>
              </linearGradient>
            `)}
        </defs>
        <g clip-path="url(#${o})">
          ${this._seriesCfgs.map((c,a)=>this._renderSeries(c,a,e,s,r,n))}
        </g>
        ${this._renderExtremes(e)}
        ${this._renderScrubOverlay(e,s)}
      </svg>
    `}_renderSeries(e,s,r,n,o,c){let a=this._pxYs[s],l=this._focusIndex!==null&&this._focusIndex!==s,u=kt(a,r),h=c?Ut(a,r,n):"",d=pt(a),f=d>=0?d/(a.length-1)*r:0;return A`
      <g style="color:${e.color}" opacity=${l?.22:1} class="series">
        ${c?A`<path class="area" d=${h} fill="url(#${this._uid}-fill-${s})"></path>`:p}
        <path
          class="line"
          d=${u}
          fill="none"
          stroke="currentColor"
          stroke-width=${o}
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        ${d>=0&&this._drawProgress>=1?A`
              <circle class="pulse" cx=${f} cy=${a[d]} r="4" fill="currentColor"></circle>
              <circle cx=${f} cy=${a[d]} r="3" fill="currentColor"></circle>
            `:p}
      </g>
    `}_renderExtremes(e){if(this._config?.extremes===!1||!this._pxYs.length)return p;let s=this._primaryIndex,r=this._vals[s],n=this._pxYs[s];if(!r)return p;let{min:o,max:c}=Lt(r);if(o<0||c<0||o===c)return p;let a=this._seriesCfgs[s].entity,l=(u,h)=>{let d=u/(r.length-1)*e,f=d<40?"start":d>e-40?"end":"middle";return A`
        <circle cx=${d} cy=${n[u]} r="2.5" class="extreme-dot"></circle>
        <text x=${d} y=${n[u]+(h?14:-8)} text-anchor=${f} class="extreme-label">
          ${J(this.hass,a,r[u])}
        </text>
      `};return A`${l(c,!1)}${l(o,!0)}`}_renderScrubOverlay(e,s){if(this._scrubIndex===null||!this._pxYs.length)return p;let r=this._pxYs[0].length,n=this._scrubIndex/(r-1)*e;return A`
      <line x1=${n} y1="0" x2=${n} y2=${s} class="scrub-line"></line>
      ${this._pxYs.map((o,c)=>{let a=o[this._scrubIndex];return Number.isFinite(a)?A`<circle cx=${n} cy=${a} r="4.5" class="scrub-dot" style="color:${this._seriesCfgs[c].color}" fill="currentColor"></circle>`:p})}
    `}};g.styles=tt`
    :host {
      display: block;
      height: 100%;
    }
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .warning {
      padding: 16px;
      color: var(--error-color, #db4437);
    }
    .header {
      padding: 14px 16px 2px;
    }
    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 24px;
    }
    .name {
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .name ha-icon {
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .ranges {
      display: inline-flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .chip {
      border: none;
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 3px 8px;
      border-radius: 999px;
      cursor: pointer;
      color: var(--secondary-text-color);
      background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .chip:hover {
      background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
    }
    .chip.active {
      color: var(--primary-color);
      background: rgba(var(--rgb-primary-color, 74, 168, 255), 0.14);
    }
    .value-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 2px;
    }
    .value {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: var(--primary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .unit {
      font-size: 15px;
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    .delta,
    .scrub-time {
      font-size: 13px;
      font-weight: 500;
      color: var(--secondary-text-color);
      margin-left: 4px;
      font-variant-numeric: tabular-nums;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      margin-top: 6px;
    }
    .legend-chip {
      border: none;
      background: none;
      font: inherit;
      font-size: 12px;
      color: var(--secondary-text-color);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 0;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .legend-chip.dim {
      opacity: 0.35;
    }
    .legend-chip .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .graph {
      flex: 1;
      position: relative;
      min-height: 80px;
      cursor: crosshair;
      touch-action: pan-y;
    }
    svg {
      position: absolute;
      inset: 0;
      display: block;
      overflow: visible;
    }
    .extreme-dot {
      fill: var(--secondary-text-color);
      opacity: 0.7;
    }
    .extreme-label {
      font-size: 10px;
      font-weight: 500;
      fill: var(--secondary-text-color);
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
    }
    .scrub-line {
      stroke: var(--secondary-text-color);
      stroke-width: 1;
      opacity: 0.4;
    }
    .scrub-dot {
      stroke: var(--card-background-color, #fff);
      stroke-width: 2;
    }
    .pulse {
      animation: silk-pulse 2.4s ease-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }
    @keyframes silk-pulse {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      70% {
        transform: scale(3.2);
        opacity: 0;
      }
      100% {
        transform: scale(3.2);
        opacity: 0;
      }
    }
  `,_([N({attribute:!1})],g.prototype,"hass",2),_([$()],g.prototype,"_config",2),_([$()],g.prototype,"_hours",2),_([$()],g.prototype,"_scrubIndex",2),_([$()],g.prototype,"_focusIndex",2),_([$()],g.prototype,"_width",2),_([$()],g.prototype,"_height",2),_([$()],g.prototype,"_drawProgress",2),_([$()],g.prototype,"_rev",2),g=_([G("silk-card")],g);window.customCards=window.customCards||[];window.customCards.push({type:"silk-card",name:"Silk Card",description:"Buttery-smooth, interactive history graph. Scrub it, zoom it, watch it morph.",preview:!0,documentationURL:"https://github.com/LeeHueeng/silk-card"});console.info(`%c SILK-CARD %c v${fe} `,"background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0;font-weight:700","background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 0");export{g as SilkCard};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/custom-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/property.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/state.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/event-options.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/base.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-all.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-async.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/

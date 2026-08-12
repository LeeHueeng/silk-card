var ya=Object.defineProperty;var xa=Object.getOwnPropertyDescriptor;var m=(a,s,t,e)=>{for(var i=e>1?void 0:e?xa(s,t):s,n=a.length-1,r;n>=0;n--)(r=a[n])&&(i=(e?r(s,t,i):r(i))||i);return e&&i&&ya(s,t,i),i};var Ve=globalThis,Ge=Ve.ShadowRoot&&(Ve.ShadyCSS===void 0||Ve.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,gi=Symbol(),dn=new WeakMap,Me=class{constructor(s,t,e){if(this._$cssResult$=!0,e!==gi)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=s,this.t=t}get styleSheet(){let s=this.o,t=this.t;if(Ge&&s===void 0){let e=t!==void 0&&t.length===1;e&&(s=dn.get(t)),s===void 0&&((this.o=s=new CSSStyleSheet).replaceSync(this.cssText),e&&dn.set(t,s))}return s}toString(){return this.cssText}},mn=a=>new Me(typeof a=="string"?a:a+"",void 0,gi),w=(a,...s)=>{let t=a.length===1?a[0]:s.reduce((e,i,n)=>e+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+a[n+1],a[0]);return new Me(t,a,gi)},pn=(a,s)=>{if(Ge)a.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of s){let e=document.createElement("style"),i=Ve.litNonce;i!==void 0&&e.setAttribute("nonce",i),e.textContent=t.cssText,a.appendChild(e)}},_i=Ge?a=>a:a=>a instanceof CSSStyleSheet?(s=>{let t="";for(let e of s.cssRules)t+=e.cssText;return mn(t)})(a):a;var{is:wa,defineProperty:ka,getOwnPropertyDescriptor:$a,getOwnPropertyNames:Ta,getOwnPropertySymbols:Ea,getPrototypeOf:Ca}=Object,Be=globalThis,un=Be.trustedTypes,Aa=un?un.emptyScript:"",Sa=Be.reactiveElementPolyfillSupport,Pe=(a,s)=>a,Oe={toAttribute(a,s){switch(s){case Boolean:a=a?Aa:null;break;case Object:case Array:a=a==null?a:JSON.stringify(a)}return a},fromAttribute(a,s){let t=a;switch(s){case Boolean:t=a!==null;break;case Number:t=a===null?null:Number(a);break;case Object:case Array:try{t=JSON.parse(a)}catch{t=null}}return t}},We=(a,s)=>!wa(a,s),hn={attribute:!0,type:String,converter:Oe,reflect:!1,useDefault:!1,hasChanged:We};Symbol.metadata??=Symbol("metadata"),Be.litPropertyMetadata??=new WeakMap;var vt=class extends HTMLElement{static addInitializer(s){this._$Ei(),(this.l??=[]).push(s)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(s,t=hn){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(s)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(s,t),!t.noAccessor){let e=Symbol(),i=this.getPropertyDescriptor(s,e,t);i!==void 0&&ka(this.prototype,s,i)}}static getPropertyDescriptor(s,t,e){let{get:i,set:n}=$a(this.prototype,s)??{get(){return this[t]},set(r){this[t]=r}};return{get:i,set(r){let o=i?.call(this);n?.call(this,r),this.requestUpdate(s,o,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(s){return this.elementProperties.get(s)??hn}static _$Ei(){if(this.hasOwnProperty(Pe("elementProperties")))return;let s=Ca(this);s.finalize(),s.l!==void 0&&(this.l=[...s.l]),this.elementProperties=new Map(s.elementProperties)}static finalize(){if(this.hasOwnProperty(Pe("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Pe("properties"))){let t=this.properties,e=[...Ta(t),...Ea(t)];for(let i of e)this.createProperty(i,t[i])}let s=this[Symbol.metadata];if(s!==null){let t=litPropertyMetadata.get(s);if(t!==void 0)for(let[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(let[t,e]of this.elementProperties){let i=this._$Eu(t,e);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(s){let t=[];if(Array.isArray(s)){let e=new Set(s.flat(1/0).reverse());for(let i of e)t.unshift(_i(i))}else s!==void 0&&t.push(_i(s));return t}static _$Eu(s,t){let e=t.attribute;return e===!1?void 0:typeof e=="string"?e:typeof s=="string"?s.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(s=>this.enableUpdating=s),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(s=>s(this))}addController(s){(this._$EO??=new Set).add(s),this.renderRoot!==void 0&&this.isConnected&&s.hostConnected?.()}removeController(s){this._$EO?.delete(s)}_$E_(){let s=new Map,t=this.constructor.elementProperties;for(let e of t.keys())this.hasOwnProperty(e)&&(s.set(e,this[e]),delete this[e]);s.size>0&&(this._$Ep=s)}createRenderRoot(){let s=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return pn(s,this.constructor.elementStyles),s}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(s=>s.hostConnected?.())}enableUpdating(s){}disconnectedCallback(){this._$EO?.forEach(s=>s.hostDisconnected?.())}attributeChangedCallback(s,t,e){this._$AK(s,e)}_$ET(s,t){let e=this.constructor.elementProperties.get(s),i=this.constructor._$Eu(s,e);if(i!==void 0&&e.reflect===!0){let n=(e.converter?.toAttribute!==void 0?e.converter:Oe).toAttribute(t,e.type);this._$Em=s,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(s,t){let e=this.constructor,i=e._$Eh.get(s);if(i!==void 0&&this._$Em!==i){let n=e.getPropertyOptions(i),r=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:Oe;this._$Em=i;let o=r.fromAttribute(t,n.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(s,t,e,i=!1,n){if(s!==void 0){let r=this.constructor;if(i===!1&&(n=this[s]),e??=r.getPropertyOptions(s),!((e.hasChanged??We)(n,t)||e.useDefault&&e.reflect&&n===this._$Ej?.get(s)&&!this.hasAttribute(r._$Eu(s,e))))return;this.C(s,t,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(s,t,{useDefault:e,reflect:i,wrapped:n},r){e&&!(this._$Ej??=new Map).has(s)&&(this._$Ej.set(s,r??t??this[s]),n!==!0||r!==void 0)||(this._$AL.has(s)||(this.hasUpdated||e||(t=void 0),this._$AL.set(s,t)),i===!0&&this._$Em!==s&&(this._$Eq??=new Set).add(s))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let s=this.scheduleUpdate();return s!=null&&await s,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[i,n]of e){let{wrapped:r}=n,o=this[i];r!==!0||this._$AL.has(i)||o===void 0||this.C(i,void 0,n,o)}}let s=!1,t=this._$AL;try{s=this.shouldUpdate(t),s?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(e){throw s=!1,this._$EM(),e}s&&this._$AE(t)}willUpdate(s){}_$AE(s){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(s)),this.updated(s)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(s){return!0}update(s){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(s){}firstUpdated(s){}};vt.elementStyles=[],vt.shadowRootOptions={mode:"open"},vt[Pe("elementProperties")]=new Map,vt[Pe("finalized")]=new Map,Sa?.({ReactiveElement:vt}),(Be.reactiveElementVersions??=[]).push("2.1.2");var $i=globalThis,fn=a=>a,Ye=$i.trustedTypes,gn=Ye?Ye.createPolicy("lit-html",{createHTML:a=>a}):void 0,wn="$lit$",Pt=`lit$${Math.random().toFixed(9).slice(2)}$`,kn="?"+Pt,Ma=`<${kn}>`,se=document,He=()=>se.createComment(""),Le=a=>a===null||typeof a!="object"&&typeof a!="function",Ti=Array.isArray,Pa=a=>Ti(a)||typeof a?.[Symbol.iterator]=="function",vi=`[ 	
\f\r]`,Re=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_n=/-->/g,vn=/>/g,ie=RegExp(`>|${vi}(?:([^\\s"'>=/]+)(${vi}*=${vi}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),bn=/'/g,yn=/"/g,$n=/^(?:script|style|textarea|title)$/i,Ei=a=>(s,...t)=>({_$litType$:a,strings:s,values:t}),l=Ei(1),z=Ei(2),Em=Ei(3),re=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),xn=new WeakMap,ne=se.createTreeWalker(se,129);function Tn(a,s){if(!Ti(a)||!a.hasOwnProperty("raw"))throw Error("invalid template strings array");return gn!==void 0?gn.createHTML(s):s}var Oa=(a,s)=>{let t=a.length-1,e=[],i,n=s===2?"<svg>":s===3?"<math>":"",r=Re;for(let o=0;o<t;o++){let c=a[o],d,u,f=-1,g=0;for(;g<c.length&&(r.lastIndex=g,u=r.exec(c),u!==null);)g=r.lastIndex,r===Re?u[1]==="!--"?r=_n:u[1]!==void 0?r=vn:u[2]!==void 0?($n.test(u[2])&&(i=RegExp("</"+u[2],"g")),r=ie):u[3]!==void 0&&(r=ie):r===ie?u[0]===">"?(r=i??Re,f=-1):u[1]===void 0?f=-2:(f=r.lastIndex-u[2].length,d=u[1],r=u[3]===void 0?ie:u[3]==='"'?yn:bn):r===yn||r===bn?r=ie:r===_n||r===vn?r=Re:(r=ie,i=void 0);let v=r===ie&&a[o+1].startsWith("/>")?" ":"";n+=r===Re?c+Ma:f>=0?(e.push(d),c.slice(0,f)+wn+c.slice(f)+Pt+v):c+Pt+(f===-2?o:v)}return[Tn(a,n+(a[t]||"<?>")+(s===2?"</svg>":s===3?"</math>":"")),e]},Ne=class a{constructor({strings:s,_$litType$:t},e){let i;this.parts=[];let n=0,r=0,o=s.length-1,c=this.parts,[d,u]=Oa(s,t);if(this.el=a.createElement(d,e),ne.currentNode=this.el.content,t===2||t===3){let f=this.el.content.firstChild;f.replaceWith(...f.childNodes)}for(;(i=ne.nextNode())!==null&&c.length<o;){if(i.nodeType===1){if(i.hasAttributes())for(let f of i.getAttributeNames())if(f.endsWith(wn)){let g=u[r++],v=i.getAttribute(f).split(Pt),$=/([.?@])?(.*)/.exec(g);c.push({type:1,index:n,name:$[2],strings:v,ctor:$[1]==="."?yi:$[1]==="?"?xi:$[1]==="@"?wi:xe}),i.removeAttribute(f)}else f.startsWith(Pt)&&(c.push({type:6,index:n}),i.removeAttribute(f));if($n.test(i.tagName)){let f=i.textContent.split(Pt),g=f.length-1;if(g>0){i.textContent=Ye?Ye.emptyScript:"";for(let v=0;v<g;v++)i.append(f[v],He()),ne.nextNode(),c.push({type:2,index:++n});i.append(f[g],He())}}}else if(i.nodeType===8)if(i.data===kn)c.push({type:2,index:n});else{let f=-1;for(;(f=i.data.indexOf(Pt,f+1))!==-1;)c.push({type:7,index:n}),f+=Pt.length-1}n++}}static createElement(s,t){let e=se.createElement("template");return e.innerHTML=s,e}};function ye(a,s,t=a,e){if(s===re)return s;let i=e!==void 0?t._$Co?.[e]:t._$Cl,n=Le(s)?void 0:s._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(a),i._$AT(a,t,e)),e!==void 0?(t._$Co??=[])[e]=i:t._$Cl=i),i!==void 0&&(s=ye(a,i._$AS(a,s.values),i,e)),s}var bi=class{constructor(s,t){this._$AV=[],this._$AN=void 0,this._$AD=s,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(s){let{el:{content:t},parts:e}=this._$AD,i=(s?.creationScope??se).importNode(t,!0);ne.currentNode=i;let n=ne.nextNode(),r=0,o=0,c=e[0];for(;c!==void 0;){if(r===c.index){let d;c.type===2?d=new Ie(n,n.nextSibling,this,s):c.type===1?d=new c.ctor(n,c.name,c.strings,this,s):c.type===6&&(d=new ki(n,this,s)),this._$AV.push(d),c=e[++o]}r!==c?.index&&(n=ne.nextNode(),r++)}return ne.currentNode=se,i}p(s){let t=0;for(let e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(s,e,t),t+=e.strings.length-2):e._$AI(s[t])),t++}},Ie=class a{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(s,t,e,i){this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=s,this._$AB=t,this._$AM=e,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let s=this._$AA.parentNode,t=this._$AM;return t!==void 0&&s?.nodeType===11&&(s=t.parentNode),s}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(s,t=this){s=ye(this,s,t),Le(s)?s===p||s==null||s===""?(this._$AH!==p&&this._$AR(),this._$AH=p):s!==this._$AH&&s!==re&&this._(s):s._$litType$!==void 0?this.$(s):s.nodeType!==void 0?this.T(s):Pa(s)?this.k(s):this._(s)}O(s){return this._$AA.parentNode.insertBefore(s,this._$AB)}T(s){this._$AH!==s&&(this._$AR(),this._$AH=this.O(s))}_(s){this._$AH!==p&&Le(this._$AH)?this._$AA.nextSibling.data=s:this.T(se.createTextNode(s)),this._$AH=s}$(s){let{values:t,_$litType$:e}=s,i=typeof e=="number"?this._$AC(s):(e.el===void 0&&(e.el=Ne.createElement(Tn(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===i)this._$AH.p(t);else{let n=new bi(i,this),r=n.u(this.options);n.p(t),this.T(r),this._$AH=n}}_$AC(s){let t=xn.get(s.strings);return t===void 0&&xn.set(s.strings,t=new Ne(s)),t}k(s){Ti(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,e,i=0;for(let n of s)i===t.length?t.push(e=new a(this.O(He()),this.O(He()),this,this.options)):e=t[i],e._$AI(n),i++;i<t.length&&(this._$AR(e&&e._$AB.nextSibling,i),t.length=i)}_$AR(s=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);s!==this._$AB;){let e=fn(s).nextSibling;fn(s).remove(),s=e}}setConnected(s){this._$AM===void 0&&(this._$Cv=s,this._$AP?.(s))}},xe=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(s,t,e,i,n){this.type=1,this._$AH=p,this._$AN=void 0,this.element=s,this.name=t,this._$AM=i,this.options=n,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=p}_$AI(s,t=this,e,i){let n=this.strings,r=!1;if(n===void 0)s=ye(this,s,t,0),r=!Le(s)||s!==this._$AH&&s!==re,r&&(this._$AH=s);else{let o=s,c,d;for(s=n[0],c=0;c<n.length-1;c++)d=ye(this,o[e+c],t,c),d===re&&(d=this._$AH[c]),r||=!Le(d)||d!==this._$AH[c],d===p?s=p:s!==p&&(s+=(d??"")+n[c+1]),this._$AH[c]=d}r&&!i&&this.j(s)}j(s){s===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,s??"")}},yi=class extends xe{constructor(){super(...arguments),this.type=3}j(s){this.element[this.name]=s===p?void 0:s}},xi=class extends xe{constructor(){super(...arguments),this.type=4}j(s){this.element.toggleAttribute(this.name,!!s&&s!==p)}},wi=class extends xe{constructor(s,t,e,i,n){super(s,t,e,i,n),this.type=5}_$AI(s,t=this){if((s=ye(this,s,t,0)??p)===re)return;let e=this._$AH,i=s===p&&e!==p||s.capture!==e.capture||s.once!==e.once||s.passive!==e.passive,n=s!==p&&(e===p||i);i&&this.element.removeEventListener(this.name,this,e),n&&this.element.addEventListener(this.name,this,s),this._$AH=s}handleEvent(s){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,s):this._$AH.handleEvent(s)}},ki=class{constructor(s,t,e){this.element=s,this.type=6,this._$AN=void 0,this._$AM=t,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(s){ye(this,s)}};var Ra=$i.litHtmlPolyfillSupport;Ra?.(Ne,Ie),($i.litHtmlVersions??=[]).push("3.3.3");var En=(a,s,t)=>{let e=t?.renderBefore??s,i=e._$litPart$;if(i===void 0){let n=t?.renderBefore??null;e._$litPart$=i=new Ie(s.insertBefore(He(),n),n,void 0,t??{})}return i._$AI(a),i};var Ci=globalThis,y=class extends vt{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let s=super.createRenderRoot();return this.renderOptions.renderBefore??=s.firstChild,s}update(s){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(s),this._$Do=En(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return re}};y._$litElement$=!0,y.finalized=!0,Ci.litElementHydrateSupport?.({LitElement:y});var Ha=Ci.litElementPolyfillSupport;Ha?.({LitElement:y});(Ci.litElementVersions??=[]).push("4.2.2");var x=a=>(s,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(a,s)}):customElements.define(a,s)};var La={attribute:!0,type:String,converter:Oe,reflect:!1,hasChanged:We},Na=(a=La,s,t)=>{let{kind:e,metadata:i}=t,n=globalThis.litPropertyMetadata.get(i);if(n===void 0&&globalThis.litPropertyMetadata.set(i,n=new Map),e==="setter"&&((a=Object.create(a)).wrapped=!0),n.set(t.name,a),e==="accessor"){let{name:r}=t;return{set(o){let c=s.get.call(this);s.set.call(this,o),this.requestUpdate(r,c,a,!0,o)},init(o){return o!==void 0&&this.C(r,void 0,a,o),o}}}if(e==="setter"){let{name:r}=t;return function(o){let c=this[r];s.call(this,o),this.requestUpdate(r,c,a,!0,o)}}throw Error("Unsupported decorator location: "+e)};function b(a){return(s,t)=>typeof t=="object"?Na(a,s,t):((e,i,n)=>{let r=i.hasOwnProperty(n);return i.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(i,n):void 0})(a,s,t)}function h(a){return b({...a,state:!0,attribute:!1})}var oe=(a,s,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof s!="object"&&Object.defineProperty(a,s,t),t);function Cn(a,s){return(t,e,i)=>{let n=r=>r.renderRoot?.querySelector(a)??null;if(s){let{get:r,set:o}=typeof e=="object"?t:i??(()=>{let c=Symbol();return{get(){return this[c]},set(d){this[c]=d}}})();return oe(t,e,{get(){let c=r.call(this);return c===void 0&&(c=n(this),(c!==null||this.hasUpdated)&&o.call(this,c)),c}})}return oe(t,e,{get(){return n(this)}})}}function O(a){return a.split(".")[0]}function _(a){return!a||a.state==="unavailable"||a.state==="unknown"}function R(a){if(!a)return!1;let s=a.state,t=O(a.entity_id);if(t==="button"||t==="input_button"||t==="scene")return s!=="unavailable";if(s==="unavailable"||s==="unknown")return!1;if(s==="off")return t==="alert";switch(t){case"alarm_control_panel":return s!=="disarmed";case"alert":return s!=="idle";case"cover":case"valve":return s!=="closed";case"device_tracker":case"person":return s!=="not_home";case"lawn_mower":return s!=="docked"&&s!=="paused";case"lock":return s!=="locked";case"media_player":return s!=="standby";case"vacuum":return s!=="idle"&&s!=="docked"&&s!=="paused";case"plant":return s==="problem";case"timer":return s==="active";case"camera":return s==="streaming"||s==="recording";default:return!0}}var Ia=new Set(["closed","locked","off"]);function j(a,s){let t=O(s),e=a.states[s],i=e?Ia.has(e.state):!0,n={entity_id:s};switch(t){case"button":case"input_button":return a.callService(t,"press",n);case"lock":return a.callService("lock",i?"unlock":"lock",n);case"cover":return a.callService("cover",i?"open_cover":"close_cover",n);case"valve":return a.callService("valve",i?"open_valve":"close_valve",n);case"scene":return a.callService("scene","turn_on",n);case"group":return a.callService("homeassistant",i?"turn_on":"turn_off",n);default:return a.callService(t,i?"turn_on":"turn_off",n)}}function C(a,s){a.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:s},bubbles:!0,composed:!0}))}function T(a,s="light"){let t=new Event("haptic",{bubbles:!0,composed:!0});t.detail=s,a.dispatchEvent(t)}function N(a,s){if(a?.formatEntityState)try{return a.formatEntityState(s)}catch{}return s.state.replace(/_/g," ")}function L(a,s){return((a.attributes.supported_features??0)&s)!==0}var P=(a,s,t)=>Math.min(Math.max(a,s),t);var J=class extends y{constructor(){super(...arguments);this.value=0;this.min=0;this.max=100;this.step=1;this.disabled=!1;this.fill=!1;this._pct=0;this._dragging=!1;this._lastEmit=0}willUpdate(t){if(!this._dragging&&(t.has("value")||t.has("min")||t.has("max"))){let e=this.max-this.min||1;this._pct=P((this.value-this.min)/e*100,0,100)}}_valueFromPct(t){let e=this.min+t/100*(this.max-this.min),i=Math.round(e/this.step)*this.step;return P(Number(i.toFixed(3)),this.min,this.max)}_updateFromEvent(t,e){let i=this.getBoundingClientRect();if(i.width&&(this._pct=P((t.clientX-i.left)/i.width*100,0,100),e)){let n=Date.now();n-this._lastEmit>100&&(this._lastEmit=n,this._fire("slide"))}}_fire(t){this.dispatchEvent(new CustomEvent(t,{detail:{value:this._valueFromPct(this._pct)},bubbles:!1}))}_onPointerDown(t){this.disabled||(t.stopPropagation(),this.setPointerCapture(t.pointerId),this._dragging=!0,this._updateFromEvent(t,!0))}_onPointerMove(t){this._dragging&&this._updateFromEvent(t,!0)}_onPointerUp(){this._dragging&&(this._dragging=!1,this._fire("change"))}_onKeydown(t){if(this.disabled)return;let e=t.key==="ArrowRight"||t.key==="ArrowUp"?1:t.key==="ArrowLeft"||t.key==="ArrowDown"?-1:0;if(!e)return;t.preventDefault(),this.value=P(this.value+e*this.step,this.min,this.max);let i=this.max-this.min||1;this._pct=(this.value-this.min)/i*100,this._fire("change")}render(){return l`
      <div
        class="track ${this._dragging?"dragging":""}"
        role="slider"
        tabindex=${this.disabled?-1:0}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this._valueFromPct(this._pct)}
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
        @keydown=${this._onKeydown}
      >
        <div class="bar" style="width:${this._pct}%">
          <div class="handle"></div>
        </div>
      </div>
    `}};J.styles=w`
    :host {
      display: block;
      --silk-slider-height: 42px;
    }
    :host([fill]) {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .track {
      position: relative;
      height: var(--silk-slider-height);
      border-radius: 13px;
      background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      overflow: hidden;
      touch-action: pan-y;
      cursor: ew-resize;
      outline: none;
    }
    :host([fill]) .track {
      height: 100%;
      border-radius: 0;
      background: transparent;
    }
    .track:focus-visible {
      box-shadow: inset 0 0 0 2px var(--silk-accent);
    }
    .bar {
      position: absolute;
      inset: 0 auto 0 0;
      background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      transition: width 160ms cubic-bezier(0.2, 0, 0, 1);
    }
    :host([fill]) .bar {
      background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
    }
    .track.dragging .bar {
      transition: none;
    }
    .handle {
      position: absolute;
      right: 7px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      border-radius: 2px;
      background: var(--silk-accent);
      opacity: 0.9;
    }
    :host([disabled]) .track {
      opacity: 0.4;
      cursor: default;
    }
  `,m([b({type:Number})],J.prototype,"value",2),m([b({type:Number})],J.prototype,"min",2),m([b({type:Number})],J.prototype,"max",2),m([b({type:Number})],J.prototype,"step",2),m([b({type:Boolean})],J.prototype,"disabled",2),m([b({type:Boolean,reflect:!0})],J.prototype,"fill",2),m([h()],J.prototype,"_pct",2),J=m([x("silk-slider")],J);var Fa=new Set(["unavailable","unknown","none",""]);function Da(a,s){let t=(s??"").toLowerCase();if(Fa.has(t))return{t:a,v:NaN};let e=Number(s);return{t:a,v:Number.isFinite(e)?e:NaN}}async function An(a,s,t,e){let i=await a.callWS({type:"history/history_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),entity_ids:s,minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),n={};for(let r of s){let o=i?.[r]??[];n[r]=o.map(c=>{let d=c.s??c.state,u=c.lu??c.last_updated??c.lc??c.last_changed,f=typeof u=="number"?u:Date.parse(u)/1e3;return Da(f,d)}).filter(c=>Number.isFinite(c.t)).sort((c,d)=>c.t-d.t)}return n}async function Ua(a,s,t,e){let i=await a.callWS({type:"recorder/statistics_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),statistic_ids:s,period:"hour",types:["mean","state"]}),n={};for(let r of s){let o=i?.[r]??[];n[r]=o.map(c=>{let d=c.start,u=typeof d=="number"?d/1e3:Date.parse(d)/1e3,f=c.mean??c.state;return{t:u,v:typeof f=="number"&&Number.isFinite(f)?f:NaN}}).filter(c=>Number.isFinite(c.t)).sort((c,d)=>c.t-d.t)}return n}async function ct(a,s,t,e,i){if(i<=48)return An(a,s,t,e);let n=await Ua(a,s,t,e),r=s.filter(o=>!n[o]?.length);if(r.length)try{let o=await An(a,r,t,e);for(let c of r)n[c]=o[c]??[]}catch{for(let o of r)n[o]=n[o]??[]}return n}function lt(a,s,t,e){let i=new Float64Array(e).fill(NaN);if(!a.length||t<=s)return i;let n=0;for(let r=0;r<e;r++){let o=s+(t-s)*r/(e-1);for(;n<a.length&&a[n].t<=o;)n++;n>0&&(i[r]=a[n-1].v)}return i}function we(a,s,t){let e=1/0,i=-1/0;for(let r of a)for(let o=0;o<r.length;o++){let c=r[o];Number.isFinite(c)&&(c<e&&(e=c),c>i&&(i=c))}if(!Number.isFinite(e))return[0,1];if(e===i){let r=Math.max(Math.abs(e)*.05,.5);e-=r,i+=r}let n=(i-e)*.08;return[s??e-n,t??i+n]}function ae(a,s,t,e,i){let[n,r]=s,o=r-n||1,c=Math.max(t-e-i,1),d=new Float64Array(a.length);for(let u=0;u<a.length;u++){let f=a[u];d[u]=Number.isFinite(f)?e+(1-(f-n)/o)*c:NaN}return d}var V=a=>(Math.round(a*100)/100).toString();function Sn(a,s,t,e){let i=t-s,n=new Float64Array(i);if(i===1)return n;let r=new Float64Array(i-1);for(let o=0;o<i-1;o++)r[o]=(a[s+o+1]-a[s+o])/e;n[0]=r[0],n[i-1]=r[i-2];for(let o=1;o<i-1;o++)n[o]=r[o-1]*r[o]<=0?0:2*r[o-1]*r[o]/(r[o-1]+r[o]);return n}function Mn(a,s){let t=-1;for(let e=0;e<=a.length;e++){let i=e<a.length&&Number.isFinite(a[e]);i&&t<0&&(t=e),!i&&t>=0&&(s(t,e),t=-1)}}function dt(a,s){let t=a.length;if(t<2)return"";let e=s/(t-1),i=[];return Mn(a,(n,r)=>{if(r-n===1){i.push(`M ${V(n*e)} ${V(a[n])} l 0.01 0`);return}let o=Sn(a,n,r,e);i.push(`M ${V(n*e)} ${V(a[n])}`);for(let c=n;c<r-1;c++){let d=c-n,u=c*e,f=(c+1)*e,g=u+e/3,v=a[c]+o[d]*e/3,$=f-e/3,A=a[c+1]-o[d+1]*e/3;i.push(`C ${V(g)} ${V(v)} ${V($)} ${V(A)} ${V(f)} ${V(a[c+1])}`)}}),i.join(" ")}function ce(a,s,t){let e=a.length;if(e<2)return"";let i=s/(e-1),n=[];return Mn(a,(r,o)=>{if(o-r===1)return;let c=Sn(a,r,o,i);n.push(`M ${V(r*i)} ${V(t)} L ${V(r*i)} ${V(a[r])}`);for(let d=r;d<o-1;d++){let u=d-r,f=d*i,g=(d+1)*i;n.push(`C ${V(f+i/3)} ${V(a[d]+c[u]*i/3)} ${V(g-i/3)} ${V(a[d+1]-c[u+1]*i/3)} ${V(g)} ${V(a[d+1])}`)}n.push(`L ${V((o-1)*i)} ${V(t)} Z`)}),n.join(" ")}function Pn(a){for(let s=0;s<a.length;s++)if(Number.isFinite(a[s]))return s;return-1}function Fe(a){for(let s=a.length-1;s>=0;s--)if(Number.isFinite(a[s]))return s;return-1}function On(a){let s=-1,t=-1;for(let e=0;e<a.length;e++){let i=a[e];Number.isFinite(i)&&((s<0||i<a[s])&&(s=e),(t<0||i>a[t])&&(t=e))}return{min:s,max:t}}var Rn=a=>1-Math.pow(1-a,3),Hn=a=>1-Math.pow(1-a,4);function Ln(a){return a?.locale?.language??a?.language??"en"}function D(a,s,t){if(!Number.isFinite(t))return"\u2014";let e=a?.entities?.[s]?.display_precision??(Math.abs(t)>=100?0:Math.abs(t)>=10?1:2);return new Intl.NumberFormat(Ln(a),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}function Nn(a,s,t){return`${t>=0?"\u2191":"\u2193"} ${D(a,s,Math.abs(t))}`}function In(a,s,t){let e=new Date(s*1e3),i=Ln(a);return t<=26?new Intl.DateTimeFormat(i,{hour:"numeric",minute:"2-digit"}).format(e):t<=24*8?new Intl.DateTimeFormat(i,{weekday:"short",hour:"numeric",minute:"2-digit"}).format(e):new Intl.DateTimeFormat(i,{month:"short",day:"numeric",hour:"numeric"}).format(e)}var za=[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"line_width",selector:{number:{min:1,max:8,step:.5,mode:"box"}}}]},{name:"",type:"grid",schema:[{name:"fill",selector:{boolean:{}}},{name:"extremes",selector:{boolean:{}}},{name:"range_selector",selector:{boolean:{}}},{name:"delta",selector:{boolean:{}}}]}],ja={entity:"Entity",name:"Name",hours_to_show:"Hours to show",line_width:"Line width",fill:"Gradient fill",extremes:"Min/max markers",range_selector:"Range selector",delta:"Change badge"},ke=class extends y{setConfig(s){this._config=s}render(){if(!this.hass||!this._config)return p;let s={hours_to_show:24,line_width:2.5,fill:!0,extremes:!0,range_selector:!0,delta:!0,...this._config};return l`
      <ha-form
        .hass=${this.hass}
        .data=${s}
        .schema=${za}
        .computeLabel=${t=>ja[t.name]??t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(s){s.stopPropagation();let t=s.detail.value;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}};m([b({attribute:!1})],ke.prototype,"hass",2),m([h()],ke.prototype,"_config",2),ke=m([x("silk-card-editor")],ke);var Dn={type:"silk-card",name:"Silk Graph",description:"Buttery-smooth, interactive history graph. Scrub it, zoom it, watch it morph."},Fn=["var(--primary-color, #4aa8ff)","#ef6c6c","#5ec78d","#f0b357","#a97ee8","#e879b9","#6ad4d4"],qa=["1h","12h","1d","1w","1m"],Va={h:1,d:24,w:168,m:720},Ga=15e3,Ba=3e5,Wa=0;function Ya(a){let s=/^(\d+)([hdwm])$/i.exec(a.trim());return s?Number(s[1])*Va[s[2].toLowerCase()]:null}var K=class extends y{constructor(){super(...arguments);this._hours=24;this._scrubIndex=null;this._focusIndex=null;this._width=0;this._height=0;this._drawProgress=0;this._rev=0;this._uid=`silk${++Wa}`;this._seriesCfgs=[];this._points=[];this._vals=[];this._pxYs=[];this._domain=[0,1];this._windowStart=0;this._windowEnd=0;this._hasDrawn=!1;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastUpdated={}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-card-editor")}setConfig(t){if(!t.entity&&!t.entities?.length)throw new Error("silk-card: define an `entity` or a list of `entities`");let e=t.entities??[t.entity];this._seriesCfgs=e.map((i,n)=>{let r=typeof i=="string"?{entity:i}:i;return{entity:r.entity,name:r.name,color:r.color??t.color??Fn[n%Fn.length]}}),this._config=t,this._hours=t.hours_to_show??24,this._fetchStarted=!1,this._hasDrawn=!1,this._vals=[],this._pxYs=[],this._focusIndex=null}getCardSize(){return 3}getGridOptions(){return{columns:12,rows:3,min_rows:2,min_columns:4}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(!0),Ba)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._animId&&cancelAnimationFrame(this._animId),this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh(!1);return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".graph");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height,this._recompute(!1))}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=!1;for(let i of this._seriesCfgs){let n=this.hass.states[i.entity]?.last_updated;n&&n!==this._lastUpdated[i.entity]&&(this._lastUpdated[i.entity]=n,t=!0)}if(!t||this._refreshTimer)return;let e=Math.max(0,Ga-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh(!0)},e)}async _refresh(t){if(!this.hass||!this._seriesCfgs.length)return;let e=++this._fetchSeq,i=Date.now()/1e3,n=i-this._hours*3600,r;try{r=await ct(this.hass,this._seriesCfgs.map(c=>c.entity),n,i,this._hours)}catch(c){console.warn("silk-card: history fetch failed",c);return}if(e!==this._fetchSeq)return;this._lastFetch=Date.now(),this._windowStart=n,this._windowEnd=i;let o=this._config?.points??120;this._points=this._seriesCfgs.map(c=>r[c.entity]??[]),this._vals=this._points.map(c=>lt(c,n,i,o)),this._domain=we(this._vals,this._config?.y_min,this._config?.y_max),this._recompute(t)}_recompute(t){if(!this._vals.length||!this._width||!this._height)return;let e=this._config?.extremes!==!1,i=e?22:10,n=e?18:8,r=this._vals.map(o=>ae(o,this._domain,this._height,i,n));this._setDisplay(r,t)}_setDisplay(t,e){if(this._animId&&cancelAnimationFrame(this._animId),!(e&&this._pxYs.length===t.length&&this._pxYs[0]?.length===t[0]?.length)){this._pxYs=t,this._rev++,this._hasDrawn?this._drawProgress=1:(this._hasDrawn=!0,this._animateDrawIn());return}let n=this._pxYs.map(d=>Float64Array.from(d)),r=performance.now(),o=420,c=d=>{let u=Math.min((d-r)/o,1),f=Rn(u);for(let g=0;g<t.length;g++){let v=n[g],$=t[g],A=this._pxYs[g];for(let M=0;M<$.length;M++){let I=v[M],F=$[M];A[M]=!Number.isFinite(I)||!Number.isFinite(F)?u<.5?I:F:I+(F-I)*f}}this._rev++,u<1&&(this._animId=requestAnimationFrame(c))};this._animId=requestAnimationFrame(c)}_animateDrawIn(){let t=performance.now(),e=900,i=n=>{let r=Math.min((n-t)/e,1);this._drawProgress=Hn(r),r<1&&(this._animId=requestAnimationFrame(i))};this._animId=requestAnimationFrame(i)}_selectRange(t){t!==this._hours&&(this._hours=t,this._scrubIndex=null,this._refresh(!0))}_onPointerDown(t){t.currentTarget.setPointerCapture(t.pointerId),this._scrub(t)}_onPointerMove(t){this._scrubIndex!==null&&this._scrub(t)}_onPointerEnd(){this._scrubIndex=null}_scrub(t){if(!this._width||!this._vals.length)return;let e=t.currentTarget.getBoundingClientRect(),i=Math.min(Math.max(t.clientX-e.left,0),this._width),n=this._vals[0].length;this._scrubIndex=Math.round(i/this._width*(n-1))}_toggleFocus(t){this._focusIndex=this._focusIndex===t?null:t}get _primaryIndex(){return this._focusIndex??0}_valueAt(t,e){return this._vals[t]?.[e]??NaN}_timeAt(t){let e=this._vals[0]?.length??1;return this._windowStart+(this._windowEnd-this._windowStart)*t/Math.max(e-1,1)}render(){if(!this._config)return p;this._rev;let t=this.hass,e=this._seriesCfgs[this._primaryIndex],i=t?.states[e.entity];if(t&&!i)return l`<ha-card><div class="warning">Entity not found: ${e.entity}</div></ha-card>`;let n=this._scrubIndex!==null&&this._vals.length>0,r=n?this._valueAt(this._primaryIndex,this._scrubIndex):Number(i?.state),o=this._config.unit??i?.attributes.unit_of_measurement??"",c=this._config.name??e.name??i?.attributes.friendly_name??e.entity;return l`
      <ha-card>
        <div class="header">
          <div class="title-row">
            <span class="name">
              ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:p}
              ${c}
            </span>
            ${this._renderRangeChips()}
          </div>
          <div class="value-row">
            <span class="value">${D(t,e.entity,r)}</span>
            <span class="unit">${o}</span>
            ${n?this._renderScrubTime():this._renderDelta(e.entity)}
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
    `}_renderRangeChips(){if(this._config?.range_selector===!1)return p;let t=this._config?.ranges??qa;return l`
      <span class="ranges">
        ${t.map(e=>{let i=Ya(e);return i===null?p:l`
            <button
              class="chip ${i===this._hours?"active":""}"
              @click=${()=>this._selectRange(i)}
            >
              ${e.toUpperCase()}
            </button>
          `})}
      </span>
    `}_renderDelta(t){if(this._config?.delta===!1||!this._vals.length)return p;let e=this._vals[this._primaryIndex],i=Pn(e),n=Fe(e);if(i<0||n<=i)return p;let r=e[n]-e[i];return l`<span class="delta">${Nn(this.hass,t,r)}</span>`}_renderScrubTime(){return l`<span class="scrub-time">${In(this.hass,this._timeAt(this._scrubIndex),this._hours)}</span>`}_renderLegend(){return l`
      <div class="legend">
        ${this._seriesCfgs.map((t,e)=>{let i=this.hass?.states[t.entity],n=t.name??i?.attributes.friendly_name??t.entity,r=this._focusIndex!==null&&this._focusIndex!==e;return l`
            <button class="legend-chip ${r?"dim":""}" @click=${()=>this._toggleFocus(e)}>
              <span class="dot" style="background:${t.color}"></span>
              ${n}
            </button>
          `})}
      </div>
    `}_renderSvg(){let t=this._width,e=this._height;if(!t||!e||!this._pxYs.length)return p;let i=this._config?.line_width??2.5,n=this._config?.fill!==!1,r=`${this._uid}-clip`;return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e}>
        <defs>
          <clipPath id=${r}>
            <rect x="0" y="0" width=${t*this._drawProgress} height=${e}></rect>
          </clipPath>
          ${this._seriesCfgs.map((o,c)=>z`
              <linearGradient id="${this._uid}-fill-${c}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.30" style="color:${o.color}"></stop>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" style="color:${o.color}"></stop>
              </linearGradient>
            `)}
        </defs>
        <g clip-path="url(#${r})">
          ${this._seriesCfgs.map((o,c)=>this._renderSeries(o,c,t,e,i,n))}
        </g>
        ${this._renderExtremes(t)}
        ${this._renderScrubOverlay(t,e)}
      </svg>
    `}_renderSeries(t,e,i,n,r,o){let c=this._pxYs[e],d=this._focusIndex!==null&&this._focusIndex!==e,u=dt(c,i),f=o?ce(c,i,n):"",g=Fe(c),v=g>=0?g/(c.length-1)*i:0;return z`
      <g style="color:${t.color}" opacity=${d?.22:1} class="series">
        ${o?z`<path class="area" d=${f} fill="url(#${this._uid}-fill-${e})"></path>`:p}
        <path
          class="line"
          d=${u}
          fill="none"
          stroke="currentColor"
          stroke-width=${r}
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        ${g>=0&&this._drawProgress>=1?z`
              <circle class="pulse" cx=${v} cy=${c[g]} r="4" fill="currentColor"></circle>
              <circle cx=${v} cy=${c[g]} r="3" fill="currentColor"></circle>
            `:p}
      </g>
    `}_renderExtremes(t){if(this._config?.extremes===!1||!this._pxYs.length)return p;let e=this._primaryIndex,i=this._vals[e],n=this._pxYs[e];if(!i)return p;let{min:r,max:o}=On(i);if(r<0||o<0||r===o)return p;let c=this._seriesCfgs[e].entity,d=(u,f)=>{let g=u/(i.length-1)*t,v=g<40?"start":g>t-40?"end":"middle";return z`
        <circle cx=${g} cy=${n[u]} r="2.5" class="extreme-dot"></circle>
        <text x=${g} y=${n[u]+(f?14:-8)} text-anchor=${v} class="extreme-label">
          ${D(this.hass,c,i[u])}
        </text>
      `};return z`${d(o,!1)}${d(r,!0)}`}_renderScrubOverlay(t,e){if(this._scrubIndex===null||!this._pxYs.length)return p;let i=this._pxYs[0].length,n=this._scrubIndex/(i-1)*t;return z`
      <line x1=${n} y1="0" x2=${n} y2=${e} class="scrub-line"></line>
      ${this._pxYs.map((r,o)=>{let c=r[this._scrubIndex];return Number.isFinite(c)?z`<circle cx=${n} cy=${c} r="4.5" class="scrub-dot" style="color:${this._seriesCfgs[o].color}" fill="currentColor"></circle>`:p})}
    `}};K.styles=w`
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
  `,m([b({attribute:!1})],K.prototype,"hass",2),m([h()],K.prototype,"_config",2),m([h()],K.prototype,"_hours",2),m([h()],K.prototype,"_scrubIndex",2),m([h()],K.prototype,"_focusIndex",2),m([h()],K.prototype,"_width",2),m([h()],K.prototype,"_height",2),m([h()],K.prototype,"_drawProgress",2),m([h()],K.prototype,"_rev",2),K=m([x("silk-card")],K);var Ke=class extends K{};Ke=m([x("silk-graph-card")],Ke);var k=w`
  :host {
    display: block;
    height: 100%;
    --silk-accent: var(--primary-color, #4aa8ff);
    --silk-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --silk-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  ha-card {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    cursor: pointer;
  }
  .icon {
    flex: none;
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 14px;
    display: grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
    position: relative;
    z-index: 1;
    color: var(--secondary-text-color);
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
    transition:
      transform 250ms var(--silk-spring),
      background 200ms ease,
      color 200ms ease;
  }
  .icon:active {
    transform: scale(0.9);
    transition-duration: 120ms;
    transition-timing-function: var(--silk-ease-out);
  }
  .icon.on {
    color: var(--silk-accent);
    background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
  }
  .icon ha-state-icon,
  .icon ha-icon {
    --mdc-icon-size: 22px;
    pointer-events: none;
  }
  .info {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }
  .name {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .state {
    font-size: 12.5px;
    line-height: 1.3;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }
  .state .sep {
    opacity: 0.5;
    margin: 0 3px;
  }
  .trailing {
    flex: none;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .value {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--primary-text-color);
    font-variant-numeric: tabular-nums;
  }
  .unit {
    font-size: 12px;
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  .unavailable .icon,
  .unavailable .info,
  .unavailable .trailing {
    opacity: 0.45;
  }
  .unavailable .icon {
    color: var(--disabled-text-color, #6f6f6f);
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
  }
  .chip {
    border: none;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 4px 9px;
    border-radius: 999px;
    cursor: pointer;
    color: var(--secondary-text-color);
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
    transition: background 150ms ease-out, color 150ms ease-out;
  }
  .chip:hover {
    background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
  }
  .chip.active {
    color: var(--silk-accent);
    background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
  }
  .warning {
    padding: 12px;
    color: var(--error-color, #db4437);
    font-size: 13px;
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
`;var Ka={light:"var(--state-light-active-color, #e6a23c)",switch:"var(--state-switch-active-color, #4aa8ff)",input_boolean:"var(--state-switch-active-color, #4aa8ff)",fan:"var(--state-fan-active-color, #35b5b1)",cover:"var(--state-cover-active-color, #9d7ee8)",climate:"var(--state-climate-auto-color, #57ad60)",media_player:"var(--state-media_player-active-color, #6c8dd6)",lock:"var(--state-lock-locked-color, #57ad60)",vacuum:"var(--state-vacuum-active-color, #35b5b1)",humidifier:"var(--state-humidifier-on-color, #4aa8ff)",scene:"var(--primary-color, #4aa8ff)",script:"var(--primary-color, #4aa8ff)",button:"var(--primary-color, #4aa8ff)",input_button:"var(--primary-color, #4aa8ff)",person:"var(--state-person-home-color, #57ad60)",device_tracker:"var(--state-person-home-color, #57ad60)",binary_sensor:"var(--primary-color, #4aa8ff)",sensor:"var(--primary-color, #4aa8ff)"},Un={heat:"var(--state-climate-heat-color, #e8734f)",cool:"var(--state-climate-cool-color, #4aa8ff)",heat_cool:"var(--state-climate-auto-color, #57ad60)",auto:"var(--state-climate-auto-color, #57ad60)",dry:"var(--state-climate-dry-color, #e6a23c)",fan_only:"var(--state-climate-fan-only-color, #35b5b1)"};function S(a,s){if(s)return s;if(!a)return"var(--primary-color, #4aa8ff)";let t=O(a.entity_id);return t==="climate"&&Un[a.state]?Un[a.state]:t==="lock"&&a.state!=="locked"?"var(--state-lock-unlocked-color, #e8734f)":Ka[t]??"var(--primary-color, #4aa8ff)"}function E(a,s,t,e={}){if(customElements.get(a))return;class i extends y{setConfig(r){this._config=r}render(){return!this.hass||!this._config?p:l`
        <ha-form
          .hass=${this.hass}
          .data=${{...e,...this._config}}
          .schema=${s}
          .computeLabel=${r=>t[r.name]??r.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `}_valueChanged(r){r.stopPropagation(),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r.detail.value},bubbles:!0,composed:!0}))}}m([b({attribute:!1})],i.prototype,"hass",2),m([h()],i.prototype,"_config",2),customElements.define(a,i)}var zn={type:"silk-toggle-card",name:"Silk Toggle",description:"A crisp on/off row with a real switch and instant feedback."},jn="silk-toggle-card-editor";E(jn,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan","lock","cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before switching"});function Xa(a,s){switch(a){case"lock":return s?"unlocked":"locked";case"cover":case"valve":return s?"open":"closed";default:return s?"on":"off"}}var Qa=2e3,Ot=class extends y{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-toggle-card",entity:e.find(n=>n.startsWith("switch."))??e.find(n=>n.startsWith("light."))}}static async getConfigElement(){return document.createElement(jn)}setConfig(t){if(!t.entity)throw new Error("silk-toggle-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_onCardClick(){this._config&&C(this,this._config.entity)}_onToggleClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!(!n||_(n))){if(e.confirm){let r=e.name??n.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to toggle ${r}?`))return}T(this),this._optimistic=!R(n),this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Qa),j(i,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=this._optimistic??R(i),o=this._optimistic===null?i:{...i,state:Xa(O(t.entity),this._optimistic)},c=S(o,t.color),d=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${r?"on":""}"
          .disabled=${n}
          aria-label=${`Toggle ${d}`}
          @click=${this._onToggleClick}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${o}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${d}</div>
          <div class="state">${N(e,o)}</div>
        </div>
        <div class="trailing">
          <button
            class="switch ${r?"checked":""}"
            role="switch"
            aria-checked=${r?"true":"false"}
            aria-label=${`Toggle ${d}`}
            .disabled=${n}
            @click=${this._onToggleClick}
          >
            <span class="thumb"></span>
          </button>
        </div>
      </ha-card>
    `}};Ot.styles=[k,w`
      .switch {
        flex: none;
        position: relative;
        width: 46px;
        height: 28px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the track. */
      .switch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .switch:disabled {
        cursor: default;
      }
      .thumb {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(18px);
      }
      .icon:disabled {
        cursor: default;
      }
    `],m([b({attribute:!1})],Ot.prototype,"hass",2),m([h()],Ot.prototype,"_config",2),m([h()],Ot.prototype,"_optimistic",2),Ot=m([x("silk-toggle-card")],Ot);var qn={type:"silk-light-card",name:"Silk Light",description:"Drag anywhere to dim \u2014 the whole card is the slider."},Vn="silk-light-card-editor";E(Vn,[{name:"entity",required:!0,selector:{entity:{domain:["light"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",icon:"Icon",color:"Accent color"});var Za=2e3;function Ja(a){let s=a.attributes.supported_color_modes;return Array.isArray(s)&&s.some(t=>t!=="onoff")}var bt=class extends y{constructor(){super(...arguments);this._optimisticPct=null;this._optimisticOn=null;this._sliding=!1}static getStubConfig(t){return{type:"custom:silk-light-card",entity:Object.keys(t.states).find(i=>i.startsWith("light."))}}static async getConfigElement(){return document.createElement(Vn)}setConfig(t){if(!t.entity)throw new Error("silk-light-card: `entity` is required");if(O(t.entity)!=="light")throw new Error(`silk-light-card: \`entity\` must be a light (got "${t.entity}")`);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._sliding||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticPct=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Za)}_displayPct(t,e){if(this._optimisticPct!==null)return this._optimisticPct;if(!e)return 0;let i=t.attributes.brightness;return typeof i!="number"?null:P(Math.round(i/255*100),1,100)}_onSlide(t){this._sliding=!0,this._optimisticPct=t.detail.value,this._optimisticOn=t.detail.value>0}_onSliderChange(t){if(this._sliding=!1,!this.hass||!this._config)return;let e=t.detail.value;this._optimisticPct=e,this._optimisticOn=e>0,this._holdOptimistic(),T(this),e<=0?this.hass.callService("light","turn_off",{entity_id:this._config.entity}):this.hass.callService("light","turn_on",{entity_id:this._config.entity,brightness_pct:e})}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(_(e))return;let i=this._optimisticOn??e.state==="on";j(this.hass,this._config.entity),T(this),this._optimisticOn=!i,this._optimisticPct=null,this._holdOptimistic()}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}render(){if(!this._config)return p;let t=this.hass;if(!t)return p;let e=this._config.entity,i=t.states[e];if(!i)return l`<ha-card><div class="warning">Entity not found: ${e}</div></ha-card>`;let n=_(i),r=Ja(i),o=!n&&i.state==="on",c=n?!1:this._optimisticOn??o,d=n?0:this._displayPct(i,c),u=S(i,this._config.color),f=this._config.name??i.attributes.friendly_name??e,g=n||c===o?N(t,i):c?"On":"Off",v=r&&c&&d!==null&&!n;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${u}"
        @click=${this._onCardClick}
      >
        ${r?l`
              <silk-slider
                fill
                .value=${c?d??100:0}
                min="1"
                max="100"
                step="1"
                ?disabled=${n}
                @slide=${this._onSlide}
                @change=${this._onSliderChange}
                @click=${this._stopClick}
              ></silk-slider>
            `:p}
        <button
          class="icon ${c?"on":""}"
          ?disabled=${n}
          aria-label=${`Toggle ${f}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${f}</div>
          <div class="state">
            ${g}${v?l`<span class="sep">·</span>${d}%`:p}
          </div>
        </div>
        <div class="trailing">
          ${v?l`<span class="value">${d}%</span>`:p}
        </div>
      </ha-card>
    `}};bt.styles=[k,w`
      .icon:disabled {
        cursor: default;
      }
    `],m([b({attribute:!1})],bt.prototype,"hass",2),m([h()],bt.prototype,"_config",2),m([h()],bt.prototype,"_optimisticPct",2),m([h()],bt.prototype,"_optimisticOn",2),bt=m([x("silk-light-card")],bt);var Gn={type:"silk-tile-card",name:"Silk Tile",description:"A sensor tile with a living sparkline and threshold colors."},tc=60,ec=6,ic=4,nc=3e5,sc=6e4,rc=0;E("silk-tile-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}]},{name:"",type:"grid",schema:[{name:"unit",selector:{text:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]}],{entity:"Entity",name:"Name",icon:"Icon",color:"Color",unit:"Unit",hours_to_show:"Hours to show"},{hours_to_show:24});var mt=class extends y{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._uid=`silk-tile${++rc}`;this._thresholds=[];this._vals=null;this._pxYs=null;this._domain=[0,1];this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-tile-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-tile-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-tile-card: `entity` is required");this._thresholds=(t.thresholds??[]).filter(e=>!!e&&typeof e.value=="number"&&Number.isFinite(e.value)&&typeof e.color=="string").sort((e,i)=>e.value-i.value),this._config=t,this._fetchStarted=!1,this._vals=null,this._pxYs=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),nc)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height,this._recompute())}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,sc-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??24,i=++this._fetchSeq,n=Date.now()/1e3,r=n-e*3600,o;try{o=await ct(this.hass,[t],r,n,e)}catch(c){console.warn("silk-tile-card: history fetch failed",c);return}i===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals=lt(o[t]??[],r,n,tc),this._domain=we([this._vals]),this._recompute())}_recompute(){!this._vals||!this._width||!this._height||(this._pxYs=ae(this._vals,this._domain,this._height,ec,ic),this._rev++)}_accent(t){if(Number.isFinite(t)){let e;for(let i of this._thresholds)if(i.value<=t)e=i.color;else break;if(e)return e}return S(this.hass?.states[this._config.entity],this._config?.color)}_onTap(){this._config&&(T(this),C(this,this._config.entity))}render(){if(!this._config)return p;this._rev;let t=this.hass,e=t?.states[this._config.entity];if(t&&!e)return l`<ha-card
        ><div class="warning">Entity not found: ${this._config.entity}</div></ha-card
      >`;let i=_(e),n=Number(e?.state),r=this._accent(n),o=this._config.unit??e?.attributes.unit_of_measurement??"",c=this._config.name??e?.attributes.friendly_name??this._config.entity;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${!i&&R(e)?"on":""}">
            ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${c}</div></div>
          <div class="trailing">
            <span class="value">${D(t,this._config.entity,n)}</span>
            ${o?l`<span class="unit">${o}</span>`:p}
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._height,i=this._pxYs;if(!t||!e||!i)return p;let n=dt(i,t),r=ce(i,t,e),o=Fe(i),c=o>=0?o/(i.length-1)*t:0,d=`${this._uid}-fill`;return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e}>
        <defs>
          <linearGradient id=${d} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stop-color="currentColor"
              stop-opacity="0.25"
              style="color:var(--silk-accent)"
            ></stop>
            <stop
              offset="100%"
              stop-color="currentColor"
              stop-opacity="0.02"
              style="color:var(--silk-accent)"
            ></stop>
          </linearGradient>
        </defs>
        <g style="color:var(--silk-accent)">
          <path d=${r} fill="url(#${d})"></path>
          <path
            d=${n}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          ${o>=0?z`<circle cx=${c} cy=${i[o]} r="2.5" fill="currentColor"></circle>`:p}
        </g>
      </svg>
    `}};mt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The tile has no control action: the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .spark {
        flex: 1;
        position: relative;
        min-height: 44px;
        margin: 6px -12px -12px;
      }
      .spark svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-tile-in 300ms var(--silk-ease-out);
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-tile-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],mt.prototype,"hass",2),m([h()],mt.prototype,"_config",2),m([h()],mt.prototype,"_width",2),m([h()],mt.prototype,"_height",2),m([h()],mt.prototype,"_rev",2),mt=m([x("silk-tile-card")],mt);var Kn={type:"silk-gauge-card",name:"Silk Gauge",description:"A clean arc gauge that animates to its value."},Xe=42,oc=50,ac=50,Xn=270,Qn=90+(360-Xn)/2,Bn=100,Wn=96;function Zn(a){let s=a*Math.PI/180;return[oc+Xe*Math.cos(s),ac+Xe*Math.sin(s)]}var[Jn,cc]=Zn(Qn),[ts,lc]=Zn(Qn+Xn),Yn=`M ${Jn.toFixed(2)} ${cc.toFixed(2)} A ${Xe} ${Xe} 0 1 1 ${ts.toFixed(2)} ${lc.toFixed(2)}`,Ai=100,Rt=class extends y{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-gauge-card",entity:i("battery")??i("power")??e[0]}}static async getConfigElement(){return document.createElement("silk-gauge-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-gauge-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-gauge-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:3,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatValue(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return e!==void 0?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t):new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.abs(t)>=100?0:1}).format(t)}_formatBound(t){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config;if(!t)return p;let e=this.hass?.states[t.entity];if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=_(e),n=Number(e?.state),r=!i&&e!==void 0&&e.state!==""&&Number.isFinite(n),o=t.min??0,c=t.max??100,d=c-o,u=r&&d>0?P((n-o)/d,0,1):0,f=this._drawn?u:0,g=Ai*(1-f),v=(r?this._segmentColor(n):void 0)??S(e,t.color),$=t.unit??e?.attributes.unit_of_measurement??"",A=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${i?"unavailable":""}
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div class="gauge">
          <svg viewBox="0 0 ${Bn} ${Wn}" aria-hidden="true">
            <path class="arc-bg" d=${Yn}></path>
            <path
              class="arc-value"
              d=${Yn}
              pathLength=${Ai}
              stroke-dasharray=${Ai}
              style="stroke-dashoffset:${g};opacity:${f>0?1:0}"
            ></path>
          </svg>
          <div class="readout">
            <div class="value">${r?this._formatValue(n):"\u2014"}</div>
            ${$?l`<div class="unit">${$}</div>`:p}
          </div>
          <span class="bound" style="left:${Jn.toFixed(1)}%">${this._formatBound(o)}</span>
          <span class="bound" style="left:${ts.toFixed(1)}%">${this._formatBound(c)}</span>
        </div>
        <div class="name" title=${A}>${A}</div>
      </ha-card>
    `}};Rt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 12px;
      }
      .gauge {
        position: relative;
        flex: none;
        width: 100%;
        max-width: 88px;
        aspect-ratio: ${Bn} / ${Wn};
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .arc-bg,
      .arc-value {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
      }
      .arc-bg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .arc-value {
        stroke: var(--silk-accent);
        transition:
          stroke-dashoffset 450ms var(--silk-ease-out),
          stroke 200ms ease,
          opacity 200ms ease;
      }
      .readout {
        position: absolute;
        left: 50%;
        top: 52%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
      }
      .value {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .unit {
        font-size: 11px;
        font-weight: 500;
        line-height: 1.2;
        margin-top: 1px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bound {
        position: absolute;
        bottom: 0;
        transform: translateX(-50%);
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .name {
        font-size: 13px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .unavailable .gauge,
      .unavailable .name {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Rt.prototype,"hass",2),m([h()],Rt.prototype,"_config",2),m([h()],Rt.prototype,"_drawn",2),Rt=m([x("silk-gauge-card")],Rt);E("silk-gauge-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var ss={type:"silk-climate-card",name:"Silk Climate",description:"A compact thermostat: current, target, and modes in one block."},es=2,dc=800,is=2e3,mc={heat:"mdi:fire",cool:"mdi:snowflake",heat_cool:"mdi:sun-snowflake-variant",auto:"mdi:thermostat-auto",dry:"mdi:water-percent",fan_only:"mdi:fan",off:"mdi:power"};E("silk-climate-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["climate"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function B(a){if(a==null||a==="")return;let s=Number(a);return Number.isFinite(s)?s:void 0}function ns(a){let s=String(a),t=s.indexOf(".");return t<0?0:Math.min(s.length-t-1,2)}function Si(a){let s=a.replace(/_/g," ");return s.charAt(0).toUpperCase()+s.slice(1)}var nt=class extends y{static getStubConfig(s){return{type:"custom:silk-climate-card",entity:Object.keys(s.states).find(e=>e.startsWith("climate."))}}static async getConfigElement(){return document.createElement("silk-climate-card-editor")}setConfig(s){if(!s.entity||O(s.entity)!=="climate")throw new Error("silk-climate-card: `entity` is required and must be a climate entity");this._config=s,this._optTarget=this._optLow=this._optHigh=this._optMode=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),window.clearTimeout(this._modeHoldTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(s){if(!s.has("hass")||!this._config||!this.hass)return;let e=s.get("hass")?.states[this._config.entity],i=this.hass.states[this._config.entity];if(!(!i||i===e)){if(this._sendTimer===void 0){let n=e?.attributes,r=i.attributes;this._optTarget!==void 0&&r.temperature!==n?.temperature&&(this._optTarget=void 0),this._optLow!==void 0&&r.target_temp_low!==n?.target_temp_low&&(this._optLow=void 0),this._optHigh!==void 0&&r.target_temp_high!==n?.target_temp_high&&(this._optHigh=void 0)}this._optMode!==void 0&&i.state!==e?.state&&(this._optMode=void 0)}}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=t.states[s.entity];if(!e)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let i=_(e),n=this._optMode!==void 0&&this._optMode!==e.state?{...e,state:this._optMode}:e,r=S(n,s.color),o=s.name??e.attributes.friendly_name??s.entity,c=N(t,n),d=e.attributes.hvac_action,u=d?Si(d):void 0,f=u!==void 0&&u.toLowerCase()!==c.toLowerCase(),g=B(e.attributes.current_temperature),v=t.config?.unit_system?.temperature??"\xB0";return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!i&&R(n)?"on":""}"
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${n}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">
              ${c}${f?l`<span class="sep">·</span>${u}`:p}
            </div>
          </div>
          <div class="trailing hero">
            ${g!==void 0?l`<span class="current">${this._formatCurrent(g)}</span
                  ><span class="degree">${v}</span>`:p}
          </div>
        </div>
        <div class="row controls">
          ${this._renderSteppers(e,i)} ${this._renderModes(e,i)}
        </div>
      </ha-card>
    `}_renderSteppers(s,t){let e=s.attributes,i=ns(B(e.target_temp_step)??.5);if(L(s,es)){let r=this._optLow??B(e.target_temp_low),o=this._optHigh??B(e.target_temp_high);return l`
        ${this._renderStepper("low",r,i,t)}
        ${this._renderStepper("high",o,i,t)}
      `}let n=this._optTarget??B(e.temperature);return this._renderStepper("target",n,i,t)}_renderStepper(s,t,e,i){let n=s==="low"?"lower target":s==="high"?"upper target":"target";return l`
      <div class="stepper">
        <button
          class="step"
          ?disabled=${i}
          aria-label="Decrease ${n} temperature"
          @click=${r=>this._onStep(r,s,-1)}
        >
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
        <span class="value target">${t!==void 0?t.toFixed(e):"\u2013"}</span>
        <button
          class="step"
          ?disabled=${i}
          aria-label="Increase ${n} temperature"
          @click=${r=>this._onStep(r,s,1)}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
      </div>
    `}_renderModes(s,t){let e=s.attributes.hvac_modes;if(!e?.length)return p;let i=this._optMode??s.state;return l`
      <div class="modes">
        ${e.map(n=>l`
            <button
              class="chip mode ${n===i?"active":""}"
              ?disabled=${t}
              aria-label=${Si(n)}
              title=${Si(n)}
              @click=${r=>this._onMode(r,n)}
            >
              <ha-icon .icon=${mc[n]??"mdi:thermostat"}></ha-icon>
            </button>
          `)}
      </div>
    `}_formatCurrent(s){return String(Math.round(s*10)/10)}_onCardClick(){this._config&&C(this,this._config.entity)}_onIconClick(s){s.stopPropagation(),this._config&&C(this,this._config.entity)}_onStep(s,t,e){s.stopPropagation();let i=this.hass,n=this._config?i?.states[this._config.entity]:void 0;if(!i||!n||_(n))return;let r=n.attributes,o=B(r.target_temp_step)??.5,c=ns(o),d=B(r.min_temp)??7,u=B(r.max_temp)??35,f=B(r.current_temperature)??(d+u)/2,g=(v,$,A)=>Number(P(v+e*o,$,A).toFixed(c));if(t==="low"){let v=this._optHigh??B(r.target_temp_high)??u,$=this._optLow??B(r.target_temp_low)??f;this._optLow=g($,d,v)}else if(t==="high"){let v=this._optLow??B(r.target_temp_low)??d,$=this._optHigh??B(r.target_temp_high)??f;this._optHigh=g($,v,u)}else{let v=this._optTarget??B(r.temperature)??f;this._optTarget=g(v,d,u)}T(this,"selection"),window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},dc)}_commit(){let s=this.hass,t=this._config?.entity,e=t?s?.states[t]:void 0;if(!s||!t||!e)return;let i=e.attributes,n={entity_id:t};if(L(e,es)){let r=this._optLow??B(i.target_temp_low),o=this._optHigh??B(i.target_temp_high);if(r===void 0||o===void 0)return;n.target_temp_low=r,n.target_temp_high=o}else{let r=this._optTarget??B(i.temperature);if(r===void 0)return;n.temperature=r}s.callService("climate","set_temperature",n),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optTarget=this._optLow=this._optHigh=void 0},is)):this._optTarget=this._optLow=this._optHigh=void 0}_onMode(s,t){s.stopPropagation();let e=this.hass,i=this._config?.entity,n=i?e?.states[i]:void 0;!e||!i||!n||_(n)||(this._optMode??n.state)!==t&&(this._optMode=t,T(this),e.callService("climate","set_hvac_mode",{entity_id:i,hvac_mode:t}),window.clearTimeout(this._modeHoldTimer),this._modeHoldTimer=window.setTimeout(()=>{this._optMode=void 0},is))}};nt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .hero {
        align-items: baseline;
        gap: 2px;
      }
      .current {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .degree {
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .row.controls {
        gap: 10px;
        row-gap: 8px;
        flex-wrap: wrap;
      }
      .stepper {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .step {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        cursor: default;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .target {
        min-width: 46px;
        text-align: center;
      }
      .modes {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
        margin-left: auto;
      }
      .chip.mode {
        min-width: 40px;
        height: 30px;
        padding: 0;
        display: grid;
        place-items: center;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .chip.mode:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip.mode:disabled {
        cursor: default;
      }
      .chip.mode ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      .unavailable .controls {
        opacity: 0.45;
        pointer-events: none;
      }
    `],m([b({attribute:!1})],nt.prototype,"hass",2),m([h()],nt.prototype,"_config",2),m([h()],nt.prototype,"_optTarget",2),m([h()],nt.prototype,"_optLow",2),m([h()],nt.prototype,"_optHigh",2),m([h()],nt.prototype,"_optMode",2),nt=m([x("silk-climate-card")],nt);var rs={type:"silk-cover-card",name:"Silk Cover",description:"Blinds with drag-anywhere position and an honest stop button."},pc=1,uc=2,hc=4,fc=8,gc=2e3,os="silk-cover-card-editor";E(os,[{name:"entity",required:!0,selector:{entity:{domain:["cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_buttons",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_buttons:"Show open / stop / close buttons"},{show_buttons:!0});var Ht=class extends y{constructor(){super(...arguments);this._localPos=null}static getStubConfig(t){return{type:"custom:silk-cover-card",entity:Object.keys(t.states).find(i=>i.startsWith("cover."))}}static async getConfigElement(){return document.createElement(os)}setConfig(t){if(!t.entity||O(t.entity)!=="cover")throw new Error("silk-cover-card: define a cover `entity` (e.g. cover.living_room_blinds)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._localPos=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._localPos=null},gc)}_realPosition(t){let e=t.attributes.current_position;return typeof e=="number"&&Number.isFinite(e)?P(e,0,100):void 0}_onIconClick(t){t.stopPropagation(),!(!this.hass||!this._config)&&(_(this.hass.states[this._config.entity])||(j(this.hass,this._config.entity),T(this)))}_onCardClick(){this._config&&C(this,this._config.entity)}_onSlide(t){this._localPos=Math.round(t.detail.value)}_onSlideChange(t){if(!this.hass||!this._config)return;let e=P(Math.round(t.detail.value),0,100);this._localPos=e,this._armExpiry(),this.hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e}),T(this)}_callCover(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(this._clearOptimistic(),this.hass.callService("cover",e,{entity_id:this._config.entity}),T(this))}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=_(t),i=R(t),n=S(t,this._config.color),r=this._config.name??t.attributes.friendly_name??t.entity_id,o=this._realPosition(t),c=this._localPos??o,d=L(t,hc)&&!e;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${d?p:this._onCardClick}
      >
        ${d?l`
              <silk-slider
                fill
                .value=${c??(t.state==="closed"?0:100)}
                .min=${0}
                .max=${100}
                .step=${1}
                @slide=${this._onSlide}
                @change=${this._onSlideChange}
              ></silk-slider>
            `:p}
        <button
          class="icon ${i?"on":""}"
          ?disabled=${e}
          aria-label="Toggle ${r}"
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${r}</div>
          <div class="state">
            ${N(this.hass,t)}${!e&&c!==void 0?l`<span class="sep">·</span>${c}%`:p}
          </div>
        </div>
        ${this._config.show_buttons!==!1?this._renderButtons(t,e,c):p}
      </ha-card>
    `}_renderButtons(t,e,i){let n=L(t,pc),r=L(t,fc),o=L(t,uc);if(!n&&!r&&!o)return p;let c=i!==void 0?i>=100:t.state==="open",d=i!==void 0?i<=0:t.state==="closed";return l`
      <div class="trailing">
        ${n?l`
              <button
                class="ctl"
                ?disabled=${e||c}
                aria-label="Open cover"
                @click=${u=>this._callCover(u,"open_cover")}
              >
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </button>
            `:p}
        ${r?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Stop cover"
                @click=${u=>this._callCover(u,"stop_cover")}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `:p}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e||d}
                aria-label="Close cover"
                @click=${u=>this._callCover(u,"close_cover")}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `:p}
      </div>
    `}};Ht.styles=[k,w`
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
    `],m([b({attribute:!1})],Ht.prototype,"hass",2),m([h()],Ht.prototype,"_config",2),m([h()],Ht.prototype,"_localPos",2),Ht=m([x("silk-cover-card")],Ht);var as={type:"silk-fan-card",name:"Silk Fan",description:"Speed at your fingertips, with an icon that actually spins."},_c=1,vc=8,bc=3,yc=2e3;E("silk-fan-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["fan"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var st=class extends y{static getStubConfig(s){return{type:"custom:silk-fan-card",entity:Object.keys(s.states).find(e=>e.startsWith("fan."))}}static async getConfigElement(){return document.createElement("silk-fan-card-editor")}setConfig(s){if(!s.entity)throw new Error("silk-fan-card: `entity` is required");if(O(s.entity)!=="fan")throw new Error(`silk-fan-card: \`entity\` must be a fan.* entity, got \`${s.entity}\``);this._config=s,this._dragPct=void 0,this._lastUpdated=void 0,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optTimer),this._optTimer=void 0}willUpdate(s){if(!s.has("hass")||!this._config)return;let t=this.hass?.states[this._config.entity]?.last_updated;if(t&&t!==this._lastUpdated){let e=this._lastUpdated!==void 0;this._lastUpdated=t,e&&this._clearOptimistic()}}_rawPct(s){let t=s.attributes.percentage;return typeof t=="number"&&Number.isFinite(t)?t:void 0}_effectivePct(s){return this._dragPct??this._optPct??this._rawPct(s)}_effectiveOn(s){return this._dragPct!==void 0?this._dragPct>0:this._optOn??R(s)}_setOptimistic(s){s.on!==void 0&&(this._optOn=s.on),s.pct!==void 0&&(this._optPct=s.pct),s.preset!==void 0&&(this._optPreset=s.preset),window.clearTimeout(this._optTimer),this._optTimer=window.setTimeout(()=>this._clearOptimistic(),yc)}_clearOptimistic(){window.clearTimeout(this._optTimer),this._optTimer=void 0,this._optOn=void 0,this._optPct=void 0,this._optPreset=void 0}_onIconClick(s){if(s.stopPropagation(),!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||_(t))return;let e=!this._effectiveOn(t);j(this.hass,this._config.entity),this._setOptimistic(e?{on:!0}:{on:!1,pct:0}),T(this)}_onSlide(s){this._dragPct=s.detail.value}_onSliderChange(s){let t=s.detail.value;if(this._dragPct=void 0,!this.hass||!this._config)return;let e=this._config.entity;t<=0?(this.hass.callService("fan","turn_off",{entity_id:e}),this._setOptimistic({on:!1,pct:0})):(this.hass.callService("fan","set_percentage",{entity_id:e,percentage:t}),this._setOptimistic({on:!0,pct:t})),T(this)}_onPresetClick(s,t){s.stopPropagation(),!(!this.hass||!this._config)&&(this.hass.callService("fan","set_preset_mode",{entity_id:this._config.entity,preset_mode:t}),this._setOptimistic({preset:t}),T(this))}_onCardClick(s){s.target.localName!=="silk-slider"&&this._config&&C(this,this._config.entity)}render(){if(!this._config||!this.hass)return p;let s=this._config,t=this.hass.states[s.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let e=_(t),i=!e&&this._effectiveOn(t),n=this._effectivePct(t),r=L(t,_c),o=s.name??t.attributes.friendly_name??s.entity,c=i&&(n===void 0||n>0),d=P(3.5-(n??50)*.03,.6,3.5),u=L(t,vc)?(t.attributes.preset_modes??[]).slice(0,bc):[],f=this._optPreset??t.attributes.preset_mode;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${S(t,s.color)}"
        @click=${this._onCardClick}
      >
        ${r?l`
              <silk-slider
                fill
                .value=${n??0}
                .min=${0}
                .max=${100}
                .step=${t.attributes.percentage_step??25}
                .disabled=${e}
                @slide=${this._onSlide}
                @change=${this._onSliderChange}
              ></silk-slider>
            `:p}
        <button
          class="icon ${i?"on":""}"
          .disabled=${e}
          aria-label=${i?`Turn off ${o}`:`Turn on ${o}`}
          @click=${this._onIconClick}
        >
          <span
            class="blades ${c?"spinning":""}"
            style=${c?`animation-duration:${d.toFixed(2)}s`:p}
          >
            ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
          </span>
        </button>
        <div class="info">
          <div class="name">${o}</div>
          <div class="state">${this._renderStateLine(t,i,n,r)}</div>
        </div>
        ${u.length?l`
              <div class="trailing">
                ${u.map(g=>l`
                    <button
                      class="chip ${g===f?"active":""}"
                      .disabled=${e}
                      @click=${v=>this._onPresetClick(v,g)}
                    >
                      ${g}
                    </button>
                  `)}
              </div>
            `:p}
      </ha-card>
    `}_renderStateLine(s,t,e,i){let r=(this._dragPct!==void 0||this._optOn!==void 0)&&!_(s)?t?"On":"Off":N(this.hass,s),o=i&&t&&e!==void 0&&e>0;return l`${r}${o?l`<span class="sep">·</span>${Math.round(e)}%`:p}`}};st.styles=[k,w`
      .blades {
        display: grid;
        place-items: center;
        line-height: 0;
        pointer-events: none;
      }
      .blades.spinning {
        /* Duration comes from the inline style (tracks speed); the shared
           prefers-reduced-motion rule zeroes it out with !important. */
        animation: silk-fan-spin linear infinite;
      }
      @keyframes silk-fan-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `],m([b({attribute:!1})],st.prototype,"hass",2),m([h()],st.prototype,"_config",2),m([h()],st.prototype,"_dragPct",2),m([h()],st.prototype,"_optOn",2),m([h()],st.prototype,"_optPct",2),m([h()],st.prototype,"_optPreset",2),st=m([x("silk-fan-card")],st);var cs={type:"silk-button-card",name:"Silk Button",description:"Scenes and scripts that feel like real buttons."},Mi=["scene","script","button","input_button"],xc={scene:"mdi:palette",script:"mdi:script-text",button:"mdi:gesture-tap-button",input_button:"mdi:gesture-tap-button"};E("silk-button-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:[...Mi]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Confirm before running"});var Lt=class extends y{constructor(){super(...arguments);this._optimisticRunning=!1}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-button-card",entity:e.find(n=>n.startsWith("scene."))??e.find(n=>n.startsWith("script."))}}static async getConfigElement(){return document.createElement("silk-button-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-button-card: `entity` is required");let e=O(t.entity);if(!Mi.includes(e))throw new Error(`silk-button-card: entity must be one of ${Mi.join("/")}, got \`${e}\``);this._config=t,this._optimisticRunning=!1}getCardSize(){return 1}getGridOptions(){return{columns:3,rows:1,min_columns:2,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){t.has("hass")&&this._optimisticRunning&&this._stateObj?.state==="on"&&this._clearOptimistic()}get _stateObj(){let t=this._config?.entity;return t?this.hass?.states[t]:void 0}_isUnavailable(t){return!t||t.state==="unavailable"}_isRunning(t){return!this._config||O(this._config.entity)!=="script"?!1:t?.state==="on"||this._optimisticRunning}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticRunning=!1}_onPress(){let t=this._config,e=this.hass;if(!t||!e||this._isUnavailable(this._stateObj))return;let i=t.name??this._stateObj?.attributes.friendly_name??t.entity;if(t.confirm&&!window.confirm(`Run "${i}"?`))return;let n=O(t.entity),r=n==="button"||n==="input_button"?"press":"turn_on";e.callService(n,r,{entity_id:t.entity}),T(this),this._flash(),n==="script"&&(this._optimisticRunning=!0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>{this._optimisticTimer=void 0,this._optimisticRunning=!1},2e3))}_onKeydown(t){t.repeat||t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._onPress())}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_renderIcon(t,e){if(e)return l`<ha-icon class="spin" icon="mdi:loading"></ha-icon>`;if(this._config?.icon)return l`<ha-icon .icon=${this._config.icon}></ha-icon>`;if(t)return l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`;let i=O(this._config?.entity??"");return l`<ha-icon .icon=${xc[i]??"mdi:gesture-tap"}></ha-icon>`}render(){let t=this._config;if(!t)return p;let e=this._stateObj;if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=this._isUnavailable(e),n=this._isRunning(e),r=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${S(e,t.color)}"
        role="button"
        tabindex=${i?-1:0}
        aria-label=${r}
        @click=${this._onPress}
        @keydown=${this._onKeydown}
      >
        <div class="flash"></div>
        <div class="icon ${R(e)||n?"on":""}">
          ${this._renderIcon(e,n)}
        </div>
        <div class="info"><div class="name">${r}</div></div>
      </ha-card>
    `}};Lt.styles=[k,w`
      /* The whole card is the button: press-in fast, release with spring. */
      ha-card {
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      ha-card:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      ha-card.unavailable {
        cursor: default;
      }
      ha-card.unavailable:active {
        transform: none;
      }
      /* The card handles the click; the icon is purely visual. */
      .icon {
        pointer-events: none;
      }
      /* Success feedback = a brief accent surface wash, never a glow shadow. */
      .flash {
        position: absolute;
        inset: 0;
        background: var(--silk-accent);
        opacity: 0;
        pointer-events: none;
        z-index: 0;
      }
      .flash.go {
        animation: silk-action-flash 400ms var(--silk-ease-out);
      }
      @keyframes silk-action-flash {
        0% {
          opacity: 0;
        }
        35% {
          opacity: 0.15;
        }
        100% {
          opacity: 0;
        }
      }
      /* Spinner while a script is actually running — represents real activity. */
      .icon ha-icon.spin {
        animation: silk-action-spin 900ms linear infinite;
      }
      @keyframes silk-action-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `],m([b({attribute:!1})],Lt.prototype,"hass",2),m([h()],Lt.prototype,"_config",2),m([h()],Lt.prototype,"_optimisticRunning",2),Lt=m([x("silk-button-card")],Lt);var ds={type:"silk-media-card",name:"Silk Media",description:"Artwork-first now playing with honest controls."},wc=1,ls=4,kc=16,$c=32,Tc=16384,Ec=2e3,ms="silk-media-card-editor";E(ms,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_volume",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_volume:"Show volume slider"},{show_volume:!0});function Pi(a,s){let t=a.attributes[s];return typeof t=="string"&&t?t:void 0}var yt=class extends y{constructor(){super(...arguments);this._optimisticPlaying=null;this._optimisticVolume=null}static getStubConfig(t){return{type:"custom:silk-media-card",entity:Object.keys(t.states).find(i=>i.startsWith("media_player."))}}static async getConfigElement(){return document.createElement(ms)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-media-card: define a media_player `entity` (e.g. media_player.living_room)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return this._showsVolume()?2:1}getGridOptions(){return{columns:6,rows:this._showsVolume()?2:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_showsVolume(){if(this._config?.show_volume===!1)return!1;let t=this._config?this.hass?.states[this._config.entity]:void 0;return t?L(t,ls):!0}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null},Ec)}_onLeadingClick(t){t.stopPropagation(),this._config&&C(this,this._config.entity)}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onPlayPause(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(!e||_(e))return;let i=this._optimisticPlaying??e.state==="playing";this._optimisticPlaying=!i,this._armExpiry(),this.hass.callService("media_player","media_play_pause",{entity_id:this._config.entity}),T(this)}_onSkip(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(_(this.hass.states[this._config.entity])||(this.hass.callService("media_player",e,{entity_id:this._config.entity}),T(this)))}_onVolumeChange(t){if(!this.hass||!this._config)return;let e=P(Math.round(t.detail.value),0,100);this._optimisticVolume=e,this._armExpiry(),this.hass.callService("media_player","volume_set",{entity_id:this._config.entity,volume_level:e/100}),T(this)}_volumePct(t){if(this._optimisticVolume!==null)return this._optimisticVolume;let e=t.attributes.volume_level;return typeof e=="number"&&Number.isFinite(e)?Math.round(P(e,0,1)*100):0}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=_(t),i=R(t),n=S(t,this._config.color),r=e?void 0:Pi(t,"entity_picture"),o=Pi(t,"media_title")??this._config.name??t.attributes.friendly_name??t.entity_id,c=t.state==="playing",d=e?!1:this._optimisticPlaying??c,u=Pi(t,"media_artist")??(e||d===c?N(this.hass,t):d?"Playing":"Paused"),f=this._config.show_volume!==!1&&L(t,ls);return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${this._onCardClick}
      >
        <div class="row">
          ${r?l`
                <button class="artwork" aria-label="Show details for ${o}" @click=${this._onLeadingClick}>
                  <img src=${r} alt="" />
                </button>
              `:l`
                <button
                  class="icon ${i?"on":""}"
                  aria-label="Show details for ${o}"
                  @click=${this._onLeadingClick}
                >
                  ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
                </button>
              `}
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">${u}</div>
          </div>
          ${this._renderControls(t,e,d)}
        </div>
        ${f?l`
              <silk-slider
                class="volume"
                .value=${this._volumePct(t)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${e}
                @change=${this._onVolumeChange}
                @click=${this._stopClick}
              ></silk-slider>
            `:p}
      </ha-card>
    `}_renderControls(t,e,i){let n=L(t,kc),r=L(t,wc)||L(t,Tc),o=L(t,$c);return!n&&!r&&!o?p:l`
      <div class="trailing">
        ${n?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Previous track"
                @click=${c=>this._onSkip(c,"media_previous_track")}
              >
                <ha-icon icon="mdi:skip-previous"></ha-icon>
              </button>
            `:p}
        ${r?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label=${i?"Pause":"Play"}
                @click=${this._onPlayPause}
              >
                <ha-icon icon=${i?"mdi:pause":"mdi:play"}></ha-icon>
              </button>
            `:p}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Next track"
                @click=${c=>this._onSkip(c,"media_next_track")}
              >
                <ha-icon icon="mdi:skip-next"></ha-icon>
              </button>
            `:p}
      </div>
    `}};yt.styles=[k,w`
      /* Two stacked rows instead of the base single-row layout. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .artwork {
        flex: none;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 14px;
        padding: 0;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        z-index: 1;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: transform 250ms var(--silk-spring);
      }
      .artwork:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .artwork img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        pointer-events: none;
      }
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      silk-slider.volume {
        --silk-slider-height: 30px;
        position: relative;
        z-index: 1;
      }
      .unavailable .artwork,
      .unavailable .volume {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],yt.prototype,"hass",2),m([h()],yt.prototype,"_config",2),m([h()],yt.prototype,"_optimisticPlaying",2),m([h()],yt.prototype,"_optimisticVolume",2),yt=m([x("silk-media-card")],yt);var us={type:"silk-room-card",name:"Silk Room",description:"A room at a glance: climate, activity, and quick controls."},hs="silk-room-card-editor";E(hs,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"navigation_path",selector:{text:{}}}],{name:"Name",icon:"Icon",navigation_path:"Navigation path"},{icon:"mdi:sofa"});var ps="mdi:sofa",Cc=3,Ac=4,Sc=2e3;function Mc(a){return typeof a!="string"||!a?"":a==="\xB0C"||a==="\xB0F"?"\xB0":a}function Pc(a,s){switch(a){case"lock":return s?"unlocked":"locked";case"cover":case"valve":return s?"open":"closed";default:return s?"on":"off"}}var Nt=class extends y{constructor(){super(...arguments);this._optimistic={};this._sensors=[];this._toggles=[];this._countIds=[];this._optimisticBase={};this._optimisticTimers={}}static getStubConfig(){return{type:"custom:silk-room-card",name:"Living room",icon:ps}}static async getConfigElement(){return document.createElement(hs)}setConfig(t){if(!t.name)throw new Error("silk-room-card: `name` is required");this._config=t,this._sensors=(t.sensors??[]).slice(0,Cc),this._toggles=(t.toggles??[]).slice(0,Ac),this._countIds=t.count_active??[],this._clearAllOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._optimistic)){let i=this.hass.states[e];i&&i.last_updated!==this._optimisticBase[e]&&this._clearOptimistic(e)}}_clearOptimistic(t){if(window.clearTimeout(this._optimisticTimers[t]),delete this._optimisticTimers[t],delete this._optimisticBase[t],t in this._optimistic){let e={...this._optimistic};delete e[t],this._optimistic=e}}_clearAllOptimistic(){for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={},this._optimisticBase={},this._optimistic={}}_displayActive(t){let e=this._optimistic[t];return e!==void 0?e:R(this.hass?.states[t])}_onCardClick(){let t=this._config;if(!t)return;if(t.navigation_path){history.pushState(null,"",t.navigation_path),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}));return}let e=this._sensors[0]??this._toggles[0];e&&C(this,e)}_onToggleClick(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let n=i.states[e];!n||_(n)||(T(this),this._optimistic={...this._optimistic,[e]:!R(n)},this._optimisticBase[e]=n.last_updated,window.clearTimeout(this._optimisticTimers[e]),this._optimisticTimers[e]=window.setTimeout(()=>this._clearOptimistic(e),Sc),j(i,e))}_sensorSegments(){let t=this.hass,e=[];for(let i of this._sensors){let n=t.states[i];if(!n)continue;let r=Number(n.state),o=Number.isFinite(r)?Mc(n.attributes.unit_of_measurement):"";e.push(l`<span class="reading">${D(t,i,r)}${o}</span>`)}return e}_activeCount(){let t=0;for(let e of this._countIds)this._displayActive(e)&&t++;return t}_renderToggle(t){let e=this.hass,i=e.states[t],n=!i||_(i),r=this._optimistic[t],o=r??R(i),c=i&&r!==void 0?{...i,state:Pc(O(t),r)}:i,d=i?.attributes.friendly_name??t;return l`
      <button
        class="tbtn ${o?"on":""}"
        style="--silk-accent:${S(c)}"
        .disabled=${n}
        aria-label=${`Toggle ${d}`}
        aria-pressed=${o?"true":"false"}
        @click=${u=>this._onToggleClick(u,t)}
      >
        ${c?l`<ha-state-icon .hass=${e} .stateObj=${c}></ha-state-icon>`:l`<ha-icon icon="mdi:help-circle-outline"></ha-icon>`}
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._toggles.length?e.states[this._toggles[0]]:void 0,n=S(i,t.color),r=this._countIds.length?this._activeCount():0,o=r>0||this._toggles.some(d=>this._displayActive(d)),c=[];for(let d of this._sensorSegments())c.length&&c.push(l`<span class="sep">·</span>`),c.push(d);return this._countIds.length&&(c.length&&c.push(l`<span class="sep">·</span>`),c.push(l`<span class="count ${r>0?"on":""}">${r} on</span>`)),l`
      <ha-card class="control" style="--silk-accent:${n}" @click=${this._onCardClick}>
        <div class="icon ${o?"on":""}">
          <ha-icon .icon=${t.icon??ps}></ha-icon>
        </div>
        <div class="info">
          <div class="name">${t.name}</div>
          ${c.length?l`<div class="state">${c}</div>`:p}
        </div>
        ${this._toggles.length?l`<div class="trailing">${this._toggles.map(d=>this._renderToggle(d))}</div>`:p}
      </ha-card>
    `}};Nt.styles=[k,w`
      /* Hero proportions: a touch larger than the standard control row. */
      .icon {
        width: 46px;
        height: 46px;
      }
      .icon ha-icon {
        --mdc-icon-size: 24px;
      }
      .name {
        font-size: 15px;
        font-weight: 600;
      }
      .count.on {
        color: var(--silk-accent);
      }
      .tbtn {
        flex: none;
        position: relative;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo widens the touch target without growing the button. */
      .tbtn::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 15px;
      }
      .tbtn:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tbtn.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
      }
      .tbtn ha-state-icon,
      .tbtn ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .tbtn:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .tbtn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
    `],m([b({attribute:!1})],Nt.prototype,"hass",2),m([h()],Nt.prototype,"_config",2),m([h()],Nt.prototype,"_optimistic",2),Nt=m([x("silk-room-card")],Nt);var fs={type:"silk-rocker-card",name:"Silk Rocker",description:"A wall switch that looks and moves like the real thing."},gs="silk-rocker-card-editor";E(gs,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var Oc=2e3,It=class extends y{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-rocker-card",entity:Object.keys(t.states).find(i=>i.startsWith("switch."))}}static async getConfigElement(){return document.createElement(gs)}setConfig(t){if(!t.entity)throw new Error("silk-rocker-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_toggle(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];!i||_(i)||(T(this),this._optimistic=!R(i),this._optimisticBase=i.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Oc),j(e,t.entity))}_onClick(){this._toggle()}_onKeydown(t){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._toggle())}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=this._optimistic??R(i),o=S(i,t.color),c=t.name??i.attributes.friendly_name??t.entity,d=t.show_name!==!1;return l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${o}"
        role="switch"
        tabindex=${n?-1:0}
        aria-checked=${r?"true":"false"}
        aria-disabled=${n?"true":"false"}
        aria-label=${`Toggle ${c}`}
        @click=${this._onClick}
        @keydown=${this._onKeydown}
      >
        <div class="plate">
          <div class="paddle ${n?"":r?"on":"off"}">
            <span class="led ${!n&&r?"lit":""}"></span>
          </div>
        </div>
        ${d?l`<div class="name" title=${c}>${c}</div>`:p}
      </ha-card>
    `}};It.styles=[k,w`
      ha-card {
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
      }
      ha-card:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .unavailable {
        cursor: default;
      }
      /* Wall-plate well: a recessed pocket the paddle sits in. */
      .plate {
        flex: none;
        width: 60px;
        height: 92px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        box-shadow:
          inset 0 2px 5px rgba(0, 0, 0, 0.16),
          inset 0 -1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:not(.unavailable):active .plate {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* The rocker paddle: tilts on the X axis around its center, like a real
         seesaw switch. ON = top edge pressed in, OFF = bottom edge pressed. */
      .paddle {
        position: relative;
        width: 46px;
        height: 78px;
        border-radius: 10px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        transition:
          transform 160ms var(--silk-ease-out),
          box-shadow 160ms var(--silk-ease-out),
          background 200ms ease;
        will-change: transform;
      }
      .paddle.on {
        transform: perspective(240px) translateY(-1px) rotateX(10deg);
        box-shadow:
          inset 0 3px 5px rgba(0, 0, 0, 0.16),
          inset 0 -1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .paddle.off {
        transform: perspective(240px) translateY(1px) rotateX(-10deg);
        box-shadow:
          inset 0 -3px 5px rgba(0, 0, 0, 0.16),
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      /* Status LED: a solid accent dot, never a glow. */
      .led {
        position: absolute;
        left: 50%;
        bottom: 9px;
        transform: translateX(-50%);
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
        transition: background 200ms ease;
      }
      .led.lit {
        background: var(--silk-accent);
      }
      .name {
        font-size: 13px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      /* Unavailable: paddle sits neutral and flat, everything dims. */
      .unavailable .plate,
      .unavailable .name {
        opacity: 0.45;
      }
      .unavailable .paddle {
        transform: none;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
      }
    `],m([b({attribute:!1})],It.prototype,"hass",2),m([h()],It.prototype,"_config",2),m([h()],It.prototype,"_optimistic",2),It=m([x("silk-rocker-card")],It);var bs={type:"silk-push-card",name:"Silk Push",description:"A physical push button with a satisfying press."},ys="silk-push-card-editor";E(ys,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","scene","script","button","input_button"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before pressing"});var _s=new Set(["scene","script","button","input_button"]),vs=38,Oi=100,Rc=2e3,Ft=class extends y{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-push-card",entity:e.find(n=>n.startsWith("switch."))??e.find(n=>n.startsWith("scene."))}}static async getConfigElement(){return document.createElement(ys)}setConfig(t){if(!t.entity)throw new Error("silk-push-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_sweep(){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;this.renderRoot.querySelector(".ring-led")?.animate([{strokeDashoffset:`${Oi}`,opacity:1},{strokeDashoffset:"0",opacity:1,offset:.8},{strokeDashoffset:"0",opacity:0}],{duration:600,easing:"cubic-bezier(0.23, 1, 0.32, 1)"})}_onCardClick(){this._config&&C(this,this._config.entity)}_onPress(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!(!n||_(n))){if(e.confirm){let r=e.name??n.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to press ${r}?`))return}T(this),_s.has(O(e.entity))?this._sweep():(this._optimistic=!R(n),this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Rc)),j(i,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=!_s.has(O(t.entity)),o=r&&!n&&(this._optimistic??R(i)),c=this._optimistic===null||!r?i:{...i,state:this._optimistic?"on":"off"},d=S(i,t.color),u=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${d}"
        @click=${this._onCardClick}
      >
        <div class="well">
          <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring-track" cx="40" cy="40" r=${vs}></circle>
            <circle
              class="ring-led ${o?"on":""}"
              cx="40"
              cy="40"
              r=${vs}
              pathLength=${Oi}
            ></circle>
          </svg>
          <button
            class="btn ${o?"on":""}"
            .disabled=${n}
            aria-label=${`${r?"Toggle":"Activate"} ${u}`}
            @click=${this._onPress}
          >
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${c}></ha-state-icon>`}
          </button>
        </div>
        <div class="name" title=${u}>${u}</div>
      </ha-card>
    `}};Ft.styles=[k,w`
      ha-card {
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        padding: 8px 12px;
      }
      .well {
        position: relative;
        flex: none;
        width: 80px;
        height: 80px;
        display: grid;
        place-items: center;
      }
      .ring {
        position: absolute;
        inset: 0;
        display: block;
        /* Dash sweep starts at 12 o'clock instead of SVG's default 3 o'clock. */
        transform: rotate(-90deg);
        pointer-events: none;
        overflow: visible;
      }
      .ring-track,
      .ring-led {
        fill: none;
        stroke-width: 3;
      }
      .ring-track {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
      }
      /* LED ring: solid accent surface when on, no glow shadows ever. */
      .ring-led {
        stroke: var(--silk-accent);
        stroke-linecap: round;
        stroke-dasharray: ${Oi};
        stroke-dashoffset: 0;
        opacity: 0;
        transition: opacity 200ms ease;
      }
      .ring-led.on {
        opacity: 1;
      }
      /* The button face: bezel ring + monochrome dome via inset shadows only. */
      .btn {
        position: relative;
        z-index: 1;
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -3px 6px rgba(0, 0, 0, 0.12);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring),
          color 200ms ease;
      }
      .btn:active:not(:disabled) {
        transform: scale(0.93);
        box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.22);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .btn.on {
        color: var(--silk-accent);
      }
      .btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 3px;
      }
      .btn:disabled {
        cursor: default;
      }
      .btn ha-state-icon,
      .btn ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .name {
        font-size: 13px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .unavailable .well,
      .unavailable .name {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Ft.prototype,"hass",2),m([h()],Ft.prototype,"_config",2),m([h()],Ft.prototype,"_optimistic",2),Ft=m([x("silk-push-card")],Ft);var Ts={type:"silk-knob-card",name:"Silk Knob",description:"A rotary dial you actually turn."},Es="silk-knob-card-editor";E(Es,[{name:"entity",required:!0,selector:{entity:{domain:["light","fan","media_player","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",color:"Accent color"});var Hc=["light","fan","media_player","number","input_number"];function Qe(a,s){if(a==="number"||a==="input_number"){let t=Number(s.attributes.min),e=Number(s.attributes.max),i=Number(s.attributes.step),n=Number.isFinite(t)?t:0,r=Number.isFinite(e)&&e>n?e:n+100;return{min:n,max:r,step:Number.isFinite(i)&&i>0?i:1,percent:!1,toggleable:!1}}if(a==="fan"){let t=Number(s.attributes.percentage_step);return{min:0,max:100,step:Number.isFinite(t)&&t>0?t:1,percent:!0,toggleable:!0}}return{min:0,max:100,step:1,percent:!0,toggleable:!0}}function Lc(a,s){switch(a){case"light":{if(s.state!=="on")return 0;let t=s.attributes.brightness;return typeof t!="number"?100:P(Math.round(t/255*100),1,100)}case"fan":{if(s.state==="off")return 0;let t=s.attributes.percentage;return typeof t=="number"?t:s.state==="on"?100:null}case"media_player":{let t=s.attributes.volume_level;return typeof t=="number"?t*100:null}case"number":case"input_number":{let t=Number(s.state);return Number.isFinite(t)?t:null}}}function Nc(a,s,t,e){switch(t){case"light":e<=0?a.callService("light","turn_off",{entity_id:s}):a.callService("light","turn_on",{entity_id:s,brightness_pct:Math.round(e)});return;case"fan":a.callService("fan","set_percentage",{entity_id:s,percentage:Math.round(e)});return;case"media_player":a.callService("media_player","volume_set",{entity_id:s,volume_level:Math.round(e)/100});return;case"number":case"input_number":a.callService(t,"set_value",{entity_id:s,value:e});return}}function xs(a,s){let t=Math.round((a-s.min)/s.step)*s.step+s.min;return P(Number(t.toFixed(3)),s.min,s.max)}function Ic(a){let s=String(a),t=s.indexOf(".");return t===-1?0:Math.min(s.length-t-1,3)}var $e=118,Y=$e/2,ws=46,ks=50.5,$s=56.5,Ri=25,Ze=270,De=-135,Fc=19,Dc=40,Uc=4,zc=2e3,jc=Array.from({length:Ri},(a,s)=>{let t=(De+Ze*s/(Ri-1))*Math.PI/180,e=Math.sin(t),i=-Math.cos(t);return{x1:(Y+ks*e).toFixed(2),y1:(Y+ks*i).toFixed(2),x2:(Y+$s*e).toFixed(2),y2:(Y+$s*i).toFixed(2)}}),rt=class extends y{constructor(){super(...arguments);this._dragValue=null;this._optimistic=null;this._pressed=!1;this._dragging=!1;this._centerX=0;this._centerY=0;this._startX=0;this._startY=0}static getStubConfig(t){return{type:"custom:silk-knob-card",entity:Object.keys(t.states).find(i=>i.startsWith("light."))}}static async getConfigElement(){return document.createElement(Es)}setConfig(t){if(!t.entity)throw new Error("silk-knob-card: `entity` is required");let e=O(t.entity);if(!Hc.includes(e))throw new Error(`silk-knob-card: unsupported domain "${e}" \u2014 use light, fan, media_player, number or input_number`);this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._pressed||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),zc)}_displayLevel(t,e){return this._dragValue??this._optimistic??Lc(e,t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatNumber(t,e){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:e}).format(t)}_valueFromPointer(t,e){let i=Math.atan2(t.clientX-this._centerX,this._centerY-t.clientY)*180/Math.PI,r=(P(i,De,De+Ze)-De)/Ze;return xs(e.min+r*(e.max-e.min),e)}_spec(){let t=this._config,e=t?this.hass?.states[t.entity]:void 0;return!t||!e?null:Qe(O(t.entity),e)}_onPointerDown(t){let e=this._config?this.hass?.states[this._config.entity]:void 0;if(!e||_(e))return;t.stopPropagation();let i=t.currentTarget;i.setPointerCapture(t.pointerId);let n=i.getBoundingClientRect();this._centerX=n.left+n.width/2,this._centerY=n.top+n.height/2,this._startX=t.clientX,this._startY=t.clientY,this._pressed=!0,this._dragging=!1}_onPointerMove(t){if(!this._pressed)return;if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<Uc)return;this._dragging=!0}let e=this._spec();e&&(this._dragValue=this._valueFromPointer(t,e))}_onPointerUp(t){if(this._pressed)if(this._pressed=!1,this._dragging){this._dragging=!1;let e=this._spec();e&&this._commit(this._valueFromPointer(t,e)),this._dragValue=null}else this._onTap()}_onPointerCancel(){this._pressed=!1,this._dragging=!1,this._dragValue=null}_commit(t){let e=this._config,i=this.hass;!e||!i||(this._optimistic=t,this._holdOptimistic(),T(this),Nc(i,e.entity,O(e.entity),t))}_onTap(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];if(!i||_(i))return;let n=O(t.entity);if(!Qe(n,i).toggleable)return;T(this);let r=R(i);j(e,t.entity),(n==="light"||n==="fan")&&(this._optimistic=r?0:null,r?this._holdOptimistic():this._clearOptimistic())}_onKeydown(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=t.key,o=0;if(r==="ArrowUp"||r==="ArrowRight")o=1;else if(r==="ArrowDown"||r==="ArrowLeft")o=-1;else if(r!=="Home"&&r!=="End")return;t.preventDefault(),t.stopPropagation();let c=O(e.entity),d=Qe(c,n),u=this._displayLevel(n,c)??d.min,f=r==="Home"?d.min:r==="End"?d.max:xs(u+o*d.step,d);f!==u&&this._commit(f)}_onCardClick(){this._config&&C(this,this._config.entity)}_swallowClick(t){t.stopPropagation()}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=O(t.entity),r=Qe(n,i),o=_(i),c=o?null:this._displayLevel(i,n),d=r.max-r.min||1,u=c===null?0:P((c-r.min)/d,0,1),f=c===null?-1:u,g=De+Ze*u,v=S(i,t.color),$=t.name??i.attributes.friendly_name??t.entity,A=r.percent?"":i.attributes.unit_of_measurement??"",M=c===null?"\u2014":r.percent?`${Math.round(c)}%`:this._formatNumber(c,Ic(r.step));return l`
      <ha-card
        class=${o?"unavailable":""}
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div
          class="dial ${this._dragging?"dragging":""} ${this._pressed?"pressed":""}"
          role="slider"
          tabindex=${o?-1:0}
          aria-label=${$}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${c===null?r.min:r.percent?Math.round(c):c}
          aria-valuetext=${A?`${M} ${A}`:M}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
          @keydown=${this._onKeydown}
          @click=${this._swallowClick}
        >
          <svg viewBox="0 0 ${$e} ${$e}" aria-hidden="true">
            <defs>
              <filter id="silk-knob-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="1.2"
                  stdDeviation="1.4"
                  flood-color="#000"
                  flood-opacity="0.18"
                ></feDropShadow>
              </filter>
            </defs>
            ${jc.map((I,F)=>z`<line
                  class="tick ${F/(Ri-1)<=f+1e-6?"on":""}"
                  x1=${I.x1} y1=${I.y1} x2=${I.x2} y2=${I.y2}
                ></line>`)}
            <g class="knob-g">
              <circle
                class="face"
                cx=${Y}
                cy=${Y}
                r=${ws}
                filter="url(#silk-knob-shadow)"
              ></circle>
              <circle class="rim" cx=${Y} cy=${Y} r=${ws-3} ></circle>
              <g class="ind" style="transform: rotate(${g}deg)">
                <line class="mark" x1=${Y} y1=${Y-Dc} x2=${Y} y2=${Y-Fc}></line>
              </g>
            </g>
          </svg>
        </div>
        <div class="readout">
          <span class="value">${M}</span>
          ${A?l`<span class="unit">${A}</span>`:p}
        </div>
      </ha-card>
    `}};rt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 12px;
      }
      .dial {
        /* Basis is the full 118px stage; shrinks proportionally in tight grids. */
        flex: 1 1 ${$e}px;
        min-height: 44px;
        min-width: 0;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        outline: none;
        cursor: grab;
        touch-action: none;
      }
      .dial.pressed {
        cursor: grabbing;
      }
      .dial:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: ${$e}px;
        max-height: ${$e}px;
        overflow: visible;
      }
      .tick {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 2;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .tick.on {
        stroke: var(--silk-accent);
      }
      /*
       * Neutral monochrome depth only: a gray face from the text color (reads
       * darker-on-light and lighter-on-dark), a 1px bezel ring, a black-alpha
       * machined rim, and a small neutral cast shadow. No chromatic shading.
       */
      .face {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
        stroke-width: 1;
      }
      .rim {
        fill: none;
        stroke: rgba(0, 0, 0, 0.1);
        stroke-width: 2.5;
      }
      .mark {
        stroke: var(--silk-accent);
        stroke-width: 3;
        stroke-linecap: round;
      }
      .ind {
        transform-origin: ${Y}px ${Y}px;
        transition: transform 250ms var(--silk-spring);
      }
      .knob-g {
        transform-origin: ${Y}px ${Y}px;
        transition: transform 250ms var(--silk-spring);
      }
      .dial.dragging .ind {
        transition: none;
      }
      .dial.pressed .knob-g {
        transform: scale(0.97);
        transition: transform 120ms var(--silk-ease-out);
      }
      .readout {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 3px;
        max-width: 100%;
        min-width: 0;
      }
      .readout .value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .dial,
      .unavailable .readout {
        opacity: 0.45;
      }
      .unavailable .dial {
        cursor: default;
      }
    `],m([b({attribute:!1})],rt.prototype,"hass",2),m([h()],rt.prototype,"_config",2),m([h()],rt.prototype,"_dragValue",2),m([h()],rt.prototype,"_optimistic",2),m([h()],rt.prototype,"_pressed",2),m([h()],rt.prototype,"_dragging",2),rt=m([x("silk-knob-card")],rt);var As={type:"silk-fader-card",name:"Silk Fader",description:"A studio fader for lights, covers, and anything with a level."},Ss="silk-fader-card-editor";E(Ss,[{name:"entity",required:!0,selector:{entity:{domain:["light","cover","fan","media_player","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",color:"Accent color"});var qc=["light","cover","fan","media_player","number","input_number"];function Je(a,s){if(a==="number"||a==="input_number"){let t=Number(s.attributes.min),e=Number(s.attributes.max),i=Number(s.attributes.step),n=Number.isFinite(t)?t:0,r=Number.isFinite(e)&&e>n?e:n+100;return{min:n,max:r,step:Number.isFinite(i)&&i>0?i:1,percent:!1,toggleable:!1}}if(a==="fan"){let t=Number(s.attributes.percentage_step);return{min:0,max:100,step:Number.isFinite(t)&&t>0?t:1,percent:!0,toggleable:!0}}return{min:0,max:100,step:1,percent:!0,toggleable:!0}}function Vc(a,s){switch(a){case"light":{if(s.state!=="on")return 0;let t=s.attributes.brightness;return typeof t!="number"?100:P(Math.round(t/255*100),1,100)}case"cover":{let t=s.attributes.current_position;return typeof t=="number"?t:s.state==="open"?100:s.state==="closed"?0:null}case"fan":{if(s.state==="off")return 0;let t=s.attributes.percentage;return typeof t=="number"?t:s.state==="on"?100:null}case"media_player":{let t=s.attributes.volume_level;return typeof t=="number"?t*100:null}case"number":case"input_number":{let t=Number(s.state);return Number.isFinite(t)?t:null}}}function Gc(a,s,t,e){switch(t){case"light":e<=0?a.callService("light","turn_off",{entity_id:s}):a.callService("light","turn_on",{entity_id:s,brightness_pct:Math.round(e)});return;case"cover":a.callService("cover","set_cover_position",{entity_id:s,position:Math.round(e)});return;case"fan":a.callService("fan","set_percentage",{entity_id:s,percentage:Math.round(e)});return;case"media_player":a.callService("media_player","volume_set",{entity_id:s,volume_level:Math.round(e)/100});return;case"number":case"input_number":a.callService(t,"set_value",{entity_id:s,value:e});return}}function Cs(a,s){let t=Math.round((a-s.min)/s.step)*s.step+s.min;return P(Number(t.toFixed(3)),s.min,s.max)}function Bc(a){let s=String(a),t=s.indexOf(".");return t===-1?0:Math.min(s.length-t-1,3)}var Te=18,Wc=4,Yc=2e3,tt=class extends y{constructor(){super(...arguments);this._dragValue=null;this._optimistic=null;this._optimisticOn=null;this._dragging=!1;this._pressed=!1;this._startX=0;this._startY=0}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-fader-card",entity:e.find(n=>n.startsWith("light."))??e.find(n=>n.startsWith("cover."))}}static async getConfigElement(){return document.createElement(Ss)}setConfig(t){if(!t.entity)throw new Error("silk-fader-card: `entity` is required");let e=O(t.entity);if(!qc.includes(e))throw new Error(`silk-fader-card: unsupported domain "${e}" \u2014 use light, cover, fan, media_player, number or input_number`);this._config=t,this._clearOptimistic()}getCardSize(){return 3}getGridOptions(){return{columns:2,rows:3,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._pressed||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Yc)}_displayLevel(t,e){return this._dragValue??this._optimistic??Vc(e,t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatNumber(t,e){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:e}).format(t)}_spec(){let t=this._config,e=t?this.hass?.states[t.entity]:void 0;return!t||!e?null:Je(O(t.entity),e)}_valueFromPointer(t,e){let i=this._trackEl;if(!i)return null;let n=i.getBoundingClientRect(),r=n.height-Te;if(r<=0)return null;let o=P((n.bottom-t.clientY-Te/2)/r,0,1);return Cs(e.min+o*(e.max-e.min),e)}_onPointerDown(t){let e=this._config?this.hass?.states[this._config.entity]:void 0;!e||_(e)||(t.currentTarget.setPointerCapture(t.pointerId),this._pressed=!0,this._dragging=!1,this._startX=t.clientX,this._startY=t.clientY)}_onPointerMove(t){if(!this._pressed)return;if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<Wc)return;this._dragging=!0}let e=this._spec(),i=e?this._valueFromPointer(t,e):null;i!==null&&(this._dragValue=i)}_onPointerUp(t){if(this._pressed)if(this._pressed=!1,this._dragging){this._dragging=!1;let e=this._spec(),i=e?this._valueFromPointer(t,e):null;i!==null&&this._commit(i),this._dragValue=null}else this._config&&C(this,this._config.entity)}_onPointerCancel(){this._pressed=!1,this._dragging=!1,this._dragValue=null}_commit(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=O(e.entity);this._optimistic=t,n!=="media_player"&&(this._optimisticOn=t>0),this._holdOptimistic(),T(this),Gc(i,e.entity,n,t)}_onIconClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=O(e.entity);if(!Je(r,n).toggleable){C(this,e.entity);return}T(this);let o=this._optimisticOn??R(n);j(i,e.entity),this._optimisticOn=!o,o?this._optimistic=r==="media_player"?null:0:this._optimistic=r==="cover"?100:null,this._holdOptimistic()}_stopPointer(t){t.stopPropagation()}_onKeydown(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=t.key,o=0;if(r==="ArrowUp"||r==="ArrowRight")o=1;else if(r==="ArrowDown"||r==="ArrowLeft")o=-1;else if(r!=="Home"&&r!=="End")return;t.preventDefault(),t.stopPropagation();let c=O(e.entity),d=Je(c,n),u=this._displayLevel(n,c)??d.min,f=r==="Home"?d.min:r==="End"?d.max:Cs(u+o*d.step,d);f!==u&&this._commit(f)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=O(t.entity),r=Je(n,i),o=_(i),c=o?null:this._displayLevel(i,n),d=r.max-r.min||1,u=c===null?0:P((c-r.min)/d,0,1),f=r.toggleable&&!o&&(this._optimisticOn??R(i)),g=S(i,t.color),v=t.name??i.attributes.friendly_name??t.entity,$=r.percent?"":i.attributes.unit_of_measurement??"",A=c===null?"\u2014":r.percent?`${Math.round(c)}%`:this._formatNumber(c,Bc(r.step)),M=u.toFixed(4);return l`
      <ha-card
        class=${o?"unavailable":""}
        style="--silk-accent:${g}"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <div class="readout">
          <span class="value">${A}</span>
          ${$?l`<span class="unit">${$}</span>`:p}
        </div>
        <div
          class="fader ${this._dragging?"dragging":""}"
          role="slider"
          aria-orientation="vertical"
          tabindex=${o?-1:0}
          aria-label=${v}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${c===null?r.min:r.percent?Math.round(c):c}
          aria-valuetext=${$?`${A} ${$}`:A}
          @keydown=${this._onKeydown}
        >
          <div class="rail">
            <div class="track">
              <div class="fill" style="height: calc((100% - ${Te}px) * ${M} + ${Te/2}px)"></div>
            </div>
            <div class="cap" style="bottom: calc((100% - ${Te}px) * ${M})"></div>
          </div>
        </div>
        <button
          class="icon ${f?"on":""}"
          ?disabled=${o}
          aria-label=${`Toggle ${v}`}
          @pointerdown=${this._stopPointer}
          @click=${this._onIconClick}
        >
          <ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>
        </button>
      </ha-card>
    `}};tt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        /* Vertical drags ARE the control — never hand them to the scroller. */
        touch-action: none;
      }
      .readout {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 3px;
        max-width: 100%;
        min-width: 0;
      }
      .readout .value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fader {
        /* Basis gives the track real length in masonry; flexes in the grid. */
        flex: 1 1 140px;
        min-height: 56px;
        width: 100%;
        display: flex;
        justify-content: center;
        border-radius: 10px;
        outline: none;
        cursor: grab;
      }
      .fader.dragging {
        cursor: grabbing;
      }
      .fader:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .rail {
        position: relative;
        width: 10px;
        height: 100%;
      }
      .track {
        position: absolute;
        inset: 0;
        border-radius: 5px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--silk-accent);
        transition:
          height 250ms var(--silk-spring),
          background 200ms ease;
      }
      /*
       * The cap: neutral monochrome only — card-surface body, gray bezel
       * border, black-alpha depth (drop + bottom inset) and a text-gray top
       * bevel line, so it reads raised on light and dark themes alike.
       */
      .cap {
        position: absolute;
        left: 50%;
        margin-left: -18px;
        width: 36px;
        height: ${Te}px;
        border-radius: 5px;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
        box-shadow:
          0 2px 4px rgba(0, 0, 0, 0.22),
          inset 0 -2px 3px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        transition: bottom 250ms var(--silk-spring);
      }
      /* Center hairline groove across the cap. */
      .cap::after {
        content: '';
        position: absolute;
        left: 5px;
        right: 5px;
        top: 50%;
        height: 2px;
        margin-top: -1px;
        border-radius: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.4);
      }
      .fader.dragging .fill,
      .fader.dragging .cap {
        transition: none;
      }
      .icon {
        flex: none;
      }
      .icon:disabled {
        cursor: default;
      }
      .unavailable .readout,
      .unavailable .fader {
        opacity: 0.45;
      }
      .unavailable .fader {
        cursor: default;
      }
    `],m([b({attribute:!1})],tt.prototype,"hass",2),m([h()],tt.prototype,"_config",2),m([h()],tt.prototype,"_dragValue",2),m([h()],tt.prototype,"_optimistic",2),m([h()],tt.prototype,"_optimisticOn",2),m([h()],tt.prototype,"_dragging",2),m([Cn(".track")],tt.prototype,"_trackEl",2),tt=m([x("silk-fader-card")],tt);var Rs={type:"silk-weather-card",name:"Silk Weather",description:"Now plus the next six hours, nothing you don't need."},Ms={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},Ps="mdi:weather-partly-cloudy",Kc={"clear-night":"Clear night",cloudy:"Cloudy",exceptional:"Exceptional",fog:"Fog",hail:"Hail",lightning:"Lightning","lightning-rainy":"Lightning, rainy",partlycloudy:"Partly cloudy",pouring:"Pouring",rainy:"Rainy",snowy:"Snowy","snowy-rainy":"Snowy, rainy",sunny:"Sunny",windy:"Windy","windy-variant":"Windy"},Os=6,Hs="silk-weather-card-editor";E(Hs,[{name:"entity",required:!0,selector:{entity:{domain:["weather"]}}},{name:"name",selector:{text:{}}},{name:"show_forecast",selector:{boolean:{}}}],{entity:"Entity",name:"Name",show_forecast:"Show hourly forecast"},{show_forecast:!0});var xt=class extends y{constructor(){super(...arguments);this._forecast=null;this._subFailed=!1}static getStubConfig(t){return{type:"custom:silk-weather-card",entity:Object.keys(t.states).find(i=>i.startsWith("weather."))}}static async getConfigElement(){return document.createElement(Hs)}setConfig(t){if(!t.entity||O(t.entity)!=="weather")throw new Error("silk-weather-card: define a weather `entity` (e.g. weather.home)");this._subEntity!==void 0&&this._subEntity!==t.entity&&(this._teardownSubscription(),this._forecast=null,this._subFailed=!1),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._subscribeForecast()}disconnectedCallback(){super.disconnectedCallback(),this._teardownSubscription()}updated(t){!t.has("hass")&&!t.has("_config")||(this._config?.show_forecast===!1?this._teardownSubscription():this._subscribeForecast())}async _subscribeForecast(){let t=this._config,e=this.hass;if(!t||!e||!this.isConnected||t.show_forecast===!1||this._subEntity===t.entity)return;this._teardownSubscription();let i=t.entity;this._subEntity=i;let n=e.connection;if(!n||typeof n.subscribeMessage!="function"){this._subFailed=!0;return}try{let r=n.subscribeMessage(o=>{this._subEntity===i&&(this._forecast=Array.isArray(o.forecast)?o.forecast:[])},{type:"weather/subscribe_forecast",forecast_type:"hourly",entity_id:i});this._unsubPromise=r,await r}catch{this._subEntity===i&&(this._unsubPromise=void 0,this._subFailed=!0)}}_teardownSubscription(){let t=this._unsubPromise;this._unsubPromise=void 0,this._subEntity=void 0,t&&t.then(e=>e()).catch(()=>{})}_visibleForecast(t){if(this._config?.show_forecast===!1)return null;let e=this._forecast;if(e===null&&this._subFailed&&(e=t.attributes.forecast),!Array.isArray(e))return null;let i=e.filter(n=>n&&typeof n.datetime=="string").slice(0,Os);return i.length>0?i:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatTemp(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision,i=e!==void 0?{minimumFractionDigits:e,maximumFractionDigits:e}:{maximumFractionDigits:1};return new Intl.NumberFormat(this._locale(),i).format(t)}_hourLabel(t){let e=new Date(t);return Number.isNaN(e.getTime())?"\u2014":new Intl.DateTimeFormat(this._locale(),{hour:"numeric"}).format(e)}_conditionText(t,e){return t.formatEntityState?N(t,e):Kc[e.state]??e.state.replace(/_/g," ")}_onCardClick(){this._config&&C(this,this._config.entity)}_renderHour(t){let e=Number(t.temperature),i=Ms[t.condition??""]??Ps;return l`
      <div class="cell">
        <span class="hour">${this._hourLabel(t.datetime)}</span>
        <ha-icon .icon=${i}></ha-icon>
        <span class="t">${Number.isFinite(e)?`${Math.round(e)}\xB0`:"\u2014"}</span>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=Number(i.attributes.temperature),d=Number(i.attributes.humidity),u=Ms[i.state]??Ps,f=this._visibleForecast(i);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${n?"":"on"}">
            <ha-icon .icon=${u}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">
              ${this._conditionText(e,i)}${Number.isFinite(d)?l`<span class="sep">·</span>${Math.round(d)}%`:p}
            </div>
          </div>
          <div class="trailing">
            <span class="temp">${Number.isFinite(c)?`${this._formatTemp(c)}\xB0`:"\u2014"}</span>
          </div>
        </div>
        ${f?l`<div class="hours">${f.map(g=>this._renderHour(g))}</div>`:p}
      </ha-card>
    `}};xt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 12px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .temp {
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .hours {
        display: grid;
        grid-template-columns: repeat(${Os}, minmax(0, 1fr));
        gap: 4px;
        position: relative;
        z-index: 1;
        animation: silk-rise-in 250ms var(--silk-ease-out);
      }
      @keyframes silk-rise-in {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
      }
      .cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        min-width: 0;
      }
      .hour {
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .cell ha-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }
      .t {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .unavailable .hours {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],xt.prototype,"hass",2),m([h()],xt.prototype,"_config",2),m([h()],xt.prototype,"_forecast",2),m([h()],xt.prototype,"_subFailed",2),xt=m([x("silk-weather-card")],xt);var Ls={type:"silk-person-card",name:"Silk Person",description:"Who's home, at a glance."},Xc=20,Ns="silk-person-card-editor";E(Ns,[{name:"entity",required:!0,selector:{entity:{domain:["person","device_tracker"]}}},{name:"name",selector:{text:{}}},{name:"battery",selector:{entity:{domain:["sensor"],device_class:"battery"}}}],{entity:"Entity",name:"Name",battery:"Battery sensor"});var Dt=class extends y{static getStubConfig(s){let t=Object.keys(s.states);return{type:"custom:silk-person-card",entity:t.find(i=>i.startsWith("person."))??t.find(i=>i.startsWith("device_tracker."))}}static async getConfigElement(){return document.createElement(Ns)}setConfig(s){let t=s.entity?O(s.entity):"";if(!s.entity||t!=="person"&&t!=="device_tracker")throw new Error("silk-person-card: define a person or device_tracker `entity` (e.g. person.jamie)");this._config=s,this._brokenPicture=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}_presence(s,t){if(s.formatEntityState)return N(s,t);switch(t.state){case"home":return"Home";case"not_home":return"Away";default:return t.state.replace(/_/g," ")}}_battery(){let s=this._config?.battery,t=this.hass;if(!s||!t)return null;let e=t.states[s];if(!e||_(e))return null;let i=Number(e.state);return Number.isFinite(i)?{text:`${D(t,s,i)}%`,low:i<Xc}:null}_onCardClick(){this._config&&C(this,this._config.entity)}_onImgError(){let t=(this._config&&this.hass?.states[this._config.entity])?.attributes.entity_picture;typeof t=="string"&&(this._brokenPicture=t)}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=t.states[s.entity];if(!e)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${s.entity}</div>
        </ha-card>
      `;let i=_(e),n=!i&&R(e),r=S(e),o=s.name??e.attributes.friendly_name??s.entity,c=e.attributes.entity_picture,d=typeof c=="string"&&c&&c!==this._brokenPicture?c:void 0,u=(Array.from(o.trim())[0]??"?").toUpperCase(),f=this._battery();return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="avatar ${n?"home":"away"}">
          ${d?l`<img src=${d} alt=${o} loading="lazy" @error=${this._onImgError} />`:l`<span class="initial">${u}</span>`}
        </div>
        <div class="info">
          <div class="name">${o}</div>
          <div class="state">
            ${this._presence(t,e)}${f?l`<span class="sep">·</span><span class="battery ${f.low?"low":""}"
                  >${f.text}</span
                >`:p}
          </div>
        </div>
      </ha-card>
    `}};Dt.styles=[k,w`
      .avatar {
        flex: none;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        position: relative;
        z-index: 1;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        color: var(--secondary-text-color);
        user-select: none;
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .avatar.home {
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
        color: var(--silk-accent);
      }
      .initial {
        font-size: 18px;
        font-weight: 600;
        line-height: 1;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: opacity 200ms ease;
      }
      /* Away reads as absence: the portrait goes monochrome, no color needed. */
      .avatar.away img {
        filter: grayscale(1);
        opacity: 0.7;
      }
      .unavailable .avatar {
        opacity: 0.45;
      }
      .battery.low {
        color: var(--error-color, #db4437);
      }
    `],m([b({attribute:!1})],Dt.prototype,"hass",2),m([h()],Dt.prototype,"_config",2),m([h()],Dt.prototype,"_brokenPicture",2),Dt=m([x("silk-person-card")],Dt);var Fs={type:"silk-lock-card",name:"Silk Lock",description:"Hold to unlock \u2014 no accidental taps."},Ds="silk-lock-card-editor";E(Ds,[{name:"entity",required:!0,selector:{entity:{domain:["lock"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"hold_time",selector:{number:{min:300,max:5e3,step:100,mode:"box"}}},{name:"instant",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",hold_time:"Hold time (ms)",instant:"Instant unlock (tap, no hold)"},{hold_time:1200});var Qc=1200,Zc=200,Jc=2e3,Ue=52,ti=Ue/2,Is=24,Hi=100,pt=class extends y{constructor(){super(...arguments);this._optimistic=null;this._holdProgress=0;this._holding=!1;this._optimisticBase="";this._holdStart=0;this._completedAt=0;this._holdTick=()=>{if(!this._holding)return;let t=(performance.now()-this._holdStart)/this._holdMs();if(t>=1){this._holding=!1,this._holdProgress=0,this._completedAt=Date.now(),this._callLock("unlock");return}this._holdProgress=t,this._holdRaf=requestAnimationFrame(this._holdTick)}}static getStubConfig(t){return{type:"custom:silk-lock-card",entity:Object.keys(t.states).find(i=>i.startsWith("lock."))}}static async getConfigElement(){return document.createElement(Ds)}setConfig(t){if(!t.entity)throw new Error("silk-lock-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holding=!1,this._holdProgress=0}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_holdMs(){let t=Number(this._config?.hold_time);return Number.isFinite(t)&&t>0?Math.max(Zc,t):Qc}_displayState(){let t=this.hass?.states[this._config?.entity??""];if(t)return this._optimistic??t.state}_callLock(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];n&&(i.callService("lock",t,{entity_id:e.entity}),T(this,"success"),this._optimistic=t==="lock"?"locking":"unlocking",this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Jc))}_onTap(t){if(t.stopPropagation(),Date.now()-this._completedAt<400)return;let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=this._displayState()==="locked"?"unlock":"lock";r==="unlock"&&!e.instant||this._callLock(r)}_onHoldStart(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!(!n||_(n))&&!(this._displayState()!=="locked"||e.instant)){try{t.currentTarget.setPointerCapture(t.pointerId)}catch{}this._holding=!0,this._holdStart=performance.now(),this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holdRaf=requestAnimationFrame(this._holdTick)}}_onHoldEnd(t){t.stopPropagation(),this._holding&&(this._holding=!1,this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holdRaf=void 0,this._holdProgress=0)}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=this._optimistic===null?i:{...i,state:this._optimistic},o=R(r),c=i.state==="jammed"?"var(--error-color, #db4437)":S(r,t.color),d=t.name??i.attributes.friendly_name??t.entity,u=r.state==="locked"?"unlock":"lock",f=u==="unlock"&&!t.instant&&!n,g=u==="lock"?"mdi:lock":"mdi:lock-open-variant-outline",v=u==="lock"?`Lock ${d}`:f?`Hold to unlock ${d}`:`Unlock ${d}`,$=(Hi*(1-this._holdProgress)).toFixed(2);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${o?"on":""}"
          .disabled=${n}
          aria-label=${v}
          @click=${this._onTap}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${r}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${d}</div>
          <div class="state">${N(e,r)}</div>
        </div>
        <div class="trailing">
          <button
            class="action ${this._holding?"holding":""}"
            .disabled=${n}
            aria-label=${v}
            @click=${this._onTap}
            @pointerdown=${this._onHoldStart}
            @pointerup=${this._onHoldEnd}
            @pointercancel=${this._onHoldEnd}
            @contextmenu=${A=>A.preventDefault()}
          >
            ${f?l`
                  <svg
                    class="ring"
                    viewBox="0 0 ${Ue} ${Ue}"
                    aria-hidden="true"
                  >
                    <circle class="ring-track" cx=${ti} cy=${ti} r=${Is}></circle>
                    <circle
                      class="ring-fill"
                      cx=${ti}
                      cy=${ti}
                      r=${Is}
                      pathLength=${Hi}
                      stroke-dasharray=${Hi}
                      style="stroke-dashoffset:${$};opacity:${this._holdProgress>0?1:0}"
                    ></circle>
                  </svg>
                `:p}
            <ha-icon .icon=${g}></ha-icon>
          </button>
        </div>
      </ha-card>
    `}};pt.styles=[k,w`
      .icon:disabled {
        cursor: default;
      }
      .action {
        flex: none;
        position: relative;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      .action:active {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .action:disabled {
        cursor: default;
      }
      .action:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 4px;
      }
      .action ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .ring {
        position: absolute;
        inset: -5px;
        width: ${Ue}px;
        height: ${Ue}px;
        pointer-events: none;
        overflow: visible;
      }
      .ring-track {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        stroke-width: 2.5;
      }
      .ring-fill {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 2.5;
        stroke-linecap: round;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        transition:
          stroke-dashoffset 150ms ease,
          opacity 150ms ease;
      }
      /* While the rAF loop drives the fill, CSS must not fight it. */
      .action.holding .ring-fill {
        transition: opacity 150ms ease;
      }
    `],m([b({attribute:!1})],pt.prototype,"hass",2),m([h()],pt.prototype,"_config",2),m([h()],pt.prototype,"_optimistic",2),m([h()],pt.prototype,"_holdProgress",2),m([h()],pt.prototype,"_holding",2),pt=m([x("silk-lock-card")],pt);var Us={type:"silk-alarm-card",name:"Silk Alarm",description:"Arm modes and a real keypad."},zs="silk-alarm-card-editor";E(zs,[{name:"entity",required:!0,selector:{entity:{domain:["alarm_control_panel"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function tl(a){return a==="disarmed"?"var(--success-color, #43a047)":a==="triggered"?"var(--error-color, #db4437)":a==="arming"||a==="pending"?"var(--warning-color, #ffa600)":a.startsWith("armed_")?"#ef6c6c":"var(--primary-color, #4aa8ff)"}var el=1,il=2,nl=4,Li=[{key:"disarm",label:"Disarm",service:"alarm_disarm",activeState:"disarmed"},{key:"home",label:"Home",service:"alarm_arm_home",activeState:"armed_home",feature:el},{key:"away",label:"Away",service:"alarm_arm_away",activeState:"armed_away",feature:il},{key:"night",label:"Night",service:"alarm_arm_night",activeState:"armed_night",feature:nl}],sl=[{k:"1",label:"1"},{k:"2",label:"2"},{k:"3",label:"3"},{k:"4",label:"4"},{k:"5",label:"5"},{k:"6",label:"6"},{k:"7",label:"7"},{k:"8",label:"8"},{k:"9",label:"9"},{k:"clear",label:"Clear",icon:"mdi:close-circle-outline"},{k:"0",label:"0"},{k:"back",label:"Backspace",icon:"mdi:backspace-outline"}],rl=16,ol=2e3,ut=class extends y{constructor(){super(...arguments);this._pendingMode=null;this._code="";this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-alarm-card",entity:Object.keys(t.states).find(i=>i.startsWith("alarm_control_panel."))}}static async getConfigElement(){return document.createElement(zs)}setConfig(t){if(!t.entity)throw new Error("silk-alarm-card: `entity` is required");this._config=t,this._pendingMode=null,this._code="",this._clearOptimistic()}getCardSize(){return this._pendingMode!==null?4:2}getGridOptions(){return{columns:6,rows:this._pendingMode!==null?4:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_needsCode(t,e){return!(!t.attributes.code_format||e.key!=="disarm"&&t.attributes.code_arm_required===!1)}_send(t,e){let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];if(!r)return;let o={entity_id:i.entity};e&&(o.code=e),n.callService("alarm_control_panel",t.service,o),this._optimistic=t.key==="disarm"?"disarmed":"arming",this._optimisticBase=r.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),ol),this._pendingMode=null,this._code=""}_onCardClick(){this._config&&C(this,this._config.entity)}_swallow(t){t.stopPropagation()}_onModeTap(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=t.currentTarget.dataset.mode,o=Li.find(c=>c.key===r);o&&(this._needsCode(n,o)?(T(this,"selection"),this._pendingMode===o.key?(this._pendingMode=null,this._code=""):(this._pendingMode=o.key,this._code="")):(T(this,"success"),this._send(o)))}_onKeyTap(t){t.stopPropagation();let e=t.currentTarget.dataset.key;e&&(T(this,"selection"),e==="clear"?this._code="":e==="back"?this._code=this._code.slice(0,-1):this._code.length<rl&&(this._code=this._code+e))}_onEnter(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i||!this._code)return;let n=i.states[e.entity];if(!n||_(n))return;let r=Li.find(o=>o.key===this._pendingMode);r&&(T(this,"success"),this._send(r,this._code))}_renderKeypad(){let t=this._code.length>0;return l`
      <div class="keypad" @click=${this._swallow}>
        <div class="code-row">
          <div class="dots" aria-label=${t?`${this._code.length} digits entered`:"No code entered"}>
            ${t?Array.from(this._code,()=>l`<span class="dot"></span>`):l`<span class="hint">Enter code</span>`}
          </div>
          <button
            class="chip enter ${t?"active":""}"
            .disabled=${!t}
            @click=${this._onEnter}
          >
            Enter
          </button>
        </div>
        <div class="keys">
          ${sl.map(e=>l`
              <button
                class="key ${e.icon?"aux":""}"
                data-key=${e.k}
                aria-label=${e.label}
                @click=${this._onKeyTap}
              >
                ${e.icon?l`<ha-icon .icon=${e.icon}></ha-icon>`:e.label}
              </button>
            `)}
        </div>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=this._optimistic===null?i:{...i,state:this._optimistic},o=r.state,c=R(r),d=tl(o),u=o==="triggered",f=t.name??i.attributes.friendly_name??t.entity,g=Li.filter(v=>v.feature===void 0||L(i,v.feature));return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${d}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${c?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${r}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${f}</div>
            <div class="state ${u?"alert":""}">
              ${N(e,r)}
            </div>
          </div>
        </div>
        <div class="modes">
          ${g.map(v=>{let $=o===v.activeState,A=this._pendingMode===v.key;return l`
              <button
                class="chip ${$?"active":""} ${A?"pending":""}"
                data-mode=${v.key}
                .disabled=${n}
                aria-pressed=${$?"true":"false"}
                @click=${this._onModeTap}
              >
                ${v.label}
              </button>
            `})}
        </div>
        ${this._pendingMode!==null?this._renderKeypad():p}
      </ha-card>
    `}};ut.styles=[k,w`
      /* Two stacked rows (+ keypad); grow past the grid allotment rather than
         clip the keypad — sections give 4 rows, masonry sizes naturally. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 10px;
        height: auto;
        min-height: 100%;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .state.alert {
        font-weight: 600;
        color: var(--error-color, #db4437);
      }
      .modes {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        position: relative;
        z-index: 1;
      }
      .unavailable .modes {
        opacity: 0.45;
      }
      .chip:disabled {
        cursor: default;
      }
      /* Awaiting a code: a lighter accent tint than .active, so the target
         mode reads distinct from the currently armed one. */
      .chip.pending {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 10%, transparent);
      }
      .keypad {
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        z-index: 1;
        animation: silk-reveal 200ms var(--silk-ease-out);
      }
      @keyframes silk-reveal {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
      .code-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px;
        padding: 0 2px;
      }
      .dots {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 5px;
        overflow: hidden;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--primary-text-color);
        opacity: 0.75;
      }
      .hint {
        font-size: 11.5px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.enter:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .keys {
        display: grid;
        grid-template-columns: repeat(3, 44px);
        gap: 6px;
        justify-content: center;
      }
      .key {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 12px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        font: inherit;
        font-size: 16px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .key:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .key:active {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .key.aux {
        color: var(--secondary-text-color);
      }
      .key ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
    `],m([b({attribute:!1})],ut.prototype,"hass",2),m([h()],ut.prototype,"_config",2),m([h()],ut.prototype,"_pendingMode",2),m([h()],ut.prototype,"_code",2),m([h()],ut.prototype,"_optimistic",2),ut=m([x("silk-alarm-card")],ut);var js={type:"silk-vacuum-card",name:"Silk Vacuum",description:"Start, dock, locate \u2014 with battery in sight."},ei=4,al=16,cl=32,ll=512,ii=8192,dl=2e3,ml=3,qs="silk-vacuum-card-editor";E(qs,[{name:"entity",required:!0,selector:{entity:{domain:["vacuum"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var wt=class extends y{constructor(){super(...arguments);this._optimisticState=null;this._optimisticFan=null}static getStubConfig(t){return{type:"custom:silk-vacuum-card",entity:Object.keys(t.states).find(i=>i.startsWith("vacuum."))}}static async getConfigElement(){return document.createElement(qs)}setConfig(t){if(!t.entity||O(t.entity)!=="vacuum")throw new Error("silk-vacuum-card: define a vacuum `entity` (e.g. vacuum.roborock)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticState=null,this._optimisticFan=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticState=null,this._optimisticFan=null},dl)}_onCardClick(){this._config&&C(this,this._config.entity)}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];e!==void 0&&!_(e)&&(L(e,ii)||L(e,ei))?this._startPause():C(this,this._config.entity)}_onStartPauseClick(t){t.stopPropagation(),this._startPause()}_startPause(){if(!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||_(t))return;let e=(this._optimisticState??t.state)==="cleaning";L(t,e?ei:ii)&&(T(this),this._optimisticState=e?"paused":"cleaning",this._armExpiry(),this.hass.callService("vacuum",e?"pause":"start",{entity_id:this._config.entity}))}_onReturnHome(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];!e||_(e)||(T(this),this._optimisticState="returning",this._armExpiry(),this.hass.callService("vacuum","return_to_base",{entity_id:this._config.entity}))}_onLocate(t){t.stopPropagation(),!(!this.hass||!this._config)&&(_(this.hass.states[this._config.entity])||(T(this),this.hass.callService("vacuum","locate",{entity_id:this._config.entity})))}_onFanSpeed(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(_(this.hass.states[this._config.entity])||(T(this),this._optimisticFan=e,this._armExpiry(),this.hass.callService("vacuum","set_fan_speed",{entity_id:this._config.entity,fan_speed:e})))}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=_(t),i=this._optimisticState===null||e?t:{...t,state:this._optimisticState},n=R(i),r=S(i,this._config.color),o=this._config.name??t.attributes.friendly_name??t.entity_id,c=t.attributes.battery_level,d=typeof c=="number"&&Number.isFinite(c),u=i.state==="cleaning",f=L(t,ii)||L(t,ei),g=!L(t,u?ei:ii);return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${n?"on":""}"
          .disabled=${e}
          aria-label=${f?u?`Pause ${o}`:`Start ${o}`:`Show details for ${o}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${o}</div>
          <div class="state">
            ${N(this.hass,i)}${d?l`<span class="sep">·</span>${Math.round(c)}%`:p}
          </div>
        </div>
        <div class="trailing">
          ${this._renderChips(t,e)}
          ${f?l`
                <button
                  class="ctl"
                  ?disabled=${e||g}
                  aria-label=${u?`Pause ${o}`:`Start ${o}`}
                  @click=${this._onStartPauseClick}
                >
                  <ha-icon icon=${u?"mdi:pause":"mdi:play"}></ha-icon>
                </button>
              `:p}
          ${L(t,al)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Return ${o} to dock`}
                  @click=${this._onReturnHome}
                >
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>
              `:p}
          ${L(t,ll)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Locate ${o}`}
                  @click=${this._onLocate}
                >
                  <ha-icon icon="mdi:map-marker"></ha-icon>
                </button>
              `:p}
        </div>
      </ha-card>
    `}_renderChips(t,e){if(!L(t,cl))return p;let i=t.attributes.fan_speed_list;if(!Array.isArray(i))return p;let n=i.filter(o=>typeof o=="string"&&o!=="").slice(0,ml);if(n.length===0)return p;let r=this._optimisticFan??(typeof t.attributes.fan_speed=="string"?t.attributes.fan_speed:void 0);return l`
      <div class="chips">
        ${n.map(o=>l`
            <button
              class="chip ${o===r?"active":""}"
              ?disabled=${e}
              aria-label=${`Set fan speed to ${o}`}
              aria-pressed=${o===r?"true":"false"}
              @click=${c=>this._onFanSpeed(c,o)}
            >
              ${o.replace(/_/g," ")}
            </button>
          `)}
      </div>
    `}};wt.styles=[k,w`
      /* The chips are progressive disclosure: they yield to the name on narrow cards. */
      :host {
        container-type: inline-size;
      }
      @container (max-width: 439px) {
        .chips {
          display: none;
        }
      }
      /* Fallback when container queries are unavailable: the name keeps a
         readable minimum, the trailing block may shrink, and inside it the
         chips collapse long before any button clips. */
      .info {
        flex: 1 1 auto;
        min-width: 88px;
      }
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
      }
      .chips {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-right: 2px;
        min-width: 0;
        overflow: hidden;
        flex: 0 100000 auto;
      }
      .chip {
        text-transform: capitalize;
        white-space: nowrap;
      }
      .chip:disabled {
        cursor: default;
      }
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
    `],m([b({attribute:!1})],wt.prototype,"hass",2),m([h()],wt.prototype,"_config",2),m([h()],wt.prototype,"_optimisticState",2),m([h()],wt.prototype,"_optimisticFan",2),wt=m([x("silk-vacuum-card")],wt);var Vs={type:"silk-camera-card",name:"Silk Camera",description:"A live view that stays fresh."},Gs=10,Bs="silk-camera-card-editor";E(Bs,[{name:"entity",required:!0,selector:{entity:{domain:["camera"]}}},{name:"name",selector:{text:{}}},{name:"refresh_interval",selector:{number:{min:1,mode:"box"}}}],{entity:"Entity",name:"Name",refresh_interval:"Refresh interval (seconds)"},{refresh_interval:Gs});var kt=class extends y{constructor(){super(...arguments);this._counter=0;this._broken=!1;this._onVisibility=()=>{document.hidden?this._stopTimer():(this._bump(),this._startTimer())}}static getStubConfig(t){return{type:"custom:silk-camera-card",entity:Object.keys(t.states).find(i=>i.startsWith("camera."))}}static async getConfigElement(){return document.createElement(Bs)}setConfig(t){if(!t.entity||O(t.entity)!=="camera")throw new Error("silk-camera-card: define a camera `entity` (e.g. camera.front_door)");if(t.refresh_interval!==void 0&&(typeof t.refresh_interval!="number"||!(t.refresh_interval>0)))throw new Error("silk-camera-card: `refresh_interval` must be a positive number of seconds");this._config=t,this.isConnected&&this._startTimer()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startTimer()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopTimer()}_intervalMs(){return Math.max(1,this._config?.refresh_interval??Gs)*1e3}_bump(){this._counter++,this._broken=!1}_startTimer(){this._stopTimer(),!document.hidden&&(this._timer=window.setInterval(()=>this._bump(),this._intervalMs()))}_stopTimer(){window.clearInterval(this._timer),this._timer=void 0}_onCardClick(){this._config&&C(this,this._config.entity)}_onImgError(){this._broken=!0}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=_(t),i=t.attributes.entity_picture,n=!e&&typeof i=="string"&&i!==""?i:void 0,r=this._config.name??t.attributes.friendly_name??t.entity_id,o=S(t),c=n!==void 0?`${n}${n.includes("?")?"&":"?"}counter=${this._counter}`:void 0,d=c!==void 0&&!this._broken;return l`
      <ha-card
        class=${e?"unavailable":""}
        style="--silk-accent:${o}"
        aria-label=${`Show ${r} live view`}
        @click=${this._onCardClick}
      >
        ${d?l`
              <img class="feed" src=${c} alt=${r} @error=${this._onImgError} />
              <div class="scrim">
                <div class="cam-name">${r}</div>
                <div class="cam-state">${N(this.hass,t)}</div>
              </div>
            `:l`
              <div class="fallback">
                <ha-icon icon="mdi:video-off"></ha-icon>
                <div class="fallback-name">${r}</div>
                <div class="fallback-state">Unavailable</div>
              </div>
            `}
      </ha-card>
    `}};kt.styles=[k,w`
      /* Full-bleed image card: drop the base row layout and padding. The
         aspect-ratio only applies where the layout gives no definite height
         (masonry); in grid sections the assigned rows win. */
      ha-card {
        display: block;
        padding: 0;
        aspect-ratio: 16 / 9;
      }
      .feed {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 28px 12px 10px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
        pointer-events: none;
      }
      .cam-name {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cam-state {
        color: rgba(255, 255, 255, 0.78);
        font-size: 11.5px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 12px;
        box-sizing: border-box;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        color: var(--secondary-text-color);
        transition: opacity 200ms ease;
      }
      .fallback ha-icon {
        --mdc-icon-size: 28px;
        margin-bottom: 4px;
      }
      .fallback-name {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fallback-state {
        font-size: 11.5px;
        line-height: 1.3;
      }
      .unavailable .fallback {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],kt.prototype,"hass",2),m([h()],kt.prototype,"_config",2),m([h()],kt.prototype,"_counter",2),m([h()],kt.prototype,"_broken",2),kt=m([x("silk-camera-card")],kt);var Ws={type:"silk-timer-card",name:"Silk Timer",description:"A countdown you can see moving."},Ys="silk-timer-card-editor",pl=2e3,ul=1e3;E(Ys,[{name:"entity",required:!0,selector:{entity:{domain:["timer"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function Ni(a){if(typeof a!="string")return 0;let s=a.match(/^(?:(\d+)\s+days?,\s*)?(\d+):(\d{1,2}):(\d{1,2})/);return s?Number(s[1]??0)*86400+Number(s[2])*3600+Number(s[3])*60+Number(s[4]):0}function Ii(a){let s=Math.max(0,Math.ceil(a)),t=Math.floor(s/3600),e=Math.floor(s%3600/60),i=n=>String(n).padStart(2,"0");return t>0?`${t}:${i(e)}:${i(s%60)}`:`${e}:${i(s%60)}`}var $t=class extends y{constructor(){super(...arguments);this._now=Date.now();this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-timer-card",entity:Object.keys(t.states).find(i=>i.startsWith("timer."))}}static async getConfigElement(){return document.createElement(Ys)}setConfig(t){if(!t.entity)throw new Error("silk-timer-card: `entity` is required");if(O(t.entity)!=="timer")throw new Error(`silk-timer-card: entity must be a timer, got \`${O(t.entity)}\``);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._now=Date.now()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tick),this._tick=void 0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(t.has("hass")&&(this._now=Date.now(),this._optimistic!==null&&this._config)){let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}}updated(){let t=this._config?this.hass?.states[this._config.entity]:void 0,e=this.isConnected&&!!t&&!_(t)&&this._displayState(t)==="active";e&&this._tick===void 0?this._tick=window.setInterval(()=>{this._now=Date.now()},ul):!e&&this._tick!==void 0&&(window.clearInterval(this._tick),this._tick=void 0)}_displayState(t){if(this._optimistic)return this._optimistic.state;let e=t.state;return e==="active"||e==="paused"?e:"idle"}_remainingSeconds(t,e,i){if(e==="active"){let n=this._optimistic?.finishesAt??Date.parse(t.attributes.finishes_at??"");return Number.isFinite(n)?Math.max(0,(n-this._now)/1e3):0}return e==="paused"?this._optimistic?.remainingS??Ni(t.attributes.remaining):i}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_setOptimistic(t,e){this._optimistic=e,this._optimisticBase=t.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),pl)}_service(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;T(this);let r=this._displayState(n),o=Ni(n.attributes.duration);if(t==="start"){let c=r==="paused"?this._remainingSeconds(n,r,o):o;this._setOptimistic(n,{state:"active",finishesAt:Date.now()+c*1e3})}else t==="pause"?this._setOptimistic(n,{state:"paused",remainingS:this._remainingSeconds(n,r,o)}):this._setOptimistic(n,{state:"idle"});i.callService("timer",t,{entity_id:e.entity})}_onStart(t){t.stopPropagation(),this._service("start")}_onPause(t){t.stopPropagation(),this._service("pause")}_onCancel(t){t.stopPropagation(),this._service("cancel")}_onPrimary(t){t.stopPropagation();let e=this._config?this.hass?.states[this._config.entity]:void 0;!e||_(e)||this._service(this._displayState(e)==="active"?"pause":"start")}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=this._displayState(i),o=r==="active",c=Ni(i.attributes.duration),d=this._remainingSeconds(i,r,c),u=r==="idle"||c<=0?0:P(1-d/c,0,1),f=S(i,t.color),g=t.name??i.attributes.friendly_name??t.entity,v=n?l`${N(e,i)}`:o?l`${Ii(d)} left`:r==="paused"?l`Paused<span class="sep">·</span>${Ii(d)}`:c>0?l`Idle<span class="sep">·</span>${Ii(c)}`:l`Idle`,$=n||r==="idle"?l`
            <button
              class="btn primary"
              .disabled=${n}
              aria-label=${`Start ${g}`}
              @click=${this._onStart}
            >
              <ha-icon .icon=${"mdi:play"}></ha-icon>
            </button>
          `:l`
            <button
              class="btn primary"
              aria-label=${o?`Pause ${g}`:`Resume ${g}`}
              @click=${o?this._onPause:this._onStart}
            >
              <ha-icon .icon=${o?"mdi:pause":"mdi:play"}></ha-icon>
            </button>
            <button class="btn" aria-label=${`Cancel ${g}`} @click=${this._onCancel}>
              <ha-icon .icon=${"mdi:close"}></ha-icon>
            </button>
          `;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${f}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${o?"on":""}"
          .disabled=${n}
          aria-label=${o?`Pause ${g}`:`Start ${g}`}
          @click=${this._onPrimary}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${g}</div>
          <div class="state">${v}</div>
        </div>
        <div class="trailing">${$}</div>
        <div class="track ${n||r==="idle"?"hidden":""}" aria-hidden="true">
          <div
            class="bar ${r==="idle"?"snap":""}"
            style="width:${(u*100).toFixed(2)}%"
          ></div>
        </div>
      </ha-card>
    `}};$t.styles=[k,w`
      .btn {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .btn:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .btn:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .btn.primary {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .btn ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .btn:disabled,
      .icon:disabled {
        cursor: default;
      }
      .btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      /* Elapsed-time bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 0;
        opacity: 1;
        transition: opacity 200ms ease;
      }
      .track.hidden {
        opacity: 0;
      }
      /* 1s linear matches the tick cadence, so the fill glides continuously. */
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 1000ms linear,
          background 200ms ease;
      }
      .bar.snap {
        transition: background 200ms ease;
      }
    `],m([b({attribute:!1})],$t.prototype,"hass",2),m([h()],$t.prototype,"_config",2),m([h()],$t.prototype,"_now",2),m([h()],$t.prototype,"_optimistic",2),$t=m([x("silk-timer-card")],$t);var Xs={type:"silk-progress-card",name:"Silk Progress",description:"Any percentage, with an honest ETA."},Qs="silk-progress-card-editor";E(Qs,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"remaining",selector:{entity:{domain:["sensor"]}}}],{entity:"Entity",name:"Name",icon:"Icon",remaining:"Time-remaining entity"});var hl=new Set(["h","hr","hrs","hour","hours"]),fl=new Set(["min","mins","minute","minutes"]),gl=new Set(["s","sec","secs","second","seconds"]);function Ks(a){let s=Math.max(0,a),t=Math.floor(s/60),e=s%60;return t>0?`${t}h ${e}m left`:`${e}m left`}function _l(a,s){let t=s.trim().toLowerCase();if(hl.has(t))return Ks(Math.round(a*60));if(fl.has(t))return Ks(Math.round(a));if(gl.has(t)){let i=Math.max(0,Math.round(a));return`${Math.floor(i/60)}:${String(i%60).padStart(2,"0")} left`}let e=Math.round(a*10)/10;return s?`${e} ${s} left`:`${e} left`}var le=class extends y{static getStubConfig(s){return{type:"custom:silk-progress-card",entity:Object.keys(s.states).find(e=>{if(!e.startsWith("sensor."))return!1;let i=s.states[e];return i.attributes.unit_of_measurement==="%"&&i.attributes.device_class!=="battery"&&Number.isFinite(Number(i.state))})}}static async getConfigElement(){return document.createElement(Qs)}setConfig(s){if(!s.entity)throw new Error("silk-progress-card: `entity` is required");this._config=s}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}_remainingText(){let s=this._config?.remaining;if(!s||!this.hass)return;let t=this.hass.states[s];if(!t||_(t))return;let e=Number(t.state);if(!(t.state===""||!Number.isFinite(e)))return _l(e,String(t.attributes.unit_of_measurement??""))}_onTap(){this._config&&(T(this),C(this,this._config.entity))}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=t.states[s.entity];if(!e)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${s.entity}</div>
        </ha-card>
      `;let i=_(e),n=Number(e.state),r=!i&&e.state!==""&&Number.isFinite(n),o=r?P(n,0,100):0,c=r&&n>=100,d=c?"var(--success-color, #43a047)":S(e,s.color),u=s.name??e.attributes.friendly_name??s.entity,f=!i&&!c?this._remainingText():void 0,g=i?l`${N(t,e)}`:r?c?l`Done`:f?l`In progress<span class="sep">·</span>${f}`:l`In progress`:l`—`;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${d}"
        @click=${this._onTap}
      >
        <div class="icon ${!i&&R(e)?"on":""}">
          ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${u}</div>
          <div class="state">${g}</div>
        </div>
        <div class="trailing">
          <span class="value">${r?`${Math.round(o)}%`:"\u2014"}</span>
        </div>
        <div class="track" aria-hidden="true">
          <div class="bar" style="width:${o.toFixed(2)}%"></div>
        </div>
      </ha-card>
    `}};le.styles=[k,w`
      /* Display card: the whole card presses as one and opens more-info. */
      ha-card {
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* No lone control action, so the icon presses with the card, not alone. */
      .icon:active {
        transform: none;
      }
      /* Progress bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 0;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .unavailable .track {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],le.prototype,"hass",2),m([h()],le.prototype,"_config",2),le=m([x("silk-progress-card")],le);var Zs={type:"silk-update-card",name:"Silk Updates",description:"Every pending update in one place."},Js="silk-update-card-editor";E(Js,[{name:"name",selector:{text:{}}},{name:"entities",selector:{entity:{multiple:!0,domain:["update"]}}},{name:"show_up_to_date",selector:{boolean:{}}}],{name:"Name",entities:"Entities (empty = every update)",show_up_to_date:"Show up-to-date items"},{show_up_to_date:!1});var vl=2e3;function Fi(a){return a.attributes.title??a.attributes.friendly_name??a.entity_id}var Ut=class extends y{constructor(){super(...arguments);this._installing={};this._installingTimers={}}static getStubConfig(){return{type:"custom:silk-update-card"}}static async getConfigElement(){return document.createElement(Js)}setConfig(t){if(t.entities!==void 0&&!Array.isArray(t.entities))throw new Error("silk-update-card: `entities` must be a list of update entity ids");this._config=t,this._clearAllInstalling()}getCardSize(){return!this.hass||!this._config?3:(this._visible().length||1)+1}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._installingTimers))window.clearTimeout(this._installingTimers[t]);this._installingTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._installing)){let i=this.hass.states[e];i&&i.last_updated!==this._installing[e]&&this._clearInstalling(e)}}_clearInstalling(t){if(window.clearTimeout(this._installingTimers[t]),delete this._installingTimers[t],t in this._installing){let e={...this._installing};delete e[t],this._installing=e}}_clearAllInstalling(){for(let t of Object.keys(this._installingTimers))window.clearTimeout(this._installingTimers[t]);this._installingTimers={},this._installing={}}_tracked(){let t=this.hass,e=this._config?.entities,i=e??Object.keys(t.states).filter(r=>r.startsWith("update.")),n=[];for(let r of i){let o=t.states[r];o&&n.push(o)}return e||n.sort((r,o)=>Fi(r).localeCompare(Fi(o))),n.sort((r,o)=>+(o.state==="on")-+(r.state==="on")),n}_visible(){let t=this._tracked();return this._config?.show_up_to_date?t:t.filter(e=>e.state==="on")}_onRowClick(t){C(this,t)}_onRowKeydown(t,e){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),C(this,e))}_onInstall(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let n=i.states[e];!n||_(n)||n.attributes.in_progress||(T(this),this._installing={...this._installing,[e]:n.last_updated},window.clearTimeout(this._installingTimers[e]),this._installingTimers[e]=window.setTimeout(()=>this._clearInstalling(e),vl),i.callService("update","install",{entity_id:e}))}_renderTrailing(t,e){let i=_(t);return!i&&(!!t.attributes.in_progress||t.entity_id in this._installing)?l`
        <button class="btn installing" disabled aria-label=${`Installing ${e}`}>
          <ha-icon icon="mdi:loading"></ha-icon>
        </button>
      `:t.state==="on"?l`
        <button
          class="btn"
          .disabled=${i}
          aria-label=${`Install ${e}`}
          @click=${r=>this._onInstall(r,t.entity_id)}
        >
          <ha-icon icon="mdi:download"></ha-icon>
        </button>
      `:l`
      <span class="ok" title="Up to date"><ha-icon icon="mdi:check"></ha-icon></span>
    `}_renderRow(t){let e=_(t),i=t.state==="on",n=Fi(t),r=t.attributes.installed_version,o=t.attributes.latest_version,c=i?`${r??"\u2014"} \u2192 ${o??"\u2014"}`:r??o??"",d=t.attributes.entity_picture;return l`
      <div
        class="row ${e?"unavailable":""}"
        role="button"
        tabindex="0"
        @click=${()=>this._onRowClick(t.entity_id)}
        @keydown=${u=>this._onRowKeydown(u,t.entity_id)}
      >
        ${d?l`<img class="pic" src=${d} alt="" />`:l`
              <div class="pic fallback"><ha-icon icon="mdi:package-up"></ha-icon></div>
            `}
        <div class="info">
          <div class="name">${n}</div>
          ${c?l`<div class="state">${c}</div>`:p}
        </div>
        ${this._renderTrailing(t,n)}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._tracked(),n=i.filter(d=>d.state==="on").length,r=t.show_up_to_date?i:i.filter(d=>d.state==="on"),o=S(i[0]),c=t.name??"Updates";return l`
      <ha-card class="control" style="--silk-accent:${o}">
        <div class="header">
          <div class="hname">${c}</div>
          ${n>0?l`<span class="badge">${n}</span>`:p}
        </div>
        ${r.length?l`<div class="rows">${r.map(d=>this._renderRow(d))}</div>`:l`
              <div class="empty">
                <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                <span>All up to date</span>
              </div>
            `}
      </ha-card>
    `}};Ut.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .hname {
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 6px;
        border-radius: 10px;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .pic {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        object-fit: cover;
      }
      .pic.fallback {
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .pic.fallback ha-icon {
        --mdc-icon-size: 18px;
      }
      .row .name {
        font-size: 13.5px;
      }
      .row .state {
        font-size: 12px;
      }
      .btn {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 14%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .btn:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .btn:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .btn:disabled {
        cursor: default;
      }
      .btn ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .btn.installing {
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* Real motion for a real install in flight — not a decorative loop. */
      .btn.installing ha-icon {
        animation: silk-update-spin 900ms linear infinite;
      }
      @keyframes silk-update-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .ok {
        flex: none;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        opacity: 0.5;
      }
      .ok ha-icon {
        --mdc-icon-size: 18px;
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 48px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .empty ha-icon {
        --mdc-icon-size: 20px;
        opacity: 0.7;
      }
    `],m([b({attribute:!1})],Ut.prototype,"hass",2),m([h()],Ut.prototype,"_config",2),m([h()],Ut.prototype,"_installing",2),Ut=m([x("silk-update-card")],Ut);var er={type:"silk-battery-card",name:"Silk Batteries",description:"The dying ones float to the top."},ir="silk-battery-card-editor";E(ir,[{name:"name",selector:{text:{}}},{name:"entities",selector:{entity:{multiple:!0,domain:["sensor"],device_class:["battery"]}}},{name:"limit",selector:{number:{min:1,max:30,mode:"box"}}}],{name:"Name",entities:"Entities (empty = every battery sensor)",limit:"Rows to show"},{limit:6});var tr=6,nr=20,bl=50;function Di(a){let s=a.attributes.friendly_name??a.entity_id;return s.replace(/\s+battery(\s+level)?\s*$/i,"")||s}function yl(a){return a<nr?"crit":a<bl?"warn":"good"}var de=class extends y{static getStubConfig(){return{type:"custom:silk-battery-card"}}static async getConfigElement(){return document.createElement(ir)}setConfig(s){if(s.entities!==void 0&&!Array.isArray(s.entities))throw new Error("silk-battery-card: `entities` must be a list of sensor entity ids");if(s.limit!==void 0&&(!Number.isFinite(s.limit)||s.limit<1))throw new Error("silk-battery-card: `limit` must be a number of at least 1");this._config=s}getCardSize(){let s=this._config?.limit??tr;return 2+Math.ceil(Math.min(s,12)/2)}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}_limit(){return Math.max(1,Math.floor(this._config?.limit??tr))}_rows(){let s=this.hass,t=this._config?.entities??Object.keys(s.states).filter(i=>{if(!i.startsWith("sensor."))return!1;let n=s.states[i];return n.attributes.device_class==="battery"&&n.state!==""&&Number.isFinite(Number(n.state))}),e=[];for(let i of t){let n=s.states[i];if(!n)continue;let r=Number(n.state),o=!_(n)&&n.state!==""&&Number.isFinite(r)?P(r,0,100):void 0;e.push({stateObj:n,level:o})}return e.sort((i,n)=>i.level===void 0&&n.level===void 0?0:i.level===void 0?1:n.level===void 0?-1:i.level-n.level||Di(i.stateObj).localeCompare(Di(n.stateObj))),e.slice(0,this._limit())}_onRowClick(s){C(this,s)}_renderRow(s){let t=Di(s.stateObj),e=s.level,i=e===void 0?void 0:yl(e);return l`
      <button
        class="row ${e===void 0?"unavailable":""}"
        aria-label=${e===void 0?t:`${t}: ${Math.round(e)}%`}
        @click=${()=>this._onRowClick(s.stateObj.entity_id)}
      >
        <span class="bname">${t}</span>
        <span class="bar">
          ${e===void 0?p:l`<span class="fill ${i}" style="width:${e}%"></span>`}
        </span>
        <span class="pct ${i==="crit"?"low":""}">
          ${e===void 0?"\u2014":`${Math.round(e)}%`}
        </span>
      </button>
    `}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=this._rows(),i=e.length?e[0].level:void 0,n=s.name??"Batteries";return l`
      <ha-card class="control" style="--silk-accent:${S(void 0)}">
        <div class="header">
          <div class="hname">${n}</div>
          ${i!==void 0&&i<nr?l`<span class="badge">${Math.round(i)}%</span>`:p}
        </div>
        ${e.length?l`<div class="rows">${e.map(r=>this._renderRow(r))}</div>`:l`<div class="empty">No battery sensors found</div>`}
      </ha-card>
    `}};de.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .hname {
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 30px;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .bname {
        flex: 1 1 40%;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bar {
        flex: 1 1 34%;
        min-width: 48px;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        display: block;
        height: 100%;
        border-radius: 3px;
        transition: width 400ms var(--silk-ease-out);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .fill.warn {
        background: var(--warning-color, #ffa600);
      }
      .fill.good {
        background: var(--success-color, #43a047);
      }
      .pct {
        flex: none;
        min-width: 42px;
        font-size: 13px;
        font-weight: 600;
        text-align: right;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .pct.low {
        color: var(--error-color, #db4437);
      }
      .empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 6px 0;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
    `],m([b({attribute:!1})],de.prototype,"hass",2),m([h()],de.prototype,"_config",2),de=m([x("silk-battery-card")],de);var sr={type:"silk-status-card",name:"Silk Status",description:"A status-page timeline for any entity."},Ui=16,xl=6,zi=24,wl=3e5,kl=6e4,$l=new Set(["unavailable","unknown","none",""]),rr="silk-status-card-editor";E(rr,[{name:"entity",required:!0,selector:{entity:{}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]},{name:"invert",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",hours_to_show:"Hours to show",invert:"Invert (off = good)"},{hours_to_show:zi});var Tt=class extends y{constructor(){super(...arguments);this._segments=null;this._uptime=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){return{type:"custom:silk-status-card",entity:Object.keys(t.states).find(i=>i.startsWith("binary_sensor."))}}static async getConfigElement(){return document.createElement(rr)}setConfig(t){if(!t.entity)throw new Error("silk-status-card: `entity` is required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-status-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._segments=null,this._uptime=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),wl)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,kl-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??zi,i=++this._fetchSeq,n=Date.now()/1e3,r=n-e*3600,o;try{o=await this.hass.callWS({type:"history/history_during_period",start_time:new Date(r*1e3).toISOString(),end_time:new Date(n*1e3).toISOString(),entity_ids:[t],minimal_response:!0,no_attributes:!0,significant_changes_only:!1})}catch(d){console.warn("silk-status-card: history fetch failed",d);return}if(i!==this._fetchSeq)return;this._lastFetch=Date.now();let c=(o?.[t]??[]).map(d=>{let u=d.lu??d.last_updated??d.lc??d.last_changed??NaN;return[typeof u=="number"?u:Date.parse(u)/1e3,String(d.s??d.state??"")]}).filter(d=>Number.isFinite(d[0])&&d[0]<=n).sort((d,u)=>d[0]-u[0]);this._buildSegments(c,r,n)}_classify(t){if($l.has(t.toLowerCase()))return"none";let e={entity_id:this._config.entity,state:t,attributes:{},last_changed:"",last_updated:""},i=R(e);return(this._config?.invert?!i:i)?"good":"bad"}_buildSegments(t,e,i){let n=i-e,r=[],o=0,c=0;for(let u=0;u<t.length;u++){let f=Math.max(t[u][0],e),g=u+1<t.length?Math.min(Math.max(t[u+1][0],e),i):i;if(g<=f)continue;let v=this._classify(t[u][1]),$=g-f;v==="good"?o+=$:v==="bad"&&(c+=$);let A=r[r.length-1];A&&A.kind===v?A.w+=$/n*100:r.push({x:(f-e)/n*100,w:$/n*100,kind:v})}this._segments=r;let d=o+c;this._uptime=d>0?o/d*100:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_agoLabel(){let t=this._config?.hours_to_show??zi;return t>=48&&t%24===0?`${t/24}d ago`:`${t}h ago`}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config;if(!t)return p;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=this._uptime===null?"\u2014":`${new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(this._uptime)}%`;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!n&&R(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">${i?N(e,i):""}</div>
          </div>
          <div class="trailing">
            <span class="pct">${c}</span>
          </div>
        </div>
        <div class="bar">
          <svg class="timeline" height=${Ui} aria-hidden="true">
            ${this._segments?z`<g class="segs">
                  ${this._segments.filter(d=>d.kind!=="none"&&d.w>0).map(d=>z`<rect class=${d.kind} x="${d.x}%" y="0" width="${d.w}%" height=${Ui}></rect>`)}
                </g>`:p}
          </svg>
          <div class="ends">
            <span>${this._agoLabel()}</span>
            <span>now</span>
          </div>
        </div>
      </ha-card>
    `}};Tt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        justify-content: center;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The status card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .pct {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .bar {
        flex: none;
        min-width: 0;
      }
      .timeline {
        display: block;
        width: 100%;
        height: ${Ui}px;
        border-radius: ${xl}px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .segs {
        animation: silk-status-in 250ms var(--silk-ease-out);
      }
      .timeline rect {
        transition: fill 200ms ease;
      }
      .timeline rect.good {
        fill: var(--silk-accent);
      }
      .timeline rect.bad {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ends {
        display: flex;
        justify-content: space-between;
        margin-top: 3px;
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.4;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .unavailable .bar {
        opacity: 0.45;
      }
      @keyframes silk-status-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],Tt.prototype,"hass",2),m([h()],Tt.prototype,"_config",2),m([h()],Tt.prototype,"_segments",2),m([h()],Tt.prototype,"_uptime",2),Tt=m([x("silk-status-card")],Tt);var or={type:"silk-chips-card",name:"Silk Chips",description:"A dense strip of glanceable pills."};function Tl(a){let s=a.trim();return s.startsWith("\xB0")?"\xB0":s}var me=class extends y{constructor(){super(...arguments);this._chips=[]}static getStubConfig(t){return{type:"custom:silk-chips-card",chips:Object.keys(t.states).filter(i=>i.startsWith("sensor.")).slice(0,3)}}setConfig(t){if(!Array.isArray(t.chips)||t.chips.length===0)throw new Error("silk-chips-card: `chips` must be a non-empty list");this._chips=t.chips.map((e,i)=>{let n=typeof e=="string"?{entity:e}:{...e};if(!n.entity||typeof n.entity!="string")throw new Error(`silk-chips-card: chips[${i}] needs an \`entity\``);return n}),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}_onChipClick(t,e){t.stopPropagation(),T(this),C(this,e)}_valueText(t){let e=t.state,i=Number(e);if(e!==""&&Number.isFinite(i)){let n=t.attributes.unit_of_measurement,r=D(this.hass,t.entity_id,i);return n?`${r}${Tl(String(n))}`:r}return N(this.hass,t)}_renderChip(t){let e=this.hass,i=e?.states[t.entity];if(!i)return l`
        <button
          class="pill unavailable"
          aria-label=${t.entity}
          @click=${u=>this._onChipClick(u,t.entity)}
        >
          <ha-icon .icon=${t.icon??"mdi:help-circle-outline"}></ha-icon>
          <span class="label"><span class="val">${t.name??t.entity}</span></span>
        </button>
      `;let n=_(i),r=!n&&R(i),o=S(i,t.color),c=n?N(e,i):this._valueText(i),d=t.name??i.attributes.friendly_name??t.entity;return l`
      <button
        class="pill ${r?"active":""} ${n?"unavailable":""}"
        style="--silk-accent:${o}"
        aria-label=${`${d}: ${c}`}
        @click=${u=>this._onChipClick(u,t.entity)}
      >
        ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        <span class="label">
          ${t.name?l`<span class="cname">${t.name}</span>`:p}
          <span class="val">${c}</span>
        </span>
      </button>
    `}render(){let t=this._config;return!t||!this.hass?p:l`
      <ha-card class=${t.alignment==="center"?"align-center":""}>
        ${this._chips.map(e=>this._renderChip(e))}
      </ha-card>
    `}};me.styles=[k,w`
      ha-card {
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px 12px;
        cursor: default;
        justify-content: flex-start;
        align-content: center;
      }
      ha-card.align-center {
        justify-content: center;
      }
      .pill {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        max-width: 100%;
        padding: 0 10px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
        position: relative;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target toward 40px without fattening the strip. */
      .pill::after {
        content: '';
        position: absolute;
        inset: -6px -2px;
        border-radius: 999px;
      }
      .pill:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .pill:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .pill:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .pill.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .pill.unavailable {
        opacity: 0.45;
        cursor: pointer;
      }
      .pill ha-state-icon,
      .pill ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
        pointer-events: none;
      }
      .label {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cname {
        color: var(--secondary-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pill.active .cname {
        color: color-mix(in srgb, var(--silk-accent) 70%, var(--primary-text-color));
      }
      .val {
        color: var(--primary-text-color);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pill.active .val {
        color: var(--silk-accent);
      }
    `],m([b({attribute:!1})],me.prototype,"hass",2),m([h()],me.prototype,"_config",2),me=m([x("silk-chips-card")],me);var ar={type:"silk-bar-card",name:"Silk Bar",description:"A linear gauge with a target you can see."},cr="silk-bar-card-editor";E(cr,[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}},{name:"target",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum",target:"Target"},{min:0,max:100});var zt=class extends y{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-bar-card",entity:i("battery")??i("power")??e[0]}}static async getConfigElement(){return document.createElement(cr)}setConfig(t){if(!t.entity)throw new Error("silk-bar-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-bar-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_formatBound(t){let e=this.hass?.locale?.language??this.hass?.language??"en";return new Intl.NumberFormat(e,{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=Number(i.state),o=!n&&i.state!==""&&Number.isFinite(r),c=t.min??0,d=t.max??100,u=d-c,f=o&&u>0?P((r-c)/u,0,1):0,g=(this._drawn?f:0)*100,v=typeof t.target=="number"&&Number.isFinite(t.target)&&u>0?P((t.target-c)/u,0,1)*100:void 0,$=(o?this._segmentColor(r):void 0)??S(i,t.color),A=t.unit??i.attributes.unit_of_measurement??"",M=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${$}"
        @click=${this._onCardClick}
      >
        <div class="icon">
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${M}>${M}</div>
          <div class="track">
            <div class="fill" style="width:${g}%"></div>
            ${v!==void 0?l`<div class="notch" style="left:${v}%"></div>`:p}
          </div>
          <div class="bounds">
            <span>${this._formatBound(c)}</span>
            <span>${this._formatBound(d)}</span>
          </div>
        </div>
        <div class="trailing">
          <span class="value">${o?D(e,t.entity,r):"\u2014"}</span>
          ${A?l`<span class="unit">${A}</span>`:p}
        </div>
      </ha-card>
    `}};zt.styles=[k,w`
      .info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .track {
        position: relative;
        height: 10px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 450ms var(--silk-ease-out),
          background 200ms ease;
      }
      .notch {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        transform: translateX(-50%);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.4);
        pointer-events: none;
      }
      .bounds {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        line-height: 1;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .value {
        white-space: nowrap;
      }
      .unit {
        white-space: nowrap;
      }
    `],m([b({attribute:!1})],zt.prototype,"hass",2),m([h()],zt.prototype,"_config",2),m([h()],zt.prototype,"_drawn",2),zt=m([x("silk-bar-card")],zt);var dr={type:"silk-ring-card",name:"Silk Ring",description:"A full-circle gauge built for grids."},mr="silk-ring-card-editor";E(mr,[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var qi=48,Ee=qi/2,lr=21,ji=100,jt=class extends y{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state)));return{type:"custom:silk-ring-card",entity:e.find(n=>t.states[n].attributes.device_class==="battery")??e[0]}}static async getConfigElement(){return document.createElement(mr)}setConfig(t){if(!t.entity)throw new Error("silk-ring-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-ring-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:2,rows:2,min_columns:2,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=Number(i.state),o=!n&&i.state!==""&&Number.isFinite(r),c=t.min??0,u=(t.max??100)-c,f=o&&u>0?P((r-c)/u,0,1):0,g=this._drawn?f:0,v=ji*(1-g),$=(o?this._segmentColor(r):void 0)??S(i),A=t.unit??i.attributes.unit_of_measurement??"",M=t.name??i.attributes.friendly_name??t.entity,I=t.display==="icon";return l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${$}"
        @click=${this._onCardClick}
      >
        <div class="ring">
          <svg viewBox="0 0 ${qi} ${qi}" aria-hidden="true">
            <circle class="ring-bg" cx=${Ee} cy=${Ee} r=${lr}></circle>
            <circle
              class="ring-value"
              cx=${Ee}
              cy=${Ee}
              r=${lr}
              pathLength=${ji}
              stroke-dasharray=${ji}
              transform="rotate(-90 ${Ee} ${Ee})"
              style="stroke-dashoffset:${v};opacity:${g>0?1:0}"
            ></circle>
          </svg>
          <div class="center">
            ${I?l`
                  <ha-state-icon
                    class="cicon ${o&&r>0?"lit":""}"
                    .hass=${e}
                    .stateObj=${i}
                  ></ha-state-icon>
                `:l`
                  <div>
                    <div class="value">
                      ${o?D(e,t.entity,r):"\u2014"}
                    </div>
                    ${A?l`<div class="unit">${A}</div>`:p}
                  </div>
                `}
          </div>
        </div>
        <div class="name" title=${M}>${M}</div>
      </ha-card>
    `}};jt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px;
      }
      .ring {
        position: relative;
        flex: none;
        width: 100%;
        max-width: 74px;
        aspect-ratio: 1;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .ring-bg,
      .ring-value {
        fill: none;
        stroke-width: 6;
      }
      .ring-bg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .ring-value {
        stroke: var(--silk-accent);
        stroke-linecap: round;
        transition:
          stroke-dashoffset 450ms var(--silk-ease-out),
          stroke 200ms ease,
          opacity 200ms ease;
      }
      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        text-align: center;
        pointer-events: none;
      }
      .value {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .unit {
        font-size: 9px;
        font-weight: 500;
        line-height: 1.2;
        margin-top: 1px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 44px;
      }
      .cicon {
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        transition: color 200ms ease;
      }
      .cicon.lit {
        color: var(--silk-accent);
      }
      .name {
        font-size: 12px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .unavailable .ring,
      .unavailable .name {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],jt.prototype,"hass",2),m([h()],jt.prototype,"_config",2),m([h()],jt.prototype,"_drawn",2),jt=m([x("silk-ring-card")],jt);var pr={type:"silk-energy-card",name:"Silk Energy",description:"Today versus yesterday, honestly compared."},ur="silk-energy-card-editor";E(ur,[{name:"name",required:!0,selector:{text:{}}},{name:"power",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"today",required:!0,selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"yesterday",selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"month",selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"icon",selector:{icon:{}}}],{name:"Name",power:"Live power (W)",today:"Today (kWh)",yesterday:"Yesterday (kWh)",month:"This month (kWh)",icon:"Icon"});function ni(a){return!a||_(a)||a.state===""?NaN:Number(a.state)}var qt=class extends y{constructor(){super(...arguments);this._drawn=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")&&t.states[r].attributes.device_class==="energy"),i=e[0];return{type:"custom:silk-energy-card",name:i?t.states[i].attributes.friendly_name??"Energy":"Energy",today:i,yesterday:e[1]}}static async getConfigElement(){return document.createElement(ur)}setConfig(t){if(!t.name)throw new Error("silk-energy-card: `name` is required");if(!t.today)throw new Error("silk-energy-card: `today` (an energy sensor) is required");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_onCardClick(){this._config&&C(this,this._config.today)}_barRow(t,e,i,n){return l`
      <span class="bar-label">${t}</span>
      <div class="bar-track">
        <div class="bar-fill ${e}" style="width:${this._drawn?i:0}%"></div>
      </div>
      <span class="bar-value">${n}</span>
    `}_energyText(t,e,i){if(!Number.isFinite(e))return"\u2014";let n=i?.attributes.unit_of_measurement??"kWh";return`${D(this.hass,t,e)} ${n}`}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.today];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.today}</div>
        </ha-card>
      `;let n=_(i),r=S(i,t.color),o=t.icon??"mdi:power-plug",c=t.yesterday?e.states[t.yesterday]:void 0,d=t.month?e.states[t.month]:void 0,u=t.power?e.states[t.power]:void 0,f=ni(i),g=ni(c),v=ni(d),$=ni(u),A=Math.max(Number.isFinite(f)?f:0,Number.isFinite(g)?g:0),M=q=>Number.isFinite(q)&&A>0?Math.min(q/A*100,100):0,I=Number.isFinite(f)&&Number.isFinite(g)&&g>0,F=I?Math.round((f-g)/g*100):0,H=F<0?"down":F>0?"up":"",U=F<0?`\u2212${Math.abs(F)}%`:F>0?`+${F}%`:"0%",W=Number.isFinite($)&&$>0;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${W?"on":""}">
            <ha-icon .icon=${o}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${t.name}</div>
            ${d?l`<div class="state">This month ${this._energyText(t.month,v,d)}</div>`:p}
          </div>
          ${u?l`
                <div class="trailing">
                  <span class="value">${D(e,t.power,$)}</span>
                  <span class="unit"
                    >${u.attributes.unit_of_measurement??"W"}</span
                  >
                </div>
              `:p}
        </div>
        <div class="bars">
          ${this._barRow("Today","today",M(f),this._energyText(t.today,f,i))}
          ${c?this._barRow("Yesterday","yesterday",M(g),this._energyText(t.yesterday,g,c)):p}
        </div>
        ${I?l`
              <div class="delta">
                vs yesterday <span class="pct ${H}">${U}</span>
              </div>
            `:p}
      </ha-card>
    `}};qt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .bars {
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        align-items: center;
        gap: 6px 10px;
      }
      .bar-label {
        font-size: 12px;
        line-height: 1;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .bar-track {
        height: 8px;
        border-radius: 6px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 6px;
        width: 0;
        transition: width 400ms var(--silk-ease-out);
      }
      .bar-fill.today {
        background: var(--silk-accent);
      }
      .bar-fill.yesterday {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
      }
      .bar-value {
        font-size: 12px;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .delta {
        font-size: 12px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .delta .pct {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .delta .pct.down {
        color: var(--success-color, #43a047);
      }
      .delta .pct.up {
        color: var(--warning-color, #ffa600);
      }
      .unavailable .bars,
      .unavailable .delta {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],qt.prototype,"hass",2),m([h()],qt.prototype,"_config",2),m([h()],qt.prototype,"_drawn",2),qt=m([x("silk-energy-card")],qt);var hr={type:"silk-todo-card",name:"Silk To-do",description:"Check things off without leaving the dashboard."},Vi=5,fr="silk-todo-card-editor";E(fr,[{name:"entity",required:!0,selector:{entity:{domain:["todo"]}}},{name:"name",selector:{text:{}}},{name:"limit",selector:{number:{min:1,max:15,mode:"box"}}}],{entity:"Entity",name:"Name",limit:"Items shown"},{limit:Vi});var Vt=class extends y{constructor(){super(...arguments);this._fetchedFor="";this._fetchEpoch=0}static getStubConfig(t){return{type:"custom:silk-todo-card",entity:Object.keys(t.states).find(i=>i.startsWith("todo."))}}static async getConfigElement(){return document.createElement(fr)}setConfig(t){if(!t.entity||O(t.entity)!=="todo")throw new Error("silk-todo-card: `entity` must be a todo entity");this._config=t,this._items=void 0,this._fetchedFor=""}getCardSize(){let t=this._config?.limit??Vi;return Math.max(2,Math.ceil((t+2)/2))}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._fetchedFor="",this.hass&&this._config&&this._fetchItems()}willUpdate(t){if(!t.has("hass")&&!t.has("_config"))return;let e=this.hass?.states[this._config?.entity??""];e&&!_(e)&&e.last_updated!==this._fetchedFor&&this._fetchItems()}async _fetchItems(){let t=this.hass,e=this._config;if(!t||!e)return;let i=t.states[e.entity];if(!i||_(i))return;this._fetchedFor=i.last_updated;let n=++this._fetchEpoch;try{let r=await t.callWS({type:"todo/item/list",entity_id:e.entity});if(n!==this._fetchEpoch)return;let o=r.items??[];this._items=[...o.filter(c=>c.status!=="completed"),...o.filter(c=>c.status==="completed")]}catch{n===this._fetchEpoch&&(this._fetchedFor="")}}_onCardClick(){this._config&&C(this,this._config.entity)}_onItemClick(t,e){t.stopPropagation();let i=this.hass,n=this._config;if(!i||!n||!this._items||_(i.states[n.entity]))return;let r=e.status==="completed"?"needs_action":"completed";T(this),this._items=this._items.map(o=>o.uid===e.uid?{...o,status:r}:o),i.callService("todo","update_item",{entity_id:n.entity,item:e.uid,status:r}).catch(()=>{this._items=this._items?.map(o=>o.uid===e.uid?{...o,status:e.status}:o)})}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=_(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=Math.max(1,t.limit??Vi),d=this._items,u=d?.slice(0,c)??[],f=d?d.length-u.length:0,g=Number(i.state),v=d?d.filter($=>$.status!=="completed").length:Number.isFinite(g)?g:0;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="icon ${v>0?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          ${v>0?l`<div class="trailing"><span class="count">${v}</span></div>`:p}
        </div>
        <div class="list">
          ${u.map($=>{let A=$.status==="completed";return l`
              <button
                class="row ${A?"done":""}"
                role="checkbox"
                aria-checked=${A?"true":"false"}
                title=${$.summary}
                .disabled=${n}
                @click=${M=>this._onItemClick(M,$)}
              >
                <span class="check">
                  ${A?l`<ha-icon icon="mdi:check"></ha-icon>`:p}
                </span>
                <span class="summary">${$.summary}</span>
              </button>
            `})}
          ${d&&d.length===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  <span>Nothing to do</span>
                </div>
              `:p}
          ${f>0?l`<div class="more">+${f} more</div>`:p}
        </div>
      </ha-card>
    `}};Vt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 4px;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        padding: 3px 8px;
        border-radius: 999px;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .list {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 36px;
        padding: 2px 0;
        margin: 0;
        border: none;
        background: none;
        font: inherit;
        color: var(--primary-text-color);
        text-align: left;
        cursor: pointer;
      }
      .row:disabled {
        cursor: default;
      }
      .check {
        flex: none;
        width: 20px;
        height: 20px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.3);
        display: grid;
        place-items: center;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          border-color 200ms ease;
      }
      .row:active:not(:disabled) .check {
        transform: scale(0.85);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .row.done .check {
        background: var(--silk-accent);
        border-color: var(--silk-accent);
      }
      .check ha-icon {
        --mdc-icon-size: 14px;
        color: #fff;
        display: flex;
        pointer-events: none;
      }
      .summary {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: opacity 200ms ease;
      }
      .row.done .summary {
        text-decoration: line-through;
        opacity: 0.45;
      }
      .row:focus-visible .check {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .more {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        padding: 4px 0 0 30px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .empty {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0 4px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .empty ha-icon {
        --mdc-icon-size: 18px;
        opacity: 0.7;
      }
      .unavailable .list {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Vt.prototype,"hass",2),m([h()],Vt.prototype,"_config",2),m([h()],Vt.prototype,"_items",2),Vt=m([x("silk-todo-card")],Vt);var gr={type:"silk-popup-card",name:"Silk Pop-up",description:"Hash-based pop-ups with zero dependencies."},El=200,_r="silk-popup-card-editor";E(_r,[{name:"hash",required:!0,selector:{text:{}}},{name:"title",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{hash:"Hash (e.g. #garage)",title:"Title",icon:"Icon"});var Q=class extends y{constructor(){super(...arguments);this.preview=!1;this.editMode=!1;this._open=!1;this._closing=!1;this._children=null;this._helpersMissing=!1;this._pushedHash=!1;this._buildSeq=0;this._onHashChange=()=>{this._sync(!0)};this._onKeyDown=t=>{t.key==="Escape"&&(t.stopPropagation(),this._requestClose())}}static getStubConfig(){return{type:"custom:silk-popup-card",hash:"#popup"}}static async getConfigElement(){return document.createElement(_r)}setConfig(t){if(typeof t.hash!="string"||!t.hash.startsWith("#")||t.hash.length<2)throw new Error("silk-popup-card: `hash` is required and must start with '#' (e.g. '#garage')");if(t.cards!==void 0&&!Array.isArray(t.cards))throw new Error("silk-popup-card: `cards` must be a list of card configurations");this._config=t,this._buildSeq++,this._children=null,this._helpersMissing=!1,this.isConnected&&this._sync(!1)}getCardSize(){return 1}getGridOptions(){return{columns:1,rows:1}}connectedCallback(){super.connectedCallback(),window.addEventListener("hashchange",this._onHashChange),this._sync(!1)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("hashchange",this._onHashChange),window.removeEventListener("keydown",this._onKeyDown),window.clearTimeout(this._closeTimer),this._open=!1,this._closing=!1}willUpdate(t){t.has("hass")&&this._open&&this._assignHass()}updated(t){t.has("_open")&&this._open&&this.renderRoot.querySelector(".close")?.focus({preventScroll:!0})}_sync(t){let e=this._config;e&&(window.location.hash===e.hash?(this._open||(this._pushedHash=t),this._show()):this._hide())}_show(){window.clearTimeout(this._closeTimer),this._closing=!1,this._open||(this._open=!0,window.addEventListener("keydown",this._onKeyDown)),!this._children&&!this._helpersMissing?this._buildChildren():this._assignHass()}_hide(){!this._open||this._closing||(window.removeEventListener("keydown",this._onKeyDown),this._closing=!0,this._closeTimer=window.setTimeout(()=>{this._closing=!1,this._open=!1},El))}_requestClose(){let t=this._config;!t||!this._open||this._closing||(window.location.hash===t.hash&&(this._pushedHash?history.back():history.replaceState(null,"",window.location.pathname+window.location.search)),this._hide())}async _buildChildren(){let t=this._config?.cards??[],e=++this._buildSeq,i=window.loadCardHelpers;if(typeof i!="function"){this._helpersMissing=!0;return}try{let n=await i();if(e!==this._buildSeq)return;this._children=t.map(r=>n.createCardElement(r)),this._assignHass()}catch(n){console.warn("silk-popup-card: card helpers failed",n),e===this._buildSeq&&(this._helpersMissing=!0)}}_assignHass(){if(!(!this.hass||!this._children))for(let t of this._children)t.hass=this.hass}_onScrimClick(){this._requestClose()}_onCloseClick(t){t.stopPropagation(),T(this),this._requestClose()}_renderBody(){return this._helpersMissing?l`<div class="note">Pop-up requires Home Assistant</div>`:this._children?this._children.length===0?l`<div class="note">No cards configured — add a <code>cards:</code> list.</div>`:this._children:p}_renderOverlay(t){let e=t.title??"";return l`
      <div class="overlay ${this._closing?"closing":""}">
        <div class="scrim" @click=${this._onScrimClick}></div>
        <div class="sheet" role="dialog" aria-modal="true" aria-label=${e||"Pop-up"}>
          <div class="header">
            ${t.icon?l`<ha-icon class="lead" .icon=${t.icon}></ha-icon>`:p}
            <div class="title" title=${e||p}>${e}</div>
            <button class="close" aria-label="Close" @click=${this._onCloseClick}>
              <ha-icon .icon=${"mdi:close"}></ha-icon>
            </button>
          </div>
          <div class="body">${this._renderBody()}</div>
        </div>
      </div>
    `}render(){let t=this._config;if(!t)return p;let e=this.preview||this.editMode;return l`
      ${e?l`
            <ha-card class="ghost">
              <ha-icon class="ghost-icon" .icon=${t.icon??"mdi:dock-window"}></ha-icon>
              <div class="info">
                <div class="name">${t.title??"Pop-up"}</div>
                <div class="state">Opens on ${t.hash}</div>
              </div>
            </ha-card>
          `:l`<div class="placeholder" aria-hidden="true"></div>`}
      ${this._open&&!this.preview?this._renderOverlay(t):p}
    `}};Q.styles=[k,w`
      .placeholder {
        display: none;
      }
      /* Edit-mode stand-in so the card can be found and configured. */
      .ghost {
        cursor: default;
        box-shadow: none;
        border: 1px dashed rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.03);
      }
      .ghost-icon {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
      }
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 8;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .scrim {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        cursor: pointer;
        animation: silk-popup-fade-in 200ms ease both;
      }
      .sheet {
        position: relative;
        width: 100%;
        max-width: 480px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.18);
        overflow: hidden;
        animation: silk-popup-rise 300ms var(--silk-ease-out) both;
      }
      .closing .scrim {
        animation: silk-popup-fade-out 200ms ease both;
      }
      .closing .sheet {
        animation: silk-popup-drop 200ms ease both;
      }
      .header {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 14px 14px 6px 18px;
      }
      .lead {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .close {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .close:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .close:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .close:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .close ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 8px 14px calc(14px + env(safe-area-inset-bottom, 0px));
      }
      .note {
        padding: 8px 4px 4px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
      @keyframes silk-popup-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes silk-popup-fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes silk-popup-rise {
        from {
          transform: translateY(24px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes silk-popup-drop {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(24px);
          opacity: 0;
        }
      }
    `],m([b({attribute:!1})],Q.prototype,"hass",2),m([b({type:Boolean})],Q.prototype,"preview",2),m([b({type:Boolean})],Q.prototype,"editMode",2),m([h()],Q.prototype,"_config",2),m([h()],Q.prototype,"_open",2),m([h()],Q.prototype,"_closing",2),m([h()],Q.prototype,"_children",2),m([h()],Q.prototype,"_helpersMissing",2),Q=m([x("silk-popup-card")],Q);var vr={type:"silk-divider-card",name:"Silk Divider",description:"A quiet line that says a little."},br="silk-divider-card-editor";E(br,[{name:"label",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{label:"Label",icon:"Icon"});var Ce=class extends y{static getStubConfig(){return{type:"custom:silk-divider-card"}}static async getConfigElement(){return document.createElement(br)}setConfig(s){if(s.label!==void 0&&typeof s.label!="string")throw new Error("silk-divider-card: `label` must be a string");if(s.icon!==void 0&&typeof s.icon!="string")throw new Error("silk-divider-card: `icon` must be a string");this._config=s}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_rows:1}}render(){let s=this._config;if(!s)return p;let t=s.label?.trim()??"",e=!!(t||s.icon);return l`
      <ha-card role="separator" aria-label=${t||p}>
        <div class="line"></div>
        ${e?l`
              <div class="tag" title=${t||p}>
                ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:p}
                ${t?l`<span class="text">${t}</span>`:p}
              </div>
              <div class="line"></div>
            `:p}
      </ha-card>
    `}};Ce.styles=[k,w`
      /* A divider floats on the view background — no card chrome at all. */
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0 8px;
        gap: 10px;
        cursor: default;
      }
      .line {
        flex: 1;
        height: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .tag {
        flex: none;
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        max-width: 70%;
        color: var(--secondary-text-color);
      }
      .tag ha-icon {
        flex: none;
        --mdc-icon-size: 14px;
      }
      .text {
        min-width: 0;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `],m([h()],Ce.prototype,"_config",2),Ce=m([x("silk-divider-card")],Ce);var xr={type:"silk-navbar-card",name:"Silk Navbar",description:"A floating dock for your dashboards."},yr=6,pe=class extends y{constructor(){super(...arguments);this._onLocationChanged=()=>{this.requestUpdate()}}static getStubConfig(){return{type:"custom:silk-navbar-card",items:[{icon:"mdi:home",path:"/lovelace/0"}]}}setConfig(t){if(!Array.isArray(t.items)||t.items.length===0)throw new Error("silk-navbar-card: `items` is required \u2014 2-6 of {icon, path}");if(t.items.length>yr)throw new Error(`silk-navbar-card: at most ${yr} \`items\``);t.items.forEach((e,i)=>{if(!e||typeof e.icon!="string"||!e.icon)throw new Error(`silk-navbar-card: items[${i}] needs an \`icon\``);if(typeof e.path!="string"||!e.path)throw new Error(`silk-navbar-card: items[${i}] needs a \`path\``)}),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}connectedCallback(){super.connectedCallback(),window.addEventListener("location-changed",this._onLocationChanged),window.addEventListener("popstate",this._onLocationChanged)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("location-changed",this._onLocationChanged),window.removeEventListener("popstate",this._onLocationChanged)}_isItemActive(t){let e=window.location.pathname;return e===t||e.endsWith(t)}_onItemClick(t,e){t.stopPropagation(),T(this,"selection"),history.pushState(null,"",e),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}))}_renderBadge(t){if(!t)return p;let e=this.hass?.states[t];if(!e||_(e))return p;let i=Number(e.state);if(e.state!==""&&Number.isFinite(i)){if(i<=0)return p;let n=Math.round(i);return l`<span class="count" aria-hidden="true">${n>99?"99+":n}</span>`}return R(e)?l`<span class="dot" aria-hidden="true"></span>`:p}_renderItem(t){let e=this._isItemActive(t.path),i=!!(this._config?.show_labels&&t.label);return l`
      <button
        class="item ${e?"active":""}"
        aria-label=${t.label??t.path}
        aria-current=${e?"page":p}
        @click=${n=>this._onItemClick(n,t.path)}
      >
        <span class="glyph">
          <ha-icon .icon=${t.icon}></ha-icon>
          ${this._renderBadge(t.badge_entity)}
        </span>
        ${i?l`<span class="label">${t.label}</span>`:p}
      </button>
    `}render(){let t=this._config;if(!t)return p;let e=S(void 0,t.color);return l`
      <ha-card style="--silk-accent:${e}">
        ${t.items.map(i=>this._renderItem(i))}
      </ha-card>
    `}};pe.styles=[k,w`
      ha-card {
        border-radius: 999px;
        padding: 6px;
        gap: 4px;
        cursor: default;
        justify-content: space-between;
      }
      .item {
        flex: 1 1 0;
        min-width: 0;
        height: 44px;
        border: none;
        border-radius: 999px;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        cursor: pointer;
        font: inherit;
        color: var(--secondary-text-color);
        background: none;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .item:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .item:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .item.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .glyph {
        position: relative;
        flex: none;
        display: grid;
        place-items: center;
        line-height: 0;
      }
      .glyph ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .label {
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
        max-width: calc(100% - 12px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dot {
        position: absolute;
        top: -1px;
        right: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--silk-accent);
      }
      .count {
        position: absolute;
        top: -6px;
        left: 14px;
        min-width: 15px;
        height: 15px;
        padding: 0 4px;
        border-radius: 999px;
        box-sizing: border-box;
        background: var(--silk-accent);
        color: var(--text-primary-color, #fff);
        font-size: 9.5px;
        font-weight: 600;
        line-height: 15px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
    `],m([b({attribute:!1})],pe.prototype,"hass",2),m([h()],pe.prototype,"_config",2),pe=m([x("silk-navbar-card")],pe);var wr={type:"silk-heading-card",name:"Silk Heading",description:"A section title that can carry live chips."},kr="silk-heading-card-editor";E(kr,[{name:"heading",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"action_path",selector:{text:{}}}],{heading:"Heading",icon:"Icon",action_path:"Navigation path"});function Cl(a){let s=a.trim();return s.startsWith("\xB0")?"\xB0":s}var ue=class extends y{static getStubConfig(){return{type:"custom:silk-heading-card",heading:"Living Room"}}static async getConfigElement(){return document.createElement(kr)}setConfig(s){if(!s.heading||typeof s.heading!="string")throw new Error("silk-heading-card: `heading` is required");if(s.chips!==void 0&&!Array.isArray(s.chips))throw new Error("silk-heading-card: `chips` must be a list of entity ids");this._config=s}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:3,min_rows:1}}_onCardClick(){let s=this._config?.action_path;s&&(T(this,"selection"),history.pushState(null,"",s),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0})))}_onChipClick(s,t){s.stopPropagation(),C(this,t)}_valueText(s){let t=s.state,e=Number(t);if(t!==""&&Number.isFinite(e)){let i=s.attributes.unit_of_measurement,n=D(this.hass,s.entity_id,e);return i?`${n}${Cl(String(i))}`:n}return N(this.hass,s)}_renderChip(s){let e=this.hass?.states[s];if(!e)return p;let i=_(e),n=!i&&R(e),r=S(e),o=this._valueText(e),c=e.attributes.friendly_name??s;return l`
      <button
        class="chip ${n?"active":""} ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        title=${c}
        aria-label=${`${c}: ${o}`}
        @click=${d=>this._onChipClick(d,s)}
      >
        ${o}
      </button>
    `}render(){let s=this._config;if(!s)return p;let t=s.chips??[],e=!!s.action_path;return l`
      <ha-card class=${e?"nav":""} @click=${this._onCardClick}>
        ${s.icon?l`<ha-icon class="lead" .icon=${s.icon}></ha-icon>`:p}
        <div class="heading" title=${s.heading}>${s.heading}</div>
        <div class="trail">
          ${t.map(i=>this._renderChip(i))}
          ${e?l`<ha-icon class="chev" .icon=${"mdi:chevron-right"}></ha-icon>`:p}
        </div>
      </ha-card>
    `}};ue.styles=[k,w`
      /* A heading floats on the view background, like a divider. */
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 4px 8px;
        gap: 8px;
        cursor: default;
      }
      ha-card.nav {
        cursor: pointer;
      }
      .lead {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
      }
      .heading {
        flex: 0 1 auto;
        min-width: 0;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .trail {
        margin-left: auto;
        flex: 0 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        overflow: hidden;
      }
      .chip {
        flex: 0 1 auto;
        min-width: 0;
        position: relative;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the touch target without fattening the row. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -9px -2px;
        border-radius: 999px;
      }
      .chip:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .chip.unavailable {
        opacity: 0.45;
      }
      .chev {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
    `],m([b({attribute:!1})],ue.prototype,"hass",2),m([h()],ue.prototype,"_config",2),ue=m([x("silk-heading-card")],ue);var $r={type:"silk-welcome-card",name:"Silk Welcome",description:"A greeting that knows your home."},Al={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},Sl="mdi:weather-partly-cloudy",Ml=6e4;function Pl(a){let s=a.trim();return s.startsWith("\xB0")?"\xB0":s}var Tr="silk-welcome-card-editor";E(Tr,[{name:"name",selector:{text:{}}},{name:"temperature",selector:{entity:{domain:["sensor"]}}},{name:"weather",selector:{entity:{domain:["weather"]}}}],{name:"Name to greet",temperature:"Temperature entity",weather:"Weather entity"});var he=class extends y{static getStubConfig(s){let t=Object.keys(s.states),e=t.find(n=>n.startsWith("weather.")),i=t.find(n=>n.startsWith("sensor.")&&s.states[n].attributes.device_class==="temperature");return{type:"custom:silk-welcome-card",weather:e,temperature:i}}static async getConfigElement(){return document.createElement(Tr)}setConfig(s){if(s.count_active!==void 0&&!Array.isArray(s.count_active))throw new Error("silk-welcome-card: `count_active` must be a list of entity ids");this._config=s}getCardSize(){return 2}getGridOptions(){return{columns:12,rows:1,min_rows:1}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),Ml)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer),this._clockTimer=void 0}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_greeting(s){let t=s.getHours();return t<12?"Good morning":t<18?"Good afternoon":"Good evening"}_renderWeather(){let s=this._config?.weather,t=s?this.hass?.states[s]:void 0;if(!t||_(t))return p;let e=Al[t.state]??Sl,i=Number(t.attributes.temperature);return l`
      <span class="seg">
        <ha-icon .icon=${e}></ha-icon>
        ${Number.isFinite(i)?l`<span>${D(this.hass,t.entity_id,i)}°</span>`:p}
      </span>
    `}_renderTemperature(){let s=this._config?.temperature,t=s?this.hass?.states[s]:void 0;if(!t||_(t)||t.state==="")return p;let e=Number(t.state);if(!Number.isFinite(e))return p;let i=t.attributes.unit_of_measurement,n=D(this.hass,t.entity_id,e);return l`<span class="seg">${i?`${n}${Pl(String(i))}`:n}</span>`}_renderDevices(){let s=this._config?.count_active,t=this.hass;if(!t||!Array.isArray(s)||s.length===0)return p;let e=s.filter(i=>R(t.states[i])).length;return l`
      <span class="seg devices ${e>0?"some":""}">
        ${e} ${e===1?"device":"devices"} on
      </span>
    `}render(){let s=this._config;if(!s)return p;let t=new Date,e=s.name??this.hass?.user?.name,i=`${this._greeting(t)}${e?`, ${e}`:""}`,n=new Intl.DateTimeFormat(this._locale(),{weekday:"long",month:"long",day:"numeric"}).format(t),r=[l`<span class="seg">${n}</span>`];for(let o of[this._renderWeather(),this._renderTemperature(),this._renderDevices()])o!==p&&r.push(o);return l`
      <ha-card>
        <div class="greeting" title=${i}>${i}</div>
        <div class="sub">
          ${r.map((o,c)=>c?l`<span class="sep">·</span>${o}`:o)}
        </div>
      </ha-card>
    `}};he.styles=[k,w`
      /* A welcome header floats on the view background, like a divider. */
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 2px;
        padding: 6px 10px;
        cursor: default;
      }
      .greeting {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.25;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        font-size: 13px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 5px;
      }
      .seg {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        vertical-align: bottom;
      }
      .seg ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
      }
      .devices {
        transition: color 200ms ease;
      }
      .devices.some {
        color: var(--silk-accent);
        font-weight: 500;
      }
    `],m([b({attribute:!1})],he.prototype,"hass",2),m([h()],he.prototype,"_config",2),he=m([x("silk-welcome-card")],he);var Er={type:"silk-clock-card",name:"Silk Clock",description:"Time, beautifully told."},Ol=Array.from({length:12},(a,s)=>{let t=s%3===0,e=s*30*Math.PI/180,i=t?39.5:42.5,n=45.5;return{x1:50+i*Math.sin(e),y1:50-i*Math.cos(e),x2:50+n*Math.sin(e),y2:50-n*Math.cos(e),quarter:t}}),Cr="silk-clock-card-editor";E(Cr,[{name:"style",selector:{select:{mode:"dropdown",options:[{value:"digital",label:"Digital"},{value:"analog",label:"Analog"}]}}},{name:"show_seconds",selector:{boolean:{}}}],{style:"Style",show_seconds:"Show seconds"},{style:"digital",show_seconds:!1});var Gt=class extends y{constructor(){super(...arguments);this._now=new Date;this._fmtLocale="";this._onVisibility=()=>{document.hidden?this._stopTicking():this._startTicking()}}static getStubConfig(){return{type:"custom:silk-clock-card",style:"digital"}}static async getConfigElement(){return document.createElement(Cr)}setConfig(t){if(t.style!==void 0&&t.style!=="digital"&&t.style!=="analog")throw new Error("silk-clock-card: `style` must be 'digital' or 'analog'");this._config=t,this.isConnected&&this._startTicking()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startTicking()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopTicking()}_cadenceMs(){let t=this._config;return t&&(t.style==="analog"||t.show_seconds)?1e3:6e4}_startTicking(){this._stopTicking(),!document.hidden&&(this._now=new Date,this._scheduleTick())}_scheduleTick(){let t=this._cadenceMs(),e=t-Date.now()%t+20;this._tickTimer=window.setTimeout(()=>{this._now=new Date,this._scheduleTick()},e)}_stopTicking(){window.clearTimeout(this._tickTimer),this._tickTimer=void 0}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_ensureFormatters(){let t=this._locale();t===this._fmtLocale&&this._timeFmt||(this._fmtLocale=t,this._timeFmt=new Intl.DateTimeFormat(t,{hour:"2-digit",minute:"2-digit"}),this._dateFmt=new Intl.DateTimeFormat(t,{weekday:"short",month:"short",day:"numeric"}),this._secondsFmt=new Intl.NumberFormat(t,{minimumIntegerDigits:2}))}_timeParts(t){let e=this._timeFmt.formatToParts(t),i=e.filter(r=>r.type!=="dayPeriod").map(r=>r.value).join("").trim(),n=e.find(r=>r.type==="dayPeriod")?.value;return{time:i,meridiem:n}}_renderDigital(t,e){let{time:i,meridiem:n}=this._timeParts(t);return l`
      <div class="time-row">
        <span class="time">${i}</span>
        ${e?l`<span class="small">${this._secondsFmt.format(t.getSeconds())}</span>`:p}
        ${n?l`<span class="small">${n}</span>`:p}
      </div>
      <div class="date">${this._dateFmt.format(t)}</div>
    `}_renderAnalog(t,e){let i=t.getSeconds(),n=t.getMinutes()+i/60,r=t.getHours()%12+n/60,{time:o,meridiem:c}=this._timeParts(t);return l`
      <svg
        class="face"
        viewBox="0 0 100 100"
        role="img"
        aria-label=${c?`${o} ${c}`:o}
      >
        <circle class="face-bg" cx="50" cy="50" r="47"></circle>
        ${Ol.map(d=>z`
            <line
              class="tick ${d.quarter?"quarter":""}"
              x1=${d.x1.toFixed(2)}
              y1=${d.y1.toFixed(2)}
              x2=${d.x2.toFixed(2)}
              y2=${d.y2.toFixed(2)}
            ></line>`)}
        <rect
          class="hand"
          x="48.4"
          y="25"
          width="3.2"
          height="29"
          rx="1.6"
          transform="rotate(${(r*30).toFixed(2)} 50 50)"
        ></rect>
        <rect
          class="hand"
          x="48.8"
          y="17"
          width="2.4"
          height="37"
          rx="1.2"
          transform="rotate(${(n*6).toFixed(2)} 50 50)"
        ></rect>
        ${e?z`
            <rect
              class="hand second"
              x="49.25"
              y="13"
              width="1.5"
              height="45"
              rx="0.75"
              transform="rotate(${i*6} 50 50)"
            ></rect>`:p}
        <circle class="cap" cx="50" cy="50" r="2.6"></circle>
      </svg>
    `}render(){let t=this._config;if(!t)return p;this._ensureFormatters();let e=t.style==="analog",i=t.show_seconds===!0;return l`
      <ha-card>
        ${t.name?l`<div class="label" title=${t.name}>${t.name}</div>`:p}
        ${e?this._renderAnalog(this._now,i):this._renderDigital(this._now,i)}
      </ha-card>
    `}};Gt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 10px 12px;
        cursor: default;
      }
      .label {
        flex: none;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .time-row {
        display: flex;
        align-items: baseline;
        gap: 5px;
        max-width: 100%;
        min-width: 0;
      }
      .time {
        font-size: 34px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .small {
        font-size: 15px;
        font-weight: 500;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .date {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .face {
        display: block;
        width: 110px;
        max-width: 100%;
        max-height: 100%;
        min-height: 0;
        flex: 0 1 auto;
        aspect-ratio: 1 / 1;
      }
      .face-bg {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .tick {
        stroke: var(--primary-text-color);
        stroke-width: 1.5;
        stroke-linecap: round;
        opacity: 0.3;
      }
      .tick.quarter {
        stroke-width: 2.5;
        opacity: 0.7;
      }
      .hand {
        fill: var(--primary-text-color);
        /* Discrete quartz ticks; also prevents a 359°→0° spin-back animation. */
        transition: none;
      }
      .hand.second {
        fill: var(--silk-accent);
      }
      .cap {
        fill: var(--primary-text-color);
      }
    `],m([b({attribute:!1})],Gt.prototype,"hass",2),m([h()],Gt.prototype,"_config",2),m([h()],Gt.prototype,"_now",2),Gt=m([x("silk-clock-card")],Gt);var Mr={type:"silk-dial-card",name:"Silk Dial",description:"A thermostat dial worthy of your wall."},Rl=2,Hl=800,Ar=2e3,Ll=4,Nl={heat:"mdi:fire",cool:"mdi:snowflake",heat_cool:"mdi:sun-snowflake-variant",auto:"mdi:thermostat-auto",dry:"mdi:water-percent",fan_only:"mdi:fan",off:"mdi:power"},Pr="silk-dial-card-editor";E(Pr,[{name:"entity",required:!0,selector:{entity:{domain:["climate"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var Wi=200,et=Wi/2,Yi=270,ri=-135,Sr=49,Il=87,Fl=95,Dl=83,Ul=97,zl=77,jl=84,Gi=70;function Ki(a,s,t){let e=(ri+Yi*a)*Math.PI/180,i=Math.sin(e),n=-Math.cos(e);return{x1:(et+s*i).toFixed(2),y1:(et+s*n).toFixed(2),x2:(et+t*i).toFixed(2),y2:(et+t*n).toFixed(2)}}var ql=Array.from({length:Sr},(a,s)=>{let t=s/(Sr-1);return{frac:t,line:Ki(t,Il,Fl)}});function Bt(a){if(a==null||a==="")return;let s=Number(a);return Number.isFinite(s)?s:void 0}function si(a){let s=String(a),t=s.indexOf(".");return t<0?0:Math.min(s.length-t-1,2)}function Bi(a){let s=a.replace(/_/g," ");return s.charAt(0).toUpperCase()+s.slice(1)}var Z=class extends y{constructor(){super(...arguments);this._pressed=!1;this._dragging=!1;this._dragKey="target";this._centerX=0;this._centerY=0;this._startX=0;this._startY=0}static getStubConfig(t){return{type:"custom:silk-dial-card",entity:Object.keys(t.states).find(i=>i.startsWith("climate."))}}static async getConfigElement(){return document.createElement(Pr)}setConfig(t){if(!t.entity||O(t.entity)!=="climate")throw new Error("silk-dial-card: `entity` is required and must be a climate entity");this._config=t,this._optTarget=this._optLow=this._optHigh=this._optMode=void 0}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:3}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),window.clearTimeout(this._modeHoldTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(t){if(!t.has("hass")||!this._config||!this.hass)return;let i=t.get("hass")?.states[this._config.entity],n=this.hass.states[this._config.entity];if(!(!n||n===i)){if(this._sendTimer===void 0&&!this._pressed){let r=i?.attributes,o=n.attributes;this._optTarget!==void 0&&o.temperature!==r?.temperature&&(this._optTarget=void 0),this._optLow!==void 0&&o.target_temp_low!==r?.target_temp_low&&(this._optLow=void 0),this._optHigh!==void 0&&o.target_temp_high!==r?.target_temp_high&&(this._optHigh=void 0)}this._optMode!==void 0&&n.state!==i?.state&&(this._optMode=void 0)}}_stateObj(){return this._config?this.hass?.states[this._config.entity]:void 0}_bounds(t){let e=t.attributes,i=Bt(e.min_temp)??7,n=Bt(e.max_temp)??35,r=n>i?n:i+1,o=Bt(e.target_temp_step);return{min:i,max:r,step:o!==void 0&&o>0?o:.5}}_isRange(t){return L(t,Rl)}_target(t){return this._optTarget??Bt(t.attributes.temperature)}_low(t){return this._optLow??Bt(t.attributes.target_temp_low)}_high(t){return this._optHigh??Bt(t.attributes.target_temp_high)}_frac(t,e,i){return P((t-e)/(i-e),0,1)}_tempUnit(){return this.hass.config?.unit_system?.temperature??"\xB0"}_valueFromPointer(t,e){let{min:i,max:n,step:r}=this._bounds(e),o=Math.atan2(t.clientX-this._centerX,this._centerY-t.clientY)*180/Math.PI,d=(P(o,ri,ri+Yi)-ri)/Yi,u=i+d*(n-i),f=Math.round((u-i)/r)*r+i;return P(Number(f.toFixed(si(r))),i,n)}_onPointerDown(t){let e=this._stateObj();if(!e||_(e))return;t.stopPropagation();let i=t.currentTarget;i.setPointerCapture(t.pointerId);let n=i.getBoundingClientRect();this._centerX=n.left+n.width/2,this._centerY=n.top+n.height/2,this._startX=t.clientX,this._startY=t.clientY,this._pressed=!0,this._dragging=!1}_onPointerMove(t){if(!this._pressed)return;let e=this._stateObj();if(e){if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<Ll)return;this._dragging=!0,this._dragKey=this._pickDragKey(t,e)}this._applyDrag(t,e)}}_onPointerUp(){if(this._pressed){if(this._pressed=!1,!this._dragging){this._config&&C(this,this._config.entity);return}this._dragging=!1,T(this)}}_onPointerCancel(){this._pressed=!1,this._dragging=!1}_swallowClick(t){t.stopPropagation()}_pickDragKey(t,e){if(!this._isRange(e))return"target";let i=this._valueFromPointer(t,e),{min:n,max:r}=this._bounds(e),o=this._low(e)??n,c=this._high(e)??r;return Math.abs(i-o)<=Math.abs(i-c)?"low":"high"}_applyDrag(t,e){let i=this._valueFromPointer(t,e),{min:n,max:r,step:o}=this._bounds(e),c=si(o),d=u=>Number(u.toFixed(c));if(this._dragKey==="low"){let u=this._high(e)??r;this._optLow=d(P(i,n,u))}else if(this._dragKey==="high"){let u=this._low(e)??n;this._optHigh=d(P(i,u,r))}else{if(this._optTarget===i)return;this._optTarget=i}this._queueCommit()}_onStep(t,e){t.stopPropagation(),this._nudge(e)}_onKeydown(t){let e=t.key==="ArrowUp"||t.key==="ArrowRight"?1:t.key==="ArrowDown"||t.key==="ArrowLeft"?-1:0;e&&(t.preventDefault(),t.stopPropagation(),this._nudge(e))}_nudge(t){let e=this._stateObj();if(!e||_(e))return;let{min:i,max:n,step:r}=this._bounds(e),o=si(r),c=u=>Number(u.toFixed(o)),d=Bt(e.attributes.current_temperature)??(i+n)/2;if(this._isRange(e)){let u=this._low(e)??d,f=this._high(e)??d,g=t*r;if(u+g<i&&(g=i-u),f+g>n&&(g=n-f),g===0)return;this._optLow=c(u+g),this._optHigh=c(f+g)}else{let u=this._target(e)??d;this._optTarget=c(P(u+t*r,i,n))}T(this,"selection"),this._queueCommit()}_queueCommit(){window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},Hl)}_commit(){let t=this.hass,e=this._config?.entity,i=e?t?.states[e]:void 0;if(!t||!e||!i)return;let n={entity_id:e};if(this._isRange(i)){let r=this._low(i),o=this._high(i);if(r===void 0||o===void 0)return;n.target_temp_low=r,n.target_temp_high=o}else{let r=this._target(i);if(r===void 0)return;n.temperature=r}t.callService("climate","set_temperature",n),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optTarget=this._optLow=this._optHigh=void 0},Ar)):this._optTarget=this._optLow=this._optHigh=void 0}_onMode(t,e){t.stopPropagation();let i=this.hass,n=this._stateObj();!i||!this._config||!n||_(n)||(this._optMode??n.state)!==e&&(this._optMode=e,T(this),i.callService("climate","set_hvac_mode",{entity_id:this._config.entity,hvac_mode:e}),window.clearTimeout(this._modeHoldTimer),this._modeHoldTimer=window.setTimeout(()=>{this._optMode=void 0},Ar))}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=this._optMode!==void 0&&this._optMode!==i.state?{...i,state:this._optMode}:i,o=S(r),c=t.name??i.attributes.friendly_name??t.entity,{min:d,max:u,step:f}=this._bounds(i),g=si(f),v=this._isRange(i),$=v?void 0:this._target(i),A=v?this._low(i):void 0,M=v?this._high(i):void 0,I=Bt(i.attributes.current_temperature),F=v&&A!==void 0?this._frac(A,d,u):0,H=v?M!==void 0?this._frac(M,d,u):-1:$!==void 0?this._frac($,d,u):-1,U=n||H<0,W=v?A!==void 0&&M!==void 0?`${A.toFixed(g)} \u2013 ${M.toFixed(g)}`:"\u2013":$!==void 0?$.toFixed(g):"\u2013",q=i.attributes.hvac_action,X=q&&q!=="off"?Bi(q):void 0;return l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="name">${c}</div>
        <div class="dial-area">
          <div
            class="stage ${this._pressed?"pressed":""} ${this._dragging?"dragging":""}"
            role="slider"
            tabindex=${n?-1:0}
            aria-label=${`${c} target temperature`}
            aria-valuemin=${d}
            aria-valuemax=${u}
            aria-valuenow=${v?M??d:$??d}
            aria-valuetext=${`${W}${this._tempUnit()}`}
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @keydown=${this._onKeydown}
            @click=${this._swallowClick}
          >
            ${this._renderDial(i,{range:v,min:d,max:u,target:$,low:A,high:M,current:I,litFrom:F,litTo:H,dimmed:U})}
            <div class="center">
              <div class="target-line ${v?"range":""}">
                <span class="target">${W}</span
                ><span class="deg">${this._tempUnit()}</span>
              </div>
              <div class="sub">
                ${I!==void 0?l`Currently ${Math.round(I*10)/10}°`:p}${I!==void 0&&X?l`<span class="sep">·</span>`:p}${X??p}
              </div>
            </div>
            <button
              class="step minus"
              ?disabled=${n}
              aria-label="Decrease target temperature"
              @pointerdown=${it=>it.stopPropagation()}
              @click=${it=>this._onStep(it,-1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <button
              class="step plus"
              ?disabled=${n}
              aria-label="Increase target temperature"
              @pointerdown=${it=>it.stopPropagation()}
              @click=${it=>this._onStep(it,1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        ${this._renderModes(i,n)}
      </ha-card>
    `}_renderDial(t,e){let n=[];e.range?(e.low!==void 0&&n.push(this._frac(e.low,e.min,e.max)),e.high!==void 0&&n.push(this._frac(e.high,e.min,e.max))):e.target!==void 0&&n.push(this._frac(e.target,e.min,e.max));let r=e.current!==void 0?Ki(this._frac(e.current,e.min,e.max),zl,jl):void 0;return l`
      <svg viewBox="0 0 ${Wi} ${Wi}" aria-hidden="true">
        <defs>
          <!-- Neutral inset shading only: black-alpha, no chroma. -->
          <radialGradient id="silk-dial-inset">
            <stop offset="70%" stop-color="rgba(0, 0, 0, 0)"></stop>
            <stop offset="94%" stop-color="rgba(0, 0, 0, 0.05)"></stop>
            <stop offset="100%" stop-color="rgba(0, 0, 0, 0.12)"></stop>
          </radialGradient>
        </defs>
        ${ql.map(o=>z`<line
            class="tick ${!e.dimmed&&o.frac>=e.litFrom-1e-6&&o.frac<=e.litTo+1e-6?"on":""}"
            x1=${o.line.x1} y1=${o.line.y1} x2=${o.line.x2} y2=${o.line.y2}
          ></line>`)}
        ${r?z`<line class="tick-current"
                x1=${r.x1} y1=${r.y1}
                x2=${r.x2} y2=${r.y2}
              ></line>`:p}
        ${n.map(o=>{let c=Ki(o,Dl,Ul);return z`<line class="tick-target ${e.dimmed?"":"on"}"
            x1=${c.x1} y1=${c.y1} x2=${c.x2} y2=${c.y2}
          ></line>`})}
        <g class="face-g">
          <circle class="face" cx=${et} cy=${et} r=${Gi}></circle>
          <!-- Paint-server ref stays an attribute: CSS url(#id) is unreliable in shadow DOM. -->
          <circle class="face-inset" cx=${et} cy=${et} r=${Gi} fill="url(#silk-dial-inset)"></circle>
          <circle class="face-rim" cx=${et} cy=${et} r=${Gi-2.5}></circle>
        </g>
      </svg>
    `}_renderModes(t,e){let i=t.attributes.hvac_modes;if(!i?.length)return p;let n=this._optMode??t.state;return l`
      <div class="modes">
        ${i.map(r=>l`
            <button
              class="chip mode ${r===n?"active":""}"
              ?disabled=${e}
              aria-label=${Bi(r)}
              title=${Bi(r)}
              @click=${o=>this._onMode(o,r)}
            >
              <ha-icon .icon=${Nl[r]??"mdi:thermostat"}></ha-icon>
            </button>
          `)}
      </div>
    `}};Z.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px 12px;
      }
      .name {
        flex: none;
        max-width: 100%;
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .dial-area {
        flex: 1;
        align-self: stretch;
        min-height: 160px;
        min-width: 0;
        display: grid;
        place-items: center;
        container-type: size;
      }
      .stage {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        max-width: 100%;
        max-height: 100%;
        /* Square that fits the area; falls back to width:100% without cq units. */
        width: min(100cqw, 100cqh);
        border-radius: 50%;
        outline: none;
        cursor: grab;
        touch-action: none;
      }
      .stage.pressed {
        cursor: grabbing;
      }
      .stage:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .tick {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 2;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .tick.on {
        stroke: var(--silk-accent);
      }
      .tick-target {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        stroke-width: 3.5;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .tick-target.on {
        stroke: var(--silk-accent);
      }
      .tick-current {
        stroke: var(--secondary-text-color);
        stroke-width: 2.5;
        stroke-linecap: round;
        opacity: 0.7;
      }
      .stage.dragging .tick,
      .stage.dragging .tick-target {
        transition: none;
      }
      /*
       * Skeuomorphic face: neutral monochrome depth only — a gray disc from
       * the text color (darker-on-light, lighter-on-dark), a hairline bezel,
       * a black-alpha machined rim, and black-alpha inset shading. The accent
       * stays confined to the tick ring.
       */
      .face {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
      }
      .face-inset {
        stroke: none;
        pointer-events: none;
      }
      .face-rim {
        fill: none;
        stroke: rgba(0, 0, 0, 0.08);
        stroke-width: 2;
      }
      .face-g {
        transform-origin: ${et}px ${et}px;
        transition: transform 250ms var(--silk-spring);
      }
      .stage.pressed .face-g {
        transform: scale(0.97);
        transition: transform 120ms var(--silk-ease-out);
      }
      .center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        max-width: 62%;
        pointer-events: none;
      }
      .target-line {
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .target {
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.05;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .deg {
        font-size: 15px;
        font-weight: 500;
        line-height: 1;
        margin-top: 2px;
        color: var(--secondary-text-color);
      }
      .target-line.range .target {
        font-size: 21px;
        line-height: 1.2;
      }
      .target-line.range .deg {
        font-size: 12px;
        margin-top: 1px;
      }
      .sub {
        margin-top: 2px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .step {
        position: absolute;
        bottom: 1%;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        z-index: 1;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease;
      }
      .step.minus {
        left: 6%;
      }
      .step.plus {
        right: 6%;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        cursor: default;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .modes {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        max-width: 100%;
      }
      .chip.mode {
        min-width: 40px;
        height: 30px;
        padding: 0;
        display: grid;
        place-items: center;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .chip.mode:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip.mode:disabled {
        cursor: default;
      }
      .chip.mode ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      .unavailable .name,
      .unavailable .dial-area,
      .unavailable .modes {
        opacity: 0.45;
      }
      .unavailable .stage {
        cursor: default;
      }
    `],m([b({attribute:!1})],Z.prototype,"hass",2),m([h()],Z.prototype,"_config",2),m([h()],Z.prototype,"_optTarget",2),m([h()],Z.prototype,"_optLow",2),m([h()],Z.prototype,"_optHigh",2),m([h()],Z.prototype,"_optMode",2),m([h()],Z.prototype,"_pressed",2),m([h()],Z.prototype,"_dragging",2),Z=m([x("silk-dial-card")],Z);var Or={type:"silk-humidifier-card",name:"Silk Humidifier",description:"Target humidity at a drag."},Vl=3,Gl=2e3,Rr="silk-humidifier-card-editor";E(Rr,[{name:"entity",required:!0,selector:{entity:{domain:["humidifier"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var ot=class extends y{static getStubConfig(s){return{type:"custom:silk-humidifier-card",entity:Object.keys(s.states).find(e=>e.startsWith("humidifier."))}}static async getConfigElement(){return document.createElement(Rr)}setConfig(s){if(!s.entity)throw new Error("silk-humidifier-card: `entity` is required");if(O(s.entity)!=="humidifier")throw new Error(`silk-humidifier-card: \`entity\` must be a humidifier.* entity, got \`${s.entity}\``);this._config=s,this._dragTarget=void 0,this._lastUpdated=void 0,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optTimer),this._optTimer=void 0}willUpdate(s){if(!s.has("hass")||!this._config)return;let t=this.hass?.states[this._config.entity]?.last_updated;if(t&&t!==this._lastUpdated){let e=this._lastUpdated!==void 0;this._lastUpdated=t,e&&this._clearOptimistic()}}_asNumber(s){let t=Number(s);return s!=null&&s!==""&&Number.isFinite(t)?t:void 0}_effectiveTarget(s){return this._dragTarget??this._optTarget??this._asNumber(s.attributes.humidity)}_effectiveOn(s){return this._optOn??R(s)}_setOptimistic(s){s.on!==void 0&&(this._optOn=s.on),s.target!==void 0&&(this._optTarget=s.target),s.mode!==void 0&&(this._optMode=s.mode),window.clearTimeout(this._optTimer),this._optTimer=window.setTimeout(()=>this._clearOptimistic(),Gl)}_clearOptimistic(){window.clearTimeout(this._optTimer),this._optTimer=void 0,this._optOn=void 0,this._optTarget=void 0,this._optMode=void 0}_onIconClick(s){if(s.stopPropagation(),!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||_(t))return;let e=!this._effectiveOn(t);j(this.hass,this._config.entity),this._setOptimistic({on:e}),T(this)}_onSlide(s){this._dragTarget=s.detail.value}_onSliderChange(s){let t=s.detail.value;this._dragTarget=void 0,!(!this.hass||!this._config)&&(this.hass.callService("humidifier","set_humidity",{entity_id:this._config.entity,humidity:t}),this._setOptimistic({target:t}),T(this))}_onModeClick(s,t){s.stopPropagation(),!(!this.hass||!this._config)&&(this.hass.callService("humidifier","set_mode",{entity_id:this._config.entity,mode:t}),this._setOptimistic({mode:t}),T(this))}_onCardClick(s){s.target.localName!=="silk-slider"&&this._config&&C(this,this._config.entity)}render(){if(!this._config||!this.hass)return p;let s=this._config,t=this.hass.states[s.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let e=_(t),i=!e&&this._effectiveOn(t),n=this._effectiveTarget(t),r=this._asNumber(t.attributes.min_humidity)??0,o=this._asNumber(t.attributes.max_humidity)??100,c=s.name??t.attributes.friendly_name??s.entity,d=(t.attributes.available_modes??[]).slice(0,Vl),u=this._optMode??t.attributes.mode;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${S(t,s.color)}"
        @click=${this._onCardClick}
      >
        <silk-slider
          fill
          .value=${n??r}
          .min=${r}
          .max=${o}
          .step=${1}
          .disabled=${e}
          @slide=${this._onSlide}
          @change=${this._onSliderChange}
        ></silk-slider>
        <button
          class="icon ${i?"on":""}"
          .disabled=${e}
          aria-label=${i?`Turn off ${c}`:`Turn on ${c}`}
          @click=${this._onIconClick}
        >
          ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${c}</div>
          <div class="state">${this._renderStateLine(t,i,n)}</div>
        </div>
        ${d.length?l`
              <div class="trailing">
                ${d.map(f=>l`
                    <button
                      class="chip ${f===u?"active":""}"
                      .disabled=${e}
                      @click=${g=>this._onModeClick(g,f)}
                    >
                      ${f}
                    </button>
                  `)}
              </div>
            `:p}
      </ha-card>
    `}_renderStateLine(s,t,e){let n=this._optOn!==void 0&&!_(s)?t?"On":"Off":N(this.hass,s),r=this._asNumber(s.attributes.current_humidity);return l`${n}${e!==void 0?l`<span class="sep">·</span>target ${Math.round(e)}%`:p}${r!==void 0?l`<span class="sep">·</span>now ${Math.round(r)}%`:p}`}};ot.styles=[k],m([b({attribute:!1})],ot.prototype,"hass",2),m([h()],ot.prototype,"_config",2),m([h()],ot.prototype,"_dragTarget",2),m([h()],ot.prototype,"_optOn",2),m([h()],ot.prototype,"_optTarget",2),m([h()],ot.prototype,"_optMode",2),ot=m([x("silk-humidifier-card")],ot);var Fr={type:"silk-color-card",name:"Silk Color",description:"Pick a light color like an artist."},Dr="silk-color-card-editor";E(Dr,[{name:"entity",required:!0,selector:{entity:{domain:["light"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var Bl=2e3,Hr=140,Lr=180/Math.PI,Wl=new Set(["hs","rgb","xy","rgbw","rgbww"]),Yl=[{kelvin:2700,rgb:[255,169,87]},{kelvin:4e3,rgb:[255,209,163]},{kelvin:6500,rgb:[255,249,253]}],Nr=[[35,75],[215,55],[305,65]];function Xi(a,s){let t=P(s,0,100)/100,e=(a%360+360)%360,i=t,n=e/60,r=i*(1-Math.abs(n%2-1)),o=n<1?[i,r,0]:n<2?[r,i,0]:n<3?[0,i,r]:n<4?[0,r,i]:n<5?[r,0,i]:[i,0,r],c=1-i;return[Math.round((o[0]+c)*255),Math.round((o[1]+c)*255),Math.round((o[2]+c)*255)]}function Ur(a){let s=P(a[0],0,255)/255,t=P(a[1],0,255)/255,e=P(a[2],0,255)/255,i=Math.max(s,t,e),n=Math.min(s,t,e),r=i-n,o=0;return r>0&&(i===s?o=60*((t-e)/r%6):i===t?o=60*((e-s)/r+2):o=60*((s-t)/r+4)),[(o+360)%360,i===0?0:r/i*100]}var Ir=a=>`rgb(${a[0]},${a[1]},${a[2]})`;function Qi(a){let s=a.attributes.supported_color_modes;return Array.isArray(s)&&s.some(t=>Wl.has(String(t)))}function Kl(a){let s=a.attributes.supported_color_modes;return Array.isArray(s)&&s.some(t=>String(t)==="color_temp")}function Xl(a){let s=a.attributes.hs_color;if(Array.isArray(s)&&s.length>=2&&Number.isFinite(Number(s[0]))&&Number.isFinite(Number(s[1])))return[Number(s[0]),Number(s[1])];let t=a.attributes.rgb_color;return Array.isArray(t)&&t.length>=3?Ur([Number(t[0]),Number(t[1]),Number(t[2])]):[0,0]}var ht=class extends y{constructor(){super(...arguments);this._optimisticHs=null;this._optimisticOn=null;this._optimisticPct=null;this._favorites=Nr;this._dragging=!1;this._sliding=!1;this._painted=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("light."));return{type:"custom:silk-color-card",entity:e.find(n=>Qi(t.states[n]))??e[0]}}static async getConfigElement(){return document.createElement(Dr)}setConfig(t){if(!t.entity)throw new Error("silk-color-card: `entity` is required");if(O(t.entity)!=="light")throw new Error(`silk-color-card: \`entity\` must be a light (got "${t.entity}")`);if(t.favorites!==void 0){if(!(Array.isArray(t.favorites)&&t.favorites.every(i=>Array.isArray(i)&&i.length>=2&&Number.isFinite(Number(i[0]))&&Number.isFinite(Number(i[1])))))throw new Error("silk-color-card: `favorites` must be a list of [hue, saturation] pairs");this._favorites=t.favorites.map(i=>[(Number(i[0])%360+360)%360,P(Number(i[1]),0,100)])}else this._favorites=Nr;this._config=t,this._painted=!1,this._clearOptimistic()}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:3}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,!this._dragging&&!this._sliding&&this._clearOptimistic())}updated(){this._paintWheel()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticHs=null,this._optimisticOn=null,this._optimisticPct=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Bl)}_paintWheel(){if(this._painted)return;let t=this.renderRoot.querySelector("canvas");if(!(t instanceof HTMLCanvasElement))return;let e=Math.min(window.devicePixelRatio||1,2),i=Math.round(Hr*e);t.width=i,t.height=i;let n=t.getContext("2d");if(!n)return;let r=n.createImageData(i,i),o=r.data,c=i/2;for(let d=0;d<i;d++)for(let u=0;u<i;u++){let f=u-c+.5,g=d-c+.5,v=Math.hypot(f,g);if(v>c)continue;let $=(Math.atan2(g,f)*Lr+360)%360,A=Math.min(v/c,1)*100,[M,I,F]=Xi($,A),H=(d*i+u)*4;o[H]=M,o[H+1]=I,o[H+2]=F,o[H+3]=Math.round(P(c-v,0,1)*255)}n.putImageData(r,0,0),this._painted=!0}_hsFromPointer(t){let e=t.currentTarget.getBoundingClientRect(),i=t.clientX-(e.left+e.width/2),n=t.clientY-(e.top+e.height/2),r=(Math.atan2(n,i)*Lr+360)%360,o=P(Math.hypot(i,n)/(e.width/2),0,1)*100;return[Math.round(r*10)/10,Math.round(o*10)/10]}_displayOn(t){return this._optimisticOn??t.state==="on"}_onWheelDown(t){let e=this.hass?.states[this._config?.entity??""];!e||_(e)||this._displayOn(e)&&(t.currentTarget.setPointerCapture(t.pointerId),this._dragging=!0,this._optimisticHs=this._hsFromPointer(t))}_onWheelMove(t){this._dragging&&(this._optimisticHs=this._hsFromPointer(t))}_onWheelUp(){if(!this._dragging)return;this._dragging=!1;let t=this._optimisticHs,e=this._config;!t||!e||!this.hass||(T(this),this._optimisticOn=!0,this._holdOptimistic(),this.hass.callService("light","turn_on",{entity_id:e.entity,hs_color:[Math.round(t[0]),Math.round(t[1])]}))}_onWheelCancel(){this._dragging&&(this._dragging=!1,this._optimisticHs=null)}_onWheelClick(t){let e=this.hass?.states[this._config?.entity??""];e&&!_(e)&&this._displayOn(e)&&t.stopPropagation()}_onSwatch(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];!r||_(r)||(T(this,"selection"),this._optimisticHs=e.hs,this._optimisticOn=!0,this._holdOptimistic(),e.kelvin!==void 0?n.callService("light","turn_on",{entity_id:i.entity,color_temp_kelvin:e.kelvin}):n.callService("light","turn_on",{entity_id:i.entity,hs_color:[Math.round(e.hs[0]),Math.round(e.hs[1])]}))}_onSlide(t){this._sliding=!0,this._optimisticPct=t.detail.value,this._optimisticOn=t.detail.value>0}_onSliderChange(t){this._sliding=!1;let e=this._config;if(!e||!this.hass)return;let i=t.detail.value;this._optimisticPct=i,this._optimisticOn=i>0,this._holdOptimistic(),T(this),i<=0?this.hass.callService("light","turn_off",{entity_id:e.entity}):this.hass.callService("light","turn_on",{entity_id:e.entity,brightness_pct:i})}_onIconClick(t){t.stopPropagation();let e=this._config;if(!e||!this.hass)return;let i=this.hass.states[e.entity];if(!i||_(i))return;let n=this._displayOn(i);T(this),j(this.hass,e.entity),this._optimisticOn=!n,this._optimisticPct=null,this._holdOptimistic()}_onCardClick(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];if(i&&!_(i)&&Qi(i)&&!this._displayOn(i)){T(this),this._optimisticOn=!0,this._holdOptimistic(),e.callService("light","turn_on",{entity_id:t.entity});return}C(this,t.entity)}_stopClick(t){t.stopPropagation()}_displayPct(t,e){if(this._optimisticPct!==null)return this._optimisticPct;if(!e)return 0;let i=t.attributes.brightness;return typeof i!="number"?null:P(Math.round(i/255*100),1,100)}_swatches(t){let e=Kl(t),i=Yl.map(r=>({rgb:r.rgb,hs:Ur(r.rgb),kelvin:e?r.kelvin:void 0,label:`${r.kelvin} K white`})),n=this._favorites.map((r,o)=>({rgb:Xi(r[0],r[1]),hs:r,label:`Favorite ${o+1}`}));return[...i,...n]}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=!n&&i.state==="on",o=n?!1:this._displayOn(i),c=S(i,t.color),d=t.name??i.attributes.friendly_name??t.entity,u=n||o===r?N(e,i):o?"On":"Off",f=this._optimisticOn===null?i:{...i,state:o?"on":"off"},g=t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${f}></ha-state-icon>`;if(!Qi(i))return l`
        <ha-card
          class="control ${n?"unavailable":""}"
          style="--silk-accent:${c}"
          @click=${this._onCardClick}
        >
          <button
            class="icon ${o?"on":""}"
            ?disabled=${n}
            aria-label=${`Toggle ${d}`}
            @click=${this._onIconClick}
          >
            ${g}
          </button>
          <div class="info">
            <div class="name">${d}</div>
            <div class="state">${u}<span class="sep">·</span>No color support</div>
          </div>
          <div class="trailing">
            <button
              class="switch ${o?"checked":""}"
              role="switch"
              aria-checked=${o?"true":"false"}
              aria-label=${`Toggle ${d}`}
              ?disabled=${n}
              @click=${this._onIconClick}
            >
              <span class="thumb"></span>
            </button>
          </div>
        </ha-card>
      `;let v=n?0:this._displayPct(i,o),$=this._optimisticHs??Xl(i),A=P($[1],0,100)/100*50,M=$[0]*Math.PI/180,I=50+A*Math.cos(M),F=50+A*Math.sin(M),H=Ir(Xi($[0],$[1])),U=o&&v!==null&&!n;return l`
      <ha-card
        class="control wheel ${n?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <button
            class="icon ${o?"on":""}"
            ?disabled=${n}
            aria-label=${`Toggle ${d}`}
            @click=${this._onIconClick}
          >
            ${g}
          </button>
          <div class="info">
            <div class="name">${d}</div>
            <div class="state">
              ${u}${U?l`<span class="sep">·</span>${v}%`:p}
            </div>
          </div>
        </div>
        <div class="wheelwrap ${o?"":"off"}">
          <div
            class="wheelbox"
            aria-label=${`Color wheel for ${d}`}
            @pointerdown=${this._onWheelDown}
            @pointermove=${this._onWheelMove}
            @pointerup=${this._onWheelUp}
            @pointercancel=${this._onWheelCancel}
            @click=${this._onWheelClick}
          >
            <canvas aria-hidden="true"></canvas>
            <div
              class="thumb"
              style="left:${I.toFixed(2)}%;top:${F.toFixed(2)}%;background:${H}"
            ></div>
          </div>
        </div>
        <div class="swatches">
          ${this._swatches(i).map(W=>l`
              <button
                class="swatch"
                style="background:${Ir(W.rgb)}"
                aria-label=${W.label}
                title=${W.label}
                ?disabled=${n}
                @click=${q=>this._onSwatch(q,W)}
              ></button>
            `)}
        </div>
        <silk-slider
          class="brightness"
          .value=${o?v??100:0}
          min="1"
          max="100"
          step="1"
          ?disabled=${n}
          aria-label=${`Brightness for ${d}`}
          @slide=${this._onSlide}
          @change=${this._onSliderChange}
          @click=${this._stopClick}
        ></silk-slider>
      </ha-card>
    `}};ht.styles=[k,w`
      ha-card.wheel {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .wheelwrap {
        flex: 1;
        min-height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 200ms ease;
      }
      .wheelwrap.off {
        opacity: 0.4;
      }
      .wheelbox {
        position: relative;
        height: 100%;
        max-height: ${Hr}px;
        max-width: 100%;
        aspect-ratio: 1;
        touch-action: none;
        cursor: pointer;
      }
      canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        border-radius: 50%;
      }
      /* Faint rim so the disc holds its shape against any card background. */
      .wheelbox::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        pointer-events: none;
      }
      /* No transition on the thumb: it tracks the finger and snaps to state. */
      .thumb {
        position: absolute;
        width: 14px;
        height: 14px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow:
          0 1px 4px rgba(0, 0, 0, 0.35),
          0 0 0 1px rgba(0, 0, 0, 0.08);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      .swatches {
        flex: none;
        display: flex;
        justify-content: center;
        gap: 7px;
      }
      .swatch {
        position: relative;
        flex: none;
        width: 22px;
        height: 22px;
        border: none;
        padding: 0;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
        transition: transform 250ms var(--silk-spring);
      }
      .swatch:active {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts the touch target to ~36px. */
      .swatch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 50%;
      }
      .swatch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .swatch:disabled {
        cursor: default;
      }
      .brightness {
        flex: none;
        --silk-slider-height: 36px;
      }
      .unavailable .wheelwrap,
      .unavailable .swatches,
      .unavailable .brightness {
        opacity: 0.45;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
      /* Plain-toggle fallback switch (mirrors silk-toggle-card). */
      .switch {
        flex: none;
        position: relative;
        width: 46px;
        height: 28px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      .switch::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .switch:disabled {
        cursor: default;
      }
      .switch .thumb {
        position: static;
        display: block;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(18px);
      }
    `],m([b({attribute:!1})],ht.prototype,"hass",2),m([h()],ht.prototype,"_config",2),m([h()],ht.prototype,"_optimisticHs",2),m([h()],ht.prototype,"_optimisticOn",2),m([h()],ht.prototype,"_optimisticPct",2),ht=m([x("silk-color-card")],ht);var jr={type:"silk-select-card",name:"Silk Select",description:"Options as chips, not dropdowns."},Ql=4,Zl=2e3,qr=["select","input_select"],Vr="silk-select-card-editor";E(Vr,[{name:"entity",required:!0,selector:{entity:{domain:qr}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var zr=a=>a.replace(/_/g," "),Wt=class extends y{constructor(){super(...arguments);this._optimistic=null}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-select-card",entity:e.find(n=>n.startsWith("select."))??e.find(n=>n.startsWith("input_select."))}}static async getConfigElement(){return document.createElement(Vr)}setConfig(t){if(!t.entity)throw new Error("silk-select-card: `entity` is required");if(!qr.includes(O(t.entity)))throw new Error(`silk-select-card: \`entity\` must be a select or input_select (got "${t.entity}")`);if(t.chip_limit!==void 0&&!(Number(t.chip_limit)>=1))throw new Error("silk-select-card: `chip_limit` must be a number of at least 1");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._clearOptimistic())}updated(){let t=this.renderRoot.querySelector("select"),e=this._currentOption();t&&e!==null&&t.value!==e&&(t.value=e)}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_currentOption(){if(this._optimistic!==null)return this._optimistic;let t=this.hass?.states[this._config?.entity??""];return t?t.state:null}_pick(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];!n||_(n)||(T(this,"selection"),this._optimistic=t,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Zl),i.callService(O(e.entity),"select_option",{entity_id:e.entity,option:t}))}_onChipClick(t,e){t.stopPropagation(),e!==this._currentOption()&&this._pick(e)}_onSelectChange(t){t.stopPropagation();let e=t.currentTarget.value;e!==""&&e!==this._currentOption()&&this._pick(e)}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_renderChips(t,e,i){return l`
      ${t.map(n=>{let r=n===e;return l`
          <button
            class="chip ${r?"active":""}"
            aria-pressed=${r?"true":"false"}
            title=${n}
            ?disabled=${i}
            @click=${o=>this._onChipClick(o,n)}
          >
            ${zr(n)}
          </button>
        `})}
    `}_renderDropdown(t,e,i,n){return l`
      <span class="selectwrap" @click=${this._stopClick}>
        <select
          aria-label=${`Option for ${n}`}
          ?disabled=${i}
          @change=${this._onSelectChange}
          @click=${this._stopClick}
        >
          ${t.map(r=>l`
              <option value=${r} ?selected=${r===e}>${zr(r)}</option>
            `)}
        </select>
        <ha-icon class="chevron" .icon=${"mdi:chevron-down"}></ha-icon>
      </span>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=Array.isArray(i.attributes.options)?i.attributes.options.map(String):[],o=t.chip_limit??Ql,c=this._optimistic??i.state,d=this._optimistic===null?i:{...i,state:this._optimistic},u=S(i,t.color),f=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${u}"
        @click=${this._onCardClick}
      >
        <!-- The select card has no icon action: the icon presses with the card. -->
        <div class="icon ${!n&&R(d)?"on":""}">
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${d}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${f}</div>
          <div class="state">${N(e,d)}</div>
        </div>
        <div class="trailing">
          ${r.length===0?p:r.length<=o?this._renderChips(r,c,n):this._renderDropdown(r,c,n,f)}
        </div>
      </ha-card>
    `}};Wt.styles=[k,w`
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      /* Chips may wrap to a second line when the card is given the height. */
      .trailing {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 70%;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }
      .chip {
        position: relative;
        max-width: 110px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Invisible halo lifts the touch target toward the 36px floor. */
      .chip::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 999px;
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .chip:disabled {
        cursor: default;
      }
      .selectwrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        min-width: 0;
        max-width: 100%;
      }
      select {
        appearance: none;
        -webkit-appearance: none;
        border: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.4;
        padding: 5px 26px 5px 12px;
        border-radius: 999px;
        cursor: pointer;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition: background 150ms ease-out;
      }
      select:hover {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      select:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      select:disabled {
        cursor: default;
      }
      select option {
        color: var(--primary-text-color);
        background: var(--card-background-color, #fff);
      }
      .chevron {
        position: absolute;
        right: 6px;
        color: var(--silk-accent);
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
    `],m([b({attribute:!1})],Wt.prototype,"hass",2),m([h()],Wt.prototype,"_config",2),m([h()],Wt.prototype,"_optimistic",2),Wt=m([x("silk-select-card")],Wt);var Wr={type:"silk-remote-card",name:"Silk Remote",description:"A TV remote that lives on your dashboard."},Jl=1,td=8,ed=16,id=32,Gr=1024,nd=2048,sd=16384,rd=2e3,ai=120,Zi=40,Ji=44,oi=(ai-Zi)/2,Br=(ai-Ji)/2,od=["up","down","left","right","ok"],Yr="silk-remote-card-editor";E(Yr,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var at=class extends y{constructor(){super(...arguments);this._optimisticOn=null;this._optimisticPlaying=null;this._optimisticMuted=null;this._optimisticSource=null}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("media_player."));return{type:"custom:silk-remote-card",entity:e.find(n=>t.states[n].attributes.device_class==="tv")??e[0]}}static async getConfigElement(){return document.createElement(Yr)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-remote-card: define a media_player `entity` (e.g. media_player.tv)");if(t.dpad!==void 0){if(typeof t.dpad!="object"||t.dpad===null||Array.isArray(t.dpad))throw new Error("silk-remote-card: `dpad` must map up/down/left/right/ok to actions");for(let e of od){let i=t.dpad[e];if(i!==void 0){if(typeof i?.service!="string"||!i.service.includes("."))throw new Error(`silk-remote-card: dpad.${e}.service must be a "domain.service" string`);if(i.data!==void 0&&(typeof i.data!="object"||i.data===null||Array.isArray(i.data)))throw new Error(`silk-remote-card: dpad.${e}.data must be a mapping of service fields`)}}}this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:4}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}updated(){let t=this.renderRoot.querySelector(".source select");if(!t)return;let e=this._currentSource()??"";t.value!==e&&(t.value=e)}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticOn=null,this._optimisticPlaying=null,this._optimisticMuted=null,this._optimisticSource=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticOn=null,this._optimisticPlaying=null,this._optimisticMuted=null,this._optimisticSource=null},rd)}_currentSource(){if(this._optimisticSource!==null)return this._optimisticSource;let t=this._config?this.hass?.states[this._config.entity]?.attributes.source:void 0;return typeof t=="string"&&t?t:void 0}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onPowerClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];!n||_(n)||(T(this),this._optimisticOn=!(this._optimisticOn??R(n)),this._armExpiry(),j(i,e.entity))}_onSourceChange(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=t.target.value;n&&(T(this,"selection"),this._optimisticSource=n,this._armExpiry(),i.callService("media_player","select_source",{entity_id:e.entity,source:n}))}_onSimpleKey(t,e){t.stopPropagation();let i=this._config,n=this.hass;!i||!n||_(n.states[i.entity])||(T(this),n.callService("media_player",e,{entity_id:i.entity}))}_onMuteClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=this._optimisticMuted??n.attributes.is_volume_muted===!0;T(this),this._optimisticMuted=!r,this._armExpiry(),i.callService("media_player","volume_mute",{entity_id:e.entity,is_volume_muted:!r})}_onPlayPause(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;let r=this._optimisticPlaying??n.state==="playing";T(this),this._optimisticPlaying=!r,this._armExpiry(),i.callService("media_player","media_play_pause",{entity_id:e.entity})}_onPadPress(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=i.dpad?.[e];if(!r||_(n.states[i.entity]))return;let o=r.service.indexOf("."),c=r.service.slice(0,o),d=r.service.slice(o+1);T(this),n.callService(c,d,r.data?{...r.data}:void 0)}_padDir(t,e,i,n){let r=n||!this._config?.dpad?.[t];return l`
      <button
        class="dir ${t}"
        .disabled=${r}
        aria-label=${i}
        @click=${o=>this._onPadPress(o,t)}
      >
        <ha-icon .icon=${e}></ha-icon>
      </button>
    `}_key(t){return l`
      <button
        class="key ${t.on?"on":""}"
        .disabled=${t.disabled}
        aria-label=${t.label}
        @click=${t.onClick}
      >
        <ha-icon .icon=${t.icon}></ha-icon>
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=!n&&(this._optimisticOn??R(i)),o=S(i),c=t.name??i.attributes.friendly_name??t.entity,d=Array.isArray(i.attributes.source_list)?i.attributes.source_list.filter(M=>typeof M=="string"):[],u=L(i,nd)&&d.length>0,f=this._currentSource(),g=!t.dpad,v=[];if(L(i,Gr)&&v.push(this._key({icon:"mdi:volume-minus",label:"Volume down",disabled:n,onClick:M=>this._onSimpleKey(M,"volume_down")})),L(i,td)){let M=this._optimisticMuted??i.attributes.is_volume_muted===!0;v.push(this._key({icon:M?"mdi:volume-off":"mdi:volume-high",label:M?"Unmute":"Mute",disabled:n,on:M,onClick:I=>this._onMuteClick(I)}))}L(i,Gr)&&v.push(this._key({icon:"mdi:volume-plus",label:"Volume up",disabled:n,onClick:M=>this._onSimpleKey(M,"volume_up")}));let $=[];if(L(i,ed)&&$.push(this._key({icon:"mdi:skip-previous",label:"Previous track",disabled:n,onClick:M=>this._onSimpleKey(M,"media_previous_track")})),L(i,Jl)||L(i,sd)){let M=!n&&(this._optimisticPlaying??i.state==="playing");$.push(this._key({icon:M?"mdi:pause":"mdi:play",label:M?"Pause":"Play",disabled:n,onClick:I=>this._onPlayPause(I)}))}L(i,id)&&$.push(this._key({icon:"mdi:skip-next",label:"Next track",disabled:n,onClick:M=>this._onSimpleKey(M,"media_next_track")}));let A=[...v];return v.length&&$.length&&A.push(l`<span class="split" aria-hidden="true"></span>`),A.push(...$),l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="row ${u?"":"solo"}">
          <button
            class="power ${r?"on":""}"
            .disabled=${n}
            aria-label=${`Toggle ${c}`}
            @click=${this._onPowerClick}
          >
            <ha-icon icon="mdi:power"></ha-icon>
          </button>
          ${u?l`
                <div class="source" @click=${this._stopClick}>
                  <select
                    aria-label="Input source"
                    .disabled=${n}
                    @change=${this._onSourceChange}
                  >
                    <option value="" disabled hidden>Source</option>
                    ${d.map(M=>l`<option value=${M} ?selected=${M===f}>${M}</option>`)}
                  </select>
                  <ha-icon icon="mdi:chevron-down"></ha-icon>
                </div>
              `:p}
        </div>
        <div
          class="pad ${g?"dead":""}"
          title=${g?"D-pad not wired \u2014 add dpad: actions in YAML (e.g. remote.send_command)":p}
        >
          ${this._padDir("up","mdi:chevron-up","Up",n)}
          ${this._padDir("left","mdi:chevron-left","Left",n)}
          <button
            class="ok"
            .disabled=${n||!t.dpad?.ok}
            aria-label="OK"
            @click=${M=>this._onPadPress(M,"ok")}
          >
            OK
          </button>
          ${this._padDir("right","mdi:chevron-right","Right",n)}
          ${this._padDir("down","mdi:chevron-down","Down",n)}
        </div>
        ${A.length?l`<div class="keys">${A}</div>`:p}
        <div class="label" title=${c}>${c}</div>
      </ha-card>
    `}};at.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-width: 0;
      }
      .row.solo {
        justify-content: center;
      }
      /* Power key: neutral pressed-plastic dome; accent only on the glyph when on. */
      .power {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -2px 5px rgba(0, 0, 0, 0.12);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring),
          color 200ms ease;
      }
      .power:active:not(:disabled) {
        transform: scale(0.92);
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .power.on {
        color: var(--silk-accent);
      }
      .power ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .source {
        position: relative;
        flex: 1;
        min-width: 0;
        max-width: 200px;
      }
      .source select {
        width: 100%;
        height: 36px;
        appearance: none;
        -webkit-appearance: none;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        border-radius: 12px;
        padding: 0 30px 0 12px;
        font: inherit;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05),
          inset 0 -2px 4px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: background 150ms ease-out;
      }
      .source select:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .source select:disabled {
        cursor: default;
      }
      .source ha-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--secondary-text-color);
        opacity: 0.7;
        --mdc-icon-size: 16px;
      }
      /* The d-pad dish: concave neutral well; keys sit inside it. */
      .pad {
        position: relative;
        flex: none;
        width: ${ai}px;
        height: ${ai}px;
        border-radius: 50%;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow:
          inset 0 2px 6px rgba(0, 0, 0, 0.1),
          inset 0 -1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        transition: opacity 200ms ease;
      }
      .pad.dead {
        opacity: 0.4;
      }
      /* When the whole pad is dead its keys must not dim a second time. */
      .pad.dead .dir:disabled,
      .pad.dead .ok:disabled {
        opacity: 1;
      }
      .dir {
        position: absolute;
        width: ${Zi}px;
        height: ${Zi}px;
        border: none;
        border-radius: 50%;
        background: transparent;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          opacity 200ms ease;
      }
      .dir:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .dir:active:not(:disabled) {
        transform: scale(0.88);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .dir:disabled {
        cursor: default;
        opacity: 0.35;
      }
      .dir ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      .dir.up {
        top: 2px;
        left: ${oi}px;
      }
      .dir.down {
        bottom: 2px;
        left: ${oi}px;
      }
      .dir.left {
        left: 2px;
        top: ${oi}px;
      }
      .dir.right {
        right: 2px;
        top: ${oi}px;
      }
      /* Center OK: raised card-surface puck against the concave dish. */
      .ok {
        position: absolute;
        top: ${Br}px;
        left: ${Br}px;
        width: ${Ji}px;
        height: ${Ji}px;
        border-radius: 50%;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        background: var(--card-background-color, #fff);
        box-shadow:
          inset 0 1px 0 rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -3px 5px rgba(0, 0, 0, 0.1);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring);
      }
      .ok:active:not(:disabled) {
        transform: scale(0.92);
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.18);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ok:disabled {
        cursor: default;
        opacity: 0.35;
      }
      .keys {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 6px;
        width: 100%;
        min-width: 0;
      }
      .split {
        flex: none;
        width: 6px;
      }
      .key {
        flex: none;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow:
          inset 0 1px 1px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1);
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 250ms var(--silk-spring),
          color 200ms ease;
      }
      .key:active:not(:disabled) {
        transform: scale(0.92);
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.18);
        transition-duration: 100ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .key.on {
        color: var(--silk-accent);
      }
      .key:disabled {
        cursor: default;
        opacity: 0.35;
      }
      .key ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .label {
        flex: none;
        max-width: 100%;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .power:focus-visible,
      .dir:focus-visible,
      .ok:focus-visible,
      .key:focus-visible,
      .source select:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .unavailable .row,
      .unavailable .pad,
      .unavailable .keys,
      .unavailable .label {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],at.prototype,"hass",2),m([h()],at.prototype,"_config",2),m([h()],at.prototype,"_optimisticOn",2),m([h()],at.prototype,"_optimisticPlaying",2),m([h()],at.prototype,"_optimisticMuted",2),m([h()],at.prototype,"_optimisticSource",2),at=m([x("silk-remote-card")],at);var Qr={type:"silk-media-group-card",name:"Silk Media Group",description:"Group speakers with checkboxes, not gymnastics."},Kr=4,Xr=524288,ad=2e3,Zr="silk-media-group-card-editor";E(Zr,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}}],{entity:"Entity"});function cd(a,s){let t=a.attributes[s];return typeof t=="string"&&t?t:void 0}var Et=class extends y{constructor(){super(...arguments);this._optimisticGroup={};this._optimisticVolume={};this._groupBase="";this._volumeBase={}}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("media_player.")),i=e.find(r=>L(t.states[r],Xr))??e[0],n=e.filter(r=>r!==i).slice(0,3);return{type:"custom:silk-media-group-card",entity:i,players:n}}static async getConfigElement(){return document.createElement(Zr)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-media-group-card: define a media_player `entity` \u2014 the group master");if(t.players!==void 0&&(!Array.isArray(t.players)||t.players.some(e=>typeof e!="string"||O(e)!=="media_player")))throw new Error("silk-media-group-card: `players` must be a list of media_player entity ids");this._config=t,this._clearOptimistic()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config||!this.hass)return;if(Object.keys(this._optimisticGroup).length){let i=this.hass.states[this._config.entity]?.last_updated;i!==void 0&&i!==this._groupBase&&(this._optimisticGroup={})}let e=Object.keys(this._optimisticVolume).filter(i=>{let n=this.hass.states[i]?.last_updated;return n!==void 0&&n!==this._volumeBase[i]});if(e.length){let i={...this._optimisticVolume};for(let n of e)delete i[n],delete this._volumeBase[n];this._optimisticVolume=i}}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticGroup={},this._optimisticVolume={},this._volumeBase={}}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticGroup={},this._optimisticVolume={},this._volumeBase={}},ad)}_isGrouped(t){let e=this._optimisticGroup[t];if(e!==void 0)return e;let i=this._config?this.hass?.states[this._config.entity]?.attributes.group_members:void 0;return Array.isArray(i)&&i.includes(t)}_volumePct(t){let e=this._optimisticVolume[t.entity_id];if(e!==void 0)return e;let i=t.attributes.volume_level;return typeof i=="number"&&Number.isFinite(i)?Math.round(P(i,0,1)*100):0}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onCheckToggle(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];if(!r||_(r)||_(n.states[e]))return;let o=this._isGrouped(e);T(this),this._optimisticGroup={...this._optimisticGroup,[e]:!o},this._groupBase=r.last_updated,this._armExpiry(),o?n.callService("media_player","unjoin",{entity_id:e}):n.callService("media_player","join",{entity_id:i.entity,group_members:[e]})}_onVolumeChange(t,e){let i=this.hass;if(!i)return;let n=P(Math.round(t.detail.value),0,100);this._optimisticVolume={...this._optimisticVolume,[e]:n},this._volumeBase[e]=i.states[e]?.last_updated??"",this._armExpiry(),T(this),i.callService("media_player","volume_set",{entity_id:e,volume_level:n/100})}_renderPlayer(t,e,i){let r=this.hass.states[t],o=!r||_(r),c=!o&&this._isGrouped(t),d=r?.attributes.friendly_name??t,u=o||e||!i,f=c&&r!==void 0&&L(r,Kr);return l`
      <div class="player ${o?"off":""}">
        <button
          class="check ${c?"checked":""}"
          role="checkbox"
          aria-checked=${c?"true":"false"}
          aria-label=${c?`Ungroup ${d}`:`Group ${d}`}
          .disabled=${u}
          @click=${g=>this._onCheckToggle(g,t)}
        >
          <ha-icon icon="mdi:check"></ha-icon>
        </button>
        <div class="pname" title=${d}>${d}</div>
        ${f?l`
              <silk-slider
                class="pvol"
                .value=${this._volumePct(r)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${o||e}
                @change=${g=>this._onVolumeChange(g,t)}
                @click=${this._stopClick}
              ></silk-slider>
            `:p}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=!n&&R(i),o=S(i),c=t.name??i.attributes.friendly_name??t.entity,d=cd(i,"media_title")??N(e,i),u=L(i,Xr),f=L(i,Kr),g=(t.players??[]).filter(v=>v!==t.entity);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="master">
          <div class="icon ${r?"on":""}">
            <ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>
          </div>
          <div class="info">
            <div class="name">${c}</div>
            <div class="state">${d}</div>
          </div>
        </div>
        ${f?l`
              <silk-slider
                class="mvol"
                .value=${this._volumePct(i)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${n}
                @change=${v=>this._onVolumeChange(v,t.entity)}
                @click=${this._stopClick}
              ></silk-slider>
            `:p}
        ${g.length?l`
              <div class="players">
                ${g.map(v=>this._renderPlayer(v,n,u))}
              </div>
            `:l`<div class="hint">Add players: in YAML to list group candidates.</div>`}
      </ha-card>
    `}};Et.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
      }
      .master {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* No control action on the icon — it presses with the card (more-info). */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      silk-slider.mvol {
        flex: none;
        --silk-slider-height: 30px;
        position: relative;
        z-index: 1;
      }
      .players {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .player {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 32px;
        min-width: 0;
      }
      .check {
        flex: none;
        position: relative;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.35);
        background: transparent;
        box-sizing: border-box;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          border-color 200ms ease;
      }
      /* Invisible halo lifts the touch target to 40px without growing the box. */
      .check::after {
        content: '';
        position: absolute;
        inset: -10px;
        border-radius: 50%;
      }
      .check:active:not(:disabled) {
        transform: scale(0.88);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .check.checked {
        background: var(--silk-accent);
        border-color: var(--silk-accent);
      }
      .check ha-icon {
        --mdc-icon-size: 14px;
        color: var(--card-background-color, #fff);
        opacity: 0;
        transform: scale(0.6);
        transition:
          opacity 150ms ease,
          transform 250ms var(--silk-spring);
        pointer-events: none;
      }
      .check.checked ha-icon {
        opacity: 1;
        transform: scale(1);
      }
      .check:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .check:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .pname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      silk-slider.pvol {
        flex: 0 1 120px;
        min-width: 64px;
        --silk-slider-height: 24px;
        position: relative;
        z-index: 1;
      }
      .player.off .check,
      .player.off .pname,
      .player.off .pvol {
        opacity: 0.45;
      }
      .hint {
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .mvol,
      .unavailable .players,
      .unavailable .hint {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Et.prototype,"hass",2),m([h()],Et.prototype,"_config",2),m([h()],Et.prototype,"_optimisticGroup",2),m([h()],Et.prototype,"_optimisticVolume",2),Et=m([x("silk-media-group-card")],Et);var to={type:"silk-number-card",name:"Silk Number",description:"Steppers and sliders for every number helper."},eo="silk-number-card-editor";E(eo,[{name:"entity",required:!0,selector:{entity:{domain:["number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var ld=500,dd=2e3;function ci(a){if(a==null||a==="")return;let s=Number(a);return Number.isFinite(s)?s:void 0}function md(a){let s=String(a),t=s.indexOf(".");return t<0?0:Math.min(s.length-t-1,3)}function Jr(a){let s=ci(a.attributes.min)??0,t=ci(a.attributes.max),e=t!==void 0&&t>s?t:s+100,i=ci(a.attributes.step),n=i!==void 0&&i>0?i:1;return{min:s,max:e,step:n,decimals:md(n)}}var Yt=class extends y{static getStubConfig(s){let t=Object.keys(s.states);return{type:"custom:silk-number-card",entity:t.find(i=>i.startsWith("input_number."))??t.find(i=>i.startsWith("number."))}}static async getConfigElement(){return document.createElement(eo)}setConfig(s){if(!s.entity||!["number","input_number"].includes(O(s.entity)))throw new Error("silk-number-card: `entity` is required and must be a number or input_number entity");this._config=s,this._optValue=void 0}getCardSize(){return this._sliderMode()?2:1}getGridOptions(){return{columns:6,rows:this._sliderMode()?2:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(s){if(!s.has("hass")||!this._config||!this.hass||this._optValue===void 0||this._sendTimer!==void 0)return;let e=s.get("hass")?.states[this._config.entity],i=this.hass.states[this._config.entity];i&&e&&i.state!==e.state&&(window.clearTimeout(this._holdTimer),this._optValue=void 0)}_sliderMode(){let s=this._config?.entity;return(s?this.hass?.states[s]:void 0)?.attributes.mode==="slider"}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatValue(s,t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return e!==void 0?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(s):new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.max(t,2)}).format(s)}_formatBound(s){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:2}).format(s)}_displayValue(s){return this._optValue??ci(s.state)}_onCardClick(){this._config&&C(this,this._config.entity)}_onIconClick(s){s.stopPropagation(),this._config&&C(this,this._config.entity)}_stopClick(s){s.stopPropagation()}_onStep(s,t){s.stopPropagation();let e=this.hass,i=this._config?e?.states[this._config.entity]:void 0;if(!e||!i||_(i))return;let n=Jr(i),r=this._displayValue(i)??n.min,o=Number(P(r+t*n.step,n.min,n.max).toFixed(n.decimals));o!==r&&(this._optValue=o,T(this,"selection"),window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},ld))}_onSlide(s){this._optValue=s.detail.value}_onSliderChange(s){this._optValue=s.detail.value,T(this,"selection"),window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit()}_commit(){let s=this.hass,t=this._config?.entity,e=this._optValue;if(!s||!t||e===void 0)return;let i=O(t)==="input_number"?"input_number":"number";s.callService(i,"set_value",{entity_id:t,value:e}),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optValue=void 0},dd)):this._optValue=void 0}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=t.states[s.entity];if(!e)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let i=_(e),n=S(e,s.color),r=s.name??e.attributes.friendly_name??s.entity,o=Jr(e),c=i?void 0:this._displayValue(e),d=e.attributes.unit_of_measurement??"",u=`${this._formatBound(o.min)}\u2013${this._formatBound(o.max)}${d?` ${d}`:""}`,f=e.attributes.mode==="slider";return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!i&&R(e)?"on":""}"
            ?disabled=${i}
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${r}</div>
            <div class="state">${i?N(t,e):u}</div>
          </div>
          <div class="trailing">
            <button
              class="step"
              ?disabled=${i||c===void 0||c<=o.min}
              aria-label="Decrease ${r}"
              @click=${g=>this._onStep(g,-1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <span class="readout">
              <span class="value">
                ${c!==void 0?this._formatValue(c,o.decimals):"\u2014"}
              </span>
              ${d?l`<span class="unit">${d}</span>`:p}
            </span>
            <button
              class="step"
              ?disabled=${i||c===void 0||c>=o.max}
              aria-label="Increase ${r}"
              @click=${g=>this._onStep(g,1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        ${f?l`
              <div class="slider-row" @click=${this._stopClick}>
                <silk-slider
                  .value=${c??o.min}
                  .min=${o.min}
                  .max=${o.max}
                  .step=${o.step}
                  ?disabled=${i}
                  @slide=${this._onSlide}
                  @change=${this._onSliderChange}
                ></silk-slider>
              </div>
            `:p}
      </ha-card>
    `}};Yt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .trailing {
        gap: 6px;
      }
      .readout {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        gap: 3px;
        min-width: 52px;
      }
      .step {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .step:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .step:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .step:disabled {
        cursor: default;
        opacity: 0.4;
      }
      .step ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .slider-row {
        min-width: 0;
      }
      .unavailable .slider-row {
        opacity: 0.45;
        pointer-events: none;
      }
      .slider-row silk-slider {
        --silk-slider-height: 30px;
      }
      .icon:disabled {
        cursor: default;
      }
    `],m([b({attribute:!1})],Yt.prototype,"hass",2),m([h()],Yt.prototype,"_config",2),m([h()],Yt.prototype,"_optValue",2),Yt=m([x("silk-number-card")],Yt);var io={type:"silk-keypad-card",name:"Silk Keypad",description:"A PIN pad for anything that takes a code."},no="silk-keypad-card-editor";E(no,[{name:"title",selector:{text:{}}}],{title:"Title"});var pd=[{k:"1",label:"1"},{k:"2",label:"2"},{k:"3",label:"3"},{k:"4",label:"4"},{k:"5",label:"5"},{k:"6",label:"6"},{k:"7",label:"7"},{k:"8",label:"8"},{k:"9",label:"9"},{k:"back",label:"Delete",icon:"mdi:backspace-outline"},{k:"0",label:"0"},{k:"submit",label:"Submit",icon:"mdi:check"}],ud=16,hd=700,ft=class extends y{constructor(){super(...arguments);this._code="";this._flash=!1;this._flashLen=0}static getStubConfig(){return{type:"custom:silk-keypad-card",action:{service:"script.turn_on"}}}static async getConfigElement(){return document.createElement(no)}setConfig(t){let e=t.action?.service;if(typeof e!="string"||e.indexOf(".")<1)throw new Error("silk-keypad-card: `action` is required, e.g. {service: 'alarm_control_panel.alarm_disarm', data: {...}}");if(t.code_length!==void 0&&(!Number.isInteger(t.code_length)||t.code_length<1))throw new Error("silk-keypad-card: `code_length` must be a positive integer");this._config=t,this._code="",this._clearFlash()}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:4}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._flashTimer),this._flashTimer=void 0}_clearFlash(){window.clearTimeout(this._flashTimer),this._flashTimer=void 0,this._flash=!1}_maxLength(){return this._config?.code_length??ud}_append(t){this._code.length>=this._maxLength()||(this._clearFlash(),T(this,"selection"),this._code=this._code+t,this._config?.code_length!==void 0&&this._code.length===this._config.code_length&&this._submit())}_backspace(){this._clearFlash(),this._code&&(T(this,"selection"),this._code=this._code.slice(0,-1))}_submit(){let t=this.hass,e=this._config,i=this._code;if(!t||!e||!i)return;let n=e.action.service.indexOf("."),r=e.action.service.slice(0,n),o=e.action.service.slice(n+1);T(this,"success"),this._clearFlash();let c=i.length;this._code="",Promise.resolve(t.callService(r,o,{...e.action.data??{},code:i})).catch(()=>this._rejected(c))}_rejected(t){T(this,"failure"),this._flashLen=t,this._flash=!0,window.clearTimeout(this._flashTimer),this._flashTimer=window.setTimeout(()=>{this._flashTimer=void 0,this._flash=!1},hd)}_onKeyTap(t){t.stopPropagation();let e=t.currentTarget.dataset.key;e&&(e==="back"?this._backspace():e==="submit"?this._submit():this._append(e))}_onKeydown(t){/^[0-9]$/.test(t.key)?(t.preventDefault(),this._append(t.key)):t.key==="Backspace"&&(t.preventDefault(),this._backspace())}_renderReadout(){let t=this._code.length,e=this._flash&&t===0,i=this._config?.code_length??(e?this._flashLen:t),n=t?`${t} digit${t===1?"":"s"} entered`:e?"Code rejected":"No code entered";return l`
      <div class="dots ${this._flash?"error":""}" role="status" aria-label=${n}>
        ${i===0?l`<span class="hint">Enter code</span>`:Array.from({length:i},(r,o)=>l`<span class="slot ${o<t?"filled":"hollow"}"></span>`)}
      </div>
    `}render(){let t=this._config;if(!t)return p;let e=this._code.length>0;return l`
      <ha-card class="control" @keydown=${this._onKeydown}>
        ${t.title?l`<div class="title">${t.title}</div>`:p}
        ${this._renderReadout()}
        <div class="keys">
          ${pd.map(i=>l`
              <button
                class="key ${i.k==="submit"?"submit":i.icon?"aux":""}"
                data-key=${i.k}
                aria-label=${i.label}
                ?disabled=${i.k==="submit"&&!e}
                @click=${this._onKeyTap}
              >
                ${i.icon?l`<ha-icon .icon=${i.icon}></ha-icon>`:i.label}
              </button>
            `)}
        </div>
      </ha-card>
    `}};ft.styles=[k,w`
      /* Standalone pad: no entity behind it, so the card itself is inert.
         Grow past the grid allotment rather than clip the keys. */
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px 12px;
        cursor: default;
        height: auto;
        min-height: 100%;
      }
      .title {
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      /* Masked readout: fixed 18px slots give the dots tabular spacing, and
         the min-height keeps the layout stable at zero digits. */
      .dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 24px;
        max-width: 100%;
        overflow: hidden;
        color: var(--primary-text-color);
        transition: color 150ms ease;
      }
      .dots.error {
        color: var(--error-color, #db4437);
      }
      .slot {
        flex: none;
        position: relative;
        width: 18px;
        height: 18px;
      }
      .slot::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
      }
      .slot.filled::after {
        background: currentColor;
      }
      .slot.hollow::after {
        box-shadow: inset 0 0 0 1.5px currentColor;
        opacity: 0.3;
      }
      .hint {
        font-size: 12.5px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .keys {
        display: grid;
        grid-template-columns: repeat(3, 52px);
        gap: 8px;
        justify-content: center;
      }
      /* Skeuomorphic keys: neutral monochrome depth only — text-color grays
         with black-alpha inset shadows; chroma stays on the submit accent. */
      .key {
        width: 52px;
        height: 52px;
        border: none;
        border-radius: 14px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        font: inherit;
        font-size: 19px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
        transition:
          transform 100ms var(--silk-ease-out),
          box-shadow 100ms var(--silk-ease-out),
          background 150ms ease;
        -webkit-tap-highlight-color: transparent;
      }
      .key:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .key:active:not(:disabled) {
        transform: translateY(1px);
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.18);
      }
      .key:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .key:disabled {
        cursor: default;
        opacity: 0.5;
      }
      .key.aux {
        color: var(--secondary-text-color);
      }
      .key.submit {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .key.submit:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 22%, transparent);
      }
      .key ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
    `],m([b({attribute:!1})],ft.prototype,"hass",2),m([h()],ft.prototype,"_config",2),m([h()],ft.prototype,"_code",2),m([h()],ft.prototype,"_flash",2),m([h()],ft.prototype,"_flashLen",2),ft=m([x("silk-keypad-card")],ft);var oo={type:"silk-sun-card",name:"Silk Sun",description:"Where the sun is, and when it leaves."},so="sun.sun",fd="#e6a23c",ro=864e5,gd=6e4,li=50,Ae=82,fe=48,_d=13,vd=`M ${li-fe} ${Ae} A ${fe} ${fe} 0 0 1 ${li+fe} ${Ae}`;function bd(a,s){let t=Date.parse(String(a.attributes.next_rising??"")),e=Date.parse(String(a.attributes.next_setting??""));if(!Number.isFinite(t)||!Number.isFinite(e))return null;let i=t>e;if(i){let r=t-ro;return{day:i,f:P((s-r)/(e-r),0,1),riseMs:r,setMs:e}}let n=e-ro;return{day:i,f:P((s-n)/(t-n),0,1),riseMs:t,setMs:e}}var ao="silk-sun-card-editor";E(ao,[{name:"name",selector:{text:{}}}],{name:"Name"});var Kt=class extends y{constructor(){super(...arguments);this._now=Date.now()}static getStubConfig(){return{type:"custom:silk-sun-card",entity:so}}static async getConfigElement(){return document.createElement(ao)}setConfig(t){this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:4,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._now=Date.now(),this._tickTimer=window.setInterval(()=>{this._now=Date.now()},gd)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tickTimer)}_entityId(){return this._config?.entity??so}_fmtTime(t){let e=this.hass?.locale?.language??this.hass?.language??"en";return new Intl.DateTimeFormat(e,{hour:"numeric",minute:"2-digit"}).format(new Date(t))}_onCardClick(){C(this,this._entityId())}render(){let t=this._config;if(!t)return p;let e=this.hass,i=this._entityId(),n=e?.states[i];if(e&&!n)return l`<ha-card><div class="warning">Entity not found: ${i}</div></ha-card>`;let r=_(n),o=t.color??fd,c=t.name??n?.attributes.friendly_name??"Sun",d=n&&!r?bd(n,this._now):null,u=0,f=0;if(d){let $=Math.PI*d.f;d.day?(u=li-fe*Math.cos($),f=Ae-fe*Math.sin($)):(u=li+fe*Math.cos($),f=Ae+_d*Math.sin($))}let g=Number(n?.attributes.elevation),v=d?.day===!0&&Number.isFinite(g);return l`
      <ha-card
        class=${r?"unavailable":""}
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="name">${c}</div>
          ${v?l`<div class="elev">${Math.round(g)}° up</div>`:p}
        </div>
        <div class="sky">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path class="arc" d=${vd}></path>
            <line class="horizon" x1="2" y1=${Ae} x2="98" y2=${Ae}></line>
          </svg>
          ${d?l`<div
                class="dot ${d.day?"":"night"}"
                style="left:${u.toFixed(2)}%;top:${f.toFixed(2)}%"
              ></div>`:p}
        </div>
        <div class="times">
          <div class="col">
            <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
            <span>Sunrise ${d?this._fmtTime(d.riseMs):"\u2014"}</span>
          </div>
          <div class="col">
            <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
            <span>Sunset ${d?this._fmtTime(d.setMs):"\u2014"}</span>
          </div>
        </div>
      </ha-card>
    `}};Kt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        gap: 6px;
        padding: 12px 14px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        min-height: 18px;
      }
      .elev {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .sky {
        position: relative;
        flex: 1;
        min-height: 40px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .arc {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        stroke-width: 1;
        stroke-dasharray: 3 4;
        vector-effect: non-scaling-stroke;
      }
      .horizon {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .dot {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: var(--silk-accent);
        transition: opacity 200ms ease;
        pointer-events: none;
      }
      .dot.night {
        opacity: 0.45;
      }
      .times {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .col {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        font-size: 12px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col ha-icon {
        flex: none;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }
      .unavailable .head,
      .unavailable .sky,
      .unavailable .times {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Kt.prototype,"hass",2),m([h()],Kt.prototype,"_config",2),m([h()],Kt.prototype,"_now",2),Kt=m([x("silk-sun-card")],Kt);var mo={type:"silk-aqi-card",name:"Silk Air",description:"One verdict for your air, with receipts."},po=["pm25","pm10","co2","voc","humidity"],co={pm25:"PM2.5",pm10:"PM10",co2:"CO\u2082",voc:"VOC",humidity:"Humidity"},yd={pm25:"\xB5g/m\xB3",pm10:"\xB5g/m\xB3",co2:"ppm",voc:"",humidity:"%"},xd={pm25:a=>a<12?"good":a<35?"fair":"poor",pm10:a=>a<54?"good":a<154?"fair":"poor",co2:a=>a<800?"good":a<1200?"fair":"poor",voc:a=>a<220?"good":a<660?"fair":"poor",humidity:a=>a>=30&&a<=60?"good":a>=25&&a<=70?"fair":"poor"},lo={good:0,fair:1,poor:2},wd={good:"Good",fair:"Fair",poor:"Poor"},kd={good:"var(--success-color, #57ad60)",fair:"var(--warning-color, #e6a23c)",poor:"var(--error-color, #db4437)"},tn="silk-aqi-card-editor",$d=[{name:"pm25",selector:{entity:{domain:["sensor"]}}},{name:"pm10",selector:{entity:{domain:["sensor"]}}},{name:"co2",selector:{entity:{domain:["sensor"]}}},{name:"voc",selector:{entity:{domain:["sensor"]}}},{name:"humidity",selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}}],Td={pm25:"PM2.5 sensor",pm10:"PM10 sensor",co2:"CO\u2082 sensor",voc:"VOC sensor",humidity:"Humidity sensor",name:"Name"},ze=class extends y{setConfig(s){this._config=s}render(){if(!this.hass||!this._config)return p;let s={name:this._config.name,...this._config.entities??{}};return l`
      <ha-form
        .hass=${this.hass}
        .data=${s}
        .schema=${$d}
        .computeLabel=${t=>Td[t.name]??t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(s){s.stopPropagation();let t=s.detail.value,e={};for(let n of po){let r=t[n];typeof r=="string"&&r&&(e[n]=r)}let i={...this._config,entities:e};typeof t.name=="string"&&t.name?i.name=t.name:delete i.name,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};m([b({attribute:!1})],ze.prototype,"hass",2),m([h()],ze.prototype,"_config",2);customElements.get(tn)||customElements.define(tn,ze);var ge=class extends y{constructor(){super(...arguments);this._metrics=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(o=>o.startsWith("sensor.")),i=o=>e.find(c=>t.states[c].attributes.device_class===o),n=[["pm25",i("pm25")],["pm10",i("pm10")],["co2",i("carbon_dioxide")],["voc",i("volatile_organic_compounds")],["humidity",i("humidity")]],r={};for(let[o,c]of n)c&&(r[o]=c);return{type:"custom:silk-aqi-card",entities:r}}static async getConfigElement(){return document.createElement(tn)}setConfig(t){let e=t.entities,i=e&&typeof e=="object"?po.filter(n=>typeof e[n]=="string"&&e[n]):[];if(i.length===0)throw new Error("silk-aqi-card: `entities` needs at least one of pm25, pm10, co2, voc, humidity");this._config=t,this._metrics=i}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}_readings(t){return this._metrics.map(e=>{let i=this._config.entities[e],n=t.states[i],r=n&&!_(n)?Number(n.state):NaN,o=Number.isFinite(r);return{metric:e,entityId:i,stateObj:n,value:o?r:null,band:o?xd[e](r):null}})}_onCardClick(){let t=this._metrics[0];this._config&&t&&C(this,this._config.entities[t])}_onChipClick(t,e){t.stopPropagation(),C(this,e)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._readings(e);if(i.every(d=>!d.stateObj))return l`<ha-card
        ><div class="warning">Entity not found: ${i[0].entityId}</div></ha-card
      >`;let n=i.reduce((d,u)=>u.band&&(!d||lo[u.band]>lo[d])?u.band:d,null),r=i.every(d=>d.band===null),o=n?kd[n]:"var(--primary-color, #4aa8ff)",c=t.name??"Air quality";return l`
      <ha-card
        class="control ${r?"unavailable":""}"
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${t.icon?l`<div class="icon ${n?"on":""}">
                <ha-icon .icon=${t.icon}></ha-icon>
              </div>`:p}
          <div class="info">
            <div class="verdict ${n?"":"none"}">
              <span class="vdot"></span>
              <span class="word">${n?wd[n]:"\u2014"}</span>
            </div>
            <div class="state">${c}</div>
          </div>
        </div>
        <div class="chips">
          ${i.map(d=>{let u=d.stateObj?.attributes.unit_of_measurement??yd[d.metric],f=d.value!==null?`${D(e,d.entityId,d.value)}${u?` ${u}`:""}`:"\u2014";return l`
              <button
                class="chip ${d.band??""}"
                aria-label=${`${co[d.metric]}: ${f}`}
                @click=${g=>this._onChipClick(g,d.entityId)}
              >
                <span class="metric">${co[d.metric]}</span>
                <span class="reading">${f}</span>
              </button>
            `})}
        </div>
      </ha-card>
    `}};ge.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The verdict card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .verdict {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.2;
        color: var(--silk-accent);
        white-space: nowrap;
        min-width: 0;
        transition: color 200ms ease;
      }
      .verdict.none {
        color: var(--secondary-text-color);
      }
      .vdot {
        flex: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: currentColor;
      }
      .word {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chips {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        min-width: 0;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .chip .reading {
        font-weight: 500;
      }
      .chip.good {
        color: var(--success-color, #57ad60);
        background: color-mix(in srgb, var(--success-color, #57ad60) 14%, transparent);
      }
      .chip.fair {
        color: var(--warning-color, #e6a23c);
        background: color-mix(in srgb, var(--warning-color, #e6a23c) 14%, transparent);
      }
      .chip.poor {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .unavailable .top,
      .unavailable .chips {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],ge.prototype,"hass",2),m([h()],ge.prototype,"_config",2),ge=m([x("silk-aqi-card")],ge);var go={type:"silk-heatmap-card",name:"Silk Heatmap",description:"Seven days of rhythm in one glance."},_o=7,vo=14,Se=24,en=2,Ed=2,di=18,Cd=12,nn=.06,uo=.95,Ad=.03,Sd=9e4,Md=new Set(["unavailable","unknown","none",""]);function ho(a){return`${a.getFullYear()}-${a.getMonth()}-${a.getDate()}`}function fo(a,s){if(!a.length)return 0;let t=(a.length-1)*s,e=Math.floor(t),i=Math.ceil(t);return a[e]+(a[i]-a[e])*(t-e)}function mi(a){return Array.from({length:a},()=>new Array(Se).fill(null))}var bo="silk-heatmap-card-editor";E(bo,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"days",selector:{number:{min:1,max:vo,mode:"box"}}}],{entity:"Entity",name:"Name",days:"Days to show"},{days:_o});var Ct=class extends y{constructor(){super(...arguments);this._data=null;this._plot=null;this._fetchStarted=!1;this._fetchSeq=0;this._onWsReady=()=>{this._refresh()}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-heatmap-card",entity:i("temperature")??i("humidity")??i("power")??e[0]}}static async getConfigElement(){return document.createElement(bo)}setConfig(t){if(!t.entity)throw new Error("silk-heatmap-card: `entity` is required");if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-heatmap-card: `days` must be a positive number");this._config=t,this._data=null,this._fetchStarted=!1}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:3}}connectedCallback(){super.connectedCallback(),this._scheduleHourly(),this.hasUpdated&&(this._observePlot(),this._fetchStarted&&this._refresh())}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._hourlyTimer),this._resize?.disconnect(),this._connection?.removeEventListener("ready",this._onWsReady),this._connection=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._connection){let e=this.hass.connection;e&&(e.addEventListener("ready",this._onWsReady),this._connection=e)}this._fetchStarted||(this._fetchStarted=!0,this._refresh())}}updated(){this._observePlot()}_observePlot(){let t=this.renderRoot.querySelector(".plot");t&&(this._resize||(this._resize=new ResizeObserver(e=>{let i=e[e.length-1].contentRect,n=Math.round(i.width),r=Math.round(i.height);(!this._plot||this._plot.w!==n||this._plot.h!==r)&&(this._plot={w:n,h:r})})),this._resize.observe(t))}_days(){return P(Math.round(this._config?.days??_o),1,vo)}_scheduleHourly(){window.clearTimeout(this._hourlyTimer);let t=Date.now(),e=(Math.floor(t/36e5)+1)*36e5+Sd;this._hourlyTimer=window.setTimeout(()=>{this._refresh(),this._scheduleHourly()},e-t)}async _refresh(){let t=this.hass,e=this._config;if(!t||!e)return;let i=this._days(),n=++this._fetchSeq,r=new Date,o=[];for(let f=0;f<i;f++)o.push(new Date(r.getFullYear(),r.getMonth(),r.getDate()-(i-1-f)).getTime());let c=r.getTime(),d;try{d=await this._fetchStatistics(t,e.entity,o,c),d||(d=await this._fetchHistoryMeans(t,e.entity,o,c))}catch(f){console.warn("silk-heatmap-card: data fetch failed",f);return}if(n!==this._fetchSeq)return;let u=d.flat().filter(f=>f!==null).sort((f,g)=>f-g);this._data={days:o,grid:d,lo:fo(u,.05),hi:fo(u,.95)}}async _fetchStatistics(t,e,i,n){let o=((await t.callWS({type:"recorder/statistics_during_period",start_time:new Date(i[0]).toISOString(),end_time:new Date(n).toISOString(),statistic_ids:[e],period:"hour",types:["mean"]}))?.[e]??[]).filter(g=>typeof g.mean=="number"&&Number.isFinite(g.mean));if(!o.length)return null;let c=new Map(i.map((g,v)=>[ho(new Date(g)),v])),d=mi(i.length),u=mi(i.length);for(let g of o){let v=typeof g.start=="number"?g.start:Date.parse(g.start);if(!Number.isFinite(v))continue;let $=new Date(v),A=c.get(ho($));if(A===void 0)continue;let M=$.getHours();d[A][M]=(d[A][M]??0)+g.mean,u[A][M]=(u[A][M]??0)+1}let f=mi(i.length);for(let g=0;g<i.length;g++)for(let v=0;v<Se;v++){let $=u[g][v];$&&(f[g][v]=d[g][v]/$)}return f}async _fetchHistoryMeans(t,e,i,n){let r=await t.callWS({type:"history/history_during_period",start_time:new Date(i[0]).toISOString(),end_time:new Date(n).toISOString(),entity_ids:[e],minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),o=n/1e3,c=(r?.[e]??[]).map(f=>{let g=f.lu??f.last_updated??f.lc??f.last_changed??NaN,v=typeof g=="number"?g:Date.parse(g)/1e3,$=String(f.s??f.state??"").toLowerCase(),A=Md.has($)?NaN:Number(f.s??f.state);return{t:v,v:Number.isFinite(A)?A:NaN}}).filter(f=>Number.isFinite(f.t)&&f.t<=o).sort((f,g)=>f.t-g.t),d=mi(i.length),u=0;for(let f=0;f<i.length;f++){let g=new Date(i[f]);for(let v=0;v<Se;v++){let $=new Date(g.getFullYear(),g.getMonth(),g.getDate(),v).getTime()/1e3,A=Math.min(new Date(g.getFullYear(),g.getMonth(),g.getDate(),v+1).getTime()/1e3,o);if(A<=$)continue;for(;u+1<c.length&&c[u+1].t<=$;)u++;let M=0,I=0;for(let F=u;F<c.length&&c[F].t<A;F++){let H=Math.max(c[F].t,$),U=Math.min(F+1<c.length?c[F+1].t:o,A);U>H&&Number.isFinite(c[F].v)&&(M+=c[F].v*(U-H),I+=U-H)}I>0&&(d[f][v]=M/I)}}return d}_opacity(t,e,i){if(i<=e)return(nn+uo)/2;let n=P((t-e)/(i-e),0,1);return Math.round((nn+n*(uo-nn))*1e3)/1e3}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){this._config&&C(this,this._config.entity)}_renderGrid(t){let e=this._plot,i=this._data,n=this._config;if(!e||!i||!n)return p;let r=i.days.length,o=e.w-di,c=e.h-Cd,d=(o+en)/r,u=d-en,f=c/Se>=6?en:1,g=(c+f)/Se,v=g-f;if(u<=1||v<=.5)return p;let $=Math.min(Ed,u/2,v/2),A=Date.now(),M=this._locale(),I=new Intl.DateTimeFormat(M,{weekday:u<24?"narrow":"short"}),F=new Intl.DateTimeFormat(M,{weekday:"short"}),H=[];for(let q=0;q<r;q++){let X=new Date(i.days[q]),it=Math.round(di+q*d);for(let be=0;be<Se&&!(new Date(X.getFullYear(),X.getMonth(),X.getDate(),be).getTime()>A);be++){let qe=i.grid[q][be],va=qe===null?Ad:this._opacity(qe,i.lo,i.hi),ba=qe===null?"\u2014":`${D(this.hass,n.entity,qe)}${t}`;H.push(z`<rect class="cell" x=${it} y=${(be*g).toFixed(1)} width=${u.toFixed(1)} height=${v.toFixed(1)} rx=${$.toFixed(1)} fill-opacity=${va}>
            <title>${F.format(X)} ${be}:00 · ${ba}</title>
          </rect>`)}}let U=[0,6,12,18].map(q=>z`<text class="axis" x=${di-6} y=${(q*g+v/2).toFixed(1)} text-anchor="end" dominant-baseline="central">${q}</text>`),W=i.days.map((q,X)=>z`<text class="axis" x=${(di+X*d+u/2).toFixed(1)} y=${e.h-2} text-anchor="middle">${I.format(new Date(q))}</text>`);return l`
      <svg width=${e.w} height=${e.h} aria-hidden="true">
        <g class="cells">${H}</g>
        ${U}${W}
      </svg>
    `}render(){let t=this._config;if(!t)return p;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=i?.attributes.unit_of_measurement??"",d=Number(i?.state),u=!n&&i!==void 0&&i.state!==""&&Number.isFinite(d);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          <div class="trailing">
            <span class="value">${u?D(e,t.entity,d):"\u2014"}</span>
            ${u&&c?l`<span class="unit">${c}</span>`:p}
          </div>
        </div>
        <div class="plot">${this._renderGrid(c)}</div>
      </ha-card>
    `}};Ct.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 48px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .cell {
        fill: var(--silk-accent);
        transition: fill-opacity 200ms ease;
      }
      .cells {
        animation: silk-heatmap-in 250ms var(--silk-ease-out);
      }
      .axis {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .unavailable .plot {
        opacity: 0.45;
      }
      @keyframes silk-heatmap-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],Ct.prototype,"hass",2),m([h()],Ct.prototype,"_config",2),m([h()],Ct.prototype,"_data",2),m([h()],Ct.prototype,"_plot",2),Ct=m([x("silk-heatmap-card")],Ct);var $o={type:"silk-week-card",name:"Silk Week",description:"Daily totals as honest little bars."},To=7,Eo=31,yo=2,Pd=4,Od=2,xo=14,wo=12,Rd=9e4;function ko(a){return`${a.getFullYear()}-${a.getMonth()}-${a.getDate()}`}var G=a=>Math.round(a*10)/10,Co="silk-week-card-editor";E(Co,[{name:"entity",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}},{name:"days",selector:{number:{min:1,max:Eo,mode:"box"}}}],{entity:"Entity",name:"Name",days:"Days to show"},{days:To});var gt=class extends y{constructor(){super(...arguments);this._bars=null;this._noStats=!1;this._plot=null;this._fetchStarted=!1;this._fetchSeq=0;this._onWsReady=()=>{this._refresh()}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-week-card",entity:i("energy")??i("gas")??i("water")??e.find(n=>Number.isFinite(Number(t.states[n].state)))}}static async getConfigElement(){return document.createElement(Co)}setConfig(t){if(!t.entity)throw new Error("silk-week-card: `entity` is required");if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-week-card: `days` must be a positive number");this._config=t,this._bars=null,this._noStats=!1,this._fetchStarted=!1}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._scheduleHourly(),this.hasUpdated&&(this._observePlot(),this._fetchStarted&&this._refresh())}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._hourlyTimer),this._resize?.disconnect(),this._connection?.removeEventListener("ready",this._onWsReady),this._connection=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._connection){let e=this.hass.connection;e&&(e.addEventListener("ready",this._onWsReady),this._connection=e)}this._fetchStarted||(this._fetchStarted=!0,this._refresh())}}updated(){this._observePlot()}_observePlot(){let t=this.renderRoot.querySelector(".plot");t&&(this._resize||(this._resize=new ResizeObserver(e=>{let i=e[e.length-1].contentRect,n=Math.round(i.width),r=Math.round(i.height);(!this._plot||this._plot.w!==n||this._plot.h!==r)&&(this._plot={w:n,h:r})})),this._resize.observe(t))}_days(){return P(Math.round(this._config?.days??To),1,Eo)}_scheduleHourly(){window.clearTimeout(this._hourlyTimer);let t=Date.now(),e=(Math.floor(t/36e5)+1)*36e5+Rd;this._hourlyTimer=window.setTimeout(()=>{this._refresh(),this._scheduleHourly()},e-t)}async _refresh(){let t=this.hass,e=this._config;if(!t||!e)return;let i=this._days(),n=++this._fetchSeq,r=new Date,o=[];for(let A=0;A<i;A++)o.push(new Date(r.getFullYear(),r.getMonth(),r.getDate()-(i-1-A)).getTime());let c;try{c=await t.callWS({type:"recorder/statistics_during_period",start_time:new Date(o[0]).toISOString(),end_time:r.toISOString(),statistic_ids:[e.entity],period:"day",types:["change","mean"]})}catch(A){console.warn("silk-week-card: statistics fetch failed",A);return}if(n!==this._fetchSeq)return;let d=c?.[e.entity]??[],u=A=>typeof A=="number"&&Number.isFinite(A),f=d.some(A=>u(A.change)),g=d.some(A=>u(A.mean));if(!f&&!g){this._noStats=!0,this._bars=null;return}let v=new Map(o.map((A,M)=>[ko(new Date(A)),M])),$=new Array(i).fill(null);for(let A of d){let M=typeof A.start=="number"?A.start:Date.parse(A.start);if(!Number.isFinite(M))continue;let I=v.get(ko(new Date(M)));if(I===void 0)continue;let F=f?A.change:A.mean;u(F)&&($[I]=F)}this._noStats=!1,this._bars=o.map((A,M)=>({ts:A,v:$[M]}))}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){this._config&&C(this,this._config.entity)}_barPath(t,e,i,n,r){let o=Math.min(Pd,i/2,n),c=e-n,d=`M${G(t)},${G(e)} V${G(c+o)} Q${G(t)},${G(c)} ${G(t+o)},${G(c)} H${G(t+i-o)} Q${G(t+i)},${G(c)} ${G(t+i)},${G(c+o)} V${G(e)} Z`;return z`<path class="bar ${r?"today":"past"}" d=${d}></path>`}_renderBars(t){if(this._noStats)return l`<div class="note">No long-term statistics</div>`;let e=this._plot,i=this._bars,n=this._config;if(!e||!i||!i.length||!n)return p;let r=i.length,o=e.h-xo-wo,c=(e.w+yo)/r,d=c-yo;if(d<=1||o<=8)return p;let u=xo+o,f=-1,g=0;i.forEach((H,U)=>{H.v!==null&&H.v>g&&(g=H.v,f=U)});let v=r-1,$=this._locale(),A=new Intl.DateTimeFormat($,{weekday:"narrow"}),M=new Intl.DateTimeFormat($,{weekday:"short",month:"short",day:"numeric"}),I=[],F=[];for(let H=0;H<r;H++){let U=i[H],W=H*c,q=U.v!==null,X=q&&g>0&&U.v>0?Math.max(Od,U.v/g*o):0;X>0&&I.push(this._barPath(W,u,d,X,H===v)),q&&(H===f||H===v)&&F.push(z`<text class="val" x=${G(W+d/2)} y=${G(Math.max(9,u-X-4))} text-anchor="middle">${D(this.hass,n.entity,U.v)}</text>`),F.push(z`<text class="axis" x=${G(W+d/2)} y=${e.h-2} text-anchor="middle">${A.format(new Date(U.ts))}</text>`);let it=q?`${D(this.hass,n.entity,U.v)}${t}`:"\u2014";I.push(z`<rect class="hit" x=${G(W)} y="0" width=${G(d)} height=${e.h-wo}>
          <title>${M.format(new Date(U.ts))} · ${it}</title>
        </rect>`)}return l`
      <svg width=${e.w} height=${e.h} aria-hidden="true">
        <g class="chart">${I}${F}</g>
      </svg>
    `}render(){let t=this._config;if(!t)return p;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=i?.attributes.unit_of_measurement??"",d=this._bars?.length?this._bars[this._bars.length-1].v:null;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          <div class="trailing">
            <span class="value">${d!==null?D(e,t.entity,d):"\u2014"}</span>
            ${d!==null&&c?l`<span class="unit">${c}</span>`:p}
          </div>
        </div>
        <div class="plot">${this._renderBars(c)}</div>
      </ha-card>
    `}};gt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* Data card: the icon presses with the card, it is not a control. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .plot {
        position: relative;
        flex: 1;
        min-height: 40px;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
      }
      .bar.today {
        fill: var(--silk-accent);
      }
      .bar.past {
        fill: var(--silk-accent);
        fill-opacity: 0.35;
      }
      .hit {
        fill: transparent;
      }
      .chart {
        animation: silk-week-in 250ms var(--silk-ease-out);
      }
      .axis {
        font-size: 9px;
        fill: var(--primary-text-color);
        opacity: 0.45;
        pointer-events: none;
      }
      .val {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.75;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .note {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .plot {
        opacity: 0.45;
      }
      @keyframes silk-week-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],gt.prototype,"hass",2),m([h()],gt.prototype,"_config",2),m([h()],gt.prototype,"_bars",2),m([h()],gt.prototype,"_noStats",2),m([h()],gt.prototype,"_plot",2),gt=m([x("silk-week-card")],gt);var Po={type:"silk-network-card",name:"Silk Network",description:"Down and up, mirrored like a router should."},Hd="Network",Ld="mdi:swap-vertical",Nd="#e6a23c",Oo=3,Ao=60,So=3,Id=3e5,Fd=6e4,Ro="silk-network-card-editor";E(Ro,[{name:"download",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"upload",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}],{download:"Download entity",upload:"Upload entity",name:"Name",hours_to_show:"Hours to show"},{hours_to_show:Oo});function Mo(a,s,t,e){let i=0;for(let o=0;o<a.length;o++){let c=a[o];Number.isFinite(c)&&c>i&&(i=c)}let n=i>0?t/i:0,r=new Float64Array(a.length);for(let o=0;o<a.length;o++){let c=a[o];r[o]=Number.isFinite(c)?s+e*Math.max(c,0)*n:NaN}return r}var _t=class extends y{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._downVals=null;this._upVals=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastStamp=""}static getStubConfig(t){let e=Object.keys(t.states).filter(c=>c.startsWith("sensor.")&&Number.isFinite(Number(t.states[c].state))),i=e.filter(c=>t.states[c].attributes.device_class==="data_rate"),n=i.length>=2?i:e,r=n.find(c=>/down|rx/.test(c))??n[0],o=n.find(c=>c!==r&&/up|tx/.test(c))??n.find(c=>c!==r);return{type:"custom:silk-network-card",download:r,upload:o}}static async getConfigElement(){return document.createElement(Ro)}setConfig(t){if(!t.download||!t.upload)throw new Error("silk-network-card: `download` and `upload` are required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-network-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._downVals=null,this._upVals=null,this._lastStamp=""}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Id)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height)}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this._config,e=this.hass?.states[t.download]?.last_updated??"",i=this.hass?.states[t.upload]?.last_updated??"";if(!e&&!i)return;let n=`${e}|${i}`;if(n===this._lastStamp||(this._lastStamp=n,this._refreshTimer))return;let r=Math.max(0,Fd-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},r)}async _refresh(){if(!this.hass||!this._config)return;let{download:t,upload:e}=this._config,i=this._config.hours_to_show??Oo,n=++this._fetchSeq,r=Date.now()/1e3,o=r-i*3600,c;try{c=await ct(this.hass,[t,e],o,r,i)}catch(d){console.warn("silk-network-card: history fetch failed",d);return}n===this._fetchSeq&&(this._lastFetch=Date.now(),this._downVals=lt(c[t]??[],o,r,Ao),this._upVals=lt(c[e]??[],o,r,Ao),this._rev++)}_rateText(t,e,i,n){let r=Number(i?.state);if(!i||_(i)||!Number.isFinite(r))return`${t} \u2014`;let o=D(this.hass,e,r);return n?`${t} ${o} ${n}`:`${t} ${o}`}_onTap(){this._config&&(T(this),C(this,this._config.download))}render(){let t=this._config;if(!t)return p;this._rev;let e=this.hass,i=e?.states[t.download],n=e?.states[t.upload];if(e&&(!i||!n))return l`<ha-card
        ><div class="warning">Entity not found: ${i?t.upload:t.download}</div></ha-card
      >`;let r=_(i)&&_(n),o=S(i,t.color),c=t.upload_color??Nd,d=t.name??Hd,u=i?.attributes.unit_of_measurement??"",f=n?.attributes.unit_of_measurement??"";return l`
      <ha-card
        class="control ${r?"unavailable":""}"
        style="--silk-accent:${o};--silk-upload:${c}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${r?"":"on"}">
            <ha-icon .icon=${t.icon??Ld}></ha-icon>
          </div>
          <div class="info"><div class="name" title=${d}>${d}</div></div>
          <div class="trailing rates">
            <span class="rate down">${this._rateText("\u2193",t.download,i,u)}</span>
            <span class="rate up">
              ${this._rateText("\u2191",t.upload,n,f===u?"":f)}
            </span>
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._height,i=this._downVals,n=this._upVals;if(!t||!e||!i||!n)return p;let r=e/2,o=Mo(i,r,Math.max(r-So,1),-1),c=Mo(n,r,Math.max(e-So-r,1),1);return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e} aria-hidden="true">
        <line class="mid" x1="0" y1=${r} x2=${t} y2=${r}></line>
        <g class="series down">
          <path class="fill" d=${ce(o,t,r)}></path>
          <path class="line" d=${dt(o,t)}></path>
        </g>
        <g class="series up">
          <path class="fill" d=${ce(c,t,r)}></path>
          <path class="line" d=${dt(c,t)}></path>
        </g>
      </svg>
    `}};_t.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* No control action here: the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .rates {
        flex-direction: column;
        align-items: flex-end;
        gap: 0;
      }
      .rate {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.35;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .rate.down {
        color: var(--silk-accent);
      }
      .rate.up {
        color: var(--silk-upload, #e6a23c);
      }
      .spark {
        flex: 1;
        position: relative;
        min-height: 40px;
        margin: 6px -12px -12px;
      }
      .spark svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-network-in 300ms var(--silk-ease-out);
      }
      .mid {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        stroke-width: 1;
        shape-rendering: crispedges;
      }
      .series.down {
        color: var(--silk-accent);
      }
      .series.up {
        color: var(--silk-upload, #e6a23c);
      }
      .series .line {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .series .fill {
        fill: currentColor;
        opacity: 0.1;
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-network-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],_t.prototype,"hass",2),m([h()],_t.prototype,"_config",2),m([h()],_t.prototype,"_width",2),m([h()],_t.prototype,"_height",2),m([h()],_t.prototype,"_rev",2),_t=m([x("silk-network-card")],_t);var Lo={type:"silk-compare-card",name:"Silk Compare",description:"Two numbers that belong side by side."},Dd="#e6a23c",Ud=24,Ho=60,je=36,pi=3,zd=3e5,jd=6e4,No="silk-compare-card-editor";E(No,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"entity2",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",entity2:"Second entity",name:"Name"});var At=class extends y{constructor(){super(...arguments);this._width=0;this._rev=0;this._vals1=null;this._vals2=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastStamp=""}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")&&Number.isFinite(Number(t.states[r].state))),i=e.filter(r=>t.states[r].attributes.device_class==="temperature"),n=i.length>=2?i:e;return{type:"custom:silk-compare-card",entity:n[0],entity2:n[1]}}static async getConfigElement(){return document.createElement(No)}setConfig(t){if(!t.entity||!t.entity2)throw new Error("silk-compare-card: `entity` and `entity2` are required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-compare-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._vals1=null,this._vals2=null,this._lastStamp=""}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),zd)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect.width;i!==this._width&&(this._width=i)}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this._config,e=this.hass?.states[t.entity]?.last_updated??"",i=this.hass?.states[t.entity2]?.last_updated??"";if(!e&&!i)return;let n=`${e}|${i}`;if(n===this._lastStamp||(this._lastStamp=n,this._refreshTimer))return;let r=Math.max(0,jd-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},r)}async _refresh(){if(!this.hass||!this._config)return;let{entity:t,entity2:e}=this._config,i=this._config.hours_to_show??Ud,n=++this._fetchSeq,r=Date.now()/1e3,o=r-i*3600,c;try{c=await ct(this.hass,[t,e],o,r,i)}catch(d){console.warn("silk-compare-card: history fetch failed",d);return}n===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals1=lt(c[t]??[],o,r,Ho),this._vals2=lt(c[e]??[],o,r,Ho),this._rev++)}_valueOf(t){return!t||_(t)?NaN:Number(t.state)}_deltaText(t,e,i,n){if(!Number.isFinite(t)||!Number.isFinite(e))return"\u0394 \u2014";let r=t-e,o=i&&i===n?i.startsWith("\xB0")?"\xB0":` ${i}`:"",c=D(this.hass,this._config.entity,Math.abs(r));return`\u0394 ${r<0?"\u2212":""}${c}${o}`}_onTap(){this._config&&(T(this),C(this,this._config.entity))}render(){let t=this._config;if(!t)return p;this._rev;let e=this.hass,i=e?.states[t.entity],n=e?.states[t.entity2];if(e&&(!i||!n))return l`<ha-card
        ><div class="warning">Entity not found: ${i?t.entity2:t.entity}</div></ha-card
      >`;let r=_(i)&&_(n),o=S(i,t.color),c=t.color2??Dd,d=t.label??i?.attributes.friendly_name??t.entity,u=t.label2??n?.attributes.friendly_name??t.entity2,f=i?.attributes.unit_of_measurement??"",g=n?.attributes.unit_of_measurement??"",v=this._valueOf(i),$=this._valueOf(n);return l`
      <ha-card
        class="control ${r?"unavailable":""}"
        style="--silk-accent:${o};--silk-c2:${c}"
        @click=${this._onTap}
      >
        ${t.name?l`<div class="title" title=${t.name}>${t.name}</div>`:p}
        <div class="cols">
          <div class="col">
            <div class="label">
              <span class="dot a"></span><span class="text">${d}</span>
            </div>
            <div class="reading">
              <span class="big">${Number.isFinite(v)?D(e,t.entity,v):"\u2014"}</span>
              ${f?l`<span class="unit">${f}</span>`:p}
            </div>
          </div>
          <div class="rule"></div>
          <div class="col">
            <div class="label">
              <span class="dot b"></span><span class="text">${u}</span>
            </div>
            <div class="reading">
              <span class="big">${Number.isFinite($)?D(e,t.entity2,$):"\u2014"}</span>
              ${g?l`<span class="unit">${g}</span>`:p}
            </div>
          </div>
        </div>
        <div class="delta">${this._deltaText(v,$,f,g)}</div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._vals1,i=this._vals2;if(!t||!e||!i)return p;let n=we([e,i]),r=ae(e,n,je,pi,pi),o=ae(i,n,je,pi,pi);return l`
      <svg viewBox="0 0 ${t} ${je}" width=${t} height=${je} aria-hidden="true">
        <path class="line b" d=${dt(o,t)}></path>
        <path class="line a" d=${dt(r,t)}></path>
      </svg>
    `}};At.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 0;
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .title {
        flex: none;
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 4px;
      }
      .cols {
        flex: 1;
        display: flex;
        align-items: center;
        min-height: 0;
        min-width: 0;
      }
      .col {
        flex: 1 1 0;
        min-width: 0;
        text-align: center;
      }
      .rule {
        flex: none;
        align-self: stretch;
        width: 1px;
        margin: 2px 0;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-width: 0;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
      }
      .label .text {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dot {
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .dot.a {
        background: var(--silk-accent);
      }
      .dot.b {
        background: var(--silk-c2, #e6a23c);
      }
      .reading {
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .big {
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .reading .unit {
        margin-left: 3px;
      }
      .delta {
        flex: none;
        align-self: center;
        margin: 4px 0 2px;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 1.4;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .spark {
        flex: none;
        height: ${je}px;
        margin: 2px -12px -12px;
      }
      .spark svg {
        display: block;
        animation: silk-compare-in 300ms var(--silk-ease-out);
      }
      .line {
        fill: none;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .line.a {
        stroke: var(--silk-accent);
      }
      .line.b {
        stroke: var(--silk-c2, #e6a23c);
      }
      .unavailable .cols,
      .unavailable .delta,
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-compare-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],At.prototype,"hass",2),m([h()],At.prototype,"_config",2),m([h()],At.prototype,"_width",2),m([h()],At.prototype,"_rev",2),At=m([x("silk-compare-card")],At);var Uo={type:"silk-calendar-card",name:"Silk Agenda",description:"What's next, without the month grid."},sn=864e5,zo=7,jo=6,qd=15*6e4,Io=["var(--silk-accent)","#e6a23c","#57ad60","#9d7ee8","#35b5b1","#e8734f"];function Fo(a){let s=new Date(a);return s.setHours(0,0,0,0),s.getTime()}function Do(a){if(!a)return null;if(a.dateTime){let s=Date.parse(a.dateTime);return Number.isFinite(s)?{ms:s,allDay:!1}:null}if(a.date){let[s,t,e]=a.date.split("-").map(Number);return!s||!t||!e?null:{ms:new Date(s,t-1,e).getTime(),allDay:!0}}return null}var qo="silk-calendar-card-editor";E(qo,[{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"days",selector:{number:{min:1,max:31,mode:"box"}}},{name:"limit",selector:{number:{min:1,max:20,mode:"box"}}}]}],{name:"Name",days:"Days ahead",limit:"Rows shown"},{days:zo,limit:jo});var Xt=class extends y{constructor(){super(...arguments);this._entityIds=[];this._fetchStarted=!1;this._fetchEpoch=0}static getStubConfig(t){return{type:"custom:silk-calendar-card",entities:Object.keys(t.states).find(i=>i.startsWith("calendar."))}}static async getConfigElement(){return document.createElement(qo)}setConfig(t){let e=t.entities,i=(Array.isArray(e)?e:typeof e=="string"?[e]:[]).filter(r=>typeof r=="string"&&r!=="");if(i.length===0)throw new Error("silk-calendar-card: `entities` requires at least one calendar entity");let n=i.find(r=>O(r)!=="calendar");if(n)throw new Error(`silk-calendar-card: ${n} is not a calendar entity`);if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-calendar-card: `days` must be a positive number");if(t.limit!==void 0&&!(Number(t.limit)>=1))throw new Error("silk-calendar-card: `limit` must be at least 1");this._entityIds=i,this._config=t,this._events=void 0,this._fetchStarted=!1}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>void this._fetch(),qd),this.hass&&this._config&&(this._fetchStarted=!0,this._fetch())}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer)}willUpdate(){!this.hass||!this._config||this._fetchStarted||(this._fetchStarted=!0,this._fetch())}async _fetch(){let t=this.hass,e=this._config;if(!t||!e)return;let i=++this._fetchEpoch,n=e.days??zo,r=new Date,o=new Date(r.getTime()+n*sn),c=encodeURIComponent(r.toISOString()),d=encodeURIComponent(o.toISOString()),u=await Promise.allSettled(this._entityIds.map(g=>t.callApi("GET",`calendars/${g}?start=${c}&end=${d}`)));if(i!==this._fetchEpoch)return;if(!u.some(g=>g.status==="fulfilled")){console.warn("silk-calendar-card: calendar fetch failed",u);return}let f=[];u.forEach((g,v)=>{if(!(g.status!=="fulfilled"||!Array.isArray(g.value)))for(let $ of g.value){let A=Do($.start);if(!A)continue;let M=Do($.end),I=Math.max(M?.ms??(A.allDay?A.ms+sn:A.ms),A.ms);f.push({calIndex:v,summary:($.summary??"").trim()||"Busy",allDay:A.allDay,startMs:A.ms,endMs:I})}}),this._events=f}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_colorFor(t){return this._config?.colors?.[t]??Io[t%Io.length]}_dayLabel(t,e,i){let n=Math.round((t-e)/sn);return n===0?"Today":n===1?"Tomorrow":i.format(t)}_onCardClick(){this._entityIds.length>0&&C(this,this._entityIds[0])}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._entityIds.map(H=>e.states[H]);if(i.every(H=>!H))return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${this._entityIds.join(", ")}</div>
        </ha-card>
      `;let n=i.every(H=>_(H)),r=S(i.find(H=>H)),o=t.name??(this._entityIds.length===1?i[0]?.attributes.friendly_name??this._entityIds[0]:"Agenda"),c=Math.max(1,t.limit??jo),d=this._locale(),u=new Intl.DateTimeFormat(d,{hour:"numeric",minute:"2-digit"}),f=new Intl.DateTimeFormat(d,{weekday:"short",month:"short",day:"numeric"}),g=Date.now(),v=Fo(g),$=(this._events??[]).filter(H=>H.endMs>g).map(H=>({ev:H,dayMs:Fo(Math.max(H.startMs,g))})).sort((H,U)=>H.dayMs-U.dayMs||Number(U.ev.allDay)-Number(H.ev.allDay)||H.ev.startMs-U.ev.startMs||H.ev.summary.localeCompare(U.ev.summary)),A=$.slice(0,c),M=$.length-A.length,I=[],F=null;for(let{ev:H,dayMs:U}of A)U!==F&&(F=U,I.push(l`<div class="day">${this._dayLabel(U,v,f)}</div>`)),I.push(l`
        <div class="row" title=${H.summary}>
          <span class="bar" style="background:${this._colorFor(H.calIndex)}"></span>
          <span class="summary">${H.summary}</span>
          <span class="time">
            ${H.allDay?"All day":`${u.format(H.startMs)}\u2013${u.format(H.endMs)}`}
          </span>
        </div>
      `);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        ${o!==""?l`<div class="title">${o}</div>`:p}
        <div class="list">
          ${I}
          ${this._events!==void 0&&$.length===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:calendar-check-outline"></ha-icon>
                  <span>No events</span>
                </div>
              `:p}
          ${M>0?l`<div class="more">+${M} more</div>`:p}
        </div>
      </ha-card>
    `}};Xt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
      }
      .title {
        flex: none;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .list {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .day {
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--secondary-text-color);
        margin: 6px 0 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .list > .day:first-child {
        margin-top: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px;
        min-width: 0;
      }
      .bar {
        flex: none;
        width: 3px;
        height: 15px;
        border-radius: 2px;
        background: var(--silk-accent);
      }
      .summary {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .time {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .more {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        padding: 4px 0 0 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .empty {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0 4px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .empty ha-icon {
        --mdc-icon-size: 18px;
        opacity: 0.7;
      }
      .unavailable .title,
      .unavailable .list {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Xt.prototype,"hass",2),m([h()],Xt.prototype,"_config",2),m([h()],Xt.prototype,"_events",2),Xt=m([x("silk-calendar-card")],Xt);var Go={type:"silk-countdown-card",name:"Silk Countdown",description:"D-day, counted honestly."},Vd=864e5,rn=36e5,Vo=6e4,Gd=48*rn,Bd="mdi:calendar-clock",Wd="D-day";function on(a){let s=/^(\d{4})-(\d{2})-(\d{2})$/.exec(a.trim());if(s){let e=new Date(Number(s[1]),Number(s[2])-1,Number(s[3])).getTime();return Number.isFinite(e)?{ms:e,hasTime:!1}:null}let t=Date.parse(a);return Number.isFinite(t)?{ms:t,hasTime:!0}:null}function Yd(a){let s=a.attributes;if(s.has_date){let t=!!s.has_time,e=new Date(s.year,(s.month??1)-1,s.day??1,t?s.hour??0:0,t?s.minute??0:0,t?s.second??0:0).getTime();return Number.isFinite(e)?{ms:e,hasTime:t}:null}return s.has_date===!1?null:on(a.state)}function Kd(a,s){let t=new Date(a),e=new Date(s);return Math.ceil((Date.UTC(t.getFullYear(),t.getMonth(),t.getDate())-Date.UTC(e.getFullYear(),e.getMonth(),e.getDate()))/Vd)}var Bo="silk-countdown-card-editor";E(Bo,[{name:"name",selector:{text:{}}},{name:"date",selector:{text:{}}},{name:"entity",selector:{entity:{domain:["input_datetime","date","datetime","sensor"]}}},{name:"icon",selector:{icon:{}}}],{name:"Name",date:"Date (YYYY-MM-DD or ISO)",entity:"Entity (overrides date)",icon:"Icon"});var _e=class extends y{static getStubConfig(s){let t=Object.keys(s.states),e=t.find(i=>i.startsWith("input_datetime.")&&s.states[i].attributes.has_date)??t.find(i=>i.startsWith("sensor.")&&s.states[i].attributes.device_class==="timestamp");return e?{type:"custom:silk-countdown-card",entity:e}:{type:"custom:silk-countdown-card",date:`${new Date().getFullYear()+1}-01-01`,name:"New Year"}}static async getConfigElement(){return document.createElement(Bo)}setConfig(s){if(!s.date&&!s.entity)throw new Error("silk-countdown-card: set `date` or `entity`");if(s.date&&on(s.date)===null)throw new Error("silk-countdown-card: `date` must be YYYY-MM-DD or an ISO datetime");this._config=s}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:1}}connectedCallback(){super.connectedCallback(),this._tickTimer=window.setInterval(()=>this.requestUpdate(),Vo)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tickTimer)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){let s=this._config?.entity;s&&C(this,s)}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=!!s.entity,i=e?t.states[s.entity]:void 0;if(e&&!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${s.entity}</div>
        </ha-card>
      `;let n=e&&_(i),r=n?null:e?Yd(i):on(s.date),o=Date.now(),c=r===null?null:Kd(r.ms,o),d=c!==null&&c<0,u=c===null?"\u2014":c===0?"D-DAY":c>0?`D-${c}`:`D+${-c}`,f=n?"Unavailable":"No date",g="";if(r!==null){let M=new Date(r.ms),I=M.getFullYear()===new Date(o).getFullYear();f=new Intl.DateTimeFormat(this._locale(),{weekday:"short",month:"short",day:"numeric",...I?{}:{year:"numeric"}}).format(M);let F=r.ms-o;if(r.hasTime&&F>0&&F<Gd){let H=Math.floor(F/rn),U=Math.floor(F%rn/Vo);g=`${H}h ${U}m`}}let v=S(i),$=s.name??i?.attributes.friendly_name??Wd,A=!n&&c!==null&&c>=0;return l`
      <ha-card
        class="control ${n?"unavailable":""} ${e?"":"static"}"
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div class="icon ${A?"on":""}">
          ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:i?l`<ha-state-icon .hass=${t} .stateObj=${i}></ha-state-icon>`:l`<ha-icon .icon=${Bd}></ha-icon>`}
        </div>
        <div class="info">
          <div class="name">${$}</div>
          <div class="state">
            ${f}${g?l`<span class="sep">·</span>${g}`:p}
          </div>
        </div>
        <div class="trailing">
          <span class="dday ${d?"past":""}">${u}</span>
        </div>
      </ha-card>
    `}};_e.styles=[k,w`
      /* No control action: the icon presses with the card. */
      .icon {
        cursor: inherit;
      }
      .icon:active {
        transform: none;
      }
      /* A fixed-date card opens nothing, so it should not invite a tap. */
      ha-card.static {
        cursor: default;
      }
      .dday {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        transition: color 200ms ease;
      }
      .dday.past {
        color: var(--secondary-text-color);
      }
    `],m([b({attribute:!1})],_e.prototype,"hass",2),m([h()],_e.prototype,"_config",2),_e=m([x("silk-countdown-card")],_e);var Yo={type:"silk-automation-card",name:"Silk Automation",description:"See it, arm it, fire it."},Wo=2e3,Xd=3e4,Ko="silk-automation-card-editor";E(Ko,[{name:"entity",required:!0,selector:{entity:{domain:["automation"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});function Qd(a){if(!Number.isFinite(a))return null;let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}var St=class extends y{constructor(){super(...arguments);this._optimistic=null;this._optimisticRunAt=null;this._optimisticBase="";this._runBase=null}static getStubConfig(t){return{type:"custom:silk-automation-card",entity:Object.keys(t.states).find(i=>i.startsWith("automation."))}}static async getConfigElement(){return document.createElement(Ko)}setConfig(t){if(!t.entity)throw new Error("silk-automation-card: `entity` is required");if(O(t.entity)!=="automation")throw new Error(`silk-automation-card: entity must be an automation, got \`${O(t.entity)}\``);this._config=t,this._clearOptimistic(),this._clearOptimisticRun()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),Xd)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer),window.clearTimeout(this._optimisticTimer),window.clearTimeout(this._runTimer)}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity];e&&(this._optimistic!==null&&e.last_updated!==this._optimisticBase&&this._clearOptimistic(),this._optimisticRunAt!==null&&(e.attributes.last_triggered??null)!==this._runBase&&this._clearOptimisticRun())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_clearOptimisticRun(){window.clearTimeout(this._runTimer),this._runTimer=void 0,this._optimisticRunAt=null}_onCardClick(){this._config&&C(this,this._config.entity)}_onToggleClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||_(n))return;T(this);let r=!(this._optimistic??n.state==="on");this._optimistic=r,this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Wo),i.callService("automation",r?"turn_on":"turn_off",{entity_id:e.entity})}_onRunClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];!n||_(n)||(T(this),this._flash(),this._optimisticRunAt=Date.now(),this._runBase=n.attributes.last_triggered??null,window.clearTimeout(this._runTimer),this._runTimer=window.setTimeout(()=>this._clearOptimisticRun(),Wo),i.callService("automation","trigger",{entity_id:e.entity}))}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_lastRunText(t){if(this._optimisticRunAt!==null)return"Last run just now";let e=t.attributes.last_triggered,i=typeof e=="string"&&e?Qd(Date.parse(e)):null;return i===null?"Never run":`Last run ${i}`}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=!n&&(this._optimistic??i.state==="on"),o=this._optimistic===null?i:{...i,state:this._optimistic?"on":"off"},c=S(o,t.color),d=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <div class="flash"></div>
        <button
          class="icon ${r?"on":""}"
          .disabled=${n}
          aria-label=${`Toggle ${d}`}
          @click=${this._onToggleClick}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${o}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${d}</div>
          <div class="state">${this._lastRunText(i)}</div>
        </div>
        <div class="trailing">
          <button
            class="run"
            .disabled=${n}
            aria-label=${`Run ${d} now`}
            title="Run now"
            @click=${this._onRunClick}
          >
            <ha-icon icon="mdi:play"></ha-icon>
          </button>
          <button
            class="switch ${r?"checked":""}"
            role="switch"
            aria-checked=${r?"true":"false"}
            aria-label=${`Enable ${d}`}
            .disabled=${n}
            @click=${this._onToggleClick}
          >
            <span class="thumb"></span>
          </button>
        </div>
      </ha-card>
    `}};St.styles=[k,w`
      /* Fire feedback = a brief accent surface wash, never a glow shadow. */
      .flash {
        position: absolute;
        inset: 0;
        background: var(--silk-accent);
        opacity: 0;
        pointer-events: none;
        z-index: 0;
      }
      .flash.go {
        animation: silk-automation-flash 400ms var(--silk-ease-out);
      }
      @keyframes silk-automation-flash {
        0% {
          opacity: 0;
        }
        35% {
          opacity: 0.15;
        }
        100% {
          opacity: 0;
        }
      }
      .run {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        padding: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .run:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .run:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .run:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .run ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      /* Compact 40×24 switch — same anatomy as silk-toggle-card's, scaled. */
      .switch {
        flex: none;
        position: relative;
        width: 40px;
        height: 24px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        cursor: pointer;
        display: block;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 40px without growing the track. */
      .switch::after {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 999px;
      }
      .switch.checked {
        background: var(--silk-accent);
      }
      .switch:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .thumb {
        display: block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .switch.checked .thumb {
        transform: translateX(16px);
      }
      .icon:disabled,
      .run:disabled,
      .switch:disabled {
        cursor: default;
      }
      .run:disabled {
        transform: none;
      }
    `],m([b({attribute:!1})],St.prototype,"hass",2),m([h()],St.prototype,"_config",2),m([h()],St.prototype,"_optimistic",2),m([h()],St.prototype,"_optimisticRunAt",2),St=m([x("silk-automation-card")],St);var Xo={type:"silk-log-card",name:"Silk Log",description:"An entity's recent life, in plain rows."},Qo=24,Zo=6,Zd=3e5,Jd=3e4,tm=3e4,Jo="silk-log-card-editor";E(Jo,[{name:"entity",required:!0,selector:{entity:{}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"limit",selector:{number:{min:1,max:20,mode:"box"}}}]}],{entity:"Entity",name:"Name",hours_to_show:"Hours to show",limit:"Rows"},{hours_to_show:Qo,limit:Zo});function ui(a){return typeof a=="number"?a>1e12?a:a*1e3:Date.parse(a)}function em(a){let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}var Qt=class extends y{constructor(){super(...arguments);this._entries=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-log-card",entity:e.find(n=>n.startsWith("binary_sensor."))??e.find(n=>n.startsWith("light."))??e.find(n=>n.startsWith("switch."))??e[0]}}static async getConfigElement(){return document.createElement(Jo)}setConfig(t){if(!t.entity)throw new Error("silk-log-card: `entity` is required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-log-card: `hours_to_show` must be a positive number");if(t.limit!==void 0&&!(Number(t.limit)>0))throw new Error("silk-log-card: `limit` must be a positive number");this._config=t,this._fetchStarted=!1,this._entries=null,this._lastUpdated=void 0}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Zd),this._clockTimer=window.setInterval(()=>this.requestUpdate(),tm)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearInterval(this._clockTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,Jd-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??Qo,i=++this._fetchSeq,n=new Date,r=new Date(n.getTime()-e*36e5),o;try{o=await this.hass.callApi("GET","logbook/"+r.toISOString()+"?entity="+t+"&end_time="+encodeURIComponent(n.toISOString()))}catch(c){console.warn("silk-log-card: logbook fetch failed",c);return}i===this._fetchSeq&&(this._lastFetch=Date.now(),this._entries=(Array.isArray(o)?o:[]).filter(c=>Number.isFinite(ui(c.when))).sort((c,d)=>ui(d.when)-ui(c.when)))}_dotActive(t){if(!t.state)return!1;let e={entity_id:this._config.entity,state:t.state,attributes:{},last_changed:"",last_updated:""};return R(e)}_rowText(t,e){let i;return t.state?i=e?N(this.hass,{...e,state:t.state}):t.state.replace(/_/g," "):i=t.message??"",i?i.charAt(0).toUpperCase()+i.slice(1):"\u2014"}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config;if(!t)return p;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=t.limit??Zo,d=this._entries?.slice(0,c)??[];return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!n&&R(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          <div class="trailing">
            ${this._entries!==null?l`<span class="count">${this._entries.length}</span>`:p}
          </div>
        </div>
        <div class="rows">
          ${this._entries!==null&&d.length===0?l`<div class="empty">No recent activity</div>`:d.map(u=>l`
                  <div class="row">
                    <span class="dot ${this._dotActive(u)?"on":""}"></span>
                    <span class="what">${this._rowText(u,i)}</span>
                    <span class="when">${em(ui(u.when))}</span>
                  </div>
                `)}
        </div>
      </ha-card>
    `}};Qt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The log card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .count {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        padding: 4px 9px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 7px;
        overflow: hidden;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        animation: silk-log-in 250ms var(--silk-ease-out);
      }
      .dot {
        flex: none;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        transition: background 200ms ease;
      }
      .dot.on {
        background: var(--silk-accent);
      }
      .what {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .when {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .empty {
        font-size: 12.5px;
        color: var(--secondary-text-color);
      }
      .unavailable .rows {
        opacity: 0.45;
      }
      @keyframes silk-log-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],Qt.prototype,"hass",2),m([h()],Qt.prototype,"_config",2),m([h()],Qt.prototype,"_entries",2),Qt=m([x("silk-log-card")],Qt);var ia={type:"silk-notify-card",name:"Silk Inbox",description:"Persistent notifications you can actually clear."},cn=5,im=3e4,nm=1e4,sm=1e4;function ta(a){return a?(Array.isArray(a)?a.map(t=>[t?.notification_id??"",t]):Object.entries(a)).filter(([t,e])=>!!e&&!!(e.notification_id??t)).map(([t,e])=>({...e,notification_id:e.notification_id??t})):[]}var an=[[60,1,"second"],[3600,60,"minute"],[86400,3600,"hour"],[Number.POSITIVE_INFINITY,86400,"day"]],hi,ea="";function rm(a,s){let t=Date.parse(a);if(!Number.isFinite(t))return"";if(!hi||ea!==s){try{hi=new Intl.RelativeTimeFormat(s,{numeric:"auto",style:"narrow"})}catch{hi=new Intl.RelativeTimeFormat("en",{numeric:"auto",style:"narrow"})}ea=s}let e=(t-Date.now())/1e3,i=Math.abs(e),n=an.find(([r])=>i<r)??an[an.length-1];return hi.format(Math.trunc(e/n[1]),n[2])}var na="silk-notify-card-editor";E(na,[{name:"name",selector:{text:{}}},{name:"limit",selector:{number:{min:1,max:20,mode:"box"}}}],{name:"Name",limit:"Rows to show"},{limit:cn});var Zt=class extends y{constructor(){super(...arguments);this._rows=null;this._byId=new Map;this._dismissed=new Map;this._started=!1;this._subscribed=!1;this._gotEvent=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(){return{type:"custom:silk-notify-card"}}static async getConfigElement(){return document.createElement(na)}setConfig(t){if(t.limit!==void 0&&!(Number(t.limit)>0))throw new Error("silk-notify-card: `limit` must be a positive number");this._config=t}getCardSize(){let t=this._rows?.length??2;return 1+Math.max(1,Math.min(t,this._limit()))}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._onTick(),im),this._started&&this._start()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),this._teardown()}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._started){this._started=!0,this._start();return}t.has("hass")&&!this._subscribed&&!this._gotEvent&&Date.now()-this._lastFetch>nm&&this._fetch()}}_limit(){let t=Number(this._config?.limit??cn);return Number.isFinite(t)&&t>=1?Math.floor(t):cn}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onTick(){this._subscribed||this._gotEvent?this.requestUpdate():this._fetch()}async _start(){if(this._unsubPromise)return;this._fetch();let t=this.hass?.connection;if(!(!t||typeof t.subscribeMessage!="function"))try{let e=t.subscribeMessage(i=>this._onSubscriptionEvent(i),{type:"persistent_notification/subscribe"});this._unsubPromise=e,await e,this._subscribed=!0,this.isConnected||this._teardown()}catch{this._unsubPromise=void 0,this._subscribed=!1}}_teardown(){let t=this._unsubPromise;this._unsubPromise=void 0,this._subscribed=!1,this._gotEvent=!1,t&&t.then(e=>e()).catch(()=>{})}async _fetch(){let t=this.hass;if(!t)return;let e=++this._fetchSeq;this._lastFetch=Date.now();let i;try{i=await t.callWS({type:"persistent_notification/get"})}catch(n){console.warn("silk-notify-card: notification fetch failed",n);return}e!==this._fetchSeq||this._gotEvent||(this._byId=new Map(ta(i).map(n=>[n.notification_id,n])),this._commit(!0))}_onSubscriptionEvent(t){this._gotEvent=!0;let e=ta(t.notifications);switch(t.type){case"current":this._byId=new Map(e.map(i=>[i.notification_id,i])),this._commit(!0);return;case"added":case"updated":for(let i of e)this._byId.set(i.notification_id,i);break;case"removed":for(let i of e)this._byId.delete(i.notification_id),this._dismissed.delete(i.notification_id);break;default:this._fetch();return}this._commit(!1)}_commit(t){let e=Date.now();for(let[i,n]of this._dismissed)t&&!this._byId.has(i)?this._dismissed.delete(i):e-n>sm&&this._dismissed.delete(i);this._rows=[...this._byId.values()].filter(i=>!this._dismissed.has(i.notification_id)).sort((i,n)=>(Date.parse(n.created_at)||0)-(Date.parse(i.created_at)||0))}_dismiss(t,e){t.stopPropagation();let i=this.hass;i&&(T(this),this._dismissed.set(e,Date.now()),this._byId.delete(e),this._commit(!1),i.callService("persistent_notification","dismiss",{notification_id:e}))}_clearAll(t){t.stopPropagation();let e=this.hass,i=this._rows;if(!e||!i||i.length===0)return;T(this);let n=Date.now();for(let r of i)this._dismissed.set(r.notification_id,n),this._byId.delete(r.notification_id),e.callService("persistent_notification","dismiss",{notification_id:r.notification_id});this._commit(!1)}_renderRow(t,e){return l`
      <div class="row">
        <div class="body">
          <div class="row-top">
            ${t.title?l`<span class="title">${t.title}</span>`:p}
            <span class="time">${rm(t.created_at,e)}</span>
          </div>
          <div class="msg">${t.message}</div>
        </div>
        <button
          class="dismiss"
          aria-label=${`Dismiss ${t.title??"notification"}`}
          @click=${i=>this._dismiss(i,t.notification_id)}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </button>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._rows,n=i?.length??0,r=i?i.slice(0,this._limit()):[],o=t.name??"Notifications",c=this._locale();return l`
      <ha-card class="control" style="--silk-accent:${S(void 0)}">
        <div class="head">
          <div class="icon ${n>0?"on":""}">
            <ha-icon icon="mdi:bell-outline"></ha-icon>
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          <div class="trailing">
            ${n>1?l`<button class="clear" @click=${this._clearAll}>Clear all</button>`:p}
            ${n>0?l`<span class="chip active count">${n}</span>`:p}
          </div>
        </div>
        ${i===null?p:n===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:bell-check-outline"></ha-icon>
                  <span>All clear</span>
                </div>
              `:l`<div class="list">${r.map(d=>this._renderRow(d,c))}</div>`}
      </ha-card>
    `}};Zt.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 10px;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The inbox header icon is a status lamp, not a control. */
      .icon {
        cursor: default;
      }
      .icon:active {
        transform: none;
      }
      .count {
        cursor: default;
        font-variant-numeric: tabular-nums;
      }
      .clear {
        position: relative;
        border: none;
        background: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        padding: 6px 8px;
        margin: -6px -4px;
        border-radius: 8px;
        color: var(--secondary-text-color);
        cursor: pointer;
        white-space: nowrap;
        transition:
          color 150ms ease-out,
          background 150ms ease-out;
      }
      .clear:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      /* Invisible halo lifts the touch target toward the 36px floor. */
      .clear::after {
        content: '';
        position: absolute;
        inset: -6px;
      }
      .list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .row {
        flex: none;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 10px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        animation: silk-notify-in 200ms var(--silk-ease-out);
      }
      .body {
        flex: 1;
        min-width: 0;
      }
      .row-top {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .time {
        flex: none;
        margin-left: auto;
        font-size: 10.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.85;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .msg {
        font-size: 12px;
        line-height: 1.35;
        color: var(--secondary-text-color);
        overflow-wrap: anywhere;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .dismiss {
        flex: none;
        position: relative;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 9px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      .dismiss:active {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .dismiss:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      /* Invisible halo lifts the 28px button to a 42px touch target. */
      .dismiss::after {
        content: '';
        position: absolute;
        inset: -7px;
      }
      .dismiss ha-icon {
        --mdc-icon-size: 16px;
        pointer-events: none;
      }
      .empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 0 12px;
        color: var(--secondary-text-color);
        animation: silk-notify-in 200ms var(--silk-ease-out);
      }
      .empty ha-icon {
        --mdc-icon-size: 26px;
        opacity: 0.7;
      }
      .empty span {
        font-size: 12.5px;
      }
      @keyframes silk-notify-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],m([b({attribute:!1})],Zt.prototype,"hass",2),m([h()],Zt.prototype,"_config",2),m([h()],Zt.prototype,"_rows",2),Zt=m([x("silk-notify-card")],Zt);var ra={type:"silk-counter-card",name:"Silk Count",description:"How many are on \u2014 tap to see which."},om="mdi:counter",ln=40,sa=8,oa="silk-counter-card-editor";E(oa,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{name:"Name",icon:"Icon"});var Jt=class extends y{constructor(){super(...arguments);this._expanded=!1}static getStubConfig(t){return{type:"custom:silk-counter-card",entities:Object.keys(t.states).filter(i=>i.startsWith("light.")).slice(0,8),name:"Lights on",icon:"mdi:lightbulb-group"}}static async getConfigElement(){return document.createElement(oa)}setConfig(t){if(!Array.isArray(t.entities)||t.entities.length===0||t.entities.some(e=>typeof e!="string"))throw new Error("silk-counter-card: `entities` must be a non-empty list of entity ids");if(!t.name)throw new Error("silk-counter-card: `name` is required");if(t.condition!==void 0&&t.condition!=="active"&&t.condition!=="state")throw new Error("silk-counter-card: `condition` must be 'active' or 'state'");if(t.condition==="state"&&typeof t.state!="string")throw new Error("silk-counter-card: `state` is required when `condition: state`");this._config=t,this._expanded=!1}getCardSize(){let t=this._expanded?this._matchIds().length:0;return 1+Math.ceil(t*ln/50)}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:1}}willUpdate(t){t.has("hass")&&this._expanded&&this._matchIds().length===0&&(this._expanded=!1)}_matchIds(){let t=this._config,e=this.hass;return!t||!e?[]:t.entities.filter(i=>{let n=e.states[i];return n?t.condition==="state"?n.state===t.state:R(n):!1})}_onCardClick(){if(this._matchIds().length===0){this._expanded=!1;return}this._expanded=!this._expanded,T(this)}_onRowClick(t,e){t.stopPropagation(),C(this,e)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;if(t.entities.every(g=>!e.states[g]))return l`
        <ha-card>
          <div class="warning">Entities not found: ${t.entities.join(", ")}</div>
        </ha-card>
      `;let i=this._matchIds(),n=i.length,r=t.entities.length,o=t.entities.every(g=>_(e.states[g])),c=S(e.states[t.entities[0]],t.color),d=n>0,u=this._expanded&&d,f=u?n*ln+sa:0;return l`
      <ha-card
        class="control ${o?"unavailable":""} ${u?"expanded":""}"
        style="--silk-accent:${c}"
        role="button"
        aria-expanded=${u?"true":"false"}
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="icon ${n>0?"on":""}">
            <ha-icon .icon=${t.icon??om}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${t.name}</div>
            <div class="state">${n}/${r} total</div>
          </div>
          <div class="trailing">
            <span class="count ${n>0?"nonzero":""}">${n}</span>
            <ha-icon
              class="chev ${d?"":"hidden"}"
              icon="mdi:chevron-down"
            ></ha-icon>
          </div>
        </div>
        <div class="drawer" style="max-height:${f}px">
          <div class="rows">
            ${i.map(g=>{let v=e.states[g];return l`
                <button class="row" @click=${$=>this._onRowClick($,g)}>
                  <ha-state-icon .hass=${e} .stateObj=${v}></ha-state-icon>
                  <span class="row-name">${v.attributes.friendly_name??g}</span>
                  <span class="row-state">${N(e,v)}</span>
                </button>
              `})}
          </div>
        </div>
      </ha-card>
    `}};Jt.styles=[k,w`
      /* The card may outgrow its grid cell while the drawer is open. */
      ha-card {
        height: auto;
        min-height: 100%;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 0;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The whole card is the expand control; the icon presses with it. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .count {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        transition: color 200ms ease;
      }
      .count.nonzero {
        color: var(--silk-accent);
      }
      .chev {
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        opacity: 0.7;
        transition:
          transform 200ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .chev.hidden {
        opacity: 0;
      }
      .expanded .chev {
        transform: rotate(180deg);
      }
      .drawer {
        overflow: hidden;
        visibility: hidden;
        transition:
          max-height 250ms ease-out,
          visibility 0s linear 250ms;
      }
      .expanded .drawer {
        visibility: visible;
        transition: max-height 250ms ease-out;
      }
      .rows {
        display: flex;
        flex-direction: column;
        padding-top: ${sa}px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${ln}px;
        border: none;
        background: none;
        margin: 0;
        padding: 0 4px;
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        text-align: left;
        color: inherit;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row ha-state-icon {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--silk-accent);
        pointer-events: none;
      }
      .row-name {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row-state {
        flex: none;
        max-width: 40%;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .unavailable .head {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],Jt.prototype,"hass",2),m([h()],Jt.prototype,"_config",2),m([h()],Jt.prototype,"_expanded",2),Jt=m([x("silk-counter-card")],Jt);var aa={type:"silk-device-card",name:"Silk Device",description:"Battery, signal, and last-seen for your fleet."},ca=20,am=50,cm=3e4,la="silk-device-card-editor";E(la,[{name:"name",selector:{text:{}}}],{name:"Name"});function lm(a){if(!Number.isFinite(a))return null;let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}function dm(a){return a<ca?"crit":a<am?"warn":"good"}var mm={crit:"mdi:battery-alert-variant-outline",warn:"mdi:battery-50",good:"mdi:battery"},ve=class extends y{static getStubConfig(s){return{type:"custom:silk-device-card",devices:Object.keys(s.states).filter(e=>e.startsWith("sensor.")&&s.states[e].attributes.device_class==="battery").slice(0,3).map(e=>{let i=String(s.states[e].attributes.friendly_name??e);return{name:i.replace(/\s+battery(\s+level)?\s*$/i,"")||i,battery:e}})}}static async getConfigElement(){return document.createElement(la)}setConfig(s){if(!Array.isArray(s.devices)||s.devices.length===0)throw new Error("silk-device-card: `devices` is required \u2014 a list of {name, battery?, signal?, last_seen?}");for(let t of s.devices)if(typeof t?.name!="string"||!t.name)throw new Error("silk-device-card: every device needs a `name`");this._config=s}getCardSize(){return Math.max(2,1+Math.ceil((this._config?.devices.length??3)/2))}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),cm)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer)}_level(s){if(!s||_(s)||s.state==="")return;let t=Number(s.state);return Number.isFinite(t)?P(t,0,100):void 0}_signalText(s){if(!s||_(s)||s.state==="")return null;let t=Number(s.state);if(!Number.isFinite(t))return null;let e=String(s.attributes.unit_of_measurement??"");return/dbm/i.test(e)||t<0?`${Math.round(t)} dBm`:`LQI ${Math.round(t)}`}_seenText(s){if(!s||_(s)||s.state==="")return null;let t=Date.parse(s.state);if(!Number.isFinite(t)){let e=Number(s.state);if(!Number.isFinite(e))return null;t=e>1e12?e:e*1e3}return lm(t)}_rows(){let s=this.hass,t=this._config.devices.map(e=>{let i=[e.battery,e.signal,e.last_seen].filter(n=>typeof n=="string"&&n!=="");return{entry:e,level:this._level(e.battery?s.states[e.battery]:void 0),signal:this._signalText(e.signal?s.states[e.signal]:void 0),seen:this._seenText(e.last_seen?s.states[e.last_seen]:void 0),target:e.battery??i[0],dead:i.length===0||i.every(n=>_(s.states[n]))}});return t.sort((e,i)=>e.level===void 0&&i.level===void 0?e.entry.name.localeCompare(i.entry.name):e.level===void 0?1:i.level===void 0?-1:e.level-i.level||e.entry.name.localeCompare(i.entry.name)),t}_onRowClick(s,t){s.stopPropagation(),t&&C(this,t)}_renderRow(s,t){let e=s.level===void 0?void 0:dm(s.level),i=s.level===void 0?"":`, battery ${Math.round(s.level)}%`;return l`
      <button
        class="row ${s.dead?"unavailable":""}"
        aria-label=${`${s.entry.name}${i}`}
        @click=${n=>this._onRowClick(n,s.target)}
      >
        <span class="dname">${s.entry.name}</span>
        ${t.battery?l`<span class="batt">
              ${e===void 0?l`<span class="dash">—</span>`:l`
                    <ha-icon class="bicon ${e}" .icon=${mm[e]}></ha-icon>
                    <span class="pct">${Math.round(s.level)}%</span>
                  `}
            </span>`:p}
        ${t.signal?l`<span class="meta sig">${s.signal??"\u2014"}</span>`:p}
        ${t.seen?l`<span class="meta seen">${s.seen??"\u2014"}</span>`:p}
      </button>
    `}render(){let s=this._config,t=this.hass;if(!s||!t)return p;let e=this._rows(),i={battery:s.devices.some(o=>o.battery),signal:s.devices.some(o=>o.signal),seen:s.devices.some(o=>o.last_seen)},n=e.filter(o=>o.level!==void 0&&o.level<ca).length,r=s.name??"Devices";return l`
      <ha-card class="control" style="--silk-accent:${S(void 0)}">
        <div class="header">
          <ha-icon class="hicon" icon="mdi:devices"></ha-icon>
          <div class="hname">${r}</div>
          ${n>0?l`<span class="badge">${n} low</span>`:p}
        </div>
        <div class="rows">${e.map(o=>this._renderRow(o,i))}</div>
      </ha-card>
    `}};ve.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 22px;
      }
      .hicon {
        flex: none;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
        font-variant-numeric: tabular-nums;
      }
      .rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 -6px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 30px;
        margin: 0;
        padding: 3px 6px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.unavailable {
        opacity: 0.45;
      }
      .dname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .batt {
        flex: none;
        min-width: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 3px;
      }
      .bicon {
        flex: none;
        --mdc-icon-size: 14px;
        color: var(--secondary-text-color);
      }
      .bicon.crit {
        color: var(--error-color, #db4437);
      }
      .bicon.warn {
        color: var(--warning-color, #ffa600);
      }
      .pct {
        font-size: 12px;
        font-weight: 600;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .meta {
        flex: none;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .sig {
        min-width: 54px;
      }
      .seen {
        min-width: 52px;
      }
      .dash {
        font-size: 11px;
        color: var(--secondary-text-color);
        opacity: 0.6;
      }
    `],m([b({attribute:!1})],ve.prototype,"hass",2),m([h()],ve.prototype,"_config",2),ve=m([x("silk-device-card")],ve);var ma={type:"silk-presence-card",name:"Silk Family",description:"Everyone's whereabouts in one strip."},da=44,pa="silk-presence-card-editor";E(pa,[{name:"name",selector:{text:{}}}],{name:"Name"});var te=class extends y{constructor(){super(...arguments);this._broken=new Set}static getStubConfig(t){return{type:"custom:silk-presence-card",entities:Object.keys(t.states).filter(i=>i.startsWith("person."))}}static async getConfigElement(){return document.createElement(pa)}setConfig(t){if(!Array.isArray(t.entities)||t.entities.length===0)throw new Error("silk-presence-card: `entities` is required \u2014 a list of person/device_tracker ids");for(let e of t.entities){let i=typeof e=="string"?O(e):"";if(i!=="person"&&i!=="device_tracker")throw new Error(`silk-presence-card: \`${String(e)}\` is not a person or device_tracker entity`)}this._config=t,this._broken=new Set}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}_zone(t,e){if(t.formatEntityState)return N(t,e);switch(e.state){case"home":return"Home";case"not_home":return"Away";default:return e.state.replace(/_/g," ")}}_onPersonClick(t,e){t.stopPropagation(),C(this,e)}_onImgError(t){let e=new Set(this._broken);e.add(t),this._broken=e}_renderPerson(t){let e=this.hass,i=e.states[t],n=i?.attributes.friendly_name??t.split(".")[1]??t,r=_(i),o=!r&&i.state==="home",c=i?.attributes.entity_picture,d=typeof c=="string"&&c&&!this._broken.has(c)?c:void 0,u=(Array.from(n.trim())[0]??"?").toUpperCase(),f=i?this._zone(e,i):"\u2014";return l`
      <button
        class="cell ${r?"unavailable":""}"
        aria-label=${`${n}: ${f}`}
        title=${n}
        @click=${g=>this._onPersonClick(g,t)}
      >
        <span class="avatar ${o?"home":"away"}">
          ${d?l`<img
                src=${d}
                alt=${n}
                loading="lazy"
                @error=${()=>this._onImgError(d)}
              />`:l`<span class="initial">${u}</span>`}
        </span>
        <span class="zone">${f}</span>
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=t.entities.filter(o=>e.states[o]?.state==="home").length,n=S(e.states[t.entities[0]]),r=l`
      <div class="summary">
        <span class="count ${i>0?"some":""}">${i}</span> home
      </div>
    `;return l`
      <ha-card class="control" style="--silk-accent:${n}">
        ${t.name?l`<div class="header">
              <div class="hname">${t.name}</div>
              ${r}
            </div>`:p}
        <div class="strip">
          <div class="people">${t.entities.map(o=>this._renderPerson(o))}</div>
          ${t.name?p:r}
        </div>
      </ha-card>
    `}};te.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        padding: 10px 14px;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .hname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .strip {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .people {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 8px 10px;
      }
      .cell {
        flex: none;
        width: 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        cursor: pointer;
        outline: none;
      }
      .cell.unavailable {
        opacity: 0.45;
      }
      .avatar {
        flex: none;
        width: ${da}px;
        height: ${da}px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        user-select: none;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        color: var(--secondary-text-color);
        /* Hard 2px ring, zero blur — a border, not a glow. */
        box-shadow: 0 0 0 2px rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.45);
        transition:
          transform 250ms var(--silk-spring),
          box-shadow 200ms ease,
          background 200ms ease,
          color 200ms ease;
      }
      .cell:active .avatar {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .cell:focus-visible .avatar {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .avatar.home {
        box-shadow: 0 0 0 2px var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
        color: var(--silk-accent);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: filter 200ms ease, opacity 200ms ease;
      }
      /* Away reads as absence: the portrait goes monochrome, no color needed. */
      .avatar.away img {
        filter: grayscale(1);
        opacity: 0.7;
      }
      .initial {
        font-size: 18px;
        font-weight: 600;
        line-height: 1;
      }
      .zone {
        max-width: 100%;
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .summary {
        flex: none;
        font-size: 13px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .count.some {
        color: var(--silk-accent);
        font-weight: 600;
      }
    `],m([b({attribute:!1})],te.prototype,"hass",2),m([h()],te.prototype,"_config",2),m([h()],te.prototype,"_broken",2),te=m([x("silk-presence-card")],te);var ua={type:"silk-shutter-card",name:"Silk Shutter",description:"A window you can drag."},pm=1,um=2,fi=4,hm=8,fm=2e3,gm=4,_m=5,ha="silk-shutter-card-editor";E(ha,[{name:"entity",required:!0,selector:{entity:{domain:["cover"]}}},{name:"name",selector:{text:{}}},{name:"invert",selector:{boolean:{}}}],{entity:"Entity",name:"Name",invert:"Invert reported position"});var Mt=class extends y{constructor(){super(...arguments);this._localPos=null;this._dragging=!1;this._dragMoved=!1;this._dragStartY=0;this._dragStartPos=100;this._dragHeight=1}static getStubConfig(t){return{type:"custom:silk-shutter-card",entity:Object.keys(t.states).find(i=>i.startsWith("cover."))}}static async getConfigElement(){return document.createElement(ha)}setConfig(t){if(!t.entity||O(t.entity)!=="cover")throw new Error("silk-shutter-card: define a cover `entity` (e.g. cover.bedroom_shutter)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 3}getGridOptions(){return{columns:3,rows:3,min_columns:2,min_rows:3}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._localPos=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._localPos=null},fm)}_realPosition(t){let e=t.attributes.current_position;if(typeof e!="number"||!Number.isFinite(e))return;let i=P(e,0,100);return this._config?.invert?100-i:i}_shownPosition(t){return this._localPos??this._realPosition(t)??(t.state==="closed"?0:100)}_commit(t){let e=this.hass,i=this._config;if(!e||!i)return;let n=P(Math.round(i.invert?100-t:t),0,100);e.callService("cover","set_cover_position",{entity_id:i.entity,position:n})}_onCardClick(){this._config&&C(this,this._config.entity)}_onPointerDown(t){this._dragMoved=!1;let e=this.hass?.states[this._config?.entity??""];if(!e||_(e)||!L(e,fi))return;let i=t.currentTarget;i.setPointerCapture(t.pointerId),this._dragging=!0,this._dragStartY=t.clientY,this._dragHeight=i.getBoundingClientRect().height||1,this._dragStartPos=this._shownPosition(e),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}_onPointerMove(t){if(!this._dragging)return;let e=t.clientY-this._dragStartY;!this._dragMoved&&Math.abs(e)<gm||(this._dragMoved=!0,this._localPos=Math.round(P(this._dragStartPos-e/this._dragHeight*100,0,100)))}_onPointerUp(){this._dragging&&(this._dragging=!1,this._dragMoved&&this._localPos!==null&&(this._armExpiry(),this._commit(this._localPos),T(this)))}_onPointerCancel(){this._dragging&&(this._dragging=!1,this._clearOptimistic())}_onWindowClick(t){if(this._dragMoved){t.stopPropagation(),this._dragMoved=!1;return}let e=this.hass,i=this._config;if(!e||!i)return;let n=e.states[i.entity];!n||_(n)||L(n,fi)||(t.stopPropagation(),j(e,i.entity),T(this))}_onWindowKeydown(t){let e=this.hass?.states[this._config?.entity??""];if(!e||_(e)||!L(e,fi))return;let i=t.key==="ArrowUp"||t.key==="ArrowRight"?1:t.key==="ArrowDown"||t.key==="ArrowLeft"?-1:0;if(!i)return;t.preventDefault(),t.stopPropagation();let n=P(this._shownPosition(e)+i*_m,0,100);this._localPos=n,this._armExpiry(),this._commit(n),T(this)}_callCover(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(this._clearOptimistic(),this.hass.callService("cover",e,{entity_id:this._config.entity}),T(this))}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=L(i,fi),d=this._shownPosition(i),u=this._localPos!==null||this._realPosition(i)!==void 0;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="body">
          <div
            class="window ${this._dragging?"dragging":""} ${!c&&!n?"tappable":""}"
            role=${c?"slider":"button"}
            tabindex=${n?-1:0}
            aria-label="${o} position"
            aria-valuemin=${c?"0":p}
            aria-valuemax=${c?"100":p}
            aria-valuenow=${c?String(d):p}
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @click=${this._onWindowClick}
            @keydown=${this._onWindowKeydown}
          >
            <div class="shutter" style="transform:translateY(-${d}%)"></div>
          </div>
          <div class="sill"></div>
          <div class="name">${o}</div>
          <div class="state">
            ${N(e,i)}${u?l`<span class="sep">·</span>${d}%`:p}
          </div>
        </div>
        ${this._renderButtons(i,n,u?d:void 0)}
      </ha-card>
    `}_renderButtons(t,e,i){let n=L(t,pm),r=L(t,hm),o=L(t,um);if(!n&&!r&&!o)return p;let c=i!==void 0?i>=100:t.state==="open",d=i!==void 0?i<=0:t.state==="closed";return l`
      <div class="side">
        ${n?l`
              <button
                class="ctl"
                ?disabled=${e||c}
                aria-label="Open cover"
                @click=${u=>this._callCover(u,"open_cover")}
              >
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </button>
            `:p}
        ${r?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Stop cover"
                @click=${u=>this._callCover(u,"stop_cover")}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `:p}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e||d}
                aria-label="Close cover"
                @click=${u=>this._callCover(u,"close_cover")}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `:p}
      </div>
    `}};Mt.styles=[k,w`
      ha-card {
        justify-content: center;
        gap: 10px;
      }
      .body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
      }
      /* Skeuomorphic window: neutral monochrome depth only — text-color grays
         for the frame/slats, black-alpha inset shadows for the glass. Chroma
         appears solely on the moving edge via the accent. */
      .window {
        flex: none;
        position: relative;
        width: 100px;
        height: 120px;
        box-sizing: border-box;
        border: 2px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.2);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.03);
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
        touch-action: none;
        cursor: ns-resize;
        outline: none;
      }
      .window.tappable {
        cursor: pointer;
      }
      .window:focus-visible {
        box-shadow:
          inset 0 0 0 2px var(--silk-accent),
          inset 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      /* Full-height slat block moved with translateY so only transform animates:
         translateY(-position%) leaves the top (100 - position)% covered. */
      .shutter {
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          to bottom,
          rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.26) 0px,
          rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.13) 6px,
          transparent 6px,
          transparent 8px
        );
        box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.15);
        transform: translateY(-100%);
        transition: transform 250ms var(--silk-ease-out);
        will-change: transform;
      }
      /* The moving edge — the one accent in the graphic. */
      .shutter::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
        background: var(--silk-accent);
      }
      .window.dragging .shutter {
        transition: none;
      }
      .sill {
        flex: none;
        width: 110px;
        height: 4px;
        margin-top: 3px;
        border-radius: 2px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
      }
      .body .name {
        margin-top: 8px;
        max-width: 100%;
        text-align: center;
      }
      .body .state {
        max-width: 100%;
        text-align: center;
      }
      .side {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
        z-index: 1;
      }
      .ctl {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease,
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .unavailable .body,
      .unavailable .side {
        opacity: 0.45;
      }
      .unavailable .window {
        cursor: default;
      }
    `],m([b({attribute:!1})],Mt.prototype,"hass",2),m([h()],Mt.prototype,"_config",2),m([h()],Mt.prototype,"_localPos",2),m([h()],Mt.prototype,"_dragging",2),Mt=m([x("silk-shutter-card")],Mt);var fa={type:"silk-minmax-card",name:"Silk Range",description:"Today's low, high, and where you are now."},vm=3e5,bm=6e4,ga="silk-minmax-card-editor";E(ga,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var ee=class extends y{constructor(){super(...arguments);this._stats=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-minmax-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement(ga)}setConfig(t){if(!t.entity)throw new Error("silk-minmax-card: `entity` is required");this._config=t,this._fetchStarted=!1,this._stats=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:1}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),vm)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,bm-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=++this._fetchSeq,i=Date.now()/1e3,n=new Date;n.setHours(0,0,0,0);let r=n.getTime()/1e3,o=Math.max((i-r)/3600,.25),c;try{c=await ct(this.hass,[t],r,i,o)}catch(d){console.warn("silk-minmax-card: history fetch failed",d);return}e===this._fetchSeq&&(this._lastFetch=Date.now(),this._stats=this._compute(c[t]??[],r,i))}_compute(t,e,i){let n=1/0,r=-1/0,o=0,c=0;for(let d=0;d<t.length;d++){let u=t[d].v;if(!Number.isFinite(u))continue;u<n&&(n=u),u>r&&(r=u);let f=Math.max(t[d].t,e),g=d+1<t.length?Math.min(Math.max(t[d+1].t,e),i):i,v=Math.max(g-f,0);o+=u*v,c+=v}return Number.isFinite(n)?{min:n,max:r,avg:c>0?o/c:(n+r)/2}:null}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config;if(!t)return p;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=_(i),r=Number(i?.state),o=!n&&i!==void 0&&Number.isFinite(r),c=S(i,t.color),d=i?.attributes.unit_of_measurement??"",u=t.name??i?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!n&&R(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${u}</div></div>
          <div class="trailing">
            <span class="value">${o?D(e,t.entity,r):"\u2014"}</span>
            ${d?l`<span class="unit">${d}</span>`:p}
          </div>
        </div>
        ${this._renderRange(o?r:void 0)}
      </ha-card>
    `}_renderRange(t){let e=this._stats,i=this.hass,n=this._config.entity;if(!e)return l`
        <div class="rangebar">
          <div class="rail"><div class="track"></div></div>
        </div>
      `;let r=t!==void 0?Math.min(e.min,t):e.min,o=t!==void 0?Math.max(e.max,t):e.max,c=o-r,d=A=>c>0?P((A-r)/c*100,0,100):50,u=d(e.avg),f=P(u,10,90),g=D(i,n,r),v=D(i,n,o),$=D(i,n,e.avg);return l`
      <div class="rangebar">
        <span class="bound">${g}</span>
        <div class="rail">
          <div class="track"></div>
          <div class="avg-tick" style="left:${u}%"></div>
          <div class="avg-label" style="left:${f}%">avg ${$}</div>
          ${t!==void 0?l`
                <div class="mover" style="transform:translateX(${d(t)}%)">
                  <div class="dot"></div>
                </div>
              `:p}
        </div>
        <span class="bound">${v}</span>
      </div>
      <div class="sub">
        Low ${g}<span class="sep">·</span>High ${v}<span class="sep">·</span>Avg
        ${$}
      </div>
    `}};ee.styles=[k,w`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        justify-content: center;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* This card has no control action: the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .rangebar {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        min-width: 0;
      }
      .bound {
        flex: none;
        font-size: 11px;
        line-height: 1;
        margin-bottom: 4px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .rail {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 32px;
      }
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 6px;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .avg-tick {
        position: absolute;
        bottom: 3px;
        width: 2px;
        height: 12px;
        border-radius: 1px;
        transform: translateX(-50%);
        background: var(--secondary-text-color);
        opacity: 0.6;
      }
      .avg-label {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        font-size: 10px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        pointer-events: none;
      }
      /* Full-width carrier: translateX(p%) moves by p% of the rail, so only
         transform ever animates. */
      .mover {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 0;
        transition: transform 300ms var(--silk-ease-out);
        will-change: transform;
        pointer-events: none;
      }
      .dot {
        position: absolute;
        left: -5px;
        bottom: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--silk-accent);
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
        transition: background 200ms ease;
      }
      .sub {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub .sep {
        opacity: 0.5;
        margin: 0 3px;
      }
      .unavailable .rangebar,
      .unavailable .sub {
        opacity: 0.45;
      }
    `],m([b({attribute:!1})],ee.prototype,"hass",2),m([h()],ee.prototype,"_config",2),m([h()],ee.prototype,"_stats",2),ee=m([x("silk-minmax-card")],ee);var ym="0.4.0",_a=[Dn,zn,qn,Gn,Kn,ss,rs,as,cs,ds,us,fs,bs,Ts,As,Rs,Ls,Fs,Us,js,Vs,Ws,Xs,Zs,er,sr,or,ar,dr,pr,hr,gr,vr,xr,wr,$r,Er,Mr,Or,Fr,jr,Wr,Qr,to,io,oo,mo,go,$o,Po,Lo,Uo,Go,Yo,Xo,ia,ra,aa,ma,ua,fa];window.customCards=window.customCards||[];for(let a of _a)window.customCards.push({...a,preview:!0,documentationURL:"https://github.com/LeeHueeng/silk-card"});console.info(`%c SILK %c v${ym} \xB7 ${_a.length} cards `,"background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0 2px 4px;font-weight:700","background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px 2px 0");
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

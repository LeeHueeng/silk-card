var Qn=Object.defineProperty;var ts=Object.getOwnPropertyDescriptor;var d=(o,n,t,e)=>{for(var i=e>1?void 0:e?ts(n,t):n,s=o.length-1,r;s>=0;s--)(r=o[s])&&(i=(e?r(n,t,i):r(i))||i);return e&&i&&Qn(n,t,i),i};var Bt=globalThis,Wt=Bt.ShadowRoot&&(Bt.ShadyCSS===void 0||Bt.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,pe=Symbol(),je=new WeakMap,Nt=class{constructor(n,t,e){if(this._$cssResult$=!0,e!==pe)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=n,this.t=t}get styleSheet(){let n=this.o,t=this.t;if(Wt&&n===void 0){let e=t!==void 0&&t.length===1;e&&(n=je.get(t)),n===void 0&&((this.o=n=new CSSStyleSheet).replaceSync(this.cssText),e&&je.set(t,n))}return n}toString(){return this.cssText}},qe=o=>new Nt(typeof o=="string"?o:o+"",void 0,pe),x=(o,...n)=>{let t=o.length===1?o[0]:n.reduce((e,i,s)=>e+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+o[s+1],o[0]);return new Nt(t,o,pe)},Ve=(o,n)=>{if(Wt)o.adoptedStyleSheets=n.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of n){let e=document.createElement("style"),i=Bt.litNonce;i!==void 0&&e.setAttribute("nonce",i),e.textContent=t.cssText,o.appendChild(e)}},ue=Wt?o=>o:o=>o instanceof CSSStyleSheet?(n=>{let t="";for(let e of n.cssRules)t+=e.cssText;return qe(t)})(o):o;var{is:es,defineProperty:is,getOwnPropertyDescriptor:ns,getOwnPropertyNames:ss,getOwnPropertySymbols:rs,getPrototypeOf:os}=Object,Kt=globalThis,Ge=Kt.trustedTypes,as=Ge?Ge.emptyScript:"",cs=Kt.reactiveElementPolyfillSupport,Lt=(o,n)=>o,It={toAttribute(o,n){switch(n){case Boolean:o=o?as:null;break;case Object:case Array:o=o==null?o:JSON.stringify(o)}return o},fromAttribute(o,n){let t=o;switch(n){case Boolean:t=o!==null;break;case Number:t=o===null?null:Number(o);break;case Object:case Array:try{t=JSON.parse(o)}catch{t=null}}return t}},Yt=(o,n)=>!es(o,n),Be={attribute:!0,type:String,converter:It,reflect:!1,useDefault:!1,hasChanged:Yt};Symbol.metadata??=Symbol("metadata"),Kt.litPropertyMetadata??=new WeakMap;var Q=class extends HTMLElement{static addInitializer(n){this._$Ei(),(this.l??=[]).push(n)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(n,t=Be){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(n)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(n,t),!t.noAccessor){let e=Symbol(),i=this.getPropertyDescriptor(n,e,t);i!==void 0&&is(this.prototype,n,i)}}static getPropertyDescriptor(n,t,e){let{get:i,set:s}=ns(this.prototype,n)??{get(){return this[t]},set(r){this[t]=r}};return{get:i,set(r){let a=i?.call(this);s?.call(this,r),this.requestUpdate(n,a,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(n){return this.elementProperties.get(n)??Be}static _$Ei(){if(this.hasOwnProperty(Lt("elementProperties")))return;let n=os(this);n.finalize(),n.l!==void 0&&(this.l=[...n.l]),this.elementProperties=new Map(n.elementProperties)}static finalize(){if(this.hasOwnProperty(Lt("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Lt("properties"))){let t=this.properties,e=[...ss(t),...rs(t)];for(let i of e)this.createProperty(i,t[i])}let n=this[Symbol.metadata];if(n!==null){let t=litPropertyMetadata.get(n);if(t!==void 0)for(let[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(let[t,e]of this.elementProperties){let i=this._$Eu(t,e);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(n){let t=[];if(Array.isArray(n)){let e=new Set(n.flat(1/0).reverse());for(let i of e)t.unshift(ue(i))}else n!==void 0&&t.push(ue(n));return t}static _$Eu(n,t){let e=t.attribute;return e===!1?void 0:typeof e=="string"?e:typeof n=="string"?n.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(n=>this.enableUpdating=n),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(n=>n(this))}addController(n){(this._$EO??=new Set).add(n),this.renderRoot!==void 0&&this.isConnected&&n.hostConnected?.()}removeController(n){this._$EO?.delete(n)}_$E_(){let n=new Map,t=this.constructor.elementProperties;for(let e of t.keys())this.hasOwnProperty(e)&&(n.set(e,this[e]),delete this[e]);n.size>0&&(this._$Ep=n)}createRenderRoot(){let n=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ve(n,this.constructor.elementStyles),n}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(n=>n.hostConnected?.())}enableUpdating(n){}disconnectedCallback(){this._$EO?.forEach(n=>n.hostDisconnected?.())}attributeChangedCallback(n,t,e){this._$AK(n,e)}_$ET(n,t){let e=this.constructor.elementProperties.get(n),i=this.constructor._$Eu(n,e);if(i!==void 0&&e.reflect===!0){let s=(e.converter?.toAttribute!==void 0?e.converter:It).toAttribute(t,e.type);this._$Em=n,s==null?this.removeAttribute(i):this.setAttribute(i,s),this._$Em=null}}_$AK(n,t){let e=this.constructor,i=e._$Eh.get(n);if(i!==void 0&&this._$Em!==i){let s=e.getPropertyOptions(i),r=typeof s.converter=="function"?{fromAttribute:s.converter}:s.converter?.fromAttribute!==void 0?s.converter:It;this._$Em=i;let a=r.fromAttribute(t,s.type);this[i]=a??this._$Ej?.get(i)??a,this._$Em=null}}requestUpdate(n,t,e,i=!1,s){if(n!==void 0){let r=this.constructor;if(i===!1&&(s=this[n]),e??=r.getPropertyOptions(n),!((e.hasChanged??Yt)(s,t)||e.useDefault&&e.reflect&&s===this._$Ej?.get(n)&&!this.hasAttribute(r._$Eu(n,e))))return;this.C(n,t,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(n,t,{useDefault:e,reflect:i,wrapped:s},r){e&&!(this._$Ej??=new Map).has(n)&&(this._$Ej.set(n,r??t??this[n]),s!==!0||r!==void 0)||(this._$AL.has(n)||(this.hasUpdated||e||(t=void 0),this._$AL.set(n,t)),i===!0&&this._$Em!==n&&(this._$Eq??=new Set).add(n))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let n=this.scheduleUpdate();return n!=null&&await n,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,s]of this._$Ep)this[i]=s;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[i,s]of e){let{wrapped:r}=s,a=this[i];r!==!0||this._$AL.has(i)||a===void 0||this.C(i,void 0,s,a)}}let n=!1,t=this._$AL;try{n=this.shouldUpdate(t),n?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(e){throw n=!1,this._$EM(),e}n&&this._$AE(t)}willUpdate(n){}_$AE(n){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(n)),this.updated(n)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(n){return!0}update(n){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(n){}firstUpdated(n){}};Q.elementStyles=[],Q.shadowRootOptions={mode:"open"},Q[Lt("elementProperties")]=new Map,Q[Lt("finalized")]=new Map,cs?.({ReactiveElement:Q}),(Kt.reactiveElementVersions??=[]).push("2.1.2");var ye=globalThis,We=o=>o,Xt=ye.trustedTypes,Ke=Xt?Xt.createPolicy("lit-html",{createHTML:o=>o}):void 0,ti="$lit$",at=`lit$${Math.random().toFixed(9).slice(2)}$`,ei="?"+at,ls=`<${ei}>`,$t=document,Ut=()=>$t.createComment(""),Dt=o=>o===null||typeof o!="object"&&typeof o!="function",xe=Array.isArray,ds=o=>xe(o)||typeof o?.[Symbol.iterator]=="function",he=`[ 	
\f\r]`,Ft=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Ye=/-->/g,Xe=/>/g,xt=RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Ze=/'/g,Je=/"/g,ii=/^(?:script|style|textarea|title)$/i,we=o=>(n,...t)=>({_$litType$:o,strings:n,values:t}),l=we(1),D=we(2),po=we(3),kt=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),Qe=new WeakMap,wt=$t.createTreeWalker($t,129);function ni(o,n){if(!xe(o)||!o.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ke!==void 0?Ke.createHTML(n):n}var ms=(o,n)=>{let t=o.length-1,e=[],i,s=n===2?"<svg>":n===3?"<math>":"",r=Ft;for(let a=0;a<t;a++){let c=o[a],m,u,f=-1,_=0;for(;_<c.length&&(r.lastIndex=_,u=r.exec(c),u!==null);)_=r.lastIndex,r===Ft?u[1]==="!--"?r=Ye:u[1]!==void 0?r=Xe:u[2]!==void 0?(ii.test(u[2])&&(i=RegExp("</"+u[2],"g")),r=xt):u[3]!==void 0&&(r=xt):r===xt?u[0]===">"?(r=i??Ft,f=-1):u[1]===void 0?f=-2:(f=r.lastIndex-u[2].length,m=u[1],r=u[3]===void 0?xt:u[3]==='"'?Je:Ze):r===Je||r===Ze?r=xt:r===Ye||r===Xe?r=Ft:(r=xt,i=void 0);let y=r===xt&&o[a+1].startsWith("/>")?" ":"";s+=r===Ft?c+ls:f>=0?(e.push(m),c.slice(0,f)+ti+c.slice(f)+at+y):c+at+(f===-2?a:y)}return[ni(o,s+(o[t]||"<?>")+(n===2?"</svg>":n===3?"</math>":"")),e]},zt=class o{constructor({strings:n,_$litType$:t},e){let i;this.parts=[];let s=0,r=0,a=n.length-1,c=this.parts,[m,u]=ms(n,t);if(this.el=o.createElement(m,e),wt.currentNode=this.el.content,t===2||t===3){let f=this.el.content.firstChild;f.replaceWith(...f.childNodes)}for(;(i=wt.nextNode())!==null&&c.length<a;){if(i.nodeType===1){if(i.hasAttributes())for(let f of i.getAttributeNames())if(f.endsWith(ti)){let _=u[r++],y=i.getAttribute(f).split(at),S=/([.?@])?(.*)/.exec(_);c.push({type:1,index:s,name:S[2],strings:y,ctor:S[1]==="."?ge:S[1]==="?"?_e:S[1]==="@"?be:Pt}),i.removeAttribute(f)}else f.startsWith(at)&&(c.push({type:6,index:s}),i.removeAttribute(f));if(ii.test(i.tagName)){let f=i.textContent.split(at),_=f.length-1;if(_>0){i.textContent=Xt?Xt.emptyScript:"";for(let y=0;y<_;y++)i.append(f[y],Ut()),wt.nextNode(),c.push({type:2,index:++s});i.append(f[_],Ut())}}}else if(i.nodeType===8)if(i.data===ei)c.push({type:2,index:s});else{let f=-1;for(;(f=i.data.indexOf(at,f+1))!==-1;)c.push({type:7,index:s}),f+=at.length-1}s++}}static createElement(n,t){let e=$t.createElement("template");return e.innerHTML=n,e}};function St(o,n,t=o,e){if(n===kt)return n;let i=e!==void 0?t._$Co?.[e]:t._$Cl,s=Dt(n)?void 0:n._$litDirective$;return i?.constructor!==s&&(i?._$AO?.(!1),s===void 0?i=void 0:(i=new s(o),i._$AT(o,t,e)),e!==void 0?(t._$Co??=[])[e]=i:t._$Cl=i),i!==void 0&&(n=St(o,i._$AS(o,n.values),i,e)),n}var fe=class{constructor(n,t){this._$AV=[],this._$AN=void 0,this._$AD=n,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(n){let{el:{content:t},parts:e}=this._$AD,i=(n?.creationScope??$t).importNode(t,!0);wt.currentNode=i;let s=wt.nextNode(),r=0,a=0,c=e[0];for(;c!==void 0;){if(r===c.index){let m;c.type===2?m=new jt(s,s.nextSibling,this,n):c.type===1?m=new c.ctor(s,c.name,c.strings,this,n):c.type===6&&(m=new ve(s,this,n)),this._$AV.push(m),c=e[++a]}r!==c?.index&&(s=wt.nextNode(),r++)}return wt.currentNode=$t,i}p(n){let t=0;for(let e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(n,e,t),t+=e.strings.length-2):e._$AI(n[t])),t++}},jt=class o{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(n,t,e,i){this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=n,this._$AB=t,this._$AM=e,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let n=this._$AA.parentNode,t=this._$AM;return t!==void 0&&n?.nodeType===11&&(n=t.parentNode),n}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(n,t=this){n=St(this,n,t),Dt(n)?n===p||n==null||n===""?(this._$AH!==p&&this._$AR(),this._$AH=p):n!==this._$AH&&n!==kt&&this._(n):n._$litType$!==void 0?this.$(n):n.nodeType!==void 0?this.T(n):ds(n)?this.k(n):this._(n)}O(n){return this._$AA.parentNode.insertBefore(n,this._$AB)}T(n){this._$AH!==n&&(this._$AR(),this._$AH=this.O(n))}_(n){this._$AH!==p&&Dt(this._$AH)?this._$AA.nextSibling.data=n:this.T($t.createTextNode(n)),this._$AH=n}$(n){let{values:t,_$litType$:e}=n,i=typeof e=="number"?this._$AC(n):(e.el===void 0&&(e.el=zt.createElement(ni(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===i)this._$AH.p(t);else{let s=new fe(i,this),r=s.u(this.options);s.p(t),this.T(r),this._$AH=s}}_$AC(n){let t=Qe.get(n.strings);return t===void 0&&Qe.set(n.strings,t=new zt(n)),t}k(n){xe(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,e,i=0;for(let s of n)i===t.length?t.push(e=new o(this.O(Ut()),this.O(Ut()),this,this.options)):e=t[i],e._$AI(s),i++;i<t.length&&(this._$AR(e&&e._$AB.nextSibling,i),t.length=i)}_$AR(n=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);n!==this._$AB;){let e=We(n).nextSibling;We(n).remove(),n=e}}setConnected(n){this._$AM===void 0&&(this._$Cv=n,this._$AP?.(n))}},Pt=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(n,t,e,i,s){this.type=1,this._$AH=p,this._$AN=void 0,this.element=n,this.name=t,this._$AM=i,this.options=s,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=p}_$AI(n,t=this,e,i){let s=this.strings,r=!1;if(s===void 0)n=St(this,n,t,0),r=!Dt(n)||n!==this._$AH&&n!==kt,r&&(this._$AH=n);else{let a=n,c,m;for(n=s[0],c=0;c<s.length-1;c++)m=St(this,a[e+c],t,c),m===kt&&(m=this._$AH[c]),r||=!Dt(m)||m!==this._$AH[c],m===p?n=p:n!==p&&(n+=(m??"")+s[c+1]),this._$AH[c]=m}r&&!i&&this.j(n)}j(n){n===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,n??"")}},ge=class extends Pt{constructor(){super(...arguments),this.type=3}j(n){this.element[this.name]=n===p?void 0:n}},_e=class extends Pt{constructor(){super(...arguments),this.type=4}j(n){this.element.toggleAttribute(this.name,!!n&&n!==p)}},be=class extends Pt{constructor(n,t,e,i,s){super(n,t,e,i,s),this.type=5}_$AI(n,t=this){if((n=St(this,n,t,0)??p)===kt)return;let e=this._$AH,i=n===p&&e!==p||n.capture!==e.capture||n.once!==e.once||n.passive!==e.passive,s=n!==p&&(e===p||i);i&&this.element.removeEventListener(this.name,this,e),s&&this.element.addEventListener(this.name,this,n),this._$AH=n}handleEvent(n){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,n):this._$AH.handleEvent(n)}},ve=class{constructor(n,t,e){this.element=n,this.type=6,this._$AN=void 0,this._$AM=t,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(n){St(this,n)}};var ps=ye.litHtmlPolyfillSupport;ps?.(zt,jt),(ye.litHtmlVersions??=[]).push("3.3.3");var si=(o,n,t)=>{let e=t?.renderBefore??n,i=e._$litPart$;if(i===void 0){let s=t?.renderBefore??null;e._$litPart$=i=new jt(n.insertBefore(Ut(),s),s,void 0,t??{})}return i._$AI(o),i};var $e=globalThis,v=class extends Q{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let n=super.createRenderRoot();return this.renderOptions.renderBefore??=n.firstChild,n}update(n){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(n),this._$Do=si(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return kt}};v._$litElement$=!0,v.finalized=!0,$e.litElementHydrateSupport?.({LitElement:v});var us=$e.litElementPolyfillSupport;us?.({LitElement:v});($e.litElementVersions??=[]).push("4.2.2");var w=o=>(n,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(o,n)}):customElements.define(o,n)};var hs={attribute:!0,type:String,converter:It,reflect:!1,hasChanged:Yt},fs=(o=hs,n,t)=>{let{kind:e,metadata:i}=t,s=globalThis.litPropertyMetadata.get(i);if(s===void 0&&globalThis.litPropertyMetadata.set(i,s=new Map),e==="setter"&&((o=Object.create(o)).wrapped=!0),s.set(t.name,o),e==="accessor"){let{name:r}=t;return{set(a){let c=n.get.call(this);n.set.call(this,a),this.requestUpdate(r,c,o,!0,a)},init(a){return a!==void 0&&this.C(r,void 0,o,a),a}}}if(e==="setter"){let{name:r}=t;return function(a){let c=this[r];n.call(this,a),this.requestUpdate(r,c,o,!0,a)}}throw Error("Unsupported decorator location: "+e)};function b(o){return(n,t)=>typeof t=="object"?fs(o,n,t):((e,i,s)=>{let r=i.hasOwnProperty(s);return i.constructor.createProperty(s,e),r?Object.getOwnPropertyDescriptor(i,s):void 0})(o,n,t)}function h(o){return b({...o,state:!0,attribute:!1})}var Et=(o,n,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof n!="object"&&Object.defineProperty(o,n,t),t);function ri(o,n){return(t,e,i)=>{let s=r=>r.renderRoot?.querySelector(o)??null;if(n){let{get:r,set:a}=typeof e=="object"?t:i??(()=>{let c=Symbol();return{get(){return this[c]},set(m){this[c]=m}}})();return Et(t,e,{get(){let c=r.call(this);return c===void 0&&(c=s(this),(c!==null||this.hasUpdated)&&a.call(this,c)),c}})}return Et(t,e,{get(){return s(this)}})}}function A(o){return o.split(".")[0]}function g(o){return!o||o.state==="unavailable"||o.state==="unknown"}function P(o){if(!o)return!1;let n=o.state,t=A(o.entity_id);if(t==="button"||t==="input_button"||t==="scene")return n!=="unavailable";if(n==="unavailable"||n==="unknown")return!1;if(n==="off")return t==="alert";switch(t){case"alarm_control_panel":return n!=="disarmed";case"alert":return n!=="idle";case"cover":case"valve":return n!=="closed";case"device_tracker":case"person":return n!=="not_home";case"lawn_mower":return n!=="docked"&&n!=="paused";case"lock":return n!=="locked";case"media_player":return n!=="standby";case"vacuum":return n!=="idle"&&n!=="docked"&&n!=="paused";case"plant":return n==="problem";case"timer":return n==="active";case"camera":return n==="streaming"||n==="recording";default:return!0}}var gs=new Set(["closed","locked","off"]);function F(o,n){let t=A(n),e=o.states[n],i=e?gs.has(e.state):!0,s={entity_id:n};switch(t){case"button":case"input_button":return o.callService(t,"press",s);case"lock":return o.callService("lock",i?"unlock":"lock",s);case"cover":return o.callService("cover",i?"open_cover":"close_cover",s);case"valve":return o.callService("valve",i?"open_valve":"close_valve",s);case"scene":return o.callService("scene","turn_on",s);case"group":return o.callService("homeassistant",i?"turn_on":"turn_off",s);default:return o.callService(t,i?"turn_on":"turn_off",s)}}function $(o,n){o.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:n},bubbles:!0,composed:!0}))}function T(o,n="light"){let t=new Event("haptic",{bubbles:!0,composed:!0});t.detail=n,o.dispatchEvent(t)}function R(o,n){if(o?.formatEntityState)try{return o.formatEntityState(n)}catch{}return n.state.replace(/_/g," ")}function H(o,n){return((o.attributes.supported_features??0)&n)!==0}var O=(o,n,t)=>Math.min(Math.max(o,n),t);var G=class extends v{constructor(){super(...arguments);this.value=0;this.min=0;this.max=100;this.step=1;this.disabled=!1;this.fill=!1;this._pct=0;this._dragging=!1;this._lastEmit=0}willUpdate(t){if(!this._dragging&&(t.has("value")||t.has("min")||t.has("max"))){let e=this.max-this.min||1;this._pct=O((this.value-this.min)/e*100,0,100)}}_valueFromPct(t){let e=this.min+t/100*(this.max-this.min),i=Math.round(e/this.step)*this.step;return O(Number(i.toFixed(3)),this.min,this.max)}_updateFromEvent(t,e){let i=this.getBoundingClientRect();if(i.width&&(this._pct=O((t.clientX-i.left)/i.width*100,0,100),e)){let s=Date.now();s-this._lastEmit>100&&(this._lastEmit=s,this._fire("slide"))}}_fire(t){this.dispatchEvent(new CustomEvent(t,{detail:{value:this._valueFromPct(this._pct)},bubbles:!1}))}_onPointerDown(t){this.disabled||(t.stopPropagation(),this.setPointerCapture(t.pointerId),this._dragging=!0,this._updateFromEvent(t,!0))}_onPointerMove(t){this._dragging&&this._updateFromEvent(t,!0)}_onPointerUp(){this._dragging&&(this._dragging=!1,this._fire("change"))}_onKeydown(t){if(this.disabled)return;let e=t.key==="ArrowRight"||t.key==="ArrowUp"?1:t.key==="ArrowLeft"||t.key==="ArrowDown"?-1:0;if(!e)return;t.preventDefault(),this.value=O(this.value+e*this.step,this.min,this.max);let i=this.max-this.min||1;this._pct=(this.value-this.min)/i*100,this._fire("change")}render(){return l`
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
    `}};G.styles=x`
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
  `,d([b({type:Number})],G.prototype,"value",2),d([b({type:Number})],G.prototype,"min",2),d([b({type:Number})],G.prototype,"max",2),d([b({type:Number})],G.prototype,"step",2),d([b({type:Boolean})],G.prototype,"disabled",2),d([b({type:Boolean,reflect:!0})],G.prototype,"fill",2),d([h()],G.prototype,"_pct",2),G=d([w("silk-slider")],G);var _s=new Set(["unavailable","unknown","none",""]);function bs(o,n){let t=(n??"").toLowerCase();if(_s.has(t))return{t:o,v:NaN};let e=Number(n);return{t:o,v:Number.isFinite(e)?e:NaN}}async function oi(o,n,t,e){let i=await o.callWS({type:"history/history_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),entity_ids:n,minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),s={};for(let r of n){let a=i?.[r]??[];s[r]=a.map(c=>{let m=c.s??c.state,u=c.lu??c.last_updated??c.lc??c.last_changed,f=typeof u=="number"?u:Date.parse(u)/1e3;return bs(f,m)}).filter(c=>Number.isFinite(c.t)).sort((c,m)=>c.t-m.t)}return s}async function vs(o,n,t,e){let i=await o.callWS({type:"recorder/statistics_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),statistic_ids:n,period:"hour",types:["mean","state"]}),s={};for(let r of n){let a=i?.[r]??[];s[r]=a.map(c=>{let m=c.start,u=typeof m=="number"?m/1e3:Date.parse(m)/1e3,f=c.mean??c.state;return{t:u,v:typeof f=="number"&&Number.isFinite(f)?f:NaN}}).filter(c=>Number.isFinite(c.t)).sort((c,m)=>c.t-m.t)}return s}async function Zt(o,n,t,e,i){if(i<=48)return oi(o,n,t,e);let s=await vs(o,n,t,e),r=n.filter(a=>!s[a]?.length);if(r.length)try{let a=await oi(o,r,t,e);for(let c of r)s[c]=a[c]??[]}catch{for(let a of r)s[a]=s[a]??[]}return s}function Jt(o,n,t,e){let i=new Float64Array(e).fill(NaN);if(!o.length||t<=n)return i;let s=0;for(let r=0;r<e;r++){let a=n+(t-n)*r/(e-1);for(;s<o.length&&o[s].t<=a;)s++;s>0&&(i[r]=o[s-1].v)}return i}function Qt(o,n,t){let e=1/0,i=-1/0;for(let r of o)for(let a=0;a<r.length;a++){let c=r[a];Number.isFinite(c)&&(c<e&&(e=c),c>i&&(i=c))}if(!Number.isFinite(e))return[0,1];if(e===i){let r=Math.max(Math.abs(e)*.05,.5);e-=r,i+=r}let s=(i-e)*.08;return[n??e-s,t??i+s]}function te(o,n,t,e,i){let[s,r]=n,a=r-s||1,c=Math.max(t-e-i,1),m=new Float64Array(o.length);for(let u=0;u<o.length;u++){let f=o[u];m[u]=Number.isFinite(f)?e+(1-(f-s)/a)*c:NaN}return m}var L=o=>(Math.round(o*100)/100).toString();function ai(o,n,t,e){let i=t-n,s=new Float64Array(i);if(i===1)return s;let r=new Float64Array(i-1);for(let a=0;a<i-1;a++)r[a]=(o[n+a+1]-o[n+a])/e;s[0]=r[0],s[i-1]=r[i-2];for(let a=1;a<i-1;a++)s[a]=r[a-1]*r[a]<=0?0:2*r[a-1]*r[a]/(r[a-1]+r[a]);return s}function ci(o,n){let t=-1;for(let e=0;e<=o.length;e++){let i=e<o.length&&Number.isFinite(o[e]);i&&t<0&&(t=e),!i&&t>=0&&(n(t,e),t=-1)}}function ee(o,n){let t=o.length;if(t<2)return"";let e=n/(t-1),i=[];return ci(o,(s,r)=>{if(r-s===1){i.push(`M ${L(s*e)} ${L(o[s])} l 0.01 0`);return}let a=ai(o,s,r,e);i.push(`M ${L(s*e)} ${L(o[s])}`);for(let c=s;c<r-1;c++){let m=c-s,u=c*e,f=(c+1)*e,_=u+e/3,y=o[c]+a[m]*e/3,S=f-e/3,M=o[c+1]-a[m+1]*e/3;i.push(`C ${L(_)} ${L(y)} ${L(S)} ${L(M)} ${L(f)} ${L(o[c+1])}`)}}),i.join(" ")}function ie(o,n,t){let e=o.length;if(e<2)return"";let i=n/(e-1),s=[];return ci(o,(r,a)=>{if(a-r===1)return;let c=ai(o,r,a,i);s.push(`M ${L(r*i)} ${L(t)} L ${L(r*i)} ${L(o[r])}`);for(let m=r;m<a-1;m++){let u=m-r,f=m*i,_=(m+1)*i;s.push(`C ${L(f+i/3)} ${L(o[m]+c[u]*i/3)} ${L(_-i/3)} ${L(o[m+1]-c[u+1]*i/3)} ${L(_)} ${L(o[m+1])}`)}s.push(`L ${L((a-1)*i)} ${L(t)} Z`)}),s.join(" ")}function li(o){for(let n=0;n<o.length;n++)if(Number.isFinite(o[n]))return n;return-1}function qt(o){for(let n=o.length-1;n>=0;n--)if(Number.isFinite(o[n]))return n;return-1}function di(o){let n=-1,t=-1;for(let e=0;e<o.length;e++){let i=o[e];Number.isFinite(i)&&((n<0||i<o[n])&&(n=e),(t<0||i>o[t])&&(t=e))}return{min:n,max:t}}var mi=o=>1-Math.pow(1-o,3),pi=o=>1-Math.pow(1-o,4);function ui(o){return o?.locale?.language??o?.language??"en"}function I(o,n,t){if(!Number.isFinite(t))return"\u2014";let e=o?.entities?.[n]?.display_precision??(Math.abs(t)>=100?0:Math.abs(t)>=10?1:2);return new Intl.NumberFormat(ui(o),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}function hi(o,n,t){return`${t>=0?"\u2191":"\u2193"} ${I(o,n,Math.abs(t))}`}function fi(o,n,t){let e=new Date(n*1e3),i=ui(o);return t<=26?new Intl.DateTimeFormat(i,{hour:"numeric",minute:"2-digit"}).format(e):t<=24*8?new Intl.DateTimeFormat(i,{weekday:"short",hour:"numeric",minute:"2-digit"}).format(e):new Intl.DateTimeFormat(i,{month:"short",day:"numeric",hour:"numeric"}).format(e)}var ys=[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"line_width",selector:{number:{min:1,max:8,step:.5,mode:"box"}}}]},{name:"",type:"grid",schema:[{name:"fill",selector:{boolean:{}}},{name:"extremes",selector:{boolean:{}}},{name:"range_selector",selector:{boolean:{}}},{name:"delta",selector:{boolean:{}}}]}],xs={entity:"Entity",name:"Name",hours_to_show:"Hours to show",line_width:"Line width",fill:"Gradient fill",extremes:"Min/max markers",range_selector:"Range selector",delta:"Change badge"},Ot=class extends v{setConfig(n){this._config=n}render(){if(!this.hass||!this._config)return p;let n={hours_to_show:24,line_width:2.5,fill:!0,extremes:!0,range_selector:!0,delta:!0,...this._config};return l`
      <ha-form
        .hass=${this.hass}
        .data=${n}
        .schema=${ys}
        .computeLabel=${t=>xs[t.name]??t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(n){n.stopPropagation();let t=n.detail.value;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}};d([b({attribute:!1})],Ot.prototype,"hass",2),d([h()],Ot.prototype,"_config",2),Ot=d([w("silk-card-editor")],Ot);var _i={type:"silk-card",name:"Silk Graph",description:"Buttery-smooth, interactive history graph. Scrub it, zoom it, watch it morph."},gi=["var(--primary-color, #4aa8ff)","#ef6c6c","#5ec78d","#f0b357","#a97ee8","#e879b9","#6ad4d4"],ws=["1h","12h","1d","1w","1m"],$s={h:1,d:24,w:168,m:720},ks=15e3,Es=3e5,Ts=0;function Cs(o){let n=/^(\d+)([hdwm])$/i.exec(o.trim());return n?Number(n[1])*$s[n[2].toLowerCase()]:null}var j=class extends v{constructor(){super(...arguments);this._hours=24;this._scrubIndex=null;this._focusIndex=null;this._width=0;this._height=0;this._drawProgress=0;this._rev=0;this._uid=`silk${++Ts}`;this._seriesCfgs=[];this._points=[];this._vals=[];this._pxYs=[];this._domain=[0,1];this._windowStart=0;this._windowEnd=0;this._hasDrawn=!1;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastUpdated={}}static getStubConfig(t){let e=Object.keys(t.states).filter(s=>s.startsWith("sensor.")&&Number.isFinite(Number(t.states[s].state))&&t.states[s].attributes.unit_of_measurement);return{type:"custom:silk-card",entity:e.find(s=>t.states[s].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-card-editor")}setConfig(t){if(!t.entity&&!t.entities?.length)throw new Error("silk-card: define an `entity` or a list of `entities`");let e=t.entities??[t.entity];this._seriesCfgs=e.map((i,s)=>{let r=typeof i=="string"?{entity:i}:i;return{entity:r.entity,name:r.name,color:r.color??t.color??gi[s%gi.length]}}),this._config=t,this._hours=t.hours_to_show??24,this._fetchStarted=!1,this._hasDrawn=!1,this._vals=[],this._pxYs=[],this._focusIndex=null}getCardSize(){return 3}getGridOptions(){return{columns:12,rows:3,min_rows:2,min_columns:4}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(!0),Es)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._animId&&cancelAnimationFrame(this._animId),this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh(!1);return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".graph");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height,this._recompute(!1))}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=!1;for(let i of this._seriesCfgs){let s=this.hass.states[i.entity]?.last_updated;s&&s!==this._lastUpdated[i.entity]&&(this._lastUpdated[i.entity]=s,t=!0)}if(!t||this._refreshTimer)return;let e=Math.max(0,ks-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh(!0)},e)}async _refresh(t){if(!this.hass||!this._seriesCfgs.length)return;let e=++this._fetchSeq,i=Date.now()/1e3,s=i-this._hours*3600,r;try{r=await Zt(this.hass,this._seriesCfgs.map(c=>c.entity),s,i,this._hours)}catch(c){console.warn("silk-card: history fetch failed",c);return}if(e!==this._fetchSeq)return;this._lastFetch=Date.now(),this._windowStart=s,this._windowEnd=i;let a=this._config?.points??120;this._points=this._seriesCfgs.map(c=>r[c.entity]??[]),this._vals=this._points.map(c=>Jt(c,s,i,a)),this._domain=Qt(this._vals,this._config?.y_min,this._config?.y_max),this._recompute(t)}_recompute(t){if(!this._vals.length||!this._width||!this._height)return;let e=this._config?.extremes!==!1,i=e?22:10,s=e?18:8,r=this._vals.map(a=>te(a,this._domain,this._height,i,s));this._setDisplay(r,t)}_setDisplay(t,e){if(this._animId&&cancelAnimationFrame(this._animId),!(e&&this._pxYs.length===t.length&&this._pxYs[0]?.length===t[0]?.length)){this._pxYs=t,this._rev++,this._hasDrawn?this._drawProgress=1:(this._hasDrawn=!0,this._animateDrawIn());return}let s=this._pxYs.map(m=>Float64Array.from(m)),r=performance.now(),a=420,c=m=>{let u=Math.min((m-r)/a,1),f=mi(u);for(let _=0;_<t.length;_++){let y=s[_],S=t[_],M=this._pxYs[_];for(let N=0;N<S.length;N++){let q=y[N],V=S[N];M[N]=!Number.isFinite(q)||!Number.isFinite(V)?u<.5?q:V:q+(V-q)*f}}this._rev++,u<1&&(this._animId=requestAnimationFrame(c))};this._animId=requestAnimationFrame(c)}_animateDrawIn(){let t=performance.now(),e=900,i=s=>{let r=Math.min((s-t)/e,1);this._drawProgress=pi(r),r<1&&(this._animId=requestAnimationFrame(i))};this._animId=requestAnimationFrame(i)}_selectRange(t){t!==this._hours&&(this._hours=t,this._scrubIndex=null,this._refresh(!0))}_onPointerDown(t){t.currentTarget.setPointerCapture(t.pointerId),this._scrub(t)}_onPointerMove(t){this._scrubIndex!==null&&this._scrub(t)}_onPointerEnd(){this._scrubIndex=null}_scrub(t){if(!this._width||!this._vals.length)return;let e=t.currentTarget.getBoundingClientRect(),i=Math.min(Math.max(t.clientX-e.left,0),this._width),s=this._vals[0].length;this._scrubIndex=Math.round(i/this._width*(s-1))}_toggleFocus(t){this._focusIndex=this._focusIndex===t?null:t}get _primaryIndex(){return this._focusIndex??0}_valueAt(t,e){return this._vals[t]?.[e]??NaN}_timeAt(t){let e=this._vals[0]?.length??1;return this._windowStart+(this._windowEnd-this._windowStart)*t/Math.max(e-1,1)}render(){if(!this._config)return p;this._rev;let t=this.hass,e=this._seriesCfgs[this._primaryIndex],i=t?.states[e.entity];if(t&&!i)return l`<ha-card><div class="warning">Entity not found: ${e.entity}</div></ha-card>`;let s=this._scrubIndex!==null&&this._vals.length>0,r=s?this._valueAt(this._primaryIndex,this._scrubIndex):Number(i?.state),a=this._config.unit??i?.attributes.unit_of_measurement??"",c=this._config.name??e.name??i?.attributes.friendly_name??e.entity;return l`
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
            <span class="value">${I(t,e.entity,r)}</span>
            <span class="unit">${a}</span>
            ${s?this._renderScrubTime():this._renderDelta(e.entity)}
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
    `}_renderRangeChips(){if(this._config?.range_selector===!1)return p;let t=this._config?.ranges??ws;return l`
      <span class="ranges">
        ${t.map(e=>{let i=Cs(e);return i===null?p:l`
            <button
              class="chip ${i===this._hours?"active":""}"
              @click=${()=>this._selectRange(i)}
            >
              ${e.toUpperCase()}
            </button>
          `})}
      </span>
    `}_renderDelta(t){if(this._config?.delta===!1||!this._vals.length)return p;let e=this._vals[this._primaryIndex],i=li(e),s=qt(e);if(i<0||s<=i)return p;let r=e[s]-e[i];return l`<span class="delta">${hi(this.hass,t,r)}</span>`}_renderScrubTime(){return l`<span class="scrub-time">${fi(this.hass,this._timeAt(this._scrubIndex),this._hours)}</span>`}_renderLegend(){return l`
      <div class="legend">
        ${this._seriesCfgs.map((t,e)=>{let i=this.hass?.states[t.entity],s=t.name??i?.attributes.friendly_name??t.entity,r=this._focusIndex!==null&&this._focusIndex!==e;return l`
            <button class="legend-chip ${r?"dim":""}" @click=${()=>this._toggleFocus(e)}>
              <span class="dot" style="background:${t.color}"></span>
              ${s}
            </button>
          `})}
      </div>
    `}_renderSvg(){let t=this._width,e=this._height;if(!t||!e||!this._pxYs.length)return p;let i=this._config?.line_width??2.5,s=this._config?.fill!==!1,r=`${this._uid}-clip`;return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e}>
        <defs>
          <clipPath id=${r}>
            <rect x="0" y="0" width=${t*this._drawProgress} height=${e}></rect>
          </clipPath>
          ${this._seriesCfgs.map((a,c)=>D`
              <linearGradient id="${this._uid}-fill-${c}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.30" style="color:${a.color}"></stop>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" style="color:${a.color}"></stop>
              </linearGradient>
            `)}
        </defs>
        <g clip-path="url(#${r})">
          ${this._seriesCfgs.map((a,c)=>this._renderSeries(a,c,t,e,i,s))}
        </g>
        ${this._renderExtremes(t)}
        ${this._renderScrubOverlay(t,e)}
      </svg>
    `}_renderSeries(t,e,i,s,r,a){let c=this._pxYs[e],m=this._focusIndex!==null&&this._focusIndex!==e,u=ee(c,i),f=a?ie(c,i,s):"",_=qt(c),y=_>=0?_/(c.length-1)*i:0;return D`
      <g style="color:${t.color}" opacity=${m?.22:1} class="series">
        ${a?D`<path class="area" d=${f} fill="url(#${this._uid}-fill-${e})"></path>`:p}
        <path
          class="line"
          d=${u}
          fill="none"
          stroke="currentColor"
          stroke-width=${r}
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        ${_>=0&&this._drawProgress>=1?D`
              <circle class="pulse" cx=${y} cy=${c[_]} r="4" fill="currentColor"></circle>
              <circle cx=${y} cy=${c[_]} r="3" fill="currentColor"></circle>
            `:p}
      </g>
    `}_renderExtremes(t){if(this._config?.extremes===!1||!this._pxYs.length)return p;let e=this._primaryIndex,i=this._vals[e],s=this._pxYs[e];if(!i)return p;let{min:r,max:a}=di(i);if(r<0||a<0||r===a)return p;let c=this._seriesCfgs[e].entity,m=(u,f)=>{let _=u/(i.length-1)*t,y=_<40?"start":_>t-40?"end":"middle";return D`
        <circle cx=${_} cy=${s[u]} r="2.5" class="extreme-dot"></circle>
        <text x=${_} y=${s[u]+(f?14:-8)} text-anchor=${y} class="extreme-label">
          ${I(this.hass,c,i[u])}
        </text>
      `};return D`${m(a,!1)}${m(r,!0)}`}_renderScrubOverlay(t,e){if(this._scrubIndex===null||!this._pxYs.length)return p;let i=this._pxYs[0].length,s=this._scrubIndex/(i-1)*t;return D`
      <line x1=${s} y1="0" x2=${s} y2=${e} class="scrub-line"></line>
      ${this._pxYs.map((r,a)=>{let c=r[this._scrubIndex];return Number.isFinite(c)?D`<circle cx=${s} cy=${c} r="4.5" class="scrub-dot" style="color:${this._seriesCfgs[a].color}" fill="currentColor"></circle>`:p})}
    `}};j.styles=x`
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
  `,d([b({attribute:!1})],j.prototype,"hass",2),d([h()],j.prototype,"_config",2),d([h()],j.prototype,"_hours",2),d([h()],j.prototype,"_scrubIndex",2),d([h()],j.prototype,"_focusIndex",2),d([h()],j.prototype,"_width",2),d([h()],j.prototype,"_height",2),d([h()],j.prototype,"_drawProgress",2),d([h()],j.prototype,"_rev",2),j=d([w("silk-card")],j);var ne=class extends j{};ne=d([w("silk-graph-card")],ne);var k=x`
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
`;var As={light:"var(--state-light-active-color, #e6a23c)",switch:"var(--state-switch-active-color, #4aa8ff)",input_boolean:"var(--state-switch-active-color, #4aa8ff)",fan:"var(--state-fan-active-color, #35b5b1)",cover:"var(--state-cover-active-color, #9d7ee8)",climate:"var(--state-climate-auto-color, #57ad60)",media_player:"var(--state-media_player-active-color, #6c8dd6)",lock:"var(--state-lock-locked-color, #57ad60)",vacuum:"var(--state-vacuum-active-color, #35b5b1)",humidifier:"var(--state-humidifier-on-color, #4aa8ff)",scene:"var(--primary-color, #4aa8ff)",script:"var(--primary-color, #4aa8ff)",button:"var(--primary-color, #4aa8ff)",input_button:"var(--primary-color, #4aa8ff)",person:"var(--state-person-home-color, #57ad60)",device_tracker:"var(--state-person-home-color, #57ad60)",binary_sensor:"var(--primary-color, #4aa8ff)",sensor:"var(--primary-color, #4aa8ff)"},bi={heat:"var(--state-climate-heat-color, #e8734f)",cool:"var(--state-climate-cool-color, #4aa8ff)",heat_cool:"var(--state-climate-auto-color, #57ad60)",auto:"var(--state-climate-auto-color, #57ad60)",dry:"var(--state-climate-dry-color, #e6a23c)",fan_only:"var(--state-climate-fan-only-color, #35b5b1)"};function E(o,n){if(n)return n;if(!o)return"var(--primary-color, #4aa8ff)";let t=A(o.entity_id);return t==="climate"&&bi[o.state]?bi[o.state]:t==="lock"&&o.state!=="locked"?"var(--state-lock-unlocked-color, #e8734f)":As[t]??"var(--primary-color, #4aa8ff)"}function C(o,n,t,e={}){if(customElements.get(o))return;class i extends v{setConfig(r){this._config=r}render(){return!this.hass||!this._config?p:l`
        <ha-form
          .hass=${this.hass}
          .data=${{...e,...this._config}}
          .schema=${n}
          .computeLabel=${r=>t[r.name]??r.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `}_valueChanged(r){r.stopPropagation(),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r.detail.value},bubbles:!0,composed:!0}))}}d([b({attribute:!1})],i.prototype,"hass",2),d([h()],i.prototype,"_config",2),customElements.define(o,i)}var vi={type:"silk-toggle-card",name:"Silk Toggle",description:"A crisp on/off row with a real switch and instant feedback."},yi="silk-toggle-card-editor";C(yi,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan","lock","cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before switching"});function Ss(o,n){switch(o){case"lock":return n?"unlocked":"locked";case"cover":case"valve":return n?"open":"closed";default:return n?"on":"off"}}var Ps=2e3,ct=class extends v{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-toggle-card",entity:e.find(s=>s.startsWith("switch."))??e.find(s=>s.startsWith("light."))}}static async getConfigElement(){return document.createElement(yi)}setConfig(t){if(!t.entity)throw new Error("silk-toggle-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_onCardClick(){this._config&&$(this,this._config.entity)}_onToggleClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!(!s||g(s))){if(e.confirm){let r=e.name??s.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to toggle ${r}?`))return}T(this),this._optimistic=!P(s),this._optimisticBase=s.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Ps),F(i,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=this._optimistic??P(i),a=this._optimistic===null?i:{...i,state:Ss(A(t.entity),this._optimistic)},c=E(a,t.color),m=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${r?"on":""}"
          .disabled=${s}
          aria-label=${`Toggle ${m}`}
          @click=${this._onToggleClick}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${a}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${m}</div>
          <div class="state">${R(e,a)}</div>
        </div>
        <div class="trailing">
          <button
            class="switch ${r?"checked":""}"
            role="switch"
            aria-checked=${r?"true":"false"}
            aria-label=${`Toggle ${m}`}
            .disabled=${s}
            @click=${this._onToggleClick}
          >
            <span class="thumb"></span>
          </button>
        </div>
      </ha-card>
    `}};ct.styles=[k,x`
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
    `],d([b({attribute:!1})],ct.prototype,"hass",2),d([h()],ct.prototype,"_config",2),d([h()],ct.prototype,"_optimistic",2),ct=d([w("silk-toggle-card")],ct);var xi={type:"silk-light-card",name:"Silk Light",description:"Drag anywhere to dim \u2014 the whole card is the slider."},wi="silk-light-card-editor";C(wi,[{name:"entity",required:!0,selector:{entity:{domain:["light"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",icon:"Icon",color:"Accent color"});var Os=2e3;function Ms(o){let n=o.attributes.supported_color_modes;return Array.isArray(n)&&n.some(t=>t!=="onoff")}var tt=class extends v{constructor(){super(...arguments);this._optimisticPct=null;this._optimisticOn=null;this._sliding=!1}static getStubConfig(t){return{type:"custom:silk-light-card",entity:Object.keys(t.states).find(i=>i.startsWith("light."))}}static async getConfigElement(){return document.createElement(wi)}setConfig(t){if(!t.entity)throw new Error("silk-light-card: `entity` is required");if(A(t.entity)!=="light")throw new Error(`silk-light-card: \`entity\` must be a light (got "${t.entity}")`);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._sliding||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticPct=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Os)}_displayPct(t,e){if(this._optimisticPct!==null)return this._optimisticPct;if(!e)return 0;let i=t.attributes.brightness;return typeof i!="number"?null:O(Math.round(i/255*100),1,100)}_onSlide(t){this._sliding=!0,this._optimisticPct=t.detail.value,this._optimisticOn=t.detail.value>0}_onSliderChange(t){if(this._sliding=!1,!this.hass||!this._config)return;let e=t.detail.value;this._optimisticPct=e,this._optimisticOn=e>0,this._holdOptimistic(),T(this),e<=0?this.hass.callService("light","turn_off",{entity_id:this._config.entity}):this.hass.callService("light","turn_on",{entity_id:this._config.entity,brightness_pct:e})}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(g(e))return;let i=this._optimisticOn??e.state==="on";F(this.hass,this._config.entity),T(this),this._optimisticOn=!i,this._optimisticPct=null,this._holdOptimistic()}_onCardClick(){this._config&&$(this,this._config.entity)}_stopClick(t){t.stopPropagation()}render(){if(!this._config)return p;let t=this.hass;if(!t)return p;let e=this._config.entity,i=t.states[e];if(!i)return l`<ha-card><div class="warning">Entity not found: ${e}</div></ha-card>`;let s=g(i),r=Ms(i),a=!s&&i.state==="on",c=s?!1:this._optimisticOn??a,m=s?0:this._displayPct(i,c),u=E(i,this._config.color),f=this._config.name??i.attributes.friendly_name??e,_=s||c===a?R(t,i):c?"On":"Off",y=r&&c&&m!==null&&!s;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${u}"
        @click=${this._onCardClick}
      >
        ${r?l`
              <silk-slider
                fill
                .value=${c?m??100:0}
                min="1"
                max="100"
                step="1"
                ?disabled=${s}
                @slide=${this._onSlide}
                @change=${this._onSliderChange}
                @click=${this._stopClick}
              ></silk-slider>
            `:p}
        <button
          class="icon ${c?"on":""}"
          ?disabled=${s}
          aria-label=${`Toggle ${f}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${f}</div>
          <div class="state">
            ${_}${y?l`<span class="sep">·</span>${m}%`:p}
          </div>
        </div>
        <div class="trailing">
          ${y?l`<span class="value">${m}%</span>`:p}
        </div>
      </ha-card>
    `}};tt.styles=[k,x`
      .icon:disabled {
        cursor: default;
      }
    `],d([b({attribute:!1})],tt.prototype,"hass",2),d([h()],tt.prototype,"_config",2),d([h()],tt.prototype,"_optimisticPct",2),d([h()],tt.prototype,"_optimisticOn",2),tt=d([w("silk-light-card")],tt);var $i={type:"silk-tile-card",name:"Silk Tile",description:"A sensor tile with a living sparkline and threshold colors."},Rs=60,Hs=6,Ns=4,Ls=3e5,Is=6e4,Fs=0;C("silk-tile-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}]},{name:"",type:"grid",schema:[{name:"unit",selector:{text:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]}],{entity:"Entity",name:"Name",icon:"Icon",color:"Color",unit:"Unit",hours_to_show:"Hours to show"},{hours_to_show:24});var X=class extends v{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._uid=`silk-tile${++Fs}`;this._thresholds=[];this._vals=null;this._pxYs=null;this._domain=[0,1];this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states).filter(s=>s.startsWith("sensor.")&&Number.isFinite(Number(t.states[s].state))&&t.states[s].attributes.unit_of_measurement);return{type:"custom:silk-tile-card",entity:e.find(s=>t.states[s].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-tile-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-tile-card: `entity` is required");this._thresholds=(t.thresholds??[]).filter(e=>!!e&&typeof e.value=="number"&&Number.isFinite(e.value)&&typeof e.color=="string").sort((e,i)=>e.value-i.value),this._config=t,this._fetchStarted=!1,this._vals=null,this._pxYs=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Ls)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height,this._recompute())}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,Is-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??24,i=++this._fetchSeq,s=Date.now()/1e3,r=s-e*3600,a;try{a=await Zt(this.hass,[t],r,s,e)}catch(c){console.warn("silk-tile-card: history fetch failed",c);return}i===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals=Jt(a[t]??[],r,s,Rs),this._domain=Qt([this._vals]),this._recompute())}_recompute(){!this._vals||!this._width||!this._height||(this._pxYs=te(this._vals,this._domain,this._height,Hs,Ns),this._rev++)}_accent(t){if(Number.isFinite(t)){let e;for(let i of this._thresholds)if(i.value<=t)e=i.color;else break;if(e)return e}return E(this.hass?.states[this._config.entity],this._config?.color)}_onTap(){this._config&&(T(this),$(this,this._config.entity))}render(){if(!this._config)return p;this._rev;let t=this.hass,e=t?.states[this._config.entity];if(t&&!e)return l`<ha-card
        ><div class="warning">Entity not found: ${this._config.entity}</div></ha-card
      >`;let i=g(e),s=Number(e?.state),r=this._accent(s),a=this._config.unit??e?.attributes.unit_of_measurement??"",c=this._config.name??e?.attributes.friendly_name??this._config.entity;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${!i&&P(e)?"on":""}">
            ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${c}</div></div>
          <div class="trailing">
            <span class="value">${I(t,this._config.entity,s)}</span>
            ${a?l`<span class="unit">${a}</span>`:p}
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._height,i=this._pxYs;if(!t||!e||!i)return p;let s=ee(i,t),r=ie(i,t,e),a=qt(i),c=a>=0?a/(i.length-1)*t:0,m=`${this._uid}-fill`;return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e}>
        <defs>
          <linearGradient id=${m} x1="0" y1="0" x2="0" y2="1">
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
          <path d=${r} fill="url(#${m})"></path>
          <path
            d=${s}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          ${a>=0?D`<circle cx=${c} cy=${i[a]} r="2.5" fill="currentColor"></circle>`:p}
        </g>
      </svg>
    `}};X.styles=[k,x`
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
    `],d([b({attribute:!1})],X.prototype,"hass",2),d([h()],X.prototype,"_config",2),d([h()],X.prototype,"_width",2),d([h()],X.prototype,"_height",2),d([h()],X.prototype,"_rev",2),X=d([w("silk-tile-card")],X);var Ci={type:"silk-gauge-card",name:"Silk Gauge",description:"A clean arc gauge that animates to its value."},se=42,Us=50,Ds=50,Ai=270,Si=90+(360-Ai)/2,ki=100,Ei=96;function Pi(o){let n=o*Math.PI/180;return[Us+se*Math.cos(n),Ds+se*Math.sin(n)]}var[Oi,zs]=Pi(Si),[Mi,js]=Pi(Si+Ai),Ti=`M ${Oi.toFixed(2)} ${zs.toFixed(2)} A ${se} ${se} 0 1 1 ${Mi.toFixed(2)} ${js.toFixed(2)}`,ke=100,lt=class extends v{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(s=>s.startsWith("sensor.")&&Number.isFinite(Number(t.states[s].state))),i=s=>e.find(r=>t.states[r].attributes.device_class===s);return{type:"custom:silk-gauge-card",entity:i("battery")??i("power")??e[0]}}static async getConfigElement(){return document.createElement("silk-gauge-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-gauge-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-gauge-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:3,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatValue(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return e!==void 0?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t):new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.abs(t)>=100?0:1}).format(t)}_formatBound(t){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&$(this,this._config.entity)}render(){let t=this._config;if(!t)return p;let e=this.hass?.states[t.entity];if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=g(e),s=Number(e?.state),r=!i&&e!==void 0&&e.state!==""&&Number.isFinite(s),a=t.min??0,c=t.max??100,m=c-a,u=r&&m>0?O((s-a)/m,0,1):0,f=this._drawn?u:0,_=ke*(1-f),y=(r?this._segmentColor(s):void 0)??E(e,t.color),S=t.unit??e?.attributes.unit_of_measurement??"",M=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${i?"unavailable":""}
        style="--silk-accent:${y}"
        @click=${this._onCardClick}
      >
        <div class="gauge">
          <svg viewBox="0 0 ${ki} ${Ei}" aria-hidden="true">
            <path class="arc-bg" d=${Ti}></path>
            <path
              class="arc-value"
              d=${Ti}
              pathLength=${ke}
              stroke-dasharray=${ke}
              style="stroke-dashoffset:${_};opacity:${f>0?1:0}"
            ></path>
          </svg>
          <div class="readout">
            <div class="value">${r?this._formatValue(s):"\u2014"}</div>
            ${S?l`<div class="unit">${S}</div>`:p}
          </div>
          <span class="bound" style="left:${Oi.toFixed(1)}%">${this._formatBound(a)}</span>
          <span class="bound" style="left:${Mi.toFixed(1)}%">${this._formatBound(c)}</span>
        </div>
        <div class="name" title=${M}>${M}</div>
      </ha-card>
    `}};lt.styles=[k,x`
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
        aspect-ratio: ${ki} / ${Ei};
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
    `],d([b({attribute:!1})],lt.prototype,"hass",2),d([h()],lt.prototype,"_config",2),d([h()],lt.prototype,"_drawn",2),lt=d([w("silk-gauge-card")],lt);C("silk-gauge-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var Li={type:"silk-climate-card",name:"Silk Climate",description:"A compact thermostat: current, target, and modes in one block."},Ri=2,qs=800,Hi=2e3,Vs={heat:"mdi:fire",cool:"mdi:snowflake",heat_cool:"mdi:sun-snowflake-variant",auto:"mdi:thermostat-auto",dry:"mdi:water-percent",fan_only:"mdi:fan",off:"mdi:power"};C("silk-climate-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["climate"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function U(o){if(o==null||o==="")return;let n=Number(o);return Number.isFinite(n)?n:void 0}function Ni(o){let n=String(o),t=n.indexOf(".");return t<0?0:Math.min(n.length-t-1,2)}function Ee(o){let n=o.replace(/_/g," ");return n.charAt(0).toUpperCase()+n.slice(1)}var W=class extends v{static getStubConfig(n){return{type:"custom:silk-climate-card",entity:Object.keys(n.states).find(e=>e.startsWith("climate."))}}static async getConfigElement(){return document.createElement("silk-climate-card-editor")}setConfig(n){if(!n.entity||A(n.entity)!=="climate")throw new Error("silk-climate-card: `entity` is required and must be a climate entity");this._config=n,this._optTarget=this._optLow=this._optHigh=this._optMode=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),window.clearTimeout(this._modeHoldTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(n){if(!n.has("hass")||!this._config||!this.hass)return;let e=n.get("hass")?.states[this._config.entity],i=this.hass.states[this._config.entity];if(!(!i||i===e)){if(this._sendTimer===void 0){let s=e?.attributes,r=i.attributes;this._optTarget!==void 0&&r.temperature!==s?.temperature&&(this._optTarget=void 0),this._optLow!==void 0&&r.target_temp_low!==s?.target_temp_low&&(this._optLow=void 0),this._optHigh!==void 0&&r.target_temp_high!==s?.target_temp_high&&(this._optHigh=void 0)}this._optMode!==void 0&&i.state!==e?.state&&(this._optMode=void 0)}}render(){let n=this._config,t=this.hass;if(!n||!t)return p;let e=t.states[n.entity];if(!e)return l`<ha-card><div class="warning">Entity not found: ${n.entity}</div></ha-card>`;let i=g(e),s=this._optMode!==void 0&&this._optMode!==e.state?{...e,state:this._optMode}:e,r=E(s,n.color),a=n.name??e.attributes.friendly_name??n.entity,c=R(t,s),m=e.attributes.hvac_action,u=m?Ee(m):void 0,f=u!==void 0&&u.toLowerCase()!==c.toLowerCase(),_=U(e.attributes.current_temperature),y=t.config?.unit_system?.temperature??"\xB0";return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!i&&P(s)?"on":""}"
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${n.icon?l`<ha-icon .icon=${n.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${s}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${a}</div>
            <div class="state">
              ${c}${f?l`<span class="sep">·</span>${u}`:p}
            </div>
          </div>
          <div class="trailing hero">
            ${_!==void 0?l`<span class="current">${this._formatCurrent(_)}</span
                  ><span class="degree">${y}</span>`:p}
          </div>
        </div>
        <div class="row controls">
          ${this._renderSteppers(e,i)} ${this._renderModes(e,i)}
        </div>
      </ha-card>
    `}_renderSteppers(n,t){let e=n.attributes,i=Ni(U(e.target_temp_step)??.5);if(H(n,Ri)){let r=this._optLow??U(e.target_temp_low),a=this._optHigh??U(e.target_temp_high);return l`
        ${this._renderStepper("low",r,i,t)}
        ${this._renderStepper("high",a,i,t)}
      `}let s=this._optTarget??U(e.temperature);return this._renderStepper("target",s,i,t)}_renderStepper(n,t,e,i){let s=n==="low"?"lower target":n==="high"?"upper target":"target";return l`
      <div class="stepper">
        <button
          class="step"
          ?disabled=${i}
          aria-label="Decrease ${s} temperature"
          @click=${r=>this._onStep(r,n,-1)}
        >
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
        <span class="value target">${t!==void 0?t.toFixed(e):"\u2013"}</span>
        <button
          class="step"
          ?disabled=${i}
          aria-label="Increase ${s} temperature"
          @click=${r=>this._onStep(r,n,1)}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
      </div>
    `}_renderModes(n,t){let e=n.attributes.hvac_modes;if(!e?.length)return p;let i=this._optMode??n.state;return l`
      <div class="modes">
        ${e.map(s=>l`
            <button
              class="chip mode ${s===i?"active":""}"
              ?disabled=${t}
              aria-label=${Ee(s)}
              title=${Ee(s)}
              @click=${r=>this._onMode(r,s)}
            >
              <ha-icon .icon=${Vs[s]??"mdi:thermostat"}></ha-icon>
            </button>
          `)}
      </div>
    `}_formatCurrent(n){return String(Math.round(n*10)/10)}_onCardClick(){this._config&&$(this,this._config.entity)}_onIconClick(n){n.stopPropagation(),this._config&&$(this,this._config.entity)}_onStep(n,t,e){n.stopPropagation();let i=this.hass,s=this._config?i?.states[this._config.entity]:void 0;if(!i||!s||g(s))return;let r=s.attributes,a=U(r.target_temp_step)??.5,c=Ni(a),m=U(r.min_temp)??7,u=U(r.max_temp)??35,f=U(r.current_temperature)??(m+u)/2,_=(y,S,M)=>Number(O(y+e*a,S,M).toFixed(c));if(t==="low"){let y=this._optHigh??U(r.target_temp_high)??u,S=this._optLow??U(r.target_temp_low)??f;this._optLow=_(S,m,y)}else if(t==="high"){let y=this._optLow??U(r.target_temp_low)??m,S=this._optHigh??U(r.target_temp_high)??f;this._optHigh=_(S,y,u)}else{let y=this._optTarget??U(r.temperature)??f;this._optTarget=_(y,m,u)}T(this,"selection"),window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},qs)}_commit(){let n=this.hass,t=this._config?.entity,e=t?n?.states[t]:void 0;if(!n||!t||!e)return;let i=e.attributes,s={entity_id:t};if(H(e,Ri)){let r=this._optLow??U(i.target_temp_low),a=this._optHigh??U(i.target_temp_high);if(r===void 0||a===void 0)return;s.target_temp_low=r,s.target_temp_high=a}else{let r=this._optTarget??U(i.temperature);if(r===void 0)return;s.temperature=r}n.callService("climate","set_temperature",s),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optTarget=this._optLow=this._optHigh=void 0},Hi)):this._optTarget=this._optLow=this._optHigh=void 0}_onMode(n,t){n.stopPropagation();let e=this.hass,i=this._config?.entity,s=i?e?.states[i]:void 0;!e||!i||!s||g(s)||(this._optMode??s.state)!==t&&(this._optMode=t,T(this),e.callService("climate","set_hvac_mode",{entity_id:i,hvac_mode:t}),window.clearTimeout(this._modeHoldTimer),this._modeHoldTimer=window.setTimeout(()=>{this._optMode=void 0},Hi))}};W.styles=[k,x`
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
    `],d([b({attribute:!1})],W.prototype,"hass",2),d([h()],W.prototype,"_config",2),d([h()],W.prototype,"_optTarget",2),d([h()],W.prototype,"_optLow",2),d([h()],W.prototype,"_optHigh",2),d([h()],W.prototype,"_optMode",2),W=d([w("silk-climate-card")],W);var Ii={type:"silk-cover-card",name:"Silk Cover",description:"Blinds with drag-anywhere position and an honest stop button."},Gs=1,Bs=2,Ws=4,Ks=8,Ys=2e3,Fi="silk-cover-card-editor";C(Fi,[{name:"entity",required:!0,selector:{entity:{domain:["cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_buttons",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_buttons:"Show open / stop / close buttons"},{show_buttons:!0});var dt=class extends v{constructor(){super(...arguments);this._localPos=null}static getStubConfig(t){return{type:"custom:silk-cover-card",entity:Object.keys(t.states).find(i=>i.startsWith("cover."))}}static async getConfigElement(){return document.createElement(Fi)}setConfig(t){if(!t.entity||A(t.entity)!=="cover")throw new Error("silk-cover-card: define a cover `entity` (e.g. cover.living_room_blinds)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._localPos=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._localPos=null},Ys)}_realPosition(t){let e=t.attributes.current_position;return typeof e=="number"&&Number.isFinite(e)?O(e,0,100):void 0}_onIconClick(t){t.stopPropagation(),!(!this.hass||!this._config)&&(g(this.hass.states[this._config.entity])||(F(this.hass,this._config.entity),T(this)))}_onCardClick(){this._config&&$(this,this._config.entity)}_onSlide(t){this._localPos=Math.round(t.detail.value)}_onSlideChange(t){if(!this.hass||!this._config)return;let e=O(Math.round(t.detail.value),0,100);this._localPos=e,this._armExpiry(),this.hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e}),T(this)}_callCover(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(this._clearOptimistic(),this.hass.callService("cover",e,{entity_id:this._config.entity}),T(this))}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=g(t),i=P(t),s=E(t,this._config.color),r=this._config.name??t.attributes.friendly_name??t.entity_id,a=this._realPosition(t),c=this._localPos??a,m=H(t,Ws)&&!e;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${s}"
        @click=${m?p:this._onCardClick}
      >
        ${m?l`
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
            ${R(this.hass,t)}${!e&&c!==void 0?l`<span class="sep">·</span>${c}%`:p}
          </div>
        </div>
        ${this._config.show_buttons!==!1?this._renderButtons(t,e,c):p}
      </ha-card>
    `}_renderButtons(t,e,i){let s=H(t,Gs),r=H(t,Ks),a=H(t,Bs);if(!s&&!r&&!a)return p;let c=i!==void 0?i>=100:t.state==="open",m=i!==void 0?i<=0:t.state==="closed";return l`
      <div class="trailing">
        ${s?l`
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
        ${a?l`
              <button
                class="ctl"
                ?disabled=${e||m}
                aria-label="Close cover"
                @click=${u=>this._callCover(u,"close_cover")}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `:p}
      </div>
    `}};dt.styles=[k,x`
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
    `],d([b({attribute:!1})],dt.prototype,"hass",2),d([h()],dt.prototype,"_config",2),d([h()],dt.prototype,"_localPos",2),dt=d([w("silk-cover-card")],dt);var Ui={type:"silk-fan-card",name:"Silk Fan",description:"Speed at your fingertips, with an icon that actually spins."},Xs=1,Zs=8,Js=3,Qs=2e3;C("silk-fan-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["fan"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var K=class extends v{static getStubConfig(n){return{type:"custom:silk-fan-card",entity:Object.keys(n.states).find(e=>e.startsWith("fan."))}}static async getConfigElement(){return document.createElement("silk-fan-card-editor")}setConfig(n){if(!n.entity)throw new Error("silk-fan-card: `entity` is required");if(A(n.entity)!=="fan")throw new Error(`silk-fan-card: \`entity\` must be a fan.* entity, got \`${n.entity}\``);this._config=n,this._dragPct=void 0,this._lastUpdated=void 0,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optTimer),this._optTimer=void 0}willUpdate(n){if(!n.has("hass")||!this._config)return;let t=this.hass?.states[this._config.entity]?.last_updated;if(t&&t!==this._lastUpdated){let e=this._lastUpdated!==void 0;this._lastUpdated=t,e&&this._clearOptimistic()}}_rawPct(n){let t=n.attributes.percentage;return typeof t=="number"&&Number.isFinite(t)?t:void 0}_effectivePct(n){return this._dragPct??this._optPct??this._rawPct(n)}_effectiveOn(n){return this._dragPct!==void 0?this._dragPct>0:this._optOn??P(n)}_setOptimistic(n){n.on!==void 0&&(this._optOn=n.on),n.pct!==void 0&&(this._optPct=n.pct),n.preset!==void 0&&(this._optPreset=n.preset),window.clearTimeout(this._optTimer),this._optTimer=window.setTimeout(()=>this._clearOptimistic(),Qs)}_clearOptimistic(){window.clearTimeout(this._optTimer),this._optTimer=void 0,this._optOn=void 0,this._optPct=void 0,this._optPreset=void 0}_onIconClick(n){if(n.stopPropagation(),!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||g(t))return;let e=!this._effectiveOn(t);F(this.hass,this._config.entity),this._setOptimistic(e?{on:!0}:{on:!1,pct:0}),T(this)}_onSlide(n){this._dragPct=n.detail.value}_onSliderChange(n){let t=n.detail.value;if(this._dragPct=void 0,!this.hass||!this._config)return;let e=this._config.entity;t<=0?(this.hass.callService("fan","turn_off",{entity_id:e}),this._setOptimistic({on:!1,pct:0})):(this.hass.callService("fan","set_percentage",{entity_id:e,percentage:t}),this._setOptimistic({on:!0,pct:t})),T(this)}_onPresetClick(n,t){n.stopPropagation(),!(!this.hass||!this._config)&&(this.hass.callService("fan","set_preset_mode",{entity_id:this._config.entity,preset_mode:t}),this._setOptimistic({preset:t}),T(this))}_onCardClick(n){n.target.localName!=="silk-slider"&&this._config&&$(this,this._config.entity)}render(){if(!this._config||!this.hass)return p;let n=this._config,t=this.hass.states[n.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${n.entity}</div></ha-card>`;let e=g(t),i=!e&&this._effectiveOn(t),s=this._effectivePct(t),r=H(t,Xs),a=n.name??t.attributes.friendly_name??n.entity,c=i&&(s===void 0||s>0),m=O(3.5-(s??50)*.03,.6,3.5),u=H(t,Zs)?(t.attributes.preset_modes??[]).slice(0,Js):[],f=this._optPreset??t.attributes.preset_mode;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${E(t,n.color)}"
        @click=${this._onCardClick}
      >
        ${r?l`
              <silk-slider
                fill
                .value=${s??0}
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
          aria-label=${i?`Turn off ${a}`:`Turn on ${a}`}
          @click=${this._onIconClick}
        >
          <span
            class="blades ${c?"spinning":""}"
            style=${c?`animation-duration:${m.toFixed(2)}s`:p}
          >
            ${n.icon?l`<ha-icon .icon=${n.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
          </span>
        </button>
        <div class="info">
          <div class="name">${a}</div>
          <div class="state">${this._renderStateLine(t,i,s,r)}</div>
        </div>
        ${u.length?l`
              <div class="trailing">
                ${u.map(_=>l`
                    <button
                      class="chip ${_===f?"active":""}"
                      .disabled=${e}
                      @click=${y=>this._onPresetClick(y,_)}
                    >
                      ${_}
                    </button>
                  `)}
              </div>
            `:p}
      </ha-card>
    `}_renderStateLine(n,t,e,i){let r=(this._dragPct!==void 0||this._optOn!==void 0)&&!g(n)?t?"On":"Off":R(this.hass,n),a=i&&t&&e!==void 0&&e>0;return l`${r}${a?l`<span class="sep">·</span>${Math.round(e)}%`:p}`}};K.styles=[k,x`
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
    `],d([b({attribute:!1})],K.prototype,"hass",2),d([h()],K.prototype,"_config",2),d([h()],K.prototype,"_dragPct",2),d([h()],K.prototype,"_optOn",2),d([h()],K.prototype,"_optPct",2),d([h()],K.prototype,"_optPreset",2),K=d([w("silk-fan-card")],K);var Di={type:"silk-button-card",name:"Silk Button",description:"Scenes and scripts that feel like real buttons."},Te=["scene","script","button","input_button"],tr={scene:"mdi:palette",script:"mdi:script-text",button:"mdi:gesture-tap-button",input_button:"mdi:gesture-tap-button"};C("silk-button-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:[...Te]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Confirm before running"});var mt=class extends v{constructor(){super(...arguments);this._optimisticRunning=!1}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-button-card",entity:e.find(s=>s.startsWith("scene."))??e.find(s=>s.startsWith("script."))}}static async getConfigElement(){return document.createElement("silk-button-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-button-card: `entity` is required");let e=A(t.entity);if(!Te.includes(e))throw new Error(`silk-button-card: entity must be one of ${Te.join("/")}, got \`${e}\``);this._config=t,this._optimisticRunning=!1}getCardSize(){return 1}getGridOptions(){return{columns:3,rows:1,min_columns:2,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){t.has("hass")&&this._optimisticRunning&&this._stateObj?.state==="on"&&this._clearOptimistic()}get _stateObj(){let t=this._config?.entity;return t?this.hass?.states[t]:void 0}_isUnavailable(t){return!t||t.state==="unavailable"}_isRunning(t){return!this._config||A(this._config.entity)!=="script"?!1:t?.state==="on"||this._optimisticRunning}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticRunning=!1}_onPress(){let t=this._config,e=this.hass;if(!t||!e||this._isUnavailable(this._stateObj))return;let i=t.name??this._stateObj?.attributes.friendly_name??t.entity;if(t.confirm&&!window.confirm(`Run "${i}"?`))return;let s=A(t.entity),r=s==="button"||s==="input_button"?"press":"turn_on";e.callService(s,r,{entity_id:t.entity}),T(this),this._flash(),s==="script"&&(this._optimisticRunning=!0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>{this._optimisticTimer=void 0,this._optimisticRunning=!1},2e3))}_onKeydown(t){t.repeat||t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._onPress())}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_renderIcon(t,e){if(e)return l`<ha-icon class="spin" icon="mdi:loading"></ha-icon>`;if(this._config?.icon)return l`<ha-icon .icon=${this._config.icon}></ha-icon>`;if(t)return l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`;let i=A(this._config?.entity??"");return l`<ha-icon .icon=${tr[i]??"mdi:gesture-tap"}></ha-icon>`}render(){let t=this._config;if(!t)return p;let e=this._stateObj;if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=this._isUnavailable(e),s=this._isRunning(e),r=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${E(e,t.color)}"
        role="button"
        tabindex=${i?-1:0}
        aria-label=${r}
        @click=${this._onPress}
        @keydown=${this._onKeydown}
      >
        <div class="flash"></div>
        <div class="icon ${P(e)||s?"on":""}">
          ${this._renderIcon(e,s)}
        </div>
        <div class="info"><div class="name">${r}</div></div>
      </ha-card>
    `}};mt.styles=[k,x`
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
    `],d([b({attribute:!1})],mt.prototype,"hass",2),d([h()],mt.prototype,"_config",2),d([h()],mt.prototype,"_optimisticRunning",2),mt=d([w("silk-button-card")],mt);var ji={type:"silk-media-card",name:"Silk Media",description:"Artwork-first now playing with honest controls."},er=1,zi=4,ir=16,nr=32,sr=16384,rr=2e3,qi="silk-media-card-editor";C(qi,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_volume",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_volume:"Show volume slider"},{show_volume:!0});function Ce(o,n){let t=o.attributes[n];return typeof t=="string"&&t?t:void 0}var et=class extends v{constructor(){super(...arguments);this._optimisticPlaying=null;this._optimisticVolume=null}static getStubConfig(t){return{type:"custom:silk-media-card",entity:Object.keys(t.states).find(i=>i.startsWith("media_player."))}}static async getConfigElement(){return document.createElement(qi)}setConfig(t){if(!t.entity||A(t.entity)!=="media_player")throw new Error("silk-media-card: define a media_player `entity` (e.g. media_player.living_room)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return this._showsVolume()?2:1}getGridOptions(){return{columns:6,rows:this._showsVolume()?2:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_showsVolume(){if(this._config?.show_volume===!1)return!1;let t=this._config?this.hass?.states[this._config.entity]:void 0;return t?H(t,zi):!0}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null},rr)}_onLeadingClick(t){t.stopPropagation(),this._config&&$(this,this._config.entity)}_onCardClick(){this._config&&$(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onPlayPause(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(!e||g(e))return;let i=this._optimisticPlaying??e.state==="playing";this._optimisticPlaying=!i,this._armExpiry(),this.hass.callService("media_player","media_play_pause",{entity_id:this._config.entity}),T(this)}_onSkip(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(g(this.hass.states[this._config.entity])||(this.hass.callService("media_player",e,{entity_id:this._config.entity}),T(this)))}_onVolumeChange(t){if(!this.hass||!this._config)return;let e=O(Math.round(t.detail.value),0,100);this._optimisticVolume=e,this._armExpiry(),this.hass.callService("media_player","volume_set",{entity_id:this._config.entity,volume_level:e/100}),T(this)}_volumePct(t){if(this._optimisticVolume!==null)return this._optimisticVolume;let e=t.attributes.volume_level;return typeof e=="number"&&Number.isFinite(e)?Math.round(O(e,0,1)*100):0}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=g(t),i=P(t),s=E(t,this._config.color),r=e?void 0:Ce(t,"entity_picture"),a=Ce(t,"media_title")??this._config.name??t.attributes.friendly_name??t.entity_id,c=t.state==="playing",m=e?!1:this._optimisticPlaying??c,u=Ce(t,"media_artist")??(e||m===c?R(this.hass,t):m?"Playing":"Paused"),f=this._config.show_volume!==!1&&H(t,zi);return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${s}"
        @click=${this._onCardClick}
      >
        <div class="row">
          ${r?l`
                <button class="artwork" aria-label="Show details for ${a}" @click=${this._onLeadingClick}>
                  <img src=${r} alt="" />
                </button>
              `:l`
                <button
                  class="icon ${i?"on":""}"
                  aria-label="Show details for ${a}"
                  @click=${this._onLeadingClick}
                >
                  ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
                </button>
              `}
          <div class="info">
            <div class="name">${a}</div>
            <div class="state">${u}</div>
          </div>
          ${this._renderControls(t,e,m)}
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
    `}_renderControls(t,e,i){let s=H(t,ir),r=H(t,er)||H(t,sr),a=H(t,nr);return!s&&!r&&!a?p:l`
      <div class="trailing">
        ${s?l`
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
        ${a?l`
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
    `}};et.styles=[k,x`
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
    `],d([b({attribute:!1})],et.prototype,"hass",2),d([h()],et.prototype,"_config",2),d([h()],et.prototype,"_optimisticPlaying",2),d([h()],et.prototype,"_optimisticVolume",2),et=d([w("silk-media-card")],et);var Gi={type:"silk-room-card",name:"Silk Room",description:"A room at a glance: climate, activity, and quick controls."},Bi="silk-room-card-editor";C(Bi,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"navigation_path",selector:{text:{}}}],{name:"Name",icon:"Icon",navigation_path:"Navigation path"},{icon:"mdi:sofa"});var Vi="mdi:sofa",or=3,ar=4,cr=2e3;function lr(o){return typeof o!="string"||!o?"":o==="\xB0C"||o==="\xB0F"?"\xB0":o}function dr(o,n){switch(o){case"lock":return n?"unlocked":"locked";case"cover":case"valve":return n?"open":"closed";default:return n?"on":"off"}}var pt=class extends v{constructor(){super(...arguments);this._optimistic={};this._sensors=[];this._toggles=[];this._countIds=[];this._optimisticBase={};this._optimisticTimers={}}static getStubConfig(){return{type:"custom:silk-room-card",name:"Living room",icon:Vi}}static async getConfigElement(){return document.createElement(Bi)}setConfig(t){if(!t.name)throw new Error("silk-room-card: `name` is required");this._config=t,this._sensors=(t.sensors??[]).slice(0,or),this._toggles=(t.toggles??[]).slice(0,ar),this._countIds=t.count_active??[],this._clearAllOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._optimistic)){let i=this.hass.states[e];i&&i.last_updated!==this._optimisticBase[e]&&this._clearOptimistic(e)}}_clearOptimistic(t){if(window.clearTimeout(this._optimisticTimers[t]),delete this._optimisticTimers[t],delete this._optimisticBase[t],t in this._optimistic){let e={...this._optimistic};delete e[t],this._optimistic=e}}_clearAllOptimistic(){for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={},this._optimisticBase={},this._optimistic={}}_displayActive(t){let e=this._optimistic[t];return e!==void 0?e:P(this.hass?.states[t])}_onCardClick(){let t=this._config;if(!t)return;if(t.navigation_path){history.pushState(null,"",t.navigation_path),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}));return}let e=this._sensors[0]??this._toggles[0];e&&$(this,e)}_onToggleClick(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let s=i.states[e];!s||g(s)||(T(this),this._optimistic={...this._optimistic,[e]:!P(s)},this._optimisticBase[e]=s.last_updated,window.clearTimeout(this._optimisticTimers[e]),this._optimisticTimers[e]=window.setTimeout(()=>this._clearOptimistic(e),cr),F(i,e))}_sensorSegments(){let t=this.hass,e=[];for(let i of this._sensors){let s=t.states[i];if(!s)continue;let r=Number(s.state),a=Number.isFinite(r)?lr(s.attributes.unit_of_measurement):"";e.push(l`<span class="reading">${I(t,i,r)}${a}</span>`)}return e}_activeCount(){let t=0;for(let e of this._countIds)this._displayActive(e)&&t++;return t}_renderToggle(t){let e=this.hass,i=e.states[t],s=!i||g(i),r=this._optimistic[t],a=r??P(i),c=i&&r!==void 0?{...i,state:dr(A(t),r)}:i,m=i?.attributes.friendly_name??t;return l`
      <button
        class="tbtn ${a?"on":""}"
        style="--silk-accent:${E(c)}"
        .disabled=${s}
        aria-label=${`Toggle ${m}`}
        aria-pressed=${a?"true":"false"}
        @click=${u=>this._onToggleClick(u,t)}
      >
        ${c?l`<ha-state-icon .hass=${e} .stateObj=${c}></ha-state-icon>`:l`<ha-icon icon="mdi:help-circle-outline"></ha-icon>`}
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._toggles.length?e.states[this._toggles[0]]:void 0,s=E(i,t.color),r=this._countIds.length?this._activeCount():0,a=r>0||this._toggles.some(m=>this._displayActive(m)),c=[];for(let m of this._sensorSegments())c.length&&c.push(l`<span class="sep">·</span>`),c.push(m);return this._countIds.length&&(c.length&&c.push(l`<span class="sep">·</span>`),c.push(l`<span class="count ${r>0?"on":""}">${r} on</span>`)),l`
      <ha-card class="control" style="--silk-accent:${s}" @click=${this._onCardClick}>
        <div class="icon ${a?"on":""}">
          <ha-icon .icon=${t.icon??Vi}></ha-icon>
        </div>
        <div class="info">
          <div class="name">${t.name}</div>
          ${c.length?l`<div class="state">${c}</div>`:p}
        </div>
        ${this._toggles.length?l`<div class="trailing">${this._toggles.map(m=>this._renderToggle(m))}</div>`:p}
      </ha-card>
    `}};pt.styles=[k,x`
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
    `],d([b({attribute:!1})],pt.prototype,"hass",2),d([h()],pt.prototype,"_config",2),d([h()],pt.prototype,"_optimistic",2),pt=d([w("silk-room-card")],pt);var Wi={type:"silk-rocker-card",name:"Silk Rocker",description:"A wall switch that looks and moves like the real thing."},Ki="silk-rocker-card-editor";C(Ki,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var mr=2e3,ut=class extends v{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-rocker-card",entity:Object.keys(t.states).find(i=>i.startsWith("switch."))}}static async getConfigElement(){return document.createElement(Ki)}setConfig(t){if(!t.entity)throw new Error("silk-rocker-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_toggle(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];!i||g(i)||(T(this),this._optimistic=!P(i),this._optimisticBase=i.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),mr),F(e,t.entity))}_onClick(){this._toggle()}_onKeydown(t){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._toggle())}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=this._optimistic??P(i),a=E(i,t.color),c=t.name??i.attributes.friendly_name??t.entity,m=t.show_name!==!1;return l`
      <ha-card
        class=${s?"unavailable":""}
        style="--silk-accent:${a}"
        role="switch"
        tabindex=${s?-1:0}
        aria-checked=${r?"true":"false"}
        aria-disabled=${s?"true":"false"}
        aria-label=${`Toggle ${c}`}
        @click=${this._onClick}
        @keydown=${this._onKeydown}
      >
        <div class="plate">
          <div class="paddle ${s?"":r?"on":"off"}">
            <span class="led ${!s&&r?"lit":""}"></span>
          </div>
        </div>
        ${m?l`<div class="name" title=${c}>${c}</div>`:p}
      </ha-card>
    `}};ut.styles=[k,x`
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
    `],d([b({attribute:!1})],ut.prototype,"hass",2),d([h()],ut.prototype,"_config",2),d([h()],ut.prototype,"_optimistic",2),ut=d([w("silk-rocker-card")],ut);var Zi={type:"silk-push-card",name:"Silk Push",description:"A physical push button with a satisfying press."},Ji="silk-push-card-editor";C(Ji,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","scene","script","button","input_button"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before pressing"});var Yi=new Set(["scene","script","button","input_button"]),Xi=38,Ae=100,pr=2e3,ht=class extends v{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-push-card",entity:e.find(s=>s.startsWith("switch."))??e.find(s=>s.startsWith("scene."))}}static async getConfigElement(){return document.createElement(Ji)}setConfig(t){if(!t.entity)throw new Error("silk-push-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_sweep(){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;this.renderRoot.querySelector(".ring-led")?.animate([{strokeDashoffset:`${Ae}`,opacity:1},{strokeDashoffset:"0",opacity:1,offset:.8},{strokeDashoffset:"0",opacity:0}],{duration:600,easing:"cubic-bezier(0.23, 1, 0.32, 1)"})}_onCardClick(){this._config&&$(this,this._config.entity)}_onPress(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!(!s||g(s))){if(e.confirm){let r=e.name??s.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to press ${r}?`))return}T(this),Yi.has(A(e.entity))?this._sweep():(this._optimistic=!P(s),this._optimisticBase=s.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),pr)),F(i,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=!Yi.has(A(t.entity)),a=r&&!s&&(this._optimistic??P(i)),c=this._optimistic===null||!r?i:{...i,state:this._optimistic?"on":"off"},m=E(i,t.color),u=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${s?"unavailable":""}
        style="--silk-accent:${m}"
        @click=${this._onCardClick}
      >
        <div class="well">
          <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring-track" cx="40" cy="40" r=${Xi}></circle>
            <circle
              class="ring-led ${a?"on":""}"
              cx="40"
              cy="40"
              r=${Xi}
              pathLength=${Ae}
            ></circle>
          </svg>
          <button
            class="btn ${a?"on":""}"
            .disabled=${s}
            aria-label=${`${r?"Toggle":"Activate"} ${u}`}
            @click=${this._onPress}
          >
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${c}></ha-state-icon>`}
          </button>
        </div>
        <div class="name" title=${u}>${u}</div>
      </ha-card>
    `}};ht.styles=[k,x`
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
        stroke-dasharray: ${Ae};
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
    `],d([b({attribute:!1})],ht.prototype,"hass",2),d([h()],ht.prototype,"_config",2),d([h()],ht.prototype,"_optimistic",2),ht=d([w("silk-push-card")],ht);var sn={type:"silk-knob-card",name:"Silk Knob",description:"A rotary dial you actually turn."},rn="silk-knob-card-editor";C(rn,[{name:"entity",required:!0,selector:{entity:{domain:["light","fan","media_player","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",color:"Accent color"});var ur=["light","fan","media_player","number","input_number"];function re(o,n){if(o==="number"||o==="input_number"){let t=Number(n.attributes.min),e=Number(n.attributes.max),i=Number(n.attributes.step),s=Number.isFinite(t)?t:0,r=Number.isFinite(e)&&e>s?e:s+100;return{min:s,max:r,step:Number.isFinite(i)&&i>0?i:1,percent:!1,toggleable:!1}}if(o==="fan"){let t=Number(n.attributes.percentage_step);return{min:0,max:100,step:Number.isFinite(t)&&t>0?t:1,percent:!0,toggleable:!0}}return{min:0,max:100,step:1,percent:!0,toggleable:!0}}function hr(o,n){switch(o){case"light":{if(n.state!=="on")return 0;let t=n.attributes.brightness;return typeof t!="number"?100:O(Math.round(t/255*100),1,100)}case"fan":{if(n.state==="off")return 0;let t=n.attributes.percentage;return typeof t=="number"?t:n.state==="on"?100:null}case"media_player":{let t=n.attributes.volume_level;return typeof t=="number"?t*100:null}case"number":case"input_number":{let t=Number(n.state);return Number.isFinite(t)?t:null}}}function fr(o,n,t,e){switch(t){case"light":e<=0?o.callService("light","turn_off",{entity_id:n}):o.callService("light","turn_on",{entity_id:n,brightness_pct:Math.round(e)});return;case"fan":o.callService("fan","set_percentage",{entity_id:n,percentage:Math.round(e)});return;case"media_player":o.callService("media_player","volume_set",{entity_id:n,volume_level:Math.round(e)/100});return;case"number":case"input_number":o.callService(t,"set_value",{entity_id:n,value:e});return}}function Qi(o,n){let t=Math.round((o-n.min)/n.step)*n.step+n.min;return O(Number(t.toFixed(3)),n.min,n.max)}function gr(o){let n=String(o),t=n.indexOf(".");return t===-1?0:Math.min(n.length-t-1,3)}var Mt=118,z=Mt/2,tn=46,en=50.5,nn=56.5,Se=25,oe=270,Vt=-135,_r=19,br=40,vr=4,yr=2e3,xr=Array.from({length:Se},(o,n)=>{let t=(Vt+oe*n/(Se-1))*Math.PI/180,e=Math.sin(t),i=-Math.cos(t);return{x1:(z+en*e).toFixed(2),y1:(z+en*i).toFixed(2),x2:(z+nn*e).toFixed(2),y2:(z+nn*i).toFixed(2)}}),Y=class extends v{constructor(){super(...arguments);this._dragValue=null;this._optimistic=null;this._pressed=!1;this._dragging=!1;this._centerX=0;this._centerY=0;this._startX=0;this._startY=0}static getStubConfig(t){return{type:"custom:silk-knob-card",entity:Object.keys(t.states).find(i=>i.startsWith("light."))}}static async getConfigElement(){return document.createElement(rn)}setConfig(t){if(!t.entity)throw new Error("silk-knob-card: `entity` is required");let e=A(t.entity);if(!ur.includes(e))throw new Error(`silk-knob-card: unsupported domain "${e}" \u2014 use light, fan, media_player, number or input_number`);this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._pressed||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),yr)}_displayLevel(t,e){return this._dragValue??this._optimistic??hr(e,t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatNumber(t,e){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:e}).format(t)}_valueFromPointer(t,e){let i=Math.atan2(t.clientX-this._centerX,this._centerY-t.clientY)*180/Math.PI,r=(O(i,Vt,Vt+oe)-Vt)/oe;return Qi(e.min+r*(e.max-e.min),e)}_spec(){let t=this._config,e=t?this.hass?.states[t.entity]:void 0;return!t||!e?null:re(A(t.entity),e)}_onPointerDown(t){let e=this._config?this.hass?.states[this._config.entity]:void 0;if(!e||g(e))return;t.stopPropagation();let i=t.currentTarget;i.setPointerCapture(t.pointerId);let s=i.getBoundingClientRect();this._centerX=s.left+s.width/2,this._centerY=s.top+s.height/2,this._startX=t.clientX,this._startY=t.clientY,this._pressed=!0,this._dragging=!1}_onPointerMove(t){if(!this._pressed)return;if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<vr)return;this._dragging=!0}let e=this._spec();e&&(this._dragValue=this._valueFromPointer(t,e))}_onPointerUp(t){if(this._pressed)if(this._pressed=!1,this._dragging){this._dragging=!1;let e=this._spec();e&&this._commit(this._valueFromPointer(t,e)),this._dragValue=null}else this._onTap()}_onPointerCancel(){this._pressed=!1,this._dragging=!1,this._dragValue=null}_commit(t){let e=this._config,i=this.hass;!e||!i||(this._optimistic=t,this._holdOptimistic(),T(this),fr(i,e.entity,A(e.entity),t))}_onTap(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];if(!i||g(i))return;let s=A(t.entity);if(!re(s,i).toggleable)return;T(this);let r=P(i);F(e,t.entity),(s==="light"||s==="fan")&&(this._optimistic=r?0:null,r?this._holdOptimistic():this._clearOptimistic())}_onKeydown(t){let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!s||g(s))return;let r=t.key,a=0;if(r==="ArrowUp"||r==="ArrowRight")a=1;else if(r==="ArrowDown"||r==="ArrowLeft")a=-1;else if(r!=="Home"&&r!=="End")return;t.preventDefault(),t.stopPropagation();let c=A(e.entity),m=re(c,s),u=this._displayLevel(s,c)??m.min,f=r==="Home"?m.min:r==="End"?m.max:Qi(u+a*m.step,m);f!==u&&this._commit(f)}_onCardClick(){this._config&&$(this,this._config.entity)}_swallowClick(t){t.stopPropagation()}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let s=A(t.entity),r=re(s,i),a=g(i),c=a?null:this._displayLevel(i,s),m=r.max-r.min||1,u=c===null?0:O((c-r.min)/m,0,1),f=c===null?-1:u,_=Vt+oe*u,y=E(i,t.color),S=t.name??i.attributes.friendly_name??t.entity,M=r.percent?"":i.attributes.unit_of_measurement??"",N=c===null?"\u2014":r.percent?`${Math.round(c)}%`:this._formatNumber(c,gr(r.step));return l`
      <ha-card
        class=${a?"unavailable":""}
        style="--silk-accent:${y}"
        @click=${this._onCardClick}
      >
        <div
          class="dial ${this._dragging?"dragging":""} ${this._pressed?"pressed":""}"
          role="slider"
          tabindex=${a?-1:0}
          aria-label=${S}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${c===null?r.min:r.percent?Math.round(c):c}
          aria-valuetext=${M?`${N} ${M}`:N}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
          @keydown=${this._onKeydown}
          @click=${this._swallowClick}
        >
          <svg viewBox="0 0 ${Mt} ${Mt}" aria-hidden="true">
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
            ${xr.map((q,V)=>D`<line
                  class="tick ${V/(Se-1)<=f+1e-6?"on":""}"
                  x1=${q.x1} y1=${q.y1} x2=${q.x2} y2=${q.y2}
                ></line>`)}
            <g class="knob-g">
              <circle
                class="face"
                cx=${z}
                cy=${z}
                r=${tn}
                filter="url(#silk-knob-shadow)"
              ></circle>
              <circle class="rim" cx=${z} cy=${z} r=${tn-3} ></circle>
              <g class="ind" style="transform: rotate(${_}deg)">
                <line class="mark" x1=${z} y1=${z-br} x2=${z} y2=${z-_r}></line>
              </g>
            </g>
          </svg>
        </div>
        <div class="readout">
          <span class="value">${N}</span>
          ${M?l`<span class="unit">${M}</span>`:p}
        </div>
      </ha-card>
    `}};Y.styles=[k,x`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 12px;
      }
      .dial {
        /* Basis is the full 118px stage; shrinks proportionally in tight grids. */
        flex: 1 1 ${Mt}px;
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
        max-width: ${Mt}px;
        max-height: ${Mt}px;
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
        transform-origin: ${z}px ${z}px;
        transition: transform 250ms var(--silk-spring);
      }
      .knob-g {
        transform-origin: ${z}px ${z}px;
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
    `],d([b({attribute:!1})],Y.prototype,"hass",2),d([h()],Y.prototype,"_config",2),d([h()],Y.prototype,"_dragValue",2),d([h()],Y.prototype,"_optimistic",2),d([h()],Y.prototype,"_pressed",2),d([h()],Y.prototype,"_dragging",2),Y=d([w("silk-knob-card")],Y);var an={type:"silk-fader-card",name:"Silk Fader",description:"A studio fader for lights, covers, and anything with a level."},cn="silk-fader-card-editor";C(cn,[{name:"entity",required:!0,selector:{entity:{domain:["light","cover","fan","media_player","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",color:"Accent color"});var wr=["light","cover","fan","media_player","number","input_number"];function ae(o,n){if(o==="number"||o==="input_number"){let t=Number(n.attributes.min),e=Number(n.attributes.max),i=Number(n.attributes.step),s=Number.isFinite(t)?t:0,r=Number.isFinite(e)&&e>s?e:s+100;return{min:s,max:r,step:Number.isFinite(i)&&i>0?i:1,percent:!1,toggleable:!1}}if(o==="fan"){let t=Number(n.attributes.percentage_step);return{min:0,max:100,step:Number.isFinite(t)&&t>0?t:1,percent:!0,toggleable:!0}}return{min:0,max:100,step:1,percent:!0,toggleable:!0}}function $r(o,n){switch(o){case"light":{if(n.state!=="on")return 0;let t=n.attributes.brightness;return typeof t!="number"?100:O(Math.round(t/255*100),1,100)}case"cover":{let t=n.attributes.current_position;return typeof t=="number"?t:n.state==="open"?100:n.state==="closed"?0:null}case"fan":{if(n.state==="off")return 0;let t=n.attributes.percentage;return typeof t=="number"?t:n.state==="on"?100:null}case"media_player":{let t=n.attributes.volume_level;return typeof t=="number"?t*100:null}case"number":case"input_number":{let t=Number(n.state);return Number.isFinite(t)?t:null}}}function kr(o,n,t,e){switch(t){case"light":e<=0?o.callService("light","turn_off",{entity_id:n}):o.callService("light","turn_on",{entity_id:n,brightness_pct:Math.round(e)});return;case"cover":o.callService("cover","set_cover_position",{entity_id:n,position:Math.round(e)});return;case"fan":o.callService("fan","set_percentage",{entity_id:n,percentage:Math.round(e)});return;case"media_player":o.callService("media_player","volume_set",{entity_id:n,volume_level:Math.round(e)/100});return;case"number":case"input_number":o.callService(t,"set_value",{entity_id:n,value:e});return}}function on(o,n){let t=Math.round((o-n.min)/n.step)*n.step+n.min;return O(Number(t.toFixed(3)),n.min,n.max)}function Er(o){let n=String(o),t=n.indexOf(".");return t===-1?0:Math.min(n.length-t-1,3)}var Rt=18,Tr=4,Cr=2e3,B=class extends v{constructor(){super(...arguments);this._dragValue=null;this._optimistic=null;this._optimisticOn=null;this._dragging=!1;this._pressed=!1;this._startX=0;this._startY=0}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-fader-card",entity:e.find(s=>s.startsWith("light."))??e.find(s=>s.startsWith("cover."))}}static async getConfigElement(){return document.createElement(cn)}setConfig(t){if(!t.entity)throw new Error("silk-fader-card: `entity` is required");let e=A(t.entity);if(!wr.includes(e))throw new Error(`silk-fader-card: unsupported domain "${e}" \u2014 use light, cover, fan, media_player, number or input_number`);this._config=t,this._clearOptimistic()}getCardSize(){return 3}getGridOptions(){return{columns:2,rows:3,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._pressed||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Cr)}_displayLevel(t,e){return this._dragValue??this._optimistic??$r(e,t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatNumber(t,e){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:e}).format(t)}_spec(){let t=this._config,e=t?this.hass?.states[t.entity]:void 0;return!t||!e?null:ae(A(t.entity),e)}_valueFromPointer(t,e){let i=this._trackEl;if(!i)return null;let s=i.getBoundingClientRect(),r=s.height-Rt;if(r<=0)return null;let a=O((s.bottom-t.clientY-Rt/2)/r,0,1);return on(e.min+a*(e.max-e.min),e)}_onPointerDown(t){let e=this._config?this.hass?.states[this._config.entity]:void 0;!e||g(e)||(t.currentTarget.setPointerCapture(t.pointerId),this._pressed=!0,this._dragging=!1,this._startX=t.clientX,this._startY=t.clientY)}_onPointerMove(t){if(!this._pressed)return;if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<Tr)return;this._dragging=!0}let e=this._spec(),i=e?this._valueFromPointer(t,e):null;i!==null&&(this._dragValue=i)}_onPointerUp(t){if(this._pressed)if(this._pressed=!1,this._dragging){this._dragging=!1;let e=this._spec(),i=e?this._valueFromPointer(t,e):null;i!==null&&this._commit(i),this._dragValue=null}else this._config&&$(this,this._config.entity)}_onPointerCancel(){this._pressed=!1,this._dragging=!1,this._dragValue=null}_commit(t){let e=this._config,i=this.hass;if(!e||!i)return;let s=A(e.entity);this._optimistic=t,s!=="media_player"&&(this._optimisticOn=t>0),this._holdOptimistic(),T(this),kr(i,e.entity,s,t)}_onIconClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!s||g(s))return;let r=A(e.entity);if(!ae(r,s).toggleable){$(this,e.entity);return}T(this);let a=this._optimisticOn??P(s);F(i,e.entity),this._optimisticOn=!a,a?this._optimistic=r==="media_player"?null:0:this._optimistic=r==="cover"?100:null,this._holdOptimistic()}_stopPointer(t){t.stopPropagation()}_onKeydown(t){let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!s||g(s))return;let r=t.key,a=0;if(r==="ArrowUp"||r==="ArrowRight")a=1;else if(r==="ArrowDown"||r==="ArrowLeft")a=-1;else if(r!=="Home"&&r!=="End")return;t.preventDefault(),t.stopPropagation();let c=A(e.entity),m=ae(c,s),u=this._displayLevel(s,c)??m.min,f=r==="Home"?m.min:r==="End"?m.max:on(u+a*m.step,m);f!==u&&this._commit(f)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let s=A(t.entity),r=ae(s,i),a=g(i),c=a?null:this._displayLevel(i,s),m=r.max-r.min||1,u=c===null?0:O((c-r.min)/m,0,1),f=r.toggleable&&!a&&(this._optimisticOn??P(i)),_=E(i,t.color),y=t.name??i.attributes.friendly_name??t.entity,S=r.percent?"":i.attributes.unit_of_measurement??"",M=c===null?"\u2014":r.percent?`${Math.round(c)}%`:this._formatNumber(c,Er(r.step)),N=u.toFixed(4);return l`
      <ha-card
        class=${a?"unavailable":""}
        style="--silk-accent:${_}"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <div class="readout">
          <span class="value">${M}</span>
          ${S?l`<span class="unit">${S}</span>`:p}
        </div>
        <div
          class="fader ${this._dragging?"dragging":""}"
          role="slider"
          aria-orientation="vertical"
          tabindex=${a?-1:0}
          aria-label=${y}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${c===null?r.min:r.percent?Math.round(c):c}
          aria-valuetext=${S?`${M} ${S}`:M}
          @keydown=${this._onKeydown}
        >
          <div class="rail">
            <div class="track">
              <div class="fill" style="height: calc((100% - ${Rt}px) * ${N} + ${Rt/2}px)"></div>
            </div>
            <div class="cap" style="bottom: calc((100% - ${Rt}px) * ${N})"></div>
          </div>
        </div>
        <button
          class="icon ${f?"on":""}"
          ?disabled=${a}
          aria-label=${`Toggle ${y}`}
          @pointerdown=${this._stopPointer}
          @click=${this._onIconClick}
        >
          <ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>
        </button>
      </ha-card>
    `}};B.styles=[k,x`
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
        height: ${Rt}px;
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
    `],d([b({attribute:!1})],B.prototype,"hass",2),d([h()],B.prototype,"_config",2),d([h()],B.prototype,"_dragValue",2),d([h()],B.prototype,"_optimistic",2),d([h()],B.prototype,"_optimisticOn",2),d([h()],B.prototype,"_dragging",2),d([ri(".track")],B.prototype,"_trackEl",2),B=d([w("silk-fader-card")],B);var pn={type:"silk-weather-card",name:"Silk Weather",description:"Now plus the next six hours, nothing you don't need."},ln={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},dn="mdi:weather-partly-cloudy",Ar={"clear-night":"Clear night",cloudy:"Cloudy",exceptional:"Exceptional",fog:"Fog",hail:"Hail",lightning:"Lightning","lightning-rainy":"Lightning, rainy",partlycloudy:"Partly cloudy",pouring:"Pouring",rainy:"Rainy",snowy:"Snowy","snowy-rainy":"Snowy, rainy",sunny:"Sunny",windy:"Windy","windy-variant":"Windy"},mn=6,un="silk-weather-card-editor";C(un,[{name:"entity",required:!0,selector:{entity:{domain:["weather"]}}},{name:"name",selector:{text:{}}},{name:"show_forecast",selector:{boolean:{}}}],{entity:"Entity",name:"Name",show_forecast:"Show hourly forecast"},{show_forecast:!0});var it=class extends v{constructor(){super(...arguments);this._forecast=null;this._subFailed=!1}static getStubConfig(t){return{type:"custom:silk-weather-card",entity:Object.keys(t.states).find(i=>i.startsWith("weather."))}}static async getConfigElement(){return document.createElement(un)}setConfig(t){if(!t.entity||A(t.entity)!=="weather")throw new Error("silk-weather-card: define a weather `entity` (e.g. weather.home)");this._subEntity!==void 0&&this._subEntity!==t.entity&&(this._teardownSubscription(),this._forecast=null,this._subFailed=!1),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._subscribeForecast()}disconnectedCallback(){super.disconnectedCallback(),this._teardownSubscription()}updated(t){!t.has("hass")&&!t.has("_config")||(this._config?.show_forecast===!1?this._teardownSubscription():this._subscribeForecast())}async _subscribeForecast(){let t=this._config,e=this.hass;if(!t||!e||!this.isConnected||t.show_forecast===!1||this._subEntity===t.entity)return;this._teardownSubscription();let i=t.entity;this._subEntity=i;let s=e.connection;if(!s||typeof s.subscribeMessage!="function"){this._subFailed=!0;return}try{let r=s.subscribeMessage(a=>{this._subEntity===i&&(this._forecast=Array.isArray(a.forecast)?a.forecast:[])},{type:"weather/subscribe_forecast",forecast_type:"hourly",entity_id:i});this._unsubPromise=r,await r}catch{this._subEntity===i&&(this._unsubPromise=void 0,this._subFailed=!0)}}_teardownSubscription(){let t=this._unsubPromise;this._unsubPromise=void 0,this._subEntity=void 0,t&&t.then(e=>e()).catch(()=>{})}_visibleForecast(t){if(this._config?.show_forecast===!1)return null;let e=this._forecast;if(e===null&&this._subFailed&&(e=t.attributes.forecast),!Array.isArray(e))return null;let i=e.filter(s=>s&&typeof s.datetime=="string").slice(0,mn);return i.length>0?i:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatTemp(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision,i=e!==void 0?{minimumFractionDigits:e,maximumFractionDigits:e}:{maximumFractionDigits:1};return new Intl.NumberFormat(this._locale(),i).format(t)}_hourLabel(t){let e=new Date(t);return Number.isNaN(e.getTime())?"\u2014":new Intl.DateTimeFormat(this._locale(),{hour:"numeric"}).format(e)}_conditionText(t,e){return t.formatEntityState?R(t,e):Ar[e.state]??e.state.replace(/_/g," ")}_onCardClick(){this._config&&$(this,this._config.entity)}_renderHour(t){let e=Number(t.temperature),i=ln[t.condition??""]??dn;return l`
      <div class="cell">
        <span class="hour">${this._hourLabel(t.datetime)}</span>
        <ha-icon .icon=${i}></ha-icon>
        <span class="t">${Number.isFinite(e)?`${Math.round(e)}\xB0`:"\u2014"}</span>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=E(i),a=t.name??i.attributes.friendly_name??t.entity,c=Number(i.attributes.temperature),m=Number(i.attributes.humidity),u=ln[i.state]??dn,f=this._visibleForecast(i);return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${s?"":"on"}">
            <ha-icon .icon=${u}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${a}</div>
            <div class="state">
              ${this._conditionText(e,i)}${Number.isFinite(m)?l`<span class="sep">·</span>${Math.round(m)}%`:p}
            </div>
          </div>
          <div class="trailing">
            <span class="temp">${Number.isFinite(c)?`${this._formatTemp(c)}\xB0`:"\u2014"}</span>
          </div>
        </div>
        ${f?l`<div class="hours">${f.map(_=>this._renderHour(_))}</div>`:p}
      </ha-card>
    `}};it.styles=[k,x`
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
        grid-template-columns: repeat(${mn}, minmax(0, 1fr));
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
    `],d([b({attribute:!1})],it.prototype,"hass",2),d([h()],it.prototype,"_config",2),d([h()],it.prototype,"_forecast",2),d([h()],it.prototype,"_subFailed",2),it=d([w("silk-weather-card")],it);var hn={type:"silk-person-card",name:"Silk Person",description:"Who's home, at a glance."},Sr=20,fn="silk-person-card-editor";C(fn,[{name:"entity",required:!0,selector:{entity:{domain:["person","device_tracker"]}}},{name:"name",selector:{text:{}}},{name:"battery",selector:{entity:{domain:["sensor"],device_class:"battery"}}}],{entity:"Entity",name:"Name",battery:"Battery sensor"});var ft=class extends v{static getStubConfig(n){let t=Object.keys(n.states);return{type:"custom:silk-person-card",entity:t.find(i=>i.startsWith("person."))??t.find(i=>i.startsWith("device_tracker."))}}static async getConfigElement(){return document.createElement(fn)}setConfig(n){let t=n.entity?A(n.entity):"";if(!n.entity||t!=="person"&&t!=="device_tracker")throw new Error("silk-person-card: define a person or device_tracker `entity` (e.g. person.jamie)");this._config=n,this._brokenPicture=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}_presence(n,t){if(n.formatEntityState)return R(n,t);switch(t.state){case"home":return"Home";case"not_home":return"Away";default:return t.state.replace(/_/g," ")}}_battery(){let n=this._config?.battery,t=this.hass;if(!n||!t)return null;let e=t.states[n];if(!e||g(e))return null;let i=Number(e.state);return Number.isFinite(i)?{text:`${I(t,n,i)}%`,low:i<Sr}:null}_onCardClick(){this._config&&$(this,this._config.entity)}_onImgError(){let t=(this._config&&this.hass?.states[this._config.entity])?.attributes.entity_picture;typeof t=="string"&&(this._brokenPicture=t)}render(){let n=this._config,t=this.hass;if(!n||!t)return p;let e=t.states[n.entity];if(!e)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${n.entity}</div>
        </ha-card>
      `;let i=g(e),s=!i&&P(e),r=E(e),a=n.name??e.attributes.friendly_name??n.entity,c=e.attributes.entity_picture,m=typeof c=="string"&&c&&c!==this._brokenPicture?c:void 0,u=(Array.from(a.trim())[0]??"?").toUpperCase(),f=this._battery();return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="avatar ${s?"home":"away"}">
          ${m?l`<img src=${m} alt=${a} loading="lazy" @error=${this._onImgError} />`:l`<span class="initial">${u}</span>`}
        </div>
        <div class="info">
          <div class="name">${a}</div>
          <div class="state">
            ${this._presence(t,e)}${f?l`<span class="sep">·</span><span class="battery ${f.low?"low":""}"
                  >${f.text}</span
                >`:p}
          </div>
        </div>
      </ha-card>
    `}};ft.styles=[k,x`
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
    `],d([b({attribute:!1})],ft.prototype,"hass",2),d([h()],ft.prototype,"_config",2),d([h()],ft.prototype,"_brokenPicture",2),ft=d([w("silk-person-card")],ft);var _n={type:"silk-lock-card",name:"Silk Lock",description:"Hold to unlock \u2014 no accidental taps."},bn="silk-lock-card-editor";C(bn,[{name:"entity",required:!0,selector:{entity:{domain:["lock"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"hold_time",selector:{number:{min:300,max:5e3,step:100,mode:"box"}}},{name:"instant",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",hold_time:"Hold time (ms)",instant:"Instant unlock (tap, no hold)"},{hold_time:1200});var Pr=1200,Or=200,Mr=2e3,Gt=52,ce=Gt/2,gn=24,Pe=100,Z=class extends v{constructor(){super(...arguments);this._optimistic=null;this._holdProgress=0;this._holding=!1;this._optimisticBase="";this._holdStart=0;this._completedAt=0;this._holdTick=()=>{if(!this._holding)return;let t=(performance.now()-this._holdStart)/this._holdMs();if(t>=1){this._holding=!1,this._holdProgress=0,this._completedAt=Date.now(),this._callLock("unlock");return}this._holdProgress=t,this._holdRaf=requestAnimationFrame(this._holdTick)}}static getStubConfig(t){return{type:"custom:silk-lock-card",entity:Object.keys(t.states).find(i=>i.startsWith("lock."))}}static async getConfigElement(){return document.createElement(bn)}setConfig(t){if(!t.entity)throw new Error("silk-lock-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holding=!1,this._holdProgress=0}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_holdMs(){let t=Number(this._config?.hold_time);return Number.isFinite(t)&&t>0?Math.max(Or,t):Pr}_displayState(){let t=this.hass?.states[this._config?.entity??""];if(t)return this._optimistic??t.state}_callLock(t){let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];s&&(i.callService("lock",t,{entity_id:e.entity}),T(this,"success"),this._optimistic=t==="lock"?"locking":"unlocking",this._optimisticBase=s.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Mr))}_onTap(t){if(t.stopPropagation(),Date.now()-this._completedAt<400)return;let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!s||g(s))return;let r=this._displayState()==="locked"?"unlock":"lock";r==="unlock"&&!e.instant||this._callLock(r)}_onHoldStart(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!(!s||g(s))&&!(this._displayState()!=="locked"||e.instant)){try{t.currentTarget.setPointerCapture(t.pointerId)}catch{}this._holding=!0,this._holdStart=performance.now(),this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holdRaf=requestAnimationFrame(this._holdTick)}}_onHoldEnd(t){t.stopPropagation(),this._holding&&(this._holding=!1,this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holdRaf=void 0,this._holdProgress=0)}_onCardClick(){this._config&&$(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=this._optimistic===null?i:{...i,state:this._optimistic},a=P(r),c=i.state==="jammed"?"var(--error-color, #db4437)":E(r,t.color),m=t.name??i.attributes.friendly_name??t.entity,u=r.state==="locked"?"unlock":"lock",f=u==="unlock"&&!t.instant&&!s,_=u==="lock"?"mdi:lock":"mdi:lock-open-variant-outline",y=u==="lock"?`Lock ${m}`:f?`Hold to unlock ${m}`:`Unlock ${m}`,S=(Pe*(1-this._holdProgress)).toFixed(2);return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${a?"on":""}"
          .disabled=${s}
          aria-label=${y}
          @click=${this._onTap}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${r}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${m}</div>
          <div class="state">${R(e,r)}</div>
        </div>
        <div class="trailing">
          <button
            class="action ${this._holding?"holding":""}"
            .disabled=${s}
            aria-label=${y}
            @click=${this._onTap}
            @pointerdown=${this._onHoldStart}
            @pointerup=${this._onHoldEnd}
            @pointercancel=${this._onHoldEnd}
            @contextmenu=${M=>M.preventDefault()}
          >
            ${f?l`
                  <svg
                    class="ring"
                    viewBox="0 0 ${Gt} ${Gt}"
                    aria-hidden="true"
                  >
                    <circle class="ring-track" cx=${ce} cy=${ce} r=${gn}></circle>
                    <circle
                      class="ring-fill"
                      cx=${ce}
                      cy=${ce}
                      r=${gn}
                      pathLength=${Pe}
                      stroke-dasharray=${Pe}
                      style="stroke-dashoffset:${S};opacity:${this._holdProgress>0?1:0}"
                    ></circle>
                  </svg>
                `:p}
            <ha-icon .icon=${_}></ha-icon>
          </button>
        </div>
      </ha-card>
    `}};Z.styles=[k,x`
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
        width: ${Gt}px;
        height: ${Gt}px;
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
    `],d([b({attribute:!1})],Z.prototype,"hass",2),d([h()],Z.prototype,"_config",2),d([h()],Z.prototype,"_optimistic",2),d([h()],Z.prototype,"_holdProgress",2),d([h()],Z.prototype,"_holding",2),Z=d([w("silk-lock-card")],Z);var vn={type:"silk-alarm-card",name:"Silk Alarm",description:"Arm modes and a real keypad."},yn="silk-alarm-card-editor";C(yn,[{name:"entity",required:!0,selector:{entity:{domain:["alarm_control_panel"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function Rr(o){return o==="disarmed"?"var(--success-color, #43a047)":o==="triggered"?"var(--error-color, #db4437)":o==="arming"||o==="pending"?"var(--warning-color, #ffa600)":o.startsWith("armed_")?"#ef6c6c":"var(--primary-color, #4aa8ff)"}var Hr=1,Nr=2,Lr=4,Oe=[{key:"disarm",label:"Disarm",service:"alarm_disarm",activeState:"disarmed"},{key:"home",label:"Home",service:"alarm_arm_home",activeState:"armed_home",feature:Hr},{key:"away",label:"Away",service:"alarm_arm_away",activeState:"armed_away",feature:Nr},{key:"night",label:"Night",service:"alarm_arm_night",activeState:"armed_night",feature:Lr}],Ir=[{k:"1",label:"1"},{k:"2",label:"2"},{k:"3",label:"3"},{k:"4",label:"4"},{k:"5",label:"5"},{k:"6",label:"6"},{k:"7",label:"7"},{k:"8",label:"8"},{k:"9",label:"9"},{k:"clear",label:"Clear",icon:"mdi:close-circle-outline"},{k:"0",label:"0"},{k:"back",label:"Backspace",icon:"mdi:backspace-outline"}],Fr=16,Ur=2e3,J=class extends v{constructor(){super(...arguments);this._pendingMode=null;this._code="";this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-alarm-card",entity:Object.keys(t.states).find(i=>i.startsWith("alarm_control_panel."))}}static async getConfigElement(){return document.createElement(yn)}setConfig(t){if(!t.entity)throw new Error("silk-alarm-card: `entity` is required");this._config=t,this._pendingMode=null,this._code="",this._clearOptimistic()}getCardSize(){return this._pendingMode!==null?4:2}getGridOptions(){return{columns:6,rows:this._pendingMode!==null?4:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_needsCode(t,e){return!(!t.attributes.code_format||e.key!=="disarm"&&t.attributes.code_arm_required===!1)}_send(t,e){let i=this._config,s=this.hass;if(!i||!s)return;let r=s.states[i.entity];if(!r)return;let a={entity_id:i.entity};e&&(a.code=e),s.callService("alarm_control_panel",t.service,a),this._optimistic=t.key==="disarm"?"disarmed":"arming",this._optimisticBase=r.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Ur),this._pendingMode=null,this._code=""}_onCardClick(){this._config&&$(this,this._config.entity)}_swallow(t){t.stopPropagation()}_onModeTap(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!s||g(s))return;let r=t.currentTarget.dataset.mode,a=Oe.find(c=>c.key===r);a&&(this._needsCode(s,a)?(T(this,"selection"),this._pendingMode===a.key?(this._pendingMode=null,this._code=""):(this._pendingMode=a.key,this._code="")):(T(this,"success"),this._send(a)))}_onKeyTap(t){t.stopPropagation();let e=t.currentTarget.dataset.key;e&&(T(this,"selection"),e==="clear"?this._code="":e==="back"?this._code=this._code.slice(0,-1):this._code.length<Fr&&(this._code=this._code+e))}_onEnter(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i||!this._code)return;let s=i.states[e.entity];if(!s||g(s))return;let r=Oe.find(a=>a.key===this._pendingMode);r&&(T(this,"success"),this._send(r,this._code))}_renderKeypad(){let t=this._code.length>0;return l`
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
          ${Ir.map(e=>l`
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
      `;let s=g(i),r=this._optimistic===null?i:{...i,state:this._optimistic},a=r.state,c=P(r),m=Rr(a),u=a==="triggered",f=t.name??i.attributes.friendly_name??t.entity,_=Oe.filter(y=>y.feature===void 0||H(i,y.feature));return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${m}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${c?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${r}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${f}</div>
            <div class="state ${u?"alert":""}">
              ${R(e,r)}
            </div>
          </div>
        </div>
        <div class="modes">
          ${_.map(y=>{let S=a===y.activeState,M=this._pendingMode===y.key;return l`
              <button
                class="chip ${S?"active":""} ${M?"pending":""}"
                data-mode=${y.key}
                .disabled=${s}
                aria-pressed=${S?"true":"false"}
                @click=${this._onModeTap}
              >
                ${y.label}
              </button>
            `})}
        </div>
        ${this._pendingMode!==null?this._renderKeypad():p}
      </ha-card>
    `}};J.styles=[k,x`
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
    `],d([b({attribute:!1})],J.prototype,"hass",2),d([h()],J.prototype,"_config",2),d([h()],J.prototype,"_pendingMode",2),d([h()],J.prototype,"_code",2),d([h()],J.prototype,"_optimistic",2),J=d([w("silk-alarm-card")],J);var xn={type:"silk-vacuum-card",name:"Silk Vacuum",description:"Start, dock, locate \u2014 with battery in sight."},le=4,Dr=16,zr=32,jr=512,de=8192,qr=2e3,Vr=3,wn="silk-vacuum-card-editor";C(wn,[{name:"entity",required:!0,selector:{entity:{domain:["vacuum"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var nt=class extends v{constructor(){super(...arguments);this._optimisticState=null;this._optimisticFan=null}static getStubConfig(t){return{type:"custom:silk-vacuum-card",entity:Object.keys(t.states).find(i=>i.startsWith("vacuum."))}}static async getConfigElement(){return document.createElement(wn)}setConfig(t){if(!t.entity||A(t.entity)!=="vacuum")throw new Error("silk-vacuum-card: define a vacuum `entity` (e.g. vacuum.roborock)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticState=null,this._optimisticFan=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticState=null,this._optimisticFan=null},qr)}_onCardClick(){this._config&&$(this,this._config.entity)}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];e!==void 0&&!g(e)&&(H(e,de)||H(e,le))?this._startPause():$(this,this._config.entity)}_onStartPauseClick(t){t.stopPropagation(),this._startPause()}_startPause(){if(!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||g(t))return;let e=(this._optimisticState??t.state)==="cleaning";H(t,e?le:de)&&(T(this),this._optimisticState=e?"paused":"cleaning",this._armExpiry(),this.hass.callService("vacuum",e?"pause":"start",{entity_id:this._config.entity}))}_onReturnHome(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];!e||g(e)||(T(this),this._optimisticState="returning",this._armExpiry(),this.hass.callService("vacuum","return_to_base",{entity_id:this._config.entity}))}_onLocate(t){t.stopPropagation(),!(!this.hass||!this._config)&&(g(this.hass.states[this._config.entity])||(T(this),this.hass.callService("vacuum","locate",{entity_id:this._config.entity})))}_onFanSpeed(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(g(this.hass.states[this._config.entity])||(T(this),this._optimisticFan=e,this._armExpiry(),this.hass.callService("vacuum","set_fan_speed",{entity_id:this._config.entity,fan_speed:e})))}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=g(t),i=this._optimisticState===null||e?t:{...t,state:this._optimisticState},s=P(i),r=E(i,this._config.color),a=this._config.name??t.attributes.friendly_name??t.entity_id,c=t.attributes.battery_level,m=typeof c=="number"&&Number.isFinite(c),u=i.state==="cleaning",f=H(t,de)||H(t,le),_=!H(t,u?le:de);return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${s?"on":""}"
          .disabled=${e}
          aria-label=${f?u?`Pause ${a}`:`Start ${a}`:`Show details for ${a}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${a}</div>
          <div class="state">
            ${R(this.hass,i)}${m?l`<span class="sep">·</span>${Math.round(c)}%`:p}
          </div>
        </div>
        <div class="trailing">
          ${this._renderChips(t,e)}
          ${f?l`
                <button
                  class="ctl"
                  ?disabled=${e||_}
                  aria-label=${u?`Pause ${a}`:`Start ${a}`}
                  @click=${this._onStartPauseClick}
                >
                  <ha-icon icon=${u?"mdi:pause":"mdi:play"}></ha-icon>
                </button>
              `:p}
          ${H(t,Dr)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Return ${a} to dock`}
                  @click=${this._onReturnHome}
                >
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>
              `:p}
          ${H(t,jr)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Locate ${a}`}
                  @click=${this._onLocate}
                >
                  <ha-icon icon="mdi:map-marker"></ha-icon>
                </button>
              `:p}
        </div>
      </ha-card>
    `}_renderChips(t,e){if(!H(t,zr))return p;let i=t.attributes.fan_speed_list;if(!Array.isArray(i))return p;let s=i.filter(a=>typeof a=="string"&&a!=="").slice(0,Vr);if(s.length===0)return p;let r=this._optimisticFan??(typeof t.attributes.fan_speed=="string"?t.attributes.fan_speed:void 0);return l`
      <div class="chips">
        ${s.map(a=>l`
            <button
              class="chip ${a===r?"active":""}"
              ?disabled=${e}
              aria-label=${`Set fan speed to ${a}`}
              aria-pressed=${a===r?"true":"false"}
              @click=${c=>this._onFanSpeed(c,a)}
            >
              ${a.replace(/_/g," ")}
            </button>
          `)}
      </div>
    `}};nt.styles=[k,x`
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
    `],d([b({attribute:!1})],nt.prototype,"hass",2),d([h()],nt.prototype,"_config",2),d([h()],nt.prototype,"_optimisticState",2),d([h()],nt.prototype,"_optimisticFan",2),nt=d([w("silk-vacuum-card")],nt);var $n={type:"silk-camera-card",name:"Silk Camera",description:"A live view that stays fresh."},kn=10,En="silk-camera-card-editor";C(En,[{name:"entity",required:!0,selector:{entity:{domain:["camera"]}}},{name:"name",selector:{text:{}}},{name:"refresh_interval",selector:{number:{min:1,mode:"box"}}}],{entity:"Entity",name:"Name",refresh_interval:"Refresh interval (seconds)"},{refresh_interval:kn});var st=class extends v{constructor(){super(...arguments);this._counter=0;this._broken=!1;this._onVisibility=()=>{document.hidden?this._stopTimer():(this._bump(),this._startTimer())}}static getStubConfig(t){return{type:"custom:silk-camera-card",entity:Object.keys(t.states).find(i=>i.startsWith("camera."))}}static async getConfigElement(){return document.createElement(En)}setConfig(t){if(!t.entity||A(t.entity)!=="camera")throw new Error("silk-camera-card: define a camera `entity` (e.g. camera.front_door)");if(t.refresh_interval!==void 0&&(typeof t.refresh_interval!="number"||!(t.refresh_interval>0)))throw new Error("silk-camera-card: `refresh_interval` must be a positive number of seconds");this._config=t,this.isConnected&&this._startTimer()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startTimer()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopTimer()}_intervalMs(){return Math.max(1,this._config?.refresh_interval??kn)*1e3}_bump(){this._counter++,this._broken=!1}_startTimer(){this._stopTimer(),!document.hidden&&(this._timer=window.setInterval(()=>this._bump(),this._intervalMs()))}_stopTimer(){window.clearInterval(this._timer),this._timer=void 0}_onCardClick(){this._config&&$(this,this._config.entity)}_onImgError(){this._broken=!0}render(){if(!this.hass||!this._config)return p;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=g(t),i=t.attributes.entity_picture,s=!e&&typeof i=="string"&&i!==""?i:void 0,r=this._config.name??t.attributes.friendly_name??t.entity_id,a=E(t),c=s!==void 0?`${s}${s.includes("?")?"&":"?"}counter=${this._counter}`:void 0,m=c!==void 0&&!this._broken;return l`
      <ha-card
        class=${e?"unavailable":""}
        style="--silk-accent:${a}"
        aria-label=${`Show ${r} live view`}
        @click=${this._onCardClick}
      >
        ${m?l`
              <img class="feed" src=${c} alt=${r} @error=${this._onImgError} />
              <div class="scrim">
                <div class="cam-name">${r}</div>
                <div class="cam-state">${R(this.hass,t)}</div>
              </div>
            `:l`
              <div class="fallback">
                <ha-icon icon="mdi:video-off"></ha-icon>
                <div class="fallback-name">${r}</div>
                <div class="fallback-state">Unavailable</div>
              </div>
            `}
      </ha-card>
    `}};st.styles=[k,x`
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
    `],d([b({attribute:!1})],st.prototype,"hass",2),d([h()],st.prototype,"_config",2),d([h()],st.prototype,"_counter",2),d([h()],st.prototype,"_broken",2),st=d([w("silk-camera-card")],st);var Tn={type:"silk-timer-card",name:"Silk Timer",description:"A countdown you can see moving."},Cn="silk-timer-card-editor",Gr=2e3,Br=1e3;C(Cn,[{name:"entity",required:!0,selector:{entity:{domain:["timer"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function Me(o){if(typeof o!="string")return 0;let n=o.match(/^(?:(\d+)\s+days?,\s*)?(\d+):(\d{1,2}):(\d{1,2})/);return n?Number(n[1]??0)*86400+Number(n[2])*3600+Number(n[3])*60+Number(n[4]):0}function Re(o){let n=Math.max(0,Math.ceil(o)),t=Math.floor(n/3600),e=Math.floor(n%3600/60),i=s=>String(s).padStart(2,"0");return t>0?`${t}:${i(e)}:${i(n%60)}`:`${e}:${i(n%60)}`}var rt=class extends v{constructor(){super(...arguments);this._now=Date.now();this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-timer-card",entity:Object.keys(t.states).find(i=>i.startsWith("timer."))}}static async getConfigElement(){return document.createElement(Cn)}setConfig(t){if(!t.entity)throw new Error("silk-timer-card: `entity` is required");if(A(t.entity)!=="timer")throw new Error(`silk-timer-card: entity must be a timer, got \`${A(t.entity)}\``);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._now=Date.now()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tick),this._tick=void 0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(t.has("hass")&&(this._now=Date.now(),this._optimistic!==null&&this._config)){let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}}updated(){let t=this._config?this.hass?.states[this._config.entity]:void 0,e=this.isConnected&&!!t&&!g(t)&&this._displayState(t)==="active";e&&this._tick===void 0?this._tick=window.setInterval(()=>{this._now=Date.now()},Br):!e&&this._tick!==void 0&&(window.clearInterval(this._tick),this._tick=void 0)}_displayState(t){if(this._optimistic)return this._optimistic.state;let e=t.state;return e==="active"||e==="paused"?e:"idle"}_remainingSeconds(t,e,i){if(e==="active"){let s=this._optimistic?.finishesAt??Date.parse(t.attributes.finishes_at??"");return Number.isFinite(s)?Math.max(0,(s-this._now)/1e3):0}return e==="paused"?this._optimistic?.remainingS??Me(t.attributes.remaining):i}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_setOptimistic(t,e){this._optimistic=e,this._optimisticBase=t.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Gr)}_service(t){let e=this._config,i=this.hass;if(!e||!i)return;let s=i.states[e.entity];if(!s||g(s))return;T(this);let r=this._displayState(s),a=Me(s.attributes.duration);if(t==="start"){let c=r==="paused"?this._remainingSeconds(s,r,a):a;this._setOptimistic(s,{state:"active",finishesAt:Date.now()+c*1e3})}else t==="pause"?this._setOptimistic(s,{state:"paused",remainingS:this._remainingSeconds(s,r,a)}):this._setOptimistic(s,{state:"idle"});i.callService("timer",t,{entity_id:e.entity})}_onStart(t){t.stopPropagation(),this._service("start")}_onPause(t){t.stopPropagation(),this._service("pause")}_onCancel(t){t.stopPropagation(),this._service("cancel")}_onPrimary(t){t.stopPropagation();let e=this._config?this.hass?.states[this._config.entity]:void 0;!e||g(e)||this._service(this._displayState(e)==="active"?"pause":"start")}_onCardClick(){this._config&&$(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=this._displayState(i),a=r==="active",c=Me(i.attributes.duration),m=this._remainingSeconds(i,r,c),u=r==="idle"||c<=0?0:O(1-m/c,0,1),f=E(i,t.color),_=t.name??i.attributes.friendly_name??t.entity,y=s?l`${R(e,i)}`:a?l`${Re(m)} left`:r==="paused"?l`Paused<span class="sep">·</span>${Re(m)}`:c>0?l`Idle<span class="sep">·</span>${Re(c)}`:l`Idle`,S=s||r==="idle"?l`
            <button
              class="btn primary"
              .disabled=${s}
              aria-label=${`Start ${_}`}
              @click=${this._onStart}
            >
              <ha-icon .icon=${"mdi:play"}></ha-icon>
            </button>
          `:l`
            <button
              class="btn primary"
              aria-label=${a?`Pause ${_}`:`Resume ${_}`}
              @click=${a?this._onPause:this._onStart}
            >
              <ha-icon .icon=${a?"mdi:pause":"mdi:play"}></ha-icon>
            </button>
            <button class="btn" aria-label=${`Cancel ${_}`} @click=${this._onCancel}>
              <ha-icon .icon=${"mdi:close"}></ha-icon>
            </button>
          `;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${f}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${a?"on":""}"
          .disabled=${s}
          aria-label=${a?`Pause ${_}`:`Start ${_}`}
          @click=${this._onPrimary}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${_}</div>
          <div class="state">${y}</div>
        </div>
        <div class="trailing">${S}</div>
        <div class="track ${s||r==="idle"?"hidden":""}" aria-hidden="true">
          <div
            class="bar ${r==="idle"?"snap":""}"
            style="width:${(u*100).toFixed(2)}%"
          ></div>
        </div>
      </ha-card>
    `}};rt.styles=[k,x`
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
    `],d([b({attribute:!1})],rt.prototype,"hass",2),d([h()],rt.prototype,"_config",2),d([h()],rt.prototype,"_now",2),d([h()],rt.prototype,"_optimistic",2),rt=d([w("silk-timer-card")],rt);var Sn={type:"silk-progress-card",name:"Silk Progress",description:"Any percentage, with an honest ETA."},Pn="silk-progress-card-editor";C(Pn,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"remaining",selector:{entity:{domain:["sensor"]}}}],{entity:"Entity",name:"Name",icon:"Icon",remaining:"Time-remaining entity"});var Wr=new Set(["h","hr","hrs","hour","hours"]),Kr=new Set(["min","mins","minute","minutes"]),Yr=new Set(["s","sec","secs","second","seconds"]);function An(o){let n=Math.max(0,o),t=Math.floor(n/60),e=n%60;return t>0?`${t}h ${e}m left`:`${e}m left`}function Xr(o,n){let t=n.trim().toLowerCase();if(Wr.has(t))return An(Math.round(o*60));if(Kr.has(t))return An(Math.round(o));if(Yr.has(t)){let i=Math.max(0,Math.round(o));return`${Math.floor(i/60)}:${String(i%60).padStart(2,"0")} left`}let e=Math.round(o*10)/10;return n?`${e} ${n} left`:`${e} left`}var Tt=class extends v{static getStubConfig(n){return{type:"custom:silk-progress-card",entity:Object.keys(n.states).find(e=>{if(!e.startsWith("sensor."))return!1;let i=n.states[e];return i.attributes.unit_of_measurement==="%"&&i.attributes.device_class!=="battery"&&Number.isFinite(Number(i.state))})}}static async getConfigElement(){return document.createElement(Pn)}setConfig(n){if(!n.entity)throw new Error("silk-progress-card: `entity` is required");this._config=n}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}_remainingText(){let n=this._config?.remaining;if(!n||!this.hass)return;let t=this.hass.states[n];if(!t||g(t))return;let e=Number(t.state);if(!(t.state===""||!Number.isFinite(e)))return Xr(e,String(t.attributes.unit_of_measurement??""))}_onTap(){this._config&&(T(this),$(this,this._config.entity))}render(){let n=this._config,t=this.hass;if(!n||!t)return p;let e=t.states[n.entity];if(!e)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${n.entity}</div>
        </ha-card>
      `;let i=g(e),s=Number(e.state),r=!i&&e.state!==""&&Number.isFinite(s),a=r?O(s,0,100):0,c=r&&s>=100,m=c?"var(--success-color, #43a047)":E(e,n.color),u=n.name??e.attributes.friendly_name??n.entity,f=!i&&!c?this._remainingText():void 0,_=i?l`${R(t,e)}`:r?c?l`Done`:f?l`In progress<span class="sep">·</span>${f}`:l`In progress`:l`—`;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${m}"
        @click=${this._onTap}
      >
        <div class="icon ${!i&&P(e)?"on":""}">
          ${n.icon?l`<ha-icon .icon=${n.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${u}</div>
          <div class="state">${_}</div>
        </div>
        <div class="trailing">
          <span class="value">${r?`${Math.round(a)}%`:"\u2014"}</span>
        </div>
        <div class="track" aria-hidden="true">
          <div class="bar" style="width:${a.toFixed(2)}%"></div>
        </div>
      </ha-card>
    `}};Tt.styles=[k,x`
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
    `],d([b({attribute:!1})],Tt.prototype,"hass",2),d([h()],Tt.prototype,"_config",2),Tt=d([w("silk-progress-card")],Tt);var On={type:"silk-update-card",name:"Silk Updates",description:"Every pending update in one place."},Mn="silk-update-card-editor";C(Mn,[{name:"name",selector:{text:{}}},{name:"entities",selector:{entity:{multiple:!0,domain:["update"]}}},{name:"show_up_to_date",selector:{boolean:{}}}],{name:"Name",entities:"Entities (empty = every update)",show_up_to_date:"Show up-to-date items"},{show_up_to_date:!1});var Zr=2e3;function He(o){return o.attributes.title??o.attributes.friendly_name??o.entity_id}var gt=class extends v{constructor(){super(...arguments);this._installing={};this._installingTimers={}}static getStubConfig(){return{type:"custom:silk-update-card"}}static async getConfigElement(){return document.createElement(Mn)}setConfig(t){if(t.entities!==void 0&&!Array.isArray(t.entities))throw new Error("silk-update-card: `entities` must be a list of update entity ids");this._config=t,this._clearAllInstalling()}getCardSize(){return!this.hass||!this._config?3:(this._visible().length||1)+1}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._installingTimers))window.clearTimeout(this._installingTimers[t]);this._installingTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._installing)){let i=this.hass.states[e];i&&i.last_updated!==this._installing[e]&&this._clearInstalling(e)}}_clearInstalling(t){if(window.clearTimeout(this._installingTimers[t]),delete this._installingTimers[t],t in this._installing){let e={...this._installing};delete e[t],this._installing=e}}_clearAllInstalling(){for(let t of Object.keys(this._installingTimers))window.clearTimeout(this._installingTimers[t]);this._installingTimers={},this._installing={}}_tracked(){let t=this.hass,e=this._config?.entities,i=e??Object.keys(t.states).filter(r=>r.startsWith("update.")),s=[];for(let r of i){let a=t.states[r];a&&s.push(a)}return e||s.sort((r,a)=>He(r).localeCompare(He(a))),s.sort((r,a)=>+(a.state==="on")-+(r.state==="on")),s}_visible(){let t=this._tracked();return this._config?.show_up_to_date?t:t.filter(e=>e.state==="on")}_onRowClick(t){$(this,t)}_onRowKeydown(t,e){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),$(this,e))}_onInstall(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let s=i.states[e];!s||g(s)||s.attributes.in_progress||(T(this),this._installing={...this._installing,[e]:s.last_updated},window.clearTimeout(this._installingTimers[e]),this._installingTimers[e]=window.setTimeout(()=>this._clearInstalling(e),Zr),i.callService("update","install",{entity_id:e}))}_renderTrailing(t,e){let i=g(t);return!i&&(!!t.attributes.in_progress||t.entity_id in this._installing)?l`
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
    `}_renderRow(t){let e=g(t),i=t.state==="on",s=He(t),r=t.attributes.installed_version,a=t.attributes.latest_version,c=i?`${r??"\u2014"} \u2192 ${a??"\u2014"}`:r??a??"",m=t.attributes.entity_picture;return l`
      <div
        class="row ${e?"unavailable":""}"
        role="button"
        tabindex="0"
        @click=${()=>this._onRowClick(t.entity_id)}
        @keydown=${u=>this._onRowKeydown(u,t.entity_id)}
      >
        ${m?l`<img class="pic" src=${m} alt="" />`:l`
              <div class="pic fallback"><ha-icon icon="mdi:package-up"></ha-icon></div>
            `}
        <div class="info">
          <div class="name">${s}</div>
          ${c?l`<div class="state">${c}</div>`:p}
        </div>
        ${this._renderTrailing(t,s)}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=this._tracked(),s=i.filter(m=>m.state==="on").length,r=t.show_up_to_date?i:i.filter(m=>m.state==="on"),a=E(i[0]),c=t.name??"Updates";return l`
      <ha-card class="control" style="--silk-accent:${a}">
        <div class="header">
          <div class="hname">${c}</div>
          ${s>0?l`<span class="badge">${s}</span>`:p}
        </div>
        ${r.length?l`<div class="rows">${r.map(m=>this._renderRow(m))}</div>`:l`
              <div class="empty">
                <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                <span>All up to date</span>
              </div>
            `}
      </ha-card>
    `}};gt.styles=[k,x`
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
    `],d([b({attribute:!1})],gt.prototype,"hass",2),d([h()],gt.prototype,"_config",2),d([h()],gt.prototype,"_installing",2),gt=d([w("silk-update-card")],gt);var Hn={type:"silk-battery-card",name:"Silk Batteries",description:"The dying ones float to the top."},Nn="silk-battery-card-editor";C(Nn,[{name:"name",selector:{text:{}}},{name:"entities",selector:{entity:{multiple:!0,domain:["sensor"],device_class:["battery"]}}},{name:"limit",selector:{number:{min:1,max:30,mode:"box"}}}],{name:"Name",entities:"Entities (empty = every battery sensor)",limit:"Rows to show"},{limit:6});var Rn=6,Ln=20,Jr=50;function Ne(o){let n=o.attributes.friendly_name??o.entity_id;return n.replace(/\s+battery(\s+level)?\s*$/i,"")||n}function Qr(o){return o<Ln?"crit":o<Jr?"warn":"good"}var Ct=class extends v{static getStubConfig(){return{type:"custom:silk-battery-card"}}static async getConfigElement(){return document.createElement(Nn)}setConfig(n){if(n.entities!==void 0&&!Array.isArray(n.entities))throw new Error("silk-battery-card: `entities` must be a list of sensor entity ids");if(n.limit!==void 0&&(!Number.isFinite(n.limit)||n.limit<1))throw new Error("silk-battery-card: `limit` must be a number of at least 1");this._config=n}getCardSize(){let n=this._config?.limit??Rn;return 2+Math.ceil(Math.min(n,12)/2)}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}_limit(){return Math.max(1,Math.floor(this._config?.limit??Rn))}_rows(){let n=this.hass,t=this._config?.entities??Object.keys(n.states).filter(i=>{if(!i.startsWith("sensor."))return!1;let s=n.states[i];return s.attributes.device_class==="battery"&&s.state!==""&&Number.isFinite(Number(s.state))}),e=[];for(let i of t){let s=n.states[i];if(!s)continue;let r=Number(s.state),a=!g(s)&&s.state!==""&&Number.isFinite(r)?O(r,0,100):void 0;e.push({stateObj:s,level:a})}return e.sort((i,s)=>i.level===void 0&&s.level===void 0?0:i.level===void 0?1:s.level===void 0?-1:i.level-s.level||Ne(i.stateObj).localeCompare(Ne(s.stateObj))),e.slice(0,this._limit())}_onRowClick(n){$(this,n)}_renderRow(n){let t=Ne(n.stateObj),e=n.level,i=e===void 0?void 0:Qr(e);return l`
      <button
        class="row ${e===void 0?"unavailable":""}"
        aria-label=${e===void 0?t:`${t}: ${Math.round(e)}%`}
        @click=${()=>this._onRowClick(n.stateObj.entity_id)}
      >
        <span class="bname">${t}</span>
        <span class="bar">
          ${e===void 0?p:l`<span class="fill ${i}" style="width:${e}%"></span>`}
        </span>
        <span class="pct ${i==="crit"?"low":""}">
          ${e===void 0?"\u2014":`${Math.round(e)}%`}
        </span>
      </button>
    `}render(){let n=this._config,t=this.hass;if(!n||!t)return p;let e=this._rows(),i=e.length?e[0].level:void 0,s=n.name??"Batteries";return l`
      <ha-card class="control" style="--silk-accent:${E(void 0)}">
        <div class="header">
          <div class="hname">${s}</div>
          ${i!==void 0&&i<Ln?l`<span class="badge">${Math.round(i)}%</span>`:p}
        </div>
        ${e.length?l`<div class="rows">${e.map(r=>this._renderRow(r))}</div>`:l`<div class="empty">No battery sensors found</div>`}
      </ha-card>
    `}};Ct.styles=[k,x`
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
    `],d([b({attribute:!1})],Ct.prototype,"hass",2),d([h()],Ct.prototype,"_config",2),Ct=d([w("silk-battery-card")],Ct);var In={type:"silk-status-card",name:"Silk Status",description:"A status-page timeline for any entity."},Le=16,to=6,Ie=24,eo=3e5,io=6e4,no=new Set(["unavailable","unknown","none",""]),Fn="silk-status-card-editor";C(Fn,[{name:"entity",required:!0,selector:{entity:{}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]},{name:"invert",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",hours_to_show:"Hours to show",invert:"Invert (off = good)"},{hours_to_show:Ie});var ot=class extends v{constructor(){super(...arguments);this._segments=null;this._uptime=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){return{type:"custom:silk-status-card",entity:Object.keys(t.states).find(i=>i.startsWith("binary_sensor."))}}static async getConfigElement(){return document.createElement(Fn)}setConfig(t){if(!t.entity)throw new Error("silk-status-card: `entity` is required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-status-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._segments=null,this._uptime=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),eo)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,io-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??Ie,i=++this._fetchSeq,s=Date.now()/1e3,r=s-e*3600,a;try{a=await this.hass.callWS({type:"history/history_during_period",start_time:new Date(r*1e3).toISOString(),end_time:new Date(s*1e3).toISOString(),entity_ids:[t],minimal_response:!0,no_attributes:!0,significant_changes_only:!1})}catch(m){console.warn("silk-status-card: history fetch failed",m);return}if(i!==this._fetchSeq)return;this._lastFetch=Date.now();let c=(a?.[t]??[]).map(m=>{let u=m.lu??m.last_updated??m.lc??m.last_changed??NaN;return[typeof u=="number"?u:Date.parse(u)/1e3,String(m.s??m.state??"")]}).filter(m=>Number.isFinite(m[0])&&m[0]<=s).sort((m,u)=>m[0]-u[0]);this._buildSegments(c,r,s)}_classify(t){if(no.has(t.toLowerCase()))return"none";let e={entity_id:this._config.entity,state:t,attributes:{},last_changed:"",last_updated:""},i=P(e);return(this._config?.invert?!i:i)?"good":"bad"}_buildSegments(t,e,i){let s=i-e,r=[],a=0,c=0;for(let u=0;u<t.length;u++){let f=Math.max(t[u][0],e),_=u+1<t.length?Math.min(Math.max(t[u+1][0],e),i):i;if(_<=f)continue;let y=this._classify(t[u][1]),S=_-f;y==="good"?a+=S:y==="bad"&&(c+=S);let M=r[r.length-1];M&&M.kind===y?M.w+=S/s*100:r.push({x:(f-e)/s*100,w:S/s*100,kind:y})}this._segments=r;let m=a+c;this._uptime=m>0?a/m*100:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_agoLabel(){let t=this._config?.hours_to_show??Ie;return t>=48&&t%24===0?`${t/24}d ago`:`${t}h ago`}_onCardClick(){this._config&&$(this,this._config.entity)}render(){let t=this._config;if(!t)return p;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let s=g(i),r=E(i,t.color),a=t.name??i?.attributes.friendly_name??t.entity,c=this._uptime===null?"\u2014":`${new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(this._uptime)}%`;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!s&&P(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${a}</div>
            <div class="state">${i?R(e,i):""}</div>
          </div>
          <div class="trailing">
            <span class="pct">${c}</span>
          </div>
        </div>
        <div class="bar">
          <svg class="timeline" height=${Le} aria-hidden="true">
            ${this._segments?D`<g class="segs">
                  ${this._segments.filter(m=>m.kind!=="none"&&m.w>0).map(m=>D`<rect class=${m.kind} x="${m.x}%" y="0" width="${m.w}%" height=${Le}></rect>`)}
                </g>`:p}
          </svg>
          <div class="ends">
            <span>${this._agoLabel()}</span>
            <span>now</span>
          </div>
        </div>
      </ha-card>
    `}};ot.styles=[k,x`
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
        height: ${Le}px;
        border-radius: ${to}px;
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
    `],d([b({attribute:!1})],ot.prototype,"hass",2),d([h()],ot.prototype,"_config",2),d([h()],ot.prototype,"_segments",2),d([h()],ot.prototype,"_uptime",2),ot=d([w("silk-status-card")],ot);var Un={type:"silk-chips-card",name:"Silk Chips",description:"A dense strip of glanceable pills."};function so(o){let n=o.trim();return n.startsWith("\xB0")?"\xB0":n}var At=class extends v{constructor(){super(...arguments);this._chips=[]}static getStubConfig(t){return{type:"custom:silk-chips-card",chips:Object.keys(t.states).filter(i=>i.startsWith("sensor.")).slice(0,3)}}setConfig(t){if(!Array.isArray(t.chips)||t.chips.length===0)throw new Error("silk-chips-card: `chips` must be a non-empty list");this._chips=t.chips.map((e,i)=>{let s=typeof e=="string"?{entity:e}:{...e};if(!s.entity||typeof s.entity!="string")throw new Error(`silk-chips-card: chips[${i}] needs an \`entity\``);return s}),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}_onChipClick(t,e){t.stopPropagation(),T(this),$(this,e)}_valueText(t){let e=t.state,i=Number(e);if(e!==""&&Number.isFinite(i)){let s=t.attributes.unit_of_measurement,r=I(this.hass,t.entity_id,i);return s?`${r}${so(String(s))}`:r}return R(this.hass,t)}_renderChip(t){let e=this.hass,i=e?.states[t.entity];if(!i)return l`
        <button
          class="pill unavailable"
          aria-label=${t.entity}
          @click=${u=>this._onChipClick(u,t.entity)}
        >
          <ha-icon .icon=${t.icon??"mdi:help-circle-outline"}></ha-icon>
          <span class="label"><span class="val">${t.name??t.entity}</span></span>
        </button>
      `;let s=g(i),r=!s&&P(i),a=E(i,t.color),c=s?R(e,i):this._valueText(i),m=t.name??i.attributes.friendly_name??t.entity;return l`
      <button
        class="pill ${r?"active":""} ${s?"unavailable":""}"
        style="--silk-accent:${a}"
        aria-label=${`${m}: ${c}`}
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
    `}};At.styles=[k,x`
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
    `],d([b({attribute:!1})],At.prototype,"hass",2),d([h()],At.prototype,"_config",2),At=d([w("silk-chips-card")],At);var Dn={type:"silk-bar-card",name:"Silk Bar",description:"A linear gauge with a target you can see."},zn="silk-bar-card-editor";C(zn,[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}},{name:"target",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum",target:"Target"},{min:0,max:100});var _t=class extends v{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(s=>s.startsWith("sensor.")&&Number.isFinite(Number(t.states[s].state))),i=s=>e.find(r=>t.states[r].attributes.device_class===s);return{type:"custom:silk-bar-card",entity:i("battery")??i("power")??e[0]}}static async getConfigElement(){return document.createElement(zn)}setConfig(t){if(!t.entity)throw new Error("silk-bar-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-bar-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_formatBound(t){let e=this.hass?.locale?.language??this.hass?.language??"en";return new Intl.NumberFormat(e,{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&$(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=Number(i.state),a=!s&&i.state!==""&&Number.isFinite(r),c=t.min??0,m=t.max??100,u=m-c,f=a&&u>0?O((r-c)/u,0,1):0,_=(this._drawn?f:0)*100,y=typeof t.target=="number"&&Number.isFinite(t.target)&&u>0?O((t.target-c)/u,0,1)*100:void 0,S=(a?this._segmentColor(r):void 0)??E(i,t.color),M=t.unit??i.attributes.unit_of_measurement??"",N=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${S}"
        @click=${this._onCardClick}
      >
        <div class="icon">
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${N}>${N}</div>
          <div class="track">
            <div class="fill" style="width:${_}%"></div>
            ${y!==void 0?l`<div class="notch" style="left:${y}%"></div>`:p}
          </div>
          <div class="bounds">
            <span>${this._formatBound(c)}</span>
            <span>${this._formatBound(m)}</span>
          </div>
        </div>
        <div class="trailing">
          <span class="value">${a?I(e,t.entity,r):"\u2014"}</span>
          ${M?l`<span class="unit">${M}</span>`:p}
        </div>
      </ha-card>
    `}};_t.styles=[k,x`
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
    `],d([b({attribute:!1})],_t.prototype,"hass",2),d([h()],_t.prototype,"_config",2),d([h()],_t.prototype,"_drawn",2),_t=d([w("silk-bar-card")],_t);var qn={type:"silk-ring-card",name:"Silk Ring",description:"A full-circle gauge built for grids."},Vn="silk-ring-card-editor";C(Vn,[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var Ue=48,Ht=Ue/2,jn=21,Fe=100,bt=class extends v{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(s=>s.startsWith("sensor.")&&Number.isFinite(Number(t.states[s].state)));return{type:"custom:silk-ring-card",entity:e.find(s=>t.states[s].attributes.device_class==="battery")??e[0]}}static async getConfigElement(){return document.createElement(Vn)}setConfig(t){if(!t.entity)throw new Error("silk-ring-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-ring-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:2,rows:2,min_columns:2,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_onCardClick(){this._config&&$(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let s=g(i),r=Number(i.state),a=!s&&i.state!==""&&Number.isFinite(r),c=t.min??0,u=(t.max??100)-c,f=a&&u>0?O((r-c)/u,0,1):0,_=this._drawn?f:0,y=Fe*(1-_),S=(a?this._segmentColor(r):void 0)??E(i),M=t.unit??i.attributes.unit_of_measurement??"",N=t.name??i.attributes.friendly_name??t.entity,q=t.display==="icon";return l`
      <ha-card
        class=${s?"unavailable":""}
        style="--silk-accent:${S}"
        @click=${this._onCardClick}
      >
        <div class="ring">
          <svg viewBox="0 0 ${Ue} ${Ue}" aria-hidden="true">
            <circle class="ring-bg" cx=${Ht} cy=${Ht} r=${jn}></circle>
            <circle
              class="ring-value"
              cx=${Ht}
              cy=${Ht}
              r=${jn}
              pathLength=${Fe}
              stroke-dasharray=${Fe}
              transform="rotate(-90 ${Ht} ${Ht})"
              style="stroke-dashoffset:${y};opacity:${_>0?1:0}"
            ></circle>
          </svg>
          <div class="center">
            ${q?l`
                  <ha-state-icon
                    class="cicon ${a&&r>0?"lit":""}"
                    .hass=${e}
                    .stateObj=${i}
                  ></ha-state-icon>
                `:l`
                  <div>
                    <div class="value">
                      ${a?I(e,t.entity,r):"\u2014"}
                    </div>
                    ${M?l`<div class="unit">${M}</div>`:p}
                  </div>
                `}
          </div>
        </div>
        <div class="name" title=${N}>${N}</div>
      </ha-card>
    `}};bt.styles=[k,x`
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
    `],d([b({attribute:!1})],bt.prototype,"hass",2),d([h()],bt.prototype,"_config",2),d([h()],bt.prototype,"_drawn",2),bt=d([w("silk-ring-card")],bt);var Gn={type:"silk-energy-card",name:"Silk Energy",description:"Today versus yesterday, honestly compared."},Bn="silk-energy-card-editor";C(Bn,[{name:"name",required:!0,selector:{text:{}}},{name:"power",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"today",required:!0,selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"yesterday",selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"month",selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"icon",selector:{icon:{}}}],{name:"Name",power:"Live power (W)",today:"Today (kWh)",yesterday:"Yesterday (kWh)",month:"This month (kWh)",icon:"Icon"});function me(o){return!o||g(o)||o.state===""?NaN:Number(o.state)}var vt=class extends v{constructor(){super(...arguments);this._drawn=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")&&t.states[r].attributes.device_class==="energy"),i=e[0];return{type:"custom:silk-energy-card",name:i?t.states[i].attributes.friendly_name??"Energy":"Energy",today:i,yesterday:e[1]}}static async getConfigElement(){return document.createElement(Bn)}setConfig(t){if(!t.name)throw new Error("silk-energy-card: `name` is required");if(!t.today)throw new Error("silk-energy-card: `today` (an energy sensor) is required");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_onCardClick(){this._config&&$(this,this._config.today)}_barRow(t,e,i,s){return l`
      <span class="bar-label">${t}</span>
      <div class="bar-track">
        <div class="bar-fill ${e}" style="width:${this._drawn?i:0}%"></div>
      </div>
      <span class="bar-value">${s}</span>
    `}_energyText(t,e,i){if(!Number.isFinite(e))return"\u2014";let s=i?.attributes.unit_of_measurement??"kWh";return`${I(this.hass,t,e)} ${s}`}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.today];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.today}</div>
        </ha-card>
      `;let s=g(i),r=E(i,t.color),a=t.icon??"mdi:power-plug",c=t.yesterday?e.states[t.yesterday]:void 0,m=t.month?e.states[t.month]:void 0,u=t.power?e.states[t.power]:void 0,f=me(i),_=me(c),y=me(m),S=me(u),M=Math.max(Number.isFinite(f)?f:0,Number.isFinite(_)?_:0),N=ze=>Number.isFinite(ze)&&M>0?Math.min(ze/M*100,100):0,q=Number.isFinite(f)&&Number.isFinite(_)&&_>0,V=q?Math.round((f-_)/_*100):0,Xn=V<0?"down":V>0?"up":"",Zn=V<0?`\u2212${Math.abs(V)}%`:V>0?`+${V}%`:"0%",Jn=Number.isFinite(S)&&S>0;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${Jn?"on":""}">
            <ha-icon .icon=${a}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${t.name}</div>
            ${m?l`<div class="state">This month ${this._energyText(t.month,y,m)}</div>`:p}
          </div>
          ${u?l`
                <div class="trailing">
                  <span class="value">${I(e,t.power,S)}</span>
                  <span class="unit"
                    >${u.attributes.unit_of_measurement??"W"}</span
                  >
                </div>
              `:p}
        </div>
        <div class="bars">
          ${this._barRow("Today","today",N(f),this._energyText(t.today,f,i))}
          ${c?this._barRow("Yesterday","yesterday",N(_),this._energyText(t.yesterday,_,c)):p}
        </div>
        ${q?l`
              <div class="delta">
                vs yesterday <span class="pct ${Xn}">${Zn}</span>
              </div>
            `:p}
      </ha-card>
    `}};vt.styles=[k,x`
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
    `],d([b({attribute:!1})],vt.prototype,"hass",2),d([h()],vt.prototype,"_config",2),d([h()],vt.prototype,"_drawn",2),vt=d([w("silk-energy-card")],vt);var Wn={type:"silk-todo-card",name:"Silk To-do",description:"Check things off without leaving the dashboard."},De=5,Kn="silk-todo-card-editor";C(Kn,[{name:"entity",required:!0,selector:{entity:{domain:["todo"]}}},{name:"name",selector:{text:{}}},{name:"limit",selector:{number:{min:1,max:15,mode:"box"}}}],{entity:"Entity",name:"Name",limit:"Items shown"},{limit:De});var yt=class extends v{constructor(){super(...arguments);this._fetchedFor="";this._fetchEpoch=0}static getStubConfig(t){return{type:"custom:silk-todo-card",entity:Object.keys(t.states).find(i=>i.startsWith("todo."))}}static async getConfigElement(){return document.createElement(Kn)}setConfig(t){if(!t.entity||A(t.entity)!=="todo")throw new Error("silk-todo-card: `entity` must be a todo entity");this._config=t,this._items=void 0,this._fetchedFor=""}getCardSize(){let t=this._config?.limit??De;return Math.max(2,Math.ceil((t+2)/2))}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._fetchedFor="",this.hass&&this._config&&this._fetchItems()}willUpdate(t){if(!t.has("hass")&&!t.has("_config"))return;let e=this.hass?.states[this._config?.entity??""];e&&!g(e)&&e.last_updated!==this._fetchedFor&&this._fetchItems()}async _fetchItems(){let t=this.hass,e=this._config;if(!t||!e)return;let i=t.states[e.entity];if(!i||g(i))return;this._fetchedFor=i.last_updated;let s=++this._fetchEpoch;try{let r=await t.callWS({type:"todo/item/list",entity_id:e.entity});if(s!==this._fetchEpoch)return;let a=r.items??[];this._items=[...a.filter(c=>c.status!=="completed"),...a.filter(c=>c.status==="completed")]}catch{s===this._fetchEpoch&&(this._fetchedFor="")}}_onCardClick(){this._config&&$(this,this._config.entity)}_onItemClick(t,e){t.stopPropagation();let i=this.hass,s=this._config;if(!i||!s||!this._items||g(i.states[s.entity]))return;let r=e.status==="completed"?"needs_action":"completed";T(this),this._items=this._items.map(a=>a.uid===e.uid?{...a,status:r}:a),i.callService("todo","update_item",{entity_id:s.entity,item:e.uid,status:r}).catch(()=>{this._items=this._items?.map(a=>a.uid===e.uid?{...a,status:e.status}:a)})}render(){let t=this._config,e=this.hass;if(!t||!e)return p;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let s=g(i),r=E(i),a=t.name??i.attributes.friendly_name??t.entity,c=Math.max(1,t.limit??De),m=this._items,u=m?.slice(0,c)??[],f=m?m.length-u.length:0,_=Number(i.state),y=m?m.filter(S=>S.status!=="completed").length:Number.isFinite(_)?_:0;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="header">
          <div class="icon ${y>0?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${a}</div>
          </div>
          ${y>0?l`<div class="trailing"><span class="count">${y}</span></div>`:p}
        </div>
        <div class="list">
          ${u.map(S=>{let M=S.status==="completed";return l`
              <button
                class="row ${M?"done":""}"
                role="checkbox"
                aria-checked=${M?"true":"false"}
                title=${S.summary}
                .disabled=${s}
                @click=${N=>this._onItemClick(N,S)}
              >
                <span class="check">
                  ${M?l`<ha-icon icon="mdi:check"></ha-icon>`:p}
                </span>
                <span class="summary">${S.summary}</span>
              </button>
            `})}
          ${m&&m.length===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  <span>Nothing to do</span>
                </div>
              `:p}
          ${f>0?l`<div class="more">+${f} more</div>`:p}
        </div>
      </ha-card>
    `}};yt.styles=[k,x`
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
    `],d([b({attribute:!1})],yt.prototype,"hass",2),d([h()],yt.prototype,"_config",2),d([h()],yt.prototype,"_items",2),yt=d([w("silk-todo-card")],yt);var ro="0.3.0",Yn=[_i,vi,xi,$i,Ci,Li,Ii,Ui,Di,ji,Gi,Wi,Zi,sn,an,pn,hn,_n,vn,xn,$n,Tn,Sn,On,Hn,In,Un,Dn,qn,Gn,Wn];window.customCards=window.customCards||[];for(let o of Yn)window.customCards.push({...o,preview:!0,documentationURL:"https://github.com/LeeHueeng/silk-card"});console.info(`%c SILK %c v${ro} \xB7 ${Yn.length} cards `,"background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0 2px 4px;font-weight:700","background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px 2px 0");
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

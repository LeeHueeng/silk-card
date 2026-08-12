var ti=Object.defineProperty;var ei=Object.getOwnPropertyDescriptor;var h=(r,i,t,e)=>{for(var s=e>1?void 0:e?ei(i,t):i,n=r.length-1,o;n>=0;n--)(o=r[n])&&(s=(e?o(i,t,s):o(s))||s);return e&&s&&ti(i,t,s),s};var vt=globalThis,bt=vt.ShadowRoot&&(vt.ShadyCSS===void 0||vt.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Rt=Symbol(),Kt=new WeakMap,ct=class{constructor(i,t,e){if(this._$cssResult$=!0,e!==Rt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=i,this.t=t}get styleSheet(){let i=this.o,t=this.t;if(bt&&i===void 0){let e=t!==void 0&&t.length===1;e&&(i=Kt.get(t)),i===void 0&&((this.o=i=new CSSStyleSheet).replaceSync(this.cssText),e&&Kt.set(t,i))}return i}toString(){return this.cssText}},Xt=r=>new ct(typeof r=="string"?r:r+"",void 0,Rt),w=(r,...i)=>{let t=r.length===1?r[0]:i.reduce((e,s,n)=>e+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+r[n+1],r[0]);return new ct(t,r,Rt)},Jt=(r,i)=>{if(bt)r.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of i){let e=document.createElement("style"),s=vt.litNonce;s!==void 0&&e.setAttribute("nonce",s),e.textContent=t.cssText,r.appendChild(e)}},Ht=bt?r=>r:r=>r instanceof CSSStyleSheet?(i=>{let t="";for(let e of i.cssRules)t+=e.cssText;return Xt(t)})(r):r;var{is:ii,defineProperty:si,getOwnPropertyDescriptor:ni,getOwnPropertyNames:ri,getOwnPropertySymbols:oi,getPrototypeOf:ai}=Object,yt=globalThis,Qt=yt.trustedTypes,ci=Qt?Qt.emptyScript:"",li=yt.reactiveElementPolyfillSupport,lt=(r,i)=>r,dt={toAttribute(r,i){switch(i){case Boolean:r=r?ci:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,i){let t=r;switch(i){case Boolean:t=r!==null;break;case Number:t=r===null?null:Number(r);break;case Object:case Array:try{t=JSON.parse(r)}catch{t=null}}return t}},wt=(r,i)=>!ii(r,i),Zt={attribute:!0,type:String,converter:dt,reflect:!1,useDefault:!1,hasChanged:wt};Symbol.metadata??=Symbol("metadata"),yt.litPropertyMetadata??=new WeakMap;var q=class extends HTMLElement{static addInitializer(i){this._$Ei(),(this.l??=[]).push(i)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(i,t=Zt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(i)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(i,t),!t.noAccessor){let e=Symbol(),s=this.getPropertyDescriptor(i,e,t);s!==void 0&&si(this.prototype,i,s)}}static getPropertyDescriptor(i,t,e){let{get:s,set:n}=ni(this.prototype,i)??{get(){return this[t]},set(o){this[t]=o}};return{get:s,set(o){let c=s?.call(this);n?.call(this,o),this.requestUpdate(i,c,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(i){return this.elementProperties.get(i)??Zt}static _$Ei(){if(this.hasOwnProperty(lt("elementProperties")))return;let i=ai(this);i.finalize(),i.l!==void 0&&(this.l=[...i.l]),this.elementProperties=new Map(i.elementProperties)}static finalize(){if(this.hasOwnProperty(lt("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(lt("properties"))){let t=this.properties,e=[...ri(t),...oi(t)];for(let s of e)this.createProperty(s,t[s])}let i=this[Symbol.metadata];if(i!==null){let t=litPropertyMetadata.get(i);if(t!==void 0)for(let[e,s]of t)this.elementProperties.set(e,s)}this._$Eh=new Map;for(let[t,e]of this.elementProperties){let s=this._$Eu(t,e);s!==void 0&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(i){let t=[];if(Array.isArray(i)){let e=new Set(i.flat(1/0).reverse());for(let s of e)t.unshift(Ht(s))}else i!==void 0&&t.push(Ht(i));return t}static _$Eu(i,t){let e=t.attribute;return e===!1?void 0:typeof e=="string"?e:typeof i=="string"?i.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(i=>i(this))}addController(i){(this._$EO??=new Set).add(i),this.renderRoot!==void 0&&this.isConnected&&i.hostConnected?.()}removeController(i){this._$EO?.delete(i)}_$E_(){let i=new Map,t=this.constructor.elementProperties;for(let e of t.keys())this.hasOwnProperty(e)&&(i.set(e,this[e]),delete this[e]);i.size>0&&(this._$Ep=i)}createRenderRoot(){let i=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Jt(i,this.constructor.elementStyles),i}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(i=>i.hostConnected?.())}enableUpdating(i){}disconnectedCallback(){this._$EO?.forEach(i=>i.hostDisconnected?.())}attributeChangedCallback(i,t,e){this._$AK(i,e)}_$ET(i,t){let e=this.constructor.elementProperties.get(i),s=this.constructor._$Eu(i,e);if(s!==void 0&&e.reflect===!0){let n=(e.converter?.toAttribute!==void 0?e.converter:dt).toAttribute(t,e.type);this._$Em=i,n==null?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(i,t){let e=this.constructor,s=e._$Eh.get(i);if(s!==void 0&&this._$Em!==s){let n=e.getPropertyOptions(s),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:dt;this._$Em=s;let c=o.fromAttribute(t,n.type);this[s]=c??this._$Ej?.get(s)??c,this._$Em=null}}requestUpdate(i,t,e,s=!1,n){if(i!==void 0){let o=this.constructor;if(s===!1&&(n=this[i]),e??=o.getPropertyOptions(i),!((e.hasChanged??wt)(n,t)||e.useDefault&&e.reflect&&n===this._$Ej?.get(i)&&!this.hasAttribute(o._$Eu(i,e))))return;this.C(i,t,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(i,t,{useDefault:e,reflect:s,wrapped:n},o){e&&!(this._$Ej??=new Map).has(i)&&(this._$Ej.set(i,o??t??this[i]),n!==!0||o!==void 0)||(this._$AL.has(i)||(this.hasUpdated||e||(t=void 0),this._$AL.set(i,t)),s===!0&&this._$Em!==i&&(this._$Eq??=new Set).add(i))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let i=this.scheduleUpdate();return i!=null&&await i,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[s,n]of this._$Ep)this[s]=n;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[s,n]of e){let{wrapped:o}=n,c=this[s];o!==!0||this._$AL.has(s)||c===void 0||this.C(s,void 0,n,c)}}let i=!1,t=this._$AL;try{i=this.shouldUpdate(t),i?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(e){throw i=!1,this._$EM(),e}i&&this._$AE(t)}willUpdate(i){}_$AE(i){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(i)),this.updated(i)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(i){return!0}update(i){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(i){}firstUpdated(i){}};q.elementStyles=[],q.shadowRootOptions={mode:"open"},q[lt("elementProperties")]=new Map,q[lt("finalized")]=new Map,li?.({ReactiveElement:q}),(yt.reactiveElementVersions??=[]).push("2.1.2");var zt=globalThis,te=r=>r,$t=zt.trustedTypes,ee=$t?$t.createPolicy("lit-html",{createHTML:r=>r}):void 0,ae="$lit$",W=`lit$${Math.random().toFixed(9).slice(2)}$`,ce="?"+W,di=`<${ce}>`,it=document,ut=()=>it.createComment(""),pt=r=>r===null||typeof r!="object"&&typeof r!="function",jt=Array.isArray,hi=r=>jt(r)||typeof r?.[Symbol.iterator]=="function",Nt=`[ 	
\f\r]`,ht=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ie=/-->/g,se=/>/g,tt=RegExp(`>|${Nt}(?:([^\\s"'>=/]+)(${Nt}*=${Nt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ne=/'/g,re=/"/g,le=/^(?:script|style|textarea|title)$/i,qt=r=>(i,...t)=>({_$litType$:r,strings:i,values:t}),l=qt(1),F=qt(2),vs=qt(3),st=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),oe=new WeakMap,et=it.createTreeWalker(it,129);function de(r,i){if(!jt(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return ee!==void 0?ee.createHTML(i):i}var ui=(r,i)=>{let t=r.length-1,e=[],s,n=i===2?"<svg>":i===3?"<math>":"",o=ht;for(let c=0;c<t;c++){let a=r[c],d,p,m=-1,g=0;for(;g<a.length&&(o.lastIndex=g,p=o.exec(a),p!==null);)g=o.lastIndex,o===ht?p[1]==="!--"?o=ie:p[1]!==void 0?o=se:p[2]!==void 0?(le.test(p[2])&&(s=RegExp("</"+p[2],"g")),o=tt):p[3]!==void 0&&(o=tt):o===tt?p[0]===">"?(o=s??ht,m=-1):p[1]===void 0?m=-2:(m=o.lastIndex-p[2].length,d=p[1],o=p[3]===void 0?tt:p[3]==='"'?re:ne):o===re||o===ne?o=tt:o===ie||o===se?o=ht:(o=tt,s=void 0);let v=o===tt&&r[c+1].startsWith("/>")?" ":"";n+=o===ht?a+di:m>=0?(e.push(d),a.slice(0,m)+ae+a.slice(m)+W+v):a+W+(m===-2?c:v)}return[de(r,n+(r[t]||"<?>")+(i===2?"</svg>":i===3?"</math>":"")),e]},mt=class r{constructor({strings:i,_$litType$:t},e){let s;this.parts=[];let n=0,o=0,c=i.length-1,a=this.parts,[d,p]=ui(i,t);if(this.el=r.createElement(d,e),et.currentNode=this.el.content,t===2||t===3){let m=this.el.content.firstChild;m.replaceWith(...m.childNodes)}for(;(s=et.nextNode())!==null&&a.length<c;){if(s.nodeType===1){if(s.hasAttributes())for(let m of s.getAttributeNames())if(m.endsWith(ae)){let g=p[o++],v=s.getAttribute(m).split(W),M=/([.?@])?(.*)/.exec(g);a.push({type:1,index:n,name:M[2],strings:v,ctor:M[1]==="."?Lt:M[1]==="?"?Ft:M[1]==="@"?Ut:rt}),s.removeAttribute(m)}else m.startsWith(W)&&(a.push({type:6,index:n}),s.removeAttribute(m));if(le.test(s.tagName)){let m=s.textContent.split(W),g=m.length-1;if(g>0){s.textContent=$t?$t.emptyScript:"";for(let v=0;v<g;v++)s.append(m[v],ut()),et.nextNode(),a.push({type:2,index:++n});s.append(m[g],ut())}}}else if(s.nodeType===8)if(s.data===ce)a.push({type:2,index:n});else{let m=-1;for(;(m=s.data.indexOf(W,m+1))!==-1;)a.push({type:7,index:n}),m+=W.length-1}n++}}static createElement(i,t){let e=it.createElement("template");return e.innerHTML=i,e}};function nt(r,i,t=r,e){if(i===st)return i;let s=e!==void 0?t._$Co?.[e]:t._$Cl,n=pt(i)?void 0:i._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),n===void 0?s=void 0:(s=new n(r),s._$AT(r,t,e)),e!==void 0?(t._$Co??=[])[e]=s:t._$Cl=s),s!==void 0&&(i=nt(r,s._$AS(r,i.values),s,e)),i}var It=class{constructor(i,t){this._$AV=[],this._$AN=void 0,this._$AD=i,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(i){let{el:{content:t},parts:e}=this._$AD,s=(i?.creationScope??it).importNode(t,!0);et.currentNode=s;let n=et.nextNode(),o=0,c=0,a=e[0];for(;a!==void 0;){if(o===a.index){let d;a.type===2?d=new ft(n,n.nextSibling,this,i):a.type===1?d=new a.ctor(n,a.name,a.strings,this,i):a.type===6&&(d=new Dt(n,this,i)),this._$AV.push(d),a=e[++c]}o!==a?.index&&(n=et.nextNode(),o++)}return et.currentNode=it,s}p(i){let t=0;for(let e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(i,e,t),t+=e.strings.length-2):e._$AI(i[t])),t++}},ft=class r{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(i,t,e,s){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=i,this._$AB=t,this._$AM=e,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let i=this._$AA.parentNode,t=this._$AM;return t!==void 0&&i?.nodeType===11&&(i=t.parentNode),i}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(i,t=this){i=nt(this,i,t),pt(i)?i===u||i==null||i===""?(this._$AH!==u&&this._$AR(),this._$AH=u):i!==this._$AH&&i!==st&&this._(i):i._$litType$!==void 0?this.$(i):i.nodeType!==void 0?this.T(i):hi(i)?this.k(i):this._(i)}O(i){return this._$AA.parentNode.insertBefore(i,this._$AB)}T(i){this._$AH!==i&&(this._$AR(),this._$AH=this.O(i))}_(i){this._$AH!==u&&pt(this._$AH)?this._$AA.nextSibling.data=i:this.T(it.createTextNode(i)),this._$AH=i}$(i){let{values:t,_$litType$:e}=i,s=typeof e=="number"?this._$AC(i):(e.el===void 0&&(e.el=mt.createElement(de(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===s)this._$AH.p(t);else{let n=new It(s,this),o=n.u(this.options);n.p(t),this.T(o),this._$AH=n}}_$AC(i){let t=oe.get(i.strings);return t===void 0&&oe.set(i.strings,t=new mt(i)),t}k(i){jt(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,e,s=0;for(let n of i)s===t.length?t.push(e=new r(this.O(ut()),this.O(ut()),this,this.options)):e=t[s],e._$AI(n),s++;s<t.length&&(this._$AR(e&&e._$AB.nextSibling,s),t.length=s)}_$AR(i=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);i!==this._$AB;){let e=te(i).nextSibling;te(i).remove(),i=e}}setConnected(i){this._$AM===void 0&&(this._$Cv=i,this._$AP?.(i))}},rt=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(i,t,e,s,n){this.type=1,this._$AH=u,this._$AN=void 0,this.element=i,this.name=t,this._$AM=s,this.options=n,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=u}_$AI(i,t=this,e,s){let n=this.strings,o=!1;if(n===void 0)i=nt(this,i,t,0),o=!pt(i)||i!==this._$AH&&i!==st,o&&(this._$AH=i);else{let c=i,a,d;for(i=n[0],a=0;a<n.length-1;a++)d=nt(this,c[e+a],t,a),d===st&&(d=this._$AH[a]),o||=!pt(d)||d!==this._$AH[a],d===u?i=u:i!==u&&(i+=(d??"")+n[a+1]),this._$AH[a]=d}o&&!s&&this.j(i)}j(i){i===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,i??"")}},Lt=class extends rt{constructor(){super(...arguments),this.type=3}j(i){this.element[this.name]=i===u?void 0:i}},Ft=class extends rt{constructor(){super(...arguments),this.type=4}j(i){this.element.toggleAttribute(this.name,!!i&&i!==u)}},Ut=class extends rt{constructor(i,t,e,s,n){super(i,t,e,s,n),this.type=5}_$AI(i,t=this){if((i=nt(this,i,t,0)??u)===st)return;let e=this._$AH,s=i===u&&e!==u||i.capture!==e.capture||i.once!==e.once||i.passive!==e.passive,n=i!==u&&(e===u||s);s&&this.element.removeEventListener(this.name,this,e),n&&this.element.addEventListener(this.name,this,i),this._$AH=i}handleEvent(i){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,i):this._$AH.handleEvent(i)}},Dt=class{constructor(i,t,e){this.element=i,this.type=6,this._$AN=void 0,this._$AM=t,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(i){nt(this,i)}};var pi=zt.litHtmlPolyfillSupport;pi?.(mt,ft),(zt.litHtmlVersions??=[]).push("3.3.3");var he=(r,i,t)=>{let e=t?.renderBefore??i,s=e._$litPart$;if(s===void 0){let n=t?.renderBefore??null;e._$litPart$=s=new ft(i.insertBefore(ut(),n),n,void 0,t??{})}return s._$AI(r),s};var Vt=globalThis,b=class extends q{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let i=super.createRenderRoot();return this.renderOptions.renderBefore??=i.firstChild,i}update(i){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(i),this._$Do=he(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return st}};b._$litElement$=!0,b.finalized=!0,Vt.litElementHydrateSupport?.({LitElement:b});var mi=Vt.litElementPolyfillSupport;mi?.({LitElement:b});(Vt.litElementVersions??=[]).push("4.2.2");var $=r=>(i,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(r,i)}):customElements.define(r,i)};var fi={attribute:!0,type:String,converter:dt,reflect:!1,hasChanged:wt},gi=(r=fi,i,t)=>{let{kind:e,metadata:s}=t,n=globalThis.litPropertyMetadata.get(s);if(n===void 0&&globalThis.litPropertyMetadata.set(s,n=new Map),e==="setter"&&((r=Object.create(r)).wrapped=!0),n.set(t.name,r),e==="accessor"){let{name:o}=t;return{set(c){let a=i.get.call(this);i.set.call(this,c),this.requestUpdate(o,a,r,!0,c)},init(c){return c!==void 0&&this.C(o,void 0,r,c),c}}}if(e==="setter"){let{name:o}=t;return function(c){let a=this[o];i.call(this,c),this.requestUpdate(o,a,r,!0,c)}}throw Error("Unsupported decorator location: "+e)};function _(r){return(i,t)=>typeof t=="object"?gi(r,i,t):((e,s,n)=>{let o=s.hasOwnProperty(n);return s.constructor.createProperty(n,e),o?Object.getOwnPropertyDescriptor(s,n):void 0})(r,i,t)}function f(r){return _({...r,state:!0,attribute:!1})}function E(r){return r.split(".")[0]}function y(r){return!r||r.state==="unavailable"||r.state==="unknown"}function S(r){if(!r)return!1;let i=r.state,t=E(r.entity_id);if(t==="button"||t==="input_button"||t==="scene")return i!=="unavailable";if(i==="unavailable"||i==="unknown")return!1;if(i==="off")return t==="alert";switch(t){case"alarm_control_panel":return i!=="disarmed";case"alert":return i!=="idle";case"cover":case"valve":return i!=="closed";case"device_tracker":case"person":return i!=="not_home";case"lawn_mower":return i!=="docked"&&i!=="paused";case"lock":return i!=="locked";case"media_player":return i!=="standby";case"vacuum":return i!=="idle"&&i!=="docked"&&i!=="paused";case"plant":return i==="problem";case"timer":return i==="active";case"camera":return i==="streaming"||i==="recording";default:return!0}}var _i=new Set(["closed","locked","off"]);function z(r,i){let t=E(i),e=r.states[i],s=e?_i.has(e.state):!0,n={entity_id:i};switch(t){case"button":case"input_button":return r.callService(t,"press",n);case"lock":return r.callService("lock",s?"unlock":"lock",n);case"cover":return r.callService("cover",s?"open_cover":"close_cover",n);case"valve":return r.callService("valve",s?"open_valve":"close_valve",n);case"scene":return r.callService("scene","turn_on",n);case"group":return r.callService("homeassistant",s?"turn_on":"turn_off",n);default:return r.callService(t,s?"turn_on":"turn_off",n)}}function C(r,i){r.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:i},bubbles:!0,composed:!0}))}function x(r,i="light"){let t=new Event("haptic",{bubbles:!0,composed:!0});t.detail=i,r.dispatchEvent(t)}function I(r,i){if(r?.formatEntityState)try{return r.formatEntityState(i)}catch{}return i.state.replace(/_/g," ")}function R(r,i){return((r.attributes.supported_features??0)&i)!==0}var O=(r,i,t)=>Math.min(Math.max(r,i),t);var L=class extends b{constructor(){super(...arguments);this.value=0;this.min=0;this.max=100;this.step=1;this.disabled=!1;this.fill=!1;this._pct=0;this._dragging=!1;this._lastEmit=0}willUpdate(t){if(!this._dragging&&(t.has("value")||t.has("min")||t.has("max"))){let e=this.max-this.min||1;this._pct=O((this.value-this.min)/e*100,0,100)}}_valueFromPct(t){let e=this.min+t/100*(this.max-this.min),s=Math.round(e/this.step)*this.step;return O(Number(s.toFixed(3)),this.min,this.max)}_updateFromEvent(t,e){let s=this.getBoundingClientRect();if(s.width&&(this._pct=O((t.clientX-s.left)/s.width*100,0,100),e)){let n=Date.now();n-this._lastEmit>100&&(this._lastEmit=n,this._fire("slide"))}}_fire(t){this.dispatchEvent(new CustomEvent(t,{detail:{value:this._valueFromPct(this._pct)},bubbles:!1}))}_onPointerDown(t){this.disabled||(t.stopPropagation(),this.setPointerCapture(t.pointerId),this._dragging=!0,this._updateFromEvent(t,!0))}_onPointerMove(t){this._dragging&&this._updateFromEvent(t,!0)}_onPointerUp(){this._dragging&&(this._dragging=!1,this._fire("change"))}_onKeydown(t){if(this.disabled)return;let e=t.key==="ArrowRight"||t.key==="ArrowUp"?1:t.key==="ArrowLeft"||t.key==="ArrowDown"?-1:0;if(!e)return;t.preventDefault(),this.value=O(this.value+e*this.step,this.min,this.max);let s=this.max-this.min||1;this._pct=(this.value-this.min)/s*100,this._fire("change")}render(){return l`
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
    `}};L.styles=w`
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
  `,h([_({type:Number})],L.prototype,"value",2),h([_({type:Number})],L.prototype,"min",2),h([_({type:Number})],L.prototype,"max",2),h([_({type:Number})],L.prototype,"step",2),h([_({type:Boolean})],L.prototype,"disabled",2),h([_({type:Boolean,reflect:!0})],L.prototype,"fill",2),h([f()],L.prototype,"_pct",2),L=h([$("silk-slider")],L);var vi=new Set(["unavailable","unknown","none",""]);function bi(r,i){let t=(i??"").toLowerCase();if(vi.has(t))return{t:r,v:NaN};let e=Number(i);return{t:r,v:Number.isFinite(e)?e:NaN}}async function ue(r,i,t,e){let s=await r.callWS({type:"history/history_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),entity_ids:i,minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),n={};for(let o of i){let c=s?.[o]??[];n[o]=c.map(a=>{let d=a.s??a.state,p=a.lu??a.last_updated??a.lc??a.last_changed,m=typeof p=="number"?p:Date.parse(p)/1e3;return bi(m,d)}).filter(a=>Number.isFinite(a.t)).sort((a,d)=>a.t-d.t)}return n}async function yi(r,i,t,e){let s=await r.callWS({type:"recorder/statistics_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),statistic_ids:i,period:"hour",types:["mean","state"]}),n={};for(let o of i){let c=s?.[o]??[];n[o]=c.map(a=>{let d=a.start,p=typeof d=="number"?d/1e3:Date.parse(d)/1e3,m=a.mean??a.state;return{t:p,v:typeof m=="number"&&Number.isFinite(m)?m:NaN}}).filter(a=>Number.isFinite(a.t)).sort((a,d)=>a.t-d.t)}return n}async function Et(r,i,t,e,s){if(s<=48)return ue(r,i,t,e);let n=await yi(r,i,t,e),o=i.filter(c=>!n[c]?.length);if(o.length)try{let c=await ue(r,o,t,e);for(let a of o)n[a]=c[a]??[]}catch{for(let c of o)n[c]=n[c]??[]}return n}function Tt(r,i,t,e){let s=new Float64Array(e).fill(NaN);if(!r.length||t<=i)return s;let n=0;for(let o=0;o<e;o++){let c=i+(t-i)*o/(e-1);for(;n<r.length&&r[n].t<=c;)n++;n>0&&(s[o]=r[n-1].v)}return s}function kt(r,i,t){let e=1/0,s=-1/0;for(let o of r)for(let c=0;c<o.length;c++){let a=o[c];Number.isFinite(a)&&(a<e&&(e=a),a>s&&(s=a))}if(!Number.isFinite(e))return[0,1];if(e===s){let o=Math.max(Math.abs(e)*.05,.5);e-=o,s+=o}let n=(s-e)*.08;return[i??e-n,t??s+n]}function Ct(r,i,t,e,s){let[n,o]=i,c=o-n||1,a=Math.max(t-e-s,1),d=new Float64Array(r.length);for(let p=0;p<r.length;p++){let m=r[p];d[p]=Number.isFinite(m)?e+(1-(m-n)/c)*a:NaN}return d}var T=r=>(Math.round(r*100)/100).toString();function pe(r,i,t,e){let s=t-i,n=new Float64Array(s);if(s===1)return n;let o=new Float64Array(s-1);for(let c=0;c<s-1;c++)o[c]=(r[i+c+1]-r[i+c])/e;n[0]=o[0],n[s-1]=o[s-2];for(let c=1;c<s-1;c++)n[c]=o[c-1]*o[c]<=0?0:2*o[c-1]*o[c]/(o[c-1]+o[c]);return n}function me(r,i){let t=-1;for(let e=0;e<=r.length;e++){let s=e<r.length&&Number.isFinite(r[e]);s&&t<0&&(t=e),!s&&t>=0&&(i(t,e),t=-1)}}function At(r,i){let t=r.length;if(t<2)return"";let e=i/(t-1),s=[];return me(r,(n,o)=>{if(o-n===1){s.push(`M ${T(n*e)} ${T(r[n])} l 0.01 0`);return}let c=pe(r,n,o,e);s.push(`M ${T(n*e)} ${T(r[n])}`);for(let a=n;a<o-1;a++){let d=a-n,p=a*e,m=(a+1)*e,g=p+e/3,v=r[a]+c[d]*e/3,M=m-e/3,G=r[a+1]-c[d+1]*e/3;s.push(`C ${T(g)} ${T(v)} ${T(M)} ${T(G)} ${T(m)} ${T(r[a+1])}`)}}),s.join(" ")}function Pt(r,i,t){let e=r.length;if(e<2)return"";let s=i/(e-1),n=[];return me(r,(o,c)=>{if(c-o===1)return;let a=pe(r,o,c,s);n.push(`M ${T(o*s)} ${T(t)} L ${T(o*s)} ${T(r[o])}`);for(let d=o;d<c-1;d++){let p=d-o,m=d*s,g=(d+1)*s;n.push(`C ${T(m+s/3)} ${T(r[d]+a[p]*s/3)} ${T(g-s/3)} ${T(r[d+1]-a[p+1]*s/3)} ${T(g)} ${T(r[d+1])}`)}n.push(`L ${T((c-1)*s)} ${T(t)} Z`)}),n.join(" ")}function fe(r){for(let i=0;i<r.length;i++)if(Number.isFinite(r[i]))return i;return-1}function gt(r){for(let i=r.length-1;i>=0;i--)if(Number.isFinite(r[i]))return i;return-1}function ge(r){let i=-1,t=-1;for(let e=0;e<r.length;e++){let s=r[e];Number.isFinite(s)&&((i<0||s<r[i])&&(i=e),(t<0||s>r[t])&&(t=e))}return{min:i,max:t}}var _e=r=>1-Math.pow(1-r,3),ve=r=>1-Math.pow(1-r,4);function be(r){return r?.locale?.language??r?.language??"en"}function Y(r,i,t){if(!Number.isFinite(t))return"\u2014";let e=r?.entities?.[i]?.display_precision??(Math.abs(t)>=100?0:Math.abs(t)>=10?1:2);return new Intl.NumberFormat(be(r),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}function ye(r,i,t){return`${t>=0?"\u2191":"\u2193"} ${Y(r,i,Math.abs(t))}`}function we(r,i,t){let e=new Date(i*1e3),s=be(r);return t<=26?new Intl.DateTimeFormat(s,{hour:"numeric",minute:"2-digit"}).format(e):t<=24*8?new Intl.DateTimeFormat(s,{weekday:"short",hour:"numeric",minute:"2-digit"}).format(e):new Intl.DateTimeFormat(s,{month:"short",day:"numeric",hour:"numeric"}).format(e)}var wi=[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"line_width",selector:{number:{min:1,max:8,step:.5,mode:"box"}}}]},{name:"",type:"grid",schema:[{name:"fill",selector:{boolean:{}}},{name:"extremes",selector:{boolean:{}}},{name:"range_selector",selector:{boolean:{}}},{name:"delta",selector:{boolean:{}}}]}],$i={entity:"Entity",name:"Name",hours_to_show:"Hours to show",line_width:"Line width",fill:"Gradient fill",extremes:"Min/max markers",range_selector:"Range selector",delta:"Change badge"},ot=class extends b{setConfig(i){this._config=i}render(){if(!this.hass||!this._config)return u;let i={hours_to_show:24,line_width:2.5,fill:!0,extremes:!0,range_selector:!0,delta:!0,...this._config};return l`
      <ha-form
        .hass=${this.hass}
        .data=${i}
        .schema=${wi}
        .computeLabel=${t=>$i[t.name]??t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(i){i.stopPropagation();let t=i.detail.value;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}};h([_({attribute:!1})],ot.prototype,"hass",2),h([f()],ot.prototype,"_config",2),ot=h([$("silk-card-editor")],ot);var xe={type:"silk-card",name:"Silk Graph",description:"Buttery-smooth, interactive history graph. Scrub it, zoom it, watch it morph."},$e=["var(--primary-color, #4aa8ff)","#ef6c6c","#5ec78d","#f0b357","#a97ee8","#e879b9","#6ad4d4"],xi=["1h","12h","1d","1w","1m"],Ei={h:1,d:24,w:168,m:720},Ti=15e3,ki=3e5,Ci=0;function Ai(r){let i=/^(\d+)([hdwm])$/i.exec(r.trim());return i?Number(i[1])*Ei[i[2].toLowerCase()]:null}var N=class extends b{constructor(){super(...arguments);this._hours=24;this._scrubIndex=null;this._focusIndex=null;this._width=0;this._height=0;this._drawProgress=0;this._rev=0;this._uid=`silk${++Ci}`;this._seriesCfgs=[];this._points=[];this._vals=[];this._pxYs=[];this._domain=[0,1];this._windowStart=0;this._windowEnd=0;this._hasDrawn=!1;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastUpdated={}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-card-editor")}setConfig(t){if(!t.entity&&!t.entities?.length)throw new Error("silk-card: define an `entity` or a list of `entities`");let e=t.entities??[t.entity];this._seriesCfgs=e.map((s,n)=>{let o=typeof s=="string"?{entity:s}:s;return{entity:o.entity,name:o.name,color:o.color??t.color??$e[n%$e.length]}}),this._config=t,this._hours=t.hours_to_show??24,this._fetchStarted=!1,this._hasDrawn=!1,this._vals=[],this._pxYs=[],this._focusIndex=null}getCardSize(){return 3}getGridOptions(){return{columns:12,rows:3,min_rows:2,min_columns:4}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(!0),ki)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._animId&&cancelAnimationFrame(this._animId),this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh(!1);return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".graph");t&&(this._resizeObserver=new ResizeObserver(e=>{let s=e[0].contentRect;s.width===this._width&&s.height===this._height||(this._width=s.width,this._height=s.height,this._recompute(!1))}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=!1;for(let s of this._seriesCfgs){let n=this.hass.states[s.entity]?.last_updated;n&&n!==this._lastUpdated[s.entity]&&(this._lastUpdated[s.entity]=n,t=!0)}if(!t||this._refreshTimer)return;let e=Math.max(0,Ti-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh(!0)},e)}async _refresh(t){if(!this.hass||!this._seriesCfgs.length)return;let e=++this._fetchSeq,s=Date.now()/1e3,n=s-this._hours*3600,o;try{o=await Et(this.hass,this._seriesCfgs.map(a=>a.entity),n,s,this._hours)}catch(a){console.warn("silk-card: history fetch failed",a);return}if(e!==this._fetchSeq)return;this._lastFetch=Date.now(),this._windowStart=n,this._windowEnd=s;let c=this._config?.points??120;this._points=this._seriesCfgs.map(a=>o[a.entity]??[]),this._vals=this._points.map(a=>Tt(a,n,s,c)),this._domain=kt(this._vals,this._config?.y_min,this._config?.y_max),this._recompute(t)}_recompute(t){if(!this._vals.length||!this._width||!this._height)return;let e=this._config?.extremes!==!1,s=e?22:10,n=e?18:8,o=this._vals.map(c=>Ct(c,this._domain,this._height,s,n));this._setDisplay(o,t)}_setDisplay(t,e){if(this._animId&&cancelAnimationFrame(this._animId),!(e&&this._pxYs.length===t.length&&this._pxYs[0]?.length===t[0]?.length)){this._pxYs=t,this._rev++,this._hasDrawn?this._drawProgress=1:(this._hasDrawn=!0,this._animateDrawIn());return}let n=this._pxYs.map(d=>Float64Array.from(d)),o=performance.now(),c=420,a=d=>{let p=Math.min((d-o)/c,1),m=_e(p);for(let g=0;g<t.length;g++){let v=n[g],M=t[g],G=this._pxYs[g];for(let at=0;at<M.length;at++){let _t=v[at],Mt=M[at];G[at]=!Number.isFinite(_t)||!Number.isFinite(Mt)?p<.5?_t:Mt:_t+(Mt-_t)*m}}this._rev++,p<1&&(this._animId=requestAnimationFrame(a))};this._animId=requestAnimationFrame(a)}_animateDrawIn(){let t=performance.now(),e=900,s=n=>{let o=Math.min((n-t)/e,1);this._drawProgress=ve(o),o<1&&(this._animId=requestAnimationFrame(s))};this._animId=requestAnimationFrame(s)}_selectRange(t){t!==this._hours&&(this._hours=t,this._scrubIndex=null,this._refresh(!0))}_onPointerDown(t){t.currentTarget.setPointerCapture(t.pointerId),this._scrub(t)}_onPointerMove(t){this._scrubIndex!==null&&this._scrub(t)}_onPointerEnd(){this._scrubIndex=null}_scrub(t){if(!this._width||!this._vals.length)return;let e=t.currentTarget.getBoundingClientRect(),s=Math.min(Math.max(t.clientX-e.left,0),this._width),n=this._vals[0].length;this._scrubIndex=Math.round(s/this._width*(n-1))}_toggleFocus(t){this._focusIndex=this._focusIndex===t?null:t}get _primaryIndex(){return this._focusIndex??0}_valueAt(t,e){return this._vals[t]?.[e]??NaN}_timeAt(t){let e=this._vals[0]?.length??1;return this._windowStart+(this._windowEnd-this._windowStart)*t/Math.max(e-1,1)}render(){if(!this._config)return u;this._rev;let t=this.hass,e=this._seriesCfgs[this._primaryIndex],s=t?.states[e.entity];if(t&&!s)return l`<ha-card><div class="warning">Entity not found: ${e.entity}</div></ha-card>`;let n=this._scrubIndex!==null&&this._vals.length>0,o=n?this._valueAt(this._primaryIndex,this._scrubIndex):Number(s?.state),c=this._config.unit??s?.attributes.unit_of_measurement??"",a=this._config.name??e.name??s?.attributes.friendly_name??e.entity;return l`
      <ha-card>
        <div class="header">
          <div class="title-row">
            <span class="name">
              ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:u}
              ${a}
            </span>
            ${this._renderRangeChips()}
          </div>
          <div class="value-row">
            <span class="value">${Y(t,e.entity,o)}</span>
            <span class="unit">${c}</span>
            ${n?this._renderScrubTime():this._renderDelta(e.entity)}
          </div>
          ${this._seriesCfgs.length>1?this._renderLegend():u}
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
    `}_renderRangeChips(){if(this._config?.range_selector===!1)return u;let t=this._config?.ranges??xi;return l`
      <span class="ranges">
        ${t.map(e=>{let s=Ai(e);return s===null?u:l`
            <button
              class="chip ${s===this._hours?"active":""}"
              @click=${()=>this._selectRange(s)}
            >
              ${e.toUpperCase()}
            </button>
          `})}
      </span>
    `}_renderDelta(t){if(this._config?.delta===!1||!this._vals.length)return u;let e=this._vals[this._primaryIndex],s=fe(e),n=gt(e);if(s<0||n<=s)return u;let o=e[n]-e[s];return l`<span class="delta">${ye(this.hass,t,o)}</span>`}_renderScrubTime(){return l`<span class="scrub-time">${we(this.hass,this._timeAt(this._scrubIndex),this._hours)}</span>`}_renderLegend(){return l`
      <div class="legend">
        ${this._seriesCfgs.map((t,e)=>{let s=this.hass?.states[t.entity],n=t.name??s?.attributes.friendly_name??t.entity,o=this._focusIndex!==null&&this._focusIndex!==e;return l`
            <button class="legend-chip ${o?"dim":""}" @click=${()=>this._toggleFocus(e)}>
              <span class="dot" style="background:${t.color}"></span>
              ${n}
            </button>
          `})}
      </div>
    `}_renderSvg(){let t=this._width,e=this._height;if(!t||!e||!this._pxYs.length)return u;let s=this._config?.line_width??2.5,n=this._config?.fill!==!1,o=`${this._uid}-clip`;return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e}>
        <defs>
          <clipPath id=${o}>
            <rect x="0" y="0" width=${t*this._drawProgress} height=${e}></rect>
          </clipPath>
          ${this._seriesCfgs.map((c,a)=>F`
              <linearGradient id="${this._uid}-fill-${a}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.30" style="color:${c.color}"></stop>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02" style="color:${c.color}"></stop>
              </linearGradient>
            `)}
        </defs>
        <g clip-path="url(#${o})">
          ${this._seriesCfgs.map((c,a)=>this._renderSeries(c,a,t,e,s,n))}
        </g>
        ${this._renderExtremes(t)}
        ${this._renderScrubOverlay(t,e)}
      </svg>
    `}_renderSeries(t,e,s,n,o,c){let a=this._pxYs[e],d=this._focusIndex!==null&&this._focusIndex!==e,p=At(a,s),m=c?Pt(a,s,n):"",g=gt(a),v=g>=0?g/(a.length-1)*s:0;return F`
      <g style="color:${t.color}" opacity=${d?.22:1} class="series">
        ${c?F`<path class="area" d=${m} fill="url(#${this._uid}-fill-${e})"></path>`:u}
        <path
          class="line"
          d=${p}
          fill="none"
          stroke="currentColor"
          stroke-width=${o}
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        ${g>=0&&this._drawProgress>=1?F`
              <circle class="pulse" cx=${v} cy=${a[g]} r="4" fill="currentColor"></circle>
              <circle cx=${v} cy=${a[g]} r="3" fill="currentColor"></circle>
            `:u}
      </g>
    `}_renderExtremes(t){if(this._config?.extremes===!1||!this._pxYs.length)return u;let e=this._primaryIndex,s=this._vals[e],n=this._pxYs[e];if(!s)return u;let{min:o,max:c}=ge(s);if(o<0||c<0||o===c)return u;let a=this._seriesCfgs[e].entity,d=(p,m)=>{let g=p/(s.length-1)*t,v=g<40?"start":g>t-40?"end":"middle";return F`
        <circle cx=${g} cy=${n[p]} r="2.5" class="extreme-dot"></circle>
        <text x=${g} y=${n[p]+(m?14:-8)} text-anchor=${v} class="extreme-label">
          ${Y(this.hass,a,s[p])}
        </text>
      `};return F`${d(c,!1)}${d(o,!0)}`}_renderScrubOverlay(t,e){if(this._scrubIndex===null||!this._pxYs.length)return u;let s=this._pxYs[0].length,n=this._scrubIndex/(s-1)*t;return F`
      <line x1=${n} y1="0" x2=${n} y2=${e} class="scrub-line"></line>
      ${this._pxYs.map((o,c)=>{let a=o[this._scrubIndex];return Number.isFinite(a)?F`<circle cx=${n} cy=${a} r="4.5" class="scrub-dot" style="color:${this._seriesCfgs[c].color}" fill="currentColor"></circle>`:u})}
    `}};N.styles=w`
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
  `,h([_({attribute:!1})],N.prototype,"hass",2),h([f()],N.prototype,"_config",2),h([f()],N.prototype,"_hours",2),h([f()],N.prototype,"_scrubIndex",2),h([f()],N.prototype,"_focusIndex",2),h([f()],N.prototype,"_width",2),h([f()],N.prototype,"_height",2),h([f()],N.prototype,"_drawProgress",2),h([f()],N.prototype,"_rev",2),N=h([$("silk-card")],N);var St=class extends N{};St=h([$("silk-graph-card")],St);var A=w`
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
`;var Pi={light:"var(--state-light-active-color, #e6a23c)",switch:"var(--state-switch-active-color, #4aa8ff)",input_boolean:"var(--state-switch-active-color, #4aa8ff)",fan:"var(--state-fan-active-color, #35b5b1)",cover:"var(--state-cover-active-color, #9d7ee8)",climate:"var(--state-climate-auto-color, #57ad60)",media_player:"var(--state-media_player-active-color, #6c8dd6)",lock:"var(--state-lock-locked-color, #57ad60)",vacuum:"var(--state-vacuum-active-color, #35b5b1)",humidifier:"var(--state-humidifier-on-color, #4aa8ff)",scene:"var(--primary-color, #4aa8ff)",script:"var(--primary-color, #4aa8ff)",button:"var(--primary-color, #4aa8ff)",input_button:"var(--primary-color, #4aa8ff)",person:"var(--state-person-home-color, #57ad60)",device_tracker:"var(--state-person-home-color, #57ad60)",binary_sensor:"var(--primary-color, #4aa8ff)",sensor:"var(--primary-color, #4aa8ff)"},Ee={heat:"var(--state-climate-heat-color, #e8734f)",cool:"var(--state-climate-cool-color, #4aa8ff)",heat_cool:"var(--state-climate-auto-color, #57ad60)",auto:"var(--state-climate-auto-color, #57ad60)",dry:"var(--state-climate-dry-color, #e6a23c)",fan_only:"var(--state-climate-fan-only-color, #35b5b1)"};function k(r,i){if(i)return i;if(!r)return"var(--primary-color, #4aa8ff)";let t=E(r.entity_id);return t==="climate"&&Ee[r.state]?Ee[r.state]:t==="lock"&&r.state!=="locked"?"var(--state-lock-unlocked-color, #e8734f)":Pi[t]??"var(--primary-color, #4aa8ff)"}function P(r,i,t,e={}){if(customElements.get(r))return;class s extends b{setConfig(o){this._config=o}render(){return!this.hass||!this._config?u:l`
        <ha-form
          .hass=${this.hass}
          .data=${{...e,...this._config}}
          .schema=${i}
          .computeLabel=${o=>t[o.name]??o.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `}_valueChanged(o){o.stopPropagation(),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:o.detail.value},bubbles:!0,composed:!0}))}}h([_({attribute:!1})],s.prototype,"hass",2),h([f()],s.prototype,"_config",2),customElements.define(r,s)}var Te={type:"silk-toggle-card",name:"Silk Toggle",description:"A crisp on/off row with a real switch and instant feedback."},ke="silk-toggle-card-editor";P(ke,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan","lock","cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before switching"});function Si(r,i){switch(r){case"lock":return i?"unlocked":"locked";case"cover":case"valve":return i?"open":"closed";default:return i?"on":"off"}}var Oi=2e3,K=class extends b{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-toggle-card",entity:e.find(n=>n.startsWith("switch."))??e.find(n=>n.startsWith("light."))}}static async getConfigElement(){return document.createElement(ke)}setConfig(t){if(!t.entity)throw new Error("silk-toggle-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_onCardClick(){this._config&&C(this,this._config.entity)}_onToggleClick(t){t.stopPropagation();let e=this._config,s=this.hass;if(!e||!s)return;let n=s.states[e.entity];if(!(!n||y(n))){if(e.confirm){let o=e.name??n.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to toggle ${o}?`))return}x(this),this._optimistic=!S(n),this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Oi),z(s,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return u;let s=e.states[t.entity];if(!s)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=y(s),o=this._optimistic??S(s),c=this._optimistic===null?s:{...s,state:Si(E(t.entity),this._optimistic)},a=k(c,t.color),d=t.name??s.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${a}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${o?"on":""}"
          .disabled=${n}
          aria-label=${`Toggle ${d}`}
          @click=${this._onToggleClick}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${c}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${d}</div>
          <div class="state">${I(e,c)}</div>
        </div>
        <div class="trailing">
          <button
            class="switch ${o?"checked":""}"
            role="switch"
            aria-checked=${o?"true":"false"}
            aria-label=${`Toggle ${d}`}
            .disabled=${n}
            @click=${this._onToggleClick}
          >
            <span class="thumb"></span>
          </button>
        </div>
      </ha-card>
    `}};K.styles=[A,w`
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
    `],h([_({attribute:!1})],K.prototype,"hass",2),h([f()],K.prototype,"_config",2),h([f()],K.prototype,"_optimistic",2),K=h([$("silk-toggle-card")],K);var Ce={type:"silk-light-card",name:"Silk Light",description:"Drag anywhere to dim \u2014 the whole card is the slider."},Ae="silk-light-card-editor";P(Ae,[{name:"entity",required:!0,selector:{entity:{domain:["light"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",icon:"Icon",color:"Accent color"});var Mi=2e3;function Ri(r){let i=r.attributes.supported_color_modes;return Array.isArray(i)&&i.some(t=>t!=="onoff")}var V=class extends b{constructor(){super(...arguments);this._optimisticPct=null;this._optimisticOn=null;this._sliding=!1}static getStubConfig(t){return{type:"custom:silk-light-card",entity:Object.keys(t.states).find(s=>s.startsWith("light."))}}static async getConfigElement(){return document.createElement(Ae)}setConfig(t){if(!t.entity)throw new Error("silk-light-card: `entity` is required");if(E(t.entity)!=="light")throw new Error(`silk-light-card: \`entity\` must be a light (got "${t.entity}")`);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._sliding||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticPct=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Mi)}_displayPct(t,e){if(this._optimisticPct!==null)return this._optimisticPct;if(!e)return 0;let s=t.attributes.brightness;return typeof s!="number"?null:O(Math.round(s/255*100),1,100)}_onSlide(t){this._sliding=!0,this._optimisticPct=t.detail.value,this._optimisticOn=t.detail.value>0}_onSliderChange(t){if(this._sliding=!1,!this.hass||!this._config)return;let e=t.detail.value;this._optimisticPct=e,this._optimisticOn=e>0,this._holdOptimistic(),x(this),e<=0?this.hass.callService("light","turn_off",{entity_id:this._config.entity}):this.hass.callService("light","turn_on",{entity_id:this._config.entity,brightness_pct:e})}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(y(e))return;let s=this._optimisticOn??e.state==="on";z(this.hass,this._config.entity),x(this),this._optimisticOn=!s,this._optimisticPct=null,this._holdOptimistic()}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}render(){if(!this._config)return u;let t=this.hass;if(!t)return u;let e=this._config.entity,s=t.states[e];if(!s)return l`<ha-card><div class="warning">Entity not found: ${e}</div></ha-card>`;let n=y(s),o=Ri(s),c=!n&&s.state==="on",a=n?!1:this._optimisticOn??c,d=n?0:this._displayPct(s,a),p=k(s,this._config.color),m=this._config.name??s.attributes.friendly_name??e,g=n||a===c?I(t,s):a?"On":"Off",v=o&&a&&d!==null&&!n;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${p}"
        @click=${this._onCardClick}
      >
        ${o?l`
              <silk-slider
                fill
                .value=${a?d??100:0}
                min="1"
                max="100"
                step="1"
                ?disabled=${n}
                @slide=${this._onSlide}
                @change=${this._onSliderChange}
                @click=${this._stopClick}
              ></silk-slider>
            `:u}
        <button
          class="icon ${a?"on":""}"
          ?disabled=${n}
          aria-label=${`Toggle ${m}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${s}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${m}</div>
          <div class="state">
            ${g}${v?l`<span class="sep">·</span>${d}%`:u}
          </div>
        </div>
        <div class="trailing">
          ${v?l`<span class="value">${d}%</span>`:u}
        </div>
      </ha-card>
    `}};V.styles=[A,w`
      .icon:disabled {
        cursor: default;
      }
    `],h([_({attribute:!1})],V.prototype,"hass",2),h([f()],V.prototype,"_config",2),h([f()],V.prototype,"_optimisticPct",2),h([f()],V.prototype,"_optimisticOn",2),V=h([$("silk-light-card")],V);var Pe={type:"silk-tile-card",name:"Silk Tile",description:"A sensor tile with a living sparkline and threshold colors."},Hi=60,Ni=6,Ii=4,Li=3e5,Fi=6e4,Ui=0;P("silk-tile-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}]},{name:"",type:"grid",schema:[{name:"unit",selector:{text:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]}],{entity:"Entity",name:"Name",icon:"Icon",color:"Color",unit:"Unit",hours_to_show:"Hours to show"},{hours_to_show:24});var j=class extends b{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._uid=`silk-tile${++Ui}`;this._thresholds=[];this._vals=null;this._pxYs=null;this._domain=[0,1];this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-tile-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-tile-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-tile-card: `entity` is required");this._thresholds=(t.thresholds??[]).filter(e=>!!e&&typeof e.value=="number"&&Number.isFinite(e.value)&&typeof e.color=="string").sort((e,s)=>e.value-s.value),this._config=t,this._fetchStarted=!1,this._vals=null,this._pxYs=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Li)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let s=e[0].contentRect;s.width===this._width&&s.height===this._height||(this._width=s.width,this._height=s.height,this._recompute())}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,Fi-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??24,s=++this._fetchSeq,n=Date.now()/1e3,o=n-e*3600,c;try{c=await Et(this.hass,[t],o,n,e)}catch(a){console.warn("silk-tile-card: history fetch failed",a);return}s===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals=Tt(c[t]??[],o,n,Hi),this._domain=kt([this._vals]),this._recompute())}_recompute(){!this._vals||!this._width||!this._height||(this._pxYs=Ct(this._vals,this._domain,this._height,Ni,Ii),this._rev++)}_accent(t){if(Number.isFinite(t)){let e;for(let s of this._thresholds)if(s.value<=t)e=s.color;else break;if(e)return e}return k(this.hass?.states[this._config.entity],this._config?.color)}_onTap(){this._config&&(x(this),C(this,this._config.entity))}render(){if(!this._config)return u;this._rev;let t=this.hass,e=t?.states[this._config.entity];if(t&&!e)return l`<ha-card
        ><div class="warning">Entity not found: ${this._config.entity}</div></ha-card
      >`;let s=y(e),n=Number(e?.state),o=this._accent(n),c=this._config.unit??e?.attributes.unit_of_measurement??"",a=this._config.name??e?.attributes.friendly_name??this._config.entity;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${o}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${!s&&S(e)?"on":""}">
            ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${a}</div></div>
          <div class="trailing">
            <span class="value">${Y(t,this._config.entity,n)}</span>
            ${c?l`<span class="unit">${c}</span>`:u}
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._height,s=this._pxYs;if(!t||!e||!s)return u;let n=At(s,t),o=Pt(s,t,e),c=gt(s),a=c>=0?c/(s.length-1)*t:0,d=`${this._uid}-fill`;return l`
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
          <path d=${o} fill="url(#${d})"></path>
          <path
            d=${n}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          ${c>=0?F`<circle cx=${a} cy=${s[c]} r="2.5" fill="currentColor"></circle>`:u}
        </g>
      </svg>
    `}};j.styles=[A,w`
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
    `],h([_({attribute:!1})],j.prototype,"hass",2),h([f()],j.prototype,"_config",2),h([f()],j.prototype,"_width",2),h([f()],j.prototype,"_height",2),h([f()],j.prototype,"_rev",2),j=h([$("silk-tile-card")],j);var Re={type:"silk-gauge-card",name:"Silk Gauge",description:"A clean arc gauge that animates to its value."},Ot=42,Di=50,zi=50,He=270,Ne=90+(360-He)/2,Se=100,Oe=96;function Ie(r){let i=r*Math.PI/180;return[Di+Ot*Math.cos(i),zi+Ot*Math.sin(i)]}var[Le,ji]=Ie(Ne),[Fe,qi]=Ie(Ne+He),Me=`M ${Le.toFixed(2)} ${ji.toFixed(2)} A ${Ot} ${Ot} 0 1 1 ${Fe.toFixed(2)} ${qi.toFixed(2)}`,Bt=100,X=class extends b{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),s=n=>e.find(o=>t.states[o].attributes.device_class===n);return{type:"custom:silk-gauge-card",entity:s("battery")??s("power")??e[0]}}static async getConfigElement(){return document.createElement("silk-gauge-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-gauge-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-gauge-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,s)=>e.from-s.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:3,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatValue(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return e!==void 0?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t):new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.abs(t)>=100?0:1}).format(t)}_formatBound(t){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&C(this,this._config.entity)}render(){let t=this._config;if(!t)return u;let e=this.hass?.states[t.entity];if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let s=y(e),n=Number(e?.state),o=!s&&e!==void 0&&e.state!==""&&Number.isFinite(n),c=t.min??0,a=t.max??100,d=a-c,p=o&&d>0?O((n-c)/d,0,1):0,m=this._drawn?p:0,g=Bt*(1-m),v=(o?this._segmentColor(n):void 0)??k(e,t.color),M=t.unit??e?.attributes.unit_of_measurement??"",G=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${s?"unavailable":""}
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div class="gauge">
          <svg viewBox="0 0 ${Se} ${Oe}" aria-hidden="true">
            <path class="arc-bg" d=${Me}></path>
            <path
              class="arc-value"
              d=${Me}
              pathLength=${Bt}
              stroke-dasharray=${Bt}
              style="stroke-dashoffset:${g};opacity:${m>0?1:0}"
            ></path>
          </svg>
          <div class="readout">
            <div class="value">${o?this._formatValue(n):"\u2014"}</div>
            ${M?l`<div class="unit">${M}</div>`:u}
          </div>
          <span class="bound" style="left:${Le.toFixed(1)}%">${this._formatBound(c)}</span>
          <span class="bound" style="left:${Fe.toFixed(1)}%">${this._formatBound(a)}</span>
        </div>
        <div class="name" title=${G}>${G}</div>
      </ha-card>
    `}};X.styles=[A,w`
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
        aspect-ratio: ${Se} / ${Oe};
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
    `],h([_({attribute:!1})],X.prototype,"hass",2),h([f()],X.prototype,"_config",2),h([f()],X.prototype,"_drawn",2),X=h([$("silk-gauge-card")],X);P("silk-gauge-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var je={type:"silk-climate-card",name:"Silk Climate",description:"A compact thermostat: current, target, and modes in one block."},Ue=2,Vi=800,De=2e3,Bi={heat:"mdi:fire",cool:"mdi:snowflake",heat_cool:"mdi:sun-snowflake-variant",auto:"mdi:thermostat-auto",dry:"mdi:water-percent",fan_only:"mdi:fan",off:"mdi:power"};P("silk-climate-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["climate"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function H(r){if(r==null||r==="")return;let i=Number(r);return Number.isFinite(i)?i:void 0}function ze(r){let i=String(r),t=i.indexOf(".");return t<0?0:Math.min(i.length-t-1,2)}function Gt(r){let i=r.replace(/_/g," ");return i.charAt(0).toUpperCase()+i.slice(1)}var U=class extends b{static getStubConfig(i){return{type:"custom:silk-climate-card",entity:Object.keys(i.states).find(e=>e.startsWith("climate."))}}static async getConfigElement(){return document.createElement("silk-climate-card-editor")}setConfig(i){if(!i.entity||E(i.entity)!=="climate")throw new Error("silk-climate-card: `entity` is required and must be a climate entity");this._config=i,this._optTarget=this._optLow=this._optHigh=this._optMode=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),window.clearTimeout(this._modeHoldTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(i){if(!i.has("hass")||!this._config||!this.hass)return;let e=i.get("hass")?.states[this._config.entity],s=this.hass.states[this._config.entity];if(!(!s||s===e)){if(this._sendTimer===void 0){let n=e?.attributes,o=s.attributes;this._optTarget!==void 0&&o.temperature!==n?.temperature&&(this._optTarget=void 0),this._optLow!==void 0&&o.target_temp_low!==n?.target_temp_low&&(this._optLow=void 0),this._optHigh!==void 0&&o.target_temp_high!==n?.target_temp_high&&(this._optHigh=void 0)}this._optMode!==void 0&&s.state!==e?.state&&(this._optMode=void 0)}}render(){let i=this._config,t=this.hass;if(!i||!t)return u;let e=t.states[i.entity];if(!e)return l`<ha-card><div class="warning">Entity not found: ${i.entity}</div></ha-card>`;let s=y(e),n=this._optMode!==void 0&&this._optMode!==e.state?{...e,state:this._optMode}:e,o=k(n,i.color),c=i.name??e.attributes.friendly_name??i.entity,a=I(t,n),d=e.attributes.hvac_action,p=d?Gt(d):void 0,m=p!==void 0&&p.toLowerCase()!==a.toLowerCase(),g=H(e.attributes.current_temperature),v=t.config?.unit_system?.temperature??"\xB0";return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!s&&S(n)?"on":""}"
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${i.icon?l`<ha-icon .icon=${i.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${n}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${c}</div>
            <div class="state">
              ${a}${m?l`<span class="sep">·</span>${p}`:u}
            </div>
          </div>
          <div class="trailing hero">
            ${g!==void 0?l`<span class="current">${this._formatCurrent(g)}</span
                  ><span class="degree">${v}</span>`:u}
          </div>
        </div>
        <div class="row controls">
          ${this._renderSteppers(e,s)} ${this._renderModes(e,s)}
        </div>
      </ha-card>
    `}_renderSteppers(i,t){let e=i.attributes,s=ze(H(e.target_temp_step)??.5);if(R(i,Ue)){let o=this._optLow??H(e.target_temp_low),c=this._optHigh??H(e.target_temp_high);return l`
        ${this._renderStepper("low",o,s,t)}
        ${this._renderStepper("high",c,s,t)}
      `}let n=this._optTarget??H(e.temperature);return this._renderStepper("target",n,s,t)}_renderStepper(i,t,e,s){let n=i==="low"?"lower target":i==="high"?"upper target":"target";return l`
      <div class="stepper">
        <button
          class="step"
          ?disabled=${s}
          aria-label="Decrease ${n} temperature"
          @click=${o=>this._onStep(o,i,-1)}
        >
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
        <span class="value target">${t!==void 0?t.toFixed(e):"\u2013"}</span>
        <button
          class="step"
          ?disabled=${s}
          aria-label="Increase ${n} temperature"
          @click=${o=>this._onStep(o,i,1)}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
      </div>
    `}_renderModes(i,t){let e=i.attributes.hvac_modes;if(!e?.length)return u;let s=this._optMode??i.state;return l`
      <div class="modes">
        ${e.map(n=>l`
            <button
              class="chip mode ${n===s?"active":""}"
              ?disabled=${t}
              aria-label=${Gt(n)}
              title=${Gt(n)}
              @click=${o=>this._onMode(o,n)}
            >
              <ha-icon .icon=${Bi[n]??"mdi:thermostat"}></ha-icon>
            </button>
          `)}
      </div>
    `}_formatCurrent(i){return String(Math.round(i*10)/10)}_onCardClick(){this._config&&C(this,this._config.entity)}_onIconClick(i){i.stopPropagation(),this._config&&C(this,this._config.entity)}_onStep(i,t,e){i.stopPropagation();let s=this.hass,n=this._config?s?.states[this._config.entity]:void 0;if(!s||!n||y(n))return;let o=n.attributes,c=H(o.target_temp_step)??.5,a=ze(c),d=H(o.min_temp)??7,p=H(o.max_temp)??35,m=H(o.current_temperature)??(d+p)/2,g=(v,M,G)=>Number(O(v+e*c,M,G).toFixed(a));if(t==="low"){let v=this._optHigh??H(o.target_temp_high)??p,M=this._optLow??H(o.target_temp_low)??m;this._optLow=g(M,d,v)}else if(t==="high"){let v=this._optLow??H(o.target_temp_low)??d,M=this._optHigh??H(o.target_temp_high)??m;this._optHigh=g(M,v,p)}else{let v=this._optTarget??H(o.temperature)??m;this._optTarget=g(v,d,p)}x(this,"selection"),window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},Vi)}_commit(){let i=this.hass,t=this._config?.entity,e=t?i?.states[t]:void 0;if(!i||!t||!e)return;let s=e.attributes,n={entity_id:t};if(R(e,Ue)){let o=this._optLow??H(s.target_temp_low),c=this._optHigh??H(s.target_temp_high);if(o===void 0||c===void 0)return;n.target_temp_low=o,n.target_temp_high=c}else{let o=this._optTarget??H(s.temperature);if(o===void 0)return;n.temperature=o}i.callService("climate","set_temperature",n),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optTarget=this._optLow=this._optHigh=void 0},De)):this._optTarget=this._optLow=this._optHigh=void 0}_onMode(i,t){i.stopPropagation();let e=this.hass,s=this._config?.entity,n=s?e?.states[s]:void 0;!e||!s||!n||y(n)||(this._optMode??n.state)!==t&&(this._optMode=t,x(this),e.callService("climate","set_hvac_mode",{entity_id:s,hvac_mode:t}),window.clearTimeout(this._modeHoldTimer),this._modeHoldTimer=window.setTimeout(()=>{this._optMode=void 0},De))}};U.styles=[A,w`
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
    `],h([_({attribute:!1})],U.prototype,"hass",2),h([f()],U.prototype,"_config",2),h([f()],U.prototype,"_optTarget",2),h([f()],U.prototype,"_optLow",2),h([f()],U.prototype,"_optHigh",2),h([f()],U.prototype,"_optMode",2),U=h([$("silk-climate-card")],U);var qe={type:"silk-cover-card",name:"Silk Cover",description:"Blinds with drag-anywhere position and an honest stop button."},Gi=1,Wi=2,Yi=4,Ki=8,Xi=2e3,Ve="silk-cover-card-editor";P(Ve,[{name:"entity",required:!0,selector:{entity:{domain:["cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_buttons",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_buttons:"Show open / stop / close buttons"},{show_buttons:!0});var J=class extends b{constructor(){super(...arguments);this._localPos=null}static getStubConfig(t){return{type:"custom:silk-cover-card",entity:Object.keys(t.states).find(s=>s.startsWith("cover."))}}static async getConfigElement(){return document.createElement(Ve)}setConfig(t){if(!t.entity||E(t.entity)!=="cover")throw new Error("silk-cover-card: define a cover `entity` (e.g. cover.living_room_blinds)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let s=this._lastUpdated===void 0;this._lastUpdated=e,!s&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._localPos=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._localPos=null},Xi)}_realPosition(t){let e=t.attributes.current_position;return typeof e=="number"&&Number.isFinite(e)?O(e,0,100):void 0}_onIconClick(t){t.stopPropagation(),!(!this.hass||!this._config)&&(y(this.hass.states[this._config.entity])||(z(this.hass,this._config.entity),x(this)))}_onCardClick(){this._config&&C(this,this._config.entity)}_onSlide(t){this._localPos=Math.round(t.detail.value)}_onSlideChange(t){if(!this.hass||!this._config)return;let e=O(Math.round(t.detail.value),0,100);this._localPos=e,this._armExpiry(),this.hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e}),x(this)}_callCover(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(this._clearOptimistic(),this.hass.callService("cover",e,{entity_id:this._config.entity}),x(this))}render(){if(!this.hass||!this._config)return u;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=y(t),s=S(t),n=k(t,this._config.color),o=this._config.name??t.attributes.friendly_name??t.entity_id,c=this._realPosition(t),a=this._localPos??c,d=R(t,Yi)&&!e;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${d?u:this._onCardClick}
      >
        ${d?l`
              <silk-slider
                fill
                .value=${a??(t.state==="closed"?0:100)}
                .min=${0}
                .max=${100}
                .step=${1}
                @slide=${this._onSlide}
                @change=${this._onSlideChange}
              ></silk-slider>
            `:u}
        <button
          class="icon ${s?"on":""}"
          ?disabled=${e}
          aria-label="Toggle ${o}"
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${o}</div>
          <div class="state">
            ${I(this.hass,t)}${!e&&a!==void 0?l`<span class="sep">·</span>${a}%`:u}
          </div>
        </div>
        ${this._config.show_buttons!==!1?this._renderButtons(t,e,a):u}
      </ha-card>
    `}_renderButtons(t,e,s){let n=R(t,Gi),o=R(t,Ki),c=R(t,Wi);if(!n&&!o&&!c)return u;let a=s!==void 0?s>=100:t.state==="open",d=s!==void 0?s<=0:t.state==="closed";return l`
      <div class="trailing">
        ${n?l`
              <button
                class="ctl"
                ?disabled=${e||a}
                aria-label="Open cover"
                @click=${p=>this._callCover(p,"open_cover")}
              >
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </button>
            `:u}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Stop cover"
                @click=${p=>this._callCover(p,"stop_cover")}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `:u}
        ${c?l`
              <button
                class="ctl"
                ?disabled=${e||d}
                aria-label="Close cover"
                @click=${p=>this._callCover(p,"close_cover")}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `:u}
      </div>
    `}};J.styles=[A,w`
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
    `],h([_({attribute:!1})],J.prototype,"hass",2),h([f()],J.prototype,"_config",2),h([f()],J.prototype,"_localPos",2),J=h([$("silk-cover-card")],J);var Be={type:"silk-fan-card",name:"Silk Fan",description:"Speed at your fingertips, with an icon that actually spins."},Ji=1,Qi=8,Zi=3,ts=2e3;P("silk-fan-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["fan"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var D=class extends b{static getStubConfig(i){return{type:"custom:silk-fan-card",entity:Object.keys(i.states).find(e=>e.startsWith("fan."))}}static async getConfigElement(){return document.createElement("silk-fan-card-editor")}setConfig(i){if(!i.entity)throw new Error("silk-fan-card: `entity` is required");if(E(i.entity)!=="fan")throw new Error(`silk-fan-card: \`entity\` must be a fan.* entity, got \`${i.entity}\``);this._config=i,this._dragPct=void 0,this._lastUpdated=void 0,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optTimer),this._optTimer=void 0}willUpdate(i){if(!i.has("hass")||!this._config)return;let t=this.hass?.states[this._config.entity]?.last_updated;if(t&&t!==this._lastUpdated){let e=this._lastUpdated!==void 0;this._lastUpdated=t,e&&this._clearOptimistic()}}_rawPct(i){let t=i.attributes.percentage;return typeof t=="number"&&Number.isFinite(t)?t:void 0}_effectivePct(i){return this._dragPct??this._optPct??this._rawPct(i)}_effectiveOn(i){return this._dragPct!==void 0?this._dragPct>0:this._optOn??S(i)}_setOptimistic(i){i.on!==void 0&&(this._optOn=i.on),i.pct!==void 0&&(this._optPct=i.pct),i.preset!==void 0&&(this._optPreset=i.preset),window.clearTimeout(this._optTimer),this._optTimer=window.setTimeout(()=>this._clearOptimistic(),ts)}_clearOptimistic(){window.clearTimeout(this._optTimer),this._optTimer=void 0,this._optOn=void 0,this._optPct=void 0,this._optPreset=void 0}_onIconClick(i){if(i.stopPropagation(),!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||y(t))return;let e=!this._effectiveOn(t);z(this.hass,this._config.entity),this._setOptimistic(e?{on:!0}:{on:!1,pct:0}),x(this)}_onSlide(i){this._dragPct=i.detail.value}_onSliderChange(i){let t=i.detail.value;if(this._dragPct=void 0,!this.hass||!this._config)return;let e=this._config.entity;t<=0?(this.hass.callService("fan","turn_off",{entity_id:e}),this._setOptimistic({on:!1,pct:0})):(this.hass.callService("fan","set_percentage",{entity_id:e,percentage:t}),this._setOptimistic({on:!0,pct:t})),x(this)}_onPresetClick(i,t){i.stopPropagation(),!(!this.hass||!this._config)&&(this.hass.callService("fan","set_preset_mode",{entity_id:this._config.entity,preset_mode:t}),this._setOptimistic({preset:t}),x(this))}_onCardClick(i){i.target.localName!=="silk-slider"&&this._config&&C(this,this._config.entity)}render(){if(!this._config||!this.hass)return u;let i=this._config,t=this.hass.states[i.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${i.entity}</div></ha-card>`;let e=y(t),s=!e&&this._effectiveOn(t),n=this._effectivePct(t),o=R(t,Ji),c=i.name??t.attributes.friendly_name??i.entity,a=s&&(n===void 0||n>0),d=O(3.5-(n??50)*.03,.6,3.5),p=R(t,Qi)?(t.attributes.preset_modes??[]).slice(0,Zi):[],m=this._optPreset??t.attributes.preset_mode;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${k(t,i.color)}"
        @click=${this._onCardClick}
      >
        ${o?l`
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
            `:u}
        <button
          class="icon ${s?"on":""}"
          .disabled=${e}
          aria-label=${s?`Turn off ${c}`:`Turn on ${c}`}
          @click=${this._onIconClick}
        >
          <span
            class="blades ${a?"spinning":""}"
            style=${a?`animation-duration:${d.toFixed(2)}s`:u}
          >
            ${i.icon?l`<ha-icon .icon=${i.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
          </span>
        </button>
        <div class="info">
          <div class="name">${c}</div>
          <div class="state">${this._renderStateLine(t,s,n,o)}</div>
        </div>
        ${p.length?l`
              <div class="trailing">
                ${p.map(g=>l`
                    <button
                      class="chip ${g===m?"active":""}"
                      .disabled=${e}
                      @click=${v=>this._onPresetClick(v,g)}
                    >
                      ${g}
                    </button>
                  `)}
              </div>
            `:u}
      </ha-card>
    `}_renderStateLine(i,t,e,s){let o=(this._dragPct!==void 0||this._optOn!==void 0)&&!y(i)?t?"On":"Off":I(this.hass,i),c=s&&t&&e!==void 0&&e>0;return l`${o}${c?l`<span class="sep">·</span>${Math.round(e)}%`:u}`}};D.styles=[A,w`
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
    `],h([_({attribute:!1})],D.prototype,"hass",2),h([f()],D.prototype,"_config",2),h([f()],D.prototype,"_dragPct",2),h([f()],D.prototype,"_optOn",2),h([f()],D.prototype,"_optPct",2),h([f()],D.prototype,"_optPreset",2),D=h([$("silk-fan-card")],D);var Ge={type:"silk-button-card",name:"Silk Button",description:"Scenes and scripts that feel like real buttons."},Wt=["scene","script","button","input_button"],es={scene:"mdi:palette",script:"mdi:script-text",button:"mdi:gesture-tap-button",input_button:"mdi:gesture-tap-button"};P("silk-button-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:[...Wt]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Confirm before running"});var Q=class extends b{constructor(){super(...arguments);this._optimisticRunning=!1}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-button-card",entity:e.find(n=>n.startsWith("scene."))??e.find(n=>n.startsWith("script."))}}static async getConfigElement(){return document.createElement("silk-button-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-button-card: `entity` is required");let e=E(t.entity);if(!Wt.includes(e))throw new Error(`silk-button-card: entity must be one of ${Wt.join("/")}, got \`${e}\``);this._config=t,this._optimisticRunning=!1}getCardSize(){return 1}getGridOptions(){return{columns:3,rows:1,min_columns:2,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){t.has("hass")&&this._optimisticRunning&&this._stateObj?.state==="on"&&this._clearOptimistic()}get _stateObj(){let t=this._config?.entity;return t?this.hass?.states[t]:void 0}_isUnavailable(t){return!t||t.state==="unavailable"}_isRunning(t){return!this._config||E(this._config.entity)!=="script"?!1:t?.state==="on"||this._optimisticRunning}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticRunning=!1}_onPress(){let t=this._config,e=this.hass;if(!t||!e||this._isUnavailable(this._stateObj))return;let s=t.name??this._stateObj?.attributes.friendly_name??t.entity;if(t.confirm&&!window.confirm(`Run "${s}"?`))return;let n=E(t.entity),o=n==="button"||n==="input_button"?"press":"turn_on";e.callService(n,o,{entity_id:t.entity}),x(this),this._flash(),n==="script"&&(this._optimisticRunning=!0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>{this._optimisticTimer=void 0,this._optimisticRunning=!1},2e3))}_onKeydown(t){t.repeat||t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._onPress())}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_renderIcon(t,e){if(e)return l`<ha-icon class="spin" icon="mdi:loading"></ha-icon>`;if(this._config?.icon)return l`<ha-icon .icon=${this._config.icon}></ha-icon>`;if(t)return l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`;let s=E(this._config?.entity??"");return l`<ha-icon .icon=${es[s]??"mdi:gesture-tap"}></ha-icon>`}render(){let t=this._config;if(!t)return u;let e=this._stateObj;if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let s=this._isUnavailable(e),n=this._isRunning(e),o=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${s?"unavailable":""}"
        style="--silk-accent:${k(e,t.color)}"
        role="button"
        tabindex=${s?-1:0}
        aria-label=${o}
        @click=${this._onPress}
        @keydown=${this._onKeydown}
      >
        <div class="flash"></div>
        <div class="icon ${S(e)||n?"on":""}">
          ${this._renderIcon(e,n)}
        </div>
        <div class="info"><div class="name">${o}</div></div>
      </ha-card>
    `}};Q.styles=[A,w`
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
    `],h([_({attribute:!1})],Q.prototype,"hass",2),h([f()],Q.prototype,"_config",2),h([f()],Q.prototype,"_optimisticRunning",2),Q=h([$("silk-button-card")],Q);var Ye={type:"silk-media-card",name:"Silk Media",description:"Artwork-first now playing with honest controls."},is=1,We=4,ss=16,ns=32,rs=16384,os=2e3,Ke="silk-media-card-editor";P(Ke,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_volume",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_volume:"Show volume slider"},{show_volume:!0});function Yt(r,i){let t=r.attributes[i];return typeof t=="string"&&t?t:void 0}var B=class extends b{constructor(){super(...arguments);this._optimisticPlaying=null;this._optimisticVolume=null}static getStubConfig(t){return{type:"custom:silk-media-card",entity:Object.keys(t.states).find(s=>s.startsWith("media_player."))}}static async getConfigElement(){return document.createElement(Ke)}setConfig(t){if(!t.entity||E(t.entity)!=="media_player")throw new Error("silk-media-card: define a media_player `entity` (e.g. media_player.living_room)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return this._showsVolume()?2:1}getGridOptions(){return{columns:6,rows:this._showsVolume()?2:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let s=this._lastUpdated===void 0;this._lastUpdated=e,!s&&this._expiryTimer!==void 0&&this._clearOptimistic()}_showsVolume(){if(this._config?.show_volume===!1)return!1;let t=this._config?this.hass?.states[this._config.entity]:void 0;return t?R(t,We):!0}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null},os)}_onLeadingClick(t){t.stopPropagation(),this._config&&C(this,this._config.entity)}_onCardClick(){this._config&&C(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onPlayPause(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(!e||y(e))return;let s=this._optimisticPlaying??e.state==="playing";this._optimisticPlaying=!s,this._armExpiry(),this.hass.callService("media_player","media_play_pause",{entity_id:this._config.entity}),x(this)}_onSkip(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(y(this.hass.states[this._config.entity])||(this.hass.callService("media_player",e,{entity_id:this._config.entity}),x(this)))}_onVolumeChange(t){if(!this.hass||!this._config)return;let e=O(Math.round(t.detail.value),0,100);this._optimisticVolume=e,this._armExpiry(),this.hass.callService("media_player","volume_set",{entity_id:this._config.entity,volume_level:e/100}),x(this)}_volumePct(t){if(this._optimisticVolume!==null)return this._optimisticVolume;let e=t.attributes.volume_level;return typeof e=="number"&&Number.isFinite(e)?Math.round(O(e,0,1)*100):0}render(){if(!this.hass||!this._config)return u;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=y(t),s=S(t),n=k(t,this._config.color),o=e?void 0:Yt(t,"entity_picture"),c=Yt(t,"media_title")??this._config.name??t.attributes.friendly_name??t.entity_id,a=t.state==="playing",d=e?!1:this._optimisticPlaying??a,p=Yt(t,"media_artist")??(e||d===a?I(this.hass,t):d?"Playing":"Paused"),m=this._config.show_volume!==!1&&R(t,We);return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${this._onCardClick}
      >
        <div class="row">
          ${o?l`
                <button class="artwork" aria-label="Show details for ${c}" @click=${this._onLeadingClick}>
                  <img src=${o} alt="" />
                </button>
              `:l`
                <button
                  class="icon ${s?"on":""}"
                  aria-label="Show details for ${c}"
                  @click=${this._onLeadingClick}
                >
                  ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`}
                </button>
              `}
          <div class="info">
            <div class="name">${c}</div>
            <div class="state">${p}</div>
          </div>
          ${this._renderControls(t,e,d)}
        </div>
        ${m?l`
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
            `:u}
      </ha-card>
    `}_renderControls(t,e,s){let n=R(t,ss),o=R(t,is)||R(t,rs),c=R(t,ns);return!n&&!o&&!c?u:l`
      <div class="trailing">
        ${n?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Previous track"
                @click=${a=>this._onSkip(a,"media_previous_track")}
              >
                <ha-icon icon="mdi:skip-previous"></ha-icon>
              </button>
            `:u}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label=${s?"Pause":"Play"}
                @click=${this._onPlayPause}
              >
                <ha-icon icon=${s?"mdi:pause":"mdi:play"}></ha-icon>
              </button>
            `:u}
        ${c?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Next track"
                @click=${a=>this._onSkip(a,"media_next_track")}
              >
                <ha-icon icon="mdi:skip-next"></ha-icon>
              </button>
            `:u}
      </div>
    `}};B.styles=[A,w`
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
    `],h([_({attribute:!1})],B.prototype,"hass",2),h([f()],B.prototype,"_config",2),h([f()],B.prototype,"_optimisticPlaying",2),h([f()],B.prototype,"_optimisticVolume",2),B=h([$("silk-media-card")],B);var Je={type:"silk-room-card",name:"Silk Room",description:"A room at a glance: climate, activity, and quick controls."},Qe="silk-room-card-editor";P(Qe,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"navigation_path",selector:{text:{}}}],{name:"Name",icon:"Icon",navigation_path:"Navigation path"},{icon:"mdi:sofa"});var Xe="mdi:sofa",as=3,cs=4,ls=2e3;function ds(r){return typeof r!="string"||!r?"":r==="\xB0C"||r==="\xB0F"?"\xB0":r}function hs(r,i){switch(r){case"lock":return i?"unlocked":"locked";case"cover":case"valve":return i?"open":"closed";default:return i?"on":"off"}}var Z=class extends b{constructor(){super(...arguments);this._optimistic={};this._sensors=[];this._toggles=[];this._countIds=[];this._optimisticBase={};this._optimisticTimers={}}static getStubConfig(){return{type:"custom:silk-room-card",name:"Living room",icon:Xe}}static async getConfigElement(){return document.createElement(Qe)}setConfig(t){if(!t.name)throw new Error("silk-room-card: `name` is required");this._config=t,this._sensors=(t.sensors??[]).slice(0,as),this._toggles=(t.toggles??[]).slice(0,cs),this._countIds=t.count_active??[],this._clearAllOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._optimistic)){let s=this.hass.states[e];s&&s.last_updated!==this._optimisticBase[e]&&this._clearOptimistic(e)}}_clearOptimistic(t){if(window.clearTimeout(this._optimisticTimers[t]),delete this._optimisticTimers[t],delete this._optimisticBase[t],t in this._optimistic){let e={...this._optimistic};delete e[t],this._optimistic=e}}_clearAllOptimistic(){for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={},this._optimisticBase={},this._optimistic={}}_displayActive(t){let e=this._optimistic[t];return e!==void 0?e:S(this.hass?.states[t])}_onCardClick(){let t=this._config;if(!t)return;if(t.navigation_path){history.pushState(null,"",t.navigation_path),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}));return}let e=this._sensors[0]??this._toggles[0];e&&C(this,e)}_onToggleClick(t,e){t.stopPropagation();let s=this.hass;if(!s)return;let n=s.states[e];!n||y(n)||(x(this),this._optimistic={...this._optimistic,[e]:!S(n)},this._optimisticBase[e]=n.last_updated,window.clearTimeout(this._optimisticTimers[e]),this._optimisticTimers[e]=window.setTimeout(()=>this._clearOptimistic(e),ls),z(s,e))}_sensorSegments(){let t=this.hass,e=[];for(let s of this._sensors){let n=t.states[s];if(!n)continue;let o=Number(n.state),c=Number.isFinite(o)?ds(n.attributes.unit_of_measurement):"";e.push(l`<span class="reading">${Y(t,s,o)}${c}</span>`)}return e}_activeCount(){let t=0;for(let e of this._countIds)this._displayActive(e)&&t++;return t}_renderToggle(t){let e=this.hass,s=e.states[t],n=!s||y(s),o=this._optimistic[t],c=o??S(s),a=s&&o!==void 0?{...s,state:hs(E(t),o)}:s,d=s?.attributes.friendly_name??t;return l`
      <button
        class="tbtn ${c?"on":""}"
        style="--silk-accent:${k(a)}"
        .disabled=${n}
        aria-label=${`Toggle ${d}`}
        aria-pressed=${c?"true":"false"}
        @click=${p=>this._onToggleClick(p,t)}
      >
        ${a?l`<ha-state-icon .hass=${e} .stateObj=${a}></ha-state-icon>`:l`<ha-icon icon="mdi:help-circle-outline"></ha-icon>`}
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return u;let s=this._toggles.length?e.states[this._toggles[0]]:void 0,n=k(s,t.color),o=this._countIds.length?this._activeCount():0,c=o>0||this._toggles.some(d=>this._displayActive(d)),a=[];for(let d of this._sensorSegments())a.length&&a.push(l`<span class="sep">·</span>`),a.push(d);return this._countIds.length&&(a.length&&a.push(l`<span class="sep">·</span>`),a.push(l`<span class="count ${o>0?"on":""}">${o} on</span>`)),l`
      <ha-card class="control" style="--silk-accent:${n}" @click=${this._onCardClick}>
        <div class="icon ${c?"on":""}">
          <ha-icon .icon=${t.icon??Xe}></ha-icon>
        </div>
        <div class="info">
          <div class="name">${t.name}</div>
          ${a.length?l`<div class="state">${a}</div>`:u}
        </div>
        ${this._toggles.length?l`<div class="trailing">${this._toggles.map(d=>this._renderToggle(d))}</div>`:u}
      </ha-card>
    `}};Z.styles=[A,w`
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
    `],h([_({attribute:!1})],Z.prototype,"hass",2),h([f()],Z.prototype,"_config",2),h([f()],Z.prototype,"_optimistic",2),Z=h([$("silk-room-card")],Z);var us="0.2.0",Ze=[xe,Te,Ce,Pe,Re,je,qe,Be,Ge,Ye,Je];window.customCards=window.customCards||[];for(let r of Ze)window.customCards.push({...r,preview:!0,documentationURL:"https://github.com/LeeHueeng/silk-card"});console.info(`%c SILK %c v${us} \xB7 ${Ze.length} cards `,"background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0 2px 4px;font-weight:700","background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px 2px 0");
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

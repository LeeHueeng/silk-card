var Ip=Object.defineProperty;var Fp=Object.getOwnPropertyDescriptor;var p=(a,s,t,e)=>{for(var i=e>1?void 0:e?Fp(s,t):s,n=a.length-1,r;n>=0;n--)(r=a[n])&&(i=(e?r(s,t,i):r(i))||i);return e&&i&&Ip(s,t,i),i};var Xi=globalThis,Zi=Xi.ShadowRoot&&(Xi.ShadyCSS===void 0||Xi.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Kn=Symbol(),ar=new WeakMap,Ni=class{constructor(s,t,e){if(this._$cssResult$=!0,e!==Kn)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=s,this.t=t}get styleSheet(){let s=this.o,t=this.t;if(Zi&&s===void 0){let e=t!==void 0&&t.length===1;e&&(s=ar.get(t)),s===void 0&&((this.o=s=new CSSStyleSheet).replaceSync(this.cssText),e&&ar.set(t,s))}return s}toString(){return this.cssText}},cr=a=>new Ni(typeof a=="string"?a:a+"",void 0,Kn),k=(a,...s)=>{let t=a.length===1?a[0]:s.reduce((e,i,n)=>e+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+a[n+1],a[0]);return new Ni(t,a,Kn)},lr=(a,s)=>{if(Zi)a.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of s){let e=document.createElement("style"),i=Xi.litNonce;i!==void 0&&e.setAttribute("nonce",i),e.textContent=t.cssText,a.appendChild(e)}},Yn=Zi?a=>a:a=>a instanceof CSSStyleSheet?(s=>{let t="";for(let e of s.cssRules)t+=e.cssText;return cr(t)})(a):a;var{is:Dp,defineProperty:zp,getOwnPropertyDescriptor:Up,getOwnPropertyNames:jp,getOwnPropertySymbols:Vp,getPrototypeOf:qp}=Object,Qi=globalThis,dr=Qi.trustedTypes,Gp=dr?dr.emptyScript:"",Wp=Qi.reactiveElementPolyfillSupport,Li=(a,s)=>a,Ii={toAttribute(a,s){switch(s){case Boolean:a=a?Gp:null;break;case Object:case Array:a=a==null?a:JSON.stringify(a)}return a},fromAttribute(a,s){let t=a;switch(s){case Boolean:t=a!==null;break;case Number:t=a===null?null:Number(a);break;case Object:case Array:try{t=JSON.parse(a)}catch{t=null}}return t}},Ji=(a,s)=>!Dp(a,s),pr={attribute:!0,type:String,converter:Ii,reflect:!1,useDefault:!1,hasChanged:Ji};Symbol.metadata??=Symbol("metadata"),Qi.litPropertyMetadata??=new WeakMap;var Vt=class extends HTMLElement{static addInitializer(s){this._$Ei(),(this.l??=[]).push(s)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(s,t=pr){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(s)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(s,t),!t.noAccessor){let e=Symbol(),i=this.getPropertyDescriptor(s,e,t);i!==void 0&&zp(this.prototype,s,i)}}static getPropertyDescriptor(s,t,e){let{get:i,set:n}=Up(this.prototype,s)??{get(){return this[t]},set(r){this[t]=r}};return{get:i,set(r){let o=i?.call(this);n?.call(this,r),this.requestUpdate(s,o,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(s){return this.elementProperties.get(s)??pr}static _$Ei(){if(this.hasOwnProperty(Li("elementProperties")))return;let s=qp(this);s.finalize(),s.l!==void 0&&(this.l=[...s.l]),this.elementProperties=new Map(s.elementProperties)}static finalize(){if(this.hasOwnProperty(Li("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(Li("properties"))){let t=this.properties,e=[...jp(t),...Vp(t)];for(let i of e)this.createProperty(i,t[i])}let s=this[Symbol.metadata];if(s!==null){let t=litPropertyMetadata.get(s);if(t!==void 0)for(let[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(let[t,e]of this.elementProperties){let i=this._$Eu(t,e);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(s){let t=[];if(Array.isArray(s)){let e=new Set(s.flat(1/0).reverse());for(let i of e)t.unshift(Yn(i))}else s!==void 0&&t.push(Yn(s));return t}static _$Eu(s,t){let e=t.attribute;return e===!1?void 0:typeof e=="string"?e:typeof s=="string"?s.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(s=>this.enableUpdating=s),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(s=>s(this))}addController(s){(this._$EO??=new Set).add(s),this.renderRoot!==void 0&&this.isConnected&&s.hostConnected?.()}removeController(s){this._$EO?.delete(s)}_$E_(){let s=new Map,t=this.constructor.elementProperties;for(let e of t.keys())this.hasOwnProperty(e)&&(s.set(e,this[e]),delete this[e]);s.size>0&&(this._$Ep=s)}createRenderRoot(){let s=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return lr(s,this.constructor.elementStyles),s}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(s=>s.hostConnected?.())}enableUpdating(s){}disconnectedCallback(){this._$EO?.forEach(s=>s.hostDisconnected?.())}attributeChangedCallback(s,t,e){this._$AK(s,e)}_$ET(s,t){let e=this.constructor.elementProperties.get(s),i=this.constructor._$Eu(s,e);if(i!==void 0&&e.reflect===!0){let n=(e.converter?.toAttribute!==void 0?e.converter:Ii).toAttribute(t,e.type);this._$Em=s,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(s,t){let e=this.constructor,i=e._$Eh.get(s);if(i!==void 0&&this._$Em!==i){let n=e.getPropertyOptions(i),r=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:Ii;this._$Em=i;let o=r.fromAttribute(t,n.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(s,t,e,i=!1,n){if(s!==void 0){let r=this.constructor;if(i===!1&&(n=this[s]),e??=r.getPropertyOptions(s),!((e.hasChanged??Ji)(n,t)||e.useDefault&&e.reflect&&n===this._$Ej?.get(s)&&!this.hasAttribute(r._$Eu(s,e))))return;this.C(s,t,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(s,t,{useDefault:e,reflect:i,wrapped:n},r){e&&!(this._$Ej??=new Map).has(s)&&(this._$Ej.set(s,r??t??this[s]),n!==!0||r!==void 0)||(this._$AL.has(s)||(this.hasUpdated||e||(t=void 0),this._$AL.set(s,t)),i===!0&&this._$Em!==s&&(this._$Eq??=new Set).add(s))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let s=this.scheduleUpdate();return s!=null&&await s,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[i,n]of e){let{wrapped:r}=n,o=this[i];r!==!0||this._$AL.has(i)||o===void 0||this.C(i,void 0,n,o)}}let s=!1,t=this._$AL;try{s=this.shouldUpdate(t),s?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(e){throw s=!1,this._$EM(),e}s&&this._$AE(t)}willUpdate(s){}_$AE(s){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(s)),this.updated(s)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(s){return!0}update(s){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(s){}firstUpdated(s){}};Vt.elementStyles=[],Vt.shadowRootOptions={mode:"open"},Vt[Li("elementProperties")]=new Map,Vt[Li("finalized")]=new Map,Wp?.({ReactiveElement:Vt}),(Qi.reactiveElementVersions??=[]).push("2.1.2");var Zn=globalThis,mr=a=>a,tn=Zn.trustedTypes,ur=tn?tn.createPolicy("lit-html",{createHTML:a=>a}):void 0,Qn="$lit$",qt=`lit$${Math.random().toFixed(9).slice(2)}$`,Jn="?"+qt,Bp=`<${Jn}>`,ei=document,Di=()=>ei.createComment(""),zi=a=>a===null||typeof a!="object"&&typeof a!="function",ts=Array.isArray,_r=a=>ts(a)||typeof a?.[Symbol.iterator]=="function",Xn=`[ 	
\f\r]`,Fi=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,hr=/-->/g,fr=/>/g,Je=RegExp(`>|${Xn}(?:([^\\s"'>=/]+)(${Xn}*=${Xn}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),gr=/'/g,br=/"/g,yr=/^(?:script|style|textarea|title)$/i,es=a=>(s,...t)=>({_$litType$:a,strings:s,values:t}),l=es(1),j=es(2),v_=es(3),ii=Symbol.for("lit-noChange"),m=Symbol.for("lit-nothing"),vr=new WeakMap,ti=ei.createTreeWalker(ei,129);function wr(a,s){if(!ts(a)||!a.hasOwnProperty("raw"))throw Error("invalid template strings array");return ur!==void 0?ur.createHTML(s):s}var xr=(a,s)=>{let t=a.length-1,e=[],i,n=s===2?"<svg>":s===3?"<math>":"",r=Fi;for(let o=0;o<t;o++){let c=a[o],d,u,g=-1,h=0;for(;h<c.length&&(r.lastIndex=h,u=r.exec(c),u!==null);)h=r.lastIndex,r===Fi?u[1]==="!--"?r=hr:u[1]!==void 0?r=fr:u[2]!==void 0?(yr.test(u[2])&&(i=RegExp("</"+u[2],"g")),r=Je):u[3]!==void 0&&(r=Je):r===Je?u[0]===">"?(r=i??Fi,g=-1):u[1]===void 0?g=-2:(g=r.lastIndex-u[2].length,d=u[1],r=u[3]===void 0?Je:u[3]==='"'?br:gr):r===br||r===gr?r=Je:r===hr||r===fr?r=Fi:(r=Je,i=void 0);let v=r===Je&&a[o+1].startsWith("/>")?" ":"";n+=r===Fi?c+Bp:g>=0?(e.push(d),c.slice(0,g)+Qn+c.slice(g)+qt+v):c+qt+(g===-2?o:v)}return[wr(a,n+(a[t]||"<?>")+(s===2?"</svg>":s===3?"</math>":"")),e]},Ui=class a{constructor({strings:s,_$litType$:t},e){let i;this.parts=[];let n=0,r=0,o=s.length-1,c=this.parts,[d,u]=xr(s,t);if(this.el=a.createElement(d,e),ti.currentNode=this.el.content,t===2||t===3){let g=this.el.content.firstChild;g.replaceWith(...g.childNodes)}for(;(i=ti.nextNode())!==null&&c.length<o;){if(i.nodeType===1){if(i.hasAttributes())for(let g of i.getAttributeNames())if(g.endsWith(Qn)){let h=u[r++],v=i.getAttribute(g).split(qt),_=/([.?@])?(.*)/.exec(h);c.push({type:1,index:n,name:_[2],strings:v,ctor:_[1]==="."?nn:_[1]==="?"?sn:_[1]==="@"?rn:si}),i.removeAttribute(g)}else g.startsWith(qt)&&(c.push({type:6,index:n}),i.removeAttribute(g));if(yr.test(i.tagName)){let g=i.textContent.split(qt),h=g.length-1;if(h>0){i.textContent=tn?tn.emptyScript:"";for(let v=0;v<h;v++)i.append(g[v],Di()),ti.nextNode(),c.push({type:2,index:++n});i.append(g[h],Di())}}}else if(i.nodeType===8)if(i.data===Jn)c.push({type:2,index:n});else{let g=-1;for(;(g=i.data.indexOf(qt,g+1))!==-1;)c.push({type:7,index:n}),g+=qt.length-1}n++}}static createElement(s,t){let e=ei.createElement("template");return e.innerHTML=s,e}};function ni(a,s,t=a,e){if(s===ii)return s;let i=e!==void 0?t._$Co?.[e]:t._$Cl,n=zi(s)?void 0:s._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(a),i._$AT(a,t,e)),e!==void 0?(t._$Co??=[])[e]=i:t._$Cl=i),i!==void 0&&(s=ni(a,i._$AS(a,s.values),i,e)),s}var en=class{constructor(s,t){this._$AV=[],this._$AN=void 0,this._$AD=s,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(s){let{el:{content:t},parts:e}=this._$AD,i=(s?.creationScope??ei).importNode(t,!0);ti.currentNode=i;let n=ti.nextNode(),r=0,o=0,c=e[0];for(;c!==void 0;){if(r===c.index){let d;c.type===2?d=new ki(n,n.nextSibling,this,s):c.type===1?d=new c.ctor(n,c.name,c.strings,this,s):c.type===6&&(d=new on(n,this,s)),this._$AV.push(d),c=e[++o]}r!==c?.index&&(n=ti.nextNode(),r++)}return ti.currentNode=ei,i}p(s){let t=0;for(let e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(s,e,t),t+=e.strings.length-2):e._$AI(s[t])),t++}},ki=class a{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(s,t,e,i){this.type=2,this._$AH=m,this._$AN=void 0,this._$AA=s,this._$AB=t,this._$AM=e,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let s=this._$AA.parentNode,t=this._$AM;return t!==void 0&&s?.nodeType===11&&(s=t.parentNode),s}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(s,t=this){s=ni(this,s,t),zi(s)?s===m||s==null||s===""?(this._$AH!==m&&this._$AR(),this._$AH=m):s!==this._$AH&&s!==ii&&this._(s):s._$litType$!==void 0?this.$(s):s.nodeType!==void 0?this.T(s):_r(s)?this.k(s):this._(s)}O(s){return this._$AA.parentNode.insertBefore(s,this._$AB)}T(s){this._$AH!==s&&(this._$AR(),this._$AH=this.O(s))}_(s){this._$AH!==m&&zi(this._$AH)?this._$AA.nextSibling.data=s:this.T(ei.createTextNode(s)),this._$AH=s}$(s){let{values:t,_$litType$:e}=s,i=typeof e=="number"?this._$AC(s):(e.el===void 0&&(e.el=Ui.createElement(wr(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===i)this._$AH.p(t);else{let n=new en(i,this),r=n.u(this.options);n.p(t),this.T(r),this._$AH=n}}_$AC(s){let t=vr.get(s.strings);return t===void 0&&vr.set(s.strings,t=new Ui(s)),t}k(s){ts(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,e,i=0;for(let n of s)i===t.length?t.push(e=new a(this.O(Di()),this.O(Di()),this,this.options)):e=t[i],e._$AI(n),i++;i<t.length&&(this._$AR(e&&e._$AB.nextSibling,i),t.length=i)}_$AR(s=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);s!==this._$AB;){let e=mr(s).nextSibling;mr(s).remove(),s=e}}setConnected(s){this._$AM===void 0&&(this._$Cv=s,this._$AP?.(s))}},si=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(s,t,e,i,n){this.type=1,this._$AH=m,this._$AN=void 0,this.element=s,this.name=t,this._$AM=i,this.options=n,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=m}_$AI(s,t=this,e,i){let n=this.strings,r=!1;if(n===void 0)s=ni(this,s,t,0),r=!zi(s)||s!==this._$AH&&s!==ii,r&&(this._$AH=s);else{let o=s,c,d;for(s=n[0],c=0;c<n.length-1;c++)d=ni(this,o[e+c],t,c),d===ii&&(d=this._$AH[c]),r||=!zi(d)||d!==this._$AH[c],d===m?s=m:s!==m&&(s+=(d??"")+n[c+1]),this._$AH[c]=d}r&&!i&&this.j(s)}j(s){s===m?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,s??"")}},nn=class extends si{constructor(){super(...arguments),this.type=3}j(s){this.element[this.name]=s===m?void 0:s}},sn=class extends si{constructor(){super(...arguments),this.type=4}j(s){this.element.toggleAttribute(this.name,!!s&&s!==m)}},rn=class extends si{constructor(s,t,e,i,n){super(s,t,e,i,n),this.type=5}_$AI(s,t=this){if((s=ni(this,s,t,0)??m)===ii)return;let e=this._$AH,i=s===m&&e!==m||s.capture!==e.capture||s.once!==e.once||s.passive!==e.passive,n=s!==m&&(e===m||i);i&&this.element.removeEventListener(this.name,this,e),n&&this.element.addEventListener(this.name,this,s),this._$AH=s}handleEvent(s){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,s):this._$AH.handleEvent(s)}},on=class{constructor(s,t,e){this.element=s,this.type=6,this._$AN=void 0,this._$AM=t,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(s){ni(this,s)}},kr={M:Qn,P:qt,A:Jn,C:1,L:xr,R:en,D:_r,V:ni,I:ki,H:si,N:sn,U:rn,B:nn,F:on},Kp=Zn.litHtmlPolyfillSupport;Kp?.(Ui,ki),(Zn.litHtmlVersions??=[]).push("3.3.3");var $r=(a,s,t)=>{let e=t?.renderBefore??s,i=e._$litPart$;if(i===void 0){let n=t?.renderBefore??null;e._$litPart$=i=new ki(s.insertBefore(Di(),n),n,void 0,t??{})}return i._$AI(a),i};var is=globalThis,w=class extends Vt{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let s=super.createRenderRoot();return this.renderOptions.renderBefore??=s.firstChild,s}update(s){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(s),this._$Do=$r(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return ii}};w._$litElement$=!0,w.finalized=!0,is.litElementHydrateSupport?.({LitElement:w});var Yp=is.litElementPolyfillSupport;Yp?.({LitElement:w});(is.litElementVersions??=[]).push("4.2.2");var x=a=>(s,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(a,s)}):customElements.define(a,s)};var Xp={attribute:!0,type:String,converter:Ii,reflect:!1,hasChanged:Ji},Zp=(a=Xp,s,t)=>{let{kind:e,metadata:i}=t,n=globalThis.litPropertyMetadata.get(i);if(n===void 0&&globalThis.litPropertyMetadata.set(i,n=new Map),e==="setter"&&((a=Object.create(a)).wrapped=!0),n.set(t.name,a),e==="accessor"){let{name:r}=t;return{set(o){let c=s.get.call(this);s.set.call(this,o),this.requestUpdate(r,c,a,!0,o)},init(o){return o!==void 0&&this.C(r,void 0,a,o),o}}}if(e==="setter"){let{name:r}=t;return function(o){let c=this[r];s.call(this,o),this.requestUpdate(r,c,a,!0,o)}}throw Error("Unsupported decorator location: "+e)};function y(a){return(s,t)=>typeof t=="object"?Zp(a,s,t):((e,i,n)=>{let r=i.hasOwnProperty(n);return i.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(i,n):void 0})(a,s,t)}function f(a){return y({...a,state:!0,attribute:!1})}var ri=(a,s,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof s!="object"&&Object.defineProperty(a,s,t),t);function Tr(a,s){return(t,e,i)=>{let n=r=>r.renderRoot?.querySelector(a)??null;if(s){let{get:r,set:o}=typeof e=="object"?t:i??(()=>{let c=Symbol();return{get(){return this[c]},set(d){this[c]=d}}})();return ri(t,e,{get(){let c=r.call(this);return c===void 0&&(c=n(this),(c!==null||this.hasUpdated)&&o.call(this,c)),c}})}return ri(t,e,{get(){return n(this)}})}}function O(a){return a.split(".")[0]}function b(a){return!a||a.state==="unavailable"||a.state==="unknown"}function N(a){if(!a)return!1;let s=a.state,t=O(a.entity_id);if(t==="button"||t==="input_button"||t==="scene")return s!=="unavailable";if(s==="unavailable"||s==="unknown")return!1;if(s==="off")return t==="alert";switch(t){case"alarm_control_panel":return s!=="disarmed";case"alert":return s!=="idle";case"cover":case"valve":return s!=="closed";case"device_tracker":case"person":return s!=="not_home";case"lawn_mower":return s!=="docked"&&s!=="paused";case"lock":return s!=="locked";case"media_player":return s!=="standby";case"vacuum":return s!=="idle"&&s!=="docked"&&s!=="paused";case"plant":return s==="problem";case"timer":return s==="active";case"camera":return s==="streaming"||s==="recording";default:return!0}}var Qp=new Set(["closed","locked","off"]);function G(a,s){let t=O(s),e=a.states[s],i=e?Qp.has(e.state):!0,n={entity_id:s};switch(t){case"button":case"input_button":return a.callService(t,"press",n);case"lock":return a.callService("lock",i?"unlock":"lock",n);case"cover":return a.callService("cover",i?"open_cover":"close_cover",n);case"valve":return a.callService("valve",i?"open_valve":"close_valve",n);case"scene":return a.callService("scene","turn_on",n);case"group":return a.callService("homeassistant",i?"turn_on":"turn_off",n);default:return a.callService(t,i?"turn_on":"turn_off",n)}}function A(a,s){a.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:s},bubbles:!0,composed:!0}))}function E(a,s="light"){let t=new Event("haptic",{bubbles:!0,composed:!0});t.detail=s,a.dispatchEvent(t)}function I(a,s){if(a?.formatEntityState)try{return a.formatEntityState(s)}catch{}return s.state.replace(/_/g," ")}function D(a,s){return((a.attributes.supported_features??0)&s)!==0}var R=(a,s,t)=>Math.min(Math.max(a,s),t);var ut=class extends w{constructor(){super(...arguments);this.value=0;this.min=0;this.max=100;this.step=1;this.disabled=!1;this.fill=!1;this._pct=0;this._dragging=!1;this._lastEmit=0}willUpdate(t){if(!this._dragging&&(t.has("value")||t.has("min")||t.has("max"))){let e=this.max-this.min||1;this._pct=R((this.value-this.min)/e*100,0,100)}}_valueFromPct(t){let e=this.min+t/100*(this.max-this.min),i=Math.round(e/this.step)*this.step;return R(Number(i.toFixed(3)),this.min,this.max)}_updateFromEvent(t,e){let i=this.getBoundingClientRect();if(i.width&&(this._pct=R((t.clientX-i.left)/i.width*100,0,100),e)){let n=Date.now();n-this._lastEmit>100&&(this._lastEmit=n,this._fire("slide"))}}_fire(t){this.dispatchEvent(new CustomEvent(t,{detail:{value:this._valueFromPct(this._pct)},bubbles:!1}))}_onPointerDown(t){this.disabled||(t.stopPropagation(),this.setPointerCapture(t.pointerId),this._dragging=!0,this._updateFromEvent(t,!0))}_onPointerMove(t){this._dragging&&this._updateFromEvent(t,!0)}_onPointerUp(){this._dragging&&(this._dragging=!1,this._fire("change"))}_onKeydown(t){if(this.disabled)return;let e=t.key==="ArrowRight"||t.key==="ArrowUp"?1:t.key==="ArrowLeft"||t.key==="ArrowDown"?-1:0;if(!e)return;t.preventDefault(),this.value=R(this.value+e*this.step,this.min,this.max);let i=this.max-this.min||1;this._pct=(this.value-this.min)/i*100,this._fire("change")}render(){return l`
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
    `}};ut.styles=k`
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
  `,p([y({type:Number})],ut.prototype,"value",2),p([y({type:Number})],ut.prototype,"min",2),p([y({type:Number})],ut.prototype,"max",2),p([y({type:Number})],ut.prototype,"step",2),p([y({type:Boolean})],ut.prototype,"disabled",2),p([y({type:Boolean,reflect:!0})],ut.prototype,"fill",2),p([f()],ut.prototype,"_pct",2),ut=p([x("silk-slider")],ut);var Jp=new Set(["unavailable","unknown","none",""]);function tm(a,s){let t=(s??"").toLowerCase();if(Jp.has(t))return{t:a,v:NaN};let e=Number(s);return{t:a,v:Number.isFinite(e)?e:NaN}}async function Er(a,s,t,e){let i=await a.callWS({type:"history/history_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),entity_ids:s,minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),n={};for(let r of s){let o=i?.[r]??[];n[r]=o.map(c=>{let d=c.s??c.state,u=c.lu??c.last_updated??c.lc??c.last_changed,g=typeof u=="number"?u:Date.parse(u)/1e3;return tm(g,d)}).filter(c=>Number.isFinite(c.t)).sort((c,d)=>c.t-d.t)}return n}async function em(a,s,t,e){let i=await a.callWS({type:"recorder/statistics_during_period",start_time:new Date(t*1e3).toISOString(),end_time:new Date(e*1e3).toISOString(),statistic_ids:s,period:"hour",types:["mean","state"]}),n={};for(let r of s){let o=i?.[r]??[];n[r]=o.map(c=>{let d=c.start,u=typeof d=="number"?d/1e3:Date.parse(d)/1e3,g=c.mean??c.state;return{t:u,v:typeof g=="number"&&Number.isFinite(g)?g:NaN}}).filter(c=>Number.isFinite(c.t)).sort((c,d)=>c.t-d.t)}return n}async function ht(a,s,t,e,i){if(i<=48)return Er(a,s,t,e);let n=await em(a,s,t,e),r=s.filter(o=>!n[o]?.length);if(r.length)try{let o=await Er(a,r,t,e);for(let c of r)n[c]=o[c]??[]}catch{for(let o of r)n[o]=n[o]??[]}return n}function ft(a,s,t,e){let i=new Float64Array(e).fill(NaN);if(!a.length||t<=s)return i;let n=0;for(let r=0;r<e;r++){let o=s+(t-s)*r/(e-1);for(;n<a.length&&a[n].t<=o;)n++;n>0&&(i[r]=a[n-1].v)}return i}function fe(a,s,t){let e=1/0,i=-1/0;for(let r of a)for(let o=0;o<r.length;o++){let c=r[o];Number.isFinite(c)&&(c<e&&(e=c),c>i&&(i=c))}if(!Number.isFinite(e))return[0,1];if(e===i){let r=Math.max(Math.abs(e)*.05,.5);e-=r,i+=r}let n=(i-e)*.08;return[s??e-n,t??i+n]}function Gt(a,s,t,e,i){let[n,r]=s,o=r-n||1,c=Math.max(t-e-i,1),d=new Float64Array(a.length);for(let u=0;u<a.length;u++){let g=a[u];d[u]=Number.isFinite(g)?e+(1-(g-n)/o)*c:NaN}return d}var J=a=>(Math.round(a*100)/100).toString();function Cr(a,s,t,e){let i=t-s,n=new Float64Array(i);if(i===1)return n;let r=new Float64Array(i-1);for(let o=0;o<i-1;o++)r[o]=(a[s+o+1]-a[s+o])/e;n[0]=r[0],n[i-1]=r[i-2];for(let o=1;o<i-1;o++)n[o]=r[o-1]*r[o]<=0?0:2*r[o-1]*r[o]/(r[o-1]+r[o]);return n}function Ar(a,s){let t=-1;for(let e=0;e<=a.length;e++){let i=e<a.length&&Number.isFinite(a[e]);i&&t<0&&(t=e),!i&&t>=0&&(s(t,e),t=-1)}}function gt(a,s){let t=a.length;if(t<2)return"";let e=s/(t-1),i=[];return Ar(a,(n,r)=>{if(r-n===1){i.push(`M ${J(n*e)} ${J(a[n])} l 0.01 0`);return}let o=Cr(a,n,r,e);i.push(`M ${J(n*e)} ${J(a[n])}`);for(let c=n;c<r-1;c++){let d=c-n,u=c*e,g=(c+1)*e,h=u+e/3,v=a[c]+o[d]*e/3,_=g-e/3,$=a[c+1]-o[d+1]*e/3;i.push(`C ${J(h)} ${J(v)} ${J(_)} ${J($)} ${J(g)} ${J(a[c+1])}`)}}),i.join(" ")}function oi(a,s,t){let e=a.length;if(e<2)return"";let i=s/(e-1),n=[];return Ar(a,(r,o)=>{if(o-r===1)return;let c=Cr(a,r,o,i);n.push(`M ${J(r*i)} ${J(t)} L ${J(r*i)} ${J(a[r])}`);for(let d=r;d<o-1;d++){let u=d-r,g=d*i,h=(d+1)*i;n.push(`C ${J(g+i/3)} ${J(a[d]+c[u]*i/3)} ${J(h-i/3)} ${J(a[d+1]-c[u+1]*i/3)} ${J(h)} ${J(a[d+1])}`)}n.push(`L ${J((o-1)*i)} ${J(t)} Z`)}),n.join(" ")}function Sr(a){for(let s=0;s<a.length;s++)if(Number.isFinite(a[s]))return s;return-1}function ji(a){for(let s=a.length-1;s>=0;s--)if(Number.isFinite(a[s]))return s;return-1}function Mr(a){let s=-1,t=-1;for(let e=0;e<a.length;e++){let i=a[e];Number.isFinite(i)&&((s<0||i<a[s])&&(s=e),(t<0||i>a[t])&&(t=e))}return{min:s,max:t}}var Pr=a=>1-Math.pow(1-a,3),Rr=a=>1-Math.pow(1-a,4);function Or(a){return a?.locale?.language??a?.language??"en"}function U(a,s,t){if(!Number.isFinite(t))return"\u2014";let e=a?.entities?.[s]?.display_precision??(Math.abs(t)>=100?0:Math.abs(t)>=10?1:2);return new Intl.NumberFormat(Or(a),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}function Hr(a,s,t){return`${t>=0?"\u2191":"\u2193"} ${U(a,s,Math.abs(t))}`}function Nr(a,s,t){let e=new Date(s*1e3),i=Or(a);return t<=26?new Intl.DateTimeFormat(i,{hour:"numeric",minute:"2-digit"}).format(e):t<=24*8?new Intl.DateTimeFormat(i,{weekday:"short",hour:"numeric",minute:"2-digit"}).format(e):new Intl.DateTimeFormat(i,{month:"short",day:"numeric",hour:"numeric"}).format(e)}var im=[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"line_width",selector:{number:{min:1,max:8,step:.5,mode:"box"}}}]},{name:"",type:"grid",schema:[{name:"fill",selector:{boolean:{}}},{name:"extremes",selector:{boolean:{}}},{name:"range_selector",selector:{boolean:{}}},{name:"delta",selector:{boolean:{}}}]}],nm={entity:"Entity",name:"Name",hours_to_show:"Hours to show",line_width:"Line width",fill:"Gradient fill",extremes:"Min/max markers",range_selector:"Range selector",delta:"Change badge"},$i=class extends w{setConfig(s){this._config=s}render(){if(!this.hass||!this._config)return m;let s={hours_to_show:24,line_width:2.5,fill:!0,extremes:!0,range_selector:!0,delta:!0,...this._config};return l`
      <ha-form
        .hass=${this.hass}
        .data=${s}
        .schema=${im}
        .computeLabel=${t=>nm[t.name]??t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(s){s.stopPropagation();let t=s.detail.value;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}};p([y({attribute:!1})],$i.prototype,"hass",2),p([f()],$i.prototype,"_config",2),$i=p([x("silk-card-editor")],$i);var Ir={type:"silk-card",name:"Silk Graph",description:"Buttery-smooth, interactive history graph. Scrub it, zoom it, watch it morph."},Lr=["var(--primary-color, #4aa8ff)","#ef6c6c","#5ec78d","#f0b357","#a97ee8","#e879b9","#6ad4d4"],sm=["1h","12h","1d","1w","1m"],rm={h:1,d:24,w:168,m:720},om=15e3,am=3e5,cm=0;function lm(a){let s=/^(\d+)([hdwm])$/i.exec(a.trim());return s?Number(s[1])*rm[s[2].toLowerCase()]:null}var rt=class extends w{constructor(){super(...arguments);this._hours=24;this._scrubIndex=null;this._focusIndex=null;this._width=0;this._height=0;this._drawProgress=0;this._rev=0;this._uid=`silk${++cm}`;this._seriesCfgs=[];this._points=[];this._vals=[];this._pxYs=[];this._domain=[0,1];this._windowStart=0;this._windowEnd=0;this._hasDrawn=!1;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastUpdated={}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-card-editor")}setConfig(t){if(!t.entity&&!t.entities?.length)throw new Error("silk-card: define an `entity` or a list of `entities`");let e=t.entities??[t.entity];this._seriesCfgs=e.map((i,n)=>{let r=typeof i=="string"?{entity:i}:i;return{entity:r.entity,name:r.name,color:r.color??t.color??Lr[n%Lr.length]}}),this._config=t,this._hours=t.hours_to_show??24,this._fetchStarted=!1,this._hasDrawn=!1,this._vals=[],this._pxYs=[],this._focusIndex=null}getCardSize(){return 3}getGridOptions(){return{columns:12,rows:3,min_rows:2,min_columns:4}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(!0),am)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._animId&&cancelAnimationFrame(this._animId),this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh(!1);return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".graph");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height,this._recompute(!1))}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=!1;for(let i of this._seriesCfgs){let n=this.hass.states[i.entity]?.last_updated;n&&n!==this._lastUpdated[i.entity]&&(this._lastUpdated[i.entity]=n,t=!0)}if(!t||this._refreshTimer)return;let e=Math.max(0,om-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh(!0)},e)}async _refresh(t){if(!this.hass||!this._seriesCfgs.length)return;let e=++this._fetchSeq,i=Date.now()/1e3,n=i-this._hours*3600,r;try{r=await ht(this.hass,this._seriesCfgs.map(c=>c.entity),n,i,this._hours)}catch(c){console.warn("silk-card: history fetch failed",c);return}if(e!==this._fetchSeq)return;this._lastFetch=Date.now(),this._windowStart=n,this._windowEnd=i;let o=this._config?.points??120;this._points=this._seriesCfgs.map(c=>r[c.entity]??[]),this._vals=this._points.map(c=>ft(c,n,i,o)),this._domain=fe(this._vals,this._config?.y_min,this._config?.y_max),this._recompute(t)}_recompute(t){if(!this._vals.length||!this._width||!this._height)return;let e=this._config?.extremes!==!1,i=e?22:10,n=e?18:8,r=this._vals.map(o=>Gt(o,this._domain,this._height,i,n));this._setDisplay(r,t)}_setDisplay(t,e){if(this._animId&&cancelAnimationFrame(this._animId),!(e&&this._pxYs.length===t.length&&this._pxYs[0]?.length===t[0]?.length)){this._pxYs=t,this._rev++,this._hasDrawn?this._drawProgress=1:(this._hasDrawn=!0,this._animateDrawIn());return}let n=this._pxYs.map(d=>Float64Array.from(d)),r=performance.now(),o=420,c=d=>{let u=Math.min((d-r)/o,1),g=Pr(u);for(let h=0;h<t.length;h++){let v=n[h],_=t[h],$=this._pxYs[h];for(let M=0;M<_.length;M++){let P=v[M],L=_[M];$[M]=!Number.isFinite(P)||!Number.isFinite(L)?u<.5?P:L:P+(L-P)*g}}this._rev++,u<1&&(this._animId=requestAnimationFrame(c))};this._animId=requestAnimationFrame(c)}_animateDrawIn(){let t=performance.now(),e=900,i=n=>{let r=Math.min((n-t)/e,1);this._drawProgress=Rr(r),r<1&&(this._animId=requestAnimationFrame(i))};this._animId=requestAnimationFrame(i)}_selectRange(t){t!==this._hours&&(this._hours=t,this._scrubIndex=null,this._refresh(!0))}_onPointerDown(t){t.currentTarget.setPointerCapture(t.pointerId),this._scrub(t)}_onPointerMove(t){this._scrubIndex!==null&&this._scrub(t)}_onPointerEnd(){this._scrubIndex=null}_scrub(t){if(!this._width||!this._vals.length)return;let e=t.currentTarget.getBoundingClientRect(),i=Math.min(Math.max(t.clientX-e.left,0),this._width),n=this._vals[0].length;this._scrubIndex=Math.round(i/this._width*(n-1))}_toggleFocus(t){this._focusIndex=this._focusIndex===t?null:t}get _primaryIndex(){return this._focusIndex??0}_valueAt(t,e){return this._vals[t]?.[e]??NaN}_timeAt(t){let e=this._vals[0]?.length??1;return this._windowStart+(this._windowEnd-this._windowStart)*t/Math.max(e-1,1)}render(){if(!this._config)return m;this._rev;let t=this.hass,e=this._seriesCfgs[this._primaryIndex],i=t?.states[e.entity];if(t&&!i)return l`<ha-card><div class="warning">Entity not found: ${e.entity}</div></ha-card>`;let n=this._scrubIndex!==null&&this._vals.length>0,r=n?this._valueAt(this._primaryIndex,this._scrubIndex):Number(i?.state),o=this._config.unit??i?.attributes.unit_of_measurement??"",c=this._config.name??e.name??i?.attributes.friendly_name??e.entity;return l`
      <ha-card>
        <div class="header">
          <div class="title-row">
            <span class="name">
              ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:m}
              ${c}
            </span>
            ${this._renderRangeChips()}
          </div>
          <div class="value-row">
            <span class="value">${U(t,e.entity,r)}</span>
            <span class="unit">${o}</span>
            ${n?this._renderScrubTime():this._renderDelta(e.entity)}
          </div>
          ${this._seriesCfgs.length>1?this._renderLegend():m}
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
    `}_renderRangeChips(){if(this._config?.range_selector===!1)return m;let t=this._config?.ranges??sm;return l`
      <span class="ranges">
        ${t.map(e=>{let i=lm(e);return i===null?m:l`
            <button
              class="chip ${i===this._hours?"active":""}"
              @click=${()=>this._selectRange(i)}
            >
              ${e.toUpperCase()}
            </button>
          `})}
      </span>
    `}_renderDelta(t){if(this._config?.delta===!1||!this._vals.length)return m;let e=this._vals[this._primaryIndex],i=Sr(e),n=ji(e);if(i<0||n<=i)return m;let r=e[n]-e[i];return l`<span class="delta">${Hr(this.hass,t,r)}</span>`}_renderScrubTime(){return l`<span class="scrub-time">${Nr(this.hass,this._timeAt(this._scrubIndex),this._hours)}</span>`}_renderLegend(){return l`
      <div class="legend">
        ${this._seriesCfgs.map((t,e)=>{let i=this.hass?.states[t.entity],n=t.name??i?.attributes.friendly_name??t.entity,r=this._focusIndex!==null&&this._focusIndex!==e;return l`
            <button class="legend-chip ${r?"dim":""}" @click=${()=>this._toggleFocus(e)}>
              <span class="dot" style="background:${t.color}"></span>
              ${n}
            </button>
          `})}
      </div>
    `}_renderSvg(){let t=this._width,e=this._height;if(!t||!e||!this._pxYs.length)return m;let i=this._config?.line_width??2.5,n=this._config?.fill!==!1,r=`${this._uid}-clip`;return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e}>
        <defs>
          <clipPath id=${r}>
            <rect x="0" y="0" width=${t*this._drawProgress} height=${e}></rect>
          </clipPath>
          ${this._seriesCfgs.map((o,c)=>j`
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
    `}_renderSeries(t,e,i,n,r,o){let c=this._pxYs[e],d=this._focusIndex!==null&&this._focusIndex!==e,u=gt(c,i),g=o?oi(c,i,n):"",h=ji(c),v=h>=0?h/(c.length-1)*i:0;return j`
      <g style="color:${t.color}" opacity=${d?.22:1} class="series">
        ${o?j`<path class="area" d=${g} fill="url(#${this._uid}-fill-${e})"></path>`:m}
        <path
          class="line"
          d=${u}
          fill="none"
          stroke="currentColor"
          stroke-width=${r}
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
        ${h>=0&&this._drawProgress>=1?j`
              <circle class="pulse" cx=${v} cy=${c[h]} r="4" fill="currentColor"></circle>
              <circle cx=${v} cy=${c[h]} r="3" fill="currentColor"></circle>
            `:m}
      </g>
    `}_renderExtremes(t){if(this._config?.extremes===!1||!this._pxYs.length)return m;let e=this._primaryIndex,i=this._vals[e],n=this._pxYs[e];if(!i)return m;let{min:r,max:o}=Mr(i);if(r<0||o<0||r===o)return m;let c=this._seriesCfgs[e].entity,d=(u,g)=>{let h=u/(i.length-1)*t,v=h<40?"start":h>t-40?"end":"middle";return j`
        <circle cx=${h} cy=${n[u]} r="2.5" class="extreme-dot"></circle>
        <text x=${h} y=${n[u]+(g?14:-8)} text-anchor=${v} class="extreme-label">
          ${U(this.hass,c,i[u])}
        </text>
      `};return j`${d(o,!1)}${d(r,!0)}`}_renderScrubOverlay(t,e){if(this._scrubIndex===null||!this._pxYs.length)return m;let i=this._pxYs[0].length,n=this._scrubIndex/(i-1)*t;return j`
      <line x1=${n} y1="0" x2=${n} y2=${e} class="scrub-line"></line>
      ${this._pxYs.map((r,o)=>{let c=r[this._scrubIndex];return Number.isFinite(c)?j`<circle cx=${n} cy=${c} r="4.5" class="scrub-dot" style="color:${this._seriesCfgs[o].color}" fill="currentColor"></circle>`:m})}
    `}};rt.styles=k`
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
  `,p([y({attribute:!1})],rt.prototype,"hass",2),p([f()],rt.prototype,"_config",2),p([f()],rt.prototype,"_hours",2),p([f()],rt.prototype,"_scrubIndex",2),p([f()],rt.prototype,"_focusIndex",2),p([f()],rt.prototype,"_width",2),p([f()],rt.prototype,"_height",2),p([f()],rt.prototype,"_drawProgress",2),p([f()],rt.prototype,"_rev",2),rt=p([x("silk-card")],rt);var an=class extends rt{};an=p([x("silk-graph-card")],an);var T=k`
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
`;var dm={light:"var(--state-light-active-color, #e6a23c)",switch:"var(--state-switch-active-color, #4aa8ff)",input_boolean:"var(--state-switch-active-color, #4aa8ff)",fan:"var(--state-fan-active-color, #35b5b1)",cover:"var(--state-cover-active-color, #9d7ee8)",climate:"var(--state-climate-auto-color, #57ad60)",media_player:"var(--state-media_player-active-color, #6c8dd6)",lock:"var(--state-lock-locked-color, #57ad60)",vacuum:"var(--state-vacuum-active-color, #35b5b1)",humidifier:"var(--state-humidifier-on-color, #4aa8ff)",scene:"var(--primary-color, #4aa8ff)",script:"var(--primary-color, #4aa8ff)",button:"var(--primary-color, #4aa8ff)",input_button:"var(--primary-color, #4aa8ff)",person:"var(--state-person-home-color, #57ad60)",device_tracker:"var(--state-person-home-color, #57ad60)",binary_sensor:"var(--primary-color, #4aa8ff)",sensor:"var(--primary-color, #4aa8ff)"},Fr={heat:"var(--state-climate-heat-color, #e8734f)",cool:"var(--state-climate-cool-color, #4aa8ff)",heat_cool:"var(--state-climate-auto-color, #57ad60)",auto:"var(--state-climate-auto-color, #57ad60)",dry:"var(--state-climate-dry-color, #e6a23c)",fan_only:"var(--state-climate-fan-only-color, #35b5b1)"};function S(a,s){if(s)return s;if(!a)return"var(--primary-color, #4aa8ff)";let t=O(a.entity_id);return t==="climate"&&Fr[a.state]?Fr[a.state]:t==="lock"&&a.state!=="locked"?"var(--state-lock-unlocked-color, #e8734f)":dm[t]??"var(--primary-color, #4aa8ff)"}function C(a,s,t,e={}){if(customElements.get(a))return;class i extends w{setConfig(r){this._config=r}render(){return!this.hass||!this._config?m:l`
        <ha-form
          .hass=${this.hass}
          .data=${{...e,...this._config}}
          .schema=${s}
          .computeLabel=${r=>t[r.name]??r.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `}_valueChanged(r){r.stopPropagation(),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r.detail.value},bubbles:!0,composed:!0}))}}p([y({attribute:!1})],i.prototype,"hass",2),p([f()],i.prototype,"_config",2),customElements.define(a,i)}var Dr={type:"silk-toggle-card",name:"Silk Toggle",description:"A crisp on/off row with a real switch and instant feedback."},zr="silk-toggle-card-editor";C(zr,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan","lock","cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before switching"});function pm(a,s){switch(a){case"lock":return s?"unlocked":"locked";case"cover":case"valve":return s?"open":"closed";default:return s?"on":"off"}}var mm=2e3,ge=class extends w{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-toggle-card",entity:e.find(n=>n.startsWith("switch."))??e.find(n=>n.startsWith("light."))}}static async getConfigElement(){return document.createElement(zr)}setConfig(t){if(!t.entity)throw new Error("silk-toggle-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_onCardClick(){this._config&&A(this,this._config.entity)}_onToggleClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!(!n||b(n))){if(e.confirm){let r=e.name??n.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to toggle ${r}?`))return}E(this),this._optimistic=!N(n),this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),mm),G(i,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=this._optimistic??N(i),o=this._optimistic===null?i:{...i,state:pm(O(t.entity),this._optimistic)},c=S(o,t.color),d=t.name??i.attributes.friendly_name??t.entity;return l`
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
          <div class="state">${I(e,o)}</div>
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
    `}};ge.styles=[T,k`
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
    `],p([y({attribute:!1})],ge.prototype,"hass",2),p([f()],ge.prototype,"_config",2),p([f()],ge.prototype,"_optimistic",2),ge=p([x("silk-toggle-card")],ge);var Ur={type:"silk-light-card",name:"Silk Light",description:"Drag anywhere to dim \u2014 the whole card is the slider."},jr="silk-light-card-editor";C(jr,[{name:"entity",required:!0,selector:{entity:{domain:["light"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",icon:"Icon",color:"Accent color"});var um=2e3;function hm(a){let s=a.attributes.supported_color_modes;return Array.isArray(s)&&s.some(t=>t!=="onoff")}var Wt=class extends w{constructor(){super(...arguments);this._optimisticPct=null;this._optimisticOn=null;this._sliding=!1}static getStubConfig(t){return{type:"custom:silk-light-card",entity:Object.keys(t.states).find(i=>i.startsWith("light."))}}static async getConfigElement(){return document.createElement(jr)}setConfig(t){if(!t.entity)throw new Error("silk-light-card: `entity` is required");if(O(t.entity)!=="light")throw new Error(`silk-light-card: \`entity\` must be a light (got "${t.entity}")`);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._sliding||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticPct=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),um)}_displayPct(t,e){if(this._optimisticPct!==null)return this._optimisticPct;if(!e)return 0;let i=t.attributes.brightness;return typeof i!="number"?null:R(Math.round(i/255*100),1,100)}_onSlide(t){this._sliding=!0,this._optimisticPct=t.detail.value,this._optimisticOn=t.detail.value>0}_onSliderChange(t){if(this._sliding=!1,!this.hass||!this._config)return;let e=t.detail.value;this._optimisticPct=e,this._optimisticOn=e>0,this._holdOptimistic(),E(this),e<=0?this.hass.callService("light","turn_off",{entity_id:this._config.entity}):this.hass.callService("light","turn_on",{entity_id:this._config.entity,brightness_pct:e})}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(b(e))return;let i=this._optimisticOn??e.state==="on";G(this.hass,this._config.entity),E(this),this._optimisticOn=!i,this._optimisticPct=null,this._holdOptimistic()}_onCardClick(){this._config&&A(this,this._config.entity)}_stopClick(t){t.stopPropagation()}render(){if(!this._config)return m;let t=this.hass;if(!t)return m;let e=this._config.entity,i=t.states[e];if(!i)return l`<ha-card><div class="warning">Entity not found: ${e}</div></ha-card>`;let n=b(i),r=hm(i),o=!n&&i.state==="on",c=n?!1:this._optimisticOn??o,d=n?0:this._displayPct(i,c),u=S(i,this._config.color),g=this._config.name??i.attributes.friendly_name??e,h=n||c===o?I(t,i):c?"On":"Off",v=r&&c&&d!==null&&!n;return l`
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
            `:m}
        <button
          class="icon ${c?"on":""}"
          ?disabled=${n}
          aria-label=${`Toggle ${g}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${g}</div>
          <div class="state">
            ${h}${v?l`<span class="sep">·</span>${d}%`:m}
          </div>
        </div>
        <div class="trailing">
          ${v?l`<span class="value">${d}%</span>`:m}
        </div>
      </ha-card>
    `}};Wt.styles=[T,k`
      .icon:disabled {
        cursor: default;
      }
    `],p([y({attribute:!1})],Wt.prototype,"hass",2),p([f()],Wt.prototype,"_config",2),p([f()],Wt.prototype,"_optimisticPct",2),p([f()],Wt.prototype,"_optimisticOn",2),Wt=p([x("silk-light-card")],Wt);var Vr={type:"silk-tile-card",name:"Silk Tile",description:"A sensor tile with a living sparkline and threshold colors."},fm=60,gm=6,bm=4,vm=3e5,_m=6e4,ym=0;C("silk-tile-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"color",selector:{text:{}}}]},{name:"",type:"grid",schema:[{name:"unit",selector:{text:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]}],{entity:"Entity",name:"Name",icon:"Icon",color:"Color",unit:"Unit",hours_to_show:"Hours to show"},{hours_to_show:24});var At=class extends w{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._uid=`silk-tile${++ym}`;this._thresholds=[];this._vals=null;this._pxYs=null;this._domain=[0,1];this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-tile-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement("silk-tile-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-tile-card: `entity` is required");this._thresholds=(t.thresholds??[]).filter(e=>!!e&&typeof e.value=="number"&&Number.isFinite(e.value)&&typeof e.color=="string").sort((e,i)=>e.value-i.value),this._config=t,this._fetchStarted=!1,this._vals=null,this._pxYs=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),vm)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height,this._recompute())}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,_m-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??24,i=++this._fetchSeq,n=Date.now()/1e3,r=n-e*3600,o;try{o=await ht(this.hass,[t],r,n,e)}catch(c){console.warn("silk-tile-card: history fetch failed",c);return}i===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals=ft(o[t]??[],r,n,fm),this._domain=fe([this._vals]),this._recompute())}_recompute(){!this._vals||!this._width||!this._height||(this._pxYs=Gt(this._vals,this._domain,this._height,gm,bm),this._rev++)}_accent(t){if(Number.isFinite(t)){let e;for(let i of this._thresholds)if(i.value<=t)e=i.color;else break;if(e)return e}return S(this.hass?.states[this._config.entity],this._config?.color)}_onTap(){this._config&&(E(this),A(this,this._config.entity))}render(){if(!this._config)return m;this._rev;let t=this.hass,e=t?.states[this._config.entity];if(t&&!e)return l`<ha-card
        ><div class="warning">Entity not found: ${this._config.entity}</div></ha-card
      >`;let i=b(e),n=Number(e?.state),r=this._accent(n),o=this._config.unit??e?.attributes.unit_of_measurement??"",c=this._config.name??e?.attributes.friendly_name??this._config.entity;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${!i&&N(e)?"on":""}">
            ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${c}</div></div>
          <div class="trailing">
            <span class="value">${U(t,this._config.entity,n)}</span>
            ${o?l`<span class="unit">${o}</span>`:m}
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._height,i=this._pxYs;if(!t||!e||!i)return m;let n=gt(i,t),r=oi(i,t,e),o=ji(i),c=o>=0?o/(i.length-1)*t:0,d=`${this._uid}-fill`;return l`
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
          ${o>=0?j`<circle cx=${c} cy=${i[o]} r="2.5" fill="currentColor"></circle>`:m}
        </g>
      </svg>
    `}};At.styles=[T,k`
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
    `],p([y({attribute:!1})],At.prototype,"hass",2),p([f()],At.prototype,"_config",2),p([f()],At.prototype,"_width",2),p([f()],At.prototype,"_height",2),p([f()],At.prototype,"_rev",2),At=p([x("silk-tile-card")],At);var Br={type:"silk-gauge-card",name:"Silk Gauge",description:"A clean arc gauge that animates to its value."},cn=42,wm=50,xm=50,Kr=270,Yr=90+(360-Kr)/2,qr=100,Gr=96;function Xr(a){let s=a*Math.PI/180;return[wm+cn*Math.cos(s),xm+cn*Math.sin(s)]}var[Zr,km]=Xr(Yr),[Qr,$m]=Xr(Yr+Kr),Wr=`M ${Zr.toFixed(2)} ${km.toFixed(2)} A ${cn} ${cn} 0 1 1 ${Qr.toFixed(2)} ${$m.toFixed(2)}`,ns=100,be=class extends w{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-gauge-card",entity:i("battery")??i("power")??e[0]}}static async getConfigElement(){return document.createElement("silk-gauge-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-gauge-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-gauge-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:3,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatValue(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return e!==void 0?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t):new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.abs(t)>=100?0:1}).format(t)}_formatBound(t){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config;if(!t)return m;let e=this.hass?.states[t.entity];if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=b(e),n=Number(e?.state),r=!i&&e!==void 0&&e.state!==""&&Number.isFinite(n),o=t.min??0,c=t.max??100,d=c-o,u=r&&d>0?R((n-o)/d,0,1):0,g=this._drawn?u:0,h=ns*(1-g),v=(r?this._segmentColor(n):void 0)??S(e,t.color),_=t.unit??e?.attributes.unit_of_measurement??"",$=t.name??e?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${i?"unavailable":""}
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div class="gauge">
          <svg viewBox="0 0 ${qr} ${Gr}" aria-hidden="true">
            <path class="arc-bg" d=${Wr}></path>
            <path
              class="arc-value"
              d=${Wr}
              pathLength=${ns}
              stroke-dasharray=${ns}
              style="stroke-dashoffset:${h};opacity:${g>0?1:0}"
            ></path>
          </svg>
          <div class="readout">
            <div class="value">${r?this._formatValue(n):"\u2014"}</div>
            ${_?l`<div class="unit">${_}</div>`:m}
          </div>
          <span class="bound" style="left:${Zr.toFixed(1)}%">${this._formatBound(o)}</span>
          <span class="bound" style="left:${Qr.toFixed(1)}%">${this._formatBound(c)}</span>
        </div>
        <div class="name" title=${$}>${$}</div>
      </ha-card>
    `}};be.styles=[T,k`
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
        aspect-ratio: ${qr} / ${Gr};
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
    `],p([y({attribute:!1})],be.prototype,"hass",2),p([f()],be.prototype,"_config",2),p([f()],be.prototype,"_drawn",2),be=p([x("silk-gauge-card")],be);C("silk-gauge-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var io={type:"silk-climate-card",name:"Silk Climate",description:"A compact thermostat: current, target, and modes in one block."},Jr=2,Tm=800,to=2e3,Em={heat:"mdi:fire",cool:"mdi:snowflake",heat_cool:"mdi:sun-snowflake-variant",auto:"mdi:thermostat-auto",dry:"mdi:water-percent",fan_only:"mdi:fan",off:"mdi:power"};C("silk-climate-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["climate"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function it(a){if(a==null||a==="")return;let s=Number(a);return Number.isFinite(s)?s:void 0}function eo(a){let s=String(a),t=s.indexOf(".");return t<0?0:Math.min(s.length-t-1,2)}function ss(a){let s=a.replace(/_/g," ");return s.charAt(0).toUpperCase()+s.slice(1)}var xt=class extends w{static getStubConfig(s){return{type:"custom:silk-climate-card",entity:Object.keys(s.states).find(e=>e.startsWith("climate."))}}static async getConfigElement(){return document.createElement("silk-climate-card-editor")}setConfig(s){if(!s.entity||O(s.entity)!=="climate")throw new Error("silk-climate-card: `entity` is required and must be a climate entity");this._config=s,this._optTarget=this._optLow=this._optHigh=this._optMode=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),window.clearTimeout(this._modeHoldTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(s){if(!s.has("hass")||!this._config||!this.hass)return;let e=s.get("hass")?.states[this._config.entity],i=this.hass.states[this._config.entity];if(!(!i||i===e)){if(this._sendTimer===void 0){let n=e?.attributes,r=i.attributes;this._optTarget!==void 0&&r.temperature!==n?.temperature&&(this._optTarget=void 0),this._optLow!==void 0&&r.target_temp_low!==n?.target_temp_low&&(this._optLow=void 0),this._optHigh!==void 0&&r.target_temp_high!==n?.target_temp_high&&(this._optHigh=void 0)}this._optMode!==void 0&&i.state!==e?.state&&(this._optMode=void 0)}}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=t.states[s.entity];if(!e)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let i=b(e),n=this._optMode!==void 0&&this._optMode!==e.state?{...e,state:this._optMode}:e,r=S(n,s.color),o=s.name??e.attributes.friendly_name??s.entity,c=I(t,n),d=e.attributes.hvac_action,u=d?ss(d):void 0,g=u!==void 0&&u.toLowerCase()!==c.toLowerCase(),h=it(e.attributes.current_temperature),v=t.config?.unit_system?.temperature??"\xB0";return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!i&&N(n)?"on":""}"
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${n}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">
              ${c}${g?l`<span class="sep">·</span>${u}`:m}
            </div>
          </div>
          <div class="trailing hero">
            ${h!==void 0?l`<span class="current">${this._formatCurrent(h)}</span
                  ><span class="degree">${v}</span>`:m}
          </div>
        </div>
        <div class="row controls">
          ${this._renderSteppers(e,i)} ${this._renderModes(e,i)}
        </div>
      </ha-card>
    `}_renderSteppers(s,t){let e=s.attributes,i=eo(it(e.target_temp_step)??.5);if(D(s,Jr)){let r=this._optLow??it(e.target_temp_low),o=this._optHigh??it(e.target_temp_high);return l`
        ${this._renderStepper("low",r,i,t)}
        ${this._renderStepper("high",o,i,t)}
      `}let n=this._optTarget??it(e.temperature);return this._renderStepper("target",n,i,t)}_renderStepper(s,t,e,i){let n=s==="low"?"lower target":s==="high"?"upper target":"target";return l`
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
    `}_renderModes(s,t){let e=s.attributes.hvac_modes;if(!e?.length)return m;let i=this._optMode??s.state;return l`
      <div class="modes">
        ${e.map(n=>l`
            <button
              class="chip mode ${n===i?"active":""}"
              ?disabled=${t}
              aria-label=${ss(n)}
              title=${ss(n)}
              @click=${r=>this._onMode(r,n)}
            >
              <ha-icon .icon=${Em[n]??"mdi:thermostat"}></ha-icon>
            </button>
          `)}
      </div>
    `}_formatCurrent(s){return String(Math.round(s*10)/10)}_onCardClick(){this._config&&A(this,this._config.entity)}_onIconClick(s){s.stopPropagation(),this._config&&A(this,this._config.entity)}_onStep(s,t,e){s.stopPropagation();let i=this.hass,n=this._config?i?.states[this._config.entity]:void 0;if(!i||!n||b(n))return;let r=n.attributes,o=it(r.target_temp_step)??.5,c=eo(o),d=it(r.min_temp)??7,u=it(r.max_temp)??35,g=it(r.current_temperature)??(d+u)/2,h=(v,_,$)=>Number(R(v+e*o,_,$).toFixed(c));if(t==="low"){let v=this._optHigh??it(r.target_temp_high)??u,_=this._optLow??it(r.target_temp_low)??g;this._optLow=h(_,d,v)}else if(t==="high"){let v=this._optLow??it(r.target_temp_low)??d,_=this._optHigh??it(r.target_temp_high)??g;this._optHigh=h(_,v,u)}else{let v=this._optTarget??it(r.temperature)??g;this._optTarget=h(v,d,u)}E(this,"selection"),window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},Tm)}_commit(){let s=this.hass,t=this._config?.entity,e=t?s?.states[t]:void 0;if(!s||!t||!e)return;let i=e.attributes,n={entity_id:t};if(D(e,Jr)){let r=this._optLow??it(i.target_temp_low),o=this._optHigh??it(i.target_temp_high);if(r===void 0||o===void 0)return;n.target_temp_low=r,n.target_temp_high=o}else{let r=this._optTarget??it(i.temperature);if(r===void 0)return;n.temperature=r}s.callService("climate","set_temperature",n),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optTarget=this._optLow=this._optHigh=void 0},to)):this._optTarget=this._optLow=this._optHigh=void 0}_onMode(s,t){s.stopPropagation();let e=this.hass,i=this._config?.entity,n=i?e?.states[i]:void 0;!e||!i||!n||b(n)||(this._optMode??n.state)!==t&&(this._optMode=t,E(this),e.callService("climate","set_hvac_mode",{entity_id:i,hvac_mode:t}),window.clearTimeout(this._modeHoldTimer),this._modeHoldTimer=window.setTimeout(()=>{this._optMode=void 0},to))}};xt.styles=[T,k`
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
    `],p([y({attribute:!1})],xt.prototype,"hass",2),p([f()],xt.prototype,"_config",2),p([f()],xt.prototype,"_optTarget",2),p([f()],xt.prototype,"_optLow",2),p([f()],xt.prototype,"_optHigh",2),p([f()],xt.prototype,"_optMode",2),xt=p([x("silk-climate-card")],xt);var no={type:"silk-cover-card",name:"Silk Cover",description:"Blinds with drag-anywhere position and an honest stop button."},Cm=1,Am=2,Sm=4,Mm=8,Pm=2e3,so="silk-cover-card-editor";C(so,[{name:"entity",required:!0,selector:{entity:{domain:["cover"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_buttons",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_buttons:"Show open / stop / close buttons"},{show_buttons:!0});var ve=class extends w{constructor(){super(...arguments);this._localPos=null}static getStubConfig(t){return{type:"custom:silk-cover-card",entity:Object.keys(t.states).find(i=>i.startsWith("cover."))}}static async getConfigElement(){return document.createElement(so)}setConfig(t){if(!t.entity||O(t.entity)!=="cover")throw new Error("silk-cover-card: define a cover `entity` (e.g. cover.living_room_blinds)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._localPos=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._localPos=null},Pm)}_realPosition(t){let e=t.attributes.current_position;return typeof e=="number"&&Number.isFinite(e)?R(e,0,100):void 0}_onIconClick(t){t.stopPropagation(),!(!this.hass||!this._config)&&(b(this.hass.states[this._config.entity])||(G(this.hass,this._config.entity),E(this)))}_onCardClick(){this._config&&A(this,this._config.entity)}_onSlide(t){this._localPos=Math.round(t.detail.value)}_onSlideChange(t){if(!this.hass||!this._config)return;let e=R(Math.round(t.detail.value),0,100);this._localPos=e,this._armExpiry(),this.hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e}),E(this)}_callCover(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(this._clearOptimistic(),this.hass.callService("cover",e,{entity_id:this._config.entity}),E(this))}render(){if(!this.hass||!this._config)return m;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=b(t),i=N(t),n=S(t,this._config.color),r=this._config.name??t.attributes.friendly_name??t.entity_id,o=this._realPosition(t),c=this._localPos??o,d=D(t,Sm)&&!e;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${d?m:this._onCardClick}
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
            `:m}
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
            ${I(this.hass,t)}${!e&&c!==void 0?l`<span class="sep">·</span>${c}%`:m}
          </div>
        </div>
        ${this._config.show_buttons!==!1?this._renderButtons(t,e,c):m}
      </ha-card>
    `}_renderButtons(t,e,i){let n=D(t,Cm),r=D(t,Mm),o=D(t,Am);if(!n&&!r&&!o)return m;let c=i!==void 0?i>=100:t.state==="open",d=i!==void 0?i<=0:t.state==="closed";return l`
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
            `:m}
        ${r?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Stop cover"
                @click=${u=>this._callCover(u,"stop_cover")}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `:m}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e||d}
                aria-label="Close cover"
                @click=${u=>this._callCover(u,"close_cover")}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `:m}
      </div>
    `}};ve.styles=[T,k`
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
    `],p([y({attribute:!1})],ve.prototype,"hass",2),p([f()],ve.prototype,"_config",2),p([f()],ve.prototype,"_localPos",2),ve=p([x("silk-cover-card")],ve);var ro={type:"silk-fan-card",name:"Silk Fan",description:"Speed at your fingertips, with an icon that actually spins."},Rm=1,Om=8,Hm=3,Nm=2e3;C("silk-fan-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:["fan"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var kt=class extends w{static getStubConfig(s){return{type:"custom:silk-fan-card",entity:Object.keys(s.states).find(e=>e.startsWith("fan."))}}static async getConfigElement(){return document.createElement("silk-fan-card-editor")}setConfig(s){if(!s.entity)throw new Error("silk-fan-card: `entity` is required");if(O(s.entity)!=="fan")throw new Error(`silk-fan-card: \`entity\` must be a fan.* entity, got \`${s.entity}\``);this._config=s,this._dragPct=void 0,this._lastUpdated=void 0,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optTimer),this._optTimer=void 0}willUpdate(s){if(!s.has("hass")||!this._config)return;let t=this.hass?.states[this._config.entity]?.last_updated;if(t&&t!==this._lastUpdated){let e=this._lastUpdated!==void 0;this._lastUpdated=t,e&&this._clearOptimistic()}}_rawPct(s){let t=s.attributes.percentage;return typeof t=="number"&&Number.isFinite(t)?t:void 0}_effectivePct(s){return this._dragPct??this._optPct??this._rawPct(s)}_effectiveOn(s){return this._dragPct!==void 0?this._dragPct>0:this._optOn??N(s)}_setOptimistic(s){s.on!==void 0&&(this._optOn=s.on),s.pct!==void 0&&(this._optPct=s.pct),s.preset!==void 0&&(this._optPreset=s.preset),window.clearTimeout(this._optTimer),this._optTimer=window.setTimeout(()=>this._clearOptimistic(),Nm)}_clearOptimistic(){window.clearTimeout(this._optTimer),this._optTimer=void 0,this._optOn=void 0,this._optPct=void 0,this._optPreset=void 0}_onIconClick(s){if(s.stopPropagation(),!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||b(t))return;let e=!this._effectiveOn(t);G(this.hass,this._config.entity),this._setOptimistic(e?{on:!0}:{on:!1,pct:0}),E(this)}_onSlide(s){this._dragPct=s.detail.value}_onSliderChange(s){let t=s.detail.value;if(this._dragPct=void 0,!this.hass||!this._config)return;let e=this._config.entity;t<=0?(this.hass.callService("fan","turn_off",{entity_id:e}),this._setOptimistic({on:!1,pct:0})):(this.hass.callService("fan","set_percentage",{entity_id:e,percentage:t}),this._setOptimistic({on:!0,pct:t})),E(this)}_onPresetClick(s,t){s.stopPropagation(),!(!this.hass||!this._config)&&(this.hass.callService("fan","set_preset_mode",{entity_id:this._config.entity,preset_mode:t}),this._setOptimistic({preset:t}),E(this))}_onCardClick(s){s.target.localName!=="silk-slider"&&this._config&&A(this,this._config.entity)}render(){if(!this._config||!this.hass)return m;let s=this._config,t=this.hass.states[s.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let e=b(t),i=!e&&this._effectiveOn(t),n=this._effectivePct(t),r=D(t,Rm),o=s.name??t.attributes.friendly_name??s.entity,c=i&&(n===void 0||n>0),d=R(3.5-(n??50)*.03,.6,3.5),u=D(t,Om)?(t.attributes.preset_modes??[]).slice(0,Hm):[],g=this._optPreset??t.attributes.preset_mode;return l`
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
            `:m}
        <button
          class="icon ${i?"on":""}"
          .disabled=${e}
          aria-label=${i?`Turn off ${o}`:`Turn on ${o}`}
          @click=${this._onIconClick}
        >
          <span
            class="blades ${c?"spinning":""}"
            style=${c?`animation-duration:${d.toFixed(2)}s`:m}
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
                ${u.map(h=>l`
                    <button
                      class="chip ${h===g?"active":""}"
                      .disabled=${e}
                      @click=${v=>this._onPresetClick(v,h)}
                    >
                      ${h}
                    </button>
                  `)}
              </div>
            `:m}
      </ha-card>
    `}_renderStateLine(s,t,e,i){let r=(this._dragPct!==void 0||this._optOn!==void 0)&&!b(s)?t?"On":"Off":I(this.hass,s),o=i&&t&&e!==void 0&&e>0;return l`${r}${o?l`<span class="sep">·</span>${Math.round(e)}%`:m}`}};kt.styles=[T,k`
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
    `],p([y({attribute:!1})],kt.prototype,"hass",2),p([f()],kt.prototype,"_config",2),p([f()],kt.prototype,"_dragPct",2),p([f()],kt.prototype,"_optOn",2),p([f()],kt.prototype,"_optPct",2),p([f()],kt.prototype,"_optPreset",2),kt=p([x("silk-fan-card")],kt);var oo={type:"silk-button-card",name:"Silk Button",description:"Scenes and scripts that feel like real buttons."},rs=["scene","script","button","input_button"],Lm={scene:"mdi:palette",script:"mdi:script-text",button:"mdi:gesture-tap-button",input_button:"mdi:gesture-tap-button"};C("silk-button-card-editor",[{name:"entity",required:!0,selector:{entity:{domain:[...rs]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Confirm before running"});var _e=class extends w{constructor(){super(...arguments);this._optimisticRunning=!1}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-button-card",entity:e.find(n=>n.startsWith("scene."))??e.find(n=>n.startsWith("script."))}}static async getConfigElement(){return document.createElement("silk-button-card-editor")}setConfig(t){if(!t.entity)throw new Error("silk-button-card: `entity` is required");let e=O(t.entity);if(!rs.includes(e))throw new Error(`silk-button-card: entity must be one of ${rs.join("/")}, got \`${e}\``);this._config=t,this._optimisticRunning=!1}getCardSize(){return 1}getGridOptions(){return{columns:3,rows:1,min_columns:2,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){t.has("hass")&&this._optimisticRunning&&this._stateObj?.state==="on"&&this._clearOptimistic()}get _stateObj(){let t=this._config?.entity;return t?this.hass?.states[t]:void 0}_isUnavailable(t){return!t||t.state==="unavailable"}_isRunning(t){return!this._config||O(this._config.entity)!=="script"?!1:t?.state==="on"||this._optimisticRunning}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticRunning=!1}_onPress(){let t=this._config,e=this.hass;if(!t||!e||this._isUnavailable(this._stateObj))return;let i=t.name??this._stateObj?.attributes.friendly_name??t.entity;if(t.confirm&&!window.confirm(`Run "${i}"?`))return;let n=O(t.entity),r=n==="button"||n==="input_button"?"press":"turn_on";e.callService(n,r,{entity_id:t.entity}),E(this),this._flash(),n==="script"&&(this._optimisticRunning=!0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>{this._optimisticTimer=void 0,this._optimisticRunning=!1},2e3))}_onKeydown(t){t.repeat||t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._onPress())}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_renderIcon(t,e){if(e)return l`<ha-icon class="spin" icon="mdi:loading"></ha-icon>`;if(this._config?.icon)return l`<ha-icon .icon=${this._config.icon}></ha-icon>`;if(t)return l`<ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>`;let i=O(this._config?.entity??"");return l`<ha-icon .icon=${Lm[i]??"mdi:gesture-tap"}></ha-icon>`}render(){let t=this._config;if(!t)return m;let e=this._stateObj;if(this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=this._isUnavailable(e),n=this._isRunning(e),r=t.name??e?.attributes.friendly_name??t.entity;return l`
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
        <div class="icon ${N(e)||n?"on":""}">
          ${this._renderIcon(e,n)}
        </div>
        <div class="info"><div class="name">${r}</div></div>
      </ha-card>
    `}};_e.styles=[T,k`
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
    `],p([y({attribute:!1})],_e.prototype,"hass",2),p([f()],_e.prototype,"_config",2),p([f()],_e.prototype,"_optimisticRunning",2),_e=p([x("silk-button-card")],_e);var co={type:"silk-media-card",name:"Silk Media",description:"Artwork-first now playing with honest controls."},Im=1,ao=4,Fm=16,Dm=32,zm=16384,Um=2e3,lo="silk-media-card-editor";C(lo,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"show_volume",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",show_volume:"Show volume slider"},{show_volume:!0});function os(a,s){let t=a.attributes[s];return typeof t=="string"&&t?t:void 0}var Bt=class extends w{constructor(){super(...arguments);this._optimisticPlaying=null;this._optimisticVolume=null}static getStubConfig(t){return{type:"custom:silk-media-card",entity:Object.keys(t.states).find(i=>i.startsWith("media_player."))}}static async getConfigElement(){return document.createElement(lo)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-media-card: define a media_player `entity` (e.g. media_player.living_room)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return this._showsVolume()?2:1}getGridOptions(){return{columns:6,rows:this._showsVolume()?2:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_showsVolume(){if(this._config?.show_volume===!1)return!1;let t=this._config?this.hass?.states[this._config.entity]:void 0;return t?D(t,ao):!0}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticPlaying=null,this._optimisticVolume=null},Um)}_onLeadingClick(t){t.stopPropagation(),this._config&&A(this,this._config.entity)}_onCardClick(){this._config&&A(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onPlayPause(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];if(!e||b(e))return;let i=this._optimisticPlaying??e.state==="playing";this._optimisticPlaying=!i,this._armExpiry(),this.hass.callService("media_player","media_play_pause",{entity_id:this._config.entity}),E(this)}_onSkip(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(b(this.hass.states[this._config.entity])||(this.hass.callService("media_player",e,{entity_id:this._config.entity}),E(this)))}_onVolumeChange(t){if(!this.hass||!this._config)return;let e=R(Math.round(t.detail.value),0,100);this._optimisticVolume=e,this._armExpiry(),this.hass.callService("media_player","volume_set",{entity_id:this._config.entity,volume_level:e/100}),E(this)}_volumePct(t){if(this._optimisticVolume!==null)return this._optimisticVolume;let e=t.attributes.volume_level;return typeof e=="number"&&Number.isFinite(e)?Math.round(R(e,0,1)*100):0}render(){if(!this.hass||!this._config)return m;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=b(t),i=N(t),n=S(t,this._config.color),r=e?void 0:os(t,"entity_picture"),o=os(t,"media_title")??this._config.name??t.attributes.friendly_name??t.entity_id,c=t.state==="playing",d=e?!1:this._optimisticPlaying??c,u=os(t,"media_artist")??(e||d===c?I(this.hass,t):d?"Playing":"Paused"),g=this._config.show_volume!==!1&&D(t,ao);return l`
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
        ${g?l`
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
            `:m}
      </ha-card>
    `}_renderControls(t,e,i){let n=D(t,Fm),r=D(t,Im)||D(t,zm),o=D(t,Dm);return!n&&!r&&!o?m:l`
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
            `:m}
        ${r?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label=${i?"Pause":"Play"}
                @click=${this._onPlayPause}
              >
                <ha-icon icon=${i?"mdi:pause":"mdi:play"}></ha-icon>
              </button>
            `:m}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Next track"
                @click=${c=>this._onSkip(c,"media_next_track")}
              >
                <ha-icon icon="mdi:skip-next"></ha-icon>
              </button>
            `:m}
      </div>
    `}};Bt.styles=[T,k`
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
    `],p([y({attribute:!1})],Bt.prototype,"hass",2),p([f()],Bt.prototype,"_config",2),p([f()],Bt.prototype,"_optimisticPlaying",2),p([f()],Bt.prototype,"_optimisticVolume",2),Bt=p([x("silk-media-card")],Bt);var mo={type:"silk-room-card",name:"Silk Room",description:"A room at a glance: climate, activity, and quick controls."},uo="silk-room-card-editor";C(uo,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"navigation_path",selector:{text:{}}}],{name:"Name",icon:"Icon",navigation_path:"Navigation path"},{icon:"mdi:sofa"});var po="mdi:sofa",jm=3,Vm=4,qm=2e3;function Gm(a){return typeof a!="string"||!a?"":a==="\xB0C"||a==="\xB0F"?"\xB0":a}function Wm(a,s){switch(a){case"lock":return s?"unlocked":"locked";case"cover":case"valve":return s?"open":"closed";default:return s?"on":"off"}}var ye=class extends w{constructor(){super(...arguments);this._optimistic={};this._sensors=[];this._toggles=[];this._countIds=[];this._optimisticBase={};this._optimisticTimers={}}static getStubConfig(){return{type:"custom:silk-room-card",name:"Living room",icon:po}}static async getConfigElement(){return document.createElement(uo)}setConfig(t){if(!t.name)throw new Error("silk-room-card: `name` is required");this._config=t,this._sensors=(t.sensors??[]).slice(0,jm),this._toggles=(t.toggles??[]).slice(0,Vm),this._countIds=t.count_active??[],this._clearAllOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._optimistic)){let i=this.hass.states[e];i&&i.last_updated!==this._optimisticBase[e]&&this._clearOptimistic(e)}}_clearOptimistic(t){if(window.clearTimeout(this._optimisticTimers[t]),delete this._optimisticTimers[t],delete this._optimisticBase[t],t in this._optimistic){let e={...this._optimistic};delete e[t],this._optimistic=e}}_clearAllOptimistic(){for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={},this._optimisticBase={},this._optimistic={}}_displayActive(t){let e=this._optimistic[t];return e!==void 0?e:N(this.hass?.states[t])}_onCardClick(){let t=this._config;if(!t)return;if(t.navigation_path){history.pushState(null,"",t.navigation_path),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}));return}let e=this._sensors[0]??this._toggles[0];e&&A(this,e)}_onToggleClick(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let n=i.states[e];!n||b(n)||(E(this),this._optimistic={...this._optimistic,[e]:!N(n)},this._optimisticBase[e]=n.last_updated,window.clearTimeout(this._optimisticTimers[e]),this._optimisticTimers[e]=window.setTimeout(()=>this._clearOptimistic(e),qm),G(i,e))}_sensorSegments(){let t=this.hass,e=[];for(let i of this._sensors){let n=t.states[i];if(!n)continue;let r=Number(n.state),o=Number.isFinite(r)?Gm(n.attributes.unit_of_measurement):"";e.push(l`<span class="reading">${U(t,i,r)}${o}</span>`)}return e}_activeCount(){let t=0;for(let e of this._countIds)this._displayActive(e)&&t++;return t}_renderToggle(t){let e=this.hass,i=e.states[t],n=!i||b(i),r=this._optimistic[t],o=r??N(i),c=i&&r!==void 0?{...i,state:Wm(O(t),r)}:i,d=i?.attributes.friendly_name??t;return l`
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
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._toggles.length?e.states[this._toggles[0]]:void 0,n=S(i,t.color),r=this._countIds.length?this._activeCount():0,o=r>0||this._toggles.some(d=>this._displayActive(d)),c=[];for(let d of this._sensorSegments())c.length&&c.push(l`<span class="sep">·</span>`),c.push(d);return this._countIds.length&&(c.length&&c.push(l`<span class="sep">·</span>`),c.push(l`<span class="count ${r>0?"on":""}">${r} on</span>`)),l`
      <ha-card class="control" style="--silk-accent:${n}" @click=${this._onCardClick}>
        <div class="icon ${o?"on":""}">
          <ha-icon .icon=${t.icon??po}></ha-icon>
        </div>
        <div class="info">
          <div class="name">${t.name}</div>
          ${c.length?l`<div class="state">${c}</div>`:m}
        </div>
        ${this._toggles.length?l`<div class="trailing">${this._toggles.map(d=>this._renderToggle(d))}</div>`:m}
      </ha-card>
    `}};ye.styles=[T,k`
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
    `],p([y({attribute:!1})],ye.prototype,"hass",2),p([f()],ye.prototype,"_config",2),p([f()],ye.prototype,"_optimistic",2),ye=p([x("silk-room-card")],ye);var ho={type:"silk-rocker-card",name:"Silk Rocker",description:"A wall switch that looks and moves like the real thing."},fo="silk-rocker-card-editor";C(fo,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","input_boolean","fan"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var Bm=2e3,we=class extends w{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-rocker-card",entity:Object.keys(t.states).find(i=>i.startsWith("switch."))}}static async getConfigElement(){return document.createElement(fo)}setConfig(t){if(!t.entity)throw new Error("silk-rocker-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_toggle(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];!i||b(i)||(E(this),this._optimistic=!N(i),this._optimisticBase=i.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Bm),G(e,t.entity))}_onClick(){this._toggle()}_onKeydown(t){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._toggle())}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=this._optimistic??N(i),o=S(i,t.color),c=t.name??i.attributes.friendly_name??t.entity,d=t.show_name!==!1;return l`
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
        ${d?l`<div class="name" title=${c}>${c}</div>`:m}
      </ha-card>
    `}};we.styles=[T,k`
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
    `],p([y({attribute:!1})],we.prototype,"hass",2),p([f()],we.prototype,"_config",2),p([f()],we.prototype,"_optimistic",2),we=p([x("silk-rocker-card")],we);var vo={type:"silk-push-card",name:"Silk Push",description:"A physical push button with a satisfying press."},_o="silk-push-card-editor";C(_o,[{name:"entity",required:!0,selector:{entity:{domain:["switch","light","scene","script","button","input_button"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"confirm",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",confirm:"Ask before pressing"});var go=new Set(["scene","script","button","input_button"]),bo=38,as=100,Km=2e3,xe=class extends w{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-push-card",entity:e.find(n=>n.startsWith("switch."))??e.find(n=>n.startsWith("scene."))}}static async getConfigElement(){return document.createElement(_o)}setConfig(t){if(!t.entity)throw new Error("silk-push-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_sweep(){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;this.renderRoot.querySelector(".ring-led")?.animate([{strokeDashoffset:`${as}`,opacity:1},{strokeDashoffset:"0",opacity:1,offset:.8},{strokeDashoffset:"0",opacity:0}],{duration:600,easing:"cubic-bezier(0.23, 1, 0.32, 1)"})}_onCardClick(){this._config&&A(this,this._config.entity)}_onPress(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!(!n||b(n))){if(e.confirm){let r=e.name??n.attributes.friendly_name??e.entity;if(!window.confirm(`Are you sure you want to press ${r}?`))return}E(this),go.has(O(e.entity))?this._sweep():(this._optimistic=!N(n),this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Km)),G(i,e.entity)}}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=!go.has(O(t.entity)),o=r&&!n&&(this._optimistic??N(i)),c=this._optimistic===null||!r?i:{...i,state:this._optimistic?"on":"off"},d=S(i,t.color),u=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${d}"
        @click=${this._onCardClick}
      >
        <div class="well">
          <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle class="ring-track" cx="40" cy="40" r=${bo}></circle>
            <circle
              class="ring-led ${o?"on":""}"
              cx="40"
              cy="40"
              r=${bo}
              pathLength=${as}
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
    `}};xe.styles=[T,k`
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
        stroke-dasharray: ${as};
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
    `],p([y({attribute:!1})],xe.prototype,"hass",2),p([f()],xe.prototype,"_config",2),p([f()],xe.prototype,"_optimistic",2),xe=p([x("silk-push-card")],xe);var $o={type:"silk-knob-card",name:"Silk Knob",description:"A rotary dial you actually turn."},To="silk-knob-card-editor";C(To,[{name:"entity",required:!0,selector:{entity:{domain:["light","fan","media_player","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",color:"Accent color"});var Ym=["light","fan","media_player","number","input_number"];function ln(a,s){if(a==="number"||a==="input_number"){let t=Number(s.attributes.min),e=Number(s.attributes.max),i=Number(s.attributes.step),n=Number.isFinite(t)?t:0,r=Number.isFinite(e)&&e>n?e:n+100;return{min:n,max:r,step:Number.isFinite(i)&&i>0?i:1,percent:!1,toggleable:!1}}if(a==="fan"){let t=Number(s.attributes.percentage_step);return{min:0,max:100,step:Number.isFinite(t)&&t>0?t:1,percent:!0,toggleable:!0}}return{min:0,max:100,step:1,percent:!0,toggleable:!0}}function Xm(a,s){switch(a){case"light":{if(s.state!=="on")return 0;let t=s.attributes.brightness;return typeof t!="number"?100:R(Math.round(t/255*100),1,100)}case"fan":{if(s.state==="off")return 0;let t=s.attributes.percentage;return typeof t=="number"?t:s.state==="on"?100:null}case"media_player":{let t=s.attributes.volume_level;return typeof t=="number"?t*100:null}case"number":case"input_number":{let t=Number(s.state);return Number.isFinite(t)?t:null}}}function Zm(a,s,t,e){switch(t){case"light":e<=0?a.callService("light","turn_off",{entity_id:s}):a.callService("light","turn_on",{entity_id:s,brightness_pct:Math.round(e)});return;case"fan":a.callService("fan","set_percentage",{entity_id:s,percentage:Math.round(e)});return;case"media_player":a.callService("media_player","volume_set",{entity_id:s,volume_level:Math.round(e)/100});return;case"number":case"input_number":a.callService(t,"set_value",{entity_id:s,value:e});return}}function yo(a,s){let t=Math.round((a-s.min)/s.step)*s.step+s.min;return R(Number(t.toFixed(3)),s.min,s.max)}function Qm(a){let s=String(a),t=s.indexOf(".");return t===-1?0:Math.min(s.length-t-1,3)}var Ti=118,nt=Ti/2,wo=46,xo=50.5,ko=56.5,cs=25,dn=270,Vi=-135,Jm=19,tu=40,eu=4,iu=2e3,nu=Array.from({length:cs},(a,s)=>{let t=(Vi+dn*s/(cs-1))*Math.PI/180,e=Math.sin(t),i=-Math.cos(t);return{x1:(nt+xo*e).toFixed(2),y1:(nt+xo*i).toFixed(2),x2:(nt+ko*e).toFixed(2),y2:(nt+ko*i).toFixed(2)}}),$t=class extends w{constructor(){super(...arguments);this._dragValue=null;this._optimistic=null;this._pressed=!1;this._dragging=!1;this._centerX=0;this._centerY=0;this._startX=0;this._startY=0}static getStubConfig(t){return{type:"custom:silk-knob-card",entity:Object.keys(t.states).find(i=>i.startsWith("light."))}}static async getConfigElement(){return document.createElement(To)}setConfig(t){if(!t.entity)throw new Error("silk-knob-card: `entity` is required");let e=O(t.entity);if(!Ym.includes(e))throw new Error(`silk-knob-card: unsupported domain "${e}" \u2014 use light, fan, media_player, number or input_number`);this._config=t,this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._pressed||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),iu)}_displayLevel(t,e){return this._dragValue??this._optimistic??Xm(e,t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatNumber(t,e){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:e}).format(t)}_valueFromPointer(t,e){let i=Math.atan2(t.clientX-this._centerX,this._centerY-t.clientY)*180/Math.PI,r=(R(i,Vi,Vi+dn)-Vi)/dn;return yo(e.min+r*(e.max-e.min),e)}_spec(){let t=this._config,e=t?this.hass?.states[t.entity]:void 0;return!t||!e?null:ln(O(t.entity),e)}_onPointerDown(t){let e=this._config?this.hass?.states[this._config.entity]:void 0;if(!e||b(e))return;t.stopPropagation();let i=t.currentTarget;i.setPointerCapture(t.pointerId);let n=i.getBoundingClientRect();this._centerX=n.left+n.width/2,this._centerY=n.top+n.height/2,this._startX=t.clientX,this._startY=t.clientY,this._pressed=!0,this._dragging=!1}_onPointerMove(t){if(!this._pressed)return;if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<eu)return;this._dragging=!0}let e=this._spec();e&&(this._dragValue=this._valueFromPointer(t,e))}_onPointerUp(t){if(this._pressed)if(this._pressed=!1,this._dragging){this._dragging=!1;let e=this._spec();e&&this._commit(this._valueFromPointer(t,e)),this._dragValue=null}else this._onTap()}_onPointerCancel(){this._pressed=!1,this._dragging=!1,this._dragValue=null}_commit(t){let e=this._config,i=this.hass;!e||!i||(this._optimistic=t,this._holdOptimistic(),E(this),Zm(i,e.entity,O(e.entity),t))}_onTap(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];if(!i||b(i))return;let n=O(t.entity);if(!ln(n,i).toggleable)return;E(this);let r=N(i);G(e,t.entity),(n==="light"||n==="fan")&&(this._optimistic=r?0:null,r?this._holdOptimistic():this._clearOptimistic())}_onKeydown(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=t.key,o=0;if(r==="ArrowUp"||r==="ArrowRight")o=1;else if(r==="ArrowDown"||r==="ArrowLeft")o=-1;else if(r!=="Home"&&r!=="End")return;t.preventDefault(),t.stopPropagation();let c=O(e.entity),d=ln(c,n),u=this._displayLevel(n,c)??d.min,g=r==="Home"?d.min:r==="End"?d.max:yo(u+o*d.step,d);g!==u&&this._commit(g)}_onCardClick(){this._config&&A(this,this._config.entity)}_swallowClick(t){t.stopPropagation()}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=O(t.entity),r=ln(n,i),o=b(i),c=o?null:this._displayLevel(i,n),d=r.max-r.min||1,u=c===null?0:R((c-r.min)/d,0,1),g=c===null?-1:u,h=Vi+dn*u,v=S(i,t.color),_=t.name??i.attributes.friendly_name??t.entity,$=r.percent?"":i.attributes.unit_of_measurement??"",M=c===null?"\u2014":r.percent?`${Math.round(c)}%`:this._formatNumber(c,Qm(r.step));return l`
      <ha-card
        class=${o?"unavailable":""}
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div
          class="dial ${this._dragging?"dragging":""} ${this._pressed?"pressed":""}"
          role="slider"
          tabindex=${o?-1:0}
          aria-label=${_}
          aria-valuemin=${r.min}
          aria-valuemax=${r.max}
          aria-valuenow=${c===null?r.min:r.percent?Math.round(c):c}
          aria-valuetext=${$?`${M} ${$}`:M}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
          @keydown=${this._onKeydown}
          @click=${this._swallowClick}
        >
          <svg viewBox="0 0 ${Ti} ${Ti}" aria-hidden="true">
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
            ${nu.map((P,L)=>j`<line
                  class="tick ${L/(cs-1)<=g+1e-6?"on":""}"
                  x1=${P.x1} y1=${P.y1} x2=${P.x2} y2=${P.y2}
                ></line>`)}
            <g class="knob-g">
              <circle
                class="face"
                cx=${nt}
                cy=${nt}
                r=${wo}
                filter="url(#silk-knob-shadow)"
              ></circle>
              <circle class="rim" cx=${nt} cy=${nt} r=${wo-3} ></circle>
              <g class="ind" style="transform: rotate(${h}deg)">
                <line class="mark" x1=${nt} y1=${nt-tu} x2=${nt} y2=${nt-Jm}></line>
              </g>
            </g>
          </svg>
        </div>
        <div class="readout">
          <span class="value">${M}</span>
          ${$?l`<span class="unit">${$}</span>`:m}
        </div>
      </ha-card>
    `}};$t.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 12px;
      }
      .dial {
        /* Basis is the full 118px stage; shrinks proportionally in tight grids. */
        flex: 1 1 ${Ti}px;
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
        max-width: ${Ti}px;
        max-height: ${Ti}px;
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
        transform-origin: ${nt}px ${nt}px;
        transition: transform 250ms var(--silk-spring);
      }
      .knob-g {
        transform-origin: ${nt}px ${nt}px;
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
    `],p([y({attribute:!1})],$t.prototype,"hass",2),p([f()],$t.prototype,"_config",2),p([f()],$t.prototype,"_dragValue",2),p([f()],$t.prototype,"_optimistic",2),p([f()],$t.prototype,"_pressed",2),p([f()],$t.prototype,"_dragging",2),$t=p([x("silk-knob-card")],$t);var Co={type:"silk-fader-card",name:"Silk Fader",description:"A studio fader for lights, covers, and anything with a level."},Ao="silk-fader-card-editor";C(Ao,[{name:"entity",required:!0,selector:{entity:{domain:["light","cover","fan","media_player","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"color",selector:{text:{}}}],{entity:"Entity",name:"Name",color:"Accent color"});var su=["light","cover","fan","media_player","number","input_number"];function pn(a,s){if(a==="number"||a==="input_number"){let t=Number(s.attributes.min),e=Number(s.attributes.max),i=Number(s.attributes.step),n=Number.isFinite(t)?t:0,r=Number.isFinite(e)&&e>n?e:n+100;return{min:n,max:r,step:Number.isFinite(i)&&i>0?i:1,percent:!1,toggleable:!1}}if(a==="fan"){let t=Number(s.attributes.percentage_step);return{min:0,max:100,step:Number.isFinite(t)&&t>0?t:1,percent:!0,toggleable:!0}}return{min:0,max:100,step:1,percent:!0,toggleable:!0}}function ru(a,s){switch(a){case"light":{if(s.state!=="on")return 0;let t=s.attributes.brightness;return typeof t!="number"?100:R(Math.round(t/255*100),1,100)}case"cover":{let t=s.attributes.current_position;return typeof t=="number"?t:s.state==="open"?100:s.state==="closed"?0:null}case"fan":{if(s.state==="off")return 0;let t=s.attributes.percentage;return typeof t=="number"?t:s.state==="on"?100:null}case"media_player":{let t=s.attributes.volume_level;return typeof t=="number"?t*100:null}case"number":case"input_number":{let t=Number(s.state);return Number.isFinite(t)?t:null}}}function ou(a,s,t,e){switch(t){case"light":e<=0?a.callService("light","turn_off",{entity_id:s}):a.callService("light","turn_on",{entity_id:s,brightness_pct:Math.round(e)});return;case"cover":a.callService("cover","set_cover_position",{entity_id:s,position:Math.round(e)});return;case"fan":a.callService("fan","set_percentage",{entity_id:s,percentage:Math.round(e)});return;case"media_player":a.callService("media_player","volume_set",{entity_id:s,volume_level:Math.round(e)/100});return;case"number":case"input_number":a.callService(t,"set_value",{entity_id:s,value:e});return}}function Eo(a,s){let t=Math.round((a-s.min)/s.step)*s.step+s.min;return R(Number(t.toFixed(3)),s.min,s.max)}function au(a){let s=String(a),t=s.indexOf(".");return t===-1?0:Math.min(s.length-t-1,3)}var Ei=18,cu=4,lu=2e3,bt=class extends w{constructor(){super(...arguments);this._dragValue=null;this._optimistic=null;this._optimisticOn=null;this._dragging=!1;this._pressed=!1;this._startX=0;this._startY=0}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-fader-card",entity:e.find(n=>n.startsWith("light."))??e.find(n=>n.startsWith("cover."))}}static async getConfigElement(){return document.createElement(Ao)}setConfig(t){if(!t.entity)throw new Error("silk-fader-card: `entity` is required");let e=O(t.entity);if(!su.includes(e))throw new Error(`silk-fader-card: unsupported domain "${e}" \u2014 use light, cover, fan, media_player, number or input_number`);this._config=t,this._clearOptimistic()}getCardSize(){return 3}getGridOptions(){return{columns:2,rows:3,min_columns:2,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._pressed||this._clearOptimistic())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null,this._optimisticOn=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),lu)}_displayLevel(t,e){return this._dragValue??this._optimistic??ru(e,t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatNumber(t,e){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:e}).format(t)}_spec(){let t=this._config,e=t?this.hass?.states[t.entity]:void 0;return!t||!e?null:pn(O(t.entity),e)}_valueFromPointer(t,e){let i=this._trackEl;if(!i)return null;let n=i.getBoundingClientRect(),r=n.height-Ei;if(r<=0)return null;let o=R((n.bottom-t.clientY-Ei/2)/r,0,1);return Eo(e.min+o*(e.max-e.min),e)}_onPointerDown(t){let e=this._config?this.hass?.states[this._config.entity]:void 0;!e||b(e)||(t.currentTarget.setPointerCapture(t.pointerId),this._pressed=!0,this._dragging=!1,this._startX=t.clientX,this._startY=t.clientY)}_onPointerMove(t){if(!this._pressed)return;if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<cu)return;this._dragging=!0}let e=this._spec(),i=e?this._valueFromPointer(t,e):null;i!==null&&(this._dragValue=i)}_onPointerUp(t){if(this._pressed)if(this._pressed=!1,this._dragging){this._dragging=!1;let e=this._spec(),i=e?this._valueFromPointer(t,e):null;i!==null&&this._commit(i),this._dragValue=null}else this._config&&A(this,this._config.entity)}_onPointerCancel(){this._pressed=!1,this._dragging=!1,this._dragValue=null}_commit(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=O(e.entity);this._optimistic=t,n!=="media_player"&&(this._optimisticOn=t>0),this._holdOptimistic(),E(this),ou(i,e.entity,n,t)}_onIconClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=O(e.entity);if(!pn(r,n).toggleable){A(this,e.entity);return}E(this);let o=this._optimisticOn??N(n);G(i,e.entity),this._optimisticOn=!o,o?this._optimistic=r==="media_player"?null:0:this._optimistic=r==="cover"?100:null,this._holdOptimistic()}_stopPointer(t){t.stopPropagation()}_onKeydown(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=t.key,o=0;if(r==="ArrowUp"||r==="ArrowRight")o=1;else if(r==="ArrowDown"||r==="ArrowLeft")o=-1;else if(r!=="Home"&&r!=="End")return;t.preventDefault(),t.stopPropagation();let c=O(e.entity),d=pn(c,n),u=this._displayLevel(n,c)??d.min,g=r==="Home"?d.min:r==="End"?d.max:Eo(u+o*d.step,d);g!==u&&this._commit(g)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=O(t.entity),r=pn(n,i),o=b(i),c=o?null:this._displayLevel(i,n),d=r.max-r.min||1,u=c===null?0:R((c-r.min)/d,0,1),g=r.toggleable&&!o&&(this._optimisticOn??N(i)),h=S(i,t.color),v=t.name??i.attributes.friendly_name??t.entity,_=r.percent?"":i.attributes.unit_of_measurement??"",$=c===null?"\u2014":r.percent?`${Math.round(c)}%`:this._formatNumber(c,au(r.step)),M=u.toFixed(4);return l`
      <ha-card
        class=${o?"unavailable":""}
        style="--silk-accent:${h}"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <div class="readout">
          <span class="value">${$}</span>
          ${_?l`<span class="unit">${_}</span>`:m}
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
          aria-valuetext=${_?`${$} ${_}`:$}
          @keydown=${this._onKeydown}
        >
          <div class="rail">
            <div class="track">
              <div class="fill" style="height: calc((100% - ${Ei}px) * ${M} + ${Ei/2}px)"></div>
            </div>
            <div class="cap" style="bottom: calc((100% - ${Ei}px) * ${M})"></div>
          </div>
        </div>
        <button
          class="icon ${g?"on":""}"
          ?disabled=${o}
          aria-label=${`Toggle ${v}`}
          @pointerdown=${this._stopPointer}
          @click=${this._onIconClick}
        >
          <ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>
        </button>
      </ha-card>
    `}};bt.styles=[T,k`
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
        height: ${Ei}px;
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
    `],p([y({attribute:!1})],bt.prototype,"hass",2),p([f()],bt.prototype,"_config",2),p([f()],bt.prototype,"_dragValue",2),p([f()],bt.prototype,"_optimistic",2),p([f()],bt.prototype,"_optimisticOn",2),p([f()],bt.prototype,"_dragging",2),p([Tr(".track")],bt.prototype,"_trackEl",2),bt=p([x("silk-fader-card")],bt);var Ro={type:"silk-weather-card",name:"Silk Weather",description:"Now plus the next six hours, nothing you don't need."},So={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},Mo="mdi:weather-partly-cloudy",du={"clear-night":"Clear night",cloudy:"Cloudy",exceptional:"Exceptional",fog:"Fog",hail:"Hail",lightning:"Lightning","lightning-rainy":"Lightning, rainy",partlycloudy:"Partly cloudy",pouring:"Pouring",rainy:"Rainy",snowy:"Snowy","snowy-rainy":"Snowy, rainy",sunny:"Sunny",windy:"Windy","windy-variant":"Windy"},Po=6,Oo="silk-weather-card-editor";C(Oo,[{name:"entity",required:!0,selector:{entity:{domain:["weather"]}}},{name:"name",selector:{text:{}}},{name:"show_forecast",selector:{boolean:{}}}],{entity:"Entity",name:"Name",show_forecast:"Show hourly forecast"},{show_forecast:!0});var Kt=class extends w{constructor(){super(...arguments);this._forecast=null;this._subFailed=!1}static getStubConfig(t){return{type:"custom:silk-weather-card",entity:Object.keys(t.states).find(i=>i.startsWith("weather."))}}static async getConfigElement(){return document.createElement(Oo)}setConfig(t){if(!t.entity||O(t.entity)!=="weather")throw new Error("silk-weather-card: define a weather `entity` (e.g. weather.home)");this._subEntity!==void 0&&this._subEntity!==t.entity&&(this._teardownSubscription(),this._forecast=null,this._subFailed=!1),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._subscribeForecast()}disconnectedCallback(){super.disconnectedCallback(),this._teardownSubscription()}updated(t){!t.has("hass")&&!t.has("_config")||(this._config?.show_forecast===!1?this._teardownSubscription():this._subscribeForecast())}async _subscribeForecast(){let t=this._config,e=this.hass;if(!t||!e||!this.isConnected||t.show_forecast===!1||this._subEntity===t.entity)return;this._teardownSubscription();let i=t.entity;this._subEntity=i;let n=e.connection;if(!n||typeof n.subscribeMessage!="function"){this._subFailed=!0;return}try{let r=n.subscribeMessage(o=>{this._subEntity===i&&(this._forecast=Array.isArray(o.forecast)?o.forecast:[])},{type:"weather/subscribe_forecast",forecast_type:"hourly",entity_id:i});this._unsubPromise=r,await r}catch{this._subEntity===i&&(this._unsubPromise=void 0,this._subFailed=!0)}}_teardownSubscription(){let t=this._unsubPromise;this._unsubPromise=void 0,this._subEntity=void 0,t&&t.then(e=>e()).catch(()=>{})}_visibleForecast(t){if(this._config?.show_forecast===!1)return null;let e=this._forecast;if(e===null&&this._subFailed&&(e=t.attributes.forecast),!Array.isArray(e))return null;let i=e.filter(n=>n&&typeof n.datetime=="string").slice(0,Po);return i.length>0?i:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatTemp(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision,i=e!==void 0?{minimumFractionDigits:e,maximumFractionDigits:e}:{maximumFractionDigits:1};return new Intl.NumberFormat(this._locale(),i).format(t)}_hourLabel(t){let e=new Date(t);return Number.isNaN(e.getTime())?"\u2014":new Intl.DateTimeFormat(this._locale(),{hour:"numeric"}).format(e)}_conditionText(t,e){return t.formatEntityState?I(t,e):du[e.state]??e.state.replace(/_/g," ")}_onCardClick(){this._config&&A(this,this._config.entity)}_renderHour(t){let e=Number(t.temperature),i=So[t.condition??""]??Mo;return l`
      <div class="cell">
        <span class="hour">${this._hourLabel(t.datetime)}</span>
        <ha-icon .icon=${i}></ha-icon>
        <span class="t">${Number.isFinite(e)?`${Math.round(e)}\xB0`:"\u2014"}</span>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=Number(i.attributes.temperature),d=Number(i.attributes.humidity),u=So[i.state]??Mo,g=this._visibleForecast(i);return l`
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
              ${this._conditionText(e,i)}${Number.isFinite(d)?l`<span class="sep">·</span>${Math.round(d)}%`:m}
            </div>
          </div>
          <div class="trailing">
            <span class="temp">${Number.isFinite(c)?`${this._formatTemp(c)}\xB0`:"\u2014"}</span>
          </div>
        </div>
        ${g?l`<div class="hours">${g.map(h=>this._renderHour(h))}</div>`:m}
      </ha-card>
    `}};Kt.styles=[T,k`
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
        grid-template-columns: repeat(${Po}, minmax(0, 1fr));
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
    `],p([y({attribute:!1})],Kt.prototype,"hass",2),p([f()],Kt.prototype,"_config",2),p([f()],Kt.prototype,"_forecast",2),p([f()],Kt.prototype,"_subFailed",2),Kt=p([x("silk-weather-card")],Kt);var Ho={type:"silk-person-card",name:"Silk Person",description:"Who's home, at a glance."},pu=20,No="silk-person-card-editor";C(No,[{name:"entity",required:!0,selector:{entity:{domain:["person","device_tracker"]}}},{name:"name",selector:{text:{}}},{name:"battery",selector:{entity:{domain:["sensor"],device_class:"battery"}}}],{entity:"Entity",name:"Name",battery:"Battery sensor"});var ke=class extends w{static getStubConfig(s){let t=Object.keys(s.states);return{type:"custom:silk-person-card",entity:t.find(i=>i.startsWith("person."))??t.find(i=>i.startsWith("device_tracker."))}}static async getConfigElement(){return document.createElement(No)}setConfig(s){let t=s.entity?O(s.entity):"";if(!s.entity||t!=="person"&&t!=="device_tracker")throw new Error("silk-person-card: define a person or device_tracker `entity` (e.g. person.jamie)");this._config=s,this._brokenPicture=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}_presence(s,t){if(s.formatEntityState)return I(s,t);switch(t.state){case"home":return"Home";case"not_home":return"Away";default:return t.state.replace(/_/g," ")}}_battery(){let s=this._config?.battery,t=this.hass;if(!s||!t)return null;let e=t.states[s];if(!e||b(e))return null;let i=Number(e.state);return Number.isFinite(i)?{text:`${U(t,s,i)}%`,low:i<pu}:null}_onCardClick(){this._config&&A(this,this._config.entity)}_onImgError(){let t=(this._config&&this.hass?.states[this._config.entity])?.attributes.entity_picture;typeof t=="string"&&(this._brokenPicture=t)}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=t.states[s.entity];if(!e)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${s.entity}</div>
        </ha-card>
      `;let i=b(e),n=!i&&N(e),r=S(e),o=s.name??e.attributes.friendly_name??s.entity,c=e.attributes.entity_picture,d=typeof c=="string"&&c&&c!==this._brokenPicture?c:void 0,u=(Array.from(o.trim())[0]??"?").toUpperCase(),g=this._battery();return l`
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
            ${this._presence(t,e)}${g?l`<span class="sep">·</span><span class="battery ${g.low?"low":""}"
                  >${g.text}</span
                >`:m}
          </div>
        </div>
      </ha-card>
    `}};ke.styles=[T,k`
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
    `],p([y({attribute:!1})],ke.prototype,"hass",2),p([f()],ke.prototype,"_config",2),p([f()],ke.prototype,"_brokenPicture",2),ke=p([x("silk-person-card")],ke);var Io={type:"silk-lock-card",name:"Silk Lock",description:"Hold to unlock \u2014 no accidental taps."},Fo="silk-lock-card-editor";C(Fo,[{name:"entity",required:!0,selector:{entity:{domain:["lock"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"hold_time",selector:{number:{min:300,max:5e3,step:100,mode:"box"}}},{name:"instant",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",hold_time:"Hold time (ms)",instant:"Instant unlock (tap, no hold)"},{hold_time:1200});var mu=1200,uu=200,hu=2e3,qi=52,mn=qi/2,Lo=24,ls=100,St=class extends w{constructor(){super(...arguments);this._optimistic=null;this._holdProgress=0;this._holding=!1;this._optimisticBase="";this._holdStart=0;this._completedAt=0;this._holdTick=()=>{if(!this._holding)return;let t=(performance.now()-this._holdStart)/this._holdMs();if(t>=1){this._holding=!1,this._holdProgress=0,this._completedAt=Date.now(),this._callLock("unlock");return}this._holdProgress=t,this._holdRaf=requestAnimationFrame(this._holdTick)}}static getStubConfig(t){return{type:"custom:silk-lock-card",entity:Object.keys(t.states).find(i=>i.startsWith("lock."))}}static async getConfigElement(){return document.createElement(Fo)}setConfig(t){if(!t.entity)throw new Error("silk-lock-card: `entity` is required");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holding=!1,this._holdProgress=0}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_holdMs(){let t=Number(this._config?.hold_time);return Number.isFinite(t)&&t>0?Math.max(uu,t):mu}_displayState(){let t=this.hass?.states[this._config?.entity??""];if(t)return this._optimistic??t.state}_callLock(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];n&&(i.callService("lock",t,{entity_id:e.entity}),E(this,"success"),this._optimistic=t==="lock"?"locking":"unlocking",this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),hu))}_onTap(t){if(t.stopPropagation(),Date.now()-this._completedAt<400)return;let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=this._displayState()==="locked"?"unlock":"lock";r==="unlock"&&!e.instant||this._callLock(r)}_onHoldStart(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!(!n||b(n))&&!(this._displayState()!=="locked"||e.instant)){try{t.currentTarget.setPointerCapture(t.pointerId)}catch{}this._holding=!0,this._holdStart=performance.now(),this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holdRaf=requestAnimationFrame(this._holdTick)}}_onHoldEnd(t){t.stopPropagation(),this._holding&&(this._holding=!1,this._holdRaf!==void 0&&cancelAnimationFrame(this._holdRaf),this._holdRaf=void 0,this._holdProgress=0)}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=this._optimistic===null?i:{...i,state:this._optimistic},o=N(r),c=i.state==="jammed"?"var(--error-color, #db4437)":S(r,t.color),d=t.name??i.attributes.friendly_name??t.entity,u=r.state==="locked"?"unlock":"lock",g=u==="unlock"&&!t.instant&&!n,h=u==="lock"?"mdi:lock":"mdi:lock-open-variant-outline",v=u==="lock"?`Lock ${d}`:g?`Hold to unlock ${d}`:`Unlock ${d}`,_=(ls*(1-this._holdProgress)).toFixed(2);return l`
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
          <div class="state">${I(e,r)}</div>
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
            @contextmenu=${$=>$.preventDefault()}
          >
            ${g?l`
                  <svg
                    class="ring"
                    viewBox="0 0 ${qi} ${qi}"
                    aria-hidden="true"
                  >
                    <circle class="ring-track" cx=${mn} cy=${mn} r=${Lo}></circle>
                    <circle
                      class="ring-fill"
                      cx=${mn}
                      cy=${mn}
                      r=${Lo}
                      pathLength=${ls}
                      stroke-dasharray=${ls}
                      style="stroke-dashoffset:${_};opacity:${this._holdProgress>0?1:0}"
                    ></circle>
                  </svg>
                `:m}
            <ha-icon .icon=${h}></ha-icon>
          </button>
        </div>
      </ha-card>
    `}};St.styles=[T,k`
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
        width: ${qi}px;
        height: ${qi}px;
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
    `],p([y({attribute:!1})],St.prototype,"hass",2),p([f()],St.prototype,"_config",2),p([f()],St.prototype,"_optimistic",2),p([f()],St.prototype,"_holdProgress",2),p([f()],St.prototype,"_holding",2),St=p([x("silk-lock-card")],St);var Do={type:"silk-alarm-card",name:"Silk Alarm",description:"Arm modes and a real keypad."},zo="silk-alarm-card-editor";C(zo,[{name:"entity",required:!0,selector:{entity:{domain:["alarm_control_panel"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function fu(a){return a==="disarmed"?"var(--success-color, #43a047)":a==="triggered"?"var(--error-color, #db4437)":a==="arming"||a==="pending"?"var(--warning-color, #ffa600)":a.startsWith("armed_")?"#ef6c6c":"var(--primary-color, #4aa8ff)"}var gu=1,bu=2,vu=4,ds=[{key:"disarm",label:"Disarm",service:"alarm_disarm",activeState:"disarmed"},{key:"home",label:"Home",service:"alarm_arm_home",activeState:"armed_home",feature:gu},{key:"away",label:"Away",service:"alarm_arm_away",activeState:"armed_away",feature:bu},{key:"night",label:"Night",service:"alarm_arm_night",activeState:"armed_night",feature:vu}],_u=[{k:"1",label:"1"},{k:"2",label:"2"},{k:"3",label:"3"},{k:"4",label:"4"},{k:"5",label:"5"},{k:"6",label:"6"},{k:"7",label:"7"},{k:"8",label:"8"},{k:"9",label:"9"},{k:"clear",label:"Clear",icon:"mdi:close-circle-outline"},{k:"0",label:"0"},{k:"back",label:"Backspace",icon:"mdi:backspace-outline"}],yu=16,wu=2e3,Mt=class extends w{constructor(){super(...arguments);this._pendingMode=null;this._code="";this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-alarm-card",entity:Object.keys(t.states).find(i=>i.startsWith("alarm_control_panel."))}}static async getConfigElement(){return document.createElement(zo)}setConfig(t){if(!t.entity)throw new Error("silk-alarm-card: `entity` is required");this._config=t,this._pendingMode=null,this._code="",this._clearOptimistic()}getCardSize(){return this._pendingMode!==null?4:2}getGridOptions(){return{columns:6,rows:this._pendingMode!==null?4:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config)return;let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_needsCode(t,e){return!(!t.attributes.code_format||e.key!=="disarm"&&t.attributes.code_arm_required===!1)}_send(t,e){let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];if(!r)return;let o={entity_id:i.entity};e&&(o.code=e),n.callService("alarm_control_panel",t.service,o),this._optimistic=t.key==="disarm"?"disarmed":"arming",this._optimisticBase=r.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),wu),this._pendingMode=null,this._code=""}_onCardClick(){this._config&&A(this,this._config.entity)}_swallow(t){t.stopPropagation()}_onModeTap(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=t.currentTarget.dataset.mode,o=ds.find(c=>c.key===r);o&&(this._needsCode(n,o)?(E(this,"selection"),this._pendingMode===o.key?(this._pendingMode=null,this._code=""):(this._pendingMode=o.key,this._code="")):(E(this,"success"),this._send(o)))}_onKeyTap(t){t.stopPropagation();let e=t.currentTarget.dataset.key;e&&(E(this,"selection"),e==="clear"?this._code="":e==="back"?this._code=this._code.slice(0,-1):this._code.length<yu&&(this._code=this._code+e))}_onEnter(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i||!this._code)return;let n=i.states[e.entity];if(!n||b(n))return;let r=ds.find(o=>o.key===this._pendingMode);r&&(E(this,"success"),this._send(r,this._code))}_renderKeypad(){let t=this._code.length>0;return l`
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
          ${_u.map(e=>l`
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
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=this._optimistic===null?i:{...i,state:this._optimistic},o=r.state,c=N(r),d=fu(o),u=o==="triggered",g=t.name??i.attributes.friendly_name??t.entity,h=ds.filter(v=>v.feature===void 0||D(i,v.feature));return l`
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
            <div class="name">${g}</div>
            <div class="state ${u?"alert":""}">
              ${I(e,r)}
            </div>
          </div>
        </div>
        <div class="modes">
          ${h.map(v=>{let _=o===v.activeState,$=this._pendingMode===v.key;return l`
              <button
                class="chip ${_?"active":""} ${$?"pending":""}"
                data-mode=${v.key}
                .disabled=${n}
                aria-pressed=${_?"true":"false"}
                @click=${this._onModeTap}
              >
                ${v.label}
              </button>
            `})}
        </div>
        ${this._pendingMode!==null?this._renderKeypad():m}
      </ha-card>
    `}};Mt.styles=[T,k`
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
    `],p([y({attribute:!1})],Mt.prototype,"hass",2),p([f()],Mt.prototype,"_config",2),p([f()],Mt.prototype,"_pendingMode",2),p([f()],Mt.prototype,"_code",2),p([f()],Mt.prototype,"_optimistic",2),Mt=p([x("silk-alarm-card")],Mt);var Uo={type:"silk-vacuum-card",name:"Silk Vacuum",description:"Start, dock, locate \u2014 with battery in sight."},un=4,xu=16,ku=32,$u=512,hn=8192,Tu=2e3,Eu=3,jo="silk-vacuum-card-editor";C(jo,[{name:"entity",required:!0,selector:{entity:{domain:["vacuum"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var Yt=class extends w{constructor(){super(...arguments);this._optimisticState=null;this._optimisticFan=null}static getStubConfig(t){return{type:"custom:silk-vacuum-card",entity:Object.keys(t.states).find(i=>i.startsWith("vacuum."))}}static async getConfigElement(){return document.createElement(jo)}setConfig(t){if(!t.entity||O(t.entity)!=="vacuum")throw new Error("silk-vacuum-card: define a vacuum `entity` (e.g. vacuum.roborock)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticState=null,this._optimisticFan=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticState=null,this._optimisticFan=null},Tu)}_onCardClick(){this._config&&A(this,this._config.entity)}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];e!==void 0&&!b(e)&&(D(e,hn)||D(e,un))?this._startPause():A(this,this._config.entity)}_onStartPauseClick(t){t.stopPropagation(),this._startPause()}_startPause(){if(!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||b(t))return;let e=(this._optimisticState??t.state)==="cleaning";D(t,e?un:hn)&&(E(this),this._optimisticState=e?"paused":"cleaning",this._armExpiry(),this.hass.callService("vacuum",e?"pause":"start",{entity_id:this._config.entity}))}_onReturnHome(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];!e||b(e)||(E(this),this._optimisticState="returning",this._armExpiry(),this.hass.callService("vacuum","return_to_base",{entity_id:this._config.entity}))}_onLocate(t){t.stopPropagation(),!(!this.hass||!this._config)&&(b(this.hass.states[this._config.entity])||(E(this),this.hass.callService("vacuum","locate",{entity_id:this._config.entity})))}_onFanSpeed(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(b(this.hass.states[this._config.entity])||(E(this),this._optimisticFan=e,this._armExpiry(),this.hass.callService("vacuum","set_fan_speed",{entity_id:this._config.entity,fan_speed:e})))}render(){if(!this.hass||!this._config)return m;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=b(t),i=this._optimisticState===null||e?t:{...t,state:this._optimisticState},n=N(i),r=S(i,this._config.color),o=this._config.name??t.attributes.friendly_name??t.entity_id,c=t.attributes.battery_level,d=typeof c=="number"&&Number.isFinite(c),u=i.state==="cleaning",g=D(t,hn)||D(t,un),h=!D(t,u?un:hn);return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${n?"on":""}"
          .disabled=${e}
          aria-label=${g?u?`Pause ${o}`:`Start ${o}`:`Show details for ${o}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${o}</div>
          <div class="state">
            ${I(this.hass,i)}${d?l`<span class="sep">·</span>${Math.round(c)}%`:m}
          </div>
        </div>
        <div class="trailing">
          ${this._renderChips(t,e)}
          ${g?l`
                <button
                  class="ctl"
                  ?disabled=${e||h}
                  aria-label=${u?`Pause ${o}`:`Start ${o}`}
                  @click=${this._onStartPauseClick}
                >
                  <ha-icon icon=${u?"mdi:pause":"mdi:play"}></ha-icon>
                </button>
              `:m}
          ${D(t,xu)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Return ${o} to dock`}
                  @click=${this._onReturnHome}
                >
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>
              `:m}
          ${D(t,$u)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Locate ${o}`}
                  @click=${this._onLocate}
                >
                  <ha-icon icon="mdi:map-marker"></ha-icon>
                </button>
              `:m}
        </div>
      </ha-card>
    `}_renderChips(t,e){if(!D(t,ku))return m;let i=t.attributes.fan_speed_list;if(!Array.isArray(i))return m;let n=i.filter(o=>typeof o=="string"&&o!=="").slice(0,Eu);if(n.length===0)return m;let r=this._optimisticFan??(typeof t.attributes.fan_speed=="string"?t.attributes.fan_speed:void 0);return l`
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
    `}};Yt.styles=[T,k`
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
    `],p([y({attribute:!1})],Yt.prototype,"hass",2),p([f()],Yt.prototype,"_config",2),p([f()],Yt.prototype,"_optimisticState",2),p([f()],Yt.prototype,"_optimisticFan",2),Yt=p([x("silk-vacuum-card")],Yt);var Vo={type:"silk-camera-card",name:"Silk Camera",description:"A live view that stays fresh."},qo=10,Go="silk-camera-card-editor";C(Go,[{name:"entity",required:!0,selector:{entity:{domain:["camera"]}}},{name:"name",selector:{text:{}}},{name:"refresh_interval",selector:{number:{min:1,mode:"box"}}}],{entity:"Entity",name:"Name",refresh_interval:"Refresh interval (seconds)"},{refresh_interval:qo});var Xt=class extends w{constructor(){super(...arguments);this._counter=0;this._broken=!1;this._onVisibility=()=>{document.hidden?this._stopTimer():(this._bump(),this._startTimer())}}static getStubConfig(t){return{type:"custom:silk-camera-card",entity:Object.keys(t.states).find(i=>i.startsWith("camera."))}}static async getConfigElement(){return document.createElement(Go)}setConfig(t){if(!t.entity||O(t.entity)!=="camera")throw new Error("silk-camera-card: define a camera `entity` (e.g. camera.front_door)");if(t.refresh_interval!==void 0&&(typeof t.refresh_interval!="number"||!(t.refresh_interval>0)))throw new Error("silk-camera-card: `refresh_interval` must be a positive number of seconds");this._config=t,this.isConnected&&this._startTimer()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startTimer()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopTimer()}_intervalMs(){return Math.max(1,this._config?.refresh_interval??qo)*1e3}_bump(){this._counter++,this._broken=!1}_startTimer(){this._stopTimer(),!document.hidden&&(this._timer=window.setInterval(()=>this._bump(),this._intervalMs()))}_stopTimer(){window.clearInterval(this._timer),this._timer=void 0}_onCardClick(){this._config&&A(this,this._config.entity)}_onImgError(){this._broken=!0}render(){if(!this.hass||!this._config)return m;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${this._config.entity}</div></ha-card>`;let e=b(t),i=t.attributes.entity_picture,n=!e&&typeof i=="string"&&i!==""?i:void 0,r=this._config.name??t.attributes.friendly_name??t.entity_id,o=S(t),c=n!==void 0?`${n}${n.includes("?")?"&":"?"}counter=${this._counter}`:void 0,d=c!==void 0&&!this._broken;return l`
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
                <div class="cam-state">${I(this.hass,t)}</div>
              </div>
            `:l`
              <div class="fallback">
                <ha-icon icon="mdi:video-off"></ha-icon>
                <div class="fallback-name">${r}</div>
                <div class="fallback-state">Unavailable</div>
              </div>
            `}
      </ha-card>
    `}};Xt.styles=[T,k`
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
    `],p([y({attribute:!1})],Xt.prototype,"hass",2),p([f()],Xt.prototype,"_config",2),p([f()],Xt.prototype,"_counter",2),p([f()],Xt.prototype,"_broken",2),Xt=p([x("silk-camera-card")],Xt);var Wo={type:"silk-timer-card",name:"Silk Timer",description:"A countdown you can see moving."},Bo="silk-timer-card-editor",Cu=2e3,Au=1e3;C(Bo,[{name:"entity",required:!0,selector:{entity:{domain:["timer"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});function ps(a){if(typeof a!="string")return 0;let s=a.match(/^(?:(\d+)\s+days?,\s*)?(\d+):(\d{1,2}):(\d{1,2})/);return s?Number(s[1]??0)*86400+Number(s[2])*3600+Number(s[3])*60+Number(s[4]):0}function ms(a){let s=Math.max(0,Math.ceil(a)),t=Math.floor(s/3600),e=Math.floor(s%3600/60),i=n=>String(n).padStart(2,"0");return t>0?`${t}:${i(e)}:${i(s%60)}`:`${e}:${i(s%60)}`}var Zt=class extends w{constructor(){super(...arguments);this._now=Date.now();this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){return{type:"custom:silk-timer-card",entity:Object.keys(t.states).find(i=>i.startsWith("timer."))}}static async getConfigElement(){return document.createElement(Bo)}setConfig(t){if(!t.entity)throw new Error("silk-timer-card: `entity` is required");if(O(t.entity)!=="timer")throw new Error(`silk-timer-card: entity must be a timer, got \`${O(t.entity)}\``);this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._now=Date.now()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tick),this._tick=void 0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(t.has("hass")&&(this._now=Date.now(),this._optimistic!==null&&this._config)){let e=this.hass?.states[this._config.entity];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}}updated(){let t=this._config?this.hass?.states[this._config.entity]:void 0,e=this.isConnected&&!!t&&!b(t)&&this._displayState(t)==="active";e&&this._tick===void 0?this._tick=window.setInterval(()=>{this._now=Date.now()},Au):!e&&this._tick!==void 0&&(window.clearInterval(this._tick),this._tick=void 0)}_displayState(t){if(this._optimistic)return this._optimistic.state;let e=t.state;return e==="active"||e==="paused"?e:"idle"}_remainingSeconds(t,e,i){if(e==="active"){let n=this._optimistic?.finishesAt??Date.parse(t.attributes.finishes_at??"");return Number.isFinite(n)?Math.max(0,(n-this._now)/1e3):0}return e==="paused"?this._optimistic?.remainingS??ps(t.attributes.remaining):i}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_setOptimistic(t,e){this._optimistic=e,this._optimisticBase=t.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Cu)}_service(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;E(this);let r=this._displayState(n),o=ps(n.attributes.duration);if(t==="start"){let c=r==="paused"?this._remainingSeconds(n,r,o):o;this._setOptimistic(n,{state:"active",finishesAt:Date.now()+c*1e3})}else t==="pause"?this._setOptimistic(n,{state:"paused",remainingS:this._remainingSeconds(n,r,o)}):this._setOptimistic(n,{state:"idle"});i.callService("timer",t,{entity_id:e.entity})}_onStart(t){t.stopPropagation(),this._service("start")}_onPause(t){t.stopPropagation(),this._service("pause")}_onCancel(t){t.stopPropagation(),this._service("cancel")}_onPrimary(t){t.stopPropagation();let e=this._config?this.hass?.states[this._config.entity]:void 0;!e||b(e)||this._service(this._displayState(e)==="active"?"pause":"start")}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=this._displayState(i),o=r==="active",c=ps(i.attributes.duration),d=this._remainingSeconds(i,r,c),u=r==="idle"||c<=0?0:R(1-d/c,0,1),g=S(i,t.color),h=t.name??i.attributes.friendly_name??t.entity,v=n?l`${I(e,i)}`:o?l`${ms(d)} left`:r==="paused"?l`Paused<span class="sep">·</span>${ms(d)}`:c>0?l`Idle<span class="sep">·</span>${ms(c)}`:l`Idle`,_=n||r==="idle"?l`
            <button
              class="btn primary"
              .disabled=${n}
              aria-label=${`Start ${h}`}
              @click=${this._onStart}
            >
              <ha-icon .icon=${"mdi:play"}></ha-icon>
            </button>
          `:l`
            <button
              class="btn primary"
              aria-label=${o?`Pause ${h}`:`Resume ${h}`}
              @click=${o?this._onPause:this._onStart}
            >
              <ha-icon .icon=${o?"mdi:pause":"mdi:play"}></ha-icon>
            </button>
            <button class="btn" aria-label=${`Cancel ${h}`} @click=${this._onCancel}>
              <ha-icon .icon=${"mdi:close"}></ha-icon>
            </button>
          `;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${g}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${o?"on":""}"
          .disabled=${n}
          aria-label=${o?`Pause ${h}`:`Start ${h}`}
          @click=${this._onPrimary}
        >
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${h}</div>
          <div class="state">${v}</div>
        </div>
        <div class="trailing">${_}</div>
        <div class="track ${n||r==="idle"?"hidden":""}" aria-hidden="true">
          <div
            class="bar ${r==="idle"?"snap":""}"
            style="width:${(u*100).toFixed(2)}%"
          ></div>
        </div>
      </ha-card>
    `}};Zt.styles=[T,k`
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
    `],p([y({attribute:!1})],Zt.prototype,"hass",2),p([f()],Zt.prototype,"_config",2),p([f()],Zt.prototype,"_now",2),p([f()],Zt.prototype,"_optimistic",2),Zt=p([x("silk-timer-card")],Zt);var Yo={type:"silk-progress-card",name:"Silk Progress",description:"Any percentage, with an honest ETA."},Xo="silk-progress-card-editor";C(Xo,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"remaining",selector:{entity:{domain:["sensor"]}}}],{entity:"Entity",name:"Name",icon:"Icon",remaining:"Time-remaining entity"});var Su=new Set(["h","hr","hrs","hour","hours"]),Mu=new Set(["min","mins","minute","minutes"]),Pu=new Set(["s","sec","secs","second","seconds"]);function Ko(a){let s=Math.max(0,a),t=Math.floor(s/60),e=s%60;return t>0?`${t}h ${e}m left`:`${e}m left`}function Ru(a,s){let t=s.trim().toLowerCase();if(Su.has(t))return Ko(Math.round(a*60));if(Mu.has(t))return Ko(Math.round(a));if(Pu.has(t)){let i=Math.max(0,Math.round(a));return`${Math.floor(i/60)}:${String(i%60).padStart(2,"0")} left`}let e=Math.round(a*10)/10;return s?`${e} ${s} left`:`${e} left`}var ai=class extends w{static getStubConfig(s){return{type:"custom:silk-progress-card",entity:Object.keys(s.states).find(e=>{if(!e.startsWith("sensor."))return!1;let i=s.states[e];return i.attributes.unit_of_measurement==="%"&&i.attributes.device_class!=="battery"&&Number.isFinite(Number(i.state))})}}static async getConfigElement(){return document.createElement(Xo)}setConfig(s){if(!s.entity)throw new Error("silk-progress-card: `entity` is required");this._config=s}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}_remainingText(){let s=this._config?.remaining;if(!s||!this.hass)return;let t=this.hass.states[s];if(!t||b(t))return;let e=Number(t.state);if(!(t.state===""||!Number.isFinite(e)))return Ru(e,String(t.attributes.unit_of_measurement??""))}_onTap(){this._config&&(E(this),A(this,this._config.entity))}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=t.states[s.entity];if(!e)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${s.entity}</div>
        </ha-card>
      `;let i=b(e),n=Number(e.state),r=!i&&e.state!==""&&Number.isFinite(n),o=r?R(n,0,100):0,c=r&&n>=100,d=c?"var(--success-color, #43a047)":S(e,s.color),u=s.name??e.attributes.friendly_name??s.entity,g=!i&&!c?this._remainingText():void 0,h=i?l`${I(t,e)}`:r?c?l`Done`:g?l`In progress<span class="sep">·</span>${g}`:l`In progress`:l`—`;return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${d}"
        @click=${this._onTap}
      >
        <div class="icon ${!i&&N(e)?"on":""}">
          ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${u}</div>
          <div class="state">${h}</div>
        </div>
        <div class="trailing">
          <span class="value">${r?`${Math.round(o)}%`:"\u2014"}</span>
        </div>
        <div class="track" aria-hidden="true">
          <div class="bar" style="width:${o.toFixed(2)}%"></div>
        </div>
      </ha-card>
    `}};ai.styles=[T,k`
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
    `],p([y({attribute:!1})],ai.prototype,"hass",2),p([f()],ai.prototype,"_config",2),ai=p([x("silk-progress-card")],ai);var Zo={type:"silk-update-card",name:"Silk Updates",description:"Every pending update in one place."},Qo="silk-update-card-editor";C(Qo,[{name:"name",selector:{text:{}}},{name:"entities",selector:{entity:{multiple:!0,domain:["update"]}}},{name:"show_up_to_date",selector:{boolean:{}}}],{name:"Name",entities:"Entities (empty = every update)",show_up_to_date:"Show up-to-date items"},{show_up_to_date:!1});var Ou=2e3;function us(a){return a.attributes.title??a.attributes.friendly_name??a.entity_id}var $e=class extends w{constructor(){super(...arguments);this._installing={};this._installingTimers={}}static getStubConfig(){return{type:"custom:silk-update-card"}}static async getConfigElement(){return document.createElement(Qo)}setConfig(t){if(t.entities!==void 0&&!Array.isArray(t.entities))throw new Error("silk-update-card: `entities` must be a list of update entity ids");this._config=t,this._clearAllInstalling()}getCardSize(){return!this.hass||!this._config?3:(this._visible().length||1)+1}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback();for(let t of Object.keys(this._installingTimers))window.clearTimeout(this._installingTimers[t]);this._installingTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass))for(let e of Object.keys(this._installing)){let i=this.hass.states[e];i&&i.last_updated!==this._installing[e]&&this._clearInstalling(e)}}_clearInstalling(t){if(window.clearTimeout(this._installingTimers[t]),delete this._installingTimers[t],t in this._installing){let e={...this._installing};delete e[t],this._installing=e}}_clearAllInstalling(){for(let t of Object.keys(this._installingTimers))window.clearTimeout(this._installingTimers[t]);this._installingTimers={},this._installing={}}_tracked(){let t=this.hass,e=this._config?.entities,i=e??Object.keys(t.states).filter(r=>r.startsWith("update.")),n=[];for(let r of i){let o=t.states[r];o&&n.push(o)}return e||n.sort((r,o)=>us(r).localeCompare(us(o))),n.sort((r,o)=>+(o.state==="on")-+(r.state==="on")),n}_visible(){let t=this._tracked();return this._config?.show_up_to_date?t:t.filter(e=>e.state==="on")}_onRowClick(t){A(this,t)}_onRowKeydown(t,e){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),A(this,e))}_onInstall(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let n=i.states[e];!n||b(n)||n.attributes.in_progress||(E(this),this._installing={...this._installing,[e]:n.last_updated},window.clearTimeout(this._installingTimers[e]),this._installingTimers[e]=window.setTimeout(()=>this._clearInstalling(e),Ou),i.callService("update","install",{entity_id:e}))}_renderTrailing(t,e){let i=b(t);return!i&&(!!t.attributes.in_progress||t.entity_id in this._installing)?l`
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
    `}_renderRow(t){let e=b(t),i=t.state==="on",n=us(t),r=t.attributes.installed_version,o=t.attributes.latest_version,c=i?`${r??"\u2014"} \u2192 ${o??"\u2014"}`:r??o??"",d=t.attributes.entity_picture;return l`
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
          ${c?l`<div class="state">${c}</div>`:m}
        </div>
        ${this._renderTrailing(t,n)}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._tracked(),n=i.filter(d=>d.state==="on").length,r=t.show_up_to_date?i:i.filter(d=>d.state==="on"),o=S(i[0]),c=t.name??"Updates";return l`
      <ha-card class="control" style="--silk-accent:${o}">
        <div class="header">
          <div class="hname">${c}</div>
          ${n>0?l`<span class="badge">${n}</span>`:m}
        </div>
        ${r.length?l`<div class="rows">${r.map(d=>this._renderRow(d))}</div>`:l`
              <div class="empty">
                <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                <span>All up to date</span>
              </div>
            `}
      </ha-card>
    `}};$e.styles=[T,k`
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
    `],p([y({attribute:!1})],$e.prototype,"hass",2),p([f()],$e.prototype,"_config",2),p([f()],$e.prototype,"_installing",2),$e=p([x("silk-update-card")],$e);var ta={type:"silk-battery-card",name:"Silk Batteries",description:"The dying ones float to the top."},ea="silk-battery-card-editor";C(ea,[{name:"name",selector:{text:{}}},{name:"entities",selector:{entity:{multiple:!0,domain:["sensor"],device_class:["battery"]}}},{name:"limit",selector:{number:{min:1,max:30,mode:"box"}}}],{name:"Name",entities:"Entities (empty = every battery sensor)",limit:"Rows to show"},{limit:6});var Jo=6,ia=20,Hu=50;function hs(a){let s=a.attributes.friendly_name??a.entity_id;return s.replace(/\s+battery(\s+level)?\s*$/i,"")||s}function Nu(a){return a<ia?"crit":a<Hu?"warn":"good"}var ci=class extends w{static getStubConfig(){return{type:"custom:silk-battery-card"}}static async getConfigElement(){return document.createElement(ea)}setConfig(s){if(s.entities!==void 0&&!Array.isArray(s.entities))throw new Error("silk-battery-card: `entities` must be a list of sensor entity ids");if(s.limit!==void 0&&(!Number.isFinite(s.limit)||s.limit<1))throw new Error("silk-battery-card: `limit` must be a number of at least 1");this._config=s}getCardSize(){let s=this._config?.limit??Jo;return 2+Math.ceil(Math.min(s,12)/2)}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}_limit(){return Math.max(1,Math.floor(this._config?.limit??Jo))}_rows(){let s=this.hass,t=this._config?.entities??Object.keys(s.states).filter(i=>{if(!i.startsWith("sensor."))return!1;let n=s.states[i];return n.attributes.device_class==="battery"&&n.state!==""&&Number.isFinite(Number(n.state))}),e=[];for(let i of t){let n=s.states[i];if(!n)continue;let r=Number(n.state),o=!b(n)&&n.state!==""&&Number.isFinite(r)?R(r,0,100):void 0;e.push({stateObj:n,level:o})}return e.sort((i,n)=>i.level===void 0&&n.level===void 0?0:i.level===void 0?1:n.level===void 0?-1:i.level-n.level||hs(i.stateObj).localeCompare(hs(n.stateObj))),e.slice(0,this._limit())}_onRowClick(s){A(this,s)}_renderRow(s){let t=hs(s.stateObj),e=s.level,i=e===void 0?void 0:Nu(e);return l`
      <button
        class="row ${e===void 0?"unavailable":""}"
        aria-label=${e===void 0?t:`${t}: ${Math.round(e)}%`}
        @click=${()=>this._onRowClick(s.stateObj.entity_id)}
      >
        <span class="bname">${t}</span>
        <span class="bar">
          ${e===void 0?m:l`<span class="fill ${i}" style="width:${e}%"></span>`}
        </span>
        <span class="pct ${i==="crit"?"low":""}">
          ${e===void 0?"\u2014":`${Math.round(e)}%`}
        </span>
      </button>
    `}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=this._rows(),i=e.length?e[0].level:void 0,n=s.name??"Batteries";return l`
      <ha-card class="control" style="--silk-accent:${S(void 0)}">
        <div class="header">
          <div class="hname">${n}</div>
          ${i!==void 0&&i<ia?l`<span class="badge">${Math.round(i)}%</span>`:m}
        </div>
        ${e.length?l`<div class="rows">${e.map(r=>this._renderRow(r))}</div>`:l`<div class="empty">No battery sensors found</div>`}
      </ha-card>
    `}};ci.styles=[T,k`
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
    `],p([y({attribute:!1})],ci.prototype,"hass",2),p([f()],ci.prototype,"_config",2),ci=p([x("silk-battery-card")],ci);var na={type:"silk-status-card",name:"Silk Status",description:"A status-page timeline for any entity."},fs=16,Lu=6,gs=24,Iu=3e5,Fu=6e4,Du=new Set(["unavailable","unknown","none",""]),sa="silk-status-card-editor";C(sa,[{name:"entity",required:!0,selector:{entity:{}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}]},{name:"invert",selector:{boolean:{}}}],{entity:"Entity",name:"Name",icon:"Icon",hours_to_show:"Hours to show",invert:"Invert (off = good)"},{hours_to_show:gs});var Qt=class extends w{constructor(){super(...arguments);this._segments=null;this._uptime=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){return{type:"custom:silk-status-card",entity:Object.keys(t.states).find(i=>i.startsWith("binary_sensor."))}}static async getConfigElement(){return document.createElement(sa)}setConfig(t){if(!t.entity)throw new Error("silk-status-card: `entity` is required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-status-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._segments=null,this._uptime=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Iu)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,Fu-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??gs,i=++this._fetchSeq,n=Date.now()/1e3,r=n-e*3600,o;try{o=await this.hass.callWS({type:"history/history_during_period",start_time:new Date(r*1e3).toISOString(),end_time:new Date(n*1e3).toISOString(),entity_ids:[t],minimal_response:!0,no_attributes:!0,significant_changes_only:!1})}catch(d){console.warn("silk-status-card: history fetch failed",d);return}if(i!==this._fetchSeq)return;this._lastFetch=Date.now();let c=(o?.[t]??[]).map(d=>{let u=d.lu??d.last_updated??d.lc??d.last_changed??NaN;return[typeof u=="number"?u:Date.parse(u)/1e3,String(d.s??d.state??"")]}).filter(d=>Number.isFinite(d[0])&&d[0]<=n).sort((d,u)=>d[0]-u[0]);this._buildSegments(c,r,n)}_classify(t){if(Du.has(t.toLowerCase()))return"none";let e={entity_id:this._config.entity,state:t,attributes:{},last_changed:"",last_updated:""},i=N(e);return(this._config?.invert?!i:i)?"good":"bad"}_buildSegments(t,e,i){let n=i-e,r=[],o=0,c=0;for(let u=0;u<t.length;u++){let g=Math.max(t[u][0],e),h=u+1<t.length?Math.min(Math.max(t[u+1][0],e),i):i;if(h<=g)continue;let v=this._classify(t[u][1]),_=h-g;v==="good"?o+=_:v==="bad"&&(c+=_);let $=r[r.length-1];$&&$.kind===v?$.w+=_/n*100:r.push({x:(g-e)/n*100,w:_/n*100,kind:v})}this._segments=r;let d=o+c;this._uptime=d>0?o/d*100:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_agoLabel(){let t=this._config?.hours_to_show??gs;return t>=48&&t%24===0?`${t/24}d ago`:`${t}h ago`}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=this._uptime===null?"\u2014":`${new Intl.NumberFormat(this._locale(),{maximumFractionDigits:1}).format(this._uptime)}%`;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!n&&N(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">${i?I(e,i):""}</div>
          </div>
          <div class="trailing">
            <span class="pct">${c}</span>
          </div>
        </div>
        <div class="bar">
          <svg class="timeline" height=${fs} aria-hidden="true">
            ${this._segments?j`<g class="segs">
                  ${this._segments.filter(d=>d.kind!=="none"&&d.w>0).map(d=>j`<rect class=${d.kind} x="${d.x}%" y="0" width="${d.w}%" height=${fs}></rect>`)}
                </g>`:m}
          </svg>
          <div class="ends">
            <span>${this._agoLabel()}</span>
            <span>now</span>
          </div>
        </div>
      </ha-card>
    `}};Qt.styles=[T,k`
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
        height: ${fs}px;
        border-radius: ${Lu}px;
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
    `],p([y({attribute:!1})],Qt.prototype,"hass",2),p([f()],Qt.prototype,"_config",2),p([f()],Qt.prototype,"_segments",2),p([f()],Qt.prototype,"_uptime",2),Qt=p([x("silk-status-card")],Qt);var ra={type:"silk-chips-card",name:"Silk Chips",description:"A dense strip of glanceable pills."};function zu(a){let s=a.trim();return s.startsWith("\xB0")?"\xB0":s}var li=class extends w{constructor(){super(...arguments);this._chips=[]}static getStubConfig(t){return{type:"custom:silk-chips-card",chips:Object.keys(t.states).filter(i=>i.startsWith("sensor.")).slice(0,3)}}setConfig(t){if(!Array.isArray(t.chips)||t.chips.length===0)throw new Error("silk-chips-card: `chips` must be a non-empty list");this._chips=t.chips.map((e,i)=>{let n=typeof e=="string"?{entity:e}:{...e};if(!n.entity||typeof n.entity!="string")throw new Error(`silk-chips-card: chips[${i}] needs an \`entity\``);return n}),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}_onChipClick(t,e){t.stopPropagation(),E(this),A(this,e)}_valueText(t){let e=t.state,i=Number(e);if(e!==""&&Number.isFinite(i)){let n=t.attributes.unit_of_measurement,r=U(this.hass,t.entity_id,i);return n?`${r}${zu(String(n))}`:r}return I(this.hass,t)}_renderChip(t){let e=this.hass,i=e?.states[t.entity];if(!i)return l`
        <button
          class="pill unavailable"
          aria-label=${t.entity}
          @click=${u=>this._onChipClick(u,t.entity)}
        >
          <ha-icon .icon=${t.icon??"mdi:help-circle-outline"}></ha-icon>
          <span class="label"><span class="val">${t.name??t.entity}</span></span>
        </button>
      `;let n=b(i),r=!n&&N(i),o=S(i,t.color),c=n?I(e,i):this._valueText(i),d=t.name??i.attributes.friendly_name??t.entity;return l`
      <button
        class="pill ${r?"active":""} ${n?"unavailable":""}"
        style="--silk-accent:${o}"
        aria-label=${`${d}: ${c}`}
        @click=${u=>this._onChipClick(u,t.entity)}
      >
        ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        <span class="label">
          ${t.name?l`<span class="cname">${t.name}</span>`:m}
          <span class="val">${c}</span>
        </span>
      </button>
    `}render(){let t=this._config;return!t||!this.hass?m:l`
      <ha-card class=${t.alignment==="center"?"align-center":""}>
        ${this._chips.map(e=>this._renderChip(e))}
      </ha-card>
    `}};li.styles=[T,k`
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
    `],p([y({attribute:!1})],li.prototype,"hass",2),p([f()],li.prototype,"_config",2),li=p([x("silk-chips-card")],li);var oa={type:"silk-bar-card",name:"Silk Bar",description:"A linear gauge with a target you can see."},aa="silk-bar-card-editor";C(aa,[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}},{name:"target",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum",target:"Target"},{min:0,max:100});var Te=class extends w{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-bar-card",entity:i("battery")??i("power")??e[0]}}static async getConfigElement(){return document.createElement(aa)}setConfig(t){if(!t.entity)throw new Error("silk-bar-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-bar-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_formatBound(t){let e=this.hass?.locale?.language??this.hass?.language??"en";return new Intl.NumberFormat(e,{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=Number(i.state),o=!n&&i.state!==""&&Number.isFinite(r),c=t.min??0,d=t.max??100,u=d-c,g=o&&u>0?R((r-c)/u,0,1):0,h=(this._drawn?g:0)*100,v=typeof t.target=="number"&&Number.isFinite(t.target)&&u>0?R((t.target-c)/u,0,1)*100:void 0,_=(o?this._segmentColor(r):void 0)??S(i,t.color),$=t.unit??i.attributes.unit_of_measurement??"",M=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${_}"
        @click=${this._onCardClick}
      >
        <div class="icon">
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name" title=${M}>${M}</div>
          <div class="track">
            <div class="fill" style="width:${h}%"></div>
            ${v!==void 0?l`<div class="notch" style="left:${v}%"></div>`:m}
          </div>
          <div class="bounds">
            <span>${this._formatBound(c)}</span>
            <span>${this._formatBound(d)}</span>
          </div>
        </div>
        <div class="trailing">
          <span class="value">${o?U(e,t.entity,r):"\u2014"}</span>
          ${$?l`<span class="unit">${$}</span>`:m}
        </div>
      </ha-card>
    `}};Te.styles=[T,k`
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
    `],p([y({attribute:!1})],Te.prototype,"hass",2),p([f()],Te.prototype,"_config",2),p([f()],Te.prototype,"_drawn",2),Te=p([x("silk-bar-card")],Te);var la={type:"silk-ring-card",name:"Silk Ring",description:"A full-circle gauge built for grids."},da="silk-ring-card-editor";C(da,[{name:"entity",required:!0,selector:{entity:{domain:["counter","input_number","number","sensor"]}}},{name:"name",selector:{text:{}}},{name:"min",selector:{number:{mode:"box"}}},{name:"max",selector:{number:{mode:"box"}}}],{entity:"Entity",name:"Name",min:"Minimum",max:"Maximum"},{min:0,max:100});var vs=48,Ci=vs/2,ca=21,bs=100,Ee=class extends w{constructor(){super(...arguments);this._drawn=!1;this._segments=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state)));return{type:"custom:silk-ring-card",entity:e.find(n=>t.states[n].attributes.device_class==="battery")??e[0]}}static async getConfigElement(){return document.createElement(da)}setConfig(t){if(!t.entity)throw new Error("silk-ring-card: `entity` is required");if(t.segments!==void 0&&!Array.isArray(t.segments))throw new Error("silk-ring-card: `segments` must be a list of {from, color}");this._segments=(t.segments??[]).filter(e=>typeof e?.from=="number"&&Number.isFinite(e.from)&&typeof e?.color=="string").sort((e,i)=>e.from-i.from),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:2,rows:2,min_columns:2,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_segmentColor(t){for(let e=this._segments.length-1;e>=0;e--)if(this._segments[e].from<=t)return this._segments[e].color}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=Number(i.state),o=!n&&i.state!==""&&Number.isFinite(r),c=t.min??0,u=(t.max??100)-c,g=o&&u>0?R((r-c)/u,0,1):0,h=this._drawn?g:0,v=bs*(1-h),_=(o?this._segmentColor(r):void 0)??S(i),$=t.unit??i.attributes.unit_of_measurement??"",M=t.name??i.attributes.friendly_name??t.entity,P=t.display==="icon";return l`
      <ha-card
        class=${n?"unavailable":""}
        style="--silk-accent:${_}"
        @click=${this._onCardClick}
      >
        <div class="ring">
          <svg viewBox="0 0 ${vs} ${vs}" aria-hidden="true">
            <circle class="ring-bg" cx=${Ci} cy=${Ci} r=${ca}></circle>
            <circle
              class="ring-value"
              cx=${Ci}
              cy=${Ci}
              r=${ca}
              pathLength=${bs}
              stroke-dasharray=${bs}
              transform="rotate(-90 ${Ci} ${Ci})"
              style="stroke-dashoffset:${v};opacity:${h>0?1:0}"
            ></circle>
          </svg>
          <div class="center">
            ${P?l`
                  <ha-state-icon
                    class="cicon ${o&&r>0?"lit":""}"
                    .hass=${e}
                    .stateObj=${i}
                  ></ha-state-icon>
                `:l`
                  <div>
                    <div class="value">
                      ${o?U(e,t.entity,r):"\u2014"}
                    </div>
                    ${$?l`<div class="unit">${$}</div>`:m}
                  </div>
                `}
          </div>
        </div>
        <div class="name" title=${M}>${M}</div>
      </ha-card>
    `}};Ee.styles=[T,k`
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
    `],p([y({attribute:!1})],Ee.prototype,"hass",2),p([f()],Ee.prototype,"_config",2),p([f()],Ee.prototype,"_drawn",2),Ee=p([x("silk-ring-card")],Ee);var pa={type:"silk-energy-card",name:"Silk Energy",description:"Today versus yesterday, honestly compared."},ma="silk-energy-card-editor";C(ma,[{name:"name",required:!0,selector:{text:{}}},{name:"power",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"today",required:!0,selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"yesterday",selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"month",selector:{entity:{domain:["sensor"],device_class:"energy"}}},{name:"icon",selector:{icon:{}}}],{name:"Name",power:"Live power (W)",today:"Today (kWh)",yesterday:"Yesterday (kWh)",month:"This month (kWh)",icon:"Icon"});function fn(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}var Ce=class extends w{constructor(){super(...arguments);this._drawn=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")&&t.states[r].attributes.device_class==="energy"),i=e[0];return{type:"custom:silk-energy-card",name:i?t.states[i].attributes.friendly_name??"Energy":"Energy",today:i,yesterday:e[1]}}static async getConfigElement(){return document.createElement(ma)}setConfig(t){if(!t.name)throw new Error("silk-energy-card: `name` is required");if(!t.today)throw new Error("silk-energy-card: `today` (an energy sensor) is required");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_onCardClick(){this._config&&A(this,this._config.today)}_barRow(t,e,i,n){return l`
      <span class="bar-label">${t}</span>
      <div class="bar-track">
        <div class="bar-fill ${e}" style="width:${this._drawn?i:0}%"></div>
      </div>
      <span class="bar-value">${n}</span>
    `}_energyText(t,e,i){if(!Number.isFinite(e))return"\u2014";let n=i?.attributes.unit_of_measurement??"kWh";return`${U(this.hass,t,e)} ${n}`}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.today];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.today}</div>
        </ha-card>
      `;let n=b(i),r=S(i,t.color),o=t.icon??"mdi:power-plug",c=t.yesterday?e.states[t.yesterday]:void 0,d=t.month?e.states[t.month]:void 0,u=t.power?e.states[t.power]:void 0,g=fn(i),h=fn(c),v=fn(d),_=fn(u),$=Math.max(Number.isFinite(g)?g:0,Number.isFinite(h)?h:0),M=F=>Number.isFinite(F)&&$>0?Math.min(F/$*100,100):0,P=Number.isFinite(g)&&Number.isFinite(h)&&h>0,L=P?Math.round((g-h)/h*100):0,H=L<0?"down":L>0?"up":"",z=L<0?`\u2212${Math.abs(L)}%`:L>0?`+${L}%`:"0%",V=Number.isFinite(_)&&_>0;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${V?"on":""}">
            <ha-icon .icon=${o}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${t.name}</div>
            ${d?l`<div class="state">This month ${this._energyText(t.month,v,d)}</div>`:m}
          </div>
          ${u?l`
                <div class="trailing">
                  <span class="value">${U(e,t.power,_)}</span>
                  <span class="unit"
                    >${u.attributes.unit_of_measurement??"W"}</span
                  >
                </div>
              `:m}
        </div>
        <div class="bars">
          ${this._barRow("Today","today",M(g),this._energyText(t.today,g,i))}
          ${c?this._barRow("Yesterday","yesterday",M(h),this._energyText(t.yesterday,h,c)):m}
        </div>
        ${P?l`
              <div class="delta">
                vs yesterday <span class="pct ${H}">${z}</span>
              </div>
            `:m}
      </ha-card>
    `}};Ce.styles=[T,k`
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
    `],p([y({attribute:!1})],Ce.prototype,"hass",2),p([f()],Ce.prototype,"_config",2),p([f()],Ce.prototype,"_drawn",2),Ce=p([x("silk-energy-card")],Ce);var ua={type:"silk-todo-card",name:"Silk To-do",description:"Check things off without leaving the dashboard."},_s=5,ha="silk-todo-card-editor";C(ha,[{name:"entity",required:!0,selector:{entity:{domain:["todo"]}}},{name:"name",selector:{text:{}}},{name:"limit",selector:{number:{min:1,max:15,mode:"box"}}}],{entity:"Entity",name:"Name",limit:"Items shown"},{limit:_s});var Ae=class extends w{constructor(){super(...arguments);this._fetchedFor="";this._fetchEpoch=0}static getStubConfig(t){return{type:"custom:silk-todo-card",entity:Object.keys(t.states).find(i=>i.startsWith("todo."))}}static async getConfigElement(){return document.createElement(ha)}setConfig(t){if(!t.entity||O(t.entity)!=="todo")throw new Error("silk-todo-card: `entity` must be a todo entity");this._config=t,this._items=void 0,this._fetchedFor=""}getCardSize(){let t=this._config?.limit??_s;return Math.max(2,Math.ceil((t+2)/2))}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._fetchedFor="",this.hass&&this._config&&this._fetchItems()}willUpdate(t){if(!t.has("hass")&&!t.has("_config"))return;let e=this.hass?.states[this._config?.entity??""];e&&!b(e)&&e.last_updated!==this._fetchedFor&&this._fetchItems()}async _fetchItems(){let t=this.hass,e=this._config;if(!t||!e)return;let i=t.states[e.entity];if(!i||b(i))return;this._fetchedFor=i.last_updated;let n=++this._fetchEpoch;try{let r=await t.callWS({type:"todo/item/list",entity_id:e.entity});if(n!==this._fetchEpoch)return;let o=r.items??[];this._items=[...o.filter(c=>c.status!=="completed"),...o.filter(c=>c.status==="completed")]}catch{n===this._fetchEpoch&&(this._fetchedFor="")}}_onCardClick(){this._config&&A(this,this._config.entity)}_onItemClick(t,e){t.stopPropagation();let i=this.hass,n=this._config;if(!i||!n||!this._items||b(i.states[n.entity]))return;let r=e.status==="completed"?"needs_action":"completed";E(this),this._items=this._items.map(o=>o.uid===e.uid?{...o,status:r}:o),i.callService("todo","update_item",{entity_id:n.entity,item:e.uid,status:r}).catch(()=>{this._items=this._items?.map(o=>o.uid===e.uid?{...o,status:e.status}:o)})}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=Math.max(1,t.limit??_s),d=this._items,u=d?.slice(0,c)??[],g=d?d.length-u.length:0,h=Number(i.state),v=d?d.filter(_=>_.status!=="completed").length:Number.isFinite(h)?h:0;return l`
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
          ${v>0?l`<div class="trailing"><span class="count">${v}</span></div>`:m}
        </div>
        <div class="list">
          ${u.map(_=>{let $=_.status==="completed";return l`
              <button
                class="row ${$?"done":""}"
                role="checkbox"
                aria-checked=${$?"true":"false"}
                title=${_.summary}
                .disabled=${n}
                @click=${M=>this._onItemClick(M,_)}
              >
                <span class="check">
                  ${$?l`<ha-icon icon="mdi:check"></ha-icon>`:m}
                </span>
                <span class="summary">${_.summary}</span>
              </button>
            `})}
          ${d&&d.length===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  <span>Nothing to do</span>
                </div>
              `:m}
          ${g>0?l`<div class="more">+${g} more</div>`:m}
        </div>
      </ha-card>
    `}};Ae.styles=[T,k`
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
    `],p([y({attribute:!1})],Ae.prototype,"hass",2),p([f()],Ae.prototype,"_config",2),p([f()],Ae.prototype,"_items",2),Ae=p([x("silk-todo-card")],Ae);var fa={type:"silk-popup-card",name:"Silk Pop-up",description:"Hash-based pop-ups with zero dependencies."},Uu=200,ga="silk-popup-card-editor";C(ga,[{name:"hash",required:!0,selector:{text:{}}},{name:"title",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{hash:"Hash (e.g. #garage)",title:"Title",icon:"Icon"});var lt=class extends w{constructor(){super(...arguments);this.preview=!1;this.editMode=!1;this._open=!1;this._closing=!1;this._children=null;this._helpersMissing=!1;this._pushedHash=!1;this._buildSeq=0;this._onHashChange=()=>{this._sync(!0)};this._onKeyDown=t=>{t.key==="Escape"&&(t.stopPropagation(),this._requestClose())}}static getStubConfig(){return{type:"custom:silk-popup-card",hash:"#popup"}}static async getConfigElement(){return document.createElement(ga)}setConfig(t){if(typeof t.hash!="string"||!t.hash.startsWith("#")||t.hash.length<2)throw new Error("silk-popup-card: `hash` is required and must start with '#' (e.g. '#garage')");if(t.cards!==void 0&&!Array.isArray(t.cards))throw new Error("silk-popup-card: `cards` must be a list of card configurations");this._config=t,this._buildSeq++,this._children=null,this._helpersMissing=!1,this.isConnected&&this._sync(!1)}getCardSize(){return 1}getGridOptions(){return{columns:1,rows:1}}connectedCallback(){super.connectedCallback(),window.addEventListener("hashchange",this._onHashChange),this._sync(!1)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("hashchange",this._onHashChange),window.removeEventListener("keydown",this._onKeyDown),window.clearTimeout(this._closeTimer),this._open=!1,this._closing=!1}willUpdate(t){t.has("hass")&&this._open&&this._assignHass()}updated(t){t.has("_open")&&this._open&&this.renderRoot.querySelector(".close")?.focus({preventScroll:!0})}_sync(t){let e=this._config;e&&(window.location.hash===e.hash?(this._open||(this._pushedHash=t),this._show()):this._hide())}_show(){window.clearTimeout(this._closeTimer),this._closing=!1,this._open||(this._open=!0,window.addEventListener("keydown",this._onKeyDown)),!this._children&&!this._helpersMissing?this._buildChildren():this._assignHass()}_hide(){!this._open||this._closing||(window.removeEventListener("keydown",this._onKeyDown),this._closing=!0,this._closeTimer=window.setTimeout(()=>{this._closing=!1,this._open=!1},Uu))}_requestClose(){let t=this._config;!t||!this._open||this._closing||(window.location.hash===t.hash&&(this._pushedHash?history.back():history.replaceState(null,"",window.location.pathname+window.location.search)),this._hide())}async _buildChildren(){let t=this._config?.cards??[],e=++this._buildSeq,i=window.loadCardHelpers;if(typeof i!="function"){this._helpersMissing=!0;return}try{let n=await i();if(e!==this._buildSeq)return;this._children=t.map(r=>n.createCardElement(r)),this._assignHass()}catch(n){console.warn("silk-popup-card: card helpers failed",n),e===this._buildSeq&&(this._helpersMissing=!0)}}_assignHass(){if(!(!this.hass||!this._children))for(let t of this._children)t.hass=this.hass}_onScrimClick(){this._requestClose()}_onCloseClick(t){t.stopPropagation(),E(this),this._requestClose()}_renderBody(){return this._helpersMissing?l`<div class="note">Pop-up requires Home Assistant</div>`:this._children?this._children.length===0?l`<div class="note">No cards configured — add a <code>cards:</code> list.</div>`:this._children:m}_renderOverlay(t){let e=t.title??"";return l`
      <div class="overlay ${this._closing?"closing":""}">
        <div class="scrim" @click=${this._onScrimClick}></div>
        <div class="sheet" role="dialog" aria-modal="true" aria-label=${e||"Pop-up"}>
          <div class="header">
            ${t.icon?l`<ha-icon class="lead" .icon=${t.icon}></ha-icon>`:m}
            <div class="title" title=${e||m}>${e}</div>
            <button class="close" aria-label="Close" @click=${this._onCloseClick}>
              <ha-icon .icon=${"mdi:close"}></ha-icon>
            </button>
          </div>
          <div class="body">${this._renderBody()}</div>
        </div>
      </div>
    `}render(){let t=this._config;if(!t)return m;let e=this.preview||this.editMode;return l`
      ${e?l`
            <ha-card class="ghost">
              <ha-icon class="ghost-icon" .icon=${t.icon??"mdi:dock-window"}></ha-icon>
              <div class="info">
                <div class="name">${t.title??"Pop-up"}</div>
                <div class="state">Opens on ${t.hash}</div>
              </div>
            </ha-card>
          `:l`<div class="placeholder" aria-hidden="true"></div>`}
      ${this._open&&!this.preview?this._renderOverlay(t):m}
    `}};lt.styles=[T,k`
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
    `],p([y({attribute:!1})],lt.prototype,"hass",2),p([y({type:Boolean})],lt.prototype,"preview",2),p([y({type:Boolean})],lt.prototype,"editMode",2),p([f()],lt.prototype,"_config",2),p([f()],lt.prototype,"_open",2),p([f()],lt.prototype,"_closing",2),p([f()],lt.prototype,"_children",2),p([f()],lt.prototype,"_helpersMissing",2),lt=p([x("silk-popup-card")],lt);var ba={type:"silk-divider-card",name:"Silk Divider",description:"A quiet line that says a little."},va="silk-divider-card-editor";C(va,[{name:"label",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{label:"Label",icon:"Icon"});var Ai=class extends w{static getStubConfig(){return{type:"custom:silk-divider-card"}}static async getConfigElement(){return document.createElement(va)}setConfig(s){if(s.label!==void 0&&typeof s.label!="string")throw new Error("silk-divider-card: `label` must be a string");if(s.icon!==void 0&&typeof s.icon!="string")throw new Error("silk-divider-card: `icon` must be a string");this._config=s}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_rows:1}}render(){let s=this._config;if(!s)return m;let t=s.label?.trim()??"",e=!!(t||s.icon);return l`
      <ha-card role="separator" aria-label=${t||m}>
        <div class="line"></div>
        ${e?l`
              <div class="tag" title=${t||m}>
                ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:m}
                ${t?l`<span class="text">${t}</span>`:m}
              </div>
              <div class="line"></div>
            `:m}
      </ha-card>
    `}};Ai.styles=[T,k`
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
    `],p([f()],Ai.prototype,"_config",2),Ai=p([x("silk-divider-card")],Ai);var ya={type:"silk-navbar-card",name:"Silk Navbar",description:"A floating dock for your dashboards."},_a=6,di=class extends w{constructor(){super(...arguments);this._onLocationChanged=()=>{this.requestUpdate()}}static getStubConfig(){return{type:"custom:silk-navbar-card",items:[{icon:"mdi:home",path:"/lovelace/0"}]}}setConfig(t){if(!Array.isArray(t.items)||t.items.length===0)throw new Error("silk-navbar-card: `items` is required \u2014 2-6 of {icon, path}");if(t.items.length>_a)throw new Error(`silk-navbar-card: at most ${_a} \`items\``);t.items.forEach((e,i)=>{if(!e||typeof e.icon!="string"||!e.icon)throw new Error(`silk-navbar-card: items[${i}] needs an \`icon\``);if(typeof e.path!="string"||!e.path)throw new Error(`silk-navbar-card: items[${i}] needs a \`path\``)}),this._config=t}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}connectedCallback(){super.connectedCallback(),window.addEventListener("location-changed",this._onLocationChanged),window.addEventListener("popstate",this._onLocationChanged)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("location-changed",this._onLocationChanged),window.removeEventListener("popstate",this._onLocationChanged)}_isItemActive(t){let e=window.location.pathname;return e===t||e.endsWith(t)}_onItemClick(t,e){t.stopPropagation(),E(this,"selection"),history.pushState(null,"",e),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}))}_renderBadge(t){if(!t)return m;let e=this.hass?.states[t];if(!e||b(e))return m;let i=Number(e.state);if(e.state!==""&&Number.isFinite(i)){if(i<=0)return m;let n=Math.round(i);return l`<span class="count" aria-hidden="true">${n>99?"99+":n}</span>`}return N(e)?l`<span class="dot" aria-hidden="true"></span>`:m}_renderItem(t){let e=this._isItemActive(t.path),i=!!(this._config?.show_labels&&t.label);return l`
      <button
        class="item ${e?"active":""}"
        aria-label=${t.label??t.path}
        aria-current=${e?"page":m}
        @click=${n=>this._onItemClick(n,t.path)}
      >
        <span class="glyph">
          <ha-icon .icon=${t.icon}></ha-icon>
          ${this._renderBadge(t.badge_entity)}
        </span>
        ${i?l`<span class="label">${t.label}</span>`:m}
      </button>
    `}render(){let t=this._config;if(!t)return m;let e=S(void 0,t.color);return l`
      <ha-card style="--silk-accent:${e}">
        ${t.items.map(i=>this._renderItem(i))}
      </ha-card>
    `}};di.styles=[T,k`
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
    `],p([y({attribute:!1})],di.prototype,"hass",2),p([f()],di.prototype,"_config",2),di=p([x("silk-navbar-card")],di);var wa={type:"silk-heading-card",name:"Silk Heading",description:"A section title that can carry live chips."},xa="silk-heading-card-editor";C(xa,[{name:"heading",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"action_path",selector:{text:{}}}],{heading:"Heading",icon:"Icon",action_path:"Navigation path"});function ju(a){let s=a.trim();return s.startsWith("\xB0")?"\xB0":s}var pi=class extends w{static getStubConfig(){return{type:"custom:silk-heading-card",heading:"Living Room"}}static async getConfigElement(){return document.createElement(xa)}setConfig(s){if(!s.heading||typeof s.heading!="string")throw new Error("silk-heading-card: `heading` is required");if(s.chips!==void 0&&!Array.isArray(s.chips))throw new Error("silk-heading-card: `chips` must be a list of entity ids");this._config=s}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:3,min_rows:1}}_onCardClick(){let s=this._config?.action_path;s&&(E(this,"selection"),history.pushState(null,"",s),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0})))}_onChipClick(s,t){s.stopPropagation(),A(this,t)}_valueText(s){let t=s.state,e=Number(t);if(t!==""&&Number.isFinite(e)){let i=s.attributes.unit_of_measurement,n=U(this.hass,s.entity_id,e);return i?`${n}${ju(String(i))}`:n}return I(this.hass,s)}_renderChip(s){let e=this.hass?.states[s];if(!e)return m;let i=b(e),n=!i&&N(e),r=S(e),o=this._valueText(e),c=e.attributes.friendly_name??s;return l`
      <button
        class="chip ${n?"active":""} ${i?"unavailable":""}"
        style="--silk-accent:${r}"
        title=${c}
        aria-label=${`${c}: ${o}`}
        @click=${d=>this._onChipClick(d,s)}
      >
        ${o}
      </button>
    `}render(){let s=this._config;if(!s)return m;let t=s.chips??[],e=!!s.action_path;return l`
      <ha-card class=${e?"nav":""} @click=${this._onCardClick}>
        ${s.icon?l`<ha-icon class="lead" .icon=${s.icon}></ha-icon>`:m}
        <div class="heading" title=${s.heading}>${s.heading}</div>
        <div class="trail">
          ${t.map(i=>this._renderChip(i))}
          ${e?l`<ha-icon class="chev" .icon=${"mdi:chevron-right"}></ha-icon>`:m}
        </div>
      </ha-card>
    `}};pi.styles=[T,k`
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
    `],p([y({attribute:!1})],pi.prototype,"hass",2),p([f()],pi.prototype,"_config",2),pi=p([x("silk-heading-card")],pi);var ka={type:"silk-welcome-card",name:"Silk Welcome",description:"A greeting that knows your home."},Vu={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},qu="mdi:weather-partly-cloudy",Gu=6e4;function Wu(a){let s=a.trim();return s.startsWith("\xB0")?"\xB0":s}var $a="silk-welcome-card-editor";C($a,[{name:"name",selector:{text:{}}},{name:"temperature",selector:{entity:{domain:["sensor"]}}},{name:"weather",selector:{entity:{domain:["weather"]}}}],{name:"Name to greet",temperature:"Temperature entity",weather:"Weather entity"});var mi=class extends w{static getStubConfig(s){let t=Object.keys(s.states),e=t.find(n=>n.startsWith("weather.")),i=t.find(n=>n.startsWith("sensor.")&&s.states[n].attributes.device_class==="temperature");return{type:"custom:silk-welcome-card",weather:e,temperature:i}}static async getConfigElement(){return document.createElement($a)}setConfig(s){if(s.count_active!==void 0&&!Array.isArray(s.count_active))throw new Error("silk-welcome-card: `count_active` must be a list of entity ids");this._config=s}getCardSize(){return 2}getGridOptions(){return{columns:12,rows:1,min_rows:1}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),Gu)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer),this._clockTimer=void 0}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_greeting(s){let t=s.getHours();return t<12?"Good morning":t<18?"Good afternoon":"Good evening"}_renderWeather(){let s=this._config?.weather,t=s?this.hass?.states[s]:void 0;if(!t||b(t))return m;let e=Vu[t.state]??qu,i=Number(t.attributes.temperature);return l`
      <span class="seg">
        <ha-icon .icon=${e}></ha-icon>
        ${Number.isFinite(i)?l`<span>${U(this.hass,t.entity_id,i)}°</span>`:m}
      </span>
    `}_renderTemperature(){let s=this._config?.temperature,t=s?this.hass?.states[s]:void 0;if(!t||b(t)||t.state==="")return m;let e=Number(t.state);if(!Number.isFinite(e))return m;let i=t.attributes.unit_of_measurement,n=U(this.hass,t.entity_id,e);return l`<span class="seg">${i?`${n}${Wu(String(i))}`:n}</span>`}_renderDevices(){let s=this._config?.count_active,t=this.hass;if(!t||!Array.isArray(s)||s.length===0)return m;let e=s.filter(i=>N(t.states[i])).length;return l`
      <span class="seg devices ${e>0?"some":""}">
        ${e} ${e===1?"device":"devices"} on
      </span>
    `}render(){let s=this._config;if(!s)return m;let t=new Date,e=s.name??this.hass?.user?.name,i=`${this._greeting(t)}${e?`, ${e}`:""}`,n=new Intl.DateTimeFormat(this._locale(),{weekday:"long",month:"long",day:"numeric"}).format(t),r=[l`<span class="seg">${n}</span>`];for(let o of[this._renderWeather(),this._renderTemperature(),this._renderDevices()])o!==m&&r.push(o);return l`
      <ha-card>
        <div class="greeting" title=${i}>${i}</div>
        <div class="sub">
          ${r.map((o,c)=>c?l`<span class="sep">·</span>${o}`:o)}
        </div>
      </ha-card>
    `}};mi.styles=[T,k`
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
    `],p([y({attribute:!1})],mi.prototype,"hass",2),p([f()],mi.prototype,"_config",2),mi=p([x("silk-welcome-card")],mi);var Ta={type:"silk-clock-card",name:"Silk Clock",description:"Time, beautifully told."},Bu=Array.from({length:12},(a,s)=>{let t=s%3===0,e=s*30*Math.PI/180,i=t?39.5:42.5,n=45.5;return{x1:50+i*Math.sin(e),y1:50-i*Math.cos(e),x2:50+n*Math.sin(e),y2:50-n*Math.cos(e),quarter:t}}),Ea="silk-clock-card-editor";C(Ea,[{name:"style",selector:{select:{mode:"dropdown",options:[{value:"digital",label:"Digital"},{value:"analog",label:"Analog"}]}}},{name:"show_seconds",selector:{boolean:{}}}],{style:"Style",show_seconds:"Show seconds"},{style:"digital",show_seconds:!1});var Se=class extends w{constructor(){super(...arguments);this._now=new Date;this._fmtLocale="";this._onVisibility=()=>{document.hidden?this._stopTicking():this._startTicking()}}static getStubConfig(){return{type:"custom:silk-clock-card",style:"digital"}}static async getConfigElement(){return document.createElement(Ea)}setConfig(t){if(t.style!==void 0&&t.style!=="digital"&&t.style!=="analog")throw new Error("silk-clock-card: `style` must be 'digital' or 'analog'");this._config=t,this.isConnected&&this._startTicking()}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startTicking()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopTicking()}_cadenceMs(){let t=this._config;return t&&(t.style==="analog"||t.show_seconds)?1e3:6e4}_startTicking(){this._stopTicking(),!document.hidden&&(this._now=new Date,this._scheduleTick())}_scheduleTick(){let t=this._cadenceMs(),e=t-Date.now()%t+20;this._tickTimer=window.setTimeout(()=>{this._now=new Date,this._scheduleTick()},e)}_stopTicking(){window.clearTimeout(this._tickTimer),this._tickTimer=void 0}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_ensureFormatters(){let t=this._locale();t===this._fmtLocale&&this._timeFmt||(this._fmtLocale=t,this._timeFmt=new Intl.DateTimeFormat(t,{hour:"2-digit",minute:"2-digit"}),this._dateFmt=new Intl.DateTimeFormat(t,{weekday:"short",month:"short",day:"numeric"}),this._secondsFmt=new Intl.NumberFormat(t,{minimumIntegerDigits:2}))}_timeParts(t){let e=this._timeFmt.formatToParts(t),i=e.filter(r=>r.type!=="dayPeriod").map(r=>r.value).join("").trim(),n=e.find(r=>r.type==="dayPeriod")?.value;return{time:i,meridiem:n}}_renderDigital(t,e){let{time:i,meridiem:n}=this._timeParts(t);return l`
      <div class="time-row">
        <span class="time">${i}</span>
        ${e?l`<span class="small">${this._secondsFmt.format(t.getSeconds())}</span>`:m}
        ${n?l`<span class="small">${n}</span>`:m}
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
        ${Bu.map(d=>j`
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
        ${e?j`
            <rect
              class="hand second"
              x="49.25"
              y="13"
              width="1.5"
              height="45"
              rx="0.75"
              transform="rotate(${i*6} 50 50)"
            ></rect>`:m}
        <circle class="cap" cx="50" cy="50" r="2.6"></circle>
      </svg>
    `}render(){let t=this._config;if(!t)return m;this._ensureFormatters();let e=t.style==="analog",i=t.show_seconds===!0;return l`
      <ha-card>
        ${t.name?l`<div class="label" title=${t.name}>${t.name}</div>`:m}
        ${e?this._renderAnalog(this._now,i):this._renderDigital(this._now,i)}
      </ha-card>
    `}};Se.styles=[T,k`
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
    `],p([y({attribute:!1})],Se.prototype,"hass",2),p([f()],Se.prototype,"_config",2),p([f()],Se.prototype,"_now",2),Se=p([x("silk-clock-card")],Se);var Sa={type:"silk-dial-card",name:"Silk Dial",description:"A thermostat dial worthy of your wall."},Ku=2,Yu=800,Ca=2e3,Xu=4,Zu={heat:"mdi:fire",cool:"mdi:snowflake",heat_cool:"mdi:sun-snowflake-variant",auto:"mdi:thermostat-auto",dry:"mdi:water-percent",fan_only:"mdi:fan",off:"mdi:power"},Ma="silk-dial-card-editor";C(Ma,[{name:"entity",required:!0,selector:{entity:{domain:["climate"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var xs=200,vt=xs/2,ks=270,bn=-135,Aa=49,Qu=87,Ju=95,th=83,eh=97,ih=77,nh=84,ys=70;function $s(a,s,t){let e=(bn+ks*a)*Math.PI/180,i=Math.sin(e),n=-Math.cos(e);return{x1:(vt+s*i).toFixed(2),y1:(vt+s*n).toFixed(2),x2:(vt+t*i).toFixed(2),y2:(vt+t*n).toFixed(2)}}var sh=Array.from({length:Aa},(a,s)=>{let t=s/(Aa-1);return{frac:t,line:$s(t,Qu,Ju)}});function Me(a){if(a==null||a==="")return;let s=Number(a);return Number.isFinite(s)?s:void 0}function gn(a){let s=String(a),t=s.indexOf(".");return t<0?0:Math.min(s.length-t-1,2)}function ws(a){let s=a.replace(/_/g," ");return s.charAt(0).toUpperCase()+s.slice(1)}var dt=class extends w{constructor(){super(...arguments);this._pressed=!1;this._dragging=!1;this._dragKey="target";this._centerX=0;this._centerY=0;this._startX=0;this._startY=0}static getStubConfig(t){return{type:"custom:silk-dial-card",entity:Object.keys(t.states).find(i=>i.startsWith("climate."))}}static async getConfigElement(){return document.createElement(Ma)}setConfig(t){if(!t.entity||O(t.entity)!=="climate")throw new Error("silk-dial-card: `entity` is required and must be a climate entity");this._config=t,this._optTarget=this._optLow=this._optHigh=this._optMode=void 0}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:3}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),window.clearTimeout(this._modeHoldTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(t){if(!t.has("hass")||!this._config||!this.hass)return;let i=t.get("hass")?.states[this._config.entity],n=this.hass.states[this._config.entity];if(!(!n||n===i)){if(this._sendTimer===void 0&&!this._pressed){let r=i?.attributes,o=n.attributes;this._optTarget!==void 0&&o.temperature!==r?.temperature&&(this._optTarget=void 0),this._optLow!==void 0&&o.target_temp_low!==r?.target_temp_low&&(this._optLow=void 0),this._optHigh!==void 0&&o.target_temp_high!==r?.target_temp_high&&(this._optHigh=void 0)}this._optMode!==void 0&&n.state!==i?.state&&(this._optMode=void 0)}}_stateObj(){return this._config?this.hass?.states[this._config.entity]:void 0}_bounds(t){let e=t.attributes,i=Me(e.min_temp)??7,n=Me(e.max_temp)??35,r=n>i?n:i+1,o=Me(e.target_temp_step);return{min:i,max:r,step:o!==void 0&&o>0?o:.5}}_isRange(t){return D(t,Ku)}_target(t){return this._optTarget??Me(t.attributes.temperature)}_low(t){return this._optLow??Me(t.attributes.target_temp_low)}_high(t){return this._optHigh??Me(t.attributes.target_temp_high)}_frac(t,e,i){return R((t-e)/(i-e),0,1)}_tempUnit(){return this.hass.config?.unit_system?.temperature??"\xB0"}_valueFromPointer(t,e){let{min:i,max:n,step:r}=this._bounds(e),o=Math.atan2(t.clientX-this._centerX,this._centerY-t.clientY)*180/Math.PI,d=(R(o,bn,bn+ks)-bn)/ks,u=i+d*(n-i),g=Math.round((u-i)/r)*r+i;return R(Number(g.toFixed(gn(r))),i,n)}_onPointerDown(t){let e=this._stateObj();if(!e||b(e))return;t.stopPropagation();let i=t.currentTarget;i.setPointerCapture(t.pointerId);let n=i.getBoundingClientRect();this._centerX=n.left+n.width/2,this._centerY=n.top+n.height/2,this._startX=t.clientX,this._startY=t.clientY,this._pressed=!0,this._dragging=!1}_onPointerMove(t){if(!this._pressed)return;let e=this._stateObj();if(e){if(!this._dragging){if(Math.hypot(t.clientX-this._startX,t.clientY-this._startY)<Xu)return;this._dragging=!0,this._dragKey=this._pickDragKey(t,e)}this._applyDrag(t,e)}}_onPointerUp(){if(this._pressed){if(this._pressed=!1,!this._dragging){this._config&&A(this,this._config.entity);return}this._dragging=!1,E(this)}}_onPointerCancel(){this._pressed=!1,this._dragging=!1}_swallowClick(t){t.stopPropagation()}_pickDragKey(t,e){if(!this._isRange(e))return"target";let i=this._valueFromPointer(t,e),{min:n,max:r}=this._bounds(e),o=this._low(e)??n,c=this._high(e)??r;return Math.abs(i-o)<=Math.abs(i-c)?"low":"high"}_applyDrag(t,e){let i=this._valueFromPointer(t,e),{min:n,max:r,step:o}=this._bounds(e),c=gn(o),d=u=>Number(u.toFixed(c));if(this._dragKey==="low"){let u=this._high(e)??r;this._optLow=d(R(i,n,u))}else if(this._dragKey==="high"){let u=this._low(e)??n;this._optHigh=d(R(i,u,r))}else{if(this._optTarget===i)return;this._optTarget=i}this._queueCommit()}_onStep(t,e){t.stopPropagation(),this._nudge(e)}_onKeydown(t){let e=t.key==="ArrowUp"||t.key==="ArrowRight"?1:t.key==="ArrowDown"||t.key==="ArrowLeft"?-1:0;e&&(t.preventDefault(),t.stopPropagation(),this._nudge(e))}_nudge(t){let e=this._stateObj();if(!e||b(e))return;let{min:i,max:n,step:r}=this._bounds(e),o=gn(r),c=u=>Number(u.toFixed(o)),d=Me(e.attributes.current_temperature)??(i+n)/2;if(this._isRange(e)){let u=this._low(e)??d,g=this._high(e)??d,h=t*r;if(u+h<i&&(h=i-u),g+h>n&&(h=n-g),h===0)return;this._optLow=c(u+h),this._optHigh=c(g+h)}else{let u=this._target(e)??d;this._optTarget=c(R(u+t*r,i,n))}E(this,"selection"),this._queueCommit()}_queueCommit(){window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},Yu)}_commit(){let t=this.hass,e=this._config?.entity,i=e?t?.states[e]:void 0;if(!t||!e||!i)return;let n={entity_id:e};if(this._isRange(i)){let r=this._low(i),o=this._high(i);if(r===void 0||o===void 0)return;n.target_temp_low=r,n.target_temp_high=o}else{let r=this._target(i);if(r===void 0)return;n.temperature=r}t.callService("climate","set_temperature",n),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optTarget=this._optLow=this._optHigh=void 0},Ca)):this._optTarget=this._optLow=this._optHigh=void 0}_onMode(t,e){t.stopPropagation();let i=this.hass,n=this._stateObj();!i||!this._config||!n||b(n)||(this._optMode??n.state)!==e&&(this._optMode=e,E(this),i.callService("climate","set_hvac_mode",{entity_id:this._config.entity,hvac_mode:e}),window.clearTimeout(this._modeHoldTimer),this._modeHoldTimer=window.setTimeout(()=>{this._optMode=void 0},Ca))}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=this._optMode!==void 0&&this._optMode!==i.state?{...i,state:this._optMode}:i,o=S(r),c=t.name??i.attributes.friendly_name??t.entity,{min:d,max:u,step:g}=this._bounds(i),h=gn(g),v=this._isRange(i),_=v?void 0:this._target(i),$=v?this._low(i):void 0,M=v?this._high(i):void 0,P=Me(i.attributes.current_temperature),L=v&&$!==void 0?this._frac($,d,u):0,H=v?M!==void 0?this._frac(M,d,u):-1:_!==void 0?this._frac(_,d,u):-1,z=n||H<0,V=v?$!==void 0&&M!==void 0?`${$.toFixed(h)} \u2013 ${M.toFixed(h)}`:"\u2013":_!==void 0?_.toFixed(h):"\u2013",F=i.attributes.hvac_action,q=F&&F!=="off"?ws(F):void 0;return l`
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
            aria-valuenow=${v?M??d:_??d}
            aria-valuetext=${`${V}${this._tempUnit()}`}
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @keydown=${this._onKeydown}
            @click=${this._swallowClick}
          >
            ${this._renderDial(i,{range:v,min:d,max:u,target:_,low:$,high:M,current:P,litFrom:L,litTo:H,dimmed:z})}
            <div class="center">
              <div class="target-line ${v?"range":""}">
                <span class="target">${V}</span
                ><span class="deg">${this._tempUnit()}</span>
              </div>
              <div class="sub">
                ${P!==void 0?l`Currently ${Math.round(P*10)/10}°`:m}${P!==void 0&&q?l`<span class="sep">·</span>`:m}${q??m}
              </div>
            </div>
            <button
              class="step minus"
              ?disabled=${n}
              aria-label="Decrease target temperature"
              @pointerdown=${B=>B.stopPropagation()}
              @click=${B=>this._onStep(B,-1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <button
              class="step plus"
              ?disabled=${n}
              aria-label="Increase target temperature"
              @pointerdown=${B=>B.stopPropagation()}
              @click=${B=>this._onStep(B,1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        ${this._renderModes(i,n)}
      </ha-card>
    `}_renderDial(t,e){let n=[];e.range?(e.low!==void 0&&n.push(this._frac(e.low,e.min,e.max)),e.high!==void 0&&n.push(this._frac(e.high,e.min,e.max))):e.target!==void 0&&n.push(this._frac(e.target,e.min,e.max));let r=e.current!==void 0?$s(this._frac(e.current,e.min,e.max),ih,nh):void 0;return l`
      <svg viewBox="0 0 ${xs} ${xs}" aria-hidden="true">
        <defs>
          <!-- Neutral inset shading only: black-alpha, no chroma. -->
          <radialGradient id="silk-dial-inset">
            <stop offset="70%" stop-color="rgba(0, 0, 0, 0)"></stop>
            <stop offset="94%" stop-color="rgba(0, 0, 0, 0.05)"></stop>
            <stop offset="100%" stop-color="rgba(0, 0, 0, 0.12)"></stop>
          </radialGradient>
        </defs>
        ${sh.map(o=>j`<line
            class="tick ${!e.dimmed&&o.frac>=e.litFrom-1e-6&&o.frac<=e.litTo+1e-6?"on":""}"
            x1=${o.line.x1} y1=${o.line.y1} x2=${o.line.x2} y2=${o.line.y2}
          ></line>`)}
        ${r?j`<line class="tick-current"
                x1=${r.x1} y1=${r.y1}
                x2=${r.x2} y2=${r.y2}
              ></line>`:m}
        ${n.map(o=>{let c=$s(o,th,eh);return j`<line class="tick-target ${e.dimmed?"":"on"}"
            x1=${c.x1} y1=${c.y1} x2=${c.x2} y2=${c.y2}
          ></line>`})}
        <g class="face-g">
          <circle class="face" cx=${vt} cy=${vt} r=${ys}></circle>
          <!-- Paint-server ref stays an attribute: CSS url(#id) is unreliable in shadow DOM. -->
          <circle class="face-inset" cx=${vt} cy=${vt} r=${ys} fill="url(#silk-dial-inset)"></circle>
          <circle class="face-rim" cx=${vt} cy=${vt} r=${ys-2.5}></circle>
        </g>
      </svg>
    `}_renderModes(t,e){let i=t.attributes.hvac_modes;if(!i?.length)return m;let n=this._optMode??t.state;return l`
      <div class="modes">
        ${i.map(r=>l`
            <button
              class="chip mode ${r===n?"active":""}"
              ?disabled=${e}
              aria-label=${ws(r)}
              title=${ws(r)}
              @click=${o=>this._onMode(o,r)}
            >
              <ha-icon .icon=${Zu[r]??"mdi:thermostat"}></ha-icon>
            </button>
          `)}
      </div>
    `}};dt.styles=[T,k`
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
        transform-origin: ${vt}px ${vt}px;
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
    `],p([y({attribute:!1})],dt.prototype,"hass",2),p([f()],dt.prototype,"_config",2),p([f()],dt.prototype,"_optTarget",2),p([f()],dt.prototype,"_optLow",2),p([f()],dt.prototype,"_optHigh",2),p([f()],dt.prototype,"_optMode",2),p([f()],dt.prototype,"_pressed",2),p([f()],dt.prototype,"_dragging",2),dt=p([x("silk-dial-card")],dt);var Pa={type:"silk-humidifier-card",name:"Silk Humidifier",description:"Target humidity at a drag."},rh=3,oh=2e3,Ra="silk-humidifier-card-editor";C(Ra,[{name:"entity",required:!0,selector:{entity:{domain:["humidifier"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var Tt=class extends w{static getStubConfig(s){return{type:"custom:silk-humidifier-card",entity:Object.keys(s.states).find(e=>e.startsWith("humidifier."))}}static async getConfigElement(){return document.createElement(Ra)}setConfig(s){if(!s.entity)throw new Error("silk-humidifier-card: `entity` is required");if(O(s.entity)!=="humidifier")throw new Error(`silk-humidifier-card: \`entity\` must be a humidifier.* entity, got \`${s.entity}\``);this._config=s,this._dragTarget=void 0,this._lastUpdated=void 0,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optTimer),this._optTimer=void 0}willUpdate(s){if(!s.has("hass")||!this._config)return;let t=this.hass?.states[this._config.entity]?.last_updated;if(t&&t!==this._lastUpdated){let e=this._lastUpdated!==void 0;this._lastUpdated=t,e&&this._clearOptimistic()}}_asNumber(s){let t=Number(s);return s!=null&&s!==""&&Number.isFinite(t)?t:void 0}_effectiveTarget(s){return this._dragTarget??this._optTarget??this._asNumber(s.attributes.humidity)}_effectiveOn(s){return this._optOn??N(s)}_setOptimistic(s){s.on!==void 0&&(this._optOn=s.on),s.target!==void 0&&(this._optTarget=s.target),s.mode!==void 0&&(this._optMode=s.mode),window.clearTimeout(this._optTimer),this._optTimer=window.setTimeout(()=>this._clearOptimistic(),oh)}_clearOptimistic(){window.clearTimeout(this._optTimer),this._optTimer=void 0,this._optOn=void 0,this._optTarget=void 0,this._optMode=void 0}_onIconClick(s){if(s.stopPropagation(),!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||b(t))return;let e=!this._effectiveOn(t);G(this.hass,this._config.entity),this._setOptimistic({on:e}),E(this)}_onSlide(s){this._dragTarget=s.detail.value}_onSliderChange(s){let t=s.detail.value;this._dragTarget=void 0,!(!this.hass||!this._config)&&(this.hass.callService("humidifier","set_humidity",{entity_id:this._config.entity,humidity:t}),this._setOptimistic({target:t}),E(this))}_onModeClick(s,t){s.stopPropagation(),!(!this.hass||!this._config)&&(this.hass.callService("humidifier","set_mode",{entity_id:this._config.entity,mode:t}),this._setOptimistic({mode:t}),E(this))}_onCardClick(s){s.target.localName!=="silk-slider"&&this._config&&A(this,this._config.entity)}render(){if(!this._config||!this.hass)return m;let s=this._config,t=this.hass.states[s.entity];if(!t)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let e=b(t),i=!e&&this._effectiveOn(t),n=this._effectiveTarget(t),r=this._asNumber(t.attributes.min_humidity)??0,o=this._asNumber(t.attributes.max_humidity)??100,c=s.name??t.attributes.friendly_name??s.entity,d=(t.attributes.available_modes??[]).slice(0,rh),u=this._optMode??t.attributes.mode;return l`
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
                ${d.map(g=>l`
                    <button
                      class="chip ${g===u?"active":""}"
                      .disabled=${e}
                      @click=${h=>this._onModeClick(h,g)}
                    >
                      ${g}
                    </button>
                  `)}
              </div>
            `:m}
      </ha-card>
    `}_renderStateLine(s,t,e){let n=this._optOn!==void 0&&!b(s)?t?"On":"Off":I(this.hass,s),r=this._asNumber(s.attributes.current_humidity);return l`${n}${e!==void 0?l`<span class="sep">·</span>target ${Math.round(e)}%`:m}${r!==void 0?l`<span class="sep">·</span>now ${Math.round(r)}%`:m}`}};Tt.styles=[T],p([y({attribute:!1})],Tt.prototype,"hass",2),p([f()],Tt.prototype,"_config",2),p([f()],Tt.prototype,"_dragTarget",2),p([f()],Tt.prototype,"_optOn",2),p([f()],Tt.prototype,"_optTarget",2),p([f()],Tt.prototype,"_optMode",2),Tt=p([x("silk-humidifier-card")],Tt);var Ia={type:"silk-color-card",name:"Silk Color",description:"Pick a light color like an artist."},Fa="silk-color-card-editor";C(Fa,[{name:"entity",required:!0,selector:{entity:{domain:["light"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var ah=2e3,Oa=140,Ha=180/Math.PI,ch=new Set(["hs","rgb","xy","rgbw","rgbww"]),lh=[{kelvin:2700,rgb:[255,169,87]},{kelvin:4e3,rgb:[255,209,163]},{kelvin:6500,rgb:[255,249,253]}],Na=[[35,75],[215,55],[305,65]];function Ts(a,s){let t=R(s,0,100)/100,e=(a%360+360)%360,i=t,n=e/60,r=i*(1-Math.abs(n%2-1)),o=n<1?[i,r,0]:n<2?[r,i,0]:n<3?[0,i,r]:n<4?[0,r,i]:n<5?[r,0,i]:[i,0,r],c=1-i;return[Math.round((o[0]+c)*255),Math.round((o[1]+c)*255),Math.round((o[2]+c)*255)]}function Da(a){let s=R(a[0],0,255)/255,t=R(a[1],0,255)/255,e=R(a[2],0,255)/255,i=Math.max(s,t,e),n=Math.min(s,t,e),r=i-n,o=0;return r>0&&(i===s?o=60*((t-e)/r%6):i===t?o=60*((e-s)/r+2):o=60*((s-t)/r+4)),[(o+360)%360,i===0?0:r/i*100]}var La=a=>`rgb(${a[0]},${a[1]},${a[2]})`;function Es(a){let s=a.attributes.supported_color_modes;return Array.isArray(s)&&s.some(t=>ch.has(String(t)))}function dh(a){let s=a.attributes.supported_color_modes;return Array.isArray(s)&&s.some(t=>String(t)==="color_temp")}function ph(a){let s=a.attributes.hs_color;if(Array.isArray(s)&&s.length>=2&&Number.isFinite(Number(s[0]))&&Number.isFinite(Number(s[1])))return[Number(s[0]),Number(s[1])];let t=a.attributes.rgb_color;return Array.isArray(t)&&t.length>=3?Da([Number(t[0]),Number(t[1]),Number(t[2])]):[0,0]}var Pt=class extends w{constructor(){super(...arguments);this._optimisticHs=null;this._optimisticOn=null;this._optimisticPct=null;this._favorites=Na;this._dragging=!1;this._sliding=!1;this._painted=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("light."));return{type:"custom:silk-color-card",entity:e.find(n=>Es(t.states[n]))??e[0]}}static async getConfigElement(){return document.createElement(Fa)}setConfig(t){if(!t.entity)throw new Error("silk-color-card: `entity` is required");if(O(t.entity)!=="light")throw new Error(`silk-color-card: \`entity\` must be a light (got "${t.entity}")`);if(t.favorites!==void 0){if(!(Array.isArray(t.favorites)&&t.favorites.every(i=>Array.isArray(i)&&i.length>=2&&Number.isFinite(Number(i[0]))&&Number.isFinite(Number(i[1])))))throw new Error("silk-color-card: `favorites` must be a list of [hue, saturation] pairs");this._favorites=t.favorites.map(i=>[(Number(i[0])%360+360)%360,R(Number(i[1]),0,100)])}else this._favorites=Na;this._config=t,this._painted=!1,this._clearOptimistic()}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:3}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,!this._dragging&&!this._sliding&&this._clearOptimistic())}updated(){this._paintWheel()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticHs=null,this._optimisticOn=null,this._optimisticPct=null}_holdOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),ah)}_paintWheel(){if(this._painted)return;let t=this.renderRoot.querySelector("canvas");if(!(t instanceof HTMLCanvasElement))return;let e=Math.min(window.devicePixelRatio||1,2),i=Math.round(Oa*e);t.width=i,t.height=i;let n=t.getContext("2d");if(!n)return;let r=n.createImageData(i,i),o=r.data,c=i/2;for(let d=0;d<i;d++)for(let u=0;u<i;u++){let g=u-c+.5,h=d-c+.5,v=Math.hypot(g,h);if(v>c)continue;let _=(Math.atan2(h,g)*Ha+360)%360,$=Math.min(v/c,1)*100,[M,P,L]=Ts(_,$),H=(d*i+u)*4;o[H]=M,o[H+1]=P,o[H+2]=L,o[H+3]=Math.round(R(c-v,0,1)*255)}n.putImageData(r,0,0),this._painted=!0}_hsFromPointer(t){let e=t.currentTarget.getBoundingClientRect(),i=t.clientX-(e.left+e.width/2),n=t.clientY-(e.top+e.height/2),r=(Math.atan2(n,i)*Ha+360)%360,o=R(Math.hypot(i,n)/(e.width/2),0,1)*100;return[Math.round(r*10)/10,Math.round(o*10)/10]}_displayOn(t){return this._optimisticOn??t.state==="on"}_onWheelDown(t){let e=this.hass?.states[this._config?.entity??""];!e||b(e)||this._displayOn(e)&&(t.currentTarget.setPointerCapture(t.pointerId),this._dragging=!0,this._optimisticHs=this._hsFromPointer(t))}_onWheelMove(t){this._dragging&&(this._optimisticHs=this._hsFromPointer(t))}_onWheelUp(){if(!this._dragging)return;this._dragging=!1;let t=this._optimisticHs,e=this._config;!t||!e||!this.hass||(E(this),this._optimisticOn=!0,this._holdOptimistic(),this.hass.callService("light","turn_on",{entity_id:e.entity,hs_color:[Math.round(t[0]),Math.round(t[1])]}))}_onWheelCancel(){this._dragging&&(this._dragging=!1,this._optimisticHs=null)}_onWheelClick(t){let e=this.hass?.states[this._config?.entity??""];e&&!b(e)&&this._displayOn(e)&&t.stopPropagation()}_onSwatch(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];!r||b(r)||(E(this,"selection"),this._optimisticHs=e.hs,this._optimisticOn=!0,this._holdOptimistic(),e.kelvin!==void 0?n.callService("light","turn_on",{entity_id:i.entity,color_temp_kelvin:e.kelvin}):n.callService("light","turn_on",{entity_id:i.entity,hs_color:[Math.round(e.hs[0]),Math.round(e.hs[1])]}))}_onSlide(t){this._sliding=!0,this._optimisticPct=t.detail.value,this._optimisticOn=t.detail.value>0}_onSliderChange(t){this._sliding=!1;let e=this._config;if(!e||!this.hass)return;let i=t.detail.value;this._optimisticPct=i,this._optimisticOn=i>0,this._holdOptimistic(),E(this),i<=0?this.hass.callService("light","turn_off",{entity_id:e.entity}):this.hass.callService("light","turn_on",{entity_id:e.entity,brightness_pct:i})}_onIconClick(t){t.stopPropagation();let e=this._config;if(!e||!this.hass)return;let i=this.hass.states[e.entity];if(!i||b(i))return;let n=this._displayOn(i);E(this),G(this.hass,e.entity),this._optimisticOn=!n,this._optimisticPct=null,this._holdOptimistic()}_onCardClick(){let t=this._config,e=this.hass;if(!t||!e)return;let i=e.states[t.entity];if(i&&!b(i)&&Es(i)&&!this._displayOn(i)){E(this),this._optimisticOn=!0,this._holdOptimistic(),e.callService("light","turn_on",{entity_id:t.entity});return}A(this,t.entity)}_stopClick(t){t.stopPropagation()}_displayPct(t,e){if(this._optimisticPct!==null)return this._optimisticPct;if(!e)return 0;let i=t.attributes.brightness;return typeof i!="number"?null:R(Math.round(i/255*100),1,100)}_swatches(t){let e=dh(t),i=lh.map(r=>({rgb:r.rgb,hs:Da(r.rgb),kelvin:e?r.kelvin:void 0,label:`${r.kelvin} K white`})),n=this._favorites.map((r,o)=>({rgb:Ts(r[0],r[1]),hs:r,label:`Favorite ${o+1}`}));return[...i,...n]}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=!n&&i.state==="on",o=n?!1:this._displayOn(i),c=S(i,t.color),d=t.name??i.attributes.friendly_name??t.entity,u=n||o===r?I(e,i):o?"On":"Off",g=this._optimisticOn===null?i:{...i,state:o?"on":"off"},h=t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${g}></ha-state-icon>`;if(!Es(i))return l`
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
            ${h}
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
      `;let v=n?0:this._displayPct(i,o),_=this._optimisticHs??ph(i),$=R(_[1],0,100)/100*50,M=_[0]*Math.PI/180,P=50+$*Math.cos(M),L=50+$*Math.sin(M),H=La(Ts(_[0],_[1])),z=o&&v!==null&&!n;return l`
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
            ${h}
          </button>
          <div class="info">
            <div class="name">${d}</div>
            <div class="state">
              ${u}${z?l`<span class="sep">·</span>${v}%`:m}
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
              style="left:${P.toFixed(2)}%;top:${L.toFixed(2)}%;background:${H}"
            ></div>
          </div>
        </div>
        <div class="swatches">
          ${this._swatches(i).map(V=>l`
              <button
                class="swatch"
                style="background:${La(V.rgb)}"
                aria-label=${V.label}
                title=${V.label}
                ?disabled=${n}
                @click=${F=>this._onSwatch(F,V)}
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
    `}};Pt.styles=[T,k`
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
        max-height: ${Oa}px;
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
    `],p([y({attribute:!1})],Pt.prototype,"hass",2),p([f()],Pt.prototype,"_config",2),p([f()],Pt.prototype,"_optimisticHs",2),p([f()],Pt.prototype,"_optimisticOn",2),p([f()],Pt.prototype,"_optimisticPct",2),Pt=p([x("silk-color-card")],Pt);var Ua={type:"silk-select-card",name:"Silk Select",description:"Options as chips, not dropdowns."},mh=4,uh=2e3,ja=["select","input_select"],Va="silk-select-card-editor";C(Va,[{name:"entity",required:!0,selector:{entity:{domain:ja}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var za=a=>a.replace(/_/g," "),Pe=class extends w{constructor(){super(...arguments);this._optimistic=null}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-select-card",entity:e.find(n=>n.startsWith("select."))??e.find(n=>n.startsWith("input_select."))}}static async getConfigElement(){return document.createElement(Va)}setConfig(t){if(!t.entity)throw new Error("silk-select-card: `entity` is required");if(!ja.includes(O(t.entity)))throw new Error(`silk-select-card: \`entity\` must be a select or input_select (got "${t.entity}")`);if(t.chip_limit!==void 0&&!(Number(t.chip_limit)>=1))throw new Error("silk-select-card: `chip_limit` must be a number of at least 1");this._config=t,this._clearOptimistic()}getCardSize(){return 1}getGridOptions(){return{columns:12,rows:1,min_columns:6,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==this._lastUpdated&&(this._lastUpdated=e,this._clearOptimistic())}updated(){let t=this.renderRoot.querySelector("select"),e=this._currentOption();t&&e!==null&&t.value!==e&&(t.value=e)}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_currentOption(){if(this._optimistic!==null)return this._optimistic;let t=this.hass?.states[this._config?.entity??""];return t?t.state:null}_pick(t){let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];!n||b(n)||(E(this,"selection"),this._optimistic=t,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),uh),i.callService(O(e.entity),"select_option",{entity_id:e.entity,option:t}))}_onChipClick(t,e){t.stopPropagation(),e!==this._currentOption()&&this._pick(e)}_onSelectChange(t){t.stopPropagation();let e=t.currentTarget.value;e!==""&&e!==this._currentOption()&&this._pick(e)}_onCardClick(){this._config&&A(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_renderChips(t,e,i){return l`
      ${t.map(n=>{let r=n===e;return l`
          <button
            class="chip ${r?"active":""}"
            aria-pressed=${r?"true":"false"}
            title=${n}
            ?disabled=${i}
            @click=${o=>this._onChipClick(o,n)}
          >
            ${za(n)}
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
              <option value=${r} ?selected=${r===e}>${za(r)}</option>
            `)}
        </select>
        <ha-icon class="chevron" .icon=${"mdi:chevron-down"}></ha-icon>
      </span>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=Array.isArray(i.attributes.options)?i.attributes.options.map(String):[],o=t.chip_limit??mh,c=this._optimistic??i.state,d=this._optimistic===null?i:{...i,state:this._optimistic},u=S(i,t.color),g=t.name??i.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${u}"
        @click=${this._onCardClick}
      >
        <!-- The select card has no icon action: the icon presses with the card. -->
        <div class="icon ${!n&&N(d)?"on":""}">
          ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${d}></ha-state-icon>`}
        </div>
        <div class="info">
          <div class="name">${g}</div>
          <div class="state">${I(e,d)}</div>
        </div>
        <div class="trailing">
          ${r.length===0?m:r.length<=o?this._renderChips(r,c,n):this._renderDropdown(r,c,n,g)}
        </div>
      </ha-card>
    `}};Pe.styles=[T,k`
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
    `],p([y({attribute:!1})],Pe.prototype,"hass",2),p([f()],Pe.prototype,"_config",2),p([f()],Pe.prototype,"_optimistic",2),Pe=p([x("silk-select-card")],Pe);var Wa={type:"silk-remote-card",name:"Silk Remote",description:"A TV remote that lives on your dashboard."},hh=1,fh=8,gh=16,bh=32,qa=1024,vh=2048,_h=16384,yh=2e3,_n=120,Cs=40,As=44,vn=(_n-Cs)/2,Ga=(_n-As)/2,wh=["up","down","left","right","ok"],Ba="silk-remote-card-editor";C(Ba,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});var Et=class extends w{constructor(){super(...arguments);this._optimisticOn=null;this._optimisticPlaying=null;this._optimisticMuted=null;this._optimisticSource=null}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("media_player."));return{type:"custom:silk-remote-card",entity:e.find(n=>t.states[n].attributes.device_class==="tv")??e[0]}}static async getConfigElement(){return document.createElement(Ba)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-remote-card: define a media_player `entity` (e.g. media_player.tv)");if(t.dpad!==void 0){if(typeof t.dpad!="object"||t.dpad===null||Array.isArray(t.dpad))throw new Error("silk-remote-card: `dpad` must map up/down/left/right/ok to actions");for(let e of wh){let i=t.dpad[e];if(i!==void 0){if(typeof i?.service!="string"||!i.service.includes("."))throw new Error(`silk-remote-card: dpad.${e}.service must be a "domain.service" string`);if(i.data!==void 0&&(typeof i.data!="object"||i.data===null||Array.isArray(i.data)))throw new Error(`silk-remote-card: dpad.${e}.data must be a mapping of service fields`)}}}this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:4}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}updated(){let t=this.renderRoot.querySelector(".source select");if(!t)return;let e=this._currentSource()??"";t.value!==e&&(t.value=e)}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticOn=null,this._optimisticPlaying=null,this._optimisticMuted=null,this._optimisticSource=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticOn=null,this._optimisticPlaying=null,this._optimisticMuted=null,this._optimisticSource=null},yh)}_currentSource(){if(this._optimisticSource!==null)return this._optimisticSource;let t=this._config?this.hass?.states[this._config.entity]?.attributes.source:void 0;return typeof t=="string"&&t?t:void 0}_onCardClick(){this._config&&A(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onPowerClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];!n||b(n)||(E(this),this._optimisticOn=!(this._optimisticOn??N(n)),this._armExpiry(),G(i,e.entity))}_onSourceChange(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=t.target.value;n&&(E(this,"selection"),this._optimisticSource=n,this._armExpiry(),i.callService("media_player","select_source",{entity_id:e.entity,source:n}))}_onSimpleKey(t,e){t.stopPropagation();let i=this._config,n=this.hass;!i||!n||b(n.states[i.entity])||(E(this),n.callService("media_player",e,{entity_id:i.entity}))}_onMuteClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=this._optimisticMuted??n.attributes.is_volume_muted===!0;E(this),this._optimisticMuted=!r,this._armExpiry(),i.callService("media_player","volume_mute",{entity_id:e.entity,is_volume_muted:!r})}_onPlayPause(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;let r=this._optimisticPlaying??n.state==="playing";E(this),this._optimisticPlaying=!r,this._armExpiry(),i.callService("media_player","media_play_pause",{entity_id:e.entity})}_onPadPress(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=i.dpad?.[e];if(!r||b(n.states[i.entity]))return;let o=r.service.indexOf("."),c=r.service.slice(0,o),d=r.service.slice(o+1);E(this),n.callService(c,d,r.data?{...r.data}:void 0)}_padDir(t,e,i,n){let r=n||!this._config?.dpad?.[t];return l`
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
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=!n&&(this._optimisticOn??N(i)),o=S(i),c=t.name??i.attributes.friendly_name??t.entity,d=Array.isArray(i.attributes.source_list)?i.attributes.source_list.filter(M=>typeof M=="string"):[],u=D(i,vh)&&d.length>0,g=this._currentSource(),h=!t.dpad,v=[];if(D(i,qa)&&v.push(this._key({icon:"mdi:volume-minus",label:"Volume down",disabled:n,onClick:M=>this._onSimpleKey(M,"volume_down")})),D(i,fh)){let M=this._optimisticMuted??i.attributes.is_volume_muted===!0;v.push(this._key({icon:M?"mdi:volume-off":"mdi:volume-high",label:M?"Unmute":"Mute",disabled:n,on:M,onClick:P=>this._onMuteClick(P)}))}D(i,qa)&&v.push(this._key({icon:"mdi:volume-plus",label:"Volume up",disabled:n,onClick:M=>this._onSimpleKey(M,"volume_up")}));let _=[];if(D(i,gh)&&_.push(this._key({icon:"mdi:skip-previous",label:"Previous track",disabled:n,onClick:M=>this._onSimpleKey(M,"media_previous_track")})),D(i,hh)||D(i,_h)){let M=!n&&(this._optimisticPlaying??i.state==="playing");_.push(this._key({icon:M?"mdi:pause":"mdi:play",label:M?"Pause":"Play",disabled:n,onClick:P=>this._onPlayPause(P)}))}D(i,bh)&&_.push(this._key({icon:"mdi:skip-next",label:"Next track",disabled:n,onClick:M=>this._onSimpleKey(M,"media_next_track")}));let $=[...v];return v.length&&_.length&&$.push(l`<span class="split" aria-hidden="true"></span>`),$.push(..._),l`
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
                    ${d.map(M=>l`<option value=${M} ?selected=${M===g}>${M}</option>`)}
                  </select>
                  <ha-icon icon="mdi:chevron-down"></ha-icon>
                </div>
              `:m}
        </div>
        <div
          class="pad ${h?"dead":""}"
          title=${h?"D-pad not wired \u2014 add dpad: actions in YAML (e.g. remote.send_command)":m}
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
        ${$.length?l`<div class="keys">${$}</div>`:m}
        <div class="label" title=${c}>${c}</div>
      </ha-card>
    `}};Et.styles=[T,k`
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
        width: ${_n}px;
        height: ${_n}px;
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
        width: ${Cs}px;
        height: ${Cs}px;
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
        left: ${vn}px;
      }
      .dir.down {
        bottom: 2px;
        left: ${vn}px;
      }
      .dir.left {
        left: 2px;
        top: ${vn}px;
      }
      .dir.right {
        right: 2px;
        top: ${vn}px;
      }
      /* Center OK: raised card-surface puck against the concave dish. */
      .ok {
        position: absolute;
        top: ${Ga}px;
        left: ${Ga}px;
        width: ${As}px;
        height: ${As}px;
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
    `],p([y({attribute:!1})],Et.prototype,"hass",2),p([f()],Et.prototype,"_config",2),p([f()],Et.prototype,"_optimisticOn",2),p([f()],Et.prototype,"_optimisticPlaying",2),p([f()],Et.prototype,"_optimisticMuted",2),p([f()],Et.prototype,"_optimisticSource",2),Et=p([x("silk-remote-card")],Et);var Xa={type:"silk-media-group-card",name:"Silk Media Group",description:"Group speakers with checkboxes, not gymnastics."},Ka=4,Ya=524288,xh=2e3,Za="silk-media-group-card-editor";C(Za,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}}],{entity:"Entity"});function kh(a,s){let t=a.attributes[s];return typeof t=="string"&&t?t:void 0}var Jt=class extends w{constructor(){super(...arguments);this._optimisticGroup={};this._optimisticVolume={};this._groupBase="";this._volumeBase={}}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("media_player.")),i=e.find(r=>D(t.states[r],Ya))??e[0],n=e.filter(r=>r!==i).slice(0,3);return{type:"custom:silk-media-group-card",entity:i,players:n}}static async getConfigElement(){return document.createElement(Za)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-media-group-card: define a media_player `entity` \u2014 the group master");if(t.players!==void 0&&(!Array.isArray(t.players)||t.players.some(e=>typeof e!="string"||O(e)!=="media_player")))throw new Error("silk-media-group-card: `players` must be a list of media_player entity ids");this._config=t,this._clearOptimistic()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config||!this.hass)return;if(Object.keys(this._optimisticGroup).length){let i=this.hass.states[this._config.entity]?.last_updated;i!==void 0&&i!==this._groupBase&&(this._optimisticGroup={})}let e=Object.keys(this._optimisticVolume).filter(i=>{let n=this.hass.states[i]?.last_updated;return n!==void 0&&n!==this._volumeBase[i]});if(e.length){let i={...this._optimisticVolume};for(let n of e)delete i[n],delete this._volumeBase[n];this._optimisticVolume=i}}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticGroup={},this._optimisticVolume={},this._volumeBase={}}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticGroup={},this._optimisticVolume={},this._volumeBase={}},xh)}_isGrouped(t){let e=this._optimisticGroup[t];if(e!==void 0)return e;let i=this._config?this.hass?.states[this._config.entity]?.attributes.group_members:void 0;return Array.isArray(i)&&i.includes(t)}_volumePct(t){let e=this._optimisticVolume[t.entity_id];if(e!==void 0)return e;let i=t.attributes.volume_level;return typeof i=="number"&&Number.isFinite(i)?Math.round(R(i,0,1)*100):0}_onCardClick(){this._config&&A(this,this._config.entity)}_stopClick(t){t.stopPropagation()}_onCheckToggle(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];if(!r||b(r)||b(n.states[e]))return;let o=this._isGrouped(e);E(this),this._optimisticGroup={...this._optimisticGroup,[e]:!o},this._groupBase=r.last_updated,this._armExpiry(),o?n.callService("media_player","unjoin",{entity_id:e}):n.callService("media_player","join",{entity_id:i.entity,group_members:[e]})}_onVolumeChange(t,e){let i=this.hass;if(!i)return;let n=R(Math.round(t.detail.value),0,100);this._optimisticVolume={...this._optimisticVolume,[e]:n},this._volumeBase[e]=i.states[e]?.last_updated??"",this._armExpiry(),E(this),i.callService("media_player","volume_set",{entity_id:e,volume_level:n/100})}_renderPlayer(t,e,i){let r=this.hass.states[t],o=!r||b(r),c=!o&&this._isGrouped(t),d=r?.attributes.friendly_name??t,u=o||e||!i,g=c&&r!==void 0&&D(r,Ka);return l`
      <div class="player ${o?"off":""}">
        <button
          class="check ${c?"checked":""}"
          role="checkbox"
          aria-checked=${c?"true":"false"}
          aria-label=${c?`Ungroup ${d}`:`Group ${d}`}
          .disabled=${u}
          @click=${h=>this._onCheckToggle(h,t)}
        >
          <ha-icon icon="mdi:check"></ha-icon>
        </button>
        <div class="pname" title=${d}>${d}</div>
        ${g?l`
              <silk-slider
                class="pvol"
                .value=${this._volumePct(r)}
                .min=${0}
                .max=${100}
                .step=${1}
                ?disabled=${o||e}
                @change=${h=>this._onVolumeChange(h,t)}
                @click=${this._stopClick}
              ></silk-slider>
            `:m}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=!n&&N(i),o=S(i),c=t.name??i.attributes.friendly_name??t.entity,d=kh(i,"media_title")??I(e,i),u=D(i,Ya),g=D(i,Ka),h=(t.players??[]).filter(v=>v!==t.entity);return l`
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
        ${g?l`
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
            `:m}
        ${h.length?l`
              <div class="players">
                ${h.map(v=>this._renderPlayer(v,n,u))}
              </div>
            `:l`<div class="hint">Add players: in YAML to list group candidates.</div>`}
      </ha-card>
    `}};Jt.styles=[T,k`
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
    `],p([y({attribute:!1})],Jt.prototype,"hass",2),p([f()],Jt.prototype,"_config",2),p([f()],Jt.prototype,"_optimisticGroup",2),p([f()],Jt.prototype,"_optimisticVolume",2),Jt=p([x("silk-media-group-card")],Jt);var Ja={type:"silk-number-card",name:"Silk Number",description:"Steppers and sliders for every number helper."},tc="silk-number-card-editor";C(tc,[{name:"entity",required:!0,selector:{entity:{domain:["number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var $h=500,Th=2e3;function yn(a){if(a==null||a==="")return;let s=Number(a);return Number.isFinite(s)?s:void 0}function Eh(a){let s=String(a),t=s.indexOf(".");return t<0?0:Math.min(s.length-t-1,3)}function Qa(a){let s=yn(a.attributes.min)??0,t=yn(a.attributes.max),e=t!==void 0&&t>s?t:s+100,i=yn(a.attributes.step),n=i!==void 0&&i>0?i:1;return{min:s,max:e,step:n,decimals:Eh(n)}}var Re=class extends w{static getStubConfig(s){let t=Object.keys(s.states);return{type:"custom:silk-number-card",entity:t.find(i=>i.startsWith("input_number."))??t.find(i=>i.startsWith("number."))}}static async getConfigElement(){return document.createElement(tc)}setConfig(s){if(!s.entity||!["number","input_number"].includes(O(s.entity)))throw new Error("silk-number-card: `entity` is required and must be a number or input_number entity");this._config=s,this._optValue=void 0}getCardSize(){return this._sliderMode()?2:1}getGridOptions(){return{columns:6,rows:this._sliderMode()?2:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._holdTimer),this._sendTimer!==void 0&&(window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit())}willUpdate(s){if(!s.has("hass")||!this._config||!this.hass||this._optValue===void 0||this._sendTimer!==void 0)return;let e=s.get("hass")?.states[this._config.entity],i=this.hass.states[this._config.entity];i&&e&&i.state!==e.state&&(window.clearTimeout(this._holdTimer),this._optValue=void 0)}_sliderMode(){let s=this._config?.entity;return(s?this.hass?.states[s]:void 0)?.attributes.mode==="slider"}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatValue(s,t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return e!==void 0?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(s):new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.max(t,2)}).format(s)}_formatBound(s){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:2}).format(s)}_displayValue(s){return this._optValue??yn(s.state)}_onCardClick(){this._config&&A(this,this._config.entity)}_onIconClick(s){s.stopPropagation(),this._config&&A(this,this._config.entity)}_stopClick(s){s.stopPropagation()}_onStep(s,t){s.stopPropagation();let e=this.hass,i=this._config?e?.states[this._config.entity]:void 0;if(!e||!i||b(i))return;let n=Qa(i),r=this._displayValue(i)??n.min,o=Number(R(r+t*n.step,n.min,n.max).toFixed(n.decimals));o!==r&&(this._optValue=o,E(this,"selection"),window.clearTimeout(this._holdTimer),window.clearTimeout(this._sendTimer),this._sendTimer=window.setTimeout(()=>{this._sendTimer=void 0,this._commit()},$h))}_onSlide(s){this._optValue=s.detail.value}_onSliderChange(s){this._optValue=s.detail.value,E(this,"selection"),window.clearTimeout(this._sendTimer),this._sendTimer=void 0,this._commit()}_commit(){let s=this.hass,t=this._config?.entity,e=this._optValue;if(!s||!t||e===void 0)return;let i=O(t)==="input_number"?"input_number":"number";s.callService(i,"set_value",{entity_id:t,value:e}),this.isConnected?(window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._optValue=void 0},Th)):this._optValue=void 0}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=t.states[s.entity];if(!e)return l`<ha-card><div class="warning">Entity not found: ${s.entity}</div></ha-card>`;let i=b(e),n=S(e,s.color),r=s.name??e.attributes.friendly_name??s.entity,o=Qa(e),c=i?void 0:this._displayValue(e),d=e.attributes.unit_of_measurement??"",u=`${this._formatBound(o.min)}\u2013${this._formatBound(o.max)}${d?` ${d}`:""}`,g=e.attributes.mode==="slider";return l`
      <ha-card
        class="control ${i?"unavailable":""}"
        style="--silk-accent:${n}"
        @click=${this._onCardClick}
      >
        <div class="row">
          <button
            class="icon ${!i&&N(e)?"on":""}"
            ?disabled=${i}
            aria-label="Show details"
            @click=${this._onIconClick}
          >
            ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:l`<ha-state-icon .hass=${t} .stateObj=${e}></ha-state-icon>`}
          </button>
          <div class="info">
            <div class="name">${r}</div>
            <div class="state">${i?I(t,e):u}</div>
          </div>
          <div class="trailing">
            <button
              class="step"
              ?disabled=${i||c===void 0||c<=o.min}
              aria-label="Decrease ${r}"
              @click=${h=>this._onStep(h,-1)}
            >
              <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <span class="readout">
              <span class="value">
                ${c!==void 0?this._formatValue(c,o.decimals):"\u2014"}
              </span>
              ${d?l`<span class="unit">${d}</span>`:m}
            </span>
            <button
              class="step"
              ?disabled=${i||c===void 0||c>=o.max}
              aria-label="Increase ${r}"
              @click=${h=>this._onStep(h,1)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
        ${g?l`
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
            `:m}
      </ha-card>
    `}};Re.styles=[T,k`
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
    `],p([y({attribute:!1})],Re.prototype,"hass",2),p([f()],Re.prototype,"_config",2),p([f()],Re.prototype,"_optValue",2),Re=p([x("silk-number-card")],Re);var ec={type:"silk-keypad-card",name:"Silk Keypad",description:"A PIN pad for anything that takes a code."},ic="silk-keypad-card-editor";C(ic,[{name:"title",selector:{text:{}}}],{title:"Title"});var Ch=[{k:"1",label:"1"},{k:"2",label:"2"},{k:"3",label:"3"},{k:"4",label:"4"},{k:"5",label:"5"},{k:"6",label:"6"},{k:"7",label:"7"},{k:"8",label:"8"},{k:"9",label:"9"},{k:"back",label:"Delete",icon:"mdi:backspace-outline"},{k:"0",label:"0"},{k:"submit",label:"Submit",icon:"mdi:check"}],Ah=16,Sh=700,Rt=class extends w{constructor(){super(...arguments);this._code="";this._flash=!1;this._flashLen=0}static getStubConfig(){return{type:"custom:silk-keypad-card",action:{service:"script.turn_on"}}}static async getConfigElement(){return document.createElement(ic)}setConfig(t){let e=t.action?.service;if(typeof e!="string"||e.indexOf(".")<1)throw new Error("silk-keypad-card: `action` is required, e.g. {service: 'alarm_control_panel.alarm_disarm', data: {...}}");if(t.code_length!==void 0&&(!Number.isInteger(t.code_length)||t.code_length<1))throw new Error("silk-keypad-card: `code_length` must be a positive integer");this._config=t,this._code="",this._clearFlash()}getCardSize(){return 4}getGridOptions(){return{columns:4,rows:4,min_columns:3,min_rows:4}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._flashTimer),this._flashTimer=void 0}_clearFlash(){window.clearTimeout(this._flashTimer),this._flashTimer=void 0,this._flash=!1}_maxLength(){return this._config?.code_length??Ah}_append(t){this._code.length>=this._maxLength()||(this._clearFlash(),E(this,"selection"),this._code=this._code+t,this._config?.code_length!==void 0&&this._code.length===this._config.code_length&&this._submit())}_backspace(){this._clearFlash(),this._code&&(E(this,"selection"),this._code=this._code.slice(0,-1))}_submit(){let t=this.hass,e=this._config,i=this._code;if(!t||!e||!i)return;let n=e.action.service.indexOf("."),r=e.action.service.slice(0,n),o=e.action.service.slice(n+1);E(this,"success"),this._clearFlash();let c=i.length;this._code="",Promise.resolve(t.callService(r,o,{...e.action.data??{},code:i})).catch(()=>this._rejected(c))}_rejected(t){E(this,"failure"),this._flashLen=t,this._flash=!0,window.clearTimeout(this._flashTimer),this._flashTimer=window.setTimeout(()=>{this._flashTimer=void 0,this._flash=!1},Sh)}_onKeyTap(t){t.stopPropagation();let e=t.currentTarget.dataset.key;e&&(e==="back"?this._backspace():e==="submit"?this._submit():this._append(e))}_onKeydown(t){/^[0-9]$/.test(t.key)?(t.preventDefault(),this._append(t.key)):t.key==="Backspace"&&(t.preventDefault(),this._backspace())}_renderReadout(){let t=this._code.length,e=this._flash&&t===0,i=this._config?.code_length??(e?this._flashLen:t),n=t?`${t} digit${t===1?"":"s"} entered`:e?"Code rejected":"No code entered";return l`
      <div class="dots ${this._flash?"error":""}" role="status" aria-label=${n}>
        ${i===0?l`<span class="hint">Enter code</span>`:Array.from({length:i},(r,o)=>l`<span class="slot ${o<t?"filled":"hollow"}"></span>`)}
      </div>
    `}render(){let t=this._config;if(!t)return m;let e=this._code.length>0;return l`
      <ha-card class="control" @keydown=${this._onKeydown}>
        ${t.title?l`<div class="title">${t.title}</div>`:m}
        ${this._renderReadout()}
        <div class="keys">
          ${Ch.map(i=>l`
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
    `}};Rt.styles=[T,k`
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
    `],p([y({attribute:!1})],Rt.prototype,"hass",2),p([f()],Rt.prototype,"_config",2),p([f()],Rt.prototype,"_code",2),p([f()],Rt.prototype,"_flash",2),p([f()],Rt.prototype,"_flashLen",2),Rt=p([x("silk-keypad-card")],Rt);var rc={type:"silk-sun-card",name:"Silk Sun",description:"Where the sun is, and when it leaves."},nc="sun.sun",Mh="#e6a23c",sc=864e5,Ph=6e4,wn=50,Si=82,ui=48,Rh=13,Oh=`M ${wn-ui} ${Si} A ${ui} ${ui} 0 0 1 ${wn+ui} ${Si}`;function Hh(a,s){let t=Date.parse(String(a.attributes.next_rising??"")),e=Date.parse(String(a.attributes.next_setting??""));if(!Number.isFinite(t)||!Number.isFinite(e))return null;let i=t>e;if(i){let r=t-sc;return{day:i,f:R((s-r)/(e-r),0,1),riseMs:r,setMs:e}}let n=e-sc;return{day:i,f:R((s-n)/(t-n),0,1),riseMs:t,setMs:e}}var oc="silk-sun-card-editor";C(oc,[{name:"name",selector:{text:{}}}],{name:"Name"});var Oe=class extends w{constructor(){super(...arguments);this._now=Date.now()}static getStubConfig(){return{type:"custom:silk-sun-card",entity:nc}}static async getConfigElement(){return document.createElement(oc)}setConfig(t){this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:4,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._now=Date.now(),this._tickTimer=window.setInterval(()=>{this._now=Date.now()},Ph)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tickTimer)}_entityId(){return this._config?.entity??nc}_fmtTime(t){let e=this.hass?.locale?.language??this.hass?.language??"en";return new Intl.DateTimeFormat(e,{hour:"numeric",minute:"2-digit"}).format(new Date(t))}_onCardClick(){A(this,this._entityId())}render(){let t=this._config;if(!t)return m;let e=this.hass,i=this._entityId(),n=e?.states[i];if(e&&!n)return l`<ha-card><div class="warning">Entity not found: ${i}</div></ha-card>`;let r=b(n),o=t.color??Mh,c=t.name??n?.attributes.friendly_name??"Sun",d=n&&!r?Hh(n,this._now):null,u=0,g=0;if(d){let _=Math.PI*d.f;d.day?(u=wn-ui*Math.cos(_),g=Si-ui*Math.sin(_)):(u=wn+ui*Math.cos(_),g=Si+Rh*Math.sin(_))}let h=Number(n?.attributes.elevation),v=d?.day===!0&&Number.isFinite(h);return l`
      <ha-card
        class=${r?"unavailable":""}
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="name">${c}</div>
          ${v?l`<div class="elev">${Math.round(h)}° up</div>`:m}
        </div>
        <div class="sky">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path class="arc" d=${Oh}></path>
            <line class="horizon" x1="2" y1=${Si} x2="98" y2=${Si}></line>
          </svg>
          ${d?l`<div
                class="dot ${d.day?"":"night"}"
                style="left:${u.toFixed(2)}%;top:${g.toFixed(2)}%"
              ></div>`:m}
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
    `}};Oe.styles=[T,k`
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
    `],p([y({attribute:!1})],Oe.prototype,"hass",2),p([f()],Oe.prototype,"_config",2),p([f()],Oe.prototype,"_now",2),Oe=p([x("silk-sun-card")],Oe);var lc={type:"silk-aqi-card",name:"Silk Air",description:"One verdict for your air, with receipts."},dc=["pm25","pm10","co2","voc","humidity"],ac={pm25:"PM2.5",pm10:"PM10",co2:"CO\u2082",voc:"VOC",humidity:"Humidity"},Nh={pm25:"\xB5g/m\xB3",pm10:"\xB5g/m\xB3",co2:"ppm",voc:"",humidity:"%"},Lh={pm25:a=>a<12?"good":a<35?"fair":"poor",pm10:a=>a<54?"good":a<154?"fair":"poor",co2:a=>a<800?"good":a<1200?"fair":"poor",voc:a=>a<220?"good":a<660?"fair":"poor",humidity:a=>a>=30&&a<=60?"good":a>=25&&a<=70?"fair":"poor"},cc={good:0,fair:1,poor:2},Ih={good:"Good",fair:"Fair",poor:"Poor"},Fh={good:"var(--success-color, #57ad60)",fair:"var(--warning-color, #e6a23c)",poor:"var(--error-color, #db4437)"},Ss="silk-aqi-card-editor",Dh=[{name:"pm25",selector:{entity:{domain:["sensor"]}}},{name:"pm10",selector:{entity:{domain:["sensor"]}}},{name:"co2",selector:{entity:{domain:["sensor"]}}},{name:"voc",selector:{entity:{domain:["sensor"]}}},{name:"humidity",selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}}],zh={pm25:"PM2.5 sensor",pm10:"PM10 sensor",co2:"CO\u2082 sensor",voc:"VOC sensor",humidity:"Humidity sensor",name:"Name"},Gi=class extends w{setConfig(s){this._config=s}render(){if(!this.hass||!this._config)return m;let s={name:this._config.name,...this._config.entities??{}};return l`
      <ha-form
        .hass=${this.hass}
        .data=${s}
        .schema=${Dh}
        .computeLabel=${t=>zh[t.name]??t.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(s){s.stopPropagation();let t=s.detail.value,e={};for(let n of dc){let r=t[n];typeof r=="string"&&r&&(e[n]=r)}let i={...this._config,entities:e};typeof t.name=="string"&&t.name?i.name=t.name:delete i.name,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};p([y({attribute:!1})],Gi.prototype,"hass",2),p([f()],Gi.prototype,"_config",2);customElements.get(Ss)||customElements.define(Ss,Gi);var hi=class extends w{constructor(){super(...arguments);this._metrics=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(o=>o.startsWith("sensor.")),i=o=>e.find(c=>t.states[c].attributes.device_class===o),n=[["pm25",i("pm25")],["pm10",i("pm10")],["co2",i("carbon_dioxide")],["voc",i("volatile_organic_compounds")],["humidity",i("humidity")]],r={};for(let[o,c]of n)c&&(r[o]=c);return{type:"custom:silk-aqi-card",entities:r}}static async getConfigElement(){return document.createElement(Ss)}setConfig(t){let e=t.entities,i=e&&typeof e=="object"?dc.filter(n=>typeof e[n]=="string"&&e[n]):[];if(i.length===0)throw new Error("silk-aqi-card: `entities` needs at least one of pm25, pm10, co2, voc, humidity");this._config=t,this._metrics=i}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}_readings(t){return this._metrics.map(e=>{let i=this._config.entities[e],n=t.states[i],r=n&&!b(n)?Number(n.state):NaN,o=Number.isFinite(r);return{metric:e,entityId:i,stateObj:n,value:o?r:null,band:o?Lh[e](r):null}})}_onCardClick(){let t=this._metrics[0];this._config&&t&&A(this,this._config.entities[t])}_onChipClick(t,e){t.stopPropagation(),A(this,e)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._readings(e);if(i.every(d=>!d.stateObj))return l`<ha-card
        ><div class="warning">Entity not found: ${i[0].entityId}</div></ha-card
      >`;let n=i.reduce((d,u)=>u.band&&(!d||cc[u.band]>cc[d])?u.band:d,null),r=i.every(d=>d.band===null),o=n?Fh[n]:"var(--primary-color, #4aa8ff)",c=t.name??"Air quality";return l`
      <ha-card
        class="control ${r?"unavailable":""}"
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${t.icon?l`<div class="icon ${n?"on":""}">
                <ha-icon .icon=${t.icon}></ha-icon>
              </div>`:m}
          <div class="info">
            <div class="verdict ${n?"":"none"}">
              <span class="vdot"></span>
              <span class="word">${n?Ih[n]:"\u2014"}</span>
            </div>
            <div class="state">${c}</div>
          </div>
        </div>
        <div class="chips">
          ${i.map(d=>{let u=d.stateObj?.attributes.unit_of_measurement??Nh[d.metric],g=d.value!==null?`${U(e,d.entityId,d.value)}${u?` ${u}`:""}`:"\u2014";return l`
              <button
                class="chip ${d.band??""}"
                aria-label=${`${ac[d.metric]}: ${g}`}
                @click=${h=>this._onChipClick(h,d.entityId)}
              >
                <span class="metric">${ac[d.metric]}</span>
                <span class="reading">${g}</span>
              </button>
            `})}
        </div>
      </ha-card>
    `}};hi.styles=[T,k`
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
    `],p([y({attribute:!1})],hi.prototype,"hass",2),p([f()],hi.prototype,"_config",2),hi=p([x("silk-aqi-card")],hi);var hc={type:"silk-heatmap-card",name:"Silk Heatmap",description:"Seven days of rhythm in one glance."},fc=7,gc=14,Mi=24,Ms=2,Uh=2,xn=18,jh=12,Ps=.06,pc=.95,Vh=.03,qh=9e4,Gh=new Set(["unavailable","unknown","none",""]);function mc(a){return`${a.getFullYear()}-${a.getMonth()}-${a.getDate()}`}function uc(a,s){if(!a.length)return 0;let t=(a.length-1)*s,e=Math.floor(t),i=Math.ceil(t);return a[e]+(a[i]-a[e])*(t-e)}function kn(a){return Array.from({length:a},()=>new Array(Mi).fill(null))}var bc="silk-heatmap-card-editor";C(bc,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"days",selector:{number:{min:1,max:gc,mode:"box"}}}],{entity:"Entity",name:"Name",days:"Days to show"},{days:fc});var te=class extends w{constructor(){super(...arguments);this._data=null;this._plot=null;this._fetchStarted=!1;this._fetchSeq=0;this._onWsReady=()=>{this._refresh()}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-heatmap-card",entity:i("temperature")??i("humidity")??i("power")??e[0]}}static async getConfigElement(){return document.createElement(bc)}setConfig(t){if(!t.entity)throw new Error("silk-heatmap-card: `entity` is required");if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-heatmap-card: `days` must be a positive number");this._config=t,this._data=null,this._fetchStarted=!1}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:3}}connectedCallback(){super.connectedCallback(),this._scheduleHourly(),this.hasUpdated&&(this._observePlot(),this._fetchStarted&&this._refresh())}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._hourlyTimer),this._resize?.disconnect(),this._connection?.removeEventListener("ready",this._onWsReady),this._connection=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._connection){let e=this.hass.connection;e&&(e.addEventListener("ready",this._onWsReady),this._connection=e)}this._fetchStarted||(this._fetchStarted=!0,this._refresh())}}updated(){this._observePlot()}_observePlot(){let t=this.renderRoot.querySelector(".plot");t&&(this._resize||(this._resize=new ResizeObserver(e=>{let i=e[e.length-1].contentRect,n=Math.round(i.width),r=Math.round(i.height);(!this._plot||this._plot.w!==n||this._plot.h!==r)&&(this._plot={w:n,h:r})})),this._resize.observe(t))}_days(){return R(Math.round(this._config?.days??fc),1,gc)}_scheduleHourly(){window.clearTimeout(this._hourlyTimer);let t=Date.now(),e=(Math.floor(t/36e5)+1)*36e5+qh;this._hourlyTimer=window.setTimeout(()=>{this._refresh(),this._scheduleHourly()},e-t)}async _refresh(){let t=this.hass,e=this._config;if(!t||!e)return;let i=this._days(),n=++this._fetchSeq,r=new Date,o=[];for(let g=0;g<i;g++)o.push(new Date(r.getFullYear(),r.getMonth(),r.getDate()-(i-1-g)).getTime());let c=r.getTime(),d;try{d=await this._fetchStatistics(t,e.entity,o,c),d||(d=await this._fetchHistoryMeans(t,e.entity,o,c))}catch(g){console.warn("silk-heatmap-card: data fetch failed",g);return}if(n!==this._fetchSeq)return;let u=d.flat().filter(g=>g!==null).sort((g,h)=>g-h);this._data={days:o,grid:d,lo:uc(u,.05),hi:uc(u,.95)}}async _fetchStatistics(t,e,i,n){let o=((await t.callWS({type:"recorder/statistics_during_period",start_time:new Date(i[0]).toISOString(),end_time:new Date(n).toISOString(),statistic_ids:[e],period:"hour",types:["mean"]}))?.[e]??[]).filter(h=>typeof h.mean=="number"&&Number.isFinite(h.mean));if(!o.length)return null;let c=new Map(i.map((h,v)=>[mc(new Date(h)),v])),d=kn(i.length),u=kn(i.length);for(let h of o){let v=typeof h.start=="number"?h.start:Date.parse(h.start);if(!Number.isFinite(v))continue;let _=new Date(v),$=c.get(mc(_));if($===void 0)continue;let M=_.getHours();d[$][M]=(d[$][M]??0)+h.mean,u[$][M]=(u[$][M]??0)+1}let g=kn(i.length);for(let h=0;h<i.length;h++)for(let v=0;v<Mi;v++){let _=u[h][v];_&&(g[h][v]=d[h][v]/_)}return g}async _fetchHistoryMeans(t,e,i,n){let r=await t.callWS({type:"history/history_during_period",start_time:new Date(i[0]).toISOString(),end_time:new Date(n).toISOString(),entity_ids:[e],minimal_response:!0,no_attributes:!0,significant_changes_only:!1}),o=n/1e3,c=(r?.[e]??[]).map(g=>{let h=g.lu??g.last_updated??g.lc??g.last_changed??NaN,v=typeof h=="number"?h:Date.parse(h)/1e3,_=String(g.s??g.state??"").toLowerCase(),$=Gh.has(_)?NaN:Number(g.s??g.state);return{t:v,v:Number.isFinite($)?$:NaN}}).filter(g=>Number.isFinite(g.t)&&g.t<=o).sort((g,h)=>g.t-h.t),d=kn(i.length),u=0;for(let g=0;g<i.length;g++){let h=new Date(i[g]);for(let v=0;v<Mi;v++){let _=new Date(h.getFullYear(),h.getMonth(),h.getDate(),v).getTime()/1e3,$=Math.min(new Date(h.getFullYear(),h.getMonth(),h.getDate(),v+1).getTime()/1e3,o);if($<=_)continue;for(;u+1<c.length&&c[u+1].t<=_;)u++;let M=0,P=0;for(let L=u;L<c.length&&c[L].t<$;L++){let H=Math.max(c[L].t,_),z=Math.min(L+1<c.length?c[L+1].t:o,$);z>H&&Number.isFinite(c[L].v)&&(M+=c[L].v*(z-H),P+=z-H)}P>0&&(d[g][v]=M/P)}}return d}_opacity(t,e,i){if(i<=e)return(Ps+pc)/2;let n=R((t-e)/(i-e),0,1);return Math.round((Ps+n*(pc-Ps))*1e3)/1e3}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){this._config&&A(this,this._config.entity)}_renderGrid(t){let e=this._plot,i=this._data,n=this._config;if(!e||!i||!n)return m;let r=i.days.length,o=e.w-xn,c=e.h-jh,d=(o+Ms)/r,u=d-Ms,g=c/Mi>=6?Ms:1,h=(c+g)/Mi,v=h-g;if(u<=1||v<=.5)return m;let _=Math.min(Uh,u/2,v/2),$=Date.now(),M=this._locale(),P=new Intl.DateTimeFormat(M,{weekday:u<24?"narrow":"short"}),L=new Intl.DateTimeFormat(M,{weekday:"short"}),H=[];for(let F=0;F<r;F++){let q=new Date(i.days[F]),B=Math.round(xn+F*d);for(let X=0;X<Mi&&!(new Date(q.getFullYear(),q.getMonth(),q.getDate(),X).getTime()>$);X++){let Z=i.grid[F][X],tt=Z===null?Vh:this._opacity(Z,i.lo,i.hi),Q=Z===null?"\u2014":`${U(this.hass,n.entity,Z)}${t}`;H.push(j`<rect class="cell" x=${B} y=${(X*h).toFixed(1)} width=${u.toFixed(1)} height=${v.toFixed(1)} rx=${_.toFixed(1)} fill-opacity=${tt}>
            <title>${L.format(q)} ${X}:00 · ${Q}</title>
          </rect>`)}}let z=[0,6,12,18].map(F=>j`<text class="axis" x=${xn-6} y=${(F*h+v/2).toFixed(1)} text-anchor="end" dominant-baseline="central">${F}</text>`),V=i.days.map((F,q)=>j`<text class="axis" x=${(xn+q*d+u/2).toFixed(1)} y=${e.h-2} text-anchor="middle">${P.format(new Date(F))}</text>`);return l`
      <svg width=${e.w} height=${e.h} aria-hidden="true">
        <g class="cells">${H}</g>
        ${z}${V}
      </svg>
    `}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=i?.attributes.unit_of_measurement??"",d=Number(i?.state),u=!n&&i!==void 0&&i.state!==""&&Number.isFinite(d);return l`
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
            <span class="value">${u?U(e,t.entity,d):"\u2014"}</span>
            ${u&&c?l`<span class="unit">${c}</span>`:m}
          </div>
        </div>
        <div class="plot">${this._renderGrid(c)}</div>
      </ha-card>
    `}};te.styles=[T,k`
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
    `],p([y({attribute:!1})],te.prototype,"hass",2),p([f()],te.prototype,"_config",2),p([f()],te.prototype,"_data",2),p([f()],te.prototype,"_plot",2),te=p([x("silk-heatmap-card")],te);var xc={type:"silk-week-card",name:"Silk Week",description:"Daily totals as honest little bars."},kc=7,$c=31,vc=2,Wh=4,Bh=2,_c=14,yc=12,Kh=9e4;function wc(a){return`${a.getFullYear()}-${a.getMonth()}-${a.getDate()}`}var et=a=>Math.round(a*10)/10,Tc="silk-week-card-editor";C(Tc,[{name:"entity",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}},{name:"days",selector:{number:{min:1,max:$c,mode:"box"}}}],{entity:"Entity",name:"Name",days:"Days to show"},{days:kc});var Ot=class extends w{constructor(){super(...arguments);this._bars=null;this._noStats=!1;this._plot=null;this._fetchStarted=!1;this._fetchSeq=0;this._onWsReady=()=>{this._refresh()}}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-week-card",entity:i("energy")??i("gas")??i("water")??e.find(n=>Number.isFinite(Number(t.states[n].state)))}}static async getConfigElement(){return document.createElement(Tc)}setConfig(t){if(!t.entity)throw new Error("silk-week-card: `entity` is required");if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-week-card: `days` must be a positive number");this._config=t,this._bars=null,this._noStats=!1,this._fetchStarted=!1}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._scheduleHourly(),this.hasUpdated&&(this._observePlot(),this._fetchStarted&&this._refresh())}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._hourlyTimer),this._resize?.disconnect(),this._connection?.removeEventListener("ready",this._onWsReady),this._connection=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._connection){let e=this.hass.connection;e&&(e.addEventListener("ready",this._onWsReady),this._connection=e)}this._fetchStarted||(this._fetchStarted=!0,this._refresh())}}updated(){this._observePlot()}_observePlot(){let t=this.renderRoot.querySelector(".plot");t&&(this._resize||(this._resize=new ResizeObserver(e=>{let i=e[e.length-1].contentRect,n=Math.round(i.width),r=Math.round(i.height);(!this._plot||this._plot.w!==n||this._plot.h!==r)&&(this._plot={w:n,h:r})})),this._resize.observe(t))}_days(){return R(Math.round(this._config?.days??kc),1,$c)}_scheduleHourly(){window.clearTimeout(this._hourlyTimer);let t=Date.now(),e=(Math.floor(t/36e5)+1)*36e5+Kh;this._hourlyTimer=window.setTimeout(()=>{this._refresh(),this._scheduleHourly()},e-t)}async _refresh(){let t=this.hass,e=this._config;if(!t||!e)return;let i=this._days(),n=++this._fetchSeq,r=new Date,o=[];for(let $=0;$<i;$++)o.push(new Date(r.getFullYear(),r.getMonth(),r.getDate()-(i-1-$)).getTime());let c;try{c=await t.callWS({type:"recorder/statistics_during_period",start_time:new Date(o[0]).toISOString(),end_time:r.toISOString(),statistic_ids:[e.entity],period:"day",types:["change","mean"]})}catch($){console.warn("silk-week-card: statistics fetch failed",$);return}if(n!==this._fetchSeq)return;let d=c?.[e.entity]??[],u=$=>typeof $=="number"&&Number.isFinite($),g=d.some($=>u($.change)),h=d.some($=>u($.mean));if(!g&&!h){this._noStats=!0,this._bars=null;return}let v=new Map(o.map(($,M)=>[wc(new Date($)),M])),_=new Array(i).fill(null);for(let $ of d){let M=typeof $.start=="number"?$.start:Date.parse($.start);if(!Number.isFinite(M))continue;let P=v.get(wc(new Date(M)));if(P===void 0)continue;let L=g?$.change:$.mean;u(L)&&(_[P]=L)}this._noStats=!1,this._bars=o.map(($,M)=>({ts:$,v:_[M]}))}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){this._config&&A(this,this._config.entity)}_barPath(t,e,i,n,r){let o=Math.min(Wh,i/2,n),c=e-n,d=`M${et(t)},${et(e)} V${et(c+o)} Q${et(t)},${et(c)} ${et(t+o)},${et(c)} H${et(t+i-o)} Q${et(t+i)},${et(c)} ${et(t+i)},${et(c+o)} V${et(e)} Z`;return j`<path class="bar ${r?"today":"past"}" d=${d}></path>`}_renderBars(t){if(this._noStats)return l`<div class="note">No long-term statistics</div>`;let e=this._plot,i=this._bars,n=this._config;if(!e||!i||!i.length||!n)return m;let r=i.length,o=e.h-_c-yc,c=(e.w+vc)/r,d=c-vc;if(d<=1||o<=8)return m;let u=_c+o,g=-1,h=0;i.forEach((H,z)=>{H.v!==null&&H.v>h&&(h=H.v,g=z)});let v=r-1,_=this._locale(),$=new Intl.DateTimeFormat(_,{weekday:"narrow"}),M=new Intl.DateTimeFormat(_,{weekday:"short",month:"short",day:"numeric"}),P=[],L=[];for(let H=0;H<r;H++){let z=i[H],V=H*c,F=z.v!==null,q=F&&h>0&&z.v>0?Math.max(Bh,z.v/h*o):0;q>0&&P.push(this._barPath(V,u,d,q,H===v)),F&&(H===g||H===v)&&L.push(j`<text class="val" x=${et(V+d/2)} y=${et(Math.max(9,u-q-4))} text-anchor="middle">${U(this.hass,n.entity,z.v)}</text>`),L.push(j`<text class="axis" x=${et(V+d/2)} y=${e.h-2} text-anchor="middle">${$.format(new Date(z.ts))}</text>`);let B=F?`${U(this.hass,n.entity,z.v)}${t}`:"\u2014";P.push(j`<rect class="hit" x=${et(V)} y="0" width=${et(d)} height=${e.h-yc}>
          <title>${M.format(new Date(z.ts))} · ${B}</title>
        </rect>`)}return l`
      <svg width=${e.w} height=${e.h} aria-hidden="true">
        <g class="chart">${P}${L}</g>
      </svg>
    `}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=i?.attributes.unit_of_measurement??"",d=this._bars?.length?this._bars[this._bars.length-1].v:null;return l`
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
            <span class="value">${d!==null?U(e,t.entity,d):"\u2014"}</span>
            ${d!==null&&c?l`<span class="unit">${c}</span>`:m}
          </div>
        </div>
        <div class="plot">${this._renderBars(c)}</div>
      </ha-card>
    `}};Ot.styles=[T,k`
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
    `],p([y({attribute:!1})],Ot.prototype,"hass",2),p([f()],Ot.prototype,"_config",2),p([f()],Ot.prototype,"_bars",2),p([f()],Ot.prototype,"_noStats",2),p([f()],Ot.prototype,"_plot",2),Ot=p([x("silk-week-card")],Ot);var Sc={type:"silk-network-card",name:"Silk Network",description:"Down and up, mirrored like a router should."},Yh="Network",Xh="mdi:swap-vertical",Zh="#e6a23c",Mc=3,Ec=60,Cc=3,Qh=3e5,Jh=6e4,Pc="silk-network-card-editor";C(Pc,[{name:"download",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"upload",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}},{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}}],{download:"Download entity",upload:"Upload entity",name:"Name",hours_to_show:"Hours to show"},{hours_to_show:Mc});function Ac(a,s,t,e){let i=0;for(let o=0;o<a.length;o++){let c=a[o];Number.isFinite(c)&&c>i&&(i=c)}let n=i>0?t/i:0,r=new Float64Array(a.length);for(let o=0;o<a.length;o++){let c=a[o];r[o]=Number.isFinite(c)?s+e*Math.max(c,0)*n:NaN}return r}var Ht=class extends w{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._downVals=null;this._upVals=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastStamp=""}static getStubConfig(t){let e=Object.keys(t.states).filter(c=>c.startsWith("sensor.")&&Number.isFinite(Number(t.states[c].state))),i=e.filter(c=>t.states[c].attributes.device_class==="data_rate"),n=i.length>=2?i:e,r=n.find(c=>/down|rx/.test(c))??n[0],o=n.find(c=>c!==r&&/up|tx/.test(c))??n.find(c=>c!==r);return{type:"custom:silk-network-card",download:r,upload:o}}static async getConfigElement(){return document.createElement(Pc)}setConfig(t){if(!t.download||!t.upload)throw new Error("silk-network-card: `download` and `upload` are required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-network-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._downVals=null,this._upVals=null,this._lastStamp=""}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Qh)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height)}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this._config,e=this.hass?.states[t.download]?.last_updated??"",i=this.hass?.states[t.upload]?.last_updated??"";if(!e&&!i)return;let n=`${e}|${i}`;if(n===this._lastStamp||(this._lastStamp=n,this._refreshTimer))return;let r=Math.max(0,Jh-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},r)}async _refresh(){if(!this.hass||!this._config)return;let{download:t,upload:e}=this._config,i=this._config.hours_to_show??Mc,n=++this._fetchSeq,r=Date.now()/1e3,o=r-i*3600,c;try{c=await ht(this.hass,[t,e],o,r,i)}catch(d){console.warn("silk-network-card: history fetch failed",d);return}n===this._fetchSeq&&(this._lastFetch=Date.now(),this._downVals=ft(c[t]??[],o,r,Ec),this._upVals=ft(c[e]??[],o,r,Ec),this._rev++)}_rateText(t,e,i,n){let r=Number(i?.state);if(!i||b(i)||!Number.isFinite(r))return`${t} \u2014`;let o=U(this.hass,e,r);return n?`${t} ${o} ${n}`:`${t} ${o}`}_onTap(){this._config&&(E(this),A(this,this._config.download))}render(){let t=this._config;if(!t)return m;this._rev;let e=this.hass,i=e?.states[t.download],n=e?.states[t.upload];if(e&&(!i||!n))return l`<ha-card
        ><div class="warning">Entity not found: ${i?t.upload:t.download}</div></ha-card
      >`;let r=b(i)&&b(n),o=S(i,t.color),c=t.upload_color??Zh,d=t.name??Yh,u=i?.attributes.unit_of_measurement??"",g=n?.attributes.unit_of_measurement??"";return l`
      <ha-card
        class="control ${r?"unavailable":""}"
        style="--silk-accent:${o};--silk-upload:${c}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${r?"":"on"}">
            <ha-icon .icon=${t.icon??Xh}></ha-icon>
          </div>
          <div class="info"><div class="name" title=${d}>${d}</div></div>
          <div class="trailing rates">
            <span class="rate down">${this._rateText("\u2193",t.download,i,u)}</span>
            <span class="rate up">
              ${this._rateText("\u2191",t.upload,n,g===u?"":g)}
            </span>
          </div>
        </div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._height,i=this._downVals,n=this._upVals;if(!t||!e||!i||!n)return m;let r=e/2,o=Ac(i,r,Math.max(r-Cc,1),-1),c=Ac(n,r,Math.max(e-Cc-r,1),1);return l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e} aria-hidden="true">
        <line class="mid" x1="0" y1=${r} x2=${t} y2=${r}></line>
        <g class="series down">
          <path class="fill" d=${oi(o,t,r)}></path>
          <path class="line" d=${gt(o,t)}></path>
        </g>
        <g class="series up">
          <path class="fill" d=${oi(c,t,r)}></path>
          <path class="line" d=${gt(c,t)}></path>
        </g>
      </svg>
    `}};Ht.styles=[T,k`
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
    `],p([y({attribute:!1})],Ht.prototype,"hass",2),p([f()],Ht.prototype,"_config",2),p([f()],Ht.prototype,"_width",2),p([f()],Ht.prototype,"_height",2),p([f()],Ht.prototype,"_rev",2),Ht=p([x("silk-network-card")],Ht);var Oc={type:"silk-compare-card",name:"Silk Compare",description:"Two numbers that belong side by side."},tf="#e6a23c",ef=24,Rc=60,Wi=36,$n=3,nf=3e5,sf=6e4,Hc="silk-compare-card-editor";C(Hc,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"entity2",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",entity2:"Second entity",name:"Name"});var ee=class extends w{constructor(){super(...arguments);this._width=0;this._rev=0;this._vals1=null;this._vals2=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastStamp=""}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")&&Number.isFinite(Number(t.states[r].state))),i=e.filter(r=>t.states[r].attributes.device_class==="temperature"),n=i.length>=2?i:e;return{type:"custom:silk-compare-card",entity:n[0],entity2:n[1]}}static async getConfigElement(){return document.createElement(Hc)}setConfig(t){if(!t.entity||!t.entity2)throw new Error("silk-compare-card: `entity` and `entity2` are required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-compare-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._vals1=null,this._vals2=null,this._lastStamp=""}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),nf)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".spark");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[0].contentRect.width;i!==this._width&&(this._width=i)}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this._config,e=this.hass?.states[t.entity]?.last_updated??"",i=this.hass?.states[t.entity2]?.last_updated??"";if(!e&&!i)return;let n=`${e}|${i}`;if(n===this._lastStamp||(this._lastStamp=n,this._refreshTimer))return;let r=Math.max(0,sf-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},r)}async _refresh(){if(!this.hass||!this._config)return;let{entity:t,entity2:e}=this._config,i=this._config.hours_to_show??ef,n=++this._fetchSeq,r=Date.now()/1e3,o=r-i*3600,c;try{c=await ht(this.hass,[t,e],o,r,i)}catch(d){console.warn("silk-compare-card: history fetch failed",d);return}n===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals1=ft(c[t]??[],o,r,Rc),this._vals2=ft(c[e]??[],o,r,Rc),this._rev++)}_valueOf(t){return!t||b(t)?NaN:Number(t.state)}_deltaText(t,e,i,n){if(!Number.isFinite(t)||!Number.isFinite(e))return"\u0394 \u2014";let r=t-e,o=i&&i===n?i.startsWith("\xB0")?"\xB0":` ${i}`:"",c=U(this.hass,this._config.entity,Math.abs(r));return`\u0394 ${r<0?"\u2212":""}${c}${o}`}_onTap(){this._config&&(E(this),A(this,this._config.entity))}render(){let t=this._config;if(!t)return m;this._rev;let e=this.hass,i=e?.states[t.entity],n=e?.states[t.entity2];if(e&&(!i||!n))return l`<ha-card
        ><div class="warning">Entity not found: ${i?t.entity2:t.entity}</div></ha-card
      >`;let r=b(i)&&b(n),o=S(i,t.color),c=t.color2??tf,d=t.label??i?.attributes.friendly_name??t.entity,u=t.label2??n?.attributes.friendly_name??t.entity2,g=i?.attributes.unit_of_measurement??"",h=n?.attributes.unit_of_measurement??"",v=this._valueOf(i),_=this._valueOf(n);return l`
      <ha-card
        class="control ${r?"unavailable":""}"
        style="--silk-accent:${o};--silk-c2:${c}"
        @click=${this._onTap}
      >
        ${t.name?l`<div class="title" title=${t.name}>${t.name}</div>`:m}
        <div class="cols">
          <div class="col">
            <div class="label">
              <span class="dot a"></span><span class="text">${d}</span>
            </div>
            <div class="reading">
              <span class="big">${Number.isFinite(v)?U(e,t.entity,v):"\u2014"}</span>
              ${g?l`<span class="unit">${g}</span>`:m}
            </div>
          </div>
          <div class="rule"></div>
          <div class="col">
            <div class="label">
              <span class="dot b"></span><span class="text">${u}</span>
            </div>
            <div class="reading">
              <span class="big">${Number.isFinite(_)?U(e,t.entity2,_):"\u2014"}</span>
              ${h?l`<span class="unit">${h}</span>`:m}
            </div>
          </div>
        </div>
        <div class="delta">${this._deltaText(v,_,g,h)}</div>
        <div class="spark">${this._renderSpark()}</div>
      </ha-card>
    `}_renderSpark(){let t=this._width,e=this._vals1,i=this._vals2;if(!t||!e||!i)return m;let n=fe([e,i]),r=Gt(e,n,Wi,$n,$n),o=Gt(i,n,Wi,$n,$n);return l`
      <svg viewBox="0 0 ${t} ${Wi}" width=${t} height=${Wi} aria-hidden="true">
        <path class="line b" d=${gt(o,t)}></path>
        <path class="line a" d=${gt(r,t)}></path>
      </svg>
    `}};ee.styles=[T,k`
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
        height: ${Wi}px;
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
    `],p([y({attribute:!1})],ee.prototype,"hass",2),p([f()],ee.prototype,"_config",2),p([f()],ee.prototype,"_width",2),p([f()],ee.prototype,"_rev",2),ee=p([x("silk-compare-card")],ee);var Fc={type:"silk-calendar-card",name:"Silk Agenda",description:"What's next, without the month grid."},Rs=864e5,Dc=7,zc=6,rf=15*6e4,Nc=["var(--silk-accent)","#e6a23c","#57ad60","#9d7ee8","#35b5b1","#e8734f"];function Lc(a){let s=new Date(a);return s.setHours(0,0,0,0),s.getTime()}function Ic(a){if(!a)return null;if(a.dateTime){let s=Date.parse(a.dateTime);return Number.isFinite(s)?{ms:s,allDay:!1}:null}if(a.date){let[s,t,e]=a.date.split("-").map(Number);return!s||!t||!e?null:{ms:new Date(s,t-1,e).getTime(),allDay:!0}}return null}var Uc="silk-calendar-card-editor";C(Uc,[{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"days",selector:{number:{min:1,max:31,mode:"box"}}},{name:"limit",selector:{number:{min:1,max:20,mode:"box"}}}]}],{name:"Name",days:"Days ahead",limit:"Rows shown"},{days:Dc,limit:zc});var He=class extends w{constructor(){super(...arguments);this._entityIds=[];this._fetchStarted=!1;this._fetchEpoch=0}static getStubConfig(t){return{type:"custom:silk-calendar-card",entities:Object.keys(t.states).find(i=>i.startsWith("calendar."))}}static async getConfigElement(){return document.createElement(Uc)}setConfig(t){let e=t.entities,i=(Array.isArray(e)?e:typeof e=="string"?[e]:[]).filter(r=>typeof r=="string"&&r!=="");if(i.length===0)throw new Error("silk-calendar-card: `entities` requires at least one calendar entity");let n=i.find(r=>O(r)!=="calendar");if(n)throw new Error(`silk-calendar-card: ${n} is not a calendar entity`);if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-calendar-card: `days` must be a positive number");if(t.limit!==void 0&&!(Number(t.limit)>=1))throw new Error("silk-calendar-card: `limit` must be at least 1");this._entityIds=i,this._config=t,this._events=void 0,this._fetchStarted=!1}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>void this._fetch(),rf),this.hass&&this._config&&(this._fetchStarted=!0,this._fetch())}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer)}willUpdate(){!this.hass||!this._config||this._fetchStarted||(this._fetchStarted=!0,this._fetch())}async _fetch(){let t=this.hass,e=this._config;if(!t||!e)return;let i=++this._fetchEpoch,n=e.days??Dc,r=new Date,o=new Date(r.getTime()+n*Rs),c=encodeURIComponent(r.toISOString()),d=encodeURIComponent(o.toISOString()),u=await Promise.allSettled(this._entityIds.map(h=>t.callApi("GET",`calendars/${h}?start=${c}&end=${d}`)));if(i!==this._fetchEpoch)return;if(!u.some(h=>h.status==="fulfilled")){console.warn("silk-calendar-card: calendar fetch failed",u);return}let g=[];u.forEach((h,v)=>{if(!(h.status!=="fulfilled"||!Array.isArray(h.value)))for(let _ of h.value){let $=Ic(_.start);if(!$)continue;let M=Ic(_.end),P=Math.max(M?.ms??($.allDay?$.ms+Rs:$.ms),$.ms);g.push({calIndex:v,summary:(_.summary??"").trim()||"Busy",allDay:$.allDay,startMs:$.ms,endMs:P})}}),this._events=g}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_colorFor(t){return this._config?.colors?.[t]??Nc[t%Nc.length]}_dayLabel(t,e,i){let n=Math.round((t-e)/Rs);return n===0?"Today":n===1?"Tomorrow":i.format(t)}_onCardClick(){this._entityIds.length>0&&A(this,this._entityIds[0])}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._entityIds.map(H=>e.states[H]);if(i.every(H=>!H))return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${this._entityIds.join(", ")}</div>
        </ha-card>
      `;let n=i.every(H=>b(H)),r=S(i.find(H=>H)),o=t.name??(this._entityIds.length===1?i[0]?.attributes.friendly_name??this._entityIds[0]:"Agenda"),c=Math.max(1,t.limit??zc),d=this._locale(),u=new Intl.DateTimeFormat(d,{hour:"numeric",minute:"2-digit"}),g=new Intl.DateTimeFormat(d,{weekday:"short",month:"short",day:"numeric"}),h=Date.now(),v=Lc(h),_=(this._events??[]).filter(H=>H.endMs>h).map(H=>({ev:H,dayMs:Lc(Math.max(H.startMs,h))})).sort((H,z)=>H.dayMs-z.dayMs||Number(z.ev.allDay)-Number(H.ev.allDay)||H.ev.startMs-z.ev.startMs||H.ev.summary.localeCompare(z.ev.summary)),$=_.slice(0,c),M=_.length-$.length,P=[],L=null;for(let{ev:H,dayMs:z}of $)z!==L&&(L=z,P.push(l`<div class="day">${this._dayLabel(z,v,g)}</div>`)),P.push(l`
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
        ${o!==""?l`<div class="title">${o}</div>`:m}
        <div class="list">
          ${P}
          ${this._events!==void 0&&_.length===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:calendar-check-outline"></ha-icon>
                  <span>No events</span>
                </div>
              `:m}
          ${M>0?l`<div class="more">+${M} more</div>`:m}
        </div>
      </ha-card>
    `}};He.styles=[T,k`
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
    `],p([y({attribute:!1})],He.prototype,"hass",2),p([f()],He.prototype,"_config",2),p([f()],He.prototype,"_events",2),He=p([x("silk-calendar-card")],He);var Vc={type:"silk-countdown-card",name:"Silk Countdown",description:"D-day, counted honestly."},of=864e5,Os=36e5,jc=6e4,af=48*Os,cf="mdi:calendar-clock",lf="D-day";function Hs(a){let s=/^(\d{4})-(\d{2})-(\d{2})$/.exec(a.trim());if(s){let e=new Date(Number(s[1]),Number(s[2])-1,Number(s[3])).getTime();return Number.isFinite(e)?{ms:e,hasTime:!1}:null}let t=Date.parse(a);return Number.isFinite(t)?{ms:t,hasTime:!0}:null}function df(a){let s=a.attributes;if(s.has_date){let t=!!s.has_time,e=new Date(s.year,(s.month??1)-1,s.day??1,t?s.hour??0:0,t?s.minute??0:0,t?s.second??0:0).getTime();return Number.isFinite(e)?{ms:e,hasTime:t}:null}return s.has_date===!1?null:Hs(a.state)}function pf(a,s){let t=new Date(a),e=new Date(s);return Math.ceil((Date.UTC(t.getFullYear(),t.getMonth(),t.getDate())-Date.UTC(e.getFullYear(),e.getMonth(),e.getDate()))/of)}var qc="silk-countdown-card-editor";C(qc,[{name:"name",selector:{text:{}}},{name:"date",selector:{text:{}}},{name:"entity",selector:{entity:{domain:["input_datetime","date","datetime","sensor"]}}},{name:"icon",selector:{icon:{}}}],{name:"Name",date:"Date (YYYY-MM-DD or ISO)",entity:"Entity (overrides date)",icon:"Icon"});var fi=class extends w{static getStubConfig(s){let t=Object.keys(s.states),e=t.find(i=>i.startsWith("input_datetime.")&&s.states[i].attributes.has_date)??t.find(i=>i.startsWith("sensor.")&&s.states[i].attributes.device_class==="timestamp");return e?{type:"custom:silk-countdown-card",entity:e}:{type:"custom:silk-countdown-card",date:`${new Date().getFullYear()+1}-01-01`,name:"New Year"}}static async getConfigElement(){return document.createElement(qc)}setConfig(s){if(!s.date&&!s.entity)throw new Error("silk-countdown-card: set `date` or `entity`");if(s.date&&Hs(s.date)===null)throw new Error("silk-countdown-card: `date` must be YYYY-MM-DD or an ISO datetime");this._config=s}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:1}}connectedCallback(){super.connectedCallback(),this._tickTimer=window.setInterval(()=>this.requestUpdate(),jc)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tickTimer)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){let s=this._config?.entity;s&&A(this,s)}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=!!s.entity,i=e?t.states[s.entity]:void 0;if(e&&!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${s.entity}</div>
        </ha-card>
      `;let n=e&&b(i),r=n?null:e?df(i):Hs(s.date),o=Date.now(),c=r===null?null:pf(r.ms,o),d=c!==null&&c<0,u=c===null?"\u2014":c===0?"D-DAY":c>0?`D-${c}`:`D+${-c}`,g=n?"Unavailable":"No date",h="";if(r!==null){let M=new Date(r.ms),P=M.getFullYear()===new Date(o).getFullYear();g=new Intl.DateTimeFormat(this._locale(),{weekday:"short",month:"short",day:"numeric",...P?{}:{year:"numeric"}}).format(M);let L=r.ms-o;if(r.hasTime&&L>0&&L<af){let H=Math.floor(L/Os),z=Math.floor(L%Os/jc);h=`${H}h ${z}m`}}let v=S(i),_=s.name??i?.attributes.friendly_name??lf,$=!n&&c!==null&&c>=0;return l`
      <ha-card
        class="control ${n?"unavailable":""} ${e?"":"static"}"
        style="--silk-accent:${v}"
        @click=${this._onCardClick}
      >
        <div class="icon ${$?"on":""}">
          ${s.icon?l`<ha-icon .icon=${s.icon}></ha-icon>`:i?l`<ha-state-icon .hass=${t} .stateObj=${i}></ha-state-icon>`:l`<ha-icon .icon=${cf}></ha-icon>`}
        </div>
        <div class="info">
          <div class="name">${_}</div>
          <div class="state">
            ${g}${h?l`<span class="sep">·</span>${h}`:m}
          </div>
        </div>
        <div class="trailing">
          <span class="dday ${d?"past":""}">${u}</span>
        </div>
      </ha-card>
    `}};fi.styles=[T,k`
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
    `],p([y({attribute:!1})],fi.prototype,"hass",2),p([f()],fi.prototype,"_config",2),fi=p([x("silk-countdown-card")],fi);var Wc={type:"silk-automation-card",name:"Silk Automation",description:"See it, arm it, fire it."},Gc=2e3,mf=3e4,Bc="silk-automation-card-editor";C(Bc,[{name:"entity",required:!0,selector:{entity:{domain:["automation"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});function uf(a){if(!Number.isFinite(a))return null;let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}var ie=class extends w{constructor(){super(...arguments);this._optimistic=null;this._optimisticRunAt=null;this._optimisticBase="";this._runBase=null}static getStubConfig(t){return{type:"custom:silk-automation-card",entity:Object.keys(t.states).find(i=>i.startsWith("automation."))}}static async getConfigElement(){return document.createElement(Bc)}setConfig(t){if(!t.entity)throw new Error("silk-automation-card: `entity` is required");if(O(t.entity)!=="automation")throw new Error(`silk-automation-card: entity must be an automation, got \`${O(t.entity)}\``);this._config=t,this._clearOptimistic(),this._clearOptimisticRun()}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),mf)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer),window.clearTimeout(this._optimisticTimer),window.clearTimeout(this._runTimer)}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity];e&&(this._optimistic!==null&&e.last_updated!==this._optimisticBase&&this._clearOptimistic(),this._optimisticRunAt!==null&&(e.attributes.last_triggered??null)!==this._runBase&&this._clearOptimisticRun())}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_clearOptimisticRun(){window.clearTimeout(this._runTimer),this._runTimer=void 0,this._optimisticRunAt=null}_onCardClick(){this._config&&A(this,this._config.entity)}_onToggleClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;E(this);let r=!(this._optimistic??n.state==="on");this._optimistic=r,this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Gc),i.callService("automation",r?"turn_on":"turn_off",{entity_id:e.entity})}_onRunClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];!n||b(n)||(E(this),this._flash(),this._optimisticRunAt=Date.now(),this._runBase=n.attributes.last_triggered??null,window.clearTimeout(this._runTimer),this._runTimer=window.setTimeout(()=>this._clearOptimisticRun(),Gc),i.callService("automation","trigger",{entity_id:e.entity}))}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_lastRunText(t){if(this._optimisticRunAt!==null)return"Last run just now";let e=t.attributes.last_triggered,i=typeof e=="string"&&e?uf(Date.parse(e)):null;return i===null?"Never run":`Last run ${i}`}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=!n&&(this._optimistic??i.state==="on"),o=this._optimistic===null?i:{...i,state:this._optimistic?"on":"off"},c=S(o,t.color),d=t.name??i.attributes.friendly_name??t.entity;return l`
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
    `}};ie.styles=[T,k`
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
    `],p([y({attribute:!1})],ie.prototype,"hass",2),p([f()],ie.prototype,"_config",2),p([f()],ie.prototype,"_optimistic",2),p([f()],ie.prototype,"_optimisticRunAt",2),ie=p([x("silk-automation-card")],ie);var Kc={type:"silk-log-card",name:"Silk Log",description:"An entity's recent life, in plain rows."},Yc=24,Xc=6,hf=3e5,ff=3e4,gf=3e4,Zc="silk-log-card-editor";C(Zc,[{name:"entity",required:!0,selector:{entity:{}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"hours_to_show",selector:{number:{min:1,mode:"box"}}},{name:"limit",selector:{number:{min:1,max:20,mode:"box"}}}]}],{entity:"Entity",name:"Name",hours_to_show:"Hours to show",limit:"Rows"},{hours_to_show:Yc,limit:Xc});function Tn(a){return typeof a=="number"?a>1e12?a:a*1e3:Date.parse(a)}function bf(a){let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}var Ne=class extends w{constructor(){super(...arguments);this._entries=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states);return{type:"custom:silk-log-card",entity:e.find(n=>n.startsWith("binary_sensor."))??e.find(n=>n.startsWith("light."))??e.find(n=>n.startsWith("switch."))??e[0]}}static async getConfigElement(){return document.createElement(Zc)}setConfig(t){if(!t.entity)throw new Error("silk-log-card: `entity` is required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-log-card: `hours_to_show` must be a positive number");if(t.limit!==void 0&&!(Number(t.limit)>0))throw new Error("silk-log-card: `limit` must be a positive number");this._config=t,this._fetchStarted=!1,this._entries=null,this._lastUpdated=void 0}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),hf),this._clockTimer=window.setInterval(()=>this.requestUpdate(),gf)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearInterval(this._clockTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,ff-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=this._config.hours_to_show??Yc,i=++this._fetchSeq,n=new Date,r=new Date(n.getTime()-e*36e5),o;try{o=await this.hass.callApi("GET","logbook/"+r.toISOString()+"?entity="+t+"&end_time="+encodeURIComponent(n.toISOString()))}catch(c){console.warn("silk-log-card: logbook fetch failed",c);return}i===this._fetchSeq&&(this._lastFetch=Date.now(),this._entries=(Array.isArray(o)?o:[]).filter(c=>Number.isFinite(Tn(c.when))).sort((c,d)=>Tn(d.when)-Tn(c.when)))}_dotActive(t){if(!t.state)return!1;let e={entity_id:this._config.entity,state:t.state,attributes:{},last_changed:"",last_updated:""};return N(e)}_rowText(t,e){let i;return t.state?i=e?I(this.hass,{...e,state:t.state}):t.state.replace(/_/g," "):i=t.message??"",i?i.charAt(0).toUpperCase()+i.slice(1):"\u2014"}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=t.limit??Xc,d=this._entries?.slice(0,c)??[];return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!n&&N(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          <div class="trailing">
            ${this._entries!==null?l`<span class="count">${this._entries.length}</span>`:m}
          </div>
        </div>
        <div class="rows">
          ${this._entries!==null&&d.length===0?l`<div class="empty">No recent activity</div>`:d.map(u=>l`
                  <div class="row">
                    <span class="dot ${this._dotActive(u)?"on":""}"></span>
                    <span class="what">${this._rowText(u,i)}</span>
                    <span class="when">${bf(Tn(u.when))}</span>
                  </div>
                `)}
        </div>
      </ha-card>
    `}};Ne.styles=[T,k`
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
    `],p([y({attribute:!1})],Ne.prototype,"hass",2),p([f()],Ne.prototype,"_config",2),p([f()],Ne.prototype,"_entries",2),Ne=p([x("silk-log-card")],Ne);var tl={type:"silk-notify-card",name:"Silk Inbox",description:"Persistent notifications you can actually clear."},Ls=5,vf=3e4,_f=1e4,yf=1e4;function Qc(a){return a?(Array.isArray(a)?a.map(t=>[t?.notification_id??"",t]):Object.entries(a)).filter(([t,e])=>!!e&&!!(e.notification_id??t)).map(([t,e])=>({...e,notification_id:e.notification_id??t})):[]}var Ns=[[60,1,"second"],[3600,60,"minute"],[86400,3600,"hour"],[Number.POSITIVE_INFINITY,86400,"day"]],En,Jc="";function wf(a,s){let t=Date.parse(a);if(!Number.isFinite(t))return"";if(!En||Jc!==s){try{En=new Intl.RelativeTimeFormat(s,{numeric:"auto",style:"narrow"})}catch{En=new Intl.RelativeTimeFormat("en",{numeric:"auto",style:"narrow"})}Jc=s}let e=(t-Date.now())/1e3,i=Math.abs(e),n=Ns.find(([r])=>i<r)??Ns[Ns.length-1];return En.format(Math.trunc(e/n[1]),n[2])}var el="silk-notify-card-editor";C(el,[{name:"name",selector:{text:{}}},{name:"limit",selector:{number:{min:1,max:20,mode:"box"}}}],{name:"Name",limit:"Rows to show"},{limit:Ls});var Le=class extends w{constructor(){super(...arguments);this._rows=null;this._byId=new Map;this._dismissed=new Map;this._started=!1;this._subscribed=!1;this._gotEvent=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(){return{type:"custom:silk-notify-card"}}static async getConfigElement(){return document.createElement(el)}setConfig(t){if(t.limit!==void 0&&!(Number(t.limit)>0))throw new Error("silk-notify-card: `limit` must be a positive number");this._config=t}getCardSize(){let t=this._rows?.length??2;return 1+Math.max(1,Math.min(t,this._limit()))}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._onTick(),vf),this._started&&this._start()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),this._teardown()}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._started){this._started=!0,this._start();return}t.has("hass")&&!this._subscribed&&!this._gotEvent&&Date.now()-this._lastFetch>_f&&this._fetch()}}_limit(){let t=Number(this._config?.limit??Ls);return Number.isFinite(t)&&t>=1?Math.floor(t):Ls}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onTick(){this._subscribed||this._gotEvent?this.requestUpdate():this._fetch()}async _start(){if(this._unsubPromise)return;this._fetch();let t=this.hass?.connection;if(!(!t||typeof t.subscribeMessage!="function"))try{let e=t.subscribeMessage(i=>this._onSubscriptionEvent(i),{type:"persistent_notification/subscribe"});this._unsubPromise=e,await e,this._subscribed=!0,this.isConnected||this._teardown()}catch{this._unsubPromise=void 0,this._subscribed=!1}}_teardown(){let t=this._unsubPromise;this._unsubPromise=void 0,this._subscribed=!1,this._gotEvent=!1,t&&t.then(e=>e()).catch(()=>{})}async _fetch(){let t=this.hass;if(!t)return;let e=++this._fetchSeq;this._lastFetch=Date.now();let i;try{i=await t.callWS({type:"persistent_notification/get"})}catch(n){console.warn("silk-notify-card: notification fetch failed",n);return}e!==this._fetchSeq||this._gotEvent||(this._byId=new Map(Qc(i).map(n=>[n.notification_id,n])),this._commit(!0))}_onSubscriptionEvent(t){this._gotEvent=!0;let e=Qc(t.notifications);switch(t.type){case"current":this._byId=new Map(e.map(i=>[i.notification_id,i])),this._commit(!0);return;case"added":case"updated":for(let i of e)this._byId.set(i.notification_id,i);break;case"removed":for(let i of e)this._byId.delete(i.notification_id),this._dismissed.delete(i.notification_id);break;default:this._fetch();return}this._commit(!1)}_commit(t){let e=Date.now();for(let[i,n]of this._dismissed)t&&!this._byId.has(i)?this._dismissed.delete(i):e-n>yf&&this._dismissed.delete(i);this._rows=[...this._byId.values()].filter(i=>!this._dismissed.has(i.notification_id)).sort((i,n)=>(Date.parse(n.created_at)||0)-(Date.parse(i.created_at)||0))}_dismiss(t,e){t.stopPropagation();let i=this.hass;i&&(E(this),this._dismissed.set(e,Date.now()),this._byId.delete(e),this._commit(!1),i.callService("persistent_notification","dismiss",{notification_id:e}))}_clearAll(t){t.stopPropagation();let e=this.hass,i=this._rows;if(!e||!i||i.length===0)return;E(this);let n=Date.now();for(let r of i)this._dismissed.set(r.notification_id,n),this._byId.delete(r.notification_id),e.callService("persistent_notification","dismiss",{notification_id:r.notification_id});this._commit(!1)}_renderRow(t,e){return l`
      <div class="row">
        <div class="body">
          <div class="row-top">
            ${t.title?l`<span class="title">${t.title}</span>`:m}
            <span class="time">${wf(t.created_at,e)}</span>
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
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._rows,n=i?.length??0,r=i?i.slice(0,this._limit()):[],o=t.name??"Notifications",c=this._locale();return l`
      <ha-card class="control" style="--silk-accent:${S(void 0)}">
        <div class="head">
          <div class="icon ${n>0?"on":""}">
            <ha-icon icon="mdi:bell-outline"></ha-icon>
          </div>
          <div class="info">
            <div class="name">${o}</div>
          </div>
          <div class="trailing">
            ${n>1?l`<button class="clear" @click=${this._clearAll}>Clear all</button>`:m}
            ${n>0?l`<span class="chip active count">${n}</span>`:m}
          </div>
        </div>
        ${i===null?m:n===0?l`
                <div class="empty">
                  <ha-icon icon="mdi:bell-check-outline"></ha-icon>
                  <span>All clear</span>
                </div>
              `:l`<div class="list">${r.map(d=>this._renderRow(d,c))}</div>`}
      </ha-card>
    `}};Le.styles=[T,k`
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
    `],p([y({attribute:!1})],Le.prototype,"hass",2),p([f()],Le.prototype,"_config",2),p([f()],Le.prototype,"_rows",2),Le=p([x("silk-notify-card")],Le);var nl={type:"silk-counter-card",name:"Silk Count",description:"How many are on \u2014 tap to see which."},xf="mdi:counter",Is=40,il=8,sl="silk-counter-card-editor";C(sl,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{name:"Name",icon:"Icon"});var Ie=class extends w{constructor(){super(...arguments);this._expanded=!1}static getStubConfig(t){return{type:"custom:silk-counter-card",entities:Object.keys(t.states).filter(i=>i.startsWith("light.")).slice(0,8),name:"Lights on",icon:"mdi:lightbulb-group"}}static async getConfigElement(){return document.createElement(sl)}setConfig(t){if(!Array.isArray(t.entities)||t.entities.length===0||t.entities.some(e=>typeof e!="string"))throw new Error("silk-counter-card: `entities` must be a non-empty list of entity ids");if(!t.name)throw new Error("silk-counter-card: `name` is required");if(t.condition!==void 0&&t.condition!=="active"&&t.condition!=="state")throw new Error("silk-counter-card: `condition` must be 'active' or 'state'");if(t.condition==="state"&&typeof t.state!="string")throw new Error("silk-counter-card: `state` is required when `condition: state`");this._config=t,this._expanded=!1}getCardSize(){let t=this._expanded?this._matchIds().length:0;return 1+Math.ceil(t*Is/50)}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:1}}willUpdate(t){t.has("hass")&&this._expanded&&this._matchIds().length===0&&(this._expanded=!1)}_matchIds(){let t=this._config,e=this.hass;return!t||!e?[]:t.entities.filter(i=>{let n=e.states[i];return n?t.condition==="state"?n.state===t.state:N(n):!1})}_onCardClick(){if(this._matchIds().length===0){this._expanded=!1;return}this._expanded=!this._expanded,E(this)}_onRowClick(t,e){t.stopPropagation(),A(this,e)}render(){let t=this._config,e=this.hass;if(!t||!e)return m;if(t.entities.every(h=>!e.states[h]))return l`
        <ha-card>
          <div class="warning">Entities not found: ${t.entities.join(", ")}</div>
        </ha-card>
      `;let i=this._matchIds(),n=i.length,r=t.entities.length,o=t.entities.every(h=>b(e.states[h])),c=S(e.states[t.entities[0]],t.color),d=n>0,u=this._expanded&&d,g=u?n*Is+il:0;return l`
      <ha-card
        class="control ${o?"unavailable":""} ${u?"expanded":""}"
        style="--silk-accent:${c}"
        role="button"
        aria-expanded=${u?"true":"false"}
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="icon ${n>0?"on":""}">
            <ha-icon .icon=${t.icon??xf}></ha-icon>
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
        <div class="drawer" style="max-height:${g}px">
          <div class="rows">
            ${i.map(h=>{let v=e.states[h];return l`
                <button class="row" @click=${_=>this._onRowClick(_,h)}>
                  <ha-state-icon .hass=${e} .stateObj=${v}></ha-state-icon>
                  <span class="row-name">${v.attributes.friendly_name??h}</span>
                  <span class="row-state">${I(e,v)}</span>
                </button>
              `})}
          </div>
        </div>
      </ha-card>
    `}};Ie.styles=[T,k`
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
        padding-top: ${il}px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${Is}px;
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
    `],p([y({attribute:!1})],Ie.prototype,"hass",2),p([f()],Ie.prototype,"_config",2),p([f()],Ie.prototype,"_expanded",2),Ie=p([x("silk-counter-card")],Ie);var rl={type:"silk-device-card",name:"Silk Device",description:"Battery, signal, and last-seen for your fleet."},ol=20,kf=50,$f=3e4,al="silk-device-card-editor";C(al,[{name:"name",selector:{text:{}}}],{name:"Name"});function Tf(a){if(!Number.isFinite(a))return null;let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}function Ef(a){return a<ol?"crit":a<kf?"warn":"good"}var Cf={crit:"mdi:battery-alert-variant-outline",warn:"mdi:battery-50",good:"mdi:battery"},gi=class extends w{static getStubConfig(s){return{type:"custom:silk-device-card",devices:Object.keys(s.states).filter(e=>e.startsWith("sensor.")&&s.states[e].attributes.device_class==="battery").slice(0,3).map(e=>{let i=String(s.states[e].attributes.friendly_name??e);return{name:i.replace(/\s+battery(\s+level)?\s*$/i,"")||i,battery:e}})}}static async getConfigElement(){return document.createElement(al)}setConfig(s){if(!Array.isArray(s.devices)||s.devices.length===0)throw new Error("silk-device-card: `devices` is required \u2014 a list of {name, battery?, signal?, last_seen?}");for(let t of s.devices)if(typeof t?.name!="string"||!t.name)throw new Error("silk-device-card: every device needs a `name`");this._config=s}getCardSize(){return Math.max(2,1+Math.ceil((this._config?.devices.length??3)/2))}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),$f)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer)}_level(s){if(!s||b(s)||s.state==="")return;let t=Number(s.state);return Number.isFinite(t)?R(t,0,100):void 0}_signalText(s){if(!s||b(s)||s.state==="")return null;let t=Number(s.state);if(!Number.isFinite(t))return null;let e=String(s.attributes.unit_of_measurement??"");return/dbm/i.test(e)||t<0?`${Math.round(t)} dBm`:`LQI ${Math.round(t)}`}_seenText(s){if(!s||b(s)||s.state==="")return null;let t=Date.parse(s.state);if(!Number.isFinite(t)){let e=Number(s.state);if(!Number.isFinite(e))return null;t=e>1e12?e:e*1e3}return Tf(t)}_rows(){let s=this.hass,t=this._config.devices.map(e=>{let i=[e.battery,e.signal,e.last_seen].filter(n=>typeof n=="string"&&n!=="");return{entry:e,level:this._level(e.battery?s.states[e.battery]:void 0),signal:this._signalText(e.signal?s.states[e.signal]:void 0),seen:this._seenText(e.last_seen?s.states[e.last_seen]:void 0),target:e.battery??i[0],dead:i.length===0||i.every(n=>b(s.states[n]))}});return t.sort((e,i)=>e.level===void 0&&i.level===void 0?e.entry.name.localeCompare(i.entry.name):e.level===void 0?1:i.level===void 0?-1:e.level-i.level||e.entry.name.localeCompare(i.entry.name)),t}_onRowClick(s,t){s.stopPropagation(),t&&A(this,t)}_renderRow(s,t){let e=s.level===void 0?void 0:Ef(s.level),i=s.level===void 0?"":`, battery ${Math.round(s.level)}%`;return l`
      <button
        class="row ${s.dead?"unavailable":""}"
        aria-label=${`${s.entry.name}${i}`}
        @click=${n=>this._onRowClick(n,s.target)}
      >
        <span class="dname">${s.entry.name}</span>
        ${t.battery?l`<span class="batt">
              ${e===void 0?l`<span class="dash">—</span>`:l`
                    <ha-icon class="bicon ${e}" .icon=${Cf[e]}></ha-icon>
                    <span class="pct">${Math.round(s.level)}%</span>
                  `}
            </span>`:m}
        ${t.signal?l`<span class="meta sig">${s.signal??"\u2014"}</span>`:m}
        ${t.seen?l`<span class="meta seen">${s.seen??"\u2014"}</span>`:m}
      </button>
    `}render(){let s=this._config,t=this.hass;if(!s||!t)return m;let e=this._rows(),i={battery:s.devices.some(o=>o.battery),signal:s.devices.some(o=>o.signal),seen:s.devices.some(o=>o.last_seen)},n=e.filter(o=>o.level!==void 0&&o.level<ol).length,r=s.name??"Devices";return l`
      <ha-card class="control" style="--silk-accent:${S(void 0)}">
        <div class="header">
          <ha-icon class="hicon" icon="mdi:devices"></ha-icon>
          <div class="hname">${r}</div>
          ${n>0?l`<span class="badge">${n} low</span>`:m}
        </div>
        <div class="rows">${e.map(o=>this._renderRow(o,i))}</div>
      </ha-card>
    `}};gi.styles=[T,k`
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
    `],p([y({attribute:!1})],gi.prototype,"hass",2),p([f()],gi.prototype,"_config",2),gi=p([x("silk-device-card")],gi);var ll={type:"silk-presence-card",name:"Silk Family",description:"Everyone's whereabouts in one strip."},cl=44,dl="silk-presence-card-editor";C(dl,[{name:"name",selector:{text:{}}}],{name:"Name"});var Fe=class extends w{constructor(){super(...arguments);this._broken=new Set}static getStubConfig(t){return{type:"custom:silk-presence-card",entities:Object.keys(t.states).filter(i=>i.startsWith("person."))}}static async getConfigElement(){return document.createElement(dl)}setConfig(t){if(!Array.isArray(t.entities)||t.entities.length===0)throw new Error("silk-presence-card: `entities` is required \u2014 a list of person/device_tracker ids");for(let e of t.entities){let i=typeof e=="string"?O(e):"";if(i!=="person"&&i!=="device_tracker")throw new Error(`silk-presence-card: \`${String(e)}\` is not a person or device_tracker entity`)}this._config=t,this._broken=new Set}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:1,min_columns:3,min_rows:1}}_zone(t,e){if(t.formatEntityState)return I(t,e);switch(e.state){case"home":return"Home";case"not_home":return"Away";default:return e.state.replace(/_/g," ")}}_onPersonClick(t,e){t.stopPropagation(),A(this,e)}_onImgError(t){let e=new Set(this._broken);e.add(t),this._broken=e}_renderPerson(t){let e=this.hass,i=e.states[t],n=i?.attributes.friendly_name??t.split(".")[1]??t,r=b(i),o=!r&&i.state==="home",c=i?.attributes.entity_picture,d=typeof c=="string"&&c&&!this._broken.has(c)?c:void 0,u=(Array.from(n.trim())[0]??"?").toUpperCase(),g=i?this._zone(e,i):"\u2014";return l`
      <button
        class="cell ${r?"unavailable":""}"
        aria-label=${`${n}: ${g}`}
        title=${n}
        @click=${h=>this._onPersonClick(h,t)}
      >
        <span class="avatar ${o?"home":"away"}">
          ${d?l`<img
                src=${d}
                alt=${n}
                loading="lazy"
                @error=${()=>this._onImgError(d)}
              />`:l`<span class="initial">${u}</span>`}
        </span>
        <span class="zone">${g}</span>
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=t.entities.filter(o=>e.states[o]?.state==="home").length,n=S(e.states[t.entities[0]]),r=l`
      <div class="summary">
        <span class="count ${i>0?"some":""}">${i}</span> home
      </div>
    `;return l`
      <ha-card class="control" style="--silk-accent:${n}">
        ${t.name?l`<div class="header">
              <div class="hname">${t.name}</div>
              ${r}
            </div>`:m}
        <div class="strip">
          <div class="people">${t.entities.map(o=>this._renderPerson(o))}</div>
          ${t.name?m:r}
        </div>
      </ha-card>
    `}};Fe.styles=[T,k`
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
        width: ${cl}px;
        height: ${cl}px;
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
    `],p([y({attribute:!1})],Fe.prototype,"hass",2),p([f()],Fe.prototype,"_config",2),p([f()],Fe.prototype,"_broken",2),Fe=p([x("silk-presence-card")],Fe);var pl={type:"silk-shutter-card",name:"Silk Shutter",description:"A window you can drag."},Af=1,Sf=2,Cn=4,Mf=8,Pf=2e3,Rf=4,Of=5,ml="silk-shutter-card-editor";C(ml,[{name:"entity",required:!0,selector:{entity:{domain:["cover"]}}},{name:"name",selector:{text:{}}},{name:"invert",selector:{boolean:{}}}],{entity:"Entity",name:"Name",invert:"Invert reported position"});var ne=class extends w{constructor(){super(...arguments);this._localPos=null;this._dragging=!1;this._dragMoved=!1;this._dragStartY=0;this._dragStartPos=100;this._dragHeight=1}static getStubConfig(t){return{type:"custom:silk-shutter-card",entity:Object.keys(t.states).find(i=>i.startsWith("cover."))}}static async getConfigElement(){return document.createElement(ml)}setConfig(t){if(!t.entity||O(t.entity)!=="cover")throw new Error("silk-shutter-card: define a cover `entity` (e.g. cover.bedroom_shutter)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 3}getGridOptions(){return{columns:3,rows:3,min_columns:2,min_rows:3}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._localPos=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._localPos=null},Pf)}_realPosition(t){let e=t.attributes.current_position;if(typeof e!="number"||!Number.isFinite(e))return;let i=R(e,0,100);return this._config?.invert?100-i:i}_shownPosition(t){return this._localPos??this._realPosition(t)??(t.state==="closed"?0:100)}_commit(t){let e=this.hass,i=this._config;if(!e||!i)return;let n=R(Math.round(i.invert?100-t:t),0,100);e.callService("cover","set_cover_position",{entity_id:i.entity,position:n})}_onCardClick(){this._config&&A(this,this._config.entity)}_onPointerDown(t){this._dragMoved=!1;let e=this.hass?.states[this._config?.entity??""];if(!e||b(e)||!D(e,Cn))return;let i=t.currentTarget;i.setPointerCapture(t.pointerId),this._dragging=!0,this._dragStartY=t.clientY,this._dragHeight=i.getBoundingClientRect().height||1,this._dragStartPos=this._shownPosition(e),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}_onPointerMove(t){if(!this._dragging)return;let e=t.clientY-this._dragStartY;!this._dragMoved&&Math.abs(e)<Rf||(this._dragMoved=!0,this._localPos=Math.round(R(this._dragStartPos-e/this._dragHeight*100,0,100)))}_onPointerUp(){this._dragging&&(this._dragging=!1,this._dragMoved&&this._localPos!==null&&(this._armExpiry(),this._commit(this._localPos),E(this)))}_onPointerCancel(){this._dragging&&(this._dragging=!1,this._clearOptimistic())}_onWindowClick(t){if(this._dragMoved){t.stopPropagation(),this._dragMoved=!1;return}let e=this.hass,i=this._config;if(!e||!i)return;let n=e.states[i.entity];!n||b(n)||D(n,Cn)||(t.stopPropagation(),G(e,i.entity),E(this))}_onWindowKeydown(t){let e=this.hass?.states[this._config?.entity??""];if(!e||b(e)||!D(e,Cn))return;let i=t.key==="ArrowUp"||t.key==="ArrowRight"?1:t.key==="ArrowDown"||t.key==="ArrowLeft"?-1:0;if(!i)return;t.preventDefault(),t.stopPropagation();let n=R(this._shownPosition(e)+i*Of,0,100);this._localPos=n,this._armExpiry(),this._commit(n),E(this)}_callCover(t,e){t.stopPropagation(),!(!this.hass||!this._config)&&(this._clearOptimistic(),this.hass.callService("cover",e,{entity_id:this._config.entity}),E(this))}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=D(i,Cn),d=this._shownPosition(i),u=this._localPos!==null||this._realPosition(i)!==void 0;return l`
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
            aria-valuemin=${c?"0":m}
            aria-valuemax=${c?"100":m}
            aria-valuenow=${c?String(d):m}
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
            ${I(e,i)}${u?l`<span class="sep">·</span>${d}%`:m}
          </div>
        </div>
        ${this._renderButtons(i,n,u?d:void 0)}
      </ha-card>
    `}_renderButtons(t,e,i){let n=D(t,Af),r=D(t,Mf),o=D(t,Sf);if(!n&&!r&&!o)return m;let c=i!==void 0?i>=100:t.state==="open",d=i!==void 0?i<=0:t.state==="closed";return l`
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
            `:m}
        ${r?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Stop cover"
                @click=${u=>this._callCover(u,"stop_cover")}
              >
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
            `:m}
        ${o?l`
              <button
                class="ctl"
                ?disabled=${e||d}
                aria-label="Close cover"
                @click=${u=>this._callCover(u,"close_cover")}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
            `:m}
      </div>
    `}};ne.styles=[T,k`
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
    `],p([y({attribute:!1})],ne.prototype,"hass",2),p([f()],ne.prototype,"_config",2),p([f()],ne.prototype,"_localPos",2),p([f()],ne.prototype,"_dragging",2),ne=p([x("silk-shutter-card")],ne);var ul={type:"silk-minmax-card",name:"Silk Range",description:"Today's low, high, and where you are now."},Hf=3e5,Nf=6e4,hl="silk-minmax-card-editor";C(hl,[{name:"entity",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"name",selector:{text:{}}},{name:"icon",selector:{icon:{}}}],{entity:"Entity",name:"Name",icon:"Icon"});var De=class extends w{constructor(){super(...arguments);this._stats=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")&&Number.isFinite(Number(t.states[n].state))&&t.states[n].attributes.unit_of_measurement);return{type:"custom:silk-minmax-card",entity:e.find(n=>t.states[n].attributes.device_class==="temperature")??e[0]}}static async getConfigElement(){return document.createElement(hl)}setConfig(t){if(!t.entity)throw new Error("silk-minmax-card: `entity` is required");this._config=t,this._fetchStarted=!1,this._stats=null,this._lastUpdated=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:1}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Hf)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),this._refreshTimer=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}_onStatesChanged(){let t=this.hass?.states[this._config.entity]?.last_updated;if(!t||t===this._lastUpdated||(this._lastUpdated=t,this._refreshTimer))return;let e=Math.max(0,Nf-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.entity,e=++this._fetchSeq,i=Date.now()/1e3,n=new Date;n.setHours(0,0,0,0);let r=n.getTime()/1e3,o=Math.max((i-r)/3600,.25),c;try{c=await ht(this.hass,[t],r,i,o)}catch(d){console.warn("silk-minmax-card: history fetch failed",d);return}e===this._fetchSeq&&(this._lastFetch=Date.now(),this._stats=this._compute(c[t]??[],r,i))}_compute(t,e,i){let n=1/0,r=-1/0,o=0,c=0;for(let d=0;d<t.length;d++){let u=t[d].v;if(!Number.isFinite(u))continue;u<n&&(n=u),u>r&&(r=u);let g=Math.max(t[d].t,e),h=d+1<t.length?Math.min(Math.max(t[d+1].t,e),i):i,v=Math.max(h-g,0);o+=u*v,c+=v}return Number.isFinite(n)?{min:n,max:r,avg:c>0?o/c:(n+r)/2}:null}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=Number(i?.state),o=!n&&i!==void 0&&Number.isFinite(r),c=S(i,t.color),d=i?.attributes.unit_of_measurement??"",u=t.name??i?.attributes.friendly_name??t.entity;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${!n&&N(i)?"on":""}">
            ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:l`<ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>`}
          </div>
          <div class="info"><div class="name">${u}</div></div>
          <div class="trailing">
            <span class="value">${o?U(e,t.entity,r):"\u2014"}</span>
            ${d?l`<span class="unit">${d}</span>`:m}
          </div>
        </div>
        ${this._renderRange(o?r:void 0)}
      </ha-card>
    `}_renderRange(t){let e=this._stats,i=this.hass,n=this._config.entity;if(!e)return l`
        <div class="rangebar">
          <div class="rail"><div class="track"></div></div>
        </div>
      `;let r=t!==void 0?Math.min(e.min,t):e.min,o=t!==void 0?Math.max(e.max,t):e.max,c=o-r,d=$=>c>0?R(($-r)/c*100,0,100):50,u=d(e.avg),g=R(u,10,90),h=U(i,n,r),v=U(i,n,o),_=U(i,n,e.avg);return l`
      <div class="rangebar">
        <span class="bound">${h}</span>
        <div class="rail">
          <div class="track"></div>
          <div class="avg-tick" style="left:${u}%"></div>
          <div class="avg-label" style="left:${g}%">avg ${_}</div>
          ${t!==void 0?l`
                <div class="mover" style="transform:translateX(${d(t)}%)">
                  <div class="dot"></div>
                </div>
              `:m}
        </div>
        <span class="bound">${v}</span>
      </div>
      <div class="sub">
        Low ${h}<span class="sep">·</span>High ${v}<span class="sep">·</span>Avg
        ${_}
      </div>
    `}};De.styles=[T,k`
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
    `],p([y({attribute:!1})],De.prototype,"hass",2),p([f()],De.prototype,"_config",2),p([f()],De.prototype,"_stats",2),De=p([x("silk-minmax-card")],De);var wl={type:"silk-power-flow-card",name:"Silk Power Flow",description:"Watch energy move through your home."},Lf="#35b5b1",se=23,fl=30,gl=18,bl=96,An=13,_t=5,vl=3,If=2.3,Ff=1.2,_l=6,Fs={solar:"mdi:solar-power-variant",grid:"mdi:transmission-tower",home:"mdi:home"},Sn={solar:"var(--silk-solar)",grid:"var(--silk-grid)",home:"var(--silk-accent)",battery:"var(--silk-battery)"},Df={solar:"Solar",grid:"Grid",home:"Home",battery:"Battery"},at=a=>Math.round(a*10)/10;function bi(a){if(!a||b(a)||a.state==="")return NaN;let s=Number(a.state);return Number.isFinite(s)?s:NaN}function yl(a,s,t){let e=s.x-a.x,i=s.y-a.y,n=Math.hypot(e,i)||1;return{x:a.x+e/n*t,y:a.y+i/n*t}}function zf(a,s,t,e){let i={x:(a.x+s.x)/2,y:(a.y+s.y)/2},n=i;if(e>0){let c=s.x-a.x,d=s.y-a.y,u=Math.hypot(c,d)||1,g=-d/u,h=c/u;g*(i.x-t.x)+h*(i.y-t.y)<0&&(g=-g,h=-h),n={x:i.x+g*e,y:i.y+h*e}}let r=yl(a,n,fl),o=yl(s,n,fl);return`M ${at(r.x)} ${at(r.y)} Q ${at(n.x)} ${at(n.y)} ${at(o.x)} ${at(o.y)}`}function Uf(a,s){if(!Number.isFinite(a))return s?"mdi:battery-charging":"mdi:battery";let t=R(Math.round(a/10)*10,0,100);return s?`mdi:battery-charging-${t<=10?10:t}`:t>=100?"mdi:battery":t<=0?"mdi:battery-outline":`mdi:battery-${t}`}var xl="silk-power-flow-card-editor";C(xl,[{name:"solar",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"grid",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"home",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"battery",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"battery_soc",selector:{entity:{domain:["sensor"],device_class:"battery"}}}],{solar:"Solar production (W)",grid:"Grid power (W, \u2212 = export)",home:"House consumption (W)",battery:"Battery power (W, + = charge)",battery_soc:"Battery charge (%)"});var ze=class extends w{constructor(){super(...arguments);this._plot=null}static getStubConfig(t){let e=Object.keys(t.states).filter(u=>u.startsWith("sensor.")&&t.states[u].attributes.device_class==="power"),i=new Set,n=(...u)=>{let g=e.find(h=>{if(i.has(h))return!1;let v=`${h} ${t.states[h].attributes.friendly_name??""}`.toLowerCase();return u.some(_=>v.includes(_))});return g&&i.add(g),g},r=n("solar","pv","inverter"),o=n("grid","meter","import"),c=n("battery","storage"),d=n("home","house","load","consumption");return!d&&!r&&!o&&!c&&(d=e[0]??Object.keys(t.states).find(u=>u.startsWith("sensor.")&&Number.isFinite(Number(t.states[u].state)))),{type:"custom:silk-power-flow-card",solar:r,grid:o,home:d,battery:c}}static async getConfigElement(){return document.createElement(xl)}setConfig(t){if(!t.solar&&!t.grid&&!t.grid_export&&!t.home&&!t.battery)throw new Error("silk-power-flow-card: at least one of `solar`, `grid`, `home` or `battery` is required");this._config=t}getCardSize(){return 4}getGridOptions(){return{columns:6,rows:4,min_columns:4,min_rows:3}}connectedCallback(){super.connectedCallback(),this.hasUpdated&&this._observePlot()}disconnectedCallback(){super.disconnectedCallback(),this._resize?.disconnect()}updated(){this._observePlot()}_observePlot(){let t=this.renderRoot.querySelector(".flow");t&&(this._resize||(this._resize=new ResizeObserver(e=>{let i=e[e.length-1].contentRect,n=Math.round(i.width),r=Math.round(i.height);(!this._plot||this._plot.w!==n||this._plot.h!==r)&&(this._plot={w:n,h:r})})),this._resize.observe(t))}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_power(t,e){if(!Number.isFinite(e))return{text:"\u2014",unit:""};if(Math.abs(e)>=1e3){let i=e/1e3,n=Math.abs(i)>=10?0:1;return{text:new Intl.NumberFormat(this._locale(),{minimumFractionDigits:n,maximumFractionDigits:n}).format(i),unit:"kW"}}return t&&this.hass?.entities?.[t]?.display_precision!==void 0?{text:U(this.hass,t,e),unit:"W"}:{text:new Intl.NumberFormat(this._locale(),{maximumFractionDigits:0}).format(e),unit:"W"}}_nodeTitle(t,e,i,n,r){let o=Df[t];if(!Number.isFinite(i))return`${o} \xB7 unavailable`;let{text:c,unit:d}=this._power(e,i);return`${o} \xB7 ${n?`${n} `:""}${c}${d?` ${d}`:""}${r??""}`}_model(){let t=this._config,e=this.hass;if(!t||!e)return null;let i=K=>K?e.states[K]:void 0,n=i(t.solar),r=i(t.grid),o=i(t.grid_export),c=i(t.home),d=i(t.battery),u=i(t.battery_soc),g=bi(n),h=bi(r),v=bi(o),_=bi(d),$=bi(c),M=bi(u),P=Number.isFinite(g)?Math.max(0,g):0,L=Number.isFinite(h)?Math.max(0,h):0,H=Number.isFinite(h)&&!t.grid_export?Math.max(0,-h):0;Number.isFinite(v)&&(H=Math.abs(v));let z=Number.isFinite(_)?Math.max(0,_):0,V=Number.isFinite(_)?Math.max(0,-_):0,F=!!t.solar,q=!!(t.grid||t.grid_export),B=!!(t.battery||t.battery_soc),X=!t.home&&q,Z=!!t.home||X,tt=t.home?Number.isFinite($)?Math.max(0,$):NaN:X?Math.max(0,P+L-H+V-z):NaN,Q=Number.isFinite(tt)?tt:0,Ut=Math.min(P,Q),wt=P-Ut,Y=Math.min(wt,z);wt-=Y;let pt=Math.min(wt,H),ot=Math.min(V,Math.max(0,Q-Ut)),mt=Math.max(0,z-Y),Oi=Math.max(0,H-pt),yi=Math.max(0,Q-Ut-ot)+mt,ue=Number.isFinite(h)||Number.isFinite(v)?Math.max(L,H):NaN,jt=Number.isFinite(_)?Math.max(z,V):NaN,Bn=Number.isFinite(g)?P:NaN,wi=[];if(F){let K=this._power(t.solar,Bn);wi.push({id:"solar",entity:t.solar,color:Sn.solar,icon:Fs.solar,label:K.text,unit:K.unit,title:this._nodeTitle("solar",t.solar,Bn),active:P>_t,na:!Number.isFinite(Bn)})}if(q){let K=t.grid??t.grid_export,xi=this._power(K,ue),he=H>_t?"exporting":L>_t?"importing":"idle";wi.push({id:"grid",entity:K,color:Sn.grid,icon:Fs.grid,label:xi.text,unit:xi.unit,title:this._nodeTitle("grid",K,ue,he),active:L>_t||H>_t,na:!Number.isFinite(ue)})}if(Z){let K=this._power(t.home,tt);wi.push({id:"home",entity:t.home,color:Sn.home,icon:Fs.home,label:K.text,unit:K.unit,title:this._nodeTitle("home",t.home,tt,void 0,X?" (estimated)":""),active:Q>_t,na:!Number.isFinite(tt)})}if(B){let K=this._power(t.battery,jt),xi=z>_t?"charging":V>_t?"discharging":"idle",he=Number.isFinite(M)?`${new Intl.NumberFormat(this._locale(),{maximumFractionDigits:0}).format(M)}%`:void 0;wi.push({id:"battery",entity:t.battery??t.battery_soc,color:Sn.battery,icon:Uf(M,z>_t),label:K.text,unit:K.unit,sub:he,title:this._nodeTitle("battery",t.battery,jt,xi,he?` \xB7 ${he}`:""),active:z>_t||V>_t,na:!Number.isFinite(jt)})}let Hi=(K,xi,he,Lp)=>({from:K,to:xi,watts:Math.abs(he),reverse:he<0,bow:Lp}),rr=new Set(wi.map(K=>K.id)),Hp=[Hi("solar","grid",pt,An),Hi("solar","home",Ut,0),Hi("solar","battery",Y,An),Hi("grid","home",yi-Oi,An),Hi("home","battery",mt-ot,An)].filter(K=>rr.has(K.from)&&rr.has(K.to)),Np=Number.isFinite(tt)&&tt>0&&(F||B)?R(Math.round((P+V)/tt*100),0,100):null,or=[t.solar,t.grid,t.grid_export,t.home,t.battery,t.battery_soc].filter(K=>!!K);return{nodes:wi,links:Hp,selfPct:Np,unavailable:or.every(K=>b(e.states[K])),allMissing:or.every(K=>!e.states[K])}}_half(t){return R(t/2-52,46,116)}_layout(t,e,i){let n=this._half(e),r=se+1,o=Math.max(r,i-gl-se-1),c=(r+o)/2,d={solar:{x:e/2,y:r},grid:{x:e/2-n,y:c},home:{x:e/2,y:o},battery:{x:e/2+n,y:c}},u=t.nodes.map(P=>d[P.id]);if(!u.length)return d;let g=Math.min(...u.map(P=>P.x))-se,h=Math.max(...u.map(P=>P.x))+se,v=Math.min(...u.map(P=>P.y))-se,_=Math.max(...u.map(P=>P.y))+se+gl,$=(e-(h-g))/2-g,M=(i-(_-v))/2-v;return Object.keys(d).forEach(P=>{d[P]={x:d[P].x+$,y:d[P].y+M}}),d}_dots(t,e,i,n){let r=R(_l-e/1e3,Ff,_l),o=Math.round(r*4)/4,c=[];for(let d=0;d<vl;d++){let u=d*o/vl;c.push(j`<circle class="dot" r=${If}>
        <animateMotion
          dur=${`${o}s`}
          begin=${u?`-${u.toFixed(2)}s`:"0s"}
          repeatCount="indefinite"
          calcMode="linear"
          keyPoints=${i?"1;0":"0;1"}
          keyTimes="0;1"
          path=${t}
        ></animateMotion>
      </circle>`)}return j`<g class="dots ${n?"on":""}">${c}</g>`}_onNodeClick(t,e){e&&(t.stopPropagation(),E(this,"selection"),A(this,e))}_onCardClick(){let t=this._config;if(!t)return;let e=t.home??t.solar??t.grid??t.battery??t.grid_export??t.battery_soc;e&&A(this,e)}_renderFlow(t){let e=this._plot;if(!e||e.w<40||e.h<40)return m;let i=this._layout(t,e.w,e.h),n={x:e.w/2,y:e.h/2},r=[],o=[];for(let h of t.links){let v=zf(i[h.from],i[h.to],n,h.bow),_=h.watts>_t;r.push(j`<path class="link ${_?"on":""}" d=${v}></path>`),o.push(this._dots(v,h.watts,h.reverse,_))}let c=t.nodes.find(h=>h.id==="battery"),d=this._config?.battery_soc?bi(this.hass?.states[this._config.battery_soc]):NaN,u=c&&Number.isFinite(d)?j`<g class="soc">
            <circle class="soc-track" cx=${at(i.battery.x)} cy=${at(i.battery.y)} r=${se+3.5}></circle>
            <circle
              class="soc-val"
              cx=${at(i.battery.x)}
              cy=${at(i.battery.y)}
              r=${se+3.5}
              pathLength="100"
              stroke-dasharray="100"
              stroke-dashoffset=${100-R(d,0,100)}
              transform=${`rotate(-90 ${at(i.battery.x)} ${at(i.battery.y)})`}
            ></circle>
          </g>`:m,g=R(Math.min(bl,2*this._half(e.w)-8),46,bl);return l`
      <svg width=${e.w} height=${e.h} aria-hidden="true">
        <g class="wires">${r}</g>
        ${u}${o}
      </svg>
      ${t.nodes.map(h=>{let v=i[h.id];return l`
          <button
            class="node ${h.active?"on":""} ${h.na?"na":""}"
            style="left:${at(v.x)}px;top:${at(v.y-se)}px;width:${g}px;--node:${h.color}"
            title=${h.title}
            aria-label=${h.title}
            @click=${_=>this._onNodeClick(_,h.entity)}
          >
            <span class="disc"><ha-icon .icon=${h.icon}></ha-icon></span>
            <span class="val"
              >${h.label}${h.unit?l`<span class="u">${h.unit}</span>`:m}</span
            >
            ${h.sub?l`<span class="sub">${h.sub}</span>`:m}
          </button>
        `})}
      ${t.selfPct!==null?l`<div class="badge" title="Self-sufficiency">${t.selfPct}% self</div>`:m}
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._model();return!i||!i.nodes.length?m:i.allMissing?l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.home??t.grid??t.solar}</div>
        </ha-card>
      `:l`
      <ha-card
        class="control ${i.unavailable?"unavailable":""}"
        style="--silk-accent:${t.color??Lf}"
        @click=${this._onCardClick}
      >
        <div class="flow">${this._renderFlow(i)}</div>
      </ha-card>
    `}};ze.styles=[T,k`
      :host {
        --silk-solar: #e6a23c;
        --silk-grid: var(--primary-color, #4aa8ff);
        --silk-battery: #5ec78d;
      }
      ha-card {
        flex-direction: column;
        align-items: stretch;
        padding: 10px 12px;
      }
      .flow {
        position: relative;
        flex: 1;
        min-height: 132px;
        min-width: 0;
      }
      .flow svg {
        position: absolute;
        inset: 0;
        display: block;
        pointer-events: none;
      }
      .link {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
        stroke-width: 2;
        stroke-linecap: round;
        transition: stroke 200ms ease;
      }
      .link.on {
        stroke: color-mix(in srgb, var(--silk-accent) 55%, transparent);
      }
      .dot {
        fill: var(--silk-accent);
      }
      /* Flow appears and fades, but the dots themselves never restart. */
      .dots {
        opacity: 0;
        transition: opacity 200ms ease;
      }
      .dots.on {
        opacity: 1;
      }
      .soc-track,
      .soc-val {
        fill: none;
        stroke-width: 2.5;
      }
      .soc-track {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .soc-val {
        stroke: var(--silk-battery);
        stroke-linecap: round;
        transition: stroke-dashoffset 450ms var(--silk-ease-out);
      }
      .node {
        position: absolute;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        cursor: pointer;
        z-index: 1;
      }
      .disc {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .node:active .disc {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .node.on .disc {
        color: var(--node);
        background: color-mix(in srgb, var(--node) 18%, transparent);
      }
      .node:focus-visible {
        outline: none;
      }
      .node:focus-visible .disc {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--node) 70%, transparent);
      }
      .disc ha-icon {
        --mdc-icon-size: 22px;
        pointer-events: none;
      }
      .val {
        max-width: 100%;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .val .u {
        margin-left: 2px;
        font-size: 10.5px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .sub {
        max-width: 100%;
        font-size: 10.5px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .node.na .val {
        color: var(--secondary-text-color);
      }
      .badge {
        position: absolute;
        top: 0;
        right: 0;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        pointer-events: none;
      }
      .unavailable .flow {
        opacity: 0.45;
      }
      @media (prefers-reduced-motion: reduce) {
        .dots {
          display: none;
        }
      }
    `],p([y({attribute:!1})],ze.prototype,"hass",2),p([f()],ze.prototype,"_config",2),p([f()],ze.prototype,"_plot",2),ze=p([x("silk-power-flow-card")],ze);var Cl={type:"silk-tariff-card",name:"Silk Tariff",description:"Today's electricity price, hour by hour."},Ds="#5ec78d",jf="#e6a23c",Vf="#ef6c6c",kl=2,qf=4,$l=2,Tl=12,Gf=2,Wf=12,Bf=5.6,Kf=24,Yf=2e3,Xf=["raw_today","today","prices"],Zf=["value","price","total","cost","amount"],Qf=["start","hour","time","datetime","from","start_time"],W=a=>Math.round(a*10)/10;function Jf(a){if(!a||b(a)||a.state==="")return NaN;let s=Number(a.state);return Number.isFinite(s)?s:NaN}function tg(a){if(typeof a=="number"&&Number.isFinite(a)){if(a>=0&&a<=23)return a;let i=a>1e11?a:a*1e3;return new Date(i).getHours()}let s=String(a??""),t=Date.parse(s);if(Number.isFinite(t))return new Date(t).getHours();let e=Number(s);return Number.isFinite(e)&&e>=0&&e<=23?e:NaN}function El(a){for(let s of Xf){let t=a[s];if(!Array.isArray(t)||t.length<2)continue;let e=new Map;if(t.forEach((i,n)=>{let r=NaN,o=NaN;if(typeof i=="number")r=i;else if(i&&typeof i=="object"){let c=i;for(let d of Zf){let u=Number(c[d]);if(c[d]!==void 0&&c[d]!==null&&Number.isFinite(u)){r=u;break}}for(let d of Qf)if(!(c[d]===void 0||c[d]===null)&&(o=tg(c[d]),Number.isFinite(o)))break}Number.isFinite(r)&&(Number.isFinite(o)||(o=n),o=Math.round(o),!(o<0||o>23||e.has(o))&&e.set(o,r))}),e.size>=2)return[...e.entries()].map(([i,n])=>({hour:i,value:n})).sort((i,n)=>i.hour-n.hour).slice(0,Kf)}return null}function eg(a,s,t,e,i){let n=e-t,r=Math.min(qf,s/2,n);return i?`M${W(a)},${W(e)} V${W(t+r)} Q${W(a)},${W(t)} ${W(a+r)},${W(t)} H${W(a+s-r)} Q${W(a+s)},${W(t)} ${W(a+s)},${W(t+r)} V${W(e)} Z`:`M${W(a)},${W(t)} V${W(e-r)} Q${W(a)},${W(e)} ${W(a+r)},${W(e)} H${W(a+s-r)} Q${W(a+s)},${W(e)} ${W(a+s)},${W(e-r)} V${W(t)} Z`}var Al="silk-tariff-card-editor";C(Al,[{name:"entity",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}},{name:"unit",selector:{text:{}}}],{entity:"Entity",name:"Name",unit:"Unit"});var re=class extends w{constructor(){super(...arguments);this._plot=null;this._hour=new Date().getHours();this._levels=[]}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")),i=e.find(r=>El(t.states[r].attributes)!==null),n=e.find(r=>t.states[r].attributes.device_class==="monetary");return{type:"custom:silk-tariff-card",entity:i??n??e[0]}}static async getConfigElement(){return document.createElement(Al)}setConfig(t){if(!t.entity)throw new Error("silk-tariff-card: `entity` is required");if(t.levels!==void 0&&!Array.isArray(t.levels))throw new Error("silk-tariff-card: `levels` must be a list of {above, color}");this._levels=(t.levels??[]).filter(e=>typeof e?.above=="number"&&Number.isFinite(e.above)&&typeof e?.color=="string").sort((e,i)=>e.above-i.above),this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._hour=new Date().getHours(),this._scheduleHourly(),this.hasUpdated&&this._observePlot()}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._hourlyTimer),this._resize?.disconnect()}updated(){this._observePlot()}_observePlot(){let t=this.renderRoot.querySelector(".plot");t&&(this._resize||(this._resize=new ResizeObserver(e=>{let i=e[e.length-1].contentRect,n=Math.round(i.width),r=Math.round(i.height);(!this._plot||this._plot.w!==n||this._plot.h!==r)&&(this._plot={w:n,h:r})})),this._resize.observe(t))}_scheduleHourly(){window.clearTimeout(this._hourlyTimer);let t=Date.now(),e=(Math.floor(t/36e5)+1)*36e5+Yf;this._hourlyTimer=window.setTimeout(()=>{this._hour=new Date().getHours(),this._scheduleHourly()},e-t)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_digits(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;if(e!==void 0)return e;let i=Math.abs(t);return i>=100?0:i>=1?2:3}_price(t,e){return Number.isFinite(t)?new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t):"\u2014"}_hourText(t){let e=new Date;return e.setHours(t,0,0,0),new Intl.DateTimeFormat(this._locale(),{hour:"numeric",minute:"2-digit"}).format(e)}_levelColor(t,e,i){if(this._levels.length){for(let r=this._levels.length-1;r>=0;r--)if(this._levels[r].above<=t)return this._levels[r].color;return Ds}let n=i-e;return!(n>0)||t<=e+n/3?Ds:t<=e+2*n/3?jf:Vf}_onCardClick(){this._config&&A(this,this._config.entity)}_renderBars(t,e,i,n){let r=this._plot;if(!r)return m;let o=t.length,c=t.map(Y=>Y.value),d=Math.min(...c),u=Math.max(...c),g=d<0?Wf:Gf,h=r.h-Tl-g,v=(r.w+kl)/o,_=v-kl;if(_<=1||h<=8)return m;let $=c.reduce((Y,pt)=>Y+pt,0)/o,M=Math.min(0,d),P=Math.max(0,u),L=P-M||1,H=Y=>Tl+(P-Y)/L*h,z=H(0),V=[],F=[],q=[],B=[],X=-1;for(let Y=0;Y<o;Y++){let pt=c[Y],ot=Y*v,mt=pt>=0,Oi=H(pt),yi=mt?Math.min(Oi,z-$l):z,ue=mt?z:Math.max(Oi,z+$l);q.push(yi),B.push(ue);let jt=Y===e;jt&&(X=ot),V.push(j`<path
          class="bar ${jt?"now":Y<e?"past":"ahead"}"
          style=${jt?"":`fill:${this._levelColor(pt,d,u)}`}
          d=${eg(ot,_,yi,ue,mt)}
        ></path>`),F.push(j`<rect class="hit" x=${W(ot)} y="0" width=${W(_)} height=${r.h}>
          <title>${this._hourText(t[Y].hour)} · ${this._price(pt,n)}${i?` ${i}`:""}</title>
        </rect>`)}let Z=[],tt=[],Q=new Set;for(let Y of[e,c.indexOf(u),c.indexOf(d)]){if(Y<0||Q.has(Y))continue;Q.add(Y);let pt=this._price(c[Y],n),ot=pt.length*Bf/2,mt=R(Y*v+_/2,ot,Math.max(ot,r.w-ot));if(tt.some(([ue,jt])=>mt-ot<jt+3&&mt+ot>ue-3))continue;tt.push([mt-ot,mt+ot]);let yi=c[Y]>=0?Math.max(9,q[Y]-3):Math.min(r.h-1,B[Y]+9);Z.push(j`<text class="val ${Y===e?"now":""}" x=${W(mt)} y=${W(yi)} text-anchor="middle">${pt}</text>`)}let Ut=W(H($))+.5,wt=Math.round(z)+.5;return l`
      <svg width=${r.w} height=${r.h} aria-hidden="true">
        <g class="chart">
          <line class="avg" x1="0" y1=${Ut} x2=${r.w} y2=${Ut}>
            <title>Average · ${this._price($,n)}${i?` ${i}`:""}</title>
          </line>
          ${V}
          <line class="base" x1="0" y1=${wt} x2=${r.w} y2=${wt}></line>
          ${X>=0?j`<line class="base now" x1=${W(X)} y1=${wt} x2=${W(X+_)} y2=${wt}></line>`:m}
          ${Z}${F}
        </g>
      </svg>
    `}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i,t.color),o=t.name??i?.attributes.friendly_name??t.entity,c=t.unit??i?.attributes.unit_of_measurement??"",d=i?El(i.attributes):null,u=d?d.findIndex($=>$.hour===this._hour):-1,g=Jf(i),h=Number.isFinite(g)?g:d&&u>=0?d[u].value:NaN,v=Math.max(Number.isFinite(h)?Math.abs(h):0,...d?d.map($=>Math.abs($.value)):[0]),_=this._digits(v);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="info"><div class="name" title=${o}>${o}</div></div>
          <div class="trailing">
            <span class="price">${this._price(h,_)}</span>
            ${c?l`<span class="unit">${c}</span>`:m}
          </div>
        </div>
        <div class="plot">
          ${d?this._renderBars(d,u,c,_):l`<div class="note">No hourly forecast on this entity</div>`}
        </div>
      </ha-card>
    `}};re.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 10px;
        min-width: 0;
      }
      .trailing {
        align-items: baseline;
        gap: 3px;
      }
      .price {
        font-size: 20px;
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
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
      .chart {
        animation: silk-tariff-in 250ms var(--silk-ease-out);
      }
      .bar {
        transition: fill 200ms ease;
      }
      .bar.past {
        fill-opacity: 0.4;
      }
      .bar.ahead {
        fill-opacity: 0.75;
      }
      .bar.now {
        fill: var(--silk-accent);
      }
      /* Recessive reference lines: the data reads first. */
      .avg {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.28);
        stroke-width: 1;
        stroke-dasharray: 3 3;
      }
      .base {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
        shape-rendering: crispEdges;
      }
      .base.now {
        stroke: var(--silk-accent);
      }
      .val {
        font-size: 10px;
        font-weight: 500;
        fill: var(--primary-text-color);
        opacity: 0.65;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .val.now {
        opacity: 0.9;
      }
      .hit {
        fill: transparent;
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
      @keyframes silk-tariff-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],p([y({attribute:!1})],re.prototype,"hass",2),p([f()],re.prototype,"_config",2),p([f()],re.prototype,"_plot",2),p([f()],re.prototype,"_hour",2),re=p([x("silk-tariff-card")],re);var Ml={type:"silk-storage-card",name:"Silk Storage",description:"Home battery, charge and reserve at a glance."},Pl="silk-storage-card-editor";C(Pl,[{name:"soc",required:!0,selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"power",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"",type:"grid",schema:[{name:"capacity",selector:{number:{min:0,step:.1,mode:"box"}}},{name:"reserve",selector:{number:{min:0,max:100,mode:"box"}}}]},{name:"name",selector:{text:{}}}],{soc:"Charge (%)",power:"Battery power (W)",capacity:"Capacity (kWh)",reserve:"Reserve floor (%)",name:"Name"});var Rn=120,Us=48,Pi=3,On=2.5,Rl=4,Hn=104,Ol=40,ig=11,Nn=2,Mn=On+Pi/2+Nn,Bi=Rl+Pi/2+Nn,zs=Hn-Pi-Nn*2,Pn=Ol-Pi-Nn*2,ng=7,sg=8,Hl=14,rg=3,og=On+Hn+Pi/2+2,ag=(Us-Hl)/2,cg=Number(((On+Hn/2)/Rn*100).toFixed(2)),lg=8,dg=20,Sl=5,pg="#5ec78d";function Nl(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}function mg(a){let s=Nl(a);if(!Number.isFinite(s))return NaN;let t=String(a?.attributes.unit_of_measurement??"W").trim().toLowerCase();return t==="kw"?s*1e3:t==="mw"?s*1e6:s}var Ue=class extends w{constructor(){super(...arguments);this._drawn=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor.")),i=n=>e.find(r=>t.states[r].attributes.device_class===n);return{type:"custom:silk-storage-card",soc:i("battery"),power:i("power")}}static async getConfigElement(){return document.createElement(Pl)}setConfig(t){if(!t.soc)throw new Error("silk-storage-card: `soc` (a battery percentage entity) is required");if(t.capacity!==void 0&&!(Number(t.capacity)>0))throw new Error("silk-storage-card: `capacity` must be a positive number of kWh");if(t.reserve!==void 0&&(!Number.isFinite(Number(t.reserve))||Number(t.reserve)<0||Number(t.reserve)>100))throw new Error("silk-storage-card: `reserve` must be a percentage between 0 and 100");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_num(t,e){return new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}_onCardClick(){this._config&&A(this,this._config.soc)}_renderPack(t,e,i){let n=this._config?.reserve!==void 0?R(Number(this._config.reserve),0,100):void 0,r=this._drawn&&e?t:0,o=zs*r/100,c=i?Math.min(lg,o):0,d=o-c,u=[];d>0&&u.push(j`<rect class="fill" x=${Mn} y=${Bi} width=${d} height=${Pn}></rect>`),c>0&&u.push(j`<rect class="fill lead" x=${Mn+d} y=${Bi} width=${c} height=${Pn}></rect>`);let g=n===void 0?0:Mn+zs*n/100;return l`
      <div class="pack">
        <svg viewBox="0 0 ${Rn} ${Us}" aria-hidden="true">
          <defs>
            <clipPath id="packclip">
              <rect x=${Mn} y=${Bi} width=${zs} height=${Pn} rx=${ng}></rect>
            </clipPath>
          </defs>
          <rect
            class="body"
            x=${On}
            y=${Rl}
            width=${Hn}
            height=${Ol}
            rx=${ig}
          ></rect>
          <rect class="nub" x=${og} y=${ag} width=${sg} height=${Hl} rx=${rg}></rect>
          <g clip-path="url(#packclip)">${u}</g>
          ${n===void 0?m:j`<line
                class="reserve"
                x1=${g}
                y1=${Bi-1}
                x2=${g}
                y2=${Bi+Pn+1}
              ><title>Reserve ${this._num(n,0)}%</title></line>`}
        </svg>
        <span class="soc">${e?`${Math.round(t)}%`:"\u2014"}</span>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.soc];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.soc}</div>
        </ha-card>
      `;let n=b(i),r=Nl(i),o=Number.isFinite(r),c=o?R(r,0,100):0,d=t.power?e.states[t.power]:void 0,u=mg(d),g=Number.isFinite(u),h=g&&u>Sl,v=g&&u<-Sl,_=o&&c<=dg,$=h?pg:_?"var(--error-color, #db4437)":S(i,t.color),M=t.name??i.attributes.friendly_name??t.soc,P=g?h?"Charging":v?"Discharging":"Idle":void 0,L=g&&(h||v)?`${this._num(Math.abs(u)/1e3,1)} kW`:void 0,H=t.capacity!==void 0&&o?`${this._num(c/100*Number(t.capacity),1)} kWh stored`:void 0,z=P??H??I(e,i),V=P?H:void 0;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${$}"
        @click=${this._onCardClick}
      >
        ${this._renderPack(c,o&&!n,h&&!n)}
        <div class="info">
          <div class="name">
            ${t.icon?l`<ha-icon class="tag" .icon=${t.icon}></ha-icon>`:m}${M}
          </div>
          <div class="state">
            ${z}${P&&L?l`<span class="sep">·</span>${L}`:m}
          </div>
          ${V?l`<div class="sub">${V}</div>`:m}
        </div>
      </ha-card>
    `}};Ue.styles=[T,k`
      /* Display card: the whole card presses as one and opens more-info. */
      ha-card {
        transition: transform 250ms var(--silk-spring);
      }
      ha-card:active {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .pack {
        position: relative;
        flex: 0 1 ${Rn}px;
        min-width: 84px;
        aspect-ratio: ${Rn} / ${Us};
      }
      .pack svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .body {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        stroke-width: ${Pi};
      }
      .nub {
        fill: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
      }
      .fill {
        fill: var(--silk-accent);
        transition:
          width 450ms var(--silk-ease-out),
          x 450ms var(--silk-ease-out),
          fill 200ms ease;
      }
      /* Real activity, not decoration: only the charge front breathes. */
      .fill.lead {
        animation: silk-storage-charge 1400ms ease-in-out infinite;
      }
      .reserve {
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.5);
        stroke-width: 2;
        stroke-dasharray: 3 3;
        stroke-linecap: round;
      }
      .soc {
        position: absolute;
        left: ${cg}%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      /* Inline so the name keeps its single-line ellipsis. */
      .tag {
        --mdc-icon-size: 16px;
        vertical-align: -3px;
        margin-right: 4px;
        color: var(--secondary-text-color);
      }
      .sub {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .unavailable .pack {
        opacity: 0.45;
      }
      @keyframes silk-storage-charge {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.4;
        }
      }
    `],p([y({attribute:!1})],Ue.prototype,"hass",2),p([f()],Ue.prototype,"_config",2),p([f()],Ue.prototype,"_drawn",2),Ue=p([x("silk-storage-card")],Ue);var Fl={type:"silk-ev-card",name:"Silk EV",description:"Charging state, range, and the stop button."},Dl="silk-ev-card-editor";C(Dl,[{name:"name",selector:{text:{}}},{name:"status",selector:{entity:{domain:["sensor","binary_sensor"]}}},{name:"",type:"grid",schema:[{name:"soc",selector:{entity:{domain:["sensor","number","input_number"]}}},{name:"range",selector:{entity:{domain:["sensor"]}}},{name:"power",selector:{entity:{domain:["sensor"],device_class:"power"}}},{name:"energy",selector:{entity:{domain:["sensor"],device_class:"energy"}}}]},{name:"switch",selector:{entity:{domain:["switch","button","input_boolean","script"]}}},{name:"target",selector:{number:{min:0,max:100,mode:"box"}}}],{name:"Name",status:"Charging state",soc:"Charge (%)",range:"Range",power:"Power (W)",energy:"Session energy (kWh)",switch:"Start/stop switch",target:"Target charge (%)"},{target:80,name:"EV"});var Ll=80,ug="EV",hg="mdi:ev-station",Il=50,fg=2e3;function Ln(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}function gg(a){let s=Ln(a);if(!Number.isFinite(s))return NaN;let t=String(a?.attributes.unit_of_measurement??"W").trim().toLowerCase();return t==="kw"?s*1e3:t==="mw"?s*1e6:s}var bg=new Set(["off","idle","complete","completed","stopped","disconnected","unplugged","not_charging","no_power"]);function vg(a){let s=a.state.toLowerCase().replace(/[\s-]+/g,"_");return O(a.entity_id)==="binary_sensor"?s==="on":bg.has(s)||s.includes("not_charging")?!1:s.includes("charging")||s==="on"}var _g=a=>a.length?a.charAt(0).toUpperCase()+a.slice(1):a,je=class extends w{constructor(){super(...arguments);this._optimistic=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states),i=e.find(r=>r.startsWith("sensor.")&&t.states[r].attributes.device_class==="battery"),n=e.find(r=>(r.startsWith("sensor.")||r.startsWith("binary_sensor."))&&/charg/i.test(r));return{type:"custom:silk-ev-card",soc:i,status:n,target:Ll}}static async getConfigElement(){return document.createElement(Dl)}setConfig(t){if(!t.soc&&!t.status&&!t.power&&!t.energy&&!t.range&&!t.switch)throw new Error("silk-ev-card: configure at least one of `soc`, `status`, `power`, `energy`, `range` or `switch`");if(t.target!==void 0&&(!Number.isFinite(Number(t.target))||Number(t.target)<0||Number(t.target)>100))throw new Error("silk-ev-card: `target` must be a percentage between 0 and 100");this._config=t,this._clearOptimistic()}getCardSize(){return this._config?.switch?3:2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!t.has("hass")||this._optimistic===null||!this._config?.switch)return;let e=this.hass?.states[this._config.switch];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_primaryEntity(){let t=this._config;if(t)return t.soc??t.status??t.switch??t.power??t.energy??t.range}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_num(t,e){return new Intl.NumberFormat(this._locale(),{minimumFractionDigits:e,maximumFractionDigits:e}).format(t)}_charging(t,e,i){return Number.isFinite(e)&&e>Il?!0:t&&!b(t)?vg(t):Number.isFinite(e)?!1:i&&!b(i)?N(i):!1}_onCardClick(){let t=this._primaryEntity();t&&A(this,t)}_onActionClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e?.switch||!i)return;let n=i.states[e.switch];!n||b(n)||(E(this),this._optimistic=!N(n),this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),fg),G(i,e.switch))}_line(t){let e=t.filter(i=>!!i);return l`${e.map((i,n)=>l`${n?l`<span class="sep">·</span>`:m}${i}`)}`}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._primaryEntity(),n=i?e.states[i]:void 0;if(i&&!n)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${i}</div>
        </ha-card>
      `;let r=t.status?e.states[t.status]:void 0,o=t.power?e.states[t.power]:void 0,c=t.energy?e.states[t.energy]:void 0,d=t.soc?e.states[t.soc]:void 0,u=t.range?e.states[t.range]:void 0,g=t.switch?e.states[t.switch]:void 0,h=b(n),v=gg(o),_=this._optimistic??this._charging(r,v,g),$=Ln(d),M=Number.isFinite($),P=M?R($,0,100):0,L=R(Number(t.target??Ll),0,100),H=Ln(c),z=Ln(u),V=S(d??r??g,t.color),F=t.name??ug,q=r&&!b(r)?O(r.entity_id)==="binary_sensor"?_?"Charging":"Not charging":_g(I(e,r)):_?"Charging":"Idle",B=Number.isFinite(v)&&v>Il?`${this._num(v/1e3,1)} kW`:void 0,X=c?.attributes.unit_of_measurement??"kWh",Z=Number.isFinite(H)?`${this._num(H,1)} ${X}`:void 0,tt=u?.attributes.unit_of_measurement??"km",Q=Number.isFinite(z)?`${this._num(z,0)} ${tt}`:void 0,Ut=M||Q!==void 0,wt=!g||b(g);return l`
      <ha-card
        class="control ${h?"unavailable":""}"
        style="--silk-accent:${V}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${_&&!h?"on":""}">
            <ha-icon .icon=${t.icon??hg}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${F}</div>
            <div class="state">
              ${this._line([q,B,M?Z:void 0])}
            </div>
          </div>
          ${M?l`<div class="trailing"><span class="value">${Math.round(P)}%</span></div>`:Z?l`
                  <div class="trailing">
                    <span class="value">${this._num(H,1)}</span>
                    <span class="unit">${X}</span>
                  </div>
                `:m}
        </div>
        ${Ut?l`
              <div class="bar">
                ${M?l`
                      <div
                        class="track"
                        role="progressbar"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow=${Math.round(P)}
                      >
                        <div class="fill" style="width:${P.toFixed(2)}%">
                          ${_&&!h?l`<span class="shine"></span>`:m}
                        </div>
                        <span class="notch" style="left:${L.toFixed(2)}%">
                          <span class="sr">Target ${Math.round(L)}%</span>
                        </span>
                      </div>
                    `:m}
                ${Q?l`<span class="range">${Q}</span>`:m}
              </div>
            `:m}
        ${t.switch?l`
              <button
                class="action ${_&&!wt?"on":""}"
                ?disabled=${wt}
                aria-label=${_?`Stop charging ${F}`:`Start charging ${F}`}
                @click=${this._onActionClick}
              >
                ${_?"Stop charging":"Start charging"}
              </button>
            `:m}
      </ha-card>
    `}};je.styles=[T,k`
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
      /* The action button owns the control, so the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .value {
        font-size: 20px;
        letter-spacing: -0.02em;
      }
      .bar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .track {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 8px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--silk-accent);
        overflow: hidden;
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      /* Real activity: a monochrome highlight travelling with the current. */
      .shine {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 34%;
        min-width: 24px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.4) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        transform: translateX(-120%);
        animation: silk-ev-travel 1600ms linear infinite;
        will-change: transform;
      }
      /* Recessive goal marker: it reads as a scale mark, never as a second value. */
      .notch {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        margin-left: -1px;
        border-radius: 1px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.45);
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      .range {
        flex: none;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .action {
        flex: none;
        width: 100%;
        height: 36px;
        border: none;
        border-radius: 12px;
        padding: 0 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .action:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .action:active:not(:disabled) {
        transform: scale(0.97);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .action.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .action:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .action:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .unavailable .bar {
        opacity: 0.45;
      }
      @keyframes silk-ev-travel {
        from {
          transform: translateX(-120%);
        }
        to {
          transform: translateX(320%);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .shine {
          display: none;
        }
      }
    `],p([y({attribute:!1})],je.prototype,"hass",2),p([f()],je.prototype,"_config",2),p([f()],je.prototype,"_optimistic",2),je=p([x("silk-ev-card")],je);var zl={type:"silk-water-card",name:"Silk Water",description:"Flow now, usage today, leak alarm loud."},Ul="Water",yg="mdi:water",wg="mdi:water-alert",xg="var(--error-color, #db4437)",kg=30,jl="silk-water-card-editor";C(jl,[{name:"flow",selector:{entity:{domain:["sensor"]}}},{name:"today",selector:{entity:{domain:["sensor"]}}},{name:"month",selector:{entity:{domain:["sensor"]}}},{name:"leak",selector:{entity:{domain:["binary_sensor"]}}},{name:"name",selector:{text:{}}}],{flow:"Flow rate",today:"Used today",month:"Used this month",leak:"Leak sensor",name:"Name"},{name:Ul});function js(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}function $g(a){let s=[];return a.forEach((t,e)=>{e&&s.push(l`<span class="sep">·</span>`),s.push(t)}),s}var Ve=class extends w{constructor(){super(...arguments);this._drawn=!1}static getStubConfig(t){let e=Object.keys(t.states),i=e.filter(c=>c.startsWith("sensor.")),n=c=>t.states[c].attributes.device_class==="water"||/water/.test(c),r=i.filter(n),o=r.find(c=>/flow|rate|lpm|l_min/.test(c));return{type:"custom:silk-water-card",flow:o,today:r.find(c=>/today|daily/.test(c))??r.find(c=>c!==o),month:r.find(c=>/month/.test(c)),leak:e.find(c=>c.startsWith("binary_sensor.")&&(t.states[c].attributes.device_class==="moisture"||/leak|water/.test(c)))}}static async getConfigElement(){return document.createElement(jl)}setConfig(t){if(!t.flow&&!t.today&&!t.month&&!t.leak)throw new Error("silk-water-card: at least one of `flow`, `today`, `month` or `leak` is required");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_primary(t){let e=this._config;if(e)return t&&e.leak?e.leak:e.flow??e.today??e.month??e.leak}_onTap(){let t=this._primary(this._isAlert());t&&(E(this),A(this,t))}_isAlert(){let t=this._config?.leak;return!!t&&this.hass?.states[t]?.state==="on"}_volumeText(t,e,i){if(!Number.isFinite(e))return"\u2014";let n=i?.attributes.unit_of_measurement??"",r=U(this.hass,t,e);return n?`${r} ${n}`:r}_barRow(t,e,i,n){return l`
      <span class="bar-label">${t}</span>
      <div class="bar-track" title="${t} · ${n}">
        <div class="bar-fill ${e}" style="width:${this._drawn?i:0}%"></div>
      </div>
      <span class="bar-value">${n}</span>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._isAlert(),n=this._primary(i);if(n&&!e.states[n])return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${n}</div>
        </ha-card>
      `;let r=t.flow?e.states[t.flow]:void 0,o=t.today?e.states[t.today]:void 0,c=t.month?e.states[t.month]:void 0,d=t.leak?e.states[t.leak]:void 0,g=[t.flow,t.today,t.month,t.leak].filter(Q=>!!Q).every(Q=>b(e.states[Q])),h=js(r),v=Number.isFinite(h)&&h>0,_=r?.attributes.unit_of_measurement??"",$=js(o),M=js(c),P=o?.attributes.unit_of_measurement??"",L=c?.attributes.unit_of_measurement??"",H=Number.isFinite(M)?M/kg:NaN,z=Number.isFinite($)&&Number.isFinite(H)&&P===L,V=z?Math.max($,H):0,F=Q=>V>0?Math.min(Q/V*100,100):0,q=i?xg:S(r??o??c,t.color),B=t.name??Ul,X=i?wg:t.icon??yg,Z=[];o&&Z.push(`Today ${this._volumeText(t.today,$,o)}`),c&&Z.push(`Month ${this._volumeText(t.month,M,c)}`);let tt=i?["Leak detected"]:Z.length?$g(Z):d&&!b(d)?["No leak"]:[];return l`
      <ha-card
        class="control ${g?"unavailable":""} ${r?"piped":""}"
        style="--silk-accent:${q}"
        @click=${this._onTap}
      >
        <div class="top">
          <div class="icon ${i||v?"on":""}">
            <ha-icon .icon=${X}></ha-icon>
          </div>
          <div class="info">
            <div class="name" title=${B}>${B}</div>
            ${tt.length?l`<div class="state ${i?"alarm":""}">${tt}</div>`:m}
          </div>
          ${r?l`
                <div class="trailing">
                  <span class="value flow"
                    >${Number.isFinite(h)?U(e,t.flow,h):"\u2014"}</span
                  >
                  ${_?l`<span class="unit">${_}</span>`:m}
                </div>
              `:m}
        </div>
        ${z?l`
              <div class="bars">
                ${this._barRow("Today","today",F($),this._volumeText(t.today,$,o))}
                ${this._barRow("Daily avg","avg",F(H),this._volumeText(t.month,H,c))}
              </div>
            `:m}
        ${r?l`
              <div class="flowbar" aria-hidden="true">
                ${v?l`<div class="seg"></div>`:m}
              </div>
            `:m}
      </ha-card>
    `}};Ve.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 6px;
      }
      /* The flow channel lives in reserved padding, so it never shifts layout. */
      ha-card.piped {
        padding-bottom: 30px;
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
      .state.alarm {
        color: var(--error-color, #db4437);
        font-weight: 600;
      }
      .trailing {
        align-items: baseline;
        gap: 4px;
      }
      .value.flow {
        font-size: 20px;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .bars {
        flex: none;
        display: grid;
        grid-template-columns: max-content 1fr max-content;
        align-items: center;
        gap: 4px 10px;
      }
      .bar-label {
        font-size: 11px;
        line-height: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .bar-track {
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 3px;
        width: 0;
        transition: width 400ms var(--silk-ease-out);
      }
      /* One hue for magnitude: today in accent, the reference bar recessive. */
      .bar-fill.today {
        background: var(--silk-accent);
      }
      .bar-fill.avg {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.18);
      }
      .bar-value {
        font-size: 11px;
        line-height: 12px;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .flowbar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 24px;
        overflow: hidden;
        z-index: 0;
        pointer-events: none;
        background: color-mix(in srgb, var(--silk-accent) 8%, transparent);
      }
      /*
       * A segment travelling down the pipe. Like the fan card's rotation this
       * loop depicts real movement — it only exists while water actually flows.
       * Width is 30% of the channel, so a full pass is -100% → 333% of itself.
       */
      .flowbar .seg {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 30%;
        background: var(--silk-accent);
        opacity: 0.4;
        will-change: transform;
        animation: silk-water-flow 2000ms linear infinite;
      }
      @keyframes silk-water-flow {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(333.34%);
        }
      }
      .unavailable .bars,
      .unavailable .flowbar {
        opacity: 0.45;
      }
      @media (prefers-reduced-motion: reduce) {
        /* Shared styles crush every duration to 0.01ms; park the segment instead. */
        .flowbar .seg {
          animation: none;
          transform: translateX(116%);
        }
      }
    `],p([y({attribute:!1})],Ve.prototype,"hass",2),p([f()],Ve.prototype,"_config",2),p([f()],Ve.prototype,"_drawn",2),Ve=p([x("silk-water-card")],Ve);var Gl={type:"silk-speedtest-card",name:"Silk Speedtest",description:"Down, up, ping \u2014 and a button to redo it."},Wl="Internet",Tg="#e6a23c",Vl=168,Eg=80,ql=2,Cg=864e5,Ag=3e5,Sg=6e4,Mg=2e3,Bl="silk-speedtest-card-editor";C(Bl,[{name:"download",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"upload",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"ping",selector:{entity:{domain:["sensor"]}}},{name:"run",selector:{entity:{domain:["button","input_button","script","switch"]}}},{name:"name",selector:{text:{}}}],{download:"Download entity",upload:"Upload entity",ping:"Ping entity",run:"Run-test entity",name:"Name"},{name:Wl});function Pg(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}var Ct=class extends w{constructor(){super(...arguments);this._width=0;this._height=0;this._rev=0;this._optimisticRun=!1;this._vals=null;this._fetchStarted=!1;this._fetchSeq=0;this._lastFetch=0;this._lastStamp="";this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states),i=e.filter(d=>d.startsWith("sensor.")&&Number.isFinite(Number(t.states[d].state))),n=i.filter(d=>/speedtest|speed_test/.test(d)),r=n.length?n:i,o=r.find(d=>/down/.test(d))??r[0],c=r.find(d=>d!==o&&/up/.test(d));return{type:"custom:silk-speedtest-card",download:o,upload:c,ping:r.find(d=>/ping|latency/.test(d)),run:e.find(d=>/^(button|switch|script)\..*(speedtest|speed_test)/.test(d))}}static async getConfigElement(){return document.createElement(Bl)}setConfig(t){if(!t.download||!t.upload)throw new Error("silk-speedtest-card: `download` and `upload` are required");if(t.hours_to_show!==void 0&&!(Number(t.hours_to_show)>0))throw new Error("silk-speedtest-card: `hours_to_show` must be a positive number");this._config=t,this._fetchStarted=!1,this._vals=null,this._lastStamp="",this._clearOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._intervalTimer=window.setInterval(()=>this._refresh(),Ag)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._intervalTimer),window.clearTimeout(this._refreshTimer),window.clearTimeout(this._optimisticTimer),this._refreshTimer=void 0,this._optimisticTimer=void 0,this._resizeObserver?.disconnect(),this._resizeObserver=void 0}willUpdate(t){if(!(!this.hass||!this._config)){if(t.has("hass")&&this._optimisticRun){let e=this.hass.states[this._config.run??""]?.last_updated;e&&e!==this._optimisticBase&&this._clearOptimistic()}if(!this._fetchStarted){this._fetchStarted=!0,this._refresh();return}t.has("hass")&&this._onStatesChanged()}}updated(){if(this._resizeObserver)return;let t=this.renderRoot.querySelector(".plot");t&&(this._resizeObserver=new ResizeObserver(e=>{let i=e[e.length-1].contentRect;i.width===this._width&&i.height===this._height||(this._width=i.width,this._height=i.height)}),this._resizeObserver.observe(t))}_onStatesChanged(){let t=this.hass?.states[this._config.download]?.last_updated??"";if(!t||t===this._lastStamp||(this._lastStamp=t,this._refreshTimer))return;let e=Math.max(0,Sg-(Date.now()-this._lastFetch));this._refreshTimer=window.setTimeout(()=>{this._refreshTimer=void 0,this._refresh()},e)}async _refresh(){if(!this.hass||!this._config)return;let t=this._config.download,e=this._config.hours_to_show??Vl,i=++this._fetchSeq,n=Date.now()/1e3,r=n-e*3600,o;try{o=await ht(this.hass,[t],r,n,e)}catch(c){console.warn("silk-speedtest-card: history fetch failed",c);return}i===this._fetchSeq&&(this._lastFetch=Date.now(),this._vals=ft(o[t]??[],r,n,Eg),this._rev++)}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticRun=!1}_runDisabled(t){return!t||t.state==="unavailable"}_onRun(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e?.run||!i)return;let n=i.states[e.run];this._runDisabled(n)||(E(this),this._flash(),this._optimisticRun=!0,this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>{this._optimisticTimer=void 0,this._optimisticRun=!1},Mg),G(i,e.run))}_flash(){let t=this.renderRoot.querySelector(".flash");t&&(t.classList.remove("go"),t.offsetWidth,t.classList.add("go"))}_onCardClick(){this._config&&A(this,this._config.download)}_windowLabel(){let t=Math.round(this._config?.hours_to_show??Vl);return t>=48&&t%24===0?`${t/24}d`:`${t}h`}_column(t,e,i,n,r){let o=Pg(n),c=n?.attributes.unit_of_measurement??r;return l`
      <div class="col ${e}">
        <span class="col-label">${t}</span>
        <span class="col-value"
          >${Number.isFinite(o)&&i?U(this.hass,i,o):"\u2014"}</span
        >
        <span class="col-unit">${c}</span>
      </div>
    `}_renderSpark(){let t=this._width,e=this._height,i=this._vals;if(!t||!e||!i)return m;let n=Gt(i,fe([i]),e,ql,ql),r=gt(n,t);return r?l`
      <svg viewBox="0 0 ${t} ${e}" width=${t} height=${e} aria-hidden="true">
        <path class="line" d=${r}></path>
      </svg>
    `:m}render(){let t=this._config;if(!t)return m;this._rev;let e=this.hass,i=e?.states[t.download],n=e?.states[t.upload];if(e&&(!i||!n))return l`<ha-card
        ><div class="warning">Entity not found: ${i?t.upload:t.download}</div></ha-card
      >`;let r=t.ping?e?.states[t.ping]:void 0,o=t.run?e?.states[t.run]:void 0,c=b(i)&&b(n),d=S(i,t.color),u=t.name??Wl,g=i?Date.parse(i.last_updated):NaN,h=Number.isFinite(g)&&Date.now()-g>Cg,v=h?`${this._windowLabel()} \xB7 stale`:this._windowLabel(),_=this._optimisticRun||o?.state==="on";return l`
      <ha-card
        class="control ${c?"unavailable":""}"
        style="--silk-accent:${d};--silk-upload:${t.upload_color??Tg}"
        @click=${this._onCardClick}
      >
        <div class="flash"></div>
        <div class="head">
          <div class="name" title=${u}>${u}</div>
          ${t.run?l`
                <button
                  class="run"
                  aria-label="Run speed test"
                  .disabled=${this._runDisabled(o)}
                  @click=${this._onRun}
                >
                  <ha-icon class=${_?"spin":""} icon="mdi:reload"></ha-icon>
                </button>
              `:m}
        </div>
        <div class="cols ${h?"stale":""}">
          ${this._column("Download","down",t.download,i,"Mbps")}
          ${this._column("Upload","up",t.upload,n,"Mbps")}
          ${t.ping?this._column("Ping","ping",t.ping,r,"ms"):m}
        </div>
        <div class="spark">
          <span class="caption">${v}</span>
          <div class="plot">${this._renderSpark()}</div>
        </div>
      </ha-card>
    `}};Ct.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 3px;
      }
      .head,
      .cols,
      .spark {
        position: relative;
        z-index: 1;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .head .name {
        flex: 1;
        min-width: 0;
      }
      .run {
        flex: none;
        width: 36px;
        height: 36px;
        /* Full 36px target, but it only claims 28px of row so the chart keeps its height. */
        margin: -4px -4px -4px 0;
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
      .run:hover {
        color: var(--silk-accent);
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
      .run:disabled {
        cursor: default;
        opacity: 0.45;
      }
      .run ha-icon {
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      /* Spins only while a test is genuinely running — real activity, not decor. */
      .run ha-icon.spin {
        animation: silk-speedtest-spin 900ms linear infinite;
      }
      .cols {
        flex: none;
        display: flex;
        align-items: stretch;
        min-width: 0;
        transition: opacity 200ms ease;
      }
      .cols.stale {
        opacity: 0.6;
      }
      .col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        padding-right: 8px;
      }
      /* Recessive 1px rules, the only division these three numbers need. */
      .col + .col {
        padding-left: 8px;
        border-left: 1px solid rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .col-label {
        font-size: 10px;
        line-height: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col-value {
        font-size: 22px;
        font-weight: 600;
        line-height: 24px;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col-unit {
        font-size: 10px;
        line-height: 11px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col.down .col-value {
        color: var(--silk-accent);
      }
      .col.up .col-value {
        color: var(--silk-upload, #e6a23c);
      }
      .col.ping .col-value {
        color: var(--secondary-text-color);
      }
      /* Nominal 30px of chart; it yields first when the card is squeezed. */
      .spark {
        flex: 1 1 30px;
        min-height: 20px;
        display: flex;
        align-items: flex-end;
        gap: 6px;
        margin-bottom: -6px;
      }
      .caption {
        flex: none;
        font-size: 9px;
        line-height: 1;
        padding-bottom: 1px;
        color: var(--primary-text-color);
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .plot {
        position: relative;
        flex: 1;
        min-width: 0;
        align-self: stretch;
      }
      .plot svg {
        position: absolute;
        inset: 0;
        display: block;
        animation: silk-speedtest-in 300ms var(--silk-ease-out);
      }
      .line {
        fill: none;
        stroke: var(--silk-accent);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
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
        animation: silk-speedtest-flash 400ms var(--silk-ease-out);
      }
      .unavailable .spark {
        opacity: 0.45;
      }
      @keyframes silk-speedtest-flash {
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
      @keyframes silk-speedtest-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes silk-speedtest-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],p([y({attribute:!1})],Ct.prototype,"hass",2),p([f()],Ct.prototype,"_config",2),p([f()],Ct.prototype,"_width",2),p([f()],Ct.prototype,"_height",2),p([f()],Ct.prototype,"_rev",2),p([f()],Ct.prototype,"_optimisticRun",2),Ct=p([x("silk-speedtest-card")],Ct);var Yl={type:"silk-car-card",name:"Silk Car",description:"Fuel, range, and whether it's locked."},Vs="mdi:car",Rg=15,Og=2e3,Kl="km",Xl="silk-car-card-editor";C(Xl,[{name:"name",required:!0,selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"fuel",selector:{entity:{domain:["sensor"]}}},{name:"range",selector:{entity:{domain:["sensor"]}}},{name:"odometer",selector:{entity:{domain:["sensor"]}}}]},{name:"lock",selector:{entity:{domain:["lock"]}}},{name:"location",selector:{entity:{domain:["device_tracker","person"]}}}],{name:"Name",icon:"Icon",fuel:"Fuel / battery sensor",range:"Range sensor",odometer:"Odometer sensor",lock:"Lock",location:"Location tracker"},{icon:Vs});function Hg(a){return a==="locked"?"good":a==="locking"||a==="unlocking"?"pending":"bad"}var oe=class extends w{constructor(){super(...arguments);this._lockOptimistic=null;this._lockBase=""}static getStubConfig(t){let e=Object.keys(t.states),i=r=>Number.isFinite(Number(t.states[r].state)),n=e.find(r=>r.startsWith("sensor.")&&/fuel|battery/i.test(r)&&i(r));return{type:"custom:silk-car-card",name:"Car",icon:Vs,fuel:n,lock:e.find(r=>r.startsWith("lock.")),location:e.find(r=>r.startsWith("device_tracker."))}}static async getConfigElement(){return document.createElement(Xl)}setConfig(t){if(!t.name)throw new Error("silk-car-card: `name` is required (e.g. name: Kona)");this._config=t,this._brokenImage=void 0,this._clearLockOptimistic()}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._lockTimer),this._lockTimer=void 0}willUpdate(t){if(!t.has("hass")||this._lockOptimistic===null)return;let e=this._config?.lock;if(!e)return;let i=this.hass?.states[e];i&&i.last_updated!==this._lockBase&&this._clearLockOptimistic()}_clearLockOptimistic(){window.clearTimeout(this._lockTimer),this._lockTimer=void 0,this._lockOptimistic=null}_tracked(){let t=this._config;return t?[t.fuel,t.location,t.range,t.odometer,t.charging,t.lock].filter(e=>typeof e=="string"&&e!==""):[]}_fuelPct(t){if(!t||b(t)||String(t.attributes.unit_of_measurement??"")!=="%")return null;let e=Number(t.state);return Number.isFinite(e)?R(e,0,100):null}_reading(t,e){let i=this.hass;if(!t||!i)return null;let n=i.states[t];if(!n||b(n)||n.state==="")return null;let r=Number(n.state);if(!Number.isFinite(r))return null;let o=String(n.attributes.unit_of_measurement??e??"");if(o==="%")return`${Math.round(r)}%`;let c=U(i,t,r);return o?`${c} ${o}`:c}_odometer(t,e){if(!e)return null;let i=t.states[e];if(!i||b(i)||i.state==="")return null;let n=Number(i.state);return Number.isFinite(n)?{text:U(t,e,n),unit:String(i.attributes.unit_of_measurement??Kl)}:null}_placeLabel(t,e){if(t.formatEntityState)return I(t,e);switch(e.state){case"home":return"Home";case"not_home":return"Away";default:return e.state.replace(/_/g," ")}}_lockLabel(t,e){if(t.formatEntityState)return I(t,e);switch(e.state){case"locked":return"Locked";case"unlocked":return"Unlocked";default:return e.state.replace(/_/g," ")}}_onCardClick(){let t=this._tracked()[0];t&&A(this,t)}_onImageError(){this._config?.image&&(this._brokenImage=this._config.image)}_onLockClick(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e?.lock||!i)return;let n=i.states[e.lock];if(!n||b(n))return;let r=n.state==="locked";r&&!window.confirm(`Unlock ${e.name}?`)||(E(this,r?"warning":"success"),this._lockOptimistic=r?"unlocking":"locking",this._lockBase=n.last_updated,window.clearTimeout(this._lockTimer),this._lockTimer=window.setTimeout(()=>this._clearLockOptimistic(),Og),G(i,e.lock))}_onChipMoreInfo(t,e){t.stopPropagation(),A(this,e)}_renderLockChip(t,e){if(!e)return l`<span class="chip static">
        <ha-icon icon="mdi:lock"></ha-icon>
        <span class="ctext">—</span>
      </span>`;let i=b(e),n=this._lockOptimistic===null||i?e:{...e,state:this._lockOptimistic},r=Hg(n.state),o=i?"\u2014":this._lockLabel(t,n);return l`
      <button
        class="chip tap ${i?"":r}"
        ?disabled=${i}
        aria-label=${n.state==="locked"?`Unlock ${this._config?.name??"car"}`:`Lock ${this._config?.name??"car"}`}
        @click=${this._onLockClick}
      >
        <ha-icon
          icon=${n.state==="locked"?"mdi:lock":"mdi:lock-open-variant-outline"}
        ></ha-icon>
        <span class="ctext">${o}</span>
      </button>
    `}_renderLocationChip(t,e){let i=this._config.location,n=b(e),r=!e||n?"\u2014":this._placeLabel(t,e);return l`
      <button
        class="chip tap"
        aria-label=${`Location: ${r}`}
        @click=${o=>this._onChipMoreInfo(o,i)}
      >
        <ha-icon icon="mdi:map-marker"></ha-icon>
        <span class="ctext">${r}</span>
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=t.fuel?e.states[t.fuel]:void 0,n=t.lock?e.states[t.lock]:void 0,r=t.location?e.states[t.location]:void 0,o=t.charging?e.states[t.charging]:void 0,c=this._tracked(),d=c.length>0&&c.every(L=>b(e.states[L])),u=S(i,t.color),g=!!o&&!b(o)&&N(o),h=this._fuelPct(i),v=this._reading(t.fuel),_=this._reading(t.range,Kl),$=this._odometer(e,t.odometer),M=[];for(let L of[v,_])L!==null&&(M.length&&M.push(l`<span class="sep">·</span>`),M.push(l`<span>${L}</span>`));let P=t.image&&t.image!==this._brokenImage?t.image:void 0;return l`
      <ha-card
        class="control ${d?"unavailable":""}"
        style="--silk-accent:${u}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${P?l`<div class="thumb">
                <img src=${P} alt=${t.name} loading="lazy" @error=${this._onImageError} />
              </div>`:l`<div class="icon ${g?"on":""}">
                <ha-icon .icon=${t.icon??Vs}></ha-icon>
              </div>`}
          <div class="info">
            <div class="name">${t.name}</div>
            ${M.length?l`<div class="state">${M}</div>`:m}
          </div>
          ${$?l`<div class="trailing">
                <span class="odo"
                  >${$.text}${$.unit?l`<span class="ounit">${$.unit}</span>`:m}</span
                >
              </div>`:m}
        </div>
        ${t.lock||t.location||g?l`
              <div class="chips">
                ${t.lock?this._renderLockChip(e,n):m}
                ${t.location?this._renderLocationChip(e,r):m}
                ${g?l`<span class="chip static active">
                      <ha-icon icon="mdi:flash"></ha-icon>
                      <span class="ctext">Charging</span>
                    </span>`:m}
              </div>
            `:m}
        ${h===null?m:l`
              <div class="track" aria-hidden="true">
                <div
                  class="fill ${h<Rg?"low":""}"
                  style="width:${h.toFixed(1)}%"
                ></div>
              </div>
            `}
      </ha-card>
    `}};oe.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        /* Extra bottom padding keeps the chips clear of the fuel bar. */
        padding: 12px 12px 16px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* No lone icon action here, so the icon presses with the card, not alone. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .thumb {
        flex: none;
        width: 56px;
        height: 56px;
        border-radius: 14px;
        overflow: hidden;
        display: grid;
        place-items: center;
        position: relative;
        z-index: 1;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .unavailable .thumb {
        opacity: 0.45;
      }
      .odo {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .ounit {
        margin-left: 3px;
        font-size: 11px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .chips {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        text-transform: capitalize;
      }
      .chip ha-icon {
        flex: none;
        --mdc-icon-size: 13px;
        pointer-events: none;
      }
      .ctext {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Informational chips are not controls: no pointer, no hover lift. */
      .chip.static {
        cursor: default;
      }
      .chip.static:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .chip.static.active:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      /* Invisible halo lifts the tap target without widening the chip row. */
      .chip.tap {
        position: relative;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      .chip.tap::after {
        content: '';
        position: absolute;
        inset: -8px -2px;
      }
      .chip.tap:active:not(:disabled) {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .chip:disabled {
        cursor: default;
        opacity: 0.6;
      }
      .chip:disabled:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .chip:disabled::after {
        display: none;
      }
      .chip:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      /* Locked vs unlocked is a real security state — status colors earn it. */
      .chip.good {
        color: var(--success-color, #43a047);
        background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      }
      .chip.good:hover {
        background: color-mix(in srgb, var(--success-color, #43a047) 22%, transparent);
      }
      .chip.bad {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      }
      .chip.bad:hover {
        background: color-mix(in srgb, var(--error-color, #db4437) 22%, transparent);
      }
      .chip.pending {
        color: var(--secondary-text-color);
      }
      /* Fuel bar riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 6px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 0;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.low {
        background: var(--error-color, #db4437);
      }
      .unavailable .track {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],oe.prototype,"hass",2),p([f()],oe.prototype,"_config",2),p([f()],oe.prototype,"_lockOptimistic",2),p([f()],oe.prototype,"_brokenImage",2),oe=p([x("silk-car-card")],oe);var Ql={type:"silk-mower-card",name:"Silk Mower",description:"Mow, pause, dock \u2014 with battery in sight."},In=1,Fn=2,Ng=4,qs="mowing",Zl="returning",Lg="paused",Ig="error",Fg=2e3,Dg=20,zg="var(--state-lawn_mower-mowing-color, var(--state-vacuum-active-color, #35b5b1))",Jl="silk-mower-card-editor";C(Jl,[{name:"entity",required:!0,selector:{entity:{domain:["lawn_mower"]}}},{name:"battery",selector:{entity:{domain:["sensor"],device_class:"battery"}}},{name:"name",selector:{text:{}}}],{entity:"Entity",battery:"Battery sensor",name:"Name"});var qe=class extends w{constructor(){super(...arguments);this._optimisticState=null}static getStubConfig(t){return{type:"custom:silk-mower-card",entity:Object.keys(t.states).find(i=>i.startsWith("lawn_mower."))}}static async getConfigElement(){return document.createElement(Jl)}setConfig(t){if(!t.entity||O(t.entity)!=="lawn_mower")throw new Error("silk-mower-card: define a lawn_mower `entity` (e.g. lawn_mower.automower)");this._config=t,this._clearOptimistic(),this._lastUpdated=void 0}getCardSize(){return 1}getGridOptions(){return{columns:6,rows:1,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0}willUpdate(t){if(!t.has("hass")||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;if(e===void 0||e===this._lastUpdated)return;let i=this._lastUpdated===void 0;this._lastUpdated=e,!i&&this._expiryTimer!==void 0&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._expiryTimer),this._expiryTimer=void 0,this._optimisticState=null}_armExpiry(){window.clearTimeout(this._expiryTimer),this._expiryTimer=window.setTimeout(()=>{this._expiryTimer=void 0,this._optimisticState=null},Fg)}_battery(){let t=this._config?.battery,e=this.hass;if(!t||!e)return null;let i=e.states[t];if(!i||b(i)||i.state==="")return null;let n=Number(i.state);if(!Number.isFinite(n))return null;let r=R(n,0,100);return{text:`${Math.round(r)}%`,low:r<Dg}}_onCardClick(){this._config&&A(this,this._config.entity)}_onIconClick(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];e!==void 0&&!b(e)&&(D(e,In)||D(e,Fn))?this._startPause():A(this,this._config.entity)}_onStartPauseClick(t){t.stopPropagation(),this._startPause()}_startPause(){if(!this.hass||!this._config)return;let t=this.hass.states[this._config.entity];if(!t||b(t))return;let e=(this._optimisticState??t.state)===qs;D(t,e?Fn:In)&&(E(this),this._optimisticState=e?Lg:qs,this._armExpiry(),this.hass.callService("lawn_mower",e?"pause":"start_mowing",{entity_id:this._config.entity}))}_onDock(t){if(t.stopPropagation(),!this.hass||!this._config)return;let e=this.hass.states[this._config.entity];!e||b(e)||(E(this),this._optimisticState=Zl,this._armExpiry(),this.hass.callService("lawn_mower","dock",{entity_id:this._config.entity}))}render(){if(!this.hass||!this._config)return m;let t=this.hass.states[this._config.entity];if(!t)return l`<ha-card>
        <div class="warning">Entity not found: ${this._config.entity}</div>
      </ha-card>`;let e=b(t),i=this._optimisticState===null||e?t:{...t,state:this._optimisticState},n=i.state===qs,r=n||i.state===Zl,o=!e&&i.state===Ig,c=S(t,this._config.color??zg),d=this._config.name??t.attributes.friendly_name??t.entity_id,u=this._battery(),g=D(t,In)||D(t,Fn),h=!D(t,n?Fn:In),v=n?`Pause ${d}`:`Start mowing ${d}`;return l`
      <ha-card
        class="control ${e?"unavailable":""}"
        style="--silk-accent:${c}"
        @click=${this._onCardClick}
      >
        <button
          class="icon ${r?"on":""} ${o?"fault":""}"
          .disabled=${e}
          aria-label=${g?v:`Show details for ${d}`}
          @click=${this._onIconClick}
        >
          ${this._config.icon?l`<ha-icon .icon=${this._config.icon}></ha-icon>`:l`<ha-state-icon .hass=${this.hass} .stateObj=${i}></ha-state-icon>`}
        </button>
        <div class="info">
          <div class="name">${d}</div>
          <div class="state">
            <span class=${o?"fault":""}>${I(this.hass,i)}</span
            >${u?l`<span class="sep">·</span
                  ><span class="batt ${u.low?"low":""}">${u.text}</span>`:m}
          </div>
        </div>
        <div class="trailing">
          ${g?l`
                <button
                  class="ctl"
                  ?disabled=${e||h}
                  aria-label=${v}
                  @click=${this._onStartPauseClick}
                >
                  <ha-icon icon=${n?"mdi:pause":"mdi:play"}></ha-icon>
                </button>
              `:m}
          ${D(t,Ng)?l`
                <button
                  class="ctl"
                  ?disabled=${e}
                  aria-label=${`Send ${d} to the dock`}
                  @click=${this._onDock}
                >
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>
              `:m}
        </div>
      </ha-card>
    `}};qe.styles=[T,k`
      /* A faulted mower is the one case where status color beats the accent —
         it is the answer to the only question that matters at that moment. */
      .icon.fault {
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent);
      }
      .fault {
        color: var(--error-color, #db4437);
      }
      .batt.low {
        color: var(--error-color, #db4437);
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
      .ctl:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .icon:disabled {
        cursor: default;
      }
    `],p([y({attribute:!1})],qe.prototype,"hass",2),p([f()],qe.prototype,"_config",2),p([f()],qe.prototype,"_optimisticState",2),qe=p([x("silk-mower-card")],qe);var td={type:"silk-irrigation-card",name:"Silk Irrigation",description:"Every zone, one row, one tap."},Ug="mdi:water",jg="Irrigation",Vg=2e3,qg=1e3,ed="silk-irrigation-card-editor";C(ed,[{name:"name",selector:{text:{}}}],{name:"Name"});function Gg(a){let s=Math.max(0,Math.ceil(a)),t=Math.floor(s/3600),e=Math.floor(s%3600/60),i=n=>String(n).padStart(2,"0");return t>0?`${t}:${i(e)}:${i(s%60)}`:`${e}:${i(s%60)}`}function Wg(a){return a==="valve"?{domain:"valve",service:"close_valve"}:a==="cover"?{domain:"cover",service:"close_cover"}:{domain:a,service:"turn_off"}}var ae=class extends w{constructor(){super(...arguments);this._now=Date.now();this._optimistic={};this._optimisticBase={};this._optimisticTimers={}}static getStubConfig(t){let e=r=>/sprinkler|irrigation|valve|water/i.test(`${r} ${String(t.states[r].attributes.friendly_name??"")}`),i=Object.keys(t.states);return{type:"custom:silk-irrigation-card",zones:(i.filter(r=>r.startsWith("valve.")).length?i.filter(r=>r.startsWith("valve.")):i.filter(r=>r.startsWith("switch.")&&e(r))).slice(0,4).map(r=>({entity:r,duration:10}))}}static async getConfigElement(){return document.createElement(ed)}setConfig(t){if(!Array.isArray(t.zones)||t.zones.length===0)throw new Error("silk-irrigation-card: `zones` is required \u2014 a list of {entity, name?, duration?}");for(let e of t.zones){if(typeof e?.entity!="string"||!e.entity.includes("."))throw new Error("silk-irrigation-card: every zone needs an `entity`");if(e.duration!==void 0&&!(Number(e.duration)>0))throw new Error(`silk-irrigation-card: \`duration\` for ${e.entity} must be a positive number of minutes`)}this._config=t,this._clearAllOptimistic()}getCardSize(){return Math.max(3,1+Math.ceil((this._config?.zones.length??3)*.8))}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._now=Date.now()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tick),this._tick=void 0;for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={}}willUpdate(t){if(!(!t.has("hass")||!this.hass)){this._now=Date.now();for(let e of Object.keys(this._optimistic)){let i=this.hass.states[e];i&&i.last_updated!==this._optimisticBase[e]&&this._clearOptimistic(e)}}}updated(){let t=this.isConnected&&this._config!==void 0&&this._rows().some(e=>e.remainingS!==null&&e.remainingS>0);t&&this._tick===void 0?this._tick=window.setInterval(()=>{this._now=Date.now()},qg):!t&&this._tick!==void 0&&(window.clearInterval(this._tick),this._tick=void 0)}_clearOptimistic(t){if(window.clearTimeout(this._optimisticTimers[t]),delete this._optimisticTimers[t],delete this._optimisticBase[t],t in this._optimistic){let e={...this._optimistic};delete e[t],this._optimistic=e}}_clearAllOptimistic(){for(let t of Object.keys(this._optimisticTimers))window.clearTimeout(this._optimisticTimers[t]);this._optimisticTimers={},this._optimisticBase={},this._optimistic={}}_setOptimistic(t,e){let i=t.entity_id;this._optimistic={...this._optimistic,[i]:{on:e,at:Date.now()}},this._optimisticBase[i]=t.last_updated,window.clearTimeout(this._optimisticTimers[i]),this._optimisticTimers[i]=window.setTimeout(()=>this._clearOptimistic(i),Vg)}_rows(){let t=this.hass;return(this._config?.zones??[]).map(i=>{let n=t?.states[i.entity],r=this._optimistic[i.entity],o=r?r.on:N(n),c=Number(i.duration??0)*60,d=r?.on?r.at:Date.parse(n?.last_changed??""),u=null,g=null;if(o&&c>0&&Number.isFinite(d)){let _=R((this._now-d)/1e3,0,c);u=_/c,g=c-_}let h=n?.attributes.current_position,v=O(i.entity)==="valve"&&typeof h=="number"&&Number.isFinite(h)?R(Math.round(h),0,100):null;return{zone:i,stateObj:n,name:i.name??n?.attributes.friendly_name??i.entity,unavailable:b(n),running:o,progress:u,remainingS:g,position:v}})}_onZoneClick(t,e){t.stopPropagation(),A(this,e)}_onToggle(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let n=i.states[e];!n||b(n)||(E(this),this._setOptimistic(n,!N(n)),G(i,e))}_onAllOff(t){t.stopPropagation();let e=this.hass,i=this._config;if(!e||!i)return;E(this,"medium");let n=new Map;for(let r of i.zones){let o=e.states[r.entity];if(!o||b(o))continue;this._setOptimistic(o,!1);let c=Wg(O(r.entity)),d=`${c.domain}.${c.service}`,u=n.get(d);u?u.ids.push(r.entity):n.set(d,{...c,ids:[r.entity]})}for(let r of n.values())e.callService(r.domain,r.service,{entity_id:r.ids})}_renderZone(t){let e=t.zone.entity,i=t.progress===null?0:t.progress*100,n=t.running?`Turn off ${t.name}`:`Turn on ${t.name}`;return l`
      <div class="zone">
        <div class="line ${t.unavailable?"unavailable":""}">
          <button class="row" title=${t.name} @click=${r=>this._onZoneClick(r,e)}>
            <span class="zname">${t.name}</span>
            ${t.position!==null?l`<span class="sep">·</span><span class="pos">${t.position}%</span>`:m}
          </button>
          ${t.remainingS!==null?l`<span class="left">${Gg(t.remainingS)} left</span>`:m}
          <button
            class="sw ${t.running?"on":""}"
            role="switch"
            aria-checked=${t.running?"true":"false"}
            aria-label=${n}
            .disabled=${t.unavailable}
            @click=${r=>this._onToggle(r,e)}
          >
            <span class="thumb"></span>
          </button>
        </div>
        <div class="track ${t.progress===null?"hidden":""}" aria-hidden="true">
          <div
            class="bar ${t.progress===null?"snap":""}"
            style="width:${i.toFixed(2)}%"
          ></div>
        </div>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._rows(),n=i.filter(c=>c.running).length,r=S(i.find(c=>c.stateObj)?.stateObj,t.color),o=t.name??jg;return l`
      <ha-card class="control" style="--silk-accent:${r}">
        <div class="header">
          <ha-icon class="hicon" .icon=${t.icon??Ug}></ha-icon>
          <div class="hname">${o}</div>
          ${n>0?l`<button class="alloff" @click=${this._onAllOff}>All off</button>`:m}
          <span class="count ${n>0?"on":""}"
            >${n>0?`${n} running`:"Idle"}</span
          >
        </div>
        <div class="zones">${i.map(c=>this._renderZone(c))}</div>
      </ha-card>
    `}};ae.styles=[T,k`
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
      .alloff {
        position: relative;
        flex: none;
        margin: 0;
        padding: 4px 6px;
        border: none;
        border-radius: 8px;
        background: none;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        color: var(--secondary-text-color);
        cursor: pointer;
        outline: none;
        transition:
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the hit area past 36px without growing the label. */
      .alloff::after {
        content: '';
        position: absolute;
        inset: -9px -6px;
      }
      .alloff:hover {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .alloff:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 1px;
      }
      .count {
        flex: none;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 999px;
        white-space: nowrap;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        font-variant-numeric: tabular-nums;
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .count.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .zones {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 0 -6px;
      }
      .zone {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 0 6px;
        border-radius: 10px;
        transition: background 150ms ease-out;
      }
      .line:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .line.unavailable {
        opacity: 0.45;
      }
      .row {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        min-height: 34px;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
      }
      .row:focus-visible {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
        border-radius: 8px;
      }
      .zname {
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sep {
        flex: none;
        opacity: 0.5;
        margin: 0 3px;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .pos {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .left {
        flex: none;
        font-size: 11px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      /* Compact 40x22 switch — the row's only control. */
      .sw {
        flex: none;
        position: relative;
        width: 40px;
        height: 22px;
        border: none;
        border-radius: 999px;
        padding: 2px;
        margin: 0;
        display: block;
        cursor: pointer;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.15);
        transition: background 200ms ease;
      }
      /* Invisible halo lifts the touch target to 40px without growing the track. */
      .sw::after {
        content: '';
        position: absolute;
        inset: -9px;
        border-radius: 999px;
      }
      .sw.on {
        background: var(--silk-accent);
      }
      .sw:disabled {
        cursor: default;
      }
      .sw:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .thumb {
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--card-background-color, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transform: translateX(0);
        transition: transform 200ms var(--silk-ease-out);
        will-change: transform;
      }
      .sw.on .thumb {
        transform: translateX(18px);
      }
      /* 3px run bar under the row it belongs to. */
      .track {
        height: 3px;
        margin: 0 6px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        opacity: 1;
        transition: opacity 200ms ease;
      }
      .track.hidden {
        opacity: 0;
      }
      .bar {
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        /* 1s linear matches the tick cadence, so the fill glides continuously. */
        transition: width 1000ms linear;
      }
      .bar.snap {
        transition: none;
      }
    `],p([y({attribute:!1})],ae.prototype,"hass",2),p([f()],ae.prototype,"_config",2),p([f()],ae.prototype,"_now",2),p([f()],ae.prototype,"_optimistic",2),ae=p([x("silk-irrigation-card")],ae);var sd={type:"silk-plant-card",name:"Silk Plant",description:"Moisture, light, and a plant that tells you when it's thirsty."},Gs="mdi:flower",Bg=20,Kg=60,Yg=1500,Xg=40,id=32,Zg=104,Qg=2e3,Jg=20,tb=50,eb=["moisture","light","temperature","conductivity","battery"],nd={moisture:"Moisture",light:"Light",temperature:"Temp",conductivity:"EC",battery:"Battery"},Ki={thirsty:{key:"thirsty",label:"Thirsty",color:"var(--error-color, #db4437)"},wet:{key:"wet",label:"Too wet",color:"var(--warning-color, #ffa600)"},light:{key:"light",label:"Needs light",color:"var(--warning-color, #ffa600)"},healthy:{key:"healthy",label:"Healthy",color:"var(--success-color, #43a047)"},none:{key:"none",label:"No data",color:"var(--secondary-text-color)"}},rd="silk-plant-card-editor";C(rd,[{name:"name",required:!0,selector:{text:{}}},{name:"icon",selector:{icon:{}}},{name:"",type:"grid",schema:[{name:"moisture",selector:{entity:{domain:["sensor","number"]}}},{name:"light",selector:{entity:{domain:["sensor"]}}},{name:"temperature",selector:{entity:{domain:["sensor"]}}},{name:"conductivity",selector:{entity:{domain:["sensor"]}}}]}],{name:"Name",icon:"Icon",moisture:"Moisture sensor",light:"Light sensor",temperature:"Temperature sensor",conductivity:"Conductivity sensor"},{icon:Gs});function ib(a){return typeof a!="string"||!a?"":a==="\xB0C"||a==="\xB0F"?"\xB0":a}var Ge=class extends w{constructor(){super(...arguments);this._imageBroken=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(r=>r.startsWith("sensor.")),i=r=>e.find(o=>r.test(`${o} ${String(t.states[o].attributes.friendly_name??"")}`)),n=r=>e.find(o=>t.states[o].attributes.device_class===r);return{type:"custom:silk-plant-card",name:"Plant",icon:Gs,moisture:i(/moisture/i),light:i(/illuminance|light/i)??n("illuminance"),temperature:n("temperature"),conductivity:i(/conductivity/i)}}static async getConfigElement(){return document.createElement(rd)}setConfig(t){if(!t.name)throw new Error("silk-plant-card: `name` is required");if(t.thresholds!==void 0){if(typeof t.thresholds!="object"||Array.isArray(t.thresholds))throw new Error("silk-plant-card: `thresholds` must be a map of {moisture_min, moisture_max, light_min}");for(let e of["moisture_min","moisture_max","light_min"]){let i=t.thresholds[e];if(i!==void 0&&!Number.isFinite(Number(i)))throw new Error(`silk-plant-card: threshold \`${e}\` must be a number`)}}this._config=t,this._imageBroken=!1}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:2}}_thresholds(){let t=this._config?.thresholds??{},e=(i,n)=>Number.isFinite(Number(i))?Number(i):n;return{moistureMin:e(t.moisture_min,Bg),moistureMax:e(t.moisture_max,Kg),lightMin:e(t.light_min,Yg)}}_metrics(){let t=this._config;if(!t)return[];let e=[];for(let i of eb){let n=t[i];typeof n=="string"&&n&&e.push({key:i,entityId:n})}return e}_stateObj(t){return t?this.hass?.states[t]:void 0}_num(t){let e=this._stateObj(t);if(!e||b(e)||e.state==="")return null;let i=Number(e.state);return Number.isFinite(i)?i:null}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_compact(t,e){if(Math.abs(e)<1e3)return U(this.hass,t,e);let i=e/1e3;return`${new Intl.NumberFormat(this._locale(),{maximumFractionDigits:Math.abs(i)>=10?0:1}).format(i)}k`}_verdict(){let{moistureMin:t,moistureMax:e,lightMin:i}=this._thresholds(),n=this._num(this._config?.moisture),r=this._num(this._config?.light);return n!==null&&n<t?Ki.thirsty:n!==null&&n>e?Ki.wet:r!==null&&r<i?Ki.light:this._metrics().some(c=>this._num(c.entityId)!==null)?Ki.healthy:Ki.none}_band(t,e,i){let{moistureMin:n,moistureMax:r,lightMin:o}=this._thresholds();switch(t){case"moisture":return{fill:R(e/100,0,1),band:e<n?"crit":e>r?"warn":"good"};case"light":return{fill:R(e/(Math.max(o,1)*2),0,1),band:e<o?"warn":"good"};case"battery":return{fill:R(e/100,0,1),band:e<Jg?"crit":e<tb?"warn":"good"};case"temperature":{let d=String(i.attributes.unit_of_measurement??"").includes("F")?(e-id)/(Zg-id):e/Xg;return{fill:R(d,0,1),band:"neutral"}}default:return{fill:R(e/Qg,0,1),band:"neutral"}}}_readout(t,e){let i=this._stateObj(e),n=String(i?.attributes.friendly_name??e),r=this._num(e);if(!i||r===null)return{key:t,entityId:e,label:nd[t],value:"\u2014",fill:null,band:"neutral",title:n};let{fill:o,band:c}=this._band(t,r,i),d=ib(i.attributes.unit_of_measurement),u=t==="moisture"||t==="battery"?String(Math.round(r)):t==="light"||t==="conductivity"?this._compact(e,r):U(this.hass,e,r),g=nd[t],h=u;return d==="%"||d==="\xB0"?h+=d:d&&d.length<=2?h+=` ${d}`:d&&(g=`${g} ${d}`),{key:t,entityId:e,label:g,value:h,fill:o,band:c,title:`${n}: ${h}`}}_onCardClick(){let t=this._config?.moisture??this._metrics()[0]?.entityId;t&&A(this,t)}_renderReadout(t){return l`
      <div class="metric" title=${t.title}>
        <div class="mlabel">${t.label}</div>
        <div class="mvalue">${t.value}</div>
        <div class="mbar">
          ${t.fill===null?m:l`<span
                class="mfill ${t.band}"
                style="width:${(t.fill*100).toFixed(1)}%"
              ></span>`}
        </div>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._metrics(),n=this._verdict(),r=S(this._stateObj(t.moisture??i[0]?.entityId),t.color),o=t.image&&!this._imageBroken?t.image:void 0,c=n.key==="none";return l`
      <ha-card
        class="control ${c?"unavailable":""}"
        style="--silk-accent:${r};--silk-verdict:${n.color}"
        @click=${this._onCardClick}
      >
        <div class="top">
          ${o?l`<img
                class="thumb"
                src=${o}
                alt=${t.name}
                loading="lazy"
                @error=${()=>{this._imageBroken=!0}}
              />`:l`<div class="icon">
                <ha-icon .icon=${t.icon??Gs}></ha-icon>
              </div>`}
          <div class="info">
            <div class="name">${t.name}</div>
            <div class="state verdict">
              <span class="dot"></span><span class="word">${n.label}</span>
            </div>
          </div>
        </div>
        ${i.length?l`<div class="metrics">
              ${i.map(d=>this._renderReadout(this._readout(d.key,d.entityId)))}
            </div>`:l`<div class="empty">No sensors configured</div>`}
      </ha-card>
    `}};Ge.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px;
      }
      .top {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .thumb,
      .icon {
        flex: none;
        width: 56px;
        height: 56px;
        border-radius: 14px;
      }
      .thumb {
        display: block;
        object-fit: cover;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        /* Hard 2px ring, zero blur — a border in the verdict color, not a glow. */
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-verdict) 55%, transparent);
        transition: box-shadow 200ms ease;
      }
      /* The thumb reads the verdict as surface: tinted fill, matching glyph. */
      .icon {
        cursor: pointer;
        color: var(--silk-verdict);
        background: color-mix(in srgb, var(--silk-verdict) 16%, transparent);
      }
      .icon:active {
        transform: none;
      }
      .icon ha-icon {
        --mdc-icon-size: 26px;
      }
      .name {
        font-size: 15px;
        font-weight: 600;
      }
      .verdict {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--silk-verdict);
        transition: background 200ms ease;
      }
      .word {
        min-width: 0;
        font-weight: 500;
        color: var(--silk-verdict);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .metrics {
        flex: none;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        min-width: 0;
      }
      .metric {
        flex: 1 1 0;
        min-width: 0;
      }
      .mlabel {
        font-size: 10px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mvalue {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.25;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mbar {
        height: 4px;
        margin-top: 3px;
        border-radius: 2px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .mfill {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .mfill.crit {
        background: var(--error-color, #db4437);
      }
      .mfill.warn {
        background: var(--warning-color, #ffa600);
      }
      .mfill.good {
        background: var(--success-color, #43a047);
      }
      .empty {
        flex: none;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .thumb,
      .unavailable .metrics {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],Ge.prototype,"hass",2),p([f()],Ge.prototype,"_config",2),p([f()],Ge.prototype,"_imageBroken",2),Ge=p([x("silk-plant-card")],Ge);var od={type:"silk-forecast-card",name:"Silk Forecast",description:"Seven days, honestly ranged."},nb={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",exceptional:"mdi:alert-circle-outline",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},sb="mdi:weather-partly-cloudy",ad=5,cd=7,Dn=8;function Ws(a){let s=new Date(a);return new Date(s.getFullYear(),s.getMonth(),s.getDate()).getTime()}var ld="silk-forecast-card-editor";C(ld,[{name:"entity",required:!0,selector:{entity:{domain:["weather"]}}},{name:"name",selector:{text:{}}},{name:"days",selector:{number:{min:1,max:cd,mode:"box"}}}],{entity:"Entity",name:"Name",days:"Days to show"},{days:ad});var ce=class extends w{constructor(){super(...arguments);this._forecast=null;this._subFailed=!1}static getStubConfig(t){return{type:"custom:silk-forecast-card",entity:Object.keys(t.states).find(i=>i.startsWith("weather."))}}static async getConfigElement(){return document.createElement(ld)}setConfig(t){if(!t.entity||O(t.entity)!=="weather")throw new Error("silk-forecast-card: define a weather `entity` (e.g. weather.home)");if(t.days!==void 0&&!(Number(t.days)>0))throw new Error("silk-forecast-card: `days` must be a positive number");this._subEntity!==void 0&&this._subEntity!==t.entity&&(this._teardownSubscription(),this._forecast=null,this._subFailed=!1),this._config=t}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),this._subscribeForecast()}disconnectedCallback(){super.disconnectedCallback(),this._teardownSubscription()}updated(t){!t.has("hass")&&!t.has("_config")||this._subscribeForecast()}async _subscribeForecast(){let t=this._config,e=this.hass;if(!t||!e||!this.isConnected||this._subEntity===t.entity)return;this._teardownSubscription();let i=t.entity;this._subEntity=i;let n=e.connection;if(!n||typeof n.subscribeMessage!="function"){this._subFailed=!0;return}try{let r=n.subscribeMessage(o=>{this._subEntity===i&&(this._forecast=Array.isArray(o.forecast)?o.forecast:[])},{type:"weather/subscribe_forecast",forecast_type:"daily",entity_id:i});this._unsubPromise=r,await r}catch{this._subEntity===i&&(this._unsubPromise=void 0,this._subFailed=!0)}}_teardownSubscription(){let t=this._unsubPromise;this._unsubPromise=void 0,this._subEntity=void 0,t&&t.then(e=>e()).catch(()=>{})}_days(){return R(Math.round(this._config?.days??ad),1,cd)}_source(t){let e=this._forecast;return e===null&&this._subFailed&&(e=t.attributes.forecast),Array.isArray(e)?e:null}_rows(t){let e=this._source(t);if(!e)return null;let i=[];for(let c of e){if(!c||typeof c.datetime!="string")continue;let d=Date.parse(c.datetime);if(!Number.isFinite(d))continue;let u=Number(c.temperature),g=Number(c.templow),h=Number(c.precipitation_probability);i.push({dayStart:Ws(d),ts:d,icon:nb[c.condition??""]??sb,lo:Number.isFinite(g)?g:null,hi:Number.isFinite(u)?u:null,pop:Number.isFinite(h)&&h>0?R(Math.round(h),0,100):null})}let n=Ws(Date.now()),r=i.findIndex(c=>c.dayStart>=n);return(r>0?i.slice(r):i).slice(0,this._days())}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_onCardClick(){this._config&&A(this,this._config.entity)}_renderRows(t){let e=Ws(Date.now()),i=this._locale(),n=new Intl.DateTimeFormat(i,{weekday:"short"}),r=new Intl.DateTimeFormat(i,{weekday:"long",month:"short",day:"numeric"}),o=1/0,c=-1/0;for(let P of t)for(let L of[P.lo,P.hi])L!==null&&(L<o&&(o=L),L>c&&(c=L));let d=c-o,u=Number.isFinite(o)&&d>0,g=t.map(P=>P.lo!==null&&P.hi!==null?(P.lo+P.hi)/2:P.hi??P.lo),h=1/0,v=-1/0;for(let P of g)P!==null&&(P<h&&(h=P),P>v&&(v=P));let _=Number.isFinite(h)&&v>h,$=t.some(P=>P.pop!==null);return l`
      <div class="days" style="--silk-cols:${`34px 18px ${$?"32px ":""}28px minmax(24px, 1fr) 28px`}">
        ${t.map((P,L)=>{let H=P.dayStart===e,z=P.lo??P.hi,V=P.hi??P.lo,F=0,q=100;if(u&&z!==null&&V!==null){F=(Math.min(z,V)-o)/d*100;let Q=(Math.max(z,V)-o)/d*100;q=Q-F,q<Dn&&(q=Dn,F=R((F+Q)/2-Dn/2,0,100-Dn))}let B=g[L],X=_&&B!==null?(.5+.5*((B-h)/(v-h))).toFixed(2):"1",Z=P.lo!==null?`${Math.round(P.lo)}\xB0`:"\u2014",tt=P.hi!==null?`${Math.round(P.hi)}\xB0`:"\u2014";return l`
            <div class="row" title="${r.format(new Date(P.ts))} · ${Z} – ${tt}">
              <span class="day ${H?"today":""}"
                >${H?"Today":n.format(new Date(P.ts))}</span
              >
              <ha-icon .icon=${P.icon}></ha-icon>
              <!-- The column is reserved for the whole week or for none of it,
                   so the bars stay aligned; dry days hold it open empty. -->
              ${$?P.pop!==null?l`<span class="pop">${P.pop}%</span>`:l`<span></span>`:m}
              <span class="t lo">${Z}</span>
              <div class="track">
                ${z!==null&&V!==null?l`<div
                      class="fill"
                      style="left:${F.toFixed(2)}%;width:${q.toFixed(2)}%;opacity:${X}"
                    ></div>`:m}
              </div>
              <span class="t hi">${tt}</span>
            </div>
          `})}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=S(i),o=t.name??i.attributes.friendly_name??t.entity,c=Number(i.attributes.temperature),d=this._rows(i);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="name">${o}</div>
          <div class="now">${Number.isFinite(c)?`${Math.round(c)}\xB0`:"\u2014"}</div>
        </div>
        ${d&&d.length?this._renderRows(d):d?l`<div class="note">No daily forecast</div>`:m}
      </ha-card>
    `}};ce.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        padding: 12px 14px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .now {
        flex: none;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .days {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-auto-rows: minmax(20px, 1fr);
        gap: 2px;
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
      .row {
        display: grid;
        grid-template-columns: var(--silk-cols);
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .day {
        font-size: 11px;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .day.today {
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .row ha-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }
      .pop {
        justify-self: center;
        font-size: 10px;
        line-height: 1.4;
        padding: 1px 5px;
        border-radius: 999px;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .t {
        font-size: 11px;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .t.lo {
        text-align: right;
        color: var(--secondary-text-color);
      }
      .t.hi {
        text-align: left;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .track {
        position: relative;
        height: 6px;
        border-radius: 3px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 3px;
        background: var(--silk-accent);
      }
      .note {
        flex: 1;
        display: grid;
        place-items: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .days,
      .unavailable .note {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],ce.prototype,"hass",2),p([f()],ce.prototype,"_config",2),p([f()],ce.prototype,"_forecast",2),p([f()],ce.prototype,"_subFailed",2),ce=p([x("silk-forecast-card")],ce);var md={type:"silk-moon-card",name:"Silk Moon",description:"The phase, drawn correctly."},zn={new:"New moon",waxing_crescent:"Waxing crescent",first_quarter:"First quarter",waxing_gibbous:"Waxing gibbous",full:"Full moon",waning_gibbous:"Waning gibbous",last_quarter:"Last quarter",waning_crescent:"Waning crescent"},rb=[[.0254,"new"],[.2246,"waxing_crescent"],[.2754,"first_quarter"],[.4746,"waxing_gibbous"],[.5254,"full"],[.7246,"waning_gibbous"],[.7754,"last_quarter"],[.9746,"waning_crescent"],[1.0001,"new"]],ob=864e5,dd=29.530588853,ab=Date.UTC(2e3,0,6,18,14),cb=18e5,lb=96,db=48,pb=200,pd=100,Yi=50,Un=50,Be=46;function mb(a){let s=(a-ab)/ob/dd,t=s-Math.floor(s),e=rb.find(([i])=>t<i)?.[1]??"new";return{p:t,fraction:(1-Math.cos(2*Math.PI*t))/2,waxing:t<.5,key:e,daysToFull:(.5-t+1)%1*dd}}function Bs(a){return a.toLowerCase().trim().replace(/\s+/g,"_")}function ub(a){return a.startsWith("waxing")||a==="first_quarter"?!0:a.startsWith("waning")||a==="last_quarter"||a==="third_quarter"?!1:null}function hb(a){if(!a)return null;let s=a.attributes.illumination??a.attributes.moon_illumination;if(s==null||s==="")return null;let t=Number(s);return!Number.isFinite(t)||t<0?null:R(t>1?t/100:t,0,1)}function fb(a,s){let t=Math.abs(1-2*a)*Be,e=s?0:1,i=a<.5?e:1-e,n=Un-Be,r=Un+Be;return`M ${Yi} ${n} A ${Be} ${Be} 0 0 ${e} ${Yi} ${r} A ${t.toFixed(3)} ${Be} 0 0 ${i} ${Yi} ${n} Z`}var ud="silk-moon-card-editor";C(ud,[{name:"entity",selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}}],{entity:"Moon phase sensor (optional)",name:"Name"});var We=class extends w{constructor(){super(...arguments);this._now=Date.now()}static getStubConfig(t){return{type:"custom:silk-moon-card",entity:Object.keys(t.states).find(i=>i.startsWith("sensor.")&&i.includes("moon"))}}static async getConfigElement(){return document.createElement(ud)}setConfig(t){if(t.size!==void 0&&!(Number(t.size)>0))throw new Error("silk-moon-card: `size` must be a positive number");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:3,rows:2,min_columns:2,min_rows:2}}connectedCallback(){super.connectedCallback(),this._now=Date.now(),this._tickTimer=window.setInterval(()=>{this._now=Date.now()},cb)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tickTimer)}_phaseLabel(t,e){if(t&&!b(t)){if(this.hass?.formatEntityState)return I(this.hass,t);let i=Bs(t.state);if(i in zn)return zn[i];let n=t.state.replace(/_/g," ");return n.charAt(0).toUpperCase()+n.slice(1)}return zn[e.key]}_onCardClick(){let t=this._config?.entity;t&&A(this,t)}render(){let t=this._config;if(!t)return m;let e=this.hass,i=t.entity,n=i?e?.states[i]:void 0;if(i&&e&&!n)return l`<ha-card><div class="warning">Entity not found: ${i}</div></ha-card>`;let r=mb(this._now),o=i!==void 0&&b(n),c=n&&!b(n)?n:void 0,u=(c!==void 0&&Bs(c.state)in zn?hb(c):null)??r.fraction,g=(c?ub(Bs(c.state)):null)??r.waxing,h=S(n),v=R(Math.round(Number(t.size)||lb),db,pb),_=this._phaseLabel(n,r),$=Math.round(u*100),M=Math.round(r.daysToFull),P=i?null:r.key==="full"||M<1?"Full moon tonight":`Next full moon in ${M} day${M===1?"":"s"}`;return l`
      <ha-card
        class="${o?"unavailable":""} ${i?"":"static"}"
        style="--silk-accent:${h};--silk-moon-size:${v}px"
        @click=${this._onCardClick}
      >
        ${t.name?l`<div class="head">${t.name}</div>`:m}
        <div class="disc">
          <svg viewBox="0 0 ${pd} ${pd}" role="img" aria-label="${_}, ${$}% illuminated">
            <circle class="body" cx=${Yi} cy=${Un} r=${Be}></circle>
            <circle class="crater" cx="37" cy="36" r="9"></circle>
            <circle class="crater" cx="63" cy="59" r="6"></circle>
            <circle class="crater" cx="44" cy="70" r="4.5"></circle>
            <path class="shadow" d=${fb(u,g)}></path>
            <circle class="limb" cx=${Yi} cy=${Un} r=${Be}></circle>
          </svg>
        </div>
        <div class="phase" title=${_}>${_}</div>
        <div class="sub">${$}% illuminated</div>
        ${P?l`<div class="sub">${P}</div>`:m}
      </ha-card>
    `}};We.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 12px;
        text-align: center;
      }
      ha-card.static {
        cursor: default;
      }
      .head {
        flex: none;
        max-width: 100%;
        margin-bottom: 2px;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .disc {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        display: grid;
        place-items: center;
        margin-bottom: 4px;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: var(--silk-moon-size);
        max-height: var(--silk-moon-size);
      }
      /* The moon is a depiction, so it keeps its own soft grey-blue in both
         themes; the card's chroma budget stays with --silk-accent. */
      .body {
        fill: #dfe6f2;
      }
      .crater {
        fill: rgba(0, 0, 0, 0.055);
      }
      /* The unlit side is sky: it takes the card's own background. */
      .shadow {
        fill: var(--ha-card-background, var(--card-background-color, #fff));
      }
      .limb {
        fill: none;
        stroke: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.14);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .phase {
        flex: none;
        max-width: 100%;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        flex: none;
        max-width: 100%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .disc,
      .unavailable .head,
      .unavailable .phase,
      .unavailable .sub {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],We.prototype,"hass",2),p([f()],We.prototype,"_config",2),p([f()],We.prototype,"_now",2),We=p([x("silk-moon-card")],We);var fd={type:"silk-uv-card",name:"Silk UV",description:"Sun strength, with actual advice."},Nt=[{label:"Low",advice:"No protection needed",color:"#5ec78d",to:2.5},{label:"Moderate",advice:"Wear sunglasses",color:"#e6a23c",to:5.5},{label:"High",advice:"Sunscreen + hat",color:"#e8734f",to:7.5},{label:"Very high",advice:"Avoid midday sun",color:"#ef6c6c",to:10.5},{label:"Extreme",advice:"Stay indoors",color:"#a97ee8",to:13}],hd=Nt[Nt.length-1].to,gb=Nt.map((a,s)=>a.to-(s===0?0:Nt[s-1].to)),Ks=2,bb=Ks*(Nt.length-1);function vb(a){for(let s=0;s<Nt.length-1;s++)if(a<Nt[s].to)return s;return Nt.length-1}var gd="silk-uv-card-editor";C(gd,[{name:"entity",required:!0,selector:{entity:{domain:["sensor"]}}},{name:"name",selector:{text:{}}},{name:"protection",selector:{boolean:{}}}],{entity:"Entity",name:"Name",protection:"Show protection advice"},{protection:!0});var Ke=class extends w{constructor(){super(...arguments);this._drawn=!1}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("sensor."));return{type:"custom:silk-uv-card",entity:e.find(n=>/uv[_-]?index/i.test(n))??e.find(n=>/(^|[._])uv([._]|$)/i.test(n))??e.find(n=>String(t.states[n].attributes.unit_of_measurement??"").toLowerCase().includes("uv"))}}static async getConfigElement(){return document.createElement(gd)}setConfig(t){if(!t.entity)throw new Error("silk-uv-card: `entity` is required");this._config=t}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:1}}firstUpdated(){requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._drawn=!0})})}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_formatIndex(t){let e=this.hass?.entities?.[this._config.entity]?.display_precision;return new Intl.NumberFormat(this._locale(),e!==void 0?{minimumFractionDigits:e,maximumFractionDigits:e}:{maximumFractionDigits:1}).format(t)}_onCardClick(){this._config&&A(this,this._config.entity)}render(){let t=this._config;if(!t)return m;let e=this.hass,i=e?.states[t.entity];if(e&&!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=Number(i?.state),o=!n&&i?.state!==""&&Number.isFinite(r),c=o?Math.max(0,r):0,d=vb(c),u=Nt[d],g=o?u.color:"var(--secondary-text-color)",h=t.name??i?.attributes.friendly_name??t.entity,v=t.protection!==!1,_=this._drawn?R(c,0,hd)/hd:0,$=this._drawn?d*Ks:0,M=`translateX(calc((100% - ${bb}px) * ${_.toFixed(4)} + ${$}px))`;return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${g}"
        @click=${this._onCardClick}
      >
        <div class="head" title=${h}>${h}</div>
        <div class="hero">
          <span class="index">${o?this._formatIndex(r):"\u2014"}</span>
          <span class="band">${o?u.label:"\u2014"}</span>
        </div>
        <div class="scale">
          <div class="track" aria-hidden="true">
            ${Nt.map((P,L)=>l`
                <span
                  class="seg ${o&&L===d?"now":""}"
                  style="flex-grow:${gb[L]};background:${P.color}"
                ></span>
              `)}
          </div>
          ${o?l`<div class="rider" aria-hidden="true">
                <div class="carrier" style="transform:${M}"><span class="dot"></span></div>
              </div>`:m}
        </div>
        ${v?l`<div class="advice">${o?u.advice:"No reading"}</div>`:m}
      </ha-card>
    `}};Ke.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 6px;
        padding: 10px 14px;
      }
      .head {
        flex: none;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hero {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
      }
      .index {
        flex: none;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .band {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--silk-accent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .scale {
        position: relative;
        flex: none;
        height: 12px;
        margin: 2px 0;
      }
      .track {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        gap: ${Ks}px;
        height: 10px;
      }
      /* Only the live band carries full chroma; the rest stay recessive. */
      .seg {
        flex-basis: 0;
        flex-shrink: 1;
        min-width: 0;
        height: 100%;
        border-radius: 5px;
        opacity: 0.35;
        transition: opacity 200ms ease;
      }
      .seg.now {
        opacity: 1;
      }
      .rider {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      /* Full-width carrier: a percentage translate resolves against its own box,
         so this converts the value fraction into travel across the track. */
      .carrier {
        position: absolute;
        inset: 0;
        will-change: transform;
        transition: transform 450ms var(--silk-ease-out);
      }
      .dot {
        position: absolute;
        left: 0;
        top: 50%;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--silk-accent);
        /* Hard ring in the card surface, zero blur — a cutout, not a glow. */
        box-shadow: 0 0 0 2px var(--card-background-color, #fff);
        transform: translate(-50%, -50%);
        transition: background 200ms ease;
      }
      .advice {
        flex: none;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .head,
      .unavailable .hero,
      .unavailable .scale,
      .unavailable .advice {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],Ke.prototype,"hass",2),p([f()],Ke.prototype,"_config",2),p([f()],Ke.prototype,"_drawn",2),Ke=p([x("silk-uv-card")],Ke);var vd={type:"silk-openings-card",name:"Silk Openings",description:"Which doors and windows are open, right now."},_b={door:{open:"mdi:door-open",closed:"mdi:door"},window:{open:"mdi:window-open",closed:"mdi:window-closed"},garage:{open:"mdi:garage-open",closed:"mdi:garage"}},bd={door:"door",opening:"door",gate:"door",garage_door:"garage",garage:"garage",window:"window",shutter:"window",blind:"window",curtain:"window",shade:"window",awning:"window"},yb=new Set(["door","window","garage_door","opening"]),_d="Openings",yd=8,wd=30,wb=3e4;function xb(a){let s=Math.max(0,(Date.now()-a)/1e3);return s<60?"now":s<3600?`${Math.floor(s/60)}m`:s<86400?`${Math.floor(s/3600)}h`:`${Math.floor(s/86400)}d`}var xd="silk-openings-card-editor";C(xd,[{name:"name",selector:{text:{}}},{name:"show_closed",selector:{boolean:{}}},{name:"limit",selector:{number:{min:1,max:wd,mode:"box"}}}],{name:"Name",show_closed:"Show closed too",limit:"Rows"},{name:_d,show_closed:!1,limit:yd});var vi=class extends w{constructor(){super(...arguments);this._autoIds=null;this._autoCount=-1}static getStubConfig(){return{type:"custom:silk-openings-card"}}static async getConfigElement(){return document.createElement(xd)}setConfig(t){if(t.entities!==void 0){if(!Array.isArray(t.entities))throw new Error("silk-openings-card: `entities` must be a list of entity ids");for(let e of t.entities)if(typeof e!="string"||!e.includes("."))throw new Error(`silk-openings-card: \`${String(e)}\` is not an entity id`)}if(t.limit!==void 0&&!(Number(t.limit)>0))throw new Error("silk-openings-card: `limit` must be a positive number");this._config=t,this._autoIds=null,this._autoCount=-1}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:1}}connectedCallback(){super.connectedCallback(),this._clockTimer=window.setInterval(()=>this.requestUpdate(),wb)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._clockTimer),this._clockTimer=void 0}_entityIds(t){let e=this._config?.entities;if(e&&e.length>0)return e;let i=Object.keys(t.states);return(this._autoIds===null||i.length!==this._autoCount)&&(this._autoCount=i.length,this._autoIds=i.filter(n=>{if(!n.startsWith("binary_sensor."))return!1;let r=t.states[n].attributes.device_class;return typeof r=="string"&&yb.has(r)}).sort()),this._autoIds}_kindOf(t,e){let i=e?.attributes.device_class;return typeof i=="string"&&bd[i]?bd[i]:O(t)==="cover"?"window":"door"}_rows(t){let e=this._entityIds(t).filter(i=>t.states[i]!==void 0).map(i=>{let n=t.states[i],r=b(n),o=Date.parse(n.last_changed);return{entityId:i,name:n.attributes.friendly_name??i.split(".")[1]??i,kind:this._kindOf(i,n),open:!r&&N(n),dead:r,since:Number.isFinite(o)?o:null}});return e.sort((i,n)=>i.open!==n.open?i.open?-1:1:(n.since??0)-(i.since??0)||i.name.localeCompare(n.name)),e}_onRowClick(t,e){t.stopPropagation(),A(this,e)}_renderRow(t){let e=_b[t.kind][t.open?"open":"closed"],i=t.since!==null?xb(t.since):"\u2014";return l`
      <button
        class="row ${t.open?"open":""} ${t.dead?"dead":""}"
        aria-label=${`${t.name}: ${t.dead?"unavailable":t.open?"open":"closed"}`}
        @click=${n=>this._onRowClick(n,t.entityId)}
      >
        <ha-icon class="ricon" .icon=${e}></ha-icon>
        <span class="rname">${t.name}</span>
        <span class="when">${i}</span>
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._rows(e),n=i.filter(g=>g.open).length,r=Math.min(Math.round(Number(t.limit??yd)),wd),o=(t.show_closed?i:i.filter(g=>g.open)).slice(0,r),c=t.name??_d,d=S(void 0),u=i.length>0&&i.every(g=>g.dead);return l`
      <ha-card class="control ${u?"unavailable":""}" style="--silk-accent:${d}">
        <div class="header">
          <ha-icon class="hicon" icon="mdi:door"></ha-icon>
          <div class="hname" title=${c}>${c}</div>
          <div class="summary ${n>0?"some":"clear"}">
            <span class="sdot"></span>
            ${n>0?l`<span><span class="count">${n}</span> open</span>`:l`<span>All closed</span>`}
          </div>
        </div>
        <div class="rows">
          ${o.length===0?l`<div class="empty">
                ${i.length===0?"No openings found":"Nothing open"}
              </div>`:o.map(g=>this._renderRow(g))}
        </div>
      </ha-card>
    `}};vi.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        padding: 12px 14px;
        cursor: default;
      }
      .header {
        flex: none;
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
      .summary {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        line-height: 1;
        color: var(--secondary-text-color);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .sdot {
        flex: none;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        transition: background 200ms ease;
      }
      /* Status colors, used for a real status: shut vs. left open. */
      .summary.clear .sdot {
        background: var(--success-color, #57ad60);
      }
      .summary.some .sdot {
        background: var(--warning-color, #e6a23c);
      }
      .count {
        font-weight: 600;
        color: var(--silk-accent);
      }
      .rows {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0 -6px;
        overflow: hidden;
      }
      .row {
        flex: none;
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
        animation: silk-openings-in 250ms var(--silk-ease-out);
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .row:focus-visible {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .row.dead {
        opacity: 0.45;
      }
      .ricon {
        flex: none;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        opacity: 0.7;
        transition: color 200ms ease, opacity 200ms ease;
      }
      /* Open reads as the exception: accent icon, full-strength label. */
      .row.open .ricon {
        color: var(--silk-accent);
        opacity: 1;
      }
      .rname {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .row.open .rname {
        color: var(--primary-text-color);
        font-weight: 500;
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
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .header {
        opacity: 0.45;
      }
      @keyframes silk-openings-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],p([y({attribute:!1})],vi.prototype,"hass",2),p([f()],vi.prototype,"_config",2),vi=p([x("silk-openings-card")],vi);var Cd={type:"silk-security-card",name:"Silk Security",description:"One verdict for the whole house."},kb=1,$b=2,kd=[{key:"disarm",label:"Disarm",service:"alarm_disarm",activeState:"disarmed"},{key:"home",label:"Home",service:"alarm_arm_home",activeState:"armed_home",feature:kb},{key:"away",label:"Away",service:"alarm_arm_away",activeState:"armed_away",feature:$b}],Tb={triggered:"mdi:shield-alert",breach:"mdi:shield-alert-outline",motion:"mdi:motion-sensor",secure:"mdi:shield-check",unknown:"mdi:shield-off-outline"},$d=40,Td=8,Ed=18,Eb=6,Cb=2e3,Ad="silk-security-card-editor";C(Ad,[{name:"alarm",selector:{entity:{domain:["alarm_control_panel"]}}},{name:"name",selector:{text:{}}}],{alarm:"Alarm panel",name:"Name"},{name:"Security"});function Ys(a,s){if(a===void 0)return[];if(!Array.isArray(a)||a.some(t=>typeof t!="string"||t===""))throw new Error(`silk-security-card: \`${s}\` must be a list of entity ids`);return a}var le=class extends w{constructor(){super(...arguments);this._open=null;this._optimistic=null;this._lastOpen=null;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states),i=(n,r)=>e.filter(o=>o.startsWith(`${n}.`)&&r.includes(String(t.states[o].attributes.device_class??"")));return{type:"custom:silk-security-card",alarm:e.find(n=>n.startsWith("alarm_control_panel.")),locks:e.filter(n=>n.startsWith("lock.")).slice(0,8),openings:[...i("binary_sensor",["door","window","garage_door","opening"]),...e.filter(n=>n.startsWith("cover."))].slice(0,8),motion:i("binary_sensor",["motion","occupancy"]).slice(0,8)}}static async getConfigElement(){return document.createElement(Ad)}setConfig(t){if(t.alarm!==void 0&&typeof t.alarm!="string")throw new Error("silk-security-card: `alarm` must be an alarm_control_panel entity id");let e=Ys(t.locks,"locks"),i=Ys(t.openings,"openings"),n=Ys(t.motion,"motion");if(!t.alarm&&e.length+i.length+n.length===0)throw new Error("silk-security-card: configure at least one of `alarm`, `locks`, `openings`, `motion`");this._config=t,this._open=null,this._lastOpen=null,this._clearOptimistic()}getCardSize(){return this._open?3:2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer)}willUpdate(t){if(!(!t.has("hass")||!this._config)){if(this._optimistic!==null&&this._config.alarm){let e=this.hass?.states[this._config.alarm];e&&e.last_updated!==this._optimisticBase&&this._clearOptimistic()}this._open&&this._category(this._open)?.offenders.length===0&&(this._open=null)}}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimistic=null}_ids(t){let e=this._config;return e?t==="locks"?e.locks??[]:t==="openings"?e.openings??[]:e.motion??[]:[]}_allIds(){let t=this._config;return t?[...t.alarm?[t.alarm]:[],...this._ids("locks"),...this._ids("openings"),...this._ids("motion")]:[]}_category(t){let e=this.hass,i=this._ids(t);if(!e||i.length===0)return null;let n=i.filter(r=>{let o=e.states[r];return o?N(o):!1});if(t==="locks"){let r=i.filter(o=>e.states[o]?.state==="locked").length;return{key:t,label:"Locks",ids:i,offenders:n,value:`${r}/${i.length}`,failing:n.length>0,live:!1}}return t==="openings"?{key:t,label:"Doors",ids:i,offenders:n,value:`${n.length}/${i.length}`,failing:n.length>0,live:!1}:{key:t,label:"Motion",ids:i,offenders:n,value:`${n.length}`,failing:!1,live:n.length>0}}_needsCode(t,e){return!(!t.attributes.code_format||e.key!=="disarm"&&t.attributes.code_arm_required===!1)}_armChips(t){return kd.filter(e=>(e.feature===void 0||D(t,e.feature))&&!this._needsCode(t,e))}_onCardClick(){this._config?.alarm&&A(this,this._config.alarm)}_onPillTap(t){t.stopPropagation();let e=t.currentTarget.dataset.cat;if(!e)return;let i=this._category(e);!i||i.offenders.length===0||(E(this,"selection"),this._open===e?this._open=null:(this._open=e,this._lastOpen=e))}_onRowClick(t,e){t.stopPropagation(),A(this,e)}_onArmTap(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e?.alarm||!i)return;let n=i.states[e.alarm];if(!n||b(n))return;let r=t.currentTarget.dataset.arm,o=kd.find(c=>c.key===r);o&&(E(this,"success"),i.callService("alarm_control_panel",o.service,{entity_id:e.alarm}),this._optimistic=o.key==="disarm"?"disarmed":"arming",this._optimisticBase=n.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),Cb))}_joined(t){return l`${t.map((e,i)=>l`${i>0?l`<span class="sep">·</span>`:m}${e}`)}`}_renderDrawer(t){let e=this.hass,n=(this._lastOpen?this._category(this._lastOpen):null)?.offenders??[],r=n.slice(0,Eb),o=n.length-r.length,c=t&&r.length>0?r.length*$d+(o>0?Ed:0)+Td:0;return l`
      <div class="drawer" style="max-height:${c}px">
        <div class="rows">
          ${r.map(d=>{let u=e?.states[d],g=u?.attributes.friendly_name??d;return l`
              <button class="row" title=${g} @click=${h=>this._onRowClick(h,d)}>
                <ha-state-icon .hass=${e} .stateObj=${u}></ha-state-icon>
                <span class="row-name">${g}</span>
                <span class="row-state">${u?I(e,u):"\u2014"}</span>
              </button>
            `})}
          ${o>0?l`<div class="more">+${o} more</div>`:m}
        </div>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._allIds();if(i.length>0&&i.every(F=>!e.states[F]))return l`
        <ha-card class="control">
          <div class="warning">Entities not found: ${i.join(", ")}</div>
        </ha-card>
      `;let n=["locks","openings","motion"].map(F=>this._category(F)).filter(F=>F!==null),r=F=>n.find(q=>q.key===F),o=t.alarm?e.states[t.alarm]:void 0,c=o&&this._optimistic!==null?{...o,state:this._optimistic}:o,d=r("locks")?.offenders.length??0,u=r("openings")?.offenders.length??0,g=r("motion")?.offenders.length??0,h=i.length>0&&i.every(F=>b(e.states[F])),v,_,$;h?(v="unknown",_="Unknown",$="var(--primary-color, #4aa8ff)"):c?.state==="triggered"?(v="triggered",_="Alarm triggered",$="var(--error-color, #db4437)"):d>0||u>0?(v="breach",_=d>0?"Unlocked":"Open",$="var(--warning-color, #ffa600)"):g>0?(v="motion",_="Motion",$="var(--primary-color, #4aa8ff)"):(v="secure",_="Secure",$="var(--success-color, #43a047)");let M=[];u>0&&M.push(`${u} open`),d>0&&M.push(`${d} unlocked`);let P;if(v==="unknown")P=l`No data`;else if(v==="triggered")P=M.length?this._joined(M):l`${o?.attributes.friendly_name??t.alarm}`;else if(v==="breach")P=this._joined(M);else if(v==="motion"){let F=(r("motion")?.offenders??[]).map(q=>e.states[q]?.attributes.friendly_name??q);P=this._joined(F)}else if(c)P=l`${I(e,c)}`;else{let F=[];r("locks")&&F.push("All locked"),r("openings")&&F.push("all closed"),P=F.length?this._joined(F):l`All clear`}let L=o&&!b(o)?this._armChips(o):[],H=t.name??"Security",z=v!=="motion"&&v!=="unknown",V=["control",h?"unavailable":"",this._open?"expanded":"",t.alarm?"":"static"].filter(Boolean).join(" ");return l`
      <ha-card
        class=${V}
        style="--silk-accent:${$}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="shield ${z?"tinted":""}">
            <ha-icon .icon=${Tb[v]}></ha-icon>
          </div>
          <div class="info">
            <div class="cap" title=${H}>${H}</div>
            <div class="verdict ${z?"status":""}">${_}</div>
            <div class="state">${P}</div>
          </div>
          <div class="trailing pills">
            ${n.map(F=>{let q=F.offenders.length>0,B=this._open===F.key;return l`
                <button
                  class="pill ${F.failing?"warn":""} ${F.live?"live":""} ${B?"open":""} ${q?"":"mute"}"
                  data-cat=${F.key}
                  aria-expanded=${q?B?"true":"false":m}
                  aria-label=${`${F.label} ${F.value}`}
                  @click=${this._onPillTap}
                >
                  <span class="pl">${F.label}</span><span class="pv">${F.value}</span>
                </button>
              `})}
          </div>
        </div>
        ${L.length>0?l`
              <div class="modes">
                ${L.map(F=>{let q=c?.state===F.activeState;return l`
                    <button
                      class="chip ${q?"active":""}"
                      data-arm=${F.key}
                      aria-pressed=${q?"true":"false"}
                      @click=${this._onArmTap}
                    >
                      ${F.label}
                    </button>
                  `})}
              </div>
            `:m}
        ${this._renderDrawer(this._open)}
      </ha-card>
    `}};le.styles=[T,k`
      /* Stacked rows; the card may outgrow its cell while the drawer is open. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 10px;
        height: auto;
        min-height: 100%;
      }
      /* Without a panel there is no card-level action, so no pointer promise. */
      ha-card.static {
        cursor: default;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .shield {
        flex: none;
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 200ms ease,
          color 200ms ease;
      }
      .shield.tinted {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .shield ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }
      /* The card's own label sits above the headline, quiet and small — the
         verdict is what you read, the name is only how you find the card. */
      .cap {
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .verdict {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.25;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 200ms ease;
      }
      .verdict.status {
        color: var(--silk-accent);
      }
      /* Panel states arrive lowercase ('armed away'); lift the first letter. */
      .state::first-letter {
        text-transform: uppercase;
      }
      .pills {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 4px 6px;
        max-width: 52%;
      }
      .pill {
        position: relative;
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        border: none;
        margin: 0;
        padding: 3px 8px;
        border-radius: 999px;
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.3;
        white-space: nowrap;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          background 150ms ease-out,
          color 200ms ease;
      }
      /* Invisible halo lifts the touch target without growing the pill. */
      .pill::after {
        content: '';
        position: absolute;
        inset: -8px -2px;
        border-radius: 999px;
      }
      .pill:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .pill:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .pill .pv {
        font-variant-numeric: tabular-nums;
      }
      /* Chroma only where it means a fault. */
      .pill.warn {
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      }
      /* Motion is emphasis, not alarm: weight and contrast, no hue. */
      .pill.live {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .pill.open {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
      }
      .pill.mute {
        cursor: default;
      }
      .pill.mute:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .modes {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        position: relative;
        z-index: 1;
      }
      .unavailable .modes,
      .unavailable .shield {
        opacity: 0.45;
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
        padding-top: ${Td}px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${$d}px;
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
      .row-state::first-letter {
        text-transform: uppercase;
      }
      .more {
        font-size: 12px;
        line-height: ${Ed}px;
        color: var(--secondary-text-color);
        padding-left: 4px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `],p([y({attribute:!1})],le.prototype,"hass",2),p([f()],le.prototype,"_config",2),p([f()],le.prototype,"_open",2),p([f()],le.prototype,"_optimistic",2),le=p([x("silk-security-card")],le);var Rd={type:"silk-maintenance-card",name:"Silk Upkeep",description:"Filters, refills, and what's due next."},Ab=864e5,Sd=new Set(["h","hr","hrs","hour","hours"]),Sb=new Set(["d","day","days"]),Mb=30,Md=.25,Pb=.1,Rb=36,Ob=9e5,Hb="mdi:progress-wrench",Od="silk-maintenance-card-editor";C(Od,[{name:"name",selector:{text:{}}}],{name:"Name"},{name:"Upkeep"});function Pd(a){let s=a.trim();if(!s||s==="unknown"||s==="unavailable")return null;let t=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(t)return new Date(+t[1],+t[2]-1,+t[3]).getTime();let e=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);if(e){let[,n,r,o,c,d,u]=e;return new Date(+n,+r-1,+o,+c,+d,+(u??0)).getTime()}let i=Date.parse(s);return Number.isFinite(i)?i:null}function Nb(a,s){let t=s.trim(),e=/^[a-z_0-9]+\.[a-zA-Z_0-9]+$/.test(t)?a.states[t]:void 0;if(e){let i=e.attributes.timestamp;return typeof i=="number"&&Number.isFinite(i)?i*1e3:Pd(e.state)}return Pd(t)}function Lb(a){if(!a||b(a)||a.state==="")return null;let s=Number(a.state);return Number.isFinite(s)?s:null}var Ye=class extends w{constructor(){super(...arguments);this._now=Date.now()}static getStubConfig(t){let e=Object.keys(t.states).find(r=>r.startsWith("sensor.")&&t.states[r].attributes.unit_of_measurement==="%"&&t.states[r].attributes.device_class!=="battery"&&/filter|consumable|cartridge|brush/i.test(r)),i=new Date,n=`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-${String(i.getDate()).padStart(2,"0")}`;return{type:"custom:silk-maintenance-card",items:e?[{name:"Filter",entity:e,icon:"mdi:air-filter"}]:[{name:"Air filter",last:n,interval_days:90,icon:"mdi:air-filter"}]}}static async getConfigElement(){return document.createElement(Od)}setConfig(t){if(!Array.isArray(t.items)||t.items.length===0)throw new Error("silk-maintenance-card: `items` is required \u2014 a list of {name, entity?, last?, interval_days?}");t.items.forEach((e,i)=>{if(!e||typeof e.name!="string"||e.name==="")throw new Error(`silk-maintenance-card: items[${i}] needs a \`name\``);if(e.entity!==void 0&&typeof e.entity!="string")throw new Error(`silk-maintenance-card: items[${i}].entity must be an entity id`);if(e.last!==void 0&&typeof e.last!="string")throw new Error(`silk-maintenance-card: items[${i}].last must be an ISO date or an entity id`);if(e.interval_days!==void 0&&!(Number(e.interval_days)>0))throw new Error(`silk-maintenance-card: items[${i}].interval_days must be positive`);if(!e.entity&&!(e.last&&e.interval_days))throw new Error(`silk-maintenance-card: items[${i}] needs an \`entity\`, or \`last\` + \`interval_days\``)}),this._config=t,this._now=Date.now()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),this._now=Date.now(),this._tickTimer=window.setInterval(()=>{this._now=Date.now()},Ob)}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tickTimer)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_num(t){return new Intl.NumberFormat(this._locale(),{maximumFractionDigits:0}).format(t)}_dayLabel(t){return t>=.5?`in ${this._num(Math.round(t))}d`:t>-.5?"due today":`overdue ${this._num(Math.round(-t))}d`}_view(t){let e=this.hass,i=t.entity&&e?e.states[t.entity]:void 0,n=Lb(i),r=String(i?.attributes.unit_of_measurement??"").trim(),o=Number(t.interval_days)>0?Number(t.interval_days):null,c=!!(t.last&&o),d={cfg:t,fraction:null,rank:1/0,label:"\u2014",overdue:!1,entityId:t.entity};if(n!==null){let u=r.toLowerCase();if(r==="%"||r===""&&!c&&n>=0&&n<=100){let g=R(n,0,100);return{...d,fraction:g/100,rank:n/100,label:`${this._num(g)}%`}}if(Sd.has(u)||Sb.has(u)){let g=Sd.has(u)?n/24:n,h=o??Mb;return{...d,fraction:R(g/h,0,1),rank:g/h,label:this._dayLabel(g),overdue:g<=-.5}}}if(t.last&&o&&e){let u=Nb(e,t.last);if(u!==null){let g=o-(this._now-u)/Ab;return{...d,fraction:R(g/o,0,1),rank:g/o,label:this._dayLabel(g),overdue:g<=-.5}}}return d}_onRowClick(t,e){t.stopPropagation(),A(this,e)}_renderRow(t){let e=this.hass,{cfg:i,fraction:n,label:r,overdue:o}=t,c=t.entityId&&e?e.states[t.entityId]:void 0,d=n===null?"":n<Pb?"crit":n<Md?"low":"",u=n===null?0:Math.max(n>0?3:0,n*100),g=!!(t.entityId&&c);return l`
      <button
        class="row ${g?"":"static"} ${n===null?"unknown":""}"
        title=${i.name}
        aria-label=${`${i.name}: ${r}`}
        .disabled=${!g}
        @click=${g?h=>this._onRowClick(h,t.entityId):void 0}
      >
        ${i.icon?l`<ha-icon class="ricon" .icon=${i.icon}></ha-icon>`:c?l`<ha-state-icon class="ricon" .hass=${e} .stateObj=${c}></ha-state-icon>`:l`<ha-icon class="ricon" .icon=${Hb}></ha-icon>`}
        <span class="rname">${i.name}</span>
        <span class="track" aria-hidden="true">
          <span class="fill ${d}" style="width:${u.toFixed(1)}%"></span>
        </span>
        <span class="left ${o?"over":""}">${r}</span>
      </button>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=t.items.map(d=>this._view(d)).sort((d,u)=>d.rank-u.rank),n=i.filter(d=>d.fraction!==null&&d.fraction<Md).length,r=t.items.map(d=>d.entity?e.states[d.entity]:void 0).find(d=>d!==void 0),o=S(r),c=t.name??"Upkeep";return l`
      <ha-card class="control" style="--silk-accent:${o}">
        <div class="head">
          <div class="title" title=${c}>${c}</div>
          ${n>0?l`<span class="chip due">${this._num(n)} due</span>`:m}
        </div>
        <div class="rows">${i.map(d=>this._renderRow(d))}</div>
      </ha-card>
    `}};Ye.styles=[T,k`
      /* A list card: it grows with its rows and presses nowhere as a whole. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 6px;
        height: auto;
        min-height: 100%;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.due {
        flex: none;
        cursor: default;
        font-variant-numeric: tabular-nums;
        color: var(--warning-color, #ffa600);
        background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      }
      .rows {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: ${Rb}px;
        margin: 0;
        padding: 0 4px;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .row.static {
        cursor: default;
      }
      /* An item nothing can date recedes rather than pretending to a number. */
      .row.unknown .ricon,
      .row.unknown .rname,
      .row.unknown .track,
      .row.unknown .left {
        opacity: 0.45;
      }
      .row.static:hover {
        background: none;
      }
      .row:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      /* Icons stay neutral — the bar and the label carry the state. */
      .ricon {
        flex: none;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        pointer-events: none;
      }
      .rname {
        flex: 2 1 40px;
        min-width: 0;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        position: relative;
        flex: 1 1 64px;
        min-width: 28px;
        max-width: 96px;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 3px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .fill.low {
        background: var(--warning-color, #ffa600);
      }
      .fill.crit {
        background: var(--error-color, #db4437);
      }
      .left {
        flex: none;
        min-width: 56px;
        text-align: right;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .left.over {
        font-weight: 600;
        color: var(--error-color, #db4437);
      }
    `],p([y({attribute:!1})],Ye.prototype,"hass",2),p([f()],Ye.prototype,"_config",2),p([f()],Ye.prototype,"_now",2),Ye=p([x("silk-maintenance-card")],Ye);var Hd=a=>(...s)=>({_$litDirective$:a,values:s}),jn=class{constructor(s){}get _$AU(){return this._$AM._$AU}_$AT(s,t,e){this._$Ct=s,this._$AM=t,this._$Ci=e}_$AS(s,t){return this.update(s,t)}update(s,t){return this.render(...t)}};var{I:UP}=kr;var Ib={},Nd=(a,s=Ib)=>a._$AH=s;var Ld=Hd(class extends jn{constructor(){super(...arguments),this.key=m}render(a,s){return this.key=a,s}update(a,[s,t]){return s!==this.key&&(Nd(a),this.key=s),t}});var Dd={type:"silk-tabs-card",name:"Silk Tabs",description:"Many cards, one slot."},Id=6,Fd=3;function Fb(a){if(typeof a.getCardSize!="function")return 1;try{let s=a.getCardSize();return typeof s=="number"&&Number.isFinite(s)?s:1}catch{return 1}}var Lt=class extends w{constructor(){super(...arguments);this._children=null;this._helpersMissing=!1;this._active=0;this._tabs=[];this._cache=new Map;this._building=!1;this._buildSeq=0}static getStubConfig(){return{type:"custom:silk-tabs-card",tabs:[{name:"Tab 1",cards:[]}]}}setConfig(t){if(!Array.isArray(t.tabs)||t.tabs.length===0)throw new Error("silk-tabs-card: `tabs` is required \u2014 1-6 of {name, icon, cards}");if(t.tabs.length>Id)throw new Error(`silk-tabs-card: at most ${Id} \`tabs\``);let e=t.tabs.map((i,n)=>{if(!i||typeof i!="object")throw new Error(`silk-tabs-card: tabs[${n}] must be a mapping`);if(i.cards!==void 0&&!Array.isArray(i.cards))throw new Error(`silk-tabs-card: tabs[${n}].cards must be a list of card configurations`);return{name:i.name,icon:i.icon,cards:i.cards??[]}});this._tabs=e,this._config=t,this._buildSeq++,this._building=!1,this._cache.clear(),this._children=null,this._helpersMissing=!1,this._active=Math.min(this._active,this._tabs.length-1)}getCardSize(){let t=this._cache.get(this._active);if(!t||t.length===0)return Fd;let e=t.reduce((i,n)=>i+Fb(n),0);return e>0?e:Fd}getGridOptions(){return{columns:12,rows:4,min_columns:6,min_rows:2}}willUpdate(t){this._config&&(this._children===null&&!this._helpersMissing&&!this._building&&this._buildTab(this._active),t.has("hass")&&this._assignHass())}async _buildTab(t){let e=this._tabs[t];if(!e)return;let i=++this._buildSeq;this._building=!0;let n=window.loadCardHelpers;if(typeof n!="function"){this._building=!1,this._helpersMissing=!0;return}try{let r=await n();if(i!==this._buildSeq)return;let o=[];for(let c of e.cards)try{o.push(r.createCardElement(c))}catch(d){console.warn("silk-tabs-card: card could not be created",d)}this._cache.set(t,o),t===this._active&&(this._children=o,this._assignHass())}catch(r){console.warn("silk-tabs-card: card helpers failed",r),i===this._buildSeq&&(this._helpersMissing=!0)}finally{i===this._buildSeq&&(this._building=!1,this._children===null&&!this._helpersMissing&&this._buildTab(this._active))}}_assignHass(){if(!(!this.hass||!this._children))for(let t of this._children)t.hass=this.hass}_onTabClick(t,e){if(t.stopPropagation(),e===this._active||!this._tabs[e])return;E(this,"selection"),this._active=e;let i=this._cache.get(e);this._children=i??null,i&&this._assignHass()}_tabLabel(t,e){return t.name??(t.icon?"":`Tab ${e+1}`)}_renderTab(t,e){let i=e===this._active,n=this._tabLabel(t,e);return l`
      <button
        class="chip tab ${i?"active":""}"
        role="tab"
        aria-selected=${i?"true":"false"}
        aria-controls="silk-tabs-panel"
        aria-label=${n||`Tab ${e+1}`}
        title=${n||m}
        @click=${r=>this._onTabClick(r,e)}
      >
        ${t.icon?l`<ha-icon .icon=${t.icon}></ha-icon>`:m}
        ${n?l`<span class="label">${n}</span>`:m}
      </button>
    `}_renderBody(){return this._helpersMissing?l`<div class="note">Tabs require Home Assistant</div>`:this._children?this._children.length===0?l`<div class="note">This tab is empty — add a <code>cards:</code> list.</div>`:this._children:m}render(){if(!this._config)return m;let t=this._tabs[this._active],e=(t?this._tabLabel(t,this._active):"")||`Tab ${this._active+1}`;return l`
      <ha-card>
        <div class="bar" role="tablist">
          ${this._tabs.map((i,n)=>this._renderTab(i,n))}
        </div>
        ${Ld(`${this._active}:${this._children?"ready":"pending"}`,l`<div class="content" id="silk-tabs-panel" role="tabpanel" aria-label=${e}>
            ${this._renderBody()}
          </div>`)}
      </ha-card>
    `}};Lt.styles=[T,k`
      /* A container, not a card: it holds real cards, so it wears no chrome and
         grows with whatever the active tab renders. */
      :host {
        height: auto;
      }
      ha-card {
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 0;
        overflow: visible;
        background: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
        cursor: default;
      }
      .bar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        scrollbar-width: none;
        /* Negative margin buys room for focus rings without shifting the row. */
        padding: 3px;
        margin: -3px;
      }
      .bar::-webkit-scrollbar {
        display: none;
      }
      .tab {
        flex: 0 1 auto;
        min-width: 0;
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 36px;
        padding: 0 14px;
        font-size: 12.5px;
        transition:
          transform 250ms var(--silk-spring),
          background 150ms ease-out,
          color 150ms ease-out;
      }
      /* Invisible halo lifts the touch target past 40px without fattening the chip. */
      .tab::after {
        content: '';
        position: absolute;
        inset: -3px -2px;
        border-radius: 999px;
      }
      .tab:active {
        transform: scale(0.94);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tab:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .tab ha-icon {
        flex: none;
        --mdc-icon-size: 18px;
        pointer-events: none;
      }
      .tab .label {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
        /* Opacity only — the incoming tab never animates its layout. */
        animation: silk-tabs-in 150ms var(--silk-ease-out) both;
      }
      .note {
        padding: 4px 2px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
      @keyframes silk-tabs-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],p([y({attribute:!1})],Lt.prototype,"hass",2),p([f()],Lt.prototype,"_config",2),p([f()],Lt.prototype,"_children",2),p([f()],Lt.prototype,"_helpersMissing",2),p([f()],Lt.prototype,"_active",2),Lt=p([x("silk-tabs-card")],Lt);var Ud={type:"silk-expander-card",name:"Silk Expander",description:"Tuck the details away until you want them."},jd="silk-expander-card-editor";C(jd,[{name:"title",required:!0,selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"summary_entity",selector:{entity:{}}}]},{name:"expanded",selector:{boolean:{}}}],{title:"Title",icon:"Icon",summary_entity:"Summary entity",expanded:"Open by default"},{expanded:!1});var zd=250;function Db(a){if(typeof a.getCardSize!="function")return 1;try{let s=a.getCardSize();return typeof s=="number"&&Number.isFinite(s)?s:1}catch{return 1}}var It=class extends w{constructor(){super(...arguments);this._expanded=!1;this._children=null;this._helpersMissing=!1;this._buildSeq=0;this._ready=!1}static getStubConfig(){return{type:"custom:silk-expander-card",title:"More",cards:[]}}static async getConfigElement(){return document.createElement(jd)}setConfig(t){if(typeof t.title!="string"||!t.title.trim())throw new Error("silk-expander-card: `title` is required");if(t.cards!==void 0&&!Array.isArray(t.cards))throw new Error("silk-expander-card: `cards` must be a list of card configurations");this._config=t,this._buildSeq++,this._children=null,this._helpersMissing=!1,this._expanded=t.expanded===!0}getCardSize(){return!this._expanded||!this._children?.length?1:this._children.reduce((t,e)=>t+Db(e),1)}getGridOptions(){return{columns:12,rows:2,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._releaseTimer),this._releaseTimer=void 0}willUpdate(t){t.has("hass")&&this._expanded&&this._assignHass()}firstUpdated(){this._body()?.style.setProperty("max-height",this._expanded?"none":"0px"),this._ready=!0}updated(t){if(this._ready){if(t.has("_config")){this._body()?.style.setProperty("max-height",this._expanded?"none":"0px"),this._expanded&&!this._children&&!this._helpersMissing&&this._buildChildren();return}(t.has("_expanded")||this._expanded&&t.has("_children"))&&this._syncBody()}}_body(){return this.renderRoot.querySelector(".body")}_syncBody(){let t=this._body();if(t){if(window.clearTimeout(this._releaseTimer),this._releaseTimer=void 0,this._expanded){if(t.style.maxHeight==="none")return;t.style.maxHeight=`${t.scrollHeight}px`,this._releaseTimer=window.setTimeout(()=>{this._releaseTimer=void 0,this._expanded&&this._body()?.style.setProperty("max-height","none")},zd+60);return}(t.style.maxHeight==="none"||t.style.maxHeight==="")&&(t.style.maxHeight=`${t.scrollHeight}px`),t.offsetHeight,t.style.maxHeight="0px"}}_onBodyTransitionEnd(t){t.propertyName!=="max-height"||t.target!==t.currentTarget||(window.clearTimeout(this._releaseTimer),this._releaseTimer=void 0,this._expanded&&(t.currentTarget.style.maxHeight="none"))}_onToggle(t){t.stopPropagation(),E(this,"selection"),this._expanded=!this._expanded,this._expanded&&(!this._children&&!this._helpersMissing?this._buildChildren():this._assignHass())}async _buildChildren(){let t=this._config?.cards??[],e=++this._buildSeq,i=window.loadCardHelpers;if(typeof i!="function"){this._helpersMissing=!0;return}try{let n=await i();if(e!==this._buildSeq)return;let r=[];for(let o of t)try{r.push(n.createCardElement(o))}catch(c){console.warn("silk-expander-card: card could not be created",c)}this._children=r,this._assignHass()}catch(n){console.warn("silk-expander-card: card helpers failed",n),e===this._buildSeq&&(this._helpersMissing=!0)}}_assignHass(){if(!(!this.hass||!this._children))for(let t of this._children)t.hass=this.hass}_renderSummary(t){let e=this.hass?.states[t];if(!e)return m;let i=b(e),n=!i&&N(e),r=I(this.hass,e);return l`
      <span
        class="chip summary ${n?"active":""} ${i?"unavailable":""}"
        title=${`${e.attributes.friendly_name??t}: ${r}`}
        >${r}</span
      >
    `}_renderBody(){return this._helpersMissing?l`<div class="note">Expander requires Home Assistant</div>`:this._children?this._children.length===0?l`<div class="note">No cards yet — add a <code>cards:</code> list.</div>`:this._children:m}render(){let t=this._config;if(!t)return m;let e=t.summary_entity?this.hass?.states[t.summary_entity]:void 0,i=S(e),n=this._expanded;return l`
      <ha-card class=${n?"open":""} style="--silk-accent:${i}">
        <button
          class="header"
          aria-expanded=${n?"true":"false"}
          aria-controls="silk-expander-body"
          @click=${this._onToggle}
        >
          ${t.icon?l`<ha-icon class="lead" .icon=${t.icon}></ha-icon>`:m}
          <span class="name" title=${t.title}>${t.title}</span>
          <span class="trail">
            ${t.summary_entity?this._renderSummary(t.summary_entity):m}
            <span class="chev">
              <ha-icon .icon=${"mdi:chevron-down"}></ha-icon>
            </span>
          </span>
        </button>
        <div
          class="body ${n?"open":""}"
          id="silk-expander-body"
          ?inert=${!n}
          @transitionend=${this._onBodyTransitionEnd}
        >
          <div class="inner">${this._renderBody()}</div>
        </div>
      </ha-card>
    `}};It.styles=[T,k`
      /* The card is exactly as tall as what it currently reveals. */
      :host {
        height: auto;
      }
      ha-card {
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 6px;
        overflow: visible;
        cursor: default;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: 44px;
        box-sizing: border-box;
        padding: 0 6px;
        margin: 0;
        border: none;
        border-radius: 12px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 200ms ease;
      }
      .header:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
      .header:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .lead {
        flex: none;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .name {
        flex: 1;
        min-width: 0;
      }
      .trail {
        flex: 0 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        overflow: hidden;
      }
      .summary {
        flex: 0 1 auto;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
        cursor: inherit;
      }
      /* A readout, not a button — hover must not imply a second tap target. */
      .summary:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .summary.active:hover {
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .summary.unavailable {
        opacity: 0.45;
      }
      .chev {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .header:active .chev {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .open .chev {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .chev ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
        transition: transform 200ms var(--silk-ease-out);
      }
      .open .chev ha-icon {
        transform: rotate(180deg);
      }
      .body {
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition:
          max-height ${zd}ms var(--silk-ease-out),
          opacity 200ms ease;
      }
      .body.open {
        opacity: 1;
      }
      .inner {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
        padding: 8px 6px 6px;
      }
      .note {
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .note code {
        font-size: 12px;
      }
    `],p([y({attribute:!1})],It.prototype,"hass",2),p([f()],It.prototype,"_config",2),p([f()],It.prototype,"_expanded",2),p([f()],It.prototype,"_children",2),p([f()],It.prototype,"_helpersMissing",2),It=p([x("silk-expander-card")],It);var Wd={type:"silk-carousel-card",name:"Silk Carousel",description:"Swipe through cards like a phone."},Vd=320,zb=80,qd=6,Gd=8,Ub=.25,jb=.45,Vb=.35,st=class extends w{constructor(){super(...arguments);this.editMode=!1;this._children=null;this._helpersMissing=!1;this._index=0;this._pos=0;this._shift=0;this._drag=0;this._dragging=!1;this._noAnim=!1;this._buildSeq=0;this._building=!1;this._axis=null;this._startX=0;this._startY=0;this._lastX=0;this._lastT=0;this._velocity=0;this._suppressClick=!1;this._paused=!1;this._onVisibility=()=>{document.hidden?window.clearTimeout(this._autoTimer):this._armAuto()};this._clickCapture={handleEvent:t=>{this._suppressClick&&(this._suppressClick=!1,t.stopPropagation(),t.preventDefault())},capture:!0}}static getStubConfig(){return{type:"custom:silk-carousel-card",cards:[{type:"markdown",content:"First card"},{type:"markdown",content:"Second card"}]}}setConfig(t){if(!Array.isArray(t.cards)||t.cards.length===0)throw new Error("silk-carousel-card: `cards` is required \u2014 a list of card configurations");if(t.auto!==void 0&&!(Number(t.auto)>=0))throw new Error("silk-carousel-card: `auto` must be a number of seconds (0 disables it)");this._config=t,this._buildSeq++,this._children=null,this._helpersMissing=!1,this._index=0,this._pos=0,this._shift=0,this._drag=0,this.isConnected&&this._buildChildren()}getCardSize(){let t=3;for(let e of this._children??[]){let i=typeof e.getCardSize=="function"?e.getCardSize():void 0;typeof i=="number"&&Number.isFinite(i)&&(t=Math.max(t,i))}return t}getGridOptions(){return{columns:12,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._config&&!this._children&&!this._helpersMissing&&this._buildChildren(),this._armAuto()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),window.clearTimeout(this._autoTimer),window.clearTimeout(this._settleTimer),this._autoTimer=void 0,this._settleTimer=void 0,this._dragging=!1,this._pointerId=void 0}willUpdate(t){t.has("hass")&&this._assignHass()}async _buildChildren(){let t=this._config;if(!t||this._building)return;let e=this._buildSeq,i=window.loadCardHelpers;if(typeof i!="function"){this._helpersMissing=!0;return}this._building=!0;let n;try{n=await i()}catch(r){console.warn("silk-carousel-card: card helpers failed",r),this._building=!1,e===this._buildSeq&&(this._helpersMissing=!0);return}if(this._building=!1,e!==this._buildSeq){this._buildChildren();return}this._children=t.cards.map(r=>n.createCardElement(r)),this._assignHass(),this._armAuto()}_assignHass(){let t=this.hass;if(!(!t||!this._children))for(let e of this._children)e.hass=t}_count(){return this._children?.length??0}_loop(){return this._config?.loop!==!1}_width(){return this.renderRoot.querySelector(".viewport")?.clientWidth??0}_advance(t){let e=this._count();if(e<2)return;let i=this._index+t;i>=0&&i<e?(this._shift=0,this._index=i,this._pos=i):this._loop()?(this._shift=i<0?-1:1,this._pos=i,this._index=i<0?e-1:0):(this._shift=0,this._pos=this._index),this._drag=0,this._armSettle(),this._armAuto()}_jumpTo(t){let e=this._count();t<0||t>=e||(this._settle(),t!==this._index&&(this._shift=0,this._index=t,this._pos=t,this._drag=0,this._armSettle(),this._armAuto()))}_settle(){window.clearTimeout(this._settleTimer),this._settleTimer=void 0;let t=this._pos!==this._index;!t&&this._shift===0||(this._pos=this._index,this._shift=0,t&&(this._noAnim=!0,requestAnimationFrame(()=>requestAnimationFrame(()=>{this._noAnim=!1}))))}_armSettle(){window.clearTimeout(this._settleTimer),this._settleTimer=window.setTimeout(()=>{this._settleTimer=void 0,this._settle()},Vd+zb)}_onTransitionEnd(t){t.propertyName!=="transform"||t.target!==t.currentTarget||this._settle()}_armAuto(){window.clearTimeout(this._autoTimer),this._autoTimer=void 0;let t=Number(this._config?.auto??0),e=this._count();!(t>0)||e<2||this.editMode||this._paused||document.hidden||!this.isConnected||!this._loop()&&this._index===e-1||(this._autoTimer=window.setTimeout(()=>{this._autoTimer=void 0,!this._paused&&!document.hidden?this._advance(1):this._armAuto()},t*1e3))}_onPointerDown(t){this._count()<2||this.editMode||t.button>0||(this._suppressClick=!1,this._paused=!0,window.clearTimeout(this._autoTimer),this._autoTimer=void 0,this._settle(),this._pointerId=t.pointerId,this._axis=null,this._startX=t.clientX,this._startY=t.clientY,this._lastX=t.clientX,this._lastT=performance.now(),this._velocity=0)}_onPointerMove(t){if(this._pointerId!==t.pointerId)return;if(this._axis===null){let n=t.clientX-this._startX,r=t.clientY-this._startY;if(Math.abs(n)<qd&&Math.abs(r)<qd)return;if(Math.abs(r)>Math.abs(n)){this._axis="y",this._finishDrag(!1);return}this._axis="x",this._dragging=!0,this._startX=t.clientX,t.currentTarget.setPointerCapture(t.pointerId);return}if(this._axis!=="x")return;let e=performance.now(),i=e-this._lastT;i>0&&(this._velocity=(t.clientX-this._lastX)/i,this._lastX=t.clientX,this._lastT=e),this._drag=this._resist(t.clientX-this._startX),this._updateShiftForDrag(this._drag)}_onPointerUp(t){this._pointerId===t.pointerId&&this._finishDrag(!0)}_onPointerCancel(t){this._pointerId===t.pointerId&&this._finishDrag(!1)}_resist(t){if(this._loop())return t;let e=this._count();return this._index===0&&t>0||this._index===e-1&&t<0?t*Vb:t}_updateShiftForDrag(t){let e=this._count();if(!this._loop()||e<2)return;let i=this._index===0&&t>0?-1:this._index===e-1&&t<0?1:0;i!==this._shift&&(this._shift=i)}_finishDrag(t){let e=this._dragging,i=this._drag,n=this._velocity;if(this._pointerId=void 0,this._axis=null,this._dragging=!1,this._paused=!1,!e||!t){this._drag=0,this._pos=this._index,this._armSettle(),this._armAuto();return}this._suppressClick=Math.abs(i)>Gd;let r=Math.abs(i)>Math.max(this._width(),1)*Ub,o=Math.abs(n)>jb&&Math.abs(i)>Gd;if(r||o){let c=o?n<0?1:-1:i<0?1:-1,d=this._index+c;(this._loop()||d>=0&&d<this._count())&&E(this,"selection"),this._advance(c);return}this._drag=0,this._pos=this._index,this._armSettle(),this._armAuto()}_onKeyDown(t){if(t.target!==t.currentTarget)return;let e=t.key==="ArrowRight"?1:t.key==="ArrowLeft"?-1:0;e&&(t.preventDefault(),E(this,"selection"),this._advance(e))}_onDotClick(t,e){t.stopPropagation(),E(this,"selection"),this._jumpTo(e)}_slideStyle(t,e){return this._shift===1&&t===0?`transform:translateX(${e*100}%)`:this._shift===-1&&t===e-1?`transform:translateX(-${e*100}%)`:""}render(){let t=this._config;if(!t)return m;if(this._helpersMissing)return l`<ha-card><div class="warning">Carousel requires Home Assistant</div></ha-card>`;let e=this._children;if(!e)return l`<div class="pending" aria-hidden="true"></div>`;let i=e.length,n=S(void 0,t.color),r=t.dots!==!1&&i>1,o=`calc(${(-this._pos*100).toFixed(3)}% + ${this._drag.toFixed(1)}px)`;return l`
      <div class="carousel" style="--silk-accent:${n}">
        <div
          class="viewport"
          role="group"
          aria-roledescription="carousel"
          aria-label="Carousel"
          tabindex=${i>1?0:-1}
          @keydown=${this._onKeyDown}
          @click=${this._clickCapture}
        >
          <div
            class="track ${this._dragging?"dragging":""} ${this._noAnim?"no-anim":""}"
            style="transform:translateX(${o})"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @pointercancel=${this._onPointerCancel}
            @transitionend=${this._onTransitionEnd}
          >
            ${e.map((c,d)=>l`
                <div
                  class="slide"
                  style=${this._slideStyle(d,i)}
                  role="group"
                  aria-roledescription="slide"
                  aria-label=${`${d+1} of ${i}`}
                  ?inert=${d!==this._index}
                >
                  ${c}
                </div>
              `)}
          </div>
        </div>
        ${r?l`
              <div class="dots">
                ${e.map((c,d)=>l`
                    <button
                      class="dot ${d===this._index?"on":""}"
                      aria-label=${`Go to card ${d+1}`}
                      aria-current=${d===this._index?"true":m}
                      @click=${u=>this._onDotClick(u,d)}
                    ></button>
                  `)}
              </div>
            `:m}
      </div>
    `}};st.styles=[T,k`
      /* Container card: children bring their own ha-card, so there is no
         wrapper chrome to double up on. */
      .pending {
        display: none;
      }
      .carousel {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .viewport {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, 12px);
        outline: none;
      }
      .viewport:focus-visible {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--silk-accent) 70%, transparent);
      }
      .track {
        display: flex;
        align-items: stretch;
        height: 100%;
        /* Vertical scrolling still belongs to the page. */
        touch-action: pan-y;
        will-change: transform;
        transition: transform ${Vd}ms var(--silk-ease-out);
      }
      .track.dragging,
      .track.no-anim {
        transition: none;
      }
      .track.dragging {
        user-select: none;
      }
      .slide {
        flex: none;
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: stretch;
      }
      .slide > * {
        flex: 1 1 auto;
        min-width: 0;
      }
      .dots {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 12px;
      }
      .dot {
        position: relative;
        flex: none;
        width: 6px;
        height: 6px;
        padding: 0;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.25);
        transition:
          width 250ms var(--silk-spring),
          background 200ms ease;
      }
      /* Invisible halo lifts the touch target past 24px without fattening the row. */
      .dot::after {
        content: '';
        position: absolute;
        inset: -9px -4px;
      }
      .dot.on {
        width: 10px;
        background: var(--silk-accent);
      }
      .dot:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 3px;
      }
    `],p([y({attribute:!1})],st.prototype,"hass",2),p([y({type:Boolean})],st.prototype,"editMode",2),p([f()],st.prototype,"_config",2),p([f()],st.prototype,"_children",2),p([f()],st.prototype,"_helpersMissing",2),p([f()],st.prototype,"_index",2),p([f()],st.prototype,"_pos",2),p([f()],st.prototype,"_shift",2),p([f()],st.prototype,"_drag",2),p([f()],st.prototype,"_dragging",2),p([f()],st.prototype,"_noAnim",2),st=p([x("silk-carousel-card")],st);var Yd={type:"silk-launcher-card",name:"Silk Launcher",description:"An app-grid for your home."},Bd=12,qb=2e3,Kd=["toggle","navigate","url","more-info","perform-action"],Gb=new Set(["automation","button","cover","fan","group","humidifier","input_boolean","input_button","light","lock","scene","script","siren","switch","valve"]),Wb=/^(https?:|mailto:|tel:)/i;function Bb(a,s){switch(a){case"lock":return s?"unlocked":"locked";case"cover":case"valve":return s?"open":"closed";default:return s?"on":"off"}}var Xe=class extends w{constructor(){super(...arguments);this._optimistic={};this._optimisticBase={};this._optimisticTimers={}}static getStubConfig(t){let e=c=>Object.keys(t.states).find(d=>d.startsWith(c)),i=[],n=e("light.");n&&i.push({icon:"mdi:lightbulb",name:"Light",entity:n});let r=e("switch.");r&&i.push({icon:"mdi:power-plug",name:"Switch",entity:r});let o=e("scene.");return o&&i.push({icon:"mdi:palette",name:"Scene",entity:o}),i.length||i.push({icon:"mdi:home",name:"Home",tap:{action:"navigate",path:"/lovelace/0"}}),{type:"custom:silk-launcher-card",items:i}}setConfig(t){if(!Array.isArray(t.items)||t.items.length===0)throw new Error("silk-launcher-card: `items` is required \u2014 2-12 of {icon, entity/tap}");if(t.items.length>Bd)throw new Error(`silk-launcher-card: at most ${Bd} \`items\``);t.items.forEach((e,i)=>{let n=`silk-launcher-card: items[${i}]`;if(!e||typeof e.icon!="string"||!e.icon)throw new Error(`${n} needs an \`icon\``);if(e.entity!==void 0&&typeof e.entity!="string")throw new Error(`${n} \`entity\` must be an entity id`);let r=e.tap;if(r===void 0){if(!e.entity)throw new Error(`${n} needs an \`entity\` or a \`tap\` action`);return}if(!Kd.includes(r.action))throw new Error(`${n} \`tap.action\` must be one of ${Kd.join("/")}`);if(r.action==="navigate"&&!r.path)throw new Error(`${n} navigate needs a \`path\``);if(r.action==="url"){if(!r.url)throw new Error(`${n} url needs a \`url\``);if(!Wb.test(r.url)&&!r.url.startsWith("/"))throw new Error(`${n} \`url\` must be http(s), mailto, tel or an absolute path`)}if(r.action==="perform-action"&&!/^[a-z_]+\.[a-z0-9_]+$/.test(String(r.service)))throw new Error(`${n} perform-action needs a \`service\` like \`light.turn_on\``);if((r.action==="toggle"||r.action==="more-info")&&!e.entity)throw new Error(`${n} ${r.action} needs an \`entity\``)}),this._config=t,this._clearOptimistic()}getCardSize(){return Math.ceil((this._config?.items.length??4)/4)+1}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),this._clearOptimistic()}willUpdate(t){if(t.has("hass"))for(let e of Object.keys(this._optimistic)){let i=this.hass?.states[e]?.last_updated;i&&i!==this._optimisticBase[e]&&this._clearOptimistic(e)}}_clearOptimistic(t){if(t===void 0){for(let i of Object.values(this._optimisticTimers))window.clearTimeout(i);this._optimisticTimers={},this._optimisticBase={},this._optimistic={};return}window.clearTimeout(this._optimisticTimers[t]),delete this._optimisticTimers[t],delete this._optimisticBase[t];let e={...this._optimistic};delete e[t],this._optimistic=e}_setOptimistic(t,e){let i=t.entity_id;this._optimistic={...this._optimistic,[i]:e},this._optimisticBase[i]=t.last_updated,window.clearTimeout(this._optimisticTimers[i]),this._optimisticTimers[i]=window.setTimeout(()=>this._clearOptimistic(i),qb)}_resolveAction(t){if(t.tap)return t.tap;let e=t.entity;return Gb.has(O(e))?{action:"toggle"}:{action:"more-info"}}_navigate(t){history.pushState(null,"",t),this.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1},bubbles:!0,composed:!0}))}_onItemClick(t,e){t.stopPropagation();let i=this.hass;if(!i)return;let n=e.entity?i.states[e.entity]:void 0,r=this._resolveAction(e);switch(!!e.entity&&b(n)&&(r.action==="toggle"||r.action==="perform-action")?"more-info":r.action){case"toggle":{if(!n)return;E(this),this._setOptimistic(n,!N(n)),G(i,n.entity_id);return}case"navigate":{if(!r.path)return;E(this,"selection"),this._navigate(r.path);return}case"url":{if(!r.url)return;E(this,"selection"),window.open(r.url,"_blank","noopener");return}case"more-info":{if(!e.entity)return;E(this,"selection"),A(this,e.entity);return}case"perform-action":{let[d,u]=String(r.service).split(".");if(!d||!u)return;E(this),i.callService(d,u,r.data?{...r.data}:void 0);return}}}_renderItem(t){let e=this.hass,i=t.entity?e?.states[t.entity]:void 0,n=t.entity?this._optimistic[t.entity]:void 0,r=!!t.entity&&(!i||b(i)),o=n??(!r&&N(i)),c=i&&n!==void 0?{...i,state:Bb(O(i.entity_id),n)}:i,d=S(c,t.color),u=this._resolveAction(t).action,g=t.name??i?.attributes.friendly_name??t.entity??t.icon;return l`
      <button
        class="item ${o?"on":""} ${!o&&t.color?"tinted":""} ${r?"unavailable":""}"
        style="--silk-accent:${d}"
        aria-label=${g}
        aria-pressed=${u==="toggle"&&!r?String(o):m}
        @click=${h=>this._onItemClick(h,t)}
      >
        <span class="tile"><ha-icon .icon=${t.icon}></ha-icon></span>
        ${t.name?l`<span class="label" title=${t.name}>${t.name}</span>`:m}
      </button>
    `}render(){let t=this._config;return t?l`
      <ha-card>
        <div class="grid">${t.items.map(e=>this._renderItem(e))}</div>
      </ha-card>
    `:m}};Xe.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 0;
        padding: 12px;
        cursor: default;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
        gap: 10px;
        justify-items: center;
      }
      .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        width: 100%;
        max-width: 84px;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .tile {
        flex: none;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .item:active .tile {
        transform: scale(0.93);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* State reads as surface: the tile fills, the label stays a text token. */
      .item.on .tile {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      /* An explicitly coloured shortcut carries its accent on the glyph only. */
      .item.tinted .tile {
        color: var(--silk-accent);
      }
      .item:focus-visible {
        outline: none;
      }
      .item:focus-visible .tile {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .tile ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .label {
        font-size: 10px;
        font-weight: 500;
        line-height: 1.2;
        color: var(--secondary-text-color);
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item.unavailable {
        opacity: 0.45;
      }
      .item.unavailable .tile {
        color: var(--disabled-text-color, #6f6f6f);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
      }
    `],p([y({attribute:!1})],Xe.prototype,"hass",2),p([f()],Xe.prototype,"_config",2),p([f()],Xe.prototype,"_optimistic",2),Xe=p([x("silk-launcher-card")],Xe);var Xd={type:"silk-search-card",name:"Silk Search",description:"Find any entity, fast."},Zd=8,Qd=25,Jd="Search entities",Kb=120,Yb=0,Xb=1,Zb=2,Qb=3,tp=-1;function Jb(a,s){for(let t=a.indexOf(" ");t>=0;t=a.indexOf(" ",t+1))if(a.startsWith(s,t+1))return!0;return!1}function tv(a,s,t){let e=a.indexOf(t),i=s.indexOf(t);if(e<0&&i<0)return tp;if(e===0)return Yb;let n=s.indexOf(".");return i===0||n>=0&&s.startsWith(t,n+1)||e>0&&Jb(a,t)?Xb:e>0?Zb:Qb}var ep="silk-search-card-editor";C(ep,[{name:"name",selector:{text:{}}},{name:"placeholder",selector:{text:{}}},{name:"limit",selector:{number:{min:1,max:Qd,mode:"box"}}}],{name:"Name",placeholder:"Placeholder",limit:"Results shown"},{limit:Zd,placeholder:Jd});var Ze=class extends w{constructor(){super(...arguments);this._results=null;this._applied=""}static getStubConfig(){return{type:"custom:silk-search-card"}}static async getConfigElement(){return document.createElement(ep)}setConfig(t){if(t.domains!==void 0&&(!Array.isArray(t.domains)||t.domains.some(e=>typeof e!="string")))throw new Error("silk-search-card: `domains` must be a list of domain names");if(t.limit!==void 0&&!(Number(t.limit)>0))throw new Error("silk-search-card: `limit` must be a positive number");this._config=t,this._domains=t.domains?.length?new Set(t.domains):void 0}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._debounce),this._debounce=void 0}willUpdate(t){t.has("_config")&&this._applied&&this._compute(this._applied)}_inputEl(){return this.renderRoot.querySelector(".q")}_limit(){return R(Math.round(this._config?.limit??Zd),1,Qd)}_compute(t){let e=this.hass;if(!e)return;let i=t.trim().toLowerCase();if(this._applied=i,!i){this._results=null;return}let n=this._domains,r=[];for(let o of Object.keys(e.states)){if(n&&!n.has(O(o)))continue;let c=e.states[o].attributes.friendly_name,d=typeof c=="string"&&c?c:o,u=tv(d.toLowerCase(),o.toLowerCase(),i);u!==tp&&r.push({id:o,name:d,score:u})}r.sort((o,c)=>o.score-c.score||o.name.localeCompare(c.name)||o.id.localeCompare(c.id)),this._results=r.slice(0,this._limit()).map(o=>{let c=o.name.toLowerCase().indexOf(i);return{id:o.id,name:o.name,hit:c<0?null:[c,i.length]}})}_flush(){this._debounce!==void 0&&(window.clearTimeout(this._debounce),this._debounce=void 0,this._compute(this._inputEl()?.value??""))}_onInput(t){let e=t.target.value;window.clearTimeout(this._debounce),this._debounce=window.setTimeout(()=>{this._debounce=void 0,this._compute(e)},Kb)}_clear(){window.clearTimeout(this._debounce),this._debounce=void 0;let t=this._inputEl();t&&(t.value=""),this._applied="",this._results=null}_onKeydown(t){if(t.key==="Enter"){t.preventDefault(),this._flush();let e=this._results?.[0];e&&this._open(e.id)}else t.key==="Escape"&&(t.preventDefault(),t.stopPropagation(),this._clear())}_open(t){E(this),A(this,t)}_onRowClick(t,e){t.stopPropagation(),this._open(e)}_renderName(t){if(!t.hit)return l`${t.name}`;let[e,i]=t.hit;return l`${t.name.slice(0,e)}<span class="hit"
        >${t.name.slice(e,e+i)}</span
      >${t.name.slice(e+i)}`}_renderResults(t){let e=this._results;return e?e.length===0?l`<div class="empty">No matches</div>`:l`
      <div class="results" role="listbox">
        ${e.map(i=>{let n=t.states[i.id];if(!n)return m;let r=b(n);return l`
            <button
              class="row ${!r&&N(n)?"on":""} ${r?"dim":""}"
              role="option"
              title=${i.name}
              @click=${o=>this._onRowClick(o,i.id)}
            >
              <ha-state-icon .hass=${t} .stateObj=${n}></ha-state-icon>
              <span class="rname">${this._renderName(i)}</span>
              <span class="rstate">${I(t,n)}</span>
            </button>
          `})}
      </div>
    `:m}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=S(void 0,t.color),n=t.placeholder??Jd;return l`
      <ha-card style="--silk-accent:${i}">
        ${t.name?l`<div class="name">${t.name}</div>`:m}
        <div class="field">
          <ha-icon class="lead" icon="mdi:magnify"></ha-icon>
          <input
            class="q"
            type="text"
            inputmode="search"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            .placeholder=${n}
            aria-label=${t.name??n}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
            @click=${r=>r.stopPropagation()}
          />
        </div>
        ${this._renderResults(e)}
      </ha-card>
    `}};Ze.styles=[T,k`
      /* A search surface, not a control row: no card-level tap action. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        cursor: default;
      }
      .name {
        flex: none;
      }
      .field {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 10px;
        box-sizing: border-box;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: box-shadow 150ms var(--silk-ease-out);
      }
      .field:focus-within {
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      .lead {
        flex: none;
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
        display: flex;
      }
      .q {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: none;
        padding: 0;
        font: inherit;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
      }
      .q::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.8;
      }
      .results {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 38px;
        padding: 2px 6px;
        margin: 0;
        box-sizing: border-box;
        border: none;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: var(--primary-text-color);
        text-align: left;
        cursor: pointer;
        animation: silk-search-in 250ms var(--silk-ease-out);
        transition: background 150ms ease-out;
      }
      .row:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .row:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .row ha-state-icon {
        flex: none;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        pointer-events: none;
        transition: color 200ms ease;
      }
      .row.on ha-state-icon {
        color: var(--silk-accent);
      }
      .row.dim ha-state-icon,
      .row.dim .rstate {
        opacity: 0.45;
      }
      .rname {
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hit {
        color: var(--silk-accent);
        font-weight: 600;
      }
      .rstate {
        flex: none;
        max-width: 42%;
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .empty {
        flex: none;
        padding: 2px 6px;
        font-size: 12.5px;
        line-height: 1.3;
        color: var(--secondary-text-color);
      }
      @keyframes silk-search-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],p([y({attribute:!1})],Ze.prototype,"hass",2),p([f()],Ze.prototype,"_config",2),p([f()],Ze.prototype,"_results",2),Ze=p([x("silk-search-card")],Ze);var ip={type:"silk-assist-card",name:"Silk Assist",description:"Talk to your house from any dashboard."},np="Assist",ev="Ask anything",iv=4,nv="Done",sp="silk-assist-card-editor";C(sp,[{name:"name",selector:{text:{}}},{name:"agent_id",selector:{entity:{domain:["conversation"]}}},{name:"greeting",selector:{text:{}}}],{name:"Name",agent_id:"Conversation agent",greeting:"Greeting"},{name:np});function sv(a){if(a instanceof Error&&a.message)return a.message;if(a&&typeof a=="object"){let s=a.message;if(typeof s=="string"&&s)return s}return"Assist could not answer"}var Ft=class extends w{constructor(){super(...arguments);this._exchanges=[];this._text="";this._busy=!1;this._seq=0}static getStubConfig(){return{type:"custom:silk-assist-card"}}static async getConfigElement(){return document.createElement(sp)}setConfig(t){for(let e of["agent_id","pipeline_id"])if(t[e]!==void 0&&typeof t[e]!="string")throw new Error(`silk-assist-card: \`${e}\` must be a string`);this._config=t}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}updated(){let t=this.renderRoot.querySelector(".log");t&&(t.scrollTop=t.scrollHeight)}_inputEl(){return this.renderRoot.querySelector(".q")}_patch(t,e){this._exchanges=this._exchanges.map(i=>i.id===t?{...i,...e}:i)}_onInput(t){this._text=t.target.value}_onKeydown(t){if(t.key==="Enter")t.preventDefault(),this._send();else if(t.key==="Escape"){t.preventDefault(),t.stopPropagation();let e=this._inputEl();e&&(e.value=""),this._text=""}}_onSendClick(t){t.stopPropagation(),this._send()}async _send(){let t=this.hass,e=this._config;if(!t||!e||this._busy)return;let i=this._inputEl(),n=(i?.value??"").trim();if(!n)return;E(this);let r=this.renderRoot.activeElement!==null,o=++this._seq;this._exchanges=[...this._exchanges,{id:o,text:n,pending:!0}].slice(-iv),this._busy=!0,this._text="",i&&(i.value="");let c={type:"conversation/process",text:n};e.agent_id&&(c.agent_id=e.agent_id),this._conversationId&&(c.conversation_id=this._conversationId);let d=t.locale?.language??t.language;d&&(c.language=d);try{let u=await t.callWS(c);typeof u?.conversation_id=="string"&&(this._conversationId=u.conversation_id);let g=u?.response?.speech?.plain?.speech,h=typeof g=="string"&&g.trim()?g:nv;this._patch(o,{pending:!1,reply:h})}catch(u){this._patch(o,{pending:!1,error:sv(u)})}finally{this._busy=!1,r&&this.updateComplete.then(()=>this._inputEl()?.focus())}}_onMicClick(t){t.stopPropagation(),E(this),this.dispatchEvent(new CustomEvent("show-dialog-voice-command",{detail:{pipeline_id:this._config?.pipeline_id,start_listening:!0},bubbles:!0,composed:!0}))}_onClearClick(t){t.stopPropagation(),E(this),this._exchanges=[],this._conversationId=void 0}_renderExchange(t){return l`
      <div class="bubble me">${t.text}</div>
      ${t.pending?l`
            <div class="bubble bot dots" aria-label="Assist is thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          `:m}
      ${t.error?l`<div class="bubble err">${t.error}</div>`:m}
      ${t.reply?l`<div class="bubble bot">${t.reply}</div>`:m}
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=S(void 0,t.color),n=t.name??np,r=this._exchanges,o=this._text.trim().length>0&&!this._busy;return l`
      <ha-card style="--silk-accent:${i}">
        <div class="head">
          <div class="name">${n}</div>
          ${r.length?l`
                <button class="clear" @click=${this._onClearClick}>Clear</button>
              `:m}
        </div>
        <div class="log" role="log" aria-live="polite">
          ${r.length===0&&t.greeting?l`<div class="bubble bot">${t.greeting}</div>`:m}
          ${r.map(c=>this._renderExchange(c))}
        </div>
        <div class="compose">
          <div class="field">
            <input
              class="q"
              type="text"
              autocomplete="off"
              autocapitalize="sentences"
              spellcheck="false"
              .placeholder=${ev}
              .disabled=${this._busy}
              aria-label=${n}
              @input=${this._onInput}
              @keydown=${this._onKeydown}
              @click=${c=>c.stopPropagation()}
            />
          </div>
          <button class="act" aria-label="Start voice input" @click=${this._onMicClick}>
            <ha-icon icon="mdi:microphone"></ha-icon>
          </button>
          <button
            class="act ${o?"on":""}"
            aria-label="Send"
            .disabled=${!o}
            @click=${this._onSendClick}
          >
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
        </div>
      </ha-card>
    `}};Ft.styles=[T,k`
      /* A conversation surface, not a control row: no card-level tap action. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        cursor: default;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .head .name {
        flex: 1;
        min-width: 0;
      }
      .clear {
        flex: none;
        position: relative;
        border: none;
        background: none;
        font: inherit;
        font-size: 11px;
        line-height: 1;
        padding: 6px 8px;
        border-radius: 9px;
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      /* Invisible halo lifts the tap target past 36px without a bigger chip. */
      .clear::after {
        content: '';
        position: absolute;
        inset: -8px -6px;
      }
      .clear:hover {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .log {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .bubble {
        flex: none;
        max-width: 80%;
        padding: 7px 11px;
        box-sizing: border-box;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.35;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        animation: silk-assist-in 250ms var(--silk-ease-out);
      }
      .bubble.me {
        align-self: flex-end;
        color: var(--primary-text-color);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .bubble.bot {
        align-self: flex-start;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
      }
      .bubble.err {
        align-self: flex-start;
        color: var(--error-color, #db4437);
        background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
      }
      .dots {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 11px;
      }
      /* A loop, but an honest one: it runs exactly while a request is in flight. */
      .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--secondary-text-color);
        opacity: 0.25;
        animation: silk-assist-dot 1.2s ease-in-out infinite;
      }
      .dot:nth-child(2) {
        animation-delay: 150ms;
      }
      .dot:nth-child(3) {
        animation-delay: 300ms;
      }
      .compose {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .field {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        height: 36px;
        padding: 0 12px;
        box-sizing: border-box;
        border-radius: 12px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition: box-shadow 150ms var(--silk-ease-out);
      }
      .field:focus-within {
        box-shadow: inset 0 0 0 2px var(--silk-accent);
      }
      .q {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: none;
        padding: 0;
        font: inherit;
        font-size: 13.5px;
        line-height: 1.3;
        color: var(--primary-text-color);
      }
      .q::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.8;
      }
      .q:disabled {
        opacity: 0.45;
      }
      .act {
        flex: none;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        padding: 0;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .act:active {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .act.on {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .act:disabled {
        cursor: default;
      }
      .act:disabled:active {
        transform: none;
      }
      .act:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .act ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
        display: flex;
      }
      @keyframes silk-assist-in {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes silk-assist-dot {
        0%,
        60%,
        100% {
          opacity: 0.25;
        }
        30% {
          opacity: 0.9;
        }
      }
      /* Shared styles crush every duration to ~0; kill the loop outright instead. */
      @media (prefers-reduced-motion: reduce) {
        .dot {
          animation-name: none !important;
          opacity: 0.5;
        }
      }
    `],p([y({attribute:!1})],Ft.prototype,"hass",2),p([f()],Ft.prototype,"_config",2),p([f()],Ft.prototype,"_exchanges",2),p([f()],Ft.prototype,"_text",2),p([f()],Ft.prototype,"_busy",2),Ft=p([x("silk-assist-card")],Ft);var ap={type:"silk-now-playing-card",name:"Silk Now Playing",description:"Album art, front and center."},rv=1,ov=2,av=16,cv=32,lv=16384,dv=2e3,pv=1e3,rp=10,mv=new Set(["off","idle","standby","unknown","unavailable",""]),cp="silk-now-playing-card-editor";C(cp,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});function Ri(a,s){let t=a.attributes[s];return typeof t=="string"&&t?t:void 0}function op(a,s){let t=a.attributes[s];return typeof t=="number"&&Number.isFinite(t)?t:void 0}function Vn(a){let s=Math.max(0,Math.floor(a)),t=Math.floor(s/3600),e=Math.floor(s%3600/60),i=n=>String(n).padStart(2,"0");return t>0?`${t}:${i(e)}:${i(s%60)}`:`${e}:${i(s%60)}`}var yt=class extends w{constructor(){super(...arguments);this._now=Date.now();this._optimisticPlaying=null;this._optimisticSeek=null;this._snap=!1;this._optimisticAt=0;this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states).filter(n=>n.startsWith("media_player."));return{type:"custom:silk-now-playing-card",entity:e.find(n=>t.states[n].attributes.entity_picture)??e[0]}}static async getConfigElement(){return document.createElement(cp)}setConfig(t){if(!t.entity)throw new Error("silk-now-playing-card: `entity` is required");if(O(t.entity)!=="media_player")throw new Error(`silk-now-playing-card: \`entity\` must be a media_player (got "${t.entity}")`);this._config=t,this._brokenArt=void 0,this._clearOptimistic()}getCardSize(){return 4}getGridOptions(){return{columns:6,rows:4,min_columns:4,min_rows:3}}connectedCallback(){super.connectedCallback(),this._now=Date.now()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tick),this._tick=void 0,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||(this._now=Date.now(),this._optimisticTimer===void 0||!this._config))return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==void 0&&e!==this._optimisticBase&&this._clearOptimistic()}updated(){let t=this._config?this.hass?.states[this._config.entity]:void 0,e=this.isConnected&&!!t&&!b(t)&&this._isPlaying(t)&&this._duration(t)>0;e&&this._tick===void 0?this._tick=window.setInterval(()=>{this._now=Date.now()},pv):!e&&this._tick!==void 0&&(window.clearInterval(this._tick),this._tick=void 0)}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticPlaying=null,this._optimisticSeek=null}_armOptimistic(t){this._optimisticAt=Date.now(),this._optimisticBase=t.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),dv)}_isPlaying(t){return this._optimisticPlaying??t.state==="playing"}_duration(t){return op(t,"media_duration")??0}_position(t,e){if(this._optimisticSeek!==null){let c=this._isPlaying(t)?(this._now-this._optimisticAt)/1e3:0;return R(this._optimisticSeek+c,0,e)}let i=op(t,"media_position")??0,n=Date.parse(t.attributes.media_position_updated_at??""),r=this._optimisticPlaying===null?this._now:this._optimisticAt,o=i;return t.state==="playing"&&Number.isFinite(n)&&(o+=(r-n)/1e3),this._optimisticPlaying===!0&&(o+=(this._now-this._optimisticAt)/1e3),R(o,0,e)}_onCardClick(){this._config&&A(this,this._config.entity)}_onArtError(t){let e=t.currentTarget;this._brokenArt=e?.getAttribute("src")??void 0}_onPlayPause(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;E(this),this._now=Date.now();let r=this._isPlaying(n);this._optimisticSeek=this._position(n,this._duration(n)),this._optimisticPlaying=!r,this._armOptimistic(n),i.callService("media_player","media_play_pause",{entity_id:e.entity})}_onSkip(t,e){t.stopPropagation();let i=this._config,n=this.hass;if(!i||!n)return;let r=n.states[i.entity];!r||b(r)||(E(this),n.callService("media_player",e,{entity_id:i.entity}))}_seekTo(t,e,i){let n=this._config,r=this.hass;if(!n||!r)return;let o=R(Math.round(e),0,Math.floor(i));E(this),this._optimisticSeek=o,this._armOptimistic(t),this._snap=!0,requestAnimationFrame(()=>{requestAnimationFrame(()=>{this._snap=!1})}),r.callService("media_player","media_seek",{entity_id:n.entity,seek_position:o})}_onTrackClick(t,e,i){t.stopPropagation();let n=t.currentTarget.getBoundingClientRect();if(!n.width)return;let r=R((t.clientX-n.left)/n.width,0,1);this._seekTo(e,r*i,i)}_onTrackKeydown(t,e,i){let n=t.key==="ArrowRight"?rp:t.key==="ArrowLeft"?-rp:0;n!==0&&(t.stopPropagation(),t.preventDefault(),this._now=Date.now(),this._seekTo(e,this._position(e,i)+n,i))}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=mv.has(i.state),o=S(i,t.color),c=t.name??i.attributes.friendly_name??t.entity,d=r?void 0:Ri(i,"entity_picture"),u=d&&d!==this._brokenArt?d:void 0,g=r?void 0:Ri(i,"media_title"),h=r?"Nothing playing":g??c,v=r?c:Ri(i,"media_artist")??Ri(i,"media_series_title")??Ri(i,"media_album_name")??Ri(i,"app_name")??(g?c:I(e,i)),_=r?0:this._duration(i);return l`
      <ha-card
        class="np ${u?"photo":""} ${n?"unavailable":""}"
        style="--silk-accent:${o}"
        @click=${this._onCardClick}
      >
        ${u?l`
              <img class="art" src=${u} alt="" @error=${this._onArtError} />
              <div class="scrim" aria-hidden="true"></div>
            `:l`
              <div class="ground" aria-hidden="true">
                <ha-state-icon .hass=${e} .stateObj=${i}></ha-state-icon>
              </div>
            `}
        <div class="content">
          <div class="title" title=${h}>${h}</div>
          <div class="sub" title=${v}>${v}</div>
          ${_>0?this._renderProgress(i,_,n):m}
          ${this._renderControls(i,n)}
        </div>
      </ha-card>
    `}_renderProgress(t,e,i){let n=this._position(t,e),r=R(n/e*100,0,100),o=!i&&D(t,ov),c=this._isPlaying(t)&&!this._snap;return l`
      <div class="prog">
        <span class="time">${Vn(n)}</span>
        <div
          class="track ${o?"seekable":""}"
          role=${o?"slider":"progressbar"}
          aria-label="Playback position"
          aria-valuemin="0"
          aria-valuemax=${Math.floor(e)}
          aria-valuenow=${Math.floor(n)}
          aria-valuetext=${`${Vn(n)} of ${Vn(e)}`}
          tabindex=${o?0:-1}
          @click=${o?d=>this._onTrackClick(d,t,e):m}
          @keydown=${o?d=>this._onTrackKeydown(d,t,e):m}
        >
          <div class="fill ${c?"glide":""}" style="width:${r.toFixed(2)}%"></div>
        </div>
        <span class="time">${Vn(e)}</span>
      </div>
    `}_renderControls(t,e){let i=D(t,av),n=D(t,cv),r=D(t,rv)||D(t,lv);if(!i&&!n&&!r)return m;let o=!e&&this._isPlaying(t);return l`
      <div class="controls">
        ${i?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Previous track"
                @click=${c=>this._onSkip(c,"media_previous_track")}
              >
                <ha-icon icon="mdi:skip-previous"></ha-icon>
              </button>
            `:m}
        ${r?l`
              <button
                class="hero"
                ?disabled=${e}
                aria-label=${o?"Pause":"Play"}
                @click=${this._onPlayPause}
              >
                <ha-icon icon=${o?"mdi:pause":"mdi:play"}></ha-icon>
              </button>
            `:m}
        ${n?l`
              <button
                class="ctl"
                ?disabled=${e}
                aria-label="Next track"
                @click=${c=>this._onSkip(c,"media_next_track")}
              >
                <ha-icon icon="mdi:skip-next"></ha-icon>
              </button>
            `:m}
      </div>
    `}};yt.styles=[T,k`
      /* Full-bleed artwork card: drop the base row layout and padding. The
         aspect-ratio only applies where the layout gives no definite height
         (masonry); in grid sections the assigned rows win. */
      ha-card {
        display: block;
        padding: 0;
        aspect-ratio: 4 / 3;
        min-height: 168px;
        /* Ink tokens: theme text on the neutral face, white over a photograph. */
        --np-fg: var(--primary-text-color);
        --np-dim: var(--secondary-text-color);
        --np-track: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.16);
        --np-fill: var(--silk-accent);
        --np-ctl: var(--secondary-text-color);
        --np-hero-bg: var(--silk-accent);
        --np-hero-fg: var(--card-background-color, #fff);
      }
      /* Dark ground under the artwork so white text is legible from the first
         frame, before the image has decoded. */
      ha-card.photo {
        background-color: #14161a;
        --np-fg: #fff;
        --np-dim: rgba(255, 255, 255, 0.8);
        --np-track: rgba(255, 255, 255, 0.25);
        --np-fill: rgba(255, 255, 255, 0.7);
        --np-ctl: rgba(255, 255, 255, 0.92);
        --np-hero-bg: #fff;
        --np-hero-fg: #101114;
      }
      .art {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
        pointer-events: none;
      }
      .ground {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .ground ha-state-icon {
        --mdc-icon-size: 96px;
        color: var(--primary-text-color);
        opacity: 0.12;
      }
      .content {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 14px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .title {
        font-size: 17px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.01em;
        color: var(--np-fg);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        font-size: 13px;
        line-height: 1.3;
        color: var(--np-dim);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .prog {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        min-width: 0;
      }
      .time {
        flex: none;
        font-size: 10px;
        line-height: 1;
        color: var(--np-dim);
        font-variant-numeric: tabular-nums;
      }
      .track {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 2px;
        border-radius: 999px;
        background: var(--np-track);
        overflow: visible;
      }
      /* Invisible halo turns the 2px line into a real touch target. */
      .track.seekable {
        cursor: pointer;
      }
      .track.seekable::after {
        content: '';
        position: absolute;
        inset: -12px 0;
      }
      .track:focus-visible {
        outline: 2px solid var(--np-fg);
        outline-offset: 4px;
        border-radius: 999px;
      }
      .fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--np-fill);
        pointer-events: none;
      }
      .fill.glide {
        transition: width 1000ms linear;
      }
      .controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-top: 12px;
      }
      .ctl {
        flex: none;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        background: transparent;
        color: var(--np-ctl);
        transition:
          transform 250ms var(--silk-spring),
          opacity 200ms ease;
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .hero {
        flex: none;
        width: 48px;
        height: 48px;
        border: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        background: var(--np-hero-bg);
        color: var(--np-hero-fg);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .hero:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .hero ha-icon {
        --mdc-icon-size: 26px;
        pointer-events: none;
      }
      .ctl:focus-visible,
      .hero:focus-visible {
        outline: 2px solid var(--np-fg);
        outline-offset: 2px;
      }
      .ctl:disabled,
      .hero:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .unavailable .content,
      .unavailable .ground {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],yt.prototype,"hass",2),p([f()],yt.prototype,"_config",2),p([f()],yt.prototype,"_now",2),p([f()],yt.prototype,"_optimisticPlaying",2),p([f()],yt.prototype,"_optimisticSeek",2),p([f()],yt.prototype,"_snap",2),p([f()],yt.prototype,"_brokenArt",2),yt=p([x("silk-now-playing-card")],yt);var up={type:"silk-radio-card",name:"Silk Radio",description:"Your stations, one tap away."},uv=1,hv=16384,fv=2e3,Xs=2,lp=12,dp=3,gv=new Set(["playing","paused","buffering","on"]),hp="silk-radio-card-editor";C(hp,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}}],{entity:"Entity",name:"Name"});function pp(a,s){let t=a.attributes[s];return typeof t=="string"&&t?t:void 0}var mp=a=>a.toLowerCase().replace(/\s+/g," ").trim();function Zs(a){return typeof a=="string"&&a.trim()!==""?a:void 0}var Dt=class extends w{constructor(){super(...arguments);this._optimisticIndex=null;this._optimisticPlaying=null;this._brokenImages={};this._optimisticBase=""}static getStubConfig(t){let e=Object.keys(t.states).find(r=>r.startsWith("media_player.")),i=e?t.states[e].attributes.source_list:void 0,n=Array.isArray(i)&&i.length>=Xs?i.slice(0,4).map(r=>({name:String(r),source:String(r)})):[{name:"Station one",url:"http://stream.example.com/one",icon:"mdi:radio"},{name:"Station two",url:"http://stream.example.com/two",icon:"mdi:radio"}];return{type:"custom:silk-radio-card",entity:e,stations:n}}static async getConfigElement(){return document.createElement(hp)}setConfig(t){if(!t.entity)throw new Error("silk-radio-card: `entity` is required");if(O(t.entity)!=="media_player")throw new Error(`silk-radio-card: \`entity\` must be a media_player (got "${t.entity}")`);if(!Array.isArray(t.stations))throw new Error("silk-radio-card: `stations` is required \u2014 a list of {name, url or source}");if(t.stations.length<Xs||t.stations.length>lp)throw new Error(`silk-radio-card: list between ${Xs} and ${lp} \`stations\` (got ${t.stations.length})`);t.stations.forEach((e,i)=>{if(!e||typeof e!="object"||!Zs(e.name))throw new Error(`silk-radio-card: station ${i+1} needs a \`name\``);if(!Zs(e.url)&&!Zs(e.source))throw new Error(`silk-radio-card: station "${e.name}" needs a \`url\` or a \`source\``)}),this._config=t,this._brokenImages={},this._clearOptimistic()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:3,min_rows:2}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0}willUpdate(t){if(!t.has("hass")||this._optimisticTimer===void 0||!this._config)return;let e=this.hass?.states[this._config.entity]?.last_updated;e!==void 0&&e!==this._optimisticBase&&this._clearOptimistic()}_clearOptimistic(){window.clearTimeout(this._optimisticTimer),this._optimisticTimer=void 0,this._optimisticIndex=null,this._optimisticPlaying=null}_armOptimistic(t){this._optimisticBase=t.last_updated,window.clearTimeout(this._optimisticTimer),this._optimisticTimer=window.setTimeout(()=>this._clearOptimistic(),fv)}_matches(t,e){let i=e.attributes;if(t.source&&i.source===t.source||t.url&&i.media_content_id===t.url)return!0;let n=mp(t.name);if(n.length<dp)return!1;for(let r of["media_channel","media_title","source","app_name"]){let o=pp(e,r);if(!o)continue;let c=mp(o);if(!(c.length<dp)&&(c===n||c.includes(n)||n.includes(c)))return!0}return!1}_currentIndex(t){return this._optimisticIndex!==null?this._optimisticIndex:gv.has(t.state)?(this._config?.stations??[]).findIndex(e=>this._matches(e,t)):-1}_onCardClick(){this._config&&A(this,this._config.entity)}_onImageError(t){this._brokenImages={...this._brokenImages,[t]:!0}}_onStationClick(t,e,i){t.stopPropagation();let n=this._config,r=this.hass;if(!n||!r)return;let o=r.states[n.entity];!o||b(o)||(E(this),this._optimisticIndex=i,this._optimisticPlaying=!0,this._armOptimistic(o),e.url?r.callService("media_player","play_media",{entity_id:n.entity,media_content_id:e.url,media_content_type:"music"}):e.source&&r.callService("media_player","select_source",{entity_id:n.entity,source:e.source}))}_onPlayPause(t){t.stopPropagation();let e=this._config,i=this.hass;if(!e||!i)return;let n=i.states[e.entity];if(!n||b(n))return;E(this);let r=this._optimisticPlaying??n.state==="playing";this._optimisticIndex=this._currentIndex(n),this._optimisticPlaying=!r,this._armOptimistic(n),i.callService("media_player","media_play_pause",{entity_id:e.entity})}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let n=b(i),r=S(i,t.color),o=t.name??i.attributes.friendly_name??t.entity,c=n?-1:this._currentIndex(i),d=!n&&(this._optimisticPlaying??i.state==="playing"),u=pp(i,"media_title")??(c>=0?t.stations[c].name:void 0)??I(e,i),g=D(i,uv)||D(i,hv);return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="head">
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">${u}</div>
          </div>
          ${g?l`
                <button
                  class="play"
                  ?disabled=${n}
                  aria-label=${d?`Pause ${o}`:`Play ${o}`}
                  @click=${this._onPlayPause}
                >
                  <ha-icon icon=${d?"mdi:pause":"mdi:play"}></ha-icon>
                </button>
              `:m}
        </div>
        <div class="grid">
          ${t.stations.map((h,v)=>this._renderStation(h,v,v===c,n))}
        </div>
      </ha-card>
    `}_renderStation(t,e,i,n){let r=t.image&&!this._brokenImages[e]?t.image:void 0;return l`
      <button
        class="tile ${i?"active":""}"
        aria-pressed=${i?"true":"false"}
        title=${t.name}
        ?disabled=${n}
        @click=${o=>this._onStationClick(o,t,e)}
      >
        ${r?l`<img class="logo" src=${r} alt="" @error=${()=>this._onImageError(e)} />`:l`<ha-icon class="glyph" .icon=${t.icon??"mdi:radio"}></ha-icon>`}
        <span class="sname">${t.name}</span>
      </button>
    `}};Dt.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 10px;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .play {
        flex: none;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        position: relative;
        z-index: 1;
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          opacity 200ms ease;
      }
      .play:hover:not(:disabled) {
        background: color-mix(in srgb, var(--silk-accent) 24%, transparent);
      }
      .play:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .play:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .play ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .grid {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
        align-content: start;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .tile {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 56px;
        box-sizing: border-box;
        padding: 0 9px;
        border: none;
        border-radius: 14px;
        cursor: pointer;
        text-align: left;
        min-width: 0;
        font: inherit;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        transition:
          transform 250ms var(--silk-spring),
          background 200ms ease,
          color 200ms ease;
      }
      .tile:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.1);
      }
      .tile:active:not(:disabled) {
        transform: scale(0.96);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .tile:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .tile:disabled {
        cursor: default;
      }
      /* On air = tinted surface + accent label. No edge strips, no glow. */
      .tile.active {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 16%, transparent);
      }
      .tile.active .sname {
        color: var(--silk-accent);
      }
      .logo {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        object-fit: cover;
        display: block;
        pointer-events: none;
      }
      .glyph {
        flex: none;
        --mdc-icon-size: 22px;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        pointer-events: none;
      }
      .sname {
        flex: 1;
        min-width: 0;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.25;
        color: var(--primary-text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        overflow-wrap: anywhere;
        transition: color 200ms ease;
      }
      .unavailable .grid {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],Dt.prototype,"hass",2),p([f()],Dt.prototype,"_config",2),p([f()],Dt.prototype,"_optimisticIndex",2),p([f()],Dt.prototype,"_optimisticPlaying",2),p([f()],Dt.prototype,"_brokenImages",2),Dt=p([x("silk-radio-card")],Dt);var fp={type:"silk-say-card",name:"Silk Say",description:"Type it, the house says it."},bv="Say",vv="mdi:message-text",_v=4e3,yv=400,gp="silk-say-card-editor";C(gp,[{name:"entity",required:!0,selector:{entity:{domain:["media_player"]}}},{name:"name",selector:{text:{}}},{name:"",type:"grid",schema:[{name:"engine",selector:{text:{}}},{name:"language",selector:{text:{}}}]}],{entity:"Speaker",name:"Name",engine:"TTS engine",language:"Language"});function wv(a,s){let t=s?.trim();return t||Object.keys(a.states).find(e=>e.startsWith("tts."))}function xv(a){if(typeof a=="string"&&a)return a;if(a&&typeof a=="object"){let s=a.message;if(typeof s=="string"&&s)return s}return"Speech failed"}var de=class extends w{constructor(){super(...arguments);this._draft="";this._error=null}static getStubConfig(t){return{type:"custom:silk-say-card",entity:Object.keys(t.states).find(i=>i.startsWith("media_player."))}}static async getConfigElement(){return document.createElement(gp)}setConfig(t){if(!t.entity||O(t.entity)!=="media_player")throw new Error("silk-say-card: `entity` must be a media_player (the speaker to talk through)");if(t.presets!==void 0&&(!Array.isArray(t.presets)||t.presets.some(e=>typeof e!="string")))throw new Error("silk-say-card: `presets` must be a list of phrases");this._config=t,this._clearError()}getCardSize(){return this._config?.presets?.length?3:2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this._errorTimer),this._errorTimer=void 0}_clearError(){window.clearTimeout(this._errorTimer),this._errorTimer=void 0,this._error=null}_fail(t){E(this,"failure"),this._error=t,window.clearTimeout(this._errorTimer),this._errorTimer=window.setTimeout(()=>{this._errorTimer=void 0,this._error=null},_v)}_wash(){if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return;this.renderRoot.querySelector(".wash")?.animate([{opacity:1},{opacity:0}],{duration:yv,easing:"cubic-bezier(0.23, 1, 0.32, 1)"})}async _speak(t){let e=this.hass,i=this._config;if(!e||!i)return;let n=t.trim();if(!n)return;let r=e.states[i.entity];if(!r||b(r))return;let o=wv(e,i.engine);if(!o){this._fail("No TTS engine found \u2014 set `engine` in the card config");return}let c=this._draft;this._clearError(),this._draft="",E(this,"success"),this._wash();let d=i.language?{language:i.language}:{};try{o.startsWith("tts.")?await e.callService("tts","speak",{entity_id:o,media_player_entity_id:i.entity,message:n,...d}):await e.callService("tts",`${o}_say`,{entity_id:i.entity,message:n,...d})}catch(u){this._draft||(this._draft=c),this._fail(xv(u))}}_onCardClick(){this._config&&A(this,this._config.entity)}_onInput(t){this._draft=t.target.value,this._error&&this._clearError()}_onKeydown(t){t.stopPropagation(),t.key==="Enter"&&(t.preventDefault(),this._speak(this._draft))}_onSend(t){t.stopPropagation(),this._speak(this._draft)}_onPreset(t,e){t.stopPropagation(),this._speak(e)}_stop(t){t.stopPropagation()}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=e.states[t.entity];if(!i)return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${t.entity}</div>
        </ha-card>
      `;let n=b(i),r=S(i,t.color),o=t.name??bv,c=i.attributes.friendly_name??t.entity,d=this._draft.trim().length>0&&!n,u=t.presets??[];return l`
      <ha-card
        class="control ${n?"unavailable":""}"
        style="--silk-accent:${r}"
        @click=${this._onCardClick}
      >
        <div class="wash" aria-hidden="true"></div>
        <div class="head">
          <div class="icon ${d?"on":""}">
            <ha-icon .icon=${t.icon??vv}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${o}</div>
            <div class="state">
              <span>${c}</span>
              ${t.language?l`<span class="sep">·</span><span>${t.language}</span>`:m}
            </div>
          </div>
        </div>

        <div class="compose" @click=${this._stop}>
          <input
            class="field"
            type="text"
            autocomplete="off"
            enterkeyhint="send"
            placeholder="Say something…"
            aria-label=${`Message to speak on ${c}`}
            .value=${this._draft}
            .disabled=${n}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
          />
          <button
            class="send ${d?"armed":""}"
            aria-label="Speak"
            .disabled=${!d}
            @click=${this._onSend}
          >
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
        </div>

        ${u.length?l`
              <div class="presets" @click=${this._stop}>
                ${u.map(g=>l`
                    <button
                      class="chip"
                      title=${g}
                      .disabled=${n}
                      @click=${h=>this._onPreset(h,g)}
                    >
                      ${g}
                    </button>
                  `)}
              </div>
            `:m}
        ${this._error?l`<div class="error" role="alert" title=${this._error}>${this._error}</div>`:m}
      </ha-card>
    `}};de.styles=[T,k`
      /* Compose surface: it grows past its grid allotment rather than clipping
         the field or the preset row. */
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 8px;
        height: auto;
        min-height: 100%;
      }
      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      /* The header icon is an indicator, not a control — the send button is. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .wash {
        position: absolute;
        inset: 0;
        z-index: 0;
        opacity: 0;
        pointer-events: none;
        background: color-mix(in srgb, var(--silk-accent) 18%, transparent);
      }
      .compose {
        flex: none;
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        cursor: default;
      }
      .field {
        flex: 1;
        min-width: 0;
        height: 38px;
        box-sizing: border-box;
        border: none;
        border-radius: 12px;
        padding: 0 12px;
        font: inherit;
        font-size: 13.5px;
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.06);
        outline: none;
        text-overflow: ellipsis;
        transition: box-shadow 200ms ease;
      }
      .field::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.85;
      }
      .field:focus {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--silk-accent) 55%, transparent);
      }
      .field:disabled {
        cursor: default;
      }
      .send {
        flex: none;
        position: relative;
        width: 38px;
        height: 38px;
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
      .send:active:not(:disabled) {
        transform: scale(0.9);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      /* Invisible halo lifts the 38px button past the 40px touch floor. */
      .send::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 14px;
      }
      .send.armed {
        color: var(--silk-accent);
        background: color-mix(in srgb, var(--silk-accent) 20%, transparent);
      }
      .send:disabled {
        cursor: default;
      }
      .send:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .send ha-icon {
        --mdc-icon-size: 19px;
        pointer-events: none;
      }
      .presets {
        flex: none;
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        cursor: default;
      }
      .chip {
        position: relative;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Invisible halo lifts the chip toward the 36px secondary-target floor. */
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
      .error {
        flex: none;
        position: relative;
        z-index: 1;
        font-size: 12px;
        line-height: 1.3;
        color: var(--error-color, #db4437);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .compose,
      .unavailable .presets {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],de.prototype,"hass",2),p([f()],de.prototype,"_config",2),p([f()],de.prototype,"_draft",2),p([f()],de.prototype,"_error",2),de=p([x("silk-say-card")],de);var vp={type:"silk-qr-card",name:"Silk QR",description:"A scannable code, generated on the spot."},kv=10,Qs=4,er=[[10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],[16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44]],$v=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]],bp=0,qn=new Uint8Array(512),Js=new Uint8Array(256);(()=>{let a=1;for(let s=0;s<255;s++)qn[s]=a,Js[a]=s,a<<=1,a&256&&(a^=285);for(let s=255;s<512;s++)qn[s]=qn[s-255]})();function tr(a,s){return a===0||s===0?0:qn[Js[a]+Js[s]]}function Tv(a){let s=new Uint8Array(a);s[a-1]=1;let t=1;for(let e=0;e<a;e++){for(let i=0;i<a;i++)s[i]=tr(s[i],t),i+1<a&&(s[i]^=s[i+1]);t=tr(t,2)}return s}function Ev(a,s){let t=s.length,e=new Uint8Array(t);for(let i=0;i<a.length;i++){let n=a[i]^e[0];e.copyWithin(0,1),e[t-1]=0;for(let r=0;r<t;r++)e[r]^=tr(s[r],n)}return e}var pe=(a,s)=>(a>>>s&1)!==0;function Cv(a){for(let s=1;s<=kv;s++){let[,t,e,i,n]=er[s-1];if(4+(s<10?8:16)+a*8<=(t*e+i*n)*8)return s}return 0}function Av(a,s,t){let e=[],i=(c,d)=>{for(let u=d-1;u>=0;u--)e.push(c>>>u&1)};i(4,4),i(a.length,s<10?8:16);for(let c=0;c<a.length;c++)i(a[c],8);let n=t*8;for(let c=0;c<4&&e.length<n;c++)e.push(0);for(;e.length%8!==0;)e.push(0);let r=new Uint8Array(t);for(let c=0;c<e.length;c++)r[c>>>3]|=e[c]<<7-(c&7);let o=236;for(let c=e.length/8;c<t;c++)r[c]=o,o=o===236?17:236;return r}function Sv(a,s){let[t,e,i,n,r]=er[s-1],o=Tv(t),c=[],d=[],u=0;for(let _=0;_<e+n;_++){let $=_<e?i:r,M=a.subarray(u,u+$);u+=$,c.push(M),d.push(Ev(M,o))}let g=new Uint8Array(a.length+t*c.length),h=0,v=Math.max(i,n>0?r:0);for(let _=0;_<v;_++)for(let $ of c)_<$.length&&(g[h++]=$[_]);for(let _=0;_<t;_++)for(let $ of d)g[h++]=$[_];return g}function Mv(a,s){let t=a*4+17,e=Array.from({length:t},()=>new Array(t).fill(!1)),i=Array.from({length:t},()=>new Array(t).fill(!1)),n=(h,v,_)=>{h<0||v<0||h>=t||v>=t||(e[v][h]=_,i[v][h]=!0)};for(let h=0;h<t;h++)n(6,h,h%2===0),n(h,6,h%2===0);let r=(h,v)=>{for(let _=-4;_<=4;_++)for(let $=-4;$<=4;$++){let M=Math.max(Math.abs($),Math.abs(_));n(h+$,v+_,M!==2&&M!==4)}};r(3,3),r(t-4,3),r(3,t-4);let o=$v[a-1];for(let h=0;h<o.length;h++)for(let v=0;v<o.length;v++)if(!(h===0&&v===0||h===0&&v===o.length-1||h===o.length-1&&v===0))for(let $=-2;$<=2;$++)for(let M=-2;M<=2;M++)n(o[h]+M,o[v]+$,Math.max(Math.abs(M),Math.abs($))!==1);let c=bp;for(let h=0;h<10;h++)c=c<<1^(c>>>9)*1335;let d=(bp<<10|c)^21522;for(let h=0;h<=5;h++)n(8,h,pe(d,h));n(8,7,pe(d,6)),n(8,8,pe(d,7)),n(7,8,pe(d,8));for(let h=9;h<15;h++)n(14-h,8,pe(d,h));for(let h=0;h<8;h++)n(t-1-h,8,pe(d,h));for(let h=8;h<15;h++)n(8,t-15+h,pe(d,h));if(n(8,t-8,!0),a>=7){let h=a;for(let _=0;_<12;_++)h=h<<1^(h>>>11)*7973;let v=a<<12|h;for(let _=0;_<18;_++){let $=pe(v,_),M=t-11+_%3,P=Math.floor(_/3);n(M,P,$),n(P,M,$)}}let u=0,g=s.length*8;for(let h=t-1;h>=1;h-=2){h===6&&(h=5);for(let v=0;v<t;v++)for(let _=0;_<2;_++){let $=h-_,P=(h+1&2)===0?t-1-v:v;i[P][$]||u>=g||(e[P][$]=pe(s[u>>>3],7-(u&7)),u++)}}for(let h=0;h<t;h++)for(let v=0;v<t;v++)!i[h][v]&&(v+h)%2===0&&(e[h][v]=!e[h][v]);return e}function Pv(a){let s=new TextEncoder().encode(a),t=Cv(s.length);if(t===0)return null;let[,e,i,n,r]=er[t-1],o=Av(s,t,e*i+n*r);return Mv(t,Sv(o,t))}var Rv=["WPA","WEP","nopass"];function Ov(a){let s=i=>i.replace(/([\\;,:"])/g,"\\$1"),t=a.encryption??"WPA",e=`WIFI:T:${t};S:${s(a.ssid)};`;return t!=="nopass"&&a.password&&(e+=`P:${s(a.password)};`),a.hidden&&(e+="H:true;"),`${e};`}var _p="silk-qr-card-editor";C(_p,[{name:"name",selector:{text:{}}},{name:"text",selector:{text:{}}},{name:"entity",selector:{entity:{}}}],{name:"Caption",text:"Text",entity:"Entity (encodes its state)"});var _i=class extends w{constructor(){super(...arguments);this._encoded="";this._matrix=null;this._tooLong=!1}static getStubConfig(){return{type:"custom:silk-qr-card",text:"https://www.home-assistant.io"}}static async getConfigElement(){return document.createElement(_p)}setConfig(t){let e=typeof t.text=="string"&&t.text!=="",i=typeof t.entity=="string"&&t.entity!=="",n=t.wifi!==void 0;if(t.text!==void 0&&typeof t.text!="string")throw new Error("silk-qr-card: `text` must be a string");if(t.entity!==void 0&&typeof t.entity!="string")throw new Error("silk-qr-card: `entity` must be an entity id");if([e,i,n].filter(Boolean).length!==1)throw new Error("silk-qr-card: set exactly one of `text`, `entity` or `wifi`");if(n){let r=t.wifi;if(typeof r!="object"||r===null||!r.ssid)throw new Error("silk-qr-card: `wifi` needs an `ssid`");if(r.encryption!==void 0&&!Rv.includes(r.encryption))throw new Error("silk-qr-card: `wifi.encryption` must be WPA, WEP or nopass")}this._config=t}getCardSize(){return 3}getGridOptions(){return{columns:3,rows:3,min_columns:2,min_rows:2}}willUpdate(){this._sync(this._payload())}_payload(){let t=this._config;if(!t)return"";if(t.wifi)return Ov(t.wifi);if(t.entity){let e=this.hass?.states[t.entity];return!e||b(e)?"":e.state}return t.text??""}_sync(t){if(t===this._encoded)return;if(this._encoded=t,!t){this._matrix=null,this._tooLong=!1;return}let e=null;try{e=Pv(t)}catch(i){console.warn("silk-qr-card: encoding failed",i)}this._matrix=e,this._tooLong=e===null}_onCardClick(){this._config?.entity&&A(this,this._config.entity)}_renderCode(t,e){let i=t.length,n=i+Qs*2,r=[];for(let o=0;o<i;o++){let c=t[o],d=0;for(;d<i;){if(!c[d]){d++;continue}let u=1;for(;d+u<i&&c[d+u];)u++;r.push(j`<rect x=${d+Qs} y=${o+Qs} width=${u} height="1"></rect>`),d+=u}}return l`
      <svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label=${e}>
        <rect class="quiet" x="0" y="0" width=${n} height=${n}></rect>
        <g class="modules">${r}</g>
      </svg>
    `}render(){let t=this._config;if(!t)return m;let e=t.entity?this.hass?.states[t.entity]:void 0;if(t.entity&&this.hass&&!e)return l`<ha-card><div class="warning">Entity not found: ${t.entity}</div></ha-card>`;let i=t.entity?b(e):!1,n=S(e,t.color),r=t.name??t.wifi?.ssid,o=t.wifi?`QR code for Wi-Fi network ${t.wifi.ssid}`:r?`QR code: ${r}`:"QR code";return l`
      <ha-card
        class=${i?"unavailable":""}
        style="--silk-accent:${n}"
        @click=${this._onCardClick}
      >
        <div class="code">
          ${this._matrix?this._renderCode(this._matrix,o):l`<div class="note">
                ${this._tooLong?"Text too long for a QR code":"Nothing to encode"}
              </div>`}
        </div>
        ${r?l`<div class="caption" title=${r}>${r}</div>`:m}
      </ha-card>
    `}};_i.styles=[T,k`
      /* Inert unless an entity is behind it — then the card opens more-info. */
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        cursor: default;
      }
      .code {
        flex: 1;
        width: 100%;
        min-height: 0;
        display: grid;
        place-items: center;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        animation: silk-qr-in 250ms var(--silk-ease-out);
      }
      /* Light modules are the card surface; dark modules are the text color,
         so the symbol inverts with the theme — scanners read either polarity. */
      .quiet {
        fill: var(--ha-card-background, var(--card-background-color, #fff));
      }
      .modules rect {
        fill: var(--primary-text-color);
      }
      .caption {
        flex: none;
        max-width: 100%;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        text-align: center;
        padding: 0 8px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .code,
      .unavailable .caption {
        opacity: 0.45;
      }
      @keyframes silk-qr-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `],p([y({attribute:!1})],_i.prototype,"hass",2),p([f()],_i.prototype,"_config",2),_i=p([x("silk-qr-card")],_i);var yp={type:"silk-photo-card",name:"Silk Photo",description:"A quiet frame for your pictures."},wp=30,Hv=400,xp="silk-photo-card-editor";C(xp,[{name:"",type:"grid",schema:[{name:"interval",selector:{number:{min:1,mode:"box"}}},{name:"fit",selector:{select:{mode:"dropdown",options:[{value:"cover",label:"Fill the frame"},{value:"contain",label:"Fit inside"}]}}}]},{name:"caption",selector:{boolean:{}}}],{interval:"Seconds per photo",fit:"Framing",caption:"Show caption"},{interval:wp,fit:"cover",caption:!1});var ct=class extends w{constructor(){super(...arguments);this._slides=[];this._srcA="";this._srcB="";this._top=0;this._topShown=!1;this._failed=new Set;this._shownPos=-1;this._pos=-1;this._lastAdvance=0;this._onVisibility=()=>{document.hidden?this._clearTimer():this._schedule()}}static getStubConfig(t){let e=Object.keys(t.states),i=e.find(n=>n.startsWith("image."))??e.find(n=>n.startsWith("camera."));return i?{type:"custom:silk-photo-card",entities:[i]}:{type:"custom:silk-photo-card",images:["/local/photo.jpg"]}}static async getConfigElement(){return document.createElement(xp)}setConfig(t){let e=t.entities??[],i=t.images??[];if(!Array.isArray(e)||!Array.isArray(i))throw new Error("silk-photo-card: `entities` and `images` must be lists");if(e.length+i.length===0)throw new Error("silk-photo-card: give it something to show \u2014 `entities` (image./camera.) or `images` (urls)");for(let r of e)if(typeof r!="string"||!r.includes("."))throw new Error(`silk-photo-card: \`${String(r)}\` is not an entity id`);for(let r of i)if(typeof r!="string"||r==="")throw new Error("silk-photo-card: `images` entries must be non-empty urls");if(t.interval!==void 0&&!(Number(t.interval)>0))throw new Error("silk-photo-card: `interval` must be a positive number of seconds");if(t.fit!==void 0&&t.fit!=="cover"&&t.fit!=="contain")throw new Error("silk-photo-card: `fit` must be 'cover' or 'contain'");this._config=t;let n=[...e.map(r=>({entity:r})),...i.map(r=>({url:r}))];this._slides=t.shuffle?Nv(n):n,this._pos=-1,this._shownPos=-1,this._srcA="",this._srcB="",this._top=0,this._topShown=!1,this._failed=new Set,this._pending=void 0,this._lastAdvance=0,this.isConnected&&this._schedule()}getCardSize(){return 4}getGridOptions(){return{columns:6,rows:4,min_columns:3,min_rows:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._schedule()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._clearTimer()}willUpdate(t){if(!this._config||this._slides.length===0)return;if(this._pos<0){this._advance(),this._schedule();return}if(!t.has("hass")||this._pending)return;let e=this._resolve(this._slides[this._pos]);e&&!this._failed.has(e)&&this._show(e,this._pos)}_intervalMs(){return Math.max(1,Number(this._config?.interval??wp))*1e3}_clearTimer(){window.clearTimeout(this._timer),this._timer=void 0}_schedule(){if(this._clearTimer(),document.hidden||!this.isConnected||this._slides.length<2)return;let t=Math.max(0,this._intervalMs()-(Date.now()-this._lastAdvance));this._timer=window.setTimeout(()=>{this._advance(),this._schedule()},t)}_resolve(t){if(!t)return;if(t.url)return t.url;if(!t.entity)return;let e=this.hass?.states[t.entity];if(!e||b(e))return;let i=e.attributes.entity_picture;return typeof i=="string"&&i!==""?i:void 0}_advance(){let t=this._slides.length;if(t!==0){this._lastAdvance=Date.now();for(let e=1;e<=t;e++){let i=(this._pos+e)%t,n=this._resolve(this._slides[i]);if(n&&!this._failed.has(n)){this._pos=i,this._show(n,i);return}}}}_srcOf(t){return t===0?this._srcA:this._srcB}_show(t,e){let i=this._topShown?this._srcOf(this._top):this._srcOf(this._top===0?1:0);if(t===i){this._shownPos=e;return}if(this._pending?.src===t)return;let n=this._topShown?this._top===0?1:0:this._top;this._pending={src:t,layer:n,pos:e},this._top=n,this._topShown=!1,n===0?this._srcA=t:this._srcB=t}_onLoad(t,e){let i=this._pending;!i||i.layer!==t||i.src!==e||(this._pending=void 0,this._topShown=!0,this._shownPos=i.pos)}_onError(t,e){let i=this._pending;!i||i.layer!==t||i.src!==e||(this._pending=void 0,this._failed=new Set(this._failed).add(e),this._advance())}_onTap(){E(this),this._advance(),this._schedule()}_onKeydown(t){t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._onTap())}_labelOf(t){if(!t)return"";if(t.entity)return this.hass?.states[t.entity]?.attributes.friendly_name??t.entity;let e=(t.url??"").split(/[?#]/)[0].split("/").pop()??"",i=e;try{i=decodeURIComponent(e)}catch{}return i.replace(/\.[a-z0-9]+$/i,"")}_renderLayer(t,e,i){let n=this._srcOf(t);if(!n)return m;let r=t===this._top,o=r?this._topShown:!0;return l`<img
      class="slide ${e} ${r?"top":""} ${o?"shown":""}"
      src=${n}
      alt=${i}
      decoding="async"
      draggable="false"
      @load=${()=>this._onLoad(t,n)}
      @error=${()=>this._onError(t,n)}
    />`}render(){let t=this._config;if(!t)return m;let e=t.fit??"cover",i=this._top===0?1:0,n=!this._topShown&&!this._srcOf(i),r=this._shownPos>=0?this._labelOf(this._slides[this._shownPos]):"",o=t.caption===!0&&!n&&r!=="";return l`
      <ha-card
        class=${n?"unavailable":""}
        role="button"
        tabindex="0"
        aria-label=${r?`Photo: ${r}. Next photo`:"Next photo"}
        @click=${this._onTap}
        @keydown=${this._onKeydown}
      >
        ${this._renderLayer(0,e,r)} ${this._renderLayer(1,e,r)}
        ${o?l`<div class="scrim"><div class="caption">${r}</div></div>`:m}
        ${n&&!this._pending?l`
              <div class="fallback">
                <ha-icon icon="mdi:image-outline"></ha-icon>
                <div class="fallback-text">No photo</div>
              </div>
            `:m}
      </ha-card>
    `}};ct.styles=[T,k`
      /* Full-bleed frame: drop the base row layout. The aspect-ratio only
         applies where the layout gives no definite height (masonry); in grid
         sections the assigned rows win. */
      ha-card {
        display: block;
        padding: 0;
        aspect-ratio: 4 / 3;
        background-color: var(--card-background-color, #fff);
      }
      ha-card:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .slide {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        user-select: none;
        /* Invisible until it has loaded — the photo underneath keeps the frame. */
        opacity: 0;
        z-index: 0;
      }
      .slide.cover {
        object-fit: cover;
      }
      .slide.contain {
        object-fit: contain;
      }
      .slide.shown {
        opacity: 1;
      }
      .slide.top {
        z-index: 1;
      }
      /* Only the incoming photo animates; the outgoing one stays opaque below,
         so the crossfade never lets the card background bleed through. */
      .slide.top.shown {
        animation: silk-photo-fade ${Hv}ms ease;
      }
      @keyframes silk-photo-fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      /* Photo-legibility scrim (allowed: it serves the image, not chrome). */
      .scrim {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2;
        padding: 28px 12px 10px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
        pointer-events: none;
      }
      .caption {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fallback {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px;
        box-sizing: border-box;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.04);
        color: var(--secondary-text-color);
      }
      .fallback ha-icon {
        --mdc-icon-size: 28px;
      }
      .fallback-text {
        font-size: 12.5px;
        line-height: 1.3;
      }
      .unavailable .fallback {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],ct.prototype,"hass",2),p([f()],ct.prototype,"_config",2),p([f()],ct.prototype,"_slides",2),p([f()],ct.prototype,"_srcA",2),p([f()],ct.prototype,"_srcB",2),p([f()],ct.prototype,"_top",2),p([f()],ct.prototype,"_topShown",2),p([f()],ct.prototype,"_failed",2),p([f()],ct.prototype,"_shownPos",2),ct=p([x("silk-photo-card")],ct);function Nv(a){let s=a.slice();for(let t=s.length-1;t>0;t--){let e=Math.floor(Math.random()*(t+1));[s[t],s[e]]=[s[e],s[t]]}return s}var Tp={type:"silk-world-clock-card",name:"Silk World Clock",description:"Every timezone that matters to you."},kp=6,$p=6e4,Lv=6,Iv=21,Fv=864e5,Dv=3,Ep="silk-world-clock-card-editor";C(Ep,[{name:"show_date",selector:{boolean:{}}},{name:"hour12",selector:{boolean:{}}}],{show_date:"Show each local date",hour12:"12-hour time"},{show_date:!1});var Qe=class extends w{constructor(){super(...arguments);this._now=new Date;this._fmtKey="";this._fmts=[];this._onVisibility=()=>{document.hidden?this._stopTicking():this._startTicking()}}static getStubConfig(){return{type:"custom:silk-world-clock-card",zones:[{label:"New York",tz:"America/New_York",flag:"NY"},{label:"London",tz:"Europe/London",flag:"LDN"}]}}static async getConfigElement(){return document.createElement(Ep)}setConfig(t){if(!Array.isArray(t.zones)||t.zones.length===0)throw new Error("silk-world-clock-card: `zones` is required \u2014 1-6 of {label, tz} (tz is an IANA name)");if(t.zones.length>kp)throw new Error(`silk-world-clock-card: at most ${kp} \`zones\``);t.zones.forEach((e,i)=>{if(!e||typeof e.label!="string"||e.label==="")throw new Error(`silk-world-clock-card: zones[${i}] needs a \`label\``);if(typeof e.tz!="string"||e.tz==="")throw new Error(`silk-world-clock-card: zones[${i}] needs a \`tz\` (e.g. America/New_York)`);if(e.flag!==void 0&&typeof e.flag!="string")throw new Error(`silk-world-clock-card: zones[${i}].flag must be a short text badge`)}),this._config=t,this._fmtKey="",this._now=new Date}getCardSize(){return Math.max(2,Math.ceil((this._config?.zones.length??2)/2))}getGridOptions(){return{columns:6,rows:2,min_columns:3,min_rows:1}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startTicking()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopTicking()}_startTicking(){this._stopTicking(),!document.hidden&&(this._now=new Date,this._scheduleTick())}_scheduleTick(){let t=$p-Date.now()%$p+20;this._tickTimer=window.setTimeout(()=>{this._now=new Date,this._scheduleTick()},t)}_stopTicking(){window.clearTimeout(this._tickTimer),this._tickTimer=void 0}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_hour12(){if(typeof this._config?.hour12=="boolean")return this._config.hour12;let t=this.hass?.locale?.time_format;if(t==="12")return!0;if(t==="24")return!1}_buildFormatters(t,e,i,n){try{let r={timeZone:t,hour:"2-digit",minute:"2-digit"};return i!==void 0&&(r.hour12=i),{valid:!0,parts:new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"numeric",day:"numeric",hour:"numeric",hourCycle:"h23"}),time:new Intl.DateTimeFormat(e,r),date:n?new Intl.DateTimeFormat(e,{timeZone:t,weekday:"short",month:"short",day:"numeric"}):void 0}}catch{return{valid:!1}}}_ensureFormatters(t){let e=this._locale(),i=this._hour12(),n=t.show_date===!0,r=`${e}|${String(i)}|${n?1:0}|${t.zones.map(o=>o.tz).join(",")}`;r===this._fmtKey&&this._fmts.length===t.zones.length||(this._fmtKey=r,this._fmts=t.zones.map(o=>this._buildFormatters(o.tz,e,i,n)))}_readout(t,e,i){if(!t.valid||!t.parts||!t.time)return null;try{let n=NaN,r=NaN,o=NaN,c=NaN;for(let g of t.parts.formatToParts(e)){let h=Number(g.value);g.type==="year"?n=h:g.type==="month"?r=h:g.type==="day"?o=h:g.type==="hour"&&(c=h)}if(![n,r,o,c].every(Number.isFinite))return null;let d=t.time.formatToParts(e);return{time:d.filter(g=>g.type!=="dayPeriod").map(g=>g.value).join("").trim(),meridiem:d.find(g=>g.type==="dayPeriod")?.value,date:t.date?.format(e),offset:Math.round((Date.UTC(n,r-1,o)-i)/Fv),night:c<Lv||c>=Iv}}catch{return null}}_renderBadge(t){let e=t?Array.from(t.trim()).slice(0,Dv).join(""):"";return e?l`<span class="badge">${e}</span>`:m}_renderRow(t,e,i){let n=this._readout(e,this._now,i);if(!n)return l`
        <div class="row">
          <ha-icon class="sky bad" icon="mdi:alert-circle-outline"></ha-icon>
          <div class="info">
            <div class="lead">
              <span class="label">${t.label}</span>${this._renderBadge(t.flag)}
            </div>
          </div>
          <div class="right"><span class="bad">Invalid timezone</span></div>
        </div>
      `;let r=n.offset>0?`+${n.offset}`:`\u2212${Math.abs(n.offset)}`;return l`
      <div class="row ${n.night?"night":"day"}">
        <ha-icon
          class="sky"
          .icon=${n.night?"mdi:weather-night":"mdi:weather-sunny"}
          aria-hidden="true"
        ></ha-icon>
        <div class="info">
          <div class="lead">
            <span class="label" title=${t.label}>${t.label}</span>${this._renderBadge(t.flag)}
          </div>
          ${n.date?l`<div class="zdate">${n.date}</div>`:m}
        </div>
        <div class="right">
          <span class="ztime">${n.time}</span>
          ${n.meridiem?l`<span class="meri">${n.meridiem}</span>`:m}
          ${n.offset!==0?l`<span class="offset" title=${n.offset>0?"Next day":"Previous day"}
                >${r}</span
              >`:m}
        </div>
      </div>
    `}render(){let t=this._config;if(!t)return m;this._ensureFormatters(t);let e=this._now,i=Date.UTC(e.getFullYear(),e.getMonth(),e.getDate());return l`
      <ha-card>
        ${t.zones.map((n,r)=>this._renderRow(n,this._fmts[r]??{valid:!1},i))}
      </ha-card>
    `}};Qe.styles=[T,k`
      ha-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        gap: 2px;
        padding: 8px 14px;
        cursor: default;
      }
      .row {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 30px;
      }
      .sky {
        flex: none;
        --mdc-icon-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--silk-accent);
        transition: color 200ms ease, opacity 200ms ease;
      }
      /* Night is the absence of light, not another color: the sun's accent
         drops to a dim monochrome moon. */
      .row.night .sky {
        color: var(--primary-text-color);
        opacity: 0.45;
      }
      .sky.bad {
        color: var(--error-color, #db4437);
        opacity: 1;
      }
      .info {
        flex: 1;
        min-width: 0;
      }
      .lead {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .label {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        padding: 3px 5px;
        border-radius: 5px;
        white-space: nowrap;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
      }
      .zdate {
        font-size: 11px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .right {
        flex: none;
        display: flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
      }
      .ztime {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.25;
        color: var(--primary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .meri {
        font-size: 11px;
        font-weight: 500;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .offset {
        font-size: 10px;
        line-height: 1;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .bad {
        font-size: 12.5px;
        color: var(--error-color, #db4437);
        white-space: nowrap;
      }
    `],p([y({attribute:!1})],Qe.prototype,"hass",2),p([f()],Qe.prototype,"_config",2),p([f()],Qe.prototype,"_now",2),Qe=p([x("silk-world-clock-card")],Qe);var Cp={type:"silk-printer-card",name:"Silk Printer",description:"Your 3D print, start to finish."},Gn="3D Printer",zv="mdi:printer-3d-nozzle",Uv=1e4,jv=2e3,Vv=3,qv=new Set(["idle","standby","off","ready","none","unknown","unavailable","operational",""]),Gv=new Set(["printing","running","busy","print","working","on"]),Wv=new Set(["h","hr","hrs","hour","hours"]),Bv=new Set(["min","mins","minute","minutes"]),Kv=new Set(["s","sec","secs","second","seconds"]);function Wn(a){let s=Math.max(0,Math.round(a)),t=Math.floor(s/60),e=s%60;return t>0?`${t}h ${e}m left`:`${e}m left`}function Yv(a,s){let t=s.trim().toLowerCase();if(Wv.has(t))return Wn(a*60);if(Bv.has(t))return Wn(a);if(Kv.has(t)){let i=Math.max(0,Math.round(a));return i>=3600?Wn(i/60):`${Math.floor(i/60)}:${String(i%60).padStart(2,"0")} left`}let e=Math.round(a*10)/10;return s?`${e} ${s} left`:`${e} left`}function Xv(a){let s=/^(\d+):([0-5]\d):([0-5]\d)$/.exec(a.trim());return s?(Number(s[1])*3600+Number(s[2])*60+Number(s[3]))/60:null}function ir(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}var Zv=a=>a.length?a.charAt(0).toUpperCase()+a.slice(1):a,Qv=a=>a.toLowerCase().replace(/[\s-]+/g,"_"),Ap="silk-printer-card-editor";C(Ap,[{name:"name",selector:{text:{}}},{name:"status",selector:{entity:{domain:["sensor","binary_sensor"]}}},{name:"",type:"grid",schema:[{name:"progress",selector:{entity:{domain:["sensor","number"]}}},{name:"remaining",selector:{entity:{domain:["sensor"]}}},{name:"nozzle",selector:{entity:{domain:["sensor","number"]}}},{name:"nozzle_target",selector:{entity:{domain:["sensor","number"]}}},{name:"bed",selector:{entity:{domain:["sensor","number"]}}},{name:"bed_target",selector:{entity:{domain:["sensor","number"]}}}]},{name:"camera",selector:{entity:{domain:["camera"]}}},{name:"",type:"grid",schema:[{name:"pause",selector:{entity:{domain:["button","input_button"]}}},{name:"stop",selector:{entity:{domain:["button","input_button"]}}}]},{name:"icon",selector:{icon:{}}}],{name:"Name",status:"Print state",progress:"Progress (%)",remaining:"Time remaining",nozzle:"Nozzle temperature",nozzle_target:"Nozzle target",bed:"Bed temperature",bed_target:"Bed target",camera:"Camera",pause:"Pause button",stop:"Stop button",icon:"Icon"},{name:Gn});var zt=class extends w{constructor(){super(...arguments);this._counter=0;this._broken=!1;this._pending=null;this._pendingBase="";this._onVisibility=()=>{document.hidden?this._stopSnapshots():(this._bump(),this._startSnapshots())}}static getStubConfig(t){let e=Object.keys(t.states),i=e.find(o=>o.startsWith("sensor.")&&/print|job/.test(o)&&t.states[o].attributes.unit_of_measurement==="%"),n=e.find(o=>o.startsWith("sensor.")&&/print.*(state|status|stage)/.test(o)),r=e.find(o=>o.startsWith("camera.")&&/print|chamber/.test(o));return{type:"custom:silk-printer-card",name:Gn,status:n,progress:i,camera:r}}static async getConfigElement(){return document.createElement(Ap)}setConfig(t){if(!t.status&&!t.progress&&!t.remaining&&!t.nozzle&&!t.bed&&!t.camera)throw new Error("silk-printer-card: configure at least one of `status`, `progress`, `remaining`, `nozzle`, `bed` or `camera`");if(t.camera!==void 0&&O(t.camera)!=="camera")throw new Error("silk-printer-card: `camera` must be a camera entity (e.g. camera.printer)");this._config=t,this._broken=!1,this._clearPending(),this.isConnected&&this._startSnapshots()}getCardSize(){return 3}getGridOptions(){return{columns:6,rows:3,min_columns:4,min_rows:2}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._startSnapshots()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibility),this._stopSnapshots(),window.clearTimeout(this._pendingTimer),this._pendingTimer=void 0}willUpdate(t){if(!t.has("hass")||this._pending===null||!this._config?.status)return;let e=this.hass?.states[this._config.status];e&&e.last_updated!==this._pendingBase&&this._clearPending()}_bump(){this._counter++,this._broken=!1}_startSnapshots(){this._stopSnapshots(),!(!this._config?.camera||document.hidden)&&(this._snapshotTimer=window.setInterval(()=>this._bump(),Uv))}_stopSnapshots(){window.clearInterval(this._snapshotTimer),this._snapshotTimer=void 0}_clearPending(){window.clearTimeout(this._pendingTimer),this._pendingTimer=void 0,this._pending=null}_tracked(){let t=this._config;return t?[t.status,t.progress,t.remaining,t.nozzle,t.nozzle_target,t.bed,t.bed_target,t.camera].filter(e=>typeof e=="string"&&e!==""):[]}_primaryEntity(){let t=this._config;if(t)return t.progress??t.status??t.remaining??t.camera??t.nozzle??t.bed}_remainingText(){let t=this._config?.remaining;if(!t||!this.hass)return;let e=this.hass.states[t];if(!e||b(e)||e.state==="")return;let i=Number(e.state);if(Number.isFinite(i))return Yv(i,String(e.attributes.unit_of_measurement??""));let n=Xv(e.state);return n===null?void 0:Wn(n)}_reading(t,e){let i=this.hass;if(!i||!t)return null;let n=ir(i.states[t]);return Number.isFinite(n)?{current:n,target:e?ir(i.states[e]):NaN}:null}_onCardClick(){let t=this._primaryEntity();t&&A(this,t)}_onCameraClick(t){t.stopPropagation(),this._config?.camera&&A(this,this._config.camera)}_onSnapshotError(){this._broken=!0}_onPauseClick(t){t.stopPropagation();let e=this._config?.pause;e&&this._press(e,"Pausing\u2026","light")}_onStopClick(t){t.stopPropagation();let e=this._config;if(!e?.stop)return;let i=e.name??Gn;window.confirm(`Stop the print on ${i}?`)&&this._press(e.stop,"Stopping\u2026","warning")}_press(t,e,i){let n=this.hass;if(!n)return;let r=n.states[t];!r||b(r)||(E(this,i),this._pending=e,this._pendingBase=this._config?.status?n.states[this._config.status]?.last_updated??"":"",window.clearTimeout(this._pendingTimer),this._pendingTimer=window.setTimeout(()=>this._clearPending(),jv),n.callService(O(t),"press",{entity_id:t}))}_renderCamera(){let t=this._config?.camera;if(!t||!this.hass)return m;let e=this.hass.states[t],i=e?.attributes.entity_picture,r=e!==void 0&&!b(e)&&typeof i=="string"&&i!==""&&!this._broken?`${i}${i.includes("?")?"&":"?"}counter=${this._counter}`:void 0,o=String(e?.attributes.friendly_name??t);return l`
      <button class="cam" aria-label=${`Show ${o} live view`} @click=${this._onCameraClick}>
        ${r!==void 0?l`<img src=${r} alt=${o} @error=${this._onSnapshotError} />`:l`<div class="camoff"><ha-icon icon="mdi:video-off"></ha-icon></div>`}
      </button>
    `}_renderTemp(t,e){if(!e)return m;let i=Number.isFinite(e.target)&&e.target>0,n=i&&Math.abs(e.current-e.target)>Vv;return l`
      <div class="temp">
        <span class="tlabel">${t}</span>
        <span class="tval ${n?"hot":""}"
          >${Math.round(e.current)}${i?"":"\xB0"}</span
        >
        ${i?l`<span class="ttarget">→ ${Math.round(e.target)}°</span>`:m}
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._primaryEntity();if(i&&!e.states[i])return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${i}</div>
        </ha-card>
      `;let n=t.status?e.states[t.status]:void 0,r=t.progress?e.states[t.progress]:void 0,o=this._tracked(),c=o.length>0&&o.every(Z=>b(e.states[Z])),d=ir(r),u=Number.isFinite(d),g=u?R(d,0,100):0,h=n&&!b(n)?Qv(n.state):"",v=n?qv.has(h):!u||g<=0,_=n?Gv.has(h)||h.includes("printing"):u&&g>0&&g<100,$=S(r??n,t.color),M=t.name??Gn,P=this._pending??(n&&!b(n)?Zv(I(e,n)):_?"Printing":"Idle"),L=v?void 0:this._remainingText(),H=this._reading(t.nozzle,t.nozzle_target),z=this._reading(t.bed,t.bed_target),V=H!==null||z!==null,F=!!t.pause||!!t.stop,q=t.pause?e.states[t.pause]:void 0,B=t.stop?e.states[t.stop]:void 0,X=c||v||!u||g<=0;return l`
      <ha-card
        class="control ${c?"unavailable":""}"
        style="--silk-accent:${$}"
        @click=${this._onCardClick}
      >
        ${this._renderCamera()}
        <div class="top">
          <div class="icon ${_&&!c?"on":""}">
            <ha-icon .icon=${t.icon??zv}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${M}</div>
            <div class="state">
              ${P}${L?l`<span class="sep">·</span>${L}`:m}
            </div>
          </div>
          ${t.progress?l`
                <div class="trailing">
                  <span class="value">${u?`${Math.round(g)}%`:"\u2014"}</span>
                </div>
              `:m}
        </div>
        ${V||F?l`
              <div class="row2">
                <div class="temps">
                  ${this._renderTemp("Nozzle",H)}${this._renderTemp("Bed",z)}
                </div>
                ${F?l`
                      <div class="ctls">
                        ${t.pause?l`
                              <button
                                class="ctl"
                                ?disabled=${b(q)}
                                aria-label=${`Pause ${M}`}
                                @click=${this._onPauseClick}
                              >
                                <ha-icon icon="mdi:pause"></ha-icon>
                              </button>
                            `:m}
                        ${t.stop?l`
                              <button
                                class="ctl"
                                ?disabled=${b(B)}
                                aria-label=${`Stop the print on ${M}`}
                                @click=${this._onStopClick}
                              >
                                <ha-icon icon="mdi:stop"></ha-icon>
                              </button>
                            `:m}
                      </div>
                    `:m}
              </div>
            `:m}
        <div class="track ${X?"hidden":""}" aria-hidden="true">
          <div class="bar" style="width:${g.toFixed(2)}%"></div>
        </div>
      </ha-card>
    `}};zt.styles=[T,k`
      ha-card {
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
      /* The buttons own the controls, so the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      .value {
        font-size: 22px;
        letter-spacing: -0.02em;
      }
      /* Snapshot strip, bled to the card edges; it shrinks before the rows do. */
      .cam {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        margin: -12px -12px 0;
        padding: 0;
        border: none;
        display: block;
        width: auto;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        cursor: pointer;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.05);
      }
      .cam:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: -2px;
      }
      .cam img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .camoff {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: var(--secondary-text-color);
      }
      .camoff ha-icon {
        --mdc-icon-size: 22px;
      }
      .row2 {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .temps {
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: 14px;
        min-width: 0;
        overflow: hidden;
      }
      .temp {
        display: flex;
        align-items: baseline;
        gap: 4px;
        min-width: 0;
        font-size: 13px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }
      .tlabel {
        color: var(--secondary-text-color);
      }
      .tval {
        font-weight: 600;
        color: var(--primary-text-color);
        transition: color 200ms ease;
      }
      /* Chroma only where it means something: the heater is still climbing. */
      .tval.hot {
        color: var(--silk-accent);
      }
      .ttarget {
        color: var(--secondary-text-color);
      }
      .ctls {
        flex: none;
        display: flex;
        align-items: center;
        gap: 6px;
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
      .ctl:hover:not(:disabled) {
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.12);
      }
      .ctl:active:not(:disabled) {
        transform: scale(0.92);
        transition-duration: 120ms;
        transition-timing-function: var(--silk-ease-out);
      }
      .ctl:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--silk-accent) 70%, transparent);
        outline-offset: 2px;
      }
      .ctl:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ctl ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      /* Job progress riding the card's bottom edge. */
      .track {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.07);
        pointer-events: none;
        z-index: 1;
        opacity: 1;
        transition: opacity 200ms ease;
      }
      .track.hidden {
        opacity: 0;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      .unavailable .cam,
      .unavailable .row2 {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],zt.prototype,"hass",2),p([f()],zt.prototype,"_config",2),p([f()],zt.prototype,"_counter",2),p([f()],zt.prototype,"_broken",2),p([f()],zt.prototype,"_pending",2),zt=p([x("silk-printer-card")],zt);var Pp={type:"silk-appliance-card",name:"Silk Appliance",description:"Washer, dryer, dishwasher \u2014 and when they'll be done."},sr="mdi:washing-machine",Jv=5,t_=["finished","complete","done","ready"],e_=3e4,i_=250,n_=new Set(["idle","off","standby","stopped","paused","none","unknown","unavailable",""]),s_=new Set(["none","unknown","unavailable","off","idle",""]),r_=new Set(["h","hr","hrs","hour","hours"]),o_=new Set(["min","mins","minute","minutes"]),a_=new Set(["s","sec","secs","second","seconds"]);function c_(a){let s=a.trim().toLowerCase();return r_.has(s)?3600:a_.has(s)?1:(o_.has(s),60)}function l_(a){let s=Math.max(0,Math.round(a)),t=Math.floor(s/60),e=s%60;return t>0?`${t}h ${e}m left`:`${e}m left`}function d_(a){let s=/^(\d+):([0-5]\d):([0-5]\d)$/.exec(a.trim());return s?Number(s[1])*3600+Number(s[2])*60+Number(s[3]):null}function p_(a){return!a||b(a)||a.state===""?NaN:Number(a.state)}function Sp(a){let s=p_(a);if(!Number.isFinite(s))return NaN;let t=String(a?.attributes.unit_of_measurement??"W").trim().toLowerCase();return t==="kw"?s*1e3:t==="mw"?s*1e6:s}var Mp=a=>a.length?a.charAt(0).toUpperCase()+a.slice(1):a,nr=a=>a.toLowerCase().replace(/[\s-]+/g,"_"),Rp="silk-appliance-card-editor";C(Rp,[{name:"name",required:!0,selector:{text:{}}},{name:"",type:"grid",schema:[{name:"icon",selector:{icon:{}}},{name:"state",selector:{entity:{domain:["sensor","binary_sensor"]}}},{name:"power",selector:{entity:{domain:["sensor"]}}},{name:"program",selector:{entity:{domain:["sensor","select"]}}},{name:"remaining",selector:{entity:{domain:["sensor"]}}},{name:"finish_at",selector:{entity:{domain:["sensor"]}}}]}],{name:"Name",icon:"Icon",state:"State sensor",power:"Power (W)",program:"Program",remaining:"Time remaining",finish_at:"Finish time"},{icon:sr});var me=class extends w{constructor(){super(...arguments);this._now=Date.now();this._pulse=!1;this._totalS=null}static getStubConfig(t){let e=Object.keys(t.states),i=/washer|washing|dryer|dishwasher|laundry/,n=e.find(o=>o.startsWith("sensor.")&&i.test(o)),r=e.find(o=>o.startsWith("sensor.")&&i.test(o)&&t.states[o].attributes.device_class==="power");return{type:"custom:silk-appliance-card",name:"Washer",icon:sr,state:n,power:r}}static async getConfigElement(){return document.createElement(Rp)}setConfig(t){if(!t.name)throw new Error("silk-appliance-card: `name` is required");if(t.power_threshold!==void 0&&!Number.isFinite(Number(t.power_threshold)))throw new Error("silk-appliance-card: `power_threshold` must be a number of watts");if(t.done_states!==void 0&&(!Array.isArray(t.done_states)||t.done_states.some(e=>typeof e!="string")))throw new Error("silk-appliance-card: `done_states` must be a list of state strings");this._config=t,this._totalS=null,this._lastVerdict=void 0}getCardSize(){return 2}getGridOptions(){return{columns:6,rows:2,min_columns:4,min_rows:1}}connectedCallback(){super.connectedCallback(),this._now=Date.now()}disconnectedCallback(){super.disconnectedCallback(),window.clearInterval(this._tick),this._tick=void 0,window.clearTimeout(this._pulseTimer),this._pulseTimer=void 0}willUpdate(t){if(!this.hass||!this._config||(t.has("hass")&&(this._now=Date.now()),this._allUnavailable()))return;let e=this._verdict(),i=this._lastVerdict;if(this._lastVerdict=e,e===i){if(e==="running"&&this._totalS!==null){let n=this._remainingSeconds();n!==null&&n>this._totalS&&(this._totalS=n)}return}i!==void 0&&(e==="running"?this._totalS=this._remainingSeconds():(this._totalS=null,e==="finished"&&this._firePulse()))}updated(){let t=this.isConnected&&this._lastVerdict==="running"&&!!this._config?.finish_at;t&&this._tick===void 0?this._tick=window.setInterval(()=>{this._now=Date.now()},e_):!t&&this._tick!==void 0&&(window.clearInterval(this._tick),this._tick=void 0)}_firePulse(){this._pulse=!0,window.clearTimeout(this._pulseTimer),this._pulseTimer=window.setTimeout(()=>{this._pulse=!1,this._pulseTimer=void 0},i_+40)}_doneStates(){return new Set((this._config?.done_states??t_).map(nr))}_verdict(){let t=this._config,e=this.hass;if(!t||!e)return"idle";let i=Sp(t.power?e.states[t.power]:void 0),n=Number(t.power_threshold??Jv),r=Number.isFinite(i)&&i>n,o=t.state?e.states[t.state]:void 0;if(o&&!b(o)){let c=nr(o.state);return this._doneStates().has(c)?"finished":n_.has(c)?r?"running":"idle":"running"}return r?"running":"idle"}_finishTs(){let t=this._config?.finish_at;if(!t||!this.hass)return null;let e=this.hass.states[t];if(!e||b(e)||e.state==="")return null;let i=Date.parse(e.state);return Number.isFinite(i)?i:null}_remainingSeconds(){let t=this._config,e=this.hass;if(!t||!e)return null;let i=t.remaining;if(i){let r=e.states[i];if(r&&!b(r)&&r.state!==""){let o=Number(r.state);if(Number.isFinite(o))return Math.max(0,o*c_(String(r.attributes.unit_of_measurement??"")));let c=d_(r.state);if(c!==null)return c}}let n=this._finishTs();return n===null?null:Math.max(0,(n-this._now)/1e3)}_locale(){return this.hass?.locale?.language??this.hass?.language??"en"}_finishText(t){let e=this._locale(),i=new Date(t),n=new Date(this._now),r=new Intl.DateTimeFormat(e,{hour:"numeric",minute:"2-digit"}).format(i);return i.getFullYear()===n.getFullYear()&&i.getMonth()===n.getMonth()&&i.getDate()===n.getDate()?`done at ${r}`:`done ${new Intl.DateTimeFormat(e,{weekday:"short"}).format(i)} ${r}`}_allUnavailable(){let t=this.hass;if(!t)return!1;let e=this._tracked();return e.length>0&&e.every(i=>b(t.states[i]))}_tracked(){let t=this._config;return t?[t.state,t.power,t.remaining,t.finish_at,t.program].filter(e=>typeof e=="string"&&e!==""):[]}_primaryEntity(){let t=this._config;if(t)return t.state??t.remaining??t.finish_at??t.power??t.program}_onCardClick(){let t=this._primaryEntity();t&&A(this,t)}_renderPower(t){let e=Sp(t);if(!Number.isFinite(e))return m;let i=Math.abs(e)>=1e3,n=new Intl.NumberFormat(this._locale(),{minimumFractionDigits:i?1:0,maximumFractionDigits:i?1:0}).format(i?e/1e3:e);return l`
      <div class="trailing">
        <span class="value">${n}</span><span class="unit">${i?"kW":"W"}</span>
      </div>
    `}render(){let t=this._config,e=this.hass;if(!t||!e)return m;let i=this._primaryEntity();if(i&&!e.states[i])return l`
        <ha-card class="control">
          <div class="warning">Entity not found: ${i}</div>
        </ha-card>
      `;let n=t.state?e.states[t.state]:void 0,r=t.power?e.states[t.power]:void 0,o=t.program?e.states[t.program]:void 0,c=this._allUnavailable(),d=c?"idle":this._verdict(),u=d==="running",g=d==="finished",h=g?"var(--success-color, #43a047)":S(n??r,t.color),v=o&&!b(o)&&!s_.has(nr(o.state))?Mp(I(e,o)):void 0,_=this._finishTs(),$=this._remainingSeconds(),M=_!==null?this._finishText(_):$!==null?l_(Math.ceil($/60)):void 0,P=n&&!b(n)?Mp(I(e,n)):void 0,L=c?"Unavailable":g?"Ready to unload":u?M??P??"Running":P??"Idle",H=this._totalS,z=u&&$!==null&&H!==null&&H>0,V=z?R(1-$/H,0,1):0;return l`
      <ha-card
        class="control ${c?"unavailable":""}"
        style="--silk-accent:${h}"
        @click=${this._onCardClick}
      >
        <div class="top">
          <div class="icon ${(u||g)&&!c?"on":""} ${this._pulse?"pulse":""}">
            <ha-icon .icon=${t.icon??sr}></ha-icon>
          </div>
          <div class="info">
            <div class="name">${t.name}</div>
            <div class="state">
              ${v?l`<span class="pchip">${v}</span>`:m}
              <span class="stext">${L}</span>
            </div>
          </div>
          ${this._renderPower(r)}
        </div>
        ${u&&!c?z?l`
                <div
                  class="track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow=${Math.round(V*100)}
                >
                  <div class="bar" style="width:${(V*100).toFixed(2)}%"></div>
                </div>
              `:l`
                <div class="track ind" aria-label="Running" role="progressbar">
                  <span class="seg"></span>
                </div>
              `:m}
      </ha-card>
    `}};me.styles=[T,k`
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
      /* Display card: no control action, so the icon presses with the card. */
      .icon {
        cursor: pointer;
      }
      .icon:active {
        transform: none;
      }
      /* One-shot arrival note when the cycle ends — never a loop. */
      .icon.pulse {
        animation: silk-appliance-pop 250ms var(--silk-spring);
      }
      .state {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .stext {
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pchip {
        flex: 0 1 auto;
        max-width: 45%;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.4;
        color: var(--secondary-text-color);
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track {
        position: relative;
        flex: none;
        height: 4px;
        border-radius: 999px;
        background: rgba(var(--rgb-primary-text-color, 127, 127, 127), 0.08);
        overflow: hidden;
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        background: var(--silk-accent);
        transition:
          width 400ms var(--silk-ease-out),
          background 200ms ease;
      }
      /* No total to divide by: a thinner track carries real activity instead. */
      .track.ind {
        height: 2px;
      }
      .seg {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 30%;
        border-radius: 999px;
        background: var(--silk-accent);
        transform: translateX(-100%);
        animation: silk-appliance-travel 1600ms ease-in-out infinite;
        will-change: transform;
      }
      @keyframes silk-appliance-travel {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(333%);
        }
      }
      @keyframes silk-appliance-pop {
        0% {
          transform: scale(1);
        }
        45% {
          transform: scale(1.12);
        }
        100% {
          transform: scale(1);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        /* Hold the segment still rather than strobe it at zero duration. */
        .seg {
          animation: none;
          width: 100%;
          transform: none;
          opacity: 0.5;
        }
      }
      .unavailable .track {
        opacity: 0.45;
      }
    `],p([y({attribute:!1})],me.prototype,"hass",2),p([f()],me.prototype,"_config",2),p([f()],me.prototype,"_now",2),p([f()],me.prototype,"_pulse",2),me=p([x("silk-appliance-card")],me);var m_="0.5.0",Op=[Ir,Dr,Ur,Vr,Br,io,no,ro,oo,co,mo,ho,vo,$o,Co,Ro,Ho,Io,Do,Uo,Vo,Wo,Yo,Zo,ta,na,ra,oa,la,pa,ua,fa,ba,ya,wa,ka,Ta,Sa,Pa,Ia,Ua,Wa,Xa,Ja,ec,rc,lc,hc,xc,Sc,Oc,Fc,Vc,Wc,Kc,tl,nl,rl,ll,pl,ul,wl,Cl,Ml,Fl,zl,Gl,Yl,Ql,td,sd,od,md,fd,vd,Cd,Rd,Dd,Ud,Wd,Yd,Xd,ip,ap,up,fp,vp,yp,Tp,Cp,Pp];window.customCards=window.customCards||[];for(let a of Op)window.customCards.push({...a,preview:!0,documentationURL:"https://github.com/LeeHueeng/silk-card"});console.info(`%c SILK %c v${m_} \xB7 ${Op.length} cards `,"background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0 2px 4px;font-weight:700","background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px 2px 0");
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

lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive-helpers.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/keyed.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/

function s(e){if(!e)return"";let t=document.createElement("div");return t.textContent=e,t.innerHTML}function c(){return window.API_CONFIG?.BASE_URL||"/api"}function u(e=!1){let t=window.Auth?.token,n={};return t&&(n.Authorization=`Bearer ${t}`),e&&(n["Content-Type"]="application/json"),n}async function k(e=!1){let t=u(e),n=window.getCSRFToken?await window.getCSRFToken():null;return n&&(t["X-CSRF-Token"]=n),t}function f(e){return`<i data-lucide="${{angel:"feather","angel-card":"feather",astrocartography:"map-pinned",crystal:"crystal-ball","crystal-ball":"crystal-ball","daily-wisdom":"sun",horoscope:"sparkles",journal:"pen-tool","medicine-wheel":"compass",natal:"map","natal-chart":"map",numerology:"hash","past-life":"history",runes:"gem",synastry:"heart",tarot:"book-marked"}[e]||"star"}" class="reading-type-icon"></i>`}function m(e){return{angel:"And\u011Blsk\xFD vzkaz","angel-card":"And\u011Blsk\xE1 karta",astrocartography:"Astro mapa",crystal:"K\u0159i\u0161\u0165\xE1lov\xE1 koule","crystal-ball":"K\u0159i\u0161\u0165\xE1lov\xE1 koule","daily-wisdom":"Denn\xED moudrost",horoscope:"Horoskop",journal:"Manifesta\u010Dn\xED den\xEDk","medicine-wheel":"\u0160amansk\xE9 kolo",natal:"Nat\xE1ln\xED karta","natal-chart":"Nat\xE1ln\xED karta",numerology:"Numerologie","past-life":"Minul\xFD \u017Eivot",runes:"Runov\xFD v\xFDklad",synastry:"Partnersk\xE1 shoda",tarot:"Tarotov\xFD v\xFDklad"}[e]||"V\xFDklad"}var g=[],b="all",w=0,N=10,M={"crystal-ball":["crystal-ball","crystal"],"natal-chart":["natal-chart","natal"]};function P(){return g}function R(e,t){let n=g.find(a=>a.id===e);n&&Object.assign(n,t)}async function E(){let e=document.getElementById("readings-list");try{let t=await fetch(`${c()}/user/readings`,{credentials:"include",headers:u()});if(!t.ok)throw new Error("Failed to load readings");return g=(await t.json()).readings||[],w=0,A(),g}catch(t){return console.error("Error loading readings:",t),e&&(e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state__icon">\u26A0\uFE0F</div>
                    <p class="empty-state__text">Nepoda\u0159ilo se na\u010D\xEDst historii.</p>
                    <button class="btn btn--glass btn--sm" data-readings-action="reload">Zkusit znovu</button>
                </div>
            `,e.querySelector('[data-readings-action="reload"]')?.addEventListener("click",()=>location.reload())),[]}}function H(){if(b==="all")return g;let e=M[b]||[b];return g.filter(t=>e.includes(t.type))}function A(){let e=document.getElementById("readings-list");if(!e)return;let t=H();if(t.length===0){e.innerHTML=`
            <div class="empty-state">
                <div class="empty-state__icon">\u{1F52E}</div>
                <h4 class="empty-state__title">${b==="all"?"Historie zat\xEDm \u010Dek\xE1 na prvn\xED stopu":"Tady zat\xEDm nen\xED \u017E\xE1dn\xFD v\xFDklad tohoto typu"}</h4>
                <p class="empty-state__text">${b==="all"?"Za\u010Dni jedn\xEDm v\xFDkladem. Jakmile vznikne prvn\xED z\xE1znam, profil se p\u0159estane tv\xE1\u0159it jako archiv a za\u010Dne ukazovat, k \u010Demu se m\xE1\u0161 vracet.":"Filtr je pr\xE1zdn\xFD. Zkus jin\xFD typ v\xFDkladu nebo se vra\u0165 na celou historii."}</p>
                ${b==="all"?`
                    <div class="empty-state__actions">
                        <a href="tarot.html?source=profile_history_empty&feature=tarot" class="btn btn--primary btn--sm">\u{1F0CF} Tarot</a>
                        <a href="kristalova-koule.html?source=profile_history_empty&feature=kristalova_koule" class="btn btn--glass btn--sm">\u{1F52E} K\u0159i\u0161\u0165\xE1lov\xE1 koule</a>
                        <a href="horoskopy.html?source=profile_history_empty&feature=daily_guidance" class="btn btn--glass btn--sm">\u2B50 Horoskop</a>
                    </div>
                `:""}
            </div>
        `,j(0,0);return}let n=t.slice(0,w+N);w=n.length,e.innerHTML=n.map(a=>`
        <div class="reading-item card" data-reading-id="${s(a.id)}" role="button" tabindex="0">
            <div class="reading-item__inner">
                <div class="reading-item__left">
                    <span class="reading-item__icon" aria-hidden="true">${f(a.type)}</span>
                    <div>
                        <strong>${s(m(a.type))}</strong>
                        <p class="reading-item__date">
                            ${new Date(a.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </p>
                    </div>
                </div>
                <div class="reading-item__actions">
                    <button class="btn btn--sm btn--glass" data-reading-action="favorite" data-reading-id="${s(a.id)}"
                        title="${a.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"}"
                        aria-label="${a.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"}">
                        ${a.is_favorite?"\u2B50":"\u2606"}
                    </button>
                    <button class="btn btn--sm btn--glass" data-reading-action="view" data-reading-id="${s(a.id)}" aria-label="Zobrazit detail">Zobrazit</button>
                </div>
            </div>
        </div>
    `).join(""),j(w,t.length)}function j(e,t){let n=document.getElementById("readings-pagination");if(n)if(e<t){n.hidden=!1,n.classList.add("profile-block-visible");let a=document.getElementById("readings-load-more");a&&(a.textContent=`Na\u010D\xEDst dal\u0161\xED (${t-e} zb\xFDv\xE1)`)}else n.hidden=!0,n.classList.remove("profile-block-visible")}function I(e=0){let t=e>0;return`
        <div class="empty-state">
            <div class="empty-state__icon">\u2B50</div>
            <h4 class="empty-state__title">${t?"Vyber si prvn\xED v\xFDklad pro n\xE1vrat":"Obl\xEDben\xE9 zat\xEDm \u010Dekaj\xED na prvn\xED n\xE1vrat"}</h4>
            <p class="empty-state__text">${t?"Najdi v historii v\xFDklad, ke kter\xE9mu se chce\u0161 vr\xE1tit. Hv\u011Bzda z n\u011Bj ud\u011Bl\xE1 kr\xE1tk\xFD seznam t\xE9mat, kter\xE1 se opakuj\xED.":"Za\u010Dni jedn\xEDm v\xFDkladem. Obl\xEDben\xE9 pak nejsou sb\xEDrka hv\u011Bzdi\u010Dek, ale m\xEDsto pro odpov\u011Bdi, kter\xE9 maj\xED z\u016Fstat po ruce."}</p>
            <div class="empty-state__actions">
                ${t?'<button type="button" class="btn btn--primary btn--sm" data-profile-tab-target="history">Otev\u0159\xEDt historii</button>':'<a href="tarot.html?source=profile_favorites_empty&feature=tarot" class="btn btn--primary btn--sm">\u{1F0CF} Tarot</a><a href="horoskopy.html?source=profile_favorites_empty&feature=daily_guidance" class="btn btn--glass btn--sm">\u2B50 Denn\xED horoskop</a>'}
            </div>
        </div>
    `}async function T(){let e=document.getElementById("favorites-list");if(e){e.innerHTML='<p class="profile-loading">Na\u010D\xEDt\xE1n\xED...</p>';try{let t=await fetch(`${c()}/user/readings`,{credentials:"include",headers:u()});if(!t.ok)throw new Error("Failed to load readings");let a=(await t.json()).readings||[],i=a.filter(r=>r.is_favorite);if(i.length===0){e.innerHTML=I(a.length);return}e.innerHTML=i.map(r=>`
            <div class="reading-item card" data-reading-id="${s(r.id)}" role="button" tabindex="0">
                <div class="reading-item__inner">
                    <div class="reading-item__left">
                        <span class="reading-item__icon" aria-hidden="true">${f(r.type)}</span>
                        <div>
                            <strong>${s(m(r.type))}</strong>
                            <p class="reading-item__date">
                                ${new Date(r.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"})}
                            </p>
                        </div>
                    </div>
                    <div class="reading-item__actions">
                        <button class="btn btn--sm btn--glass" data-reading-action="favorite" data-reading-id="${s(r.id)}" title="Odebrat z obl\xEDben\xFDch" aria-label="Odebrat z obl\xEDben\xFDch">\u2B50</button>
                        <button class="btn btn--sm btn--glass" data-reading-action="view" data-reading-id="${s(r.id)}" aria-label="Zobrazit detail">Zobrazit</button>
                    </div>
                </div>
            </div>
        `).join("")}catch(t){console.error("Error loading favorites:",t),e.innerHTML=`
            <div class="empty-state">
                <div class="empty-state__icon">\u26A0\uFE0F</div>
                <p class="empty-state__text">Nepoda\u0159ilo se na\u010D\xEDst obl\xEDben\xE9.</p>
            </div>
        `}}}var v=null,_=!1,$=null,y=null,h=null,O=[{value:"fits",label:"Sed\xED"},{value:"neutral",label:"Je\u0161t\u011B nev\xEDm"},{value:"miss",label:"Netrefilo se"}],B=[{value:"relationships",label:"Vztahy"},{value:"work",label:"Pr\xE1ce"},{value:"energy",label:"Energie"},{value:"self",label:"Sebepozn\xE1n\xED"},{value:"timing",label:"Na\u010Dasov\xE1n\xED"}];async function de(e){let t=document.getElementById("reading-modal"),n=document.getElementById("reading-modal-content");if(!(!t||!n)){v=e,t.hidden=!1,t.classList.add("is-visible"),n.innerHTML='<p class="reading-modal__loading">Na\u010D\xEDt\xE1n\xED...</p>',Z(t);try{let a=await fetch(`${c()}/user/readings/${e}`,{credentials:"include",headers:u()});if(!a.ok)throw new Error("Failed to fetch reading");let r=(await a.json()).reading;_=r.is_favorite,F(),n.innerHTML=ee(r),V(n),J(n,r)}catch(a){console.error("Error loading reading:",a),n.innerHTML='<p class="reading-modal__error">Nepoda\u0159ilo se na\u010D\xEDst v\xFDklad.</p>'}}}function S(){let e=document.getElementById("reading-modal");e&&(e.classList.remove("is-visible"),e.hidden=!0),v=null,K()}async function ce(){v&&(await D(v),_=!_,F())}async function D(e,t=null){try{let n=await fetch(`${c()}/user/readings/${e}/favorite`,{method:"PATCH",credentials:"include",headers:await k()});if(!n.ok)throw new Error("Failed to toggle favorite");let a=await n.json();t&&(t.textContent=a.is_favorite?"\u2B50":"\u2606",t.title=a.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch",t.setAttribute("aria-label",a.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"));let i=P(),r=i.find(l=>l.id===e);r&&(r.is_favorite=a.is_favorite,A()),document.dispatchEvent(new CustomEvent("reading:updated",{detail:{readings:i}}));let o=document.getElementById("tab-favorites");o&&o.classList.contains("is-active")&&T()}catch(n){console.error("Error toggling favorite:",n),window.Auth?.showToast?.("Chyba","Nepoda\u0159ilo se zm\u011Bnit obl\xEDben\xE9.","error")}}async function ue(){if(v&&confirm("Opravdu chcete smazat tento v\xFDklad? Tuto akci nelze vr\xE1tit."))try{if(!(await fetch(`${c()}/user/readings/${v}`,{method:"DELETE",credentials:"include",headers:await k()})).ok)throw new Error("Failed to delete reading");window.Auth?.showToast?.("Smaz\xE1no","V\xFDklad byl smaz\xE1n.","success"),S();let t=await E();document.dispatchEvent(new CustomEvent("reading:updated",{detail:{readings:t}}))}catch(e){console.error("Error deleting reading:",e),window.Auth?.showToast?.("Chyba","Nepoda\u0159ilo se smazat v\xFDklad.","error")}}function F(){let e=document.getElementById("modal-favorite-btn");e&&(e.textContent=_?"\u2B50 V obl\xEDben\xFDch":"\u2606 P\u0159idat do obl\xEDben\xFDch",e.setAttribute("aria-label",_?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"))}function Z(e){$=document.activeElement,y=e;let t=L(e);(e.querySelector(".modal__close")||t[0]||e).focus(),h=a=>{if(!y)return;if(a.key==="Escape"){a.preventDefault(),S();return}if(a.key!=="Tab")return;let i=L(y);if(!i.length){a.preventDefault(),y.focus();return}let r=i[0],o=i[i.length-1];a.shiftKey&&document.activeElement===r?(a.preventDefault(),o.focus()):!a.shiftKey&&document.activeElement===o&&(a.preventDefault(),r.focus())},document.addEventListener("keydown",h)}function K(){h&&(document.removeEventListener("keydown",h),h=null),y=null,$&&($.focus(),$=null)}function L(e){return Array.from(e.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(t=>t.offsetParent!==null)}function V(e){e.querySelectorAll("[data-tarot-fallback]").forEach(t=>{t.addEventListener("error",()=>{t.dataset.fallbackApplied!=="1"&&(t.dataset.fallbackApplied="1",t.src="/img/tarot/tarot_placeholder.webp")})})}function z(e,t,n="neutral"){let a=e?.querySelector?.(".reading-feedback__status");a&&(a.textContent=t,a.dataset.state=n)}async function x(e,t,n,a){if(!e)return null;a&&(a.disabled=!0),z(n,"Ukl\xE1d\xE1m zp\u011Btnou vazbu...","pending");let i=null;if(window.Auth?.saveReadingFeedback)i=await window.Auth.saveReadingFeedback(e,{...t,feature:"profile_history",source:"profile_reading_modal"});else{let o=await fetch(`${c()}/user/readings/${encodeURIComponent(e)}/feedback`,{method:"PATCH",credentials:"include",headers:await k(!0),body:JSON.stringify({...t,feature:"profile_history",source:"profile_reading_modal"})});i=await o.json().catch(()=>null),o.ok||(i=null)}if(a&&(a.disabled=!1),!i?.success)return z(n,"Nepoda\u0159ilo se ulo\u017Eit. Zkus to znovu.","error"),null;i.reading&&R(e,i.reading);let r=await E();return document.dispatchEvent(new CustomEvent("reading:updated",{detail:{readings:r}})),z(n,"Ulo\u017Eeno. Pam\u011B\u0165 profilu m\xE1 dal\u0161\xED sign\xE1l pro n\xE1vratov\xFD ritu\xE1l.","success"),i}function q(e){let t=e?.data;if(e?.type==="journal"||!t||typeof t!="object"||Array.isArray(t))return"";let n=t.feedback&&typeof t.feedback=="object"&&!Array.isArray(t.feedback)?t.feedback:{},a=O.map(r=>`
        <button type="button" class="reading-feedback__chip ${n.resonance===r.value?"is-selected":""}" data-feedback-resonance="${r.value}">
            ${s(r.label)}
        </button>
    `).join(""),i=B.map(r=>`
        <button type="button" class="reading-feedback__chip ${n.focus===r.value?"is-selected":""}" data-feedback-focus="${r.value}">
            ${s(r.label)}
        </button>
    `).join("");return`
        <section class="reading-feedback" data-reading-feedback="${s(e.id)}">
            <div class="reading-feedback__header">
                <span class="reading-feedback__eyebrow">Zp\u011Btn\xE1 vazba</span>
                <strong>Co m\xE1 profil br\xE1t jako dal\u0161\xED sign\xE1l?</strong>
            </div>
            <div class="reading-feedback__chips" aria-label="Zp\u011Btn\xE1 vazba k v\xFDkladu">
                ${a}
            </div>
            <div class="reading-feedback__chips" aria-label="T\xE9ma pro pam\u011B\u0165 ritu\xE1lu">
                ${i}
            </div>
            <div class="reading-feedback__actions">
                <button type="button" class="btn btn--glass btn--sm" data-feedback-next-action="journal">Zapsat reflexi</button>
                <a class="btn btn--glass btn--sm" href="tarot.html?source=profile_feedback&feature=another_reading" data-feedback-next-action="another_reading">Nav\xE1zat v\xFDkladem</a>
            </div>
            <p class="reading-feedback__status" aria-live="polite"></p>
        </section>
    `}function U(){S();let e=document.getElementById("journal-input");e&&(window.history.replaceState(null,"","#journal-input"),e.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>e.focus(),250))}function J(e,t){let n=e.querySelector("[data-reading-feedback]");n&&n.addEventListener("click",async a=>{let i=a.target.closest("[data-feedback-resonance]"),r=a.target.closest("[data-feedback-focus]"),o=a.target.closest("[data-feedback-next-action]"),l=i||r||o;if(!l)return;let d={};if(i&&(d.resonance=i.dataset.feedbackResonance),r&&(d.focus=r.dataset.feedbackFocus),o&&(d.nextAction=o.dataset.feedbackNextAction),n.querySelectorAll(".reading-feedback__chip").forEach(p=>{(d.resonance&&p.dataset.feedbackResonance||d.focus&&p.dataset.feedbackFocus)&&p.classList.toggle("is-selected",p===l)}),o?.tagName==="A"){a.preventDefault(),(await x(t.id,d,n,null))?.success&&(window.location.href=o.getAttribute("href"));return}if(d.nextAction==="journal"){(await x(t.id,d,n,o))?.success&&U();return}await x(t.id,d,n,l)})}function G(e){return{era:"Obdob\xED",identity:"Identita",karmic_lesson:"Karmick\xE1 lekce",gifts:"Dary",patterns:"Vzorce",mission:"Mise",message:"Poselstv\xED",strengths:"Siln\xE9 str\xE1nky",challenges:"V\xFDzvy"}[e]||String(e).replace(/_/g," ").replace(/^\w/,n=>n.toUpperCase())}function W(e){return!e||typeof e!="object"?"":Object.entries(e).filter(([,t])=>t!=null&&t!=="").map(([t,n])=>{let a=typeof n=="object"?JSON.stringify(n,null,2):String(n);return`
                <section class="reading-structured-field">
                    <h4 class="reading-structured-field__label">${s(G(t))}</h4>
                    <p class="reading-structured-field__value">${s(a).replace(/\n/g,"<br>")}</p>
                </section>
            `}).join("")}function C(e,t){let n=t.filter(a=>a.value!==null&&a.value!==void 0&&a.value!=="").map(a=>`
            <span class="reading-metric">
                <strong>${s(a.label)}</strong>
                <span>${s(a.value)}</span>
            </span>
        `).join("");return n?`
        <section class="reading-summary-panel">
            <h3 class="reading-summary-panel__title">${s(e)}</h3>
            <div class="reading-metric-grid">${n}</div>
        </section>
    `:""}function Q(e){let t=e?.summary;return t?C("Vypo\u010Dten\xE1 mapa",[{label:"Slunce",value:t.sunSign},{label:"M\u011Bs\xEDc",value:t.moonSign},{label:"Ascendent",value:t.ascendantSign||"nevypo\u010Dten"},{label:"Dominantn\xED \u017Eivel",value:t.dominantElement},{label:"Modalita",value:t.dominantQuality}]):""}function X(e){let t=e?.synastry?.scores||e?.scores;return t?C("Sk\xF3re vztahu",[{label:"Celkem",value:`${t.total??"--"} %`},{label:"Emoce",value:`${t.emotion??"--"} %`},{label:"Komunikace",value:`${t.communication??"--"} %`},{label:"V\xE1\u0161e\u0148",value:`${t.passion??"--"} %`},{label:"Stabilita",value:`${t.stability??"--"} %`}]):""}function Y(e){if(!e||typeof e!="object")return"";let t=Array.isArray(e.recommendations)?e.recommendations.slice(0,3):[],n=Array.isArray(e.angularLines)?e.angularLines.slice(0,4):[],a=t.map(r=>`
        <li>
            <strong>${s(r.city||"M\xEDsto")}</strong>
            <span>${s(r.score??"--")} / 100 \xB7 ${s(r.primaryPlanet?.name||"planeta")}</span>
        </li>
    `).join(""),i=n.map(r=>`
        <li>
            <strong>${s(r.planetName||"Planeta")} ${s(r.angle||"")}</strong>
            <span>${s(r.longitude??"--")}\xB0</span>
        </li>
    `).join("");return!a&&!i?"":`
        <section class="reading-summary-panel">
            <h3 class="reading-summary-panel__title">Astro mapa</h3>
            ${a?`<ul class="reading-summary-list">${a}</ul>`:""}
            ${i?`<ul class="reading-summary-list reading-summary-list--compact">${i}</ul>`:""}
        </section>
    `}function ee(e){let t=new Date(e.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}),n=`
        <div class="reading-detail__header">
            <span class="reading-detail__icon" aria-hidden="true">${f(e.type)}</span>
            <h2 class="reading-detail__title">${s(m(e.type))}</h2>
            <p class="reading-detail__date">${t}</p>
        </div>
        <div class="reading-content reading-detail__body">
    `,a=e.data||{};a&&typeof a=="object"&&(e.type==="synastry"&&(n+=X(a)),n+=Q(a.chart||a.synastry?.person1?.chart),e.type==="astrocartography"&&(n+=Y(a.astrocartography)));function i(r){return r?`img/tarot/tarot_${r.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ /g,"_")}.webp`:"img/tarot/tarot_placeholder.webp"}if(typeof a=="string")n+=`<div class="reading-plain-text">${s(a).replace(/\n/g,"<br>")}</div>`;else if(e.type==="tarot"&&a.cards){n+='<div class="reading-tarot-grid">',a.cards.forEach(o=>{let l=i(o.name);n+=`
                <div class="reading-tarot-card">
                    <div class="reading-tarot-card__image-wrap">
                         <img src="${s(l)}"
                              alt="${s(o.name)}"
                              loading="lazy"
                              data-tarot-fallback
                              class="reading-tarot-card__image">
                    </div>
                    <p class="reading-tarot-card__title">${s(o.name)}</p>
                    ${o.position?`<small class="reading-tarot-card__position">${s(o.position)}</small>`:""}
                </div>
            `}),n+="</div>";let r=a.response||a.interpretation;if(r){let o=s(r).replace(/\n/g,"<br>");n+=`
                <div class="reading-interpretation">
                    <h4 class="reading-interpretation__title">V\xDDKLAD KARET</h4>
                    <div class="reading-interpretation__text">
                        ${o}
                    </div>
                </div>
            `}}else if(e.type==="horoscope"&&(a.text||a.prediction)){let r=a.text||a.prediction,l={daily:"Denn\xED horoskop",weekly:"T\xFDdenn\xED horoskop",monthly:"M\u011Bs\xED\u010Dn\xED horoskop"}[a.period]||a.period||"Horoskop";n+=`
            <div class="reading-horoscope-header">
                <h3 class="reading-horoscope-header__sign">${s(a.sign||"Znamen\xED")}</h3>
                <span class="reading-horoscope-header__period">${s(l)}</span>
            </div>
            <div class="reading-horoscope-text">
                ${s(r)}
            </div>
        `,a.luckyNumbers&&(n+=`
                <div class="reading-lucky-numbers">
                    <span class="reading-lucky-numbers__label">\u0160\u0165astn\xE1 \u010D\xEDsla</span>
                    <span class="reading-lucky-numbers__value">${s(a.luckyNumbers.toString())}</span>
                </div>
            `)}else if(a.answer)a.question&&(n+=`
                <div class="reading-question">
                    <small class="reading-question__label">Ot\xE1zka</small>
                    <p class="reading-question__text">"${s(a.question)}"</p>
                </div>
            `),n+=`
            <div class="reading-answer">
                ${s(a.answer)}
            </div>
        `;else if(a.interpretation||a.response||a.text||a.result){let r=a.interpretation||a.response||a.text||a.result;if(typeof r=="string"){let o=s(r).replace(/\n/g,"<br>"),l=typeof DOMPurify<"u"?DOMPurify.sanitize(o):o;n+=`<div class="formatted-content reading-formatted-content">${l}</div>`}else n+=`<div class="reading-structured">${W(r)}</div>`}else n+=`<pre class="reading-json">${s(JSON.stringify(a,null,2))}</pre>`;return n+="</div>",n+=q(e),n}export{S as closeReadingModal,ue as deleteReading,D as toggleFavorite,ce as toggleFavoriteModal,de as viewReading};

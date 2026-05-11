function s(e){if(!e)return"";let a=document.createElement("div");return a.textContent=e,a.innerHTML}function c(){return window.API_CONFIG?.BASE_URL||"/api"}function u(e=!1){let a=window.Auth?.token,n={};return a&&(n.Authorization=`Bearer ${a}`),e&&(n["Content-Type"]="application/json"),n}async function k(e=!1){let a=u(e),n=window.getCSRFToken?await window.getCSRFToken():null;return n&&(a["X-CSRF-Token"]=n),a}function p(e){return`<i data-lucide="${{angel:"feather","angel-card":"feather",astrocartography:"map-pinned",crystal:"crystal-ball","crystal-ball":"crystal-ball","daily-wisdom":"sun",horoscope:"sparkles",journal:"pen-tool","medicine-wheel":"compass",natal:"map","natal-chart":"map",numerology:"hash","past-life":"history",runes:"gem",synastry:"heart",tarot:"book-marked"}[e]||"star"}" class="reading-type-icon"></i>`}function m(e){return{angel:"And\u011Blsk\xFD vzkaz","angel-card":"And\u011Blsk\xE1 karta",astrocartography:"Astro mapa",crystal:"K\u0159i\u0161\u0165\xE1lov\xE1 koule","crystal-ball":"K\u0159i\u0161\u0165\xE1lov\xE1 koule","daily-wisdom":"Denn\xED moudrost",horoscope:"Horoskop",journal:"Manifesta\u010Dn\xED den\xEDk","medicine-wheel":"\u0160amansk\xE9 kolo",natal:"Nat\xE1ln\xED karta","natal-chart":"Nat\xE1ln\xED karta",numerology:"Numerologie","past-life":"Minul\xFD \u017Eivot",runes:"Runov\xFD v\xFDklad",synastry:"Partnersk\xE1 shoda",tarot:"Tarotov\xFD v\xFDklad"}[e]||"V\xFDklad"}var g=[],b="all",w=0,j=10,M={"crystal-ball":["crystal-ball","crystal"],"natal-chart":["natal-chart","natal"]};function L(){return g}function R(e,a){let n=g.find(t=>t.id===e);n&&Object.assign(n,a)}async function E(){let e=document.getElementById("readings-list");try{let a=await fetch(`${c()}/user/readings`,{credentials:"include",headers:u()});if(!a.ok)throw new Error("Failed to load readings");return g=(await a.json()).readings||[],w=0,A(),g}catch(a){return console.error("Error loading readings:",a),e&&(e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state__icon">\u26A0\uFE0F</div>
                    <p class="empty-state__text">Nepoda\u0159ilo se na\u010D\xEDst historii.</p>
                    <button class="btn btn--glass btn--sm" data-readings-action="reload">Zkusit znovu</button>
                </div>
            `,e.querySelector('[data-readings-action="reload"]')?.addEventListener("click",()=>location.reload())),[]}}function H(){if(b==="all")return g;let e=M[b]||[b];return g.filter(a=>e.includes(a.type))}function A(){let e=document.getElementById("readings-list");if(!e)return;let a=H();if(a.length===0){e.innerHTML=`
            <div class="empty-state">
                <div class="empty-state__icon">\u{1F52E}</div>
                <h4 class="empty-state__title">${b==="all"?"Zat\xEDm nem\xE1te \u017E\xE1dn\xE9 v\xFDklady":"\u017D\xE1dn\xE9 v\xFDklady tohoto typu"}</h4>
                <p class="empty-state__text">${b==="all"?"Vydejte se na cestu za pozn\xE1n\xEDm hv\u011Bzd!":"Zkuste jin\xFD typ v\xFDkladu."}</p>
                ${b==="all"?`
                    <div class="empty-state__actions">
                        <a href="tarot.html" class="btn btn--primary btn--sm">\u{1F0CF} Tarot</a>
                        <a href="kristalova-koule.html" class="btn btn--glass btn--sm">\u{1F52E} K\u0159i\u0161\u0165\xE1lov\xE1 koule</a>
                        <a href="horoskopy.html" class="btn btn--glass btn--sm">\u2B50 Horoskop</a>
                    </div>
                `:""}
            </div>
        `,P(0,0);return}let n=a.slice(0,w+j);w=n.length,e.innerHTML=n.map(t=>`
        <div class="reading-item card" data-reading-id="${s(t.id)}" role="button" tabindex="0">
            <div class="reading-item__inner">
                <div class="reading-item__left">
                    <span class="reading-item__icon" aria-hidden="true">${p(t.type)}</span>
                    <div>
                        <strong>${s(m(t.type))}</strong>
                        <p class="reading-item__date">
                            ${new Date(t.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </p>
                    </div>
                </div>
                <div class="reading-item__actions">
                    <button class="btn btn--sm btn--glass" data-reading-action="favorite" data-reading-id="${s(t.id)}"
                        title="${t.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"}"
                        aria-label="${t.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"}">
                        ${t.is_favorite?"\u2B50":"\u2606"}
                    </button>
                    <button class="btn btn--sm btn--glass" data-reading-action="view" data-reading-id="${s(t.id)}" aria-label="Zobrazit detail">Zobrazit</button>
                </div>
            </div>
        </div>
    `).join(""),P(w,a.length)}function P(e,a){let n=document.getElementById("readings-pagination");if(n)if(e<a){n.hidden=!1,n.classList.add("profile-block-visible");let t=document.getElementById("readings-load-more");t&&(t.textContent=`Na\u010D\xEDst dal\u0161\xED (${a-e} zb\xFDv\xE1)`)}else n.hidden=!0,n.classList.remove("profile-block-visible")}async function T(){let e=document.getElementById("favorites-list");if(e){e.innerHTML='<p class="profile-loading">Na\u010D\xEDt\xE1n\xED...</p>';try{let a=await fetch(`${c()}/user/readings`,{credentials:"include",headers:u()});if(!a.ok)throw new Error("Failed to load readings");let t=((await a.json()).readings||[]).filter(i=>i.is_favorite);if(t.length===0){e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state__icon">\u2B50</div>
                    <h4 class="empty-state__title">\u017D\xE1dn\xE9 obl\xEDben\xE9 v\xFDklady</h4>
                    <p class="empty-state__text">Klikn\u011Bte na \u2606 u v\xFDkladu pro p\u0159id\xE1n\xED do obl\xEDben\xFDch</p>
                </div>
            `;return}e.innerHTML=t.map(i=>`
            <div class="reading-item card" data-reading-id="${s(i.id)}" role="button" tabindex="0">
                <div class="reading-item__inner">
                    <div class="reading-item__left">
                        <span class="reading-item__icon" aria-hidden="true">${p(i.type)}</span>
                        <div>
                            <strong>${s(m(i.type))}</strong>
                            <p class="reading-item__date">
                                ${new Date(i.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric"})}
                            </p>
                        </div>
                    </div>
                    <div class="reading-item__actions">
                        <button class="btn btn--sm btn--glass" data-reading-action="favorite" data-reading-id="${s(i.id)}" title="Odebrat z obl\xEDben\xFDch" aria-label="Odebrat z obl\xEDben\xFDch">\u2B50</button>
                        <button class="btn btn--sm btn--glass" data-reading-action="view" data-reading-id="${s(i.id)}" aria-label="Zobrazit detail">Zobrazit</button>
                    </div>
                </div>
            </div>
        `).join("")}catch(a){console.error("Error loading favorites:",a),e.innerHTML=`
            <div class="empty-state">
                <div class="empty-state__icon">\u26A0\uFE0F</div>
                <p class="empty-state__text">Nepoda\u0159ilo se na\u010D\xEDst obl\xEDben\xE9.</p>
            </div>
        `}}}var v=null,_=!1,$=null,y=null,h=null,I=[{value:"fits",label:"Sed\xED"},{value:"neutral",label:"Je\u0161t\u011B nev\xEDm"},{value:"miss",label:"Netrefilo se"}],B=[{value:"relationships",label:"Vztahy"},{value:"work",label:"Pr\xE1ce"},{value:"energy",label:"Energie"},{value:"self",label:"Sebepozn\xE1n\xED"},{value:"timing",label:"Na\u010Dasov\xE1n\xED"}];async function le(e){let a=document.getElementById("reading-modal"),n=document.getElementById("reading-modal-content");if(!(!a||!n)){v=e,a.hidden=!1,a.classList.add("is-visible"),n.innerHTML='<p class="reading-modal__loading">Na\u010D\xEDt\xE1n\xED...</p>',D(a);try{let t=await fetch(`${c()}/user/readings/${e}`,{credentials:"include",headers:u()});if(!t.ok)throw new Error("Failed to fetch reading");let r=(await t.json()).reading;_=r.is_favorite,C(),n.innerHTML=Y(r),K(n),U(n,r)}catch(t){console.error("Error loading reading:",t),n.innerHTML='<p class="reading-modal__error">Nepoda\u0159ilo se na\u010D\xEDst v\xFDklad.</p>'}}}function z(){let e=document.getElementById("reading-modal");e&&(e.classList.remove("is-visible"),e.hidden=!0),v=null,Z()}async function de(){v&&(await O(v),_=!_,C())}async function O(e,a=null){try{let n=await fetch(`${c()}/user/readings/${e}/favorite`,{method:"PATCH",credentials:"include",headers:await k()});if(!n.ok)throw new Error("Failed to toggle favorite");let t=await n.json();a&&(a.textContent=t.is_favorite?"\u2B50":"\u2606",a.title=t.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch",a.setAttribute("aria-label",t.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"));let i=L(),r=i.find(l=>l.id===e);r&&(r.is_favorite=t.is_favorite,A()),document.dispatchEvent(new CustomEvent("reading:updated",{detail:{readings:i}}));let o=document.getElementById("tab-favorites");o&&o.classList.contains("is-active")&&T()}catch(n){console.error("Error toggling favorite:",n),window.Auth?.showToast?.("Chyba","Nepoda\u0159ilo se zm\u011Bnit obl\xEDben\xE9.","error")}}async function ce(){if(v&&confirm("Opravdu chcete smazat tento v\xFDklad? Tuto akci nelze vr\xE1tit."))try{if(!(await fetch(`${c()}/user/readings/${v}`,{method:"DELETE",credentials:"include",headers:await k()})).ok)throw new Error("Failed to delete reading");window.Auth?.showToast?.("Smaz\xE1no","V\xFDklad byl smaz\xE1n.","success"),z();let a=await E();document.dispatchEvent(new CustomEvent("reading:updated",{detail:{readings:a}}))}catch(e){console.error("Error deleting reading:",e),window.Auth?.showToast?.("Chyba","Nepoda\u0159ilo se smazat v\xFDklad.","error")}}function C(){let e=document.getElementById("modal-favorite-btn");e&&(e.textContent=_?"\u2B50 V obl\xEDben\xFDch":"\u2606 P\u0159idat do obl\xEDben\xFDch",e.setAttribute("aria-label",_?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"))}function D(e){$=document.activeElement,y=e;let a=F(e);(e.querySelector(".modal__close")||a[0]||e).focus(),h=t=>{if(!y)return;if(t.key==="Escape"){t.preventDefault(),z();return}if(t.key!=="Tab")return;let i=F(y);if(!i.length){t.preventDefault(),y.focus();return}let r=i[0],o=i[i.length-1];t.shiftKey&&document.activeElement===r?(t.preventDefault(),o.focus()):!t.shiftKey&&document.activeElement===o&&(t.preventDefault(),r.focus())},document.addEventListener("keydown",h)}function Z(){h&&(document.removeEventListener("keydown",h),h=null),y=null,$&&($.focus(),$=null)}function F(e){return Array.from(e.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(a=>a.offsetParent!==null)}function K(e){e.querySelectorAll("[data-tarot-fallback]").forEach(a=>{a.addEventListener("error",()=>{a.dataset.fallbackApplied!=="1"&&(a.dataset.fallbackApplied="1",a.src="/img/tarot/tarot_placeholder.webp")})})}function x(e,a,n="neutral"){let t=e?.querySelector?.(".reading-feedback__status");t&&(t.textContent=a,t.dataset.state=n)}async function S(e,a,n,t){if(!e)return null;t&&(t.disabled=!0),x(n,"Ukl\xE1d\xE1m zp\u011Btnou vazbu...","pending");let i=null;if(window.Auth?.saveReadingFeedback)i=await window.Auth.saveReadingFeedback(e,{...a,feature:"profile_history",source:"profile_reading_modal"});else{let o=await fetch(`${c()}/user/readings/${encodeURIComponent(e)}/feedback`,{method:"PATCH",credentials:"include",headers:await k(!0),body:JSON.stringify({...a,feature:"profile_history",source:"profile_reading_modal"})});i=await o.json().catch(()=>null),o.ok||(i=null)}if(t&&(t.disabled=!1),!i?.success)return x(n,"Nepoda\u0159ilo se ulo\u017Eit. Zkus to znovu.","error"),null;i.reading&&R(e,i.reading);let r=await E();return document.dispatchEvent(new CustomEvent("reading:updated",{detail:{readings:r}})),x(n,"Ulo\u017Eeno. Pam\u011B\u0165 profilu m\xE1 dal\u0161\xED sign\xE1l pro n\xE1vratov\xFD ritu\xE1l.","success"),i}function V(e){let a=e?.data;if(e?.type==="journal"||!a||typeof a!="object"||Array.isArray(a))return"";let n=a.feedback&&typeof a.feedback=="object"&&!Array.isArray(a.feedback)?a.feedback:{},t=I.map(r=>`
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
                ${t}
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
    `}function q(){z();let e=document.getElementById("journal-input");e&&(window.history.replaceState(null,"","#journal-input"),e.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>e.focus(),250))}function U(e,a){let n=e.querySelector("[data-reading-feedback]");n&&n.addEventListener("click",async t=>{let i=t.target.closest("[data-feedback-resonance]"),r=t.target.closest("[data-feedback-focus]"),o=t.target.closest("[data-feedback-next-action]"),l=i||r||o;if(!l)return;let d={};if(i&&(d.resonance=i.dataset.feedbackResonance),r&&(d.focus=r.dataset.feedbackFocus),o&&(d.nextAction=o.dataset.feedbackNextAction),n.querySelectorAll(".reading-feedback__chip").forEach(f=>{(d.resonance&&f.dataset.feedbackResonance||d.focus&&f.dataset.feedbackFocus)&&f.classList.toggle("is-selected",f===l)}),o?.tagName==="A"){t.preventDefault(),(await S(a.id,d,n,null))?.success&&(window.location.href=o.getAttribute("href"));return}if(d.nextAction==="journal"){(await S(a.id,d,n,o))?.success&&q();return}await S(a.id,d,n,l)})}function J(e){return{era:"Obdob\xED",identity:"Identita",karmic_lesson:"Karmick\xE1 lekce",gifts:"Dary",patterns:"Vzorce",mission:"Mise",message:"Poselstv\xED",strengths:"Siln\xE9 str\xE1nky",challenges:"V\xFDzvy"}[e]||String(e).replace(/_/g," ").replace(/^\w/,n=>n.toUpperCase())}function G(e){return!e||typeof e!="object"?"":Object.entries(e).filter(([,a])=>a!=null&&a!=="").map(([a,n])=>{let t=typeof n=="object"?JSON.stringify(n,null,2):String(n);return`
                <section class="reading-structured-field">
                    <h4 class="reading-structured-field__label">${s(J(a))}</h4>
                    <p class="reading-structured-field__value">${s(t).replace(/\n/g,"<br>")}</p>
                </section>
            `}).join("")}function N(e,a){let n=a.filter(t=>t.value!==null&&t.value!==void 0&&t.value!=="").map(t=>`
            <span class="reading-metric">
                <strong>${s(t.label)}</strong>
                <span>${s(t.value)}</span>
            </span>
        `).join("");return n?`
        <section class="reading-summary-panel">
            <h3 class="reading-summary-panel__title">${s(e)}</h3>
            <div class="reading-metric-grid">${n}</div>
        </section>
    `:""}function W(e){let a=e?.summary;return a?N("Vypo\u010Dten\xE1 mapa",[{label:"Slunce",value:a.sunSign},{label:"M\u011Bs\xEDc",value:a.moonSign},{label:"Ascendent",value:a.ascendantSign||"nevypo\u010Dten"},{label:"Dominantn\xED \u017Eivel",value:a.dominantElement},{label:"Modalita",value:a.dominantQuality}]):""}function Q(e){let a=e?.synastry?.scores||e?.scores;return a?N("Sk\xF3re vztahu",[{label:"Celkem",value:`${a.total??"--"} %`},{label:"Emoce",value:`${a.emotion??"--"} %`},{label:"Komunikace",value:`${a.communication??"--"} %`},{label:"V\xE1\u0161e\u0148",value:`${a.passion??"--"} %`},{label:"Stabilita",value:`${a.stability??"--"} %`}]):""}function X(e){if(!e||typeof e!="object")return"";let a=Array.isArray(e.recommendations)?e.recommendations.slice(0,3):[],n=Array.isArray(e.angularLines)?e.angularLines.slice(0,4):[],t=a.map(r=>`
        <li>
            <strong>${s(r.city||"M\xEDsto")}</strong>
            <span>${s(r.score??"--")} / 100 \xB7 ${s(r.primaryPlanet?.name||"planeta")}</span>
        </li>
    `).join(""),i=n.map(r=>`
        <li>
            <strong>${s(r.planetName||"Planeta")} ${s(r.angle||"")}</strong>
            <span>${s(r.longitude??"--")}\xB0</span>
        </li>
    `).join("");return!t&&!i?"":`
        <section class="reading-summary-panel">
            <h3 class="reading-summary-panel__title">Astro mapa</h3>
            ${t?`<ul class="reading-summary-list">${t}</ul>`:""}
            ${i?`<ul class="reading-summary-list reading-summary-list--compact">${i}</ul>`:""}
        </section>
    `}function Y(e){let a=new Date(e.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}),n=`
        <div class="reading-detail__header">
            <span class="reading-detail__icon" aria-hidden="true">${p(e.type)}</span>
            <h2 class="reading-detail__title">${s(m(e.type))}</h2>
            <p class="reading-detail__date">${a}</p>
        </div>
        <div class="reading-content reading-detail__body">
    `,t=e.data||{};t&&typeof t=="object"&&(e.type==="synastry"&&(n+=Q(t)),n+=W(t.chart||t.synastry?.person1?.chart),e.type==="astrocartography"&&(n+=X(t.astrocartography)));function i(r){return r?`img/tarot/tarot_${r.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ /g,"_")}.webp`:"img/tarot/tarot_placeholder.webp"}if(typeof t=="string")n+=`<div class="reading-plain-text">${s(t).replace(/\n/g,"<br>")}</div>`;else if(e.type==="tarot"&&t.cards){n+='<div class="reading-tarot-grid">',t.cards.forEach(o=>{let l=i(o.name);n+=`
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
            `}),n+="</div>";let r=t.response||t.interpretation;if(r){let o=s(r).replace(/\n/g,"<br>");n+=`
                <div class="reading-interpretation">
                    <h4 class="reading-interpretation__title">V\xDDKLAD KARET</h4>
                    <div class="reading-interpretation__text">
                        ${o}
                    </div>
                </div>
            `}}else if(e.type==="horoscope"&&(t.text||t.prediction)){let r=t.text||t.prediction,l={daily:"Denn\xED horoskop",weekly:"T\xFDdenn\xED horoskop",monthly:"M\u011Bs\xED\u010Dn\xED horoskop"}[t.period]||t.period||"Horoskop";n+=`
            <div class="reading-horoscope-header">
                <h3 class="reading-horoscope-header__sign">${s(t.sign||"Znamen\xED")}</h3>
                <span class="reading-horoscope-header__period">${s(l)}</span>
            </div>
            <div class="reading-horoscope-text">
                ${s(r)}
            </div>
        `,t.luckyNumbers&&(n+=`
                <div class="reading-lucky-numbers">
                    <span class="reading-lucky-numbers__label">\u0160\u0165astn\xE1 \u010D\xEDsla</span>
                    <span class="reading-lucky-numbers__value">${s(t.luckyNumbers.toString())}</span>
                </div>
            `)}else if(t.answer)t.question&&(n+=`
                <div class="reading-question">
                    <small class="reading-question__label">Ot\xE1zka</small>
                    <p class="reading-question__text">"${s(t.question)}"</p>
                </div>
            `),n+=`
            <div class="reading-answer">
                ${s(t.answer)}
            </div>
        `;else if(t.interpretation||t.response||t.text||t.result){let r=t.interpretation||t.response||t.text||t.result;if(typeof r=="string"){let o=s(r).replace(/\n/g,"<br>"),l=typeof DOMPurify<"u"?DOMPurify.sanitize(o):o;n+=`<div class="formatted-content reading-formatted-content">${l}</div>`}else n+=`<div class="reading-structured">${G(r)}</div>`}else n+=`<pre class="reading-json">${s(JSON.stringify(t,null,2))}</pre>`;return n+="</div>",n+=V(e),n}export{z as closeReadingModal,ce as deleteReading,O as toggleFavorite,de as toggleFavoriteModal,le as viewReading};

function r(e){if(!e)return"";let t=document.createElement("div");return t.textContent=e,t.innerHTML}function d(){return window.API_CONFIG?.BASE_URL||"/api"}function c(e=!1){let t=window.Auth?.token,a={};return t&&(a.Authorization=`Bearer ${t}`),e&&(a["Content-Type"]="application/json"),a}function u(e){return`<i data-lucide="${{angel:"feather","angel-card":"feather",astrocartography:"map-pinned",crystal:"crystal-ball","crystal-ball":"crystal-ball","daily-wisdom":"sun",horoscope:"sparkles",journal:"pen-tool","medicine-wheel":"compass",natal:"map","natal-chart":"map",numerology:"hash","past-life":"history",runes:"gem",synastry:"heart",tarot:"book-marked"}[e]||"star"}" class="reading-type-icon"></i>`}function p(e){return{angel:"And\u011Blsk\xFD vzkaz","angel-card":"And\u011Blsk\xE1 karta",astrocartography:"Astro mapa",crystal:"K\u0159i\u0161\u0165\xE1lov\xE1 koule","crystal-ball":"K\u0159i\u0161\u0165\xE1lov\xE1 koule","daily-wisdom":"Denn\xED moudrost",horoscope:"Horoskop",journal:"Manifesta\u010Dn\xED den\xEDk","medicine-wheel":"\u0160amansk\xE9 kolo",natal:"Nat\xE1ln\xED karta","natal-chart":"Nat\xE1ln\xED karta",numerology:"Numerologie","past-life":"Minul\xFD \u017Eivot",runes:"Runov\xFD v\xFDklad",synastry:"Partnersk\xE1 shoda",tarot:"Tarotov\xFD v\xFDklad"}[e]||"V\xFDklad"}var i=[],o="all",s=0,_=10,h={"crystal-ball":["crystal-ball","crystal"],"natal-chart":["natal-chart","natal"]},m=!1,f=!1;function P(){return i}function z(e,t){let a=i.find(n=>n.id===e);a&&Object.assign(a,t)}async function $(){let e=document.getElementById("readings-list");try{let t=await fetch(`${d()}/user/readings`,{credentials:"include",headers:c()});if(!t.ok)throw new Error("Failed to load readings");return i=(await t.json()).readings||[],s=0,l(),i}catch(t){return console.error("Error loading readings:",t),e&&(e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state__icon">\u26A0\uFE0F</div>
                    <p class="empty-state__text">Nepoda\u0159ilo se na\u010D\xEDst historii.</p>
                    <button class="btn btn--glass btn--sm" data-readings-action="reload">Zkusit znovu</button>
                </div>
            `,e.querySelector('[data-readings-action="reload"]')?.addEventListener("click",()=>location.reload())),[]}}function A(e){o=e.target.value,s=0,l()}function v(){if(o==="all")return i;let e=h[o]||[o];return i.filter(t=>e.includes(t.type))}function b(e){return[...e].sort((t,a)=>new Date(a.created_at)-new Date(t.created_at))[0]||null}function g(e){let t=e?.type||"reading";return t==="synastry"?{title:"Nav\xE1zat jednou konkr\xE9tn\xED vztahovou ot\xE1zkou",description:"Kdy\u017E u\u017E zn\xE1\u0161 dynamiku vztahu, dal\u0161\xED krok je kr\xE1tk\xE1 ot\xE1zka ano/ne k tomu, co te\u010F ud\u011Blat.",href:"tarot-ano-ne.html?source=profile_history_next_step&feature=tarot_yes_no&intent=relationship_follow_up",label:"Zeptat se tarotu ano/ne",feature:"tarot_yes_no",intent:"relationship_follow_up"}:t==="tarot"?{title:"Polo\u017Eit navazuj\xEDc\xED ot\xE1zku",description:"Den\xEDk m\xE1 nejv\u011Bt\u0161\xED hodnotu, kdy\u017E na prvn\xED odpov\u011B\u010F nav\xE1\u017Ee\u0161 jedn\xEDm dal\u0161\xEDm konkr\xE9tn\xEDm krokem.",href:"tarot-ano-ne.html?source=profile_history_next_step&feature=tarot_yes_no&intent=follow_up",label:"Polo\u017Eit dal\u0161\xED ot\xE1zku",feature:"tarot_yes_no",intent:"follow_up"}:{title:"Prom\u011Bnit v\xFDklad v dal\u0161\xED krok",description:"Vyber si jednu praktickou ot\xE1zku a nech Den\xEDk dr\u017Eet souvislost mezi odpov\u011B\u010Fmi.",href:"partnerska-shoda.html?source=profile_history_next_step&feature=partnerska_detail&intent=relationship_follow_up",label:"Prov\u011B\u0159it vztahov\xE9 t\xE9ma",feature:"partnerska_detail",intent:"relationship_follow_up"}}function k(e){if(o!=="all"||e.length===0)return"";let t=b(e),a=g(t);return f||(f=!0,window.MH_ANALYTICS?.trackEvent?.("profile_history_next_step_viewed",{source:"profile_history",feature:"profile_history",reading_count:e.length,latest_type:t?.type||null})),`
        <div class="profile-history-next-step">
            <div class="profile-history-next-step__copy">
                <span class="profile-history-next-step__eyebrow">Dal\u0161\xED krok po ulo\u017Een\xED</span>
                <strong>${r(a.title)}</strong>
                <p>${r(a.description)}</p>
            </div>
            <div class="profile-history-next-step__actions">
                ${t?.id?`<button class="btn btn--glass btn--sm" data-reading-action="view" data-reading-id="${r(t.id)}">Vr\xE1tit se k posledn\xEDmu v\xFDkladu</button>`:""}
                <a href="${r(a.href)}" class="btn btn--primary btn--sm" data-profile-history-next-step="${r(a.intent)}" data-analytics-cta="profile_history_next_step" data-analytics-feature="${r(a.feature)}">${r(a.label)}</a>
            </div>
        </div>
    `}function l(){let e=document.getElementById("readings-list");if(!e)return;let t=v();if(t.length===0){o==="all"&&!m&&(m=!0,window.MH_ANALYTICS?.trackEvent?.("profile_empty_history_viewed",{source:"profile_history",feature:"profile_history"})),e.innerHTML=`
            <div class="empty-state">
                <div class="empty-state__icon">\u{1F52E}</div>
                <h4 class="empty-state__title">${o==="all"?"Den\xEDk v\xFDklad\u016F zat\xEDm \u010Dek\xE1 na prvn\xED odpov\u011B\u010F":"Tady zat\xEDm nen\xED \u017E\xE1dn\xFD v\xFDklad tohoto typu"}</h4>
                <p class="empty-state__text">${o==="all"?"Tady se budou dr\u017Eet tvoje ot\xE1zky, odpov\u011Bdi a opakuj\xEDc\xED se t\xE9mata. Za\u010Dni kr\xE1tk\xFDm v\xFDkladem, a\u0165 m\xE1 profil prvn\xED sign\xE1l pro n\xE1vrat.":"Filtr je pr\xE1zdn\xFD. Zkus jin\xFD typ v\xFDkladu nebo se vra\u0165 na celou historii."}</p>
                ${o==="all"?`
                    <div class="empty-state__actions">
                        <a href="tarot-ano-ne.html?source=profile_history_empty&feature=tarot_yes_no&intent=yes_no" class="btn btn--primary btn--sm" data-analytics-cta="profile_empty_tarot_yes_no" data-analytics-feature="tarot_yes_no">Tarot ano/ne</a>
                        <a href="tarot-tri-karty.html?source=profile_history_empty&feature=tarot_multi_card&intent=three_cards" class="btn btn--glass btn--sm" data-analytics-cta="profile_empty_three_cards" data-analytics-feature="tarot_multi_card">T\u0159i karty</a>
                        <a href="kristalova-koule.html?source=profile_history_empty&feature=kristalova_koule&intent=yes_no_question" class="btn btn--glass btn--sm" data-analytics-cta="profile_empty_crystal_ball" data-analytics-feature="kristalova_koule">K\u0159i\u0161\u0165\xE1lov\xE1 koule</a>
                    </div>
                `:""}
            </div>
        `,y(0,0);return}let a=t.slice(0,s+_);s=a.length,e.innerHTML=`${k(t)}${a.map(n=>`
        <div class="reading-item card" data-reading-id="${r(n.id)}" role="button" tabindex="0">
            <div class="reading-item__inner">
                <div class="reading-item__left">
                    <span class="reading-item__icon" aria-hidden="true">${u(n.type)}</span>
                    <div>
                        <strong>${r(p(n.type))}</strong>
                        <p class="reading-item__date">
                            ${new Date(n.created_at).toLocaleDateString("cs-CZ",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </p>
                    </div>
                </div>
                <div class="reading-item__actions">
                    <button class="btn btn--sm btn--glass" data-reading-action="favorite" data-reading-id="${r(n.id)}"
                        title="${n.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"}"
                        aria-label="${n.is_favorite?"Odebrat z obl\xEDben\xFDch":"P\u0159idat do obl\xEDben\xFDch"}">
                        ${n.is_favorite?"\u2B50":"\u2606"}
                    </button>
                    <button class="btn btn--sm btn--glass" data-reading-action="view" data-reading-id="${r(n.id)}" aria-label="Zobrazit detail">Zobrazit</button>
                </div>
            </div>
        </div>
    `).join("")}`,y(s,t.length)}function T(){l()}function y(e,t){let a=document.getElementById("readings-pagination");if(a)if(e<t){a.hidden=!1,a.classList.add("profile-block-visible");let n=document.getElementById("readings-load-more");n&&(n.textContent=`Na\u010D\xEDst dal\u0161\xED (${t-e} zb\xFDv\xE1)`)}else a.hidden=!0,a.classList.remove("profile-block-visible")}export{P as getAllReadings,A as handleFilterChange,$ as loadReadings,l as renderReadings,T as showMoreReadings,z as updateReading};

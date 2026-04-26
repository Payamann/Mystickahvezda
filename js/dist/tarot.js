(()=>{let v={},w=[];function y(e){return e==="Celtic Cross"?"vip-majestrat":"pruvodce"}function h(e,a="tarot_inline_upsell"){const s=y(e);window.MH_ANALYTICS?.trackCTA?.(a,{plan_id:s,spread_type:e}),window.Auth?.startPlanCheckout?.(s,{source:a,feature:e==="Celtic Cross"?"tarot_celtic_cross":"tarot_multi_card",redirect:"/cenik.html",authMode:window.Auth?.isLoggedIn?.()?"login":"register"})}function C(e){e.querySelectorAll(".tarot-card-image").forEach(a=>{a.addEventListener("error",()=>{a.dataset.fallbackApplied!=="1"&&(a.dataset.fallbackApplied="1",a.src="/img/tarot/tarot_placeholder.webp")})})}document.addEventListener("DOMContentLoaded",async()=>{await T(),_()});async function T(){try{const e=await fetch("/data/tarot-cards.json?v=2");if(!e.ok)throw new Error("Failed to load tarot data");v=await e.json(),w=Object.keys(v),window.MH_DEBUG&&console.debug("Tarot data loaded:",w.length,"cards")}catch(e){console.error("CRITICAL: Failed to load tarot cards:",e);const a=document.querySelector(".tarot-deck");a&&(a.innerHTML='<div class="text-center tarot-load-error">Nepoda\u0159ilo se na\u010D\xEDst data karet. Zkontrolujte p\u0159ipojen\xED.</div>')}}function _(){const e=document.querySelectorAll(".spread-trigger"),a=document.querySelectorAll(".t-spread-card"),s=document.querySelector(".tarot-deck");if(!s)return;let c=document.getElementById("tarot-results");if(!c){c=document.createElement("div"),c.id="tarot-results",c.className="container hidden tarot-results";const o=s.closest(".section");o?o.after(c):document.body.appendChild(c)}a.forEach(o=>{o.addEventListener("click",()=>{a.forEach(i=>{i.classList.remove("featured");const p=i.querySelector(".btn");p&&(p.classList.remove("btn--primary"),p.classList.add("btn--glass"))}),o.classList.add("featured");const n=o.querySelector(".btn");n&&(n.classList.remove("btn--glass"),n.classList.add("btn--primary"))})}),e.forEach(o=>{o.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation();const i=o.dataset.spreadType;let p=!1;if(i!=="Jedna karta"){if(!window.Auth||!window.Auth.isLoggedIn()){window.Auth?.showToast("P\u0159ihl\xE1\u0161en\xED vy\u017Eadov\xE1no","Pro vstup do Hv\u011Bzdn\xE9ho Pr\u016Fvodce se pros\xEDm p\u0159ihlaste.","info"),h(i,"tarot_auth_gate");return}if(!window.Auth?.isPremium()){p=!0;const m=new Date().toISOString().split("T")[0];let r={};try{r=JSON.parse(localStorage.getItem("tarot_free_usage")||"{}")}catch{localStorage.removeItem("tarot_free_usage")}if(r.date===m&&r.count>=1){window.Auth.showToast("Limit vy\u010Derp\xE1n \u{1F512}","Dne\u0161n\xED uk\xE1zka zdarma ji\u017E byla vy\u010Derp\xE1na. Z\xEDskejte Premium pro neomezen\xE9 v\xFDklady.","error"),h(i,"tarot_limit_gate");return}localStorage.setItem("tarot_free_usage",JSON.stringify({date:m,count:1}))}}const f=o.closest(".t-spread-card");f&&!f.classList.contains("featured")&&f.click(),i&&b(i,p)})}),s.querySelectorAll(".tarot-card").forEach(o=>{o.classList.add("tarot-card--clickable"),o.addEventListener("click",()=>{const n=document.querySelector(".t-spread-card.featured .btn"),i=n?n.dataset.spreadType:"Jedna karta";b(i)})})}function g(e){const a=document.createElement("div");return a.textContent=e,a.innerHTML}async function b(e,a=!1){const s=document.querySelector(".tarot-deck");if(!s)return;s.scrollIntoView({behavior:"smooth",block:"center"}),await new Promise(t=>setTimeout(t,300)),s.classList.add("tarot-deck--shuffle-scale"),s.classList.add("shaking"),await new Promise(t=>setTimeout(t,1500)),s.classList.remove("shaking"),s.classList.remove("tarot-deck--shuffle-scale"),await new Promise(t=>setTimeout(t,300));const c=w.filter(t=>v[t].image);let u=1;e==="T\u0159i karty"&&(u=3),e==="Celtic Cross"&&(u=10);const o=[];for(;o.length<u&&o.length<c.length;){const t=c[Math.floor(Math.random()*c.length)];o.includes(t)||o.push(t)}const n=o.map(t=>({name:t,...v[t]})),i=document.getElementById("tarot-results");if(!i)return;const p=u===1?"grid-1":u<=3?`grid-${u}`:"grid-5";i.innerHTML=`
        <div class="text-center">
            <h3 class="mb-lg tarot-results__title">\u2728 Va\u0161e vylosovan\xE9 karty \u2728</h3>
            <div class="tarot-spread grid ${p} tarot-results__spread">
                ${n.map((t,l)=>{const d=a&&l>0;return`
                    <div class="tarot-flip-card ${d?"locked-card":""}" data-index="${l}">
                        <div class="tarot-flip-inner">
                            <div class="tarot-flip-front">
                                <img src="img/tarot-back.webp" alt="Tarot Card Back">
                            </div>
                            <div class="tarot-flip-back ${t.image?"has-image":""}">
                                ${d?`
                                    <div class="premium-lock-overlay tarot-card-lock">
                                        <div class="lock-icon tarot-card-lock__icon">\u{1F512}</div>
                                        <h2 class="tarot-card-lock__title">Pouze pro Premium</h2>
                                        <p class="tarot-card-lock__copy">
                                            Hv\u011Bzdn\xFD Pr\u016Fvodce je exkluzivn\xED zdroj moudrosti pro na\u0161e p\u0159edplatitele.<br>
                                            Odemkn\u011Bte pln\xFD potenci\xE1l a z\xEDskejte p\u0159\xEDstup ke v\u0161em v\xFDklad\u016Fm.
                                        </p>
                                        <a href="cenik.html" class="btn btn--primary">Z\xEDskat Premium</a>
                                    </div>
                                    <img src="img/tarot-back.webp" class="tarot-card-image--locked" alt="Locked">
                                `:t.image?`
                                    <img src="${t.image}" alt="${g(t.name)}" class="tarot-card-image" loading="lazy">
                                `:`
                                    <div class="tarot-card-content">
                                        <span class="tarot-card-emoji">${t.emoji}</span>
                                        <h4 class="tarot-card-name">${g(t.name)}</h4>
                                        <p class="tarot-card-meaning">${g(t.meaning)}</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                `}).join("")}
            </div>
            <div id="interpretations-container" class="tarot-interpretations"></div>
             ${a?`
                <div class="text-center mt-xl p-lg tarot-soft-gate">
                    <h3 class="tarot-soft-gate__title">Odemkn\u011Bte sv\u016Fj osud</h3>
                    <p class="mb-lg">Pr\xE1v\u011B jste nahl\xE9dli za oponu. Zb\xFDvaj\xEDc\xEDch ${u-1} karet skr\xFDv\xE1 kl\xED\u010D k pochopen\xED cel\xE9 situace.</p>
                    <a href="cenik.html" class="btn btn--primary">Z\xEDskat Premium a odhalit v\u0161e</a>
                </div>
            `:""}
        </div>
    `,i.classList.remove("hidden"),C(i),i.querySelectorAll('a[href="cenik.html"]').forEach(t=>{t.addEventListener("click",l=>{l.preventDefault();const d=t.closest(".premium-lock-overlay")?"tarot_locked_card":"tarot_teaser_banner";h(e,d)})}),await new Promise(t=>setTimeout(t,100)),i.scrollIntoView({behavior:"smooth"});const f=i.querySelectorAll(".tarot-flip-card");for(let t=0;t<f.length;t++)await new Promise(l=>setTimeout(l,600)),f[t].classList.add("flipped");await new Promise(t=>setTimeout(t,800));const m=document.getElementById("interpretations-container");let r=n.map((t,l)=>{if(a&&l>0)return"";let d="";e==="T\u0159i karty"?d=["\u{1F4DC} Minulost","\u23F3 P\u0159\xEDtomnost","\u{1F52E} Budoucnost"][l]||"":e==="Celtic Cross"&&(d=["\u{1F3AF} Situace","\u2694\uFE0F V\xFDzva","\u{1F4AB} Podv\u011Bdom\xED","\u{1F3DB}\uFE0F Z\xE1klad","\u{1F305} Minulost","\u{1F52E} Budoucnost","\u{1F9D8} Postoj","\u{1F30D} Vliv okol\xED","\u{1F4AD} Nad\u011Bje/Obavy","\u{1F3C1} V\xFDsledek"][l]||"");const k=Object.keys(v).indexOf(t.name)<22;return window.Templates?window.Templates.renderTarotResult(t,l,k,d):(console.error("Templates library missing"),"")}).join("");if(u>1&&window.Templates&&!a&&(e==="T\u0159i karty"?r+=window.Templates.renderSummary3Card(n):e==="Celtic Cross"?r+=window.Templates.renderSummaryCeltic(n):r+=window.Templates.renderSummaryDefault(n)),m.innerHTML=r,u>1&&!a)setTimeout(()=>L(n,e),500);else if(window.Auth&&window.Auth.saveReading){const t=n.slice(0,a?1:void 0).map((d,k)=>({name:d.name,position:"Jedna karta",meaning:d.meaning})),l=await window.Auth.saveReading("tarot",{spreadType:a?`${e} (Uk\xE1zka)`:e,cards:t});if(l&&l.id){window.currentTarotReadingId=l.id;const d=document.createElement("div");d.className="text-center favorite-reading-action",d.innerHTML=`
                    <button id="favorite-tarot-btn" class="btn btn--glass favorite-reading-action__button">
                        <span class="favorite-icon">\u2B50</span> P\u0159idat do obl\xEDben\xFDch
                    </button>
                `,m.appendChild(d),document.getElementById("favorite-tarot-btn").addEventListener("click",async()=>{await toggleFavorite(window.currentTarotReadingId,"favorite-tarot-btn")})}}}async function L(e,a){const s=document.getElementById("ethereal-tarot-summary");if(s)try{const c=e.map((f,m)=>{let r="";return a==="T\u0159i karty"?r=["Minulost","P\u0159\xEDtomnost","Budoucnost"][m]||`Pozice ${m+1}`:a==="Celtic Cross"?r=["Situace","V\xFDzva","Podv\u011Bdom\xED","Z\xE1klad","Minulost","Budoucnost","Postoj","Vliv okol\xED","Nad\u011Bje/Obavy","V\xFDsledek"][m]||`Pozice ${m+1}`:r=`Karta ${m+1}`,{name:f.name,position:r,meaning:f.meaning}}),u=window.location.pathname;let o="cs";u.includes("/sk/")?o="sk":u.includes("/pl/")&&(o="pl");const n=window.getCSRFToken?await window.getCSRFToken():null,p=await(await fetch(`${window.API_CONFIG?.BASE_URL||"/api"}/tarot-summary`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...n&&{"X-CSRF-Token":n}},body:JSON.stringify({spreadType:a,cards:c,lang:o})})).json();if(p.success){const m=p.response.split(`
`).filter(r=>r.trim().length>0).map(r=>`<p class="mb-md">${r}</p>`).join("");if(s.innerHTML=typeof DOMPurify<"u"?DOMPurify.sanitize(m):m,window.Auth&&window.Auth.saveReading){const r=await window.Auth.saveReading("tarot",{spreadType:a,cards:c,response:p.response});if(r&&r.id){window.currentTarotReadingId=r.id;const t=document.createElement("div");t.className="text-center favorite-reading-action",t.innerHTML=`
                        <button id="favorite-tarot-btn" class="btn btn--glass favorite-reading-action__button">
                            <span class="favorite-icon">\u2B50</span> P\u0159idat do obl\xEDben\xFDch
                        </button>
                    `,s.parentElement.appendChild(t),document.getElementById("favorite-tarot-btn").addEventListener("click",async()=>{await toggleFavorite(window.currentTarotReadingId,"favorite-tarot-btn")})}}s.parentElement.classList.add("fade-in")}else throw new Error(p.error||"Failed to generate summary")}catch(c){console.error("AI Summary Error:",c),s.innerHTML=`
            <p class="text-center tarot-summary-error">
                <em>Hv\u011Bzdy jsou nyn\xED p\u0159\xEDli\u0161 daleko... (Spojen\xED selhalo)</em>
            </p>
        `}}})();

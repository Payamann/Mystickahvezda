(()=>{(function(){"use strict";const h=`
        <button class="share-result-btn" aria-label="Sd\xEDlet v\xFDsledek">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Sd\xEDlet v\xFDsledek
        </button>
        <div class="share-toast" role="status" aria-live="polite">\u2705 Odkaz zkop\xEDrov\xE1n do schr\xE1nky!</div>
    `,w=`
        .share-result-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.65rem 1.4rem;
            background: transparent;
            border: 1px solid rgba(212,175,55,0.5);
            border-radius: 50px;
            color: var(--color-mystic-gold, #d4af37);
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 0.3s;
            margin-top: 1rem;
        }
        .share-result-btn:hover {
            background: rgba(212,175,55,0.1);
        }
        .share-toast {
            display: none;
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20,15,40,0.95);
            border: 1px solid rgba(212,175,55,0.4);
            padding: 0.75rem 1.5rem;
            border-radius: 50px;
            color: white;
            font-size: 0.9rem;
            z-index: 9999;
            backdrop-filter: blur(10px);
        }
        .share-toast.visible {
            display: block;
            animation: shareToastIn 0.3s ease;
        }
        @keyframes shareToastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;function _(){}function m(e){const t=new URL(window.location.href);return t.searchParams.set("utm_source",e),t.searchParams.set("utm_medium","share"),t.searchParams.set("utm_campaign","result_share"),t.toString()}function s(e,t={}){window.MH_ANALYTICS?.trackEvent?.(e,{source:"result_share",page_path:window.location.pathname,...t})}function p(e,t,n){if(!e||e.querySelector(".share-result-btn"))return;const r=document.createElement("div");r.innerHTML=h;const l=e.querySelector("#detail-numbers");if(l){const a=l.closest("p")||l.parentElement;r.classList.add("share-result-wrapper--horoscope"),a.insertAdjacentElement("afterend",r)}else e.appendChild(r);const f=r.querySelector(".share-result-btn"),k=r.querySelector(".share-toast");f.addEventListener("click",async()=>{const a=n||document.querySelector(".reading-text, .result-text, [data-share-text]")?.innerText?.slice(0,200)||"",u=t||document.title,d=/Android|iPhone|iPad/i.test(navigator.userAgent)?"mobile_share":"web_share",i=m(d),o={share_method:navigator.share?"native":"clipboard",utm_source:d,has_share_text:!!a};if(s("share_click",o),navigator.share)try{await navigator.share({title:u,text:a,url:i}),s("share_completed",{...o,share_method:"native"});return}catch{}try{await navigator.clipboard.writeText(`${u}

${i}`),b(k),s("share_completed",{...o,share_method:"clipboard"})}catch{s("share_fallback_prompted",o),prompt("Zkop\xEDrujte odkaz:",i)}})}function b(e){e.classList.add("visible"),setTimeout(()=>{e.classList.remove("visible")},3e3)}const g=[".reading-result",".ai-result",".result-section",".crystal-result",".natal-result",".numerology-result",".synastry-result",".mentor-result","#ai-reading",".oracle-response","#tarot-result","#tarot-results","#result-panel","#horoscope-result","#chart-results","#numerology-results","#phaseCard","#astro-results","#answer-container","#biorhythm-results","#aura-result","#messages-container"],y=new Set([]);function c(){g.forEach(e=>{const t=document.querySelector(e);if(!(!t||t.querySelector(".share-result-btn"))&&!(y.has(e)&&!t.dataset.loaded)&&t.children.length>0){const n=document.title.replace(" | Mystick\xE1 Hv\u011Bzda","");p(t,`M\u016Fj v\xFDsledek: ${n} | Mystick\xE1 Hv\u011Bzda`)}})}function v(){c(),new MutationObserver(c).observe(document.body,{childList:!0,subtree:!0})}document.addEventListener("DOMContentLoaded",()=>{v()})})();})();

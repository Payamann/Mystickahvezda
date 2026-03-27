(function(){"use strict";const c=`
        <button class="share-result-btn" aria-label="Sd\xEDlet v\xFDsledek" style="
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.65rem 1.4rem;
            background: transparent;
            border: 1px solid rgba(212,175,55,0.5);
            border-radius: 50px;
            color: var(--color-mystic-gold, #d4af37);
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 1rem;
        " onmouseover="this.style.background='rgba(212,175,55,0.1)'" onmouseout="this.style.background='transparent'">
            <span>\u{1F517}</span> Sd\xEDlet v\xFDsledek
        </button>
        <div class="share-toast" style="
            display: none; position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
            background: rgba(20,15,40,0.95); border: 1px solid rgba(212,175,55,0.4);
            padding: 0.75rem 1.5rem; border-radius: 50px; color: white;
            font-size: 0.9rem; z-index: 9999; backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease;
        ">\u2705 Odkaz zkop\xEDrov\xE1n do schr\xE1nky!</div>
    `;function d(e,r,s){if(!e||e.querySelector(".share-result-btn"))return;const t=document.createElement("div");t.innerHTML=c;const o=e.querySelector("#detail-numbers");if(o){const n=o.closest("p")||o.parentElement;t.style.textAlign="center",t.style.marginTop="1.5rem",t.style.marginBottom="1.5rem",n.insertAdjacentElement("afterend",t)}else e.appendChild(t);const y=t.querySelector(".share-result-btn"),b=t.querySelector(".share-toast");y.addEventListener("click",async()=>{const n=s||document.querySelector(".reading-text, .result-text, [data-share-text]")?.innerText?.slice(0,200)||"",a=window.location.href,i=r||document.title;if(navigator.share)try{await navigator.share({title:i,text:n,url:a});return}catch{}try{await navigator.clipboard.writeText(`${i}

${a}`),u(b)}catch{prompt("Zkop\xEDrujte odkaz:",a)}})}function u(e){e.style.display="block",setTimeout(()=>{e.style.display="none"},3e3)}const m=[".reading-result",".ai-result",".result-section",".crystal-result",".natal-result",".numerology-result",".synastry-result",".mentor-result","#ai-reading",".oracle-response","#tarot-result","#tarot-results","#result-panel","#horoscope-result","#horoscope-detail-section","#chart-results","#numerology-results","#phaseCard","#astro-results","#answer-container","#biorhythm-results","#aura-result","#messages-container"],p=new Set(["#horoscope-detail-section"]);function l(){m.forEach(e=>{const r=document.querySelector(e);if(!(!r||r.querySelector(".share-result-btn"))&&!(p.has(e)&&!r.dataset.loaded)&&r.children.length>0){const s=document.title.replace(" | Mystick\xE1 Hv\u011Bzda","");d(r,`M\u016Fj v\xFDsledek: ${s} | Mystick\xE1 Hv\u011Bzda`)}})}function h(){l(),new MutationObserver(l).observe(document.body,{childList:!0,subtree:!0})}document.addEventListener("DOMContentLoaded",h)})();

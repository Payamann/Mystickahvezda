(function(){"use strict";const t="mh_exit_shown";let s=Date.now(),n=!1;if(["/prihlaseni","/onboarding","/404","/profil"].some(e=>window.location.pathname.includes(e))||sessionStorage.getItem(t))return;function d(){const e=document.createElement("div");e.id="exit-intent-modal",e.style.cssText=`
            position: fixed; inset: 0; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
            animation: fadeIn 0.3s ease;
        `,e.innerHTML=`
            <div style="
                max-width: 480px; width: 90%;
                background: linear-gradient(135deg, #0f0a22, #1a0a35);
                border: 1px solid rgba(212,175,55,0.4);
                border-radius: 24px;
                padding: 2.5rem 2rem;
                text-align: center;
                position: relative;
                box-shadow: 0 40px 80px rgba(0,0,0,0.5);
                animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1);
            ">
                <button id="exit-close" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; color: rgba(255,255,255,0.4);
                    font-size: 1.5rem; cursor: pointer; line-height: 1;
                    transition: color 0.2s;
                " aria-label="Zav\u0159\xEDt" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">\xD7</button>

                <div style="font-size: 3rem; margin-bottom: 1rem;">\u{1F31F}</div>
                <h2 style="font-family: 'Cinzel', serif; color: #d4af37; font-size: 1.4rem; margin-bottom: 0.75rem;">
                    Po\u010Dkejte \u2014 hv\u011Bzdy maj\xED pro v\xE1s zpr\xE1vu
                </h2>
                <p style="color: rgba(255,255,255,0.65); line-height: 1.7; margin-bottom: 1.5rem; font-size: 0.95rem;">
                    Vyzkou\u0161ejte nat\xE1ln\xED kartu, tarot a personalizovan\xE9 horoskopy.<br>
                    <strong style="color: #d4af37;">7 dn\xED zcela zdarma</strong> \u2014 bez platebn\xED karty.
                </p>

                <a href="/cenik.html" id="exit-cta" style="
                    display: block; padding: 0.9rem 2rem;
                    background: linear-gradient(135deg, #9b59b6, #6c3483);
                    border-radius: 50px; color: white; text-decoration: none;
                    font-weight: 700; font-size: 1rem; margin-bottom: 1rem;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 8px 30px rgba(155,89,182,0.4);
                " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 40px rgba(155,89,182,0.5)'"
                   onmouseout="this.style.transform='';this.style.boxShadow='0 8px 30px rgba(155,89,182,0.4)'">
                    \u2728 Za\u010D\xEDt 7 dn\xED zdarma
                </a>

                <button id="exit-dismiss" style="
                    background: none; border: none;
                    color: rgba(255,255,255,0.35); font-size: 0.85rem;
                    cursor: pointer; padding: 0.5rem;
                    text-decoration: underline;
                " onmouseover="this.style.color='rgba(255,255,255,0.6)'" onmouseout="this.style.color='rgba(255,255,255,0.35)'">
                    Ne, d\xEDky \u2014 odej\xEDt
                </button>

                <p style="color: rgba(255,255,255,0.2); font-size: 0.75rem; margin-top: 0.75rem;">
                    Zru\u0161en\xED kdykoliv \u2022 GDPR chr\xE1n\u011Bno
                </p>
            </div>
        `,document.body.appendChild(e);function o(){e.style.animation="fadeOut 0.2s ease forwards",setTimeout(()=>e.remove(),200)}e.addEventListener("click",l=>{l.target===e&&o()}),document.getElementById("exit-close").addEventListener("click",o),document.getElementById("exit-dismiss").addEventListener("click",o),document.getElementById("exit-cta").addEventListener("click",()=>{sessionStorage.setItem(t,"1")})}function r(){n||Date.now()-s<15e3||typeof window.Auth<"u"&&window.Auth.isLoggedIn?.()||(n=!0,sessionStorage.setItem(t,"1"),d())}document.addEventListener("mouseleave",e=>{e.clientY<=0&&r()});let i;document.addEventListener("visibilitychange",()=>{document.hidden?i=setTimeout(r,1e3):clearTimeout(i)});const a=document.createElement("style");a.textContent=`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeOut { to { opacity: 0; } }
    `,document.head.appendChild(a)})();

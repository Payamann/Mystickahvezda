(function(){"use strict";const o="mh_exit_shown",u={tarot:"tarot",horoskopy:"horoskopy","partnerska-shoda":"partnerska_detail",numerologie:"numerologie_vyklad",runy:"runy_hluboky_vyklad","natalni-karta":"natalni_interpretace",mentor:"hvezdny_mentor","shamanske-kolo":"shamanske_kolo_plne_cteni","minuly-zivot":"minuly_zivot","kristalova-koule":"kristalova_koule"};let m=Date.now(),a=!1;if(["/prihlaseni","/onboarding","/404","/profil"].some(e=>window.location.pathname.includes(e))||sessionStorage.getItem(o))return;function p(){return window.location.pathname.split("/").pop()?.replace(".html","")||"homepage"}function s(){const e=p();return{planId:"pruvodce",source:`exit_intent_${e}`,feature:u[e]||e,redirect:"/cenik.html",authMode:"register"}}function n(e,t={}){window.MH_ANALYTICS?.trackEvent?.(e,{location:window.location.pathname,...t})}function h(){const e=s(),t=document.createElement("div");t.id="exit-intent-modal",t.style.cssText=`
            position: fixed; inset: 0; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
            animation: fadeIn 0.3s ease;
        `,t.innerHTML=`
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
                <button id="exit-close" type="button" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; color: rgba(255,255,255,0.4);
                    font-size: 1.5rem; cursor: pointer; line-height: 1;
                    transition: color 0.2s;
                " aria-label="Zav\u0159\xEDt"
                    onmouseover="this.style.color='white'"
                    onmouseout="this.style.color='rgba(255,255,255,0.4)'">\xD7</button>

                <div style="font-size: 3rem; margin-bottom: 1rem;">\u{1F31F}</div>
                <h2 style="font-family: 'Cinzel', serif; color: #d4af37; font-size: 1.4rem; margin-bottom: 0.75rem;">
                    Tv\u016Fj v\xFDklad jde mnohem d\xE1l
                </h2>
                <div style="color: rgba(255,255,255,0.7); line-height: 2; margin-bottom: 1.5rem; font-size: 0.92rem; text-align: left; display: inline-block;">
                    <div>\u{1F52E} Nat\xE1ln\xED karta a partnersk\xE1 shoda</div>
                    <div>\u{1F319} Horoskopy bez omezen\xED</div>
                    <div>\u2728 Tarot, runy, v\xFDklady a mnohem v\xEDc</div>
                </div>
                <p style="color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 1.5rem; font-size: 0.88rem;">
                    Pokud u\u017E c\xEDt\xED\u0161, \u017Ee chce\u0161 v\xEDc ne\u017E jen n\xE1hled, Hv\u011Bzdn\xFD Pr\u016Fvodce t\u011B vezme do hloubky.
                </p>

                <button id="exit-cta" type="button" style="
                    display: block; width: 100%;
                    padding: 0.9rem 2rem;
                    background: linear-gradient(135deg, #9b59b6, #6c3483);
                    border-radius: 50px; color: white; text-decoration: none;
                    font-weight: 700; font-size: 1rem; margin-bottom: 1rem;
                    border: none; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 8px 30px rgba(155,89,182,0.4);
                " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 40px rgba(155,89,182,0.5)'"
                   onmouseout="this.style.transform='';this.style.boxShadow='0 8px 30px rgba(155,89,182,0.4)'">
                    \u2728 Pokra\u010Dovat k pln\xE9mu p\u0159\xEDstupu \u2192
                </button>

                <button id="exit-dismiss" type="button" style="
                    background: none; border: none;
                    color: rgba(255,255,255,0.35); font-size: 0.85rem;
                    cursor: pointer; padding: 0.5rem;
                    text-decoration: underline;
                " onmouseover="this.style.color='rgba(255,255,255,0.6)'"
                   onmouseout="this.style.color='rgba(255,255,255,0.35)'">
                    Zat\xEDm ne, z\u016Fstanu u z\xE1kladn\xED verze
                </button>

                <p style="color: rgba(255,255,255,0.2); font-size: 0.75rem; margin-top: 0.75rem;">
                    GDPR chr\xE1n\u011Bno
                </p>
            </div>
        `,document.body.appendChild(t);function i(r="overlay"){n("exit_intent_dismissed",{action:r,source:e.source,feature:e.feature}),t.style.animation="fadeOut 0.2s ease forwards",setTimeout(()=>t.remove(),200)}t.addEventListener("click",r=>{r.target===t&&i("overlay")}),document.getElementById("exit-close")?.addEventListener("click",()=>i("close_button")),document.getElementById("exit-dismiss")?.addEventListener("click",()=>i("dismiss_button")),document.getElementById("exit-cta")?.addEventListener("click",()=>{if(sessionStorage.setItem(o,"1"),n("exit_intent_cta_clicked",{plan_id:e.planId,source:e.source,feature:e.feature}),window.Auth?.startPlanCheckout){window.Auth.startPlanCheckout(e.planId,e);return}window.location.href=e.redirect})}function d(){if(a||Date.now()-m<15e3||window.Auth?.isPremium?.())return;const e=s();a=!0,sessionStorage.setItem(o,"1"),n("exit_intent_shown",{source:e.source,feature:e.feature,logged_in:!!window.Auth?.isLoggedIn?.()}),h()}document.addEventListener("mouseleave",e=>{e.clientY<=0&&d()});let l;document.addEventListener("visibilitychange",()=>{document.hidden?l=setTimeout(d,1e3):clearTimeout(l)});const c=document.createElement("style");c.textContent=`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeOut { to { opacity: 0; } }
    `,document.head.appendChild(c)})();

function u(e,t){let n;return function(...i){clearTimeout(n),n=setTimeout(()=>e.apply(this,i),t)}}var E={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function l(e){return String(e).replace(/[&<>"']/g,t=>E[t])}var d="1.0",g="mh_user_prefs",c={STORAGE_KEY:g,STORAGE_VERSION:d,get(){try{let e=JSON.parse(localStorage.getItem(g))||{};return e.version||(e.version=d),e}catch{return{version:d}}},set(e){let n={...this.get(),...e,version:d};localStorage.setItem(g,JSON.stringify(n))},getSign(){return this.get().sign||null},getName(){return this.get().name||null},setSign(e){this.set({sign:e,signSetAt:Date.now()})},setName(e){this.set({name:e})}};window.MH_PERSONALIZATION=c;var r={beran:{label:"Beran",emoji:"\u2648",dates:"21. 3. \u2013 19. 4."},byk:{label:"B\xFDk",emoji:"\u2649",dates:"20. 4. \u2013 20. 5."},blizenci:{label:"Bl\xED\u017Eenci",emoji:"\u264A",dates:"21. 5. \u2013 20. 6."},rak:{label:"Rak",emoji:"\u264B",dates:"21. 6. \u2013 22. 7."},lev:{label:"Lev",emoji:"\u264C",dates:"23. 7. \u2013 22. 8."},panna:{label:"Panna",emoji:"\u264D",dates:"23. 8. \u2013 22. 9."},vahy:{label:"V\xE1hy",emoji:"\u264E",dates:"23. 9. \u2013 22. 10."},stir:{label:"\u0160t\xEDr",emoji:"\u264F",dates:"23. 10. \u2013 21. 11."},strelec:{label:"St\u0159elec",emoji:"\u2650",dates:"22. 11. \u2013 21. 12."},kozoroh:{label:"Kozoroh",emoji:"\u2651",dates:"22. 12. \u2013 19. 1."},vodnar:{label:"Vodn\xE1\u0159",emoji:"\u2652",dates:"20. 1. \u2013 18. 2."},ryby:{label:"Ryby",emoji:"\u2653",dates:"19. 2. \u2013 20. 3."}};window.SIGNS_CZ=r;function m(){let e=document.getElementById("personalized-greeting");if(!e)return;if(!(!!(window.Auth?.user&&window.Auth?.isLoggedIn?.())&&document.cookie.includes("logged_in=1"))){e.classList.remove("personalized-greeting--visible"),e.setAttribute("aria-hidden","true"),e.removeAttribute("href"),e.textContent="";return}let n=c.getSign(),i=c.getName();if(n&&r[n]){let a=r[n],s=new Date().getHours(),o=s<12?"Dobr\xE9 r\xE1no":s<18?"Dobr\xFD den":"Dobr\xFD ve\u010Der",f=i?`, ${l(i)}`:"",_=`${a.emoji}\uFE0E`;e.innerHTML=`
            <span class="greeting-icon" aria-hidden="true">${_}</span>
            <span class="greeting-text">${o}${f}! Tv\u016Fj dne\u0161n\xED v\xFDhled pro ${a.label} \u2192</span>
        `,e.href=`horoskopy.html#${n}`,e.setAttribute("aria-hidden","false"),e.classList.add("personalized-greeting--visible")}else e.classList.remove("personalized-greeting--visible"),e.setAttribute("aria-hidden","true"),e.removeAttribute("href"),e.textContent=""}function S(){let e=c.getSign();if(!e)return;document.querySelectorAll(".zodiac-card").forEach(n=>{let i=n.getAttribute("href"),a=i?i.substring(1):null,s=n.querySelector(".zodiac-card__badge");if(s&&s.remove(),a===e&&r[a]){n.classList.add("zodiac-card--highlighted");let o=document.createElement("span");o.className="zodiac-card__badge",o.textContent="Tvoje znamen\xED",n.appendChild(o),window.location.hash===`#${e}`&&requestAnimationFrame(()=>{n.scrollIntoView({behavior:"smooth",block:"center"})})}else n.classList.remove("zodiac-card--highlighted")})}var v=u(e=>{c.setSign(e),S(),b()},100);function T(e){let t=c.getSign();if(e.className="sign-picker",t&&r[t]){let n=r[t];e.innerHTML=`
            <div class="sign-picker__header">
                <span class="sign-picker__label">Tvoje znamen\xED:</span>
                <button id="sign-picker-toggle"
                    class="sign-picker__button"
                    aria-expanded="false"
                    aria-controls="sign-picker-expanded"
                    data-action="toggle-expanded"
                    title="Zobrazit/skr\xFDt v\u0161echna znamen\xED">
                    ${l(n.label)}
                </button>
                <button class="sign-picker__change-btn"
                    data-action="toggle-expanded"
                    title="Zm\u011Bnit znamen\xED">\u270E Zm\u011Bnit</button>
            </div>
            <div id="sign-picker-expanded" class="sign-picker__expanded" role="region" aria-label="V\xFDb\u011Br znamen\xED">
                ${Object.entries(r).map(([i,a])=>`
                    <button class="sign-picker__sign-btn ${t===i?"active":""}"
                        data-pick="${i}"
                        data-action="pick-sign"
                        title="${a.dates}"
                        aria-pressed="${t===i?"true":"false"}">
                        ${l(a.label)}
                    </button>
                `).join("")}
            </div>
        `}else e.innerHTML=`
            <div class="sign-picker__header">
                <span class="sign-picker__label">Tvoje znamen\xED:</span>
            </div>
            <div id="sign-picker-expanded" class="sign-picker__expanded active" role="region" aria-label="V\xFDb\u011Br znamen\xED">
                ${Object.entries(r).map(([n,i])=>`
                    <button class="sign-picker__sign-btn"
                        data-pick="${n}"
                        data-action="pick-sign"
                        title="${i.dates}">
                        ${l(i.label)}
                    </button>
                `).join("")}
            </div>
        `}function h(e){let t=document.getElementById("mh-sign-picker");if(!t)return;let n=e.target.closest("[data-action]")?.dataset.action,i=e.target.closest("[data-pick]");if(n==="toggle-expanded")e.preventDefault(),A(t);else if(i){e.preventDefault();let a=i.dataset.pick;a&&r[a]&&v(a)}}function b(){let e=document.getElementById("mh-sign-picker");e&&(T(e),e.removeEventListener("click",h),e.addEventListener("click",h))}function A(e){let t=e.querySelector("#sign-picker-expanded"),n=e.querySelector("#sign-picker-toggle");t&&(t.classList.toggle("active"),n&&n.setAttribute("aria-expanded",t.classList.contains("active")?"true":"false"))}var k={STORAGE_KEY_STREAK:"mh_horoscope_streak",STORAGE_KEY_LAST_DATE:"mh_last_horoscope_date",STORAGE_KEY_BEST_STREAK:"mh_best_horoscope_streak",getStreak(){return parseInt(localStorage.getItem(this.STORAGE_KEY_STREAK)||"0")},getBestStreak(){return parseInt(localStorage.getItem(this.STORAGE_KEY_BEST_STREAK)||"0")},incrementStreak(){try{let e=new Date().toDateString(),t=localStorage.getItem(this.STORAGE_KEY_LAST_DATE);if(t===e)return this.getStreak();let n=new Date(Date.now()-864e5).toDateString();if(t!==n&&t!==null)localStorage.setItem(this.STORAGE_KEY_STREAK,"1");else{let s=this.getStreak()+1;localStorage.setItem(this.STORAGE_KEY_STREAK,s);let o=this.getBestStreak();s>o&&localStorage.setItem(this.STORAGE_KEY_BEST_STREAK,s)}return localStorage.setItem(this.STORAGE_KEY_LAST_DATE,e),this.getStreak()}catch(e){return console.warn("Streak tracking failed:",e),0}},resetStreak(){localStorage.removeItem(this.STORAGE_KEY_LAST_DATE)},displayStreak(){let e=this.getStreak();if(e<1)return;let t=document.getElementById("mh-streak-badge");t||(t=document.createElement("div"),t.id="mh-streak-badge",t.className="mh-streak-badge",document.body.insertBefore(t,document.body.firstChild));let n="\u{1F525}",i=!1;e%30===0?(n="\u{1F31F}",i=!0):e%7===0&&(n="\u2B50",i=!0),t.innerHTML=`${n} ${e} day streak!`,t.className="mh-streak-badge"+(i?" mh-streak-badge--milestone":""),t.classList.remove("mh-streak-badge--bounce","mh-streak-badge--hiding"),t.offsetWidth,t.classList.add("mh-streak-badge--bounce"),setTimeout(()=>{t.classList.add("mh-streak-badge--hiding")},5e3)}};window.MH_STREAK=k;function p(){m(),document.addEventListener("auth:changed",m),document.getElementById("mh-sign-picker")&&b(),document.querySelectorAll(".zodiac-card").length>0&&S();let n=document.getElementById("personalized-greeting");n&&n.addEventListener("click",()=>{n.classList.contains("personalized-greeting--visible")&&k.incrementStreak()})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",p,{once:!0}):p();

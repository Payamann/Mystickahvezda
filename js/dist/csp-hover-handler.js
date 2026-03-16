(function(){const r=document.createElement("style");r.textContent=`
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover {
            transform: translateY(-3px) !important;
            border-color: rgba(212,175,55,0.3) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
        }
    `,document.head.appendChild(r);function t(){document.querySelectorAll("[onmouseover], [onmouseout]").forEach(e=>{const o=e.getAttribute("onmouseover"),u=e.getAttribute("onmouseout");o&&(o.includes("translateY(-3px)")||o.includes("transform"))&&(e.classList.add("card-hover"),e.removeAttribute("onmouseover"),e.removeAttribute("onmouseout"),e.style.transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)")})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",t):t(),new MutationObserver(t).observe(document.body,{childList:!0,subtree:!0})})();

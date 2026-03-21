(function(){
  if(document.querySelector('.nav__toggle.failsafe-init'))return;
  function init(){
    var tog=document.querySelector('.nav__toggle');
    var nav=document.querySelector('.nav__list');
    if(!tog||!nav||tog.dataset.fsInit||tog.dataset.navInitialized==='true')return;
    tog.dataset.fsInit='1';
    tog.addEventListener('click',function(e){
      e.stopPropagation();
      var open=nav.classList.toggle('open');
      tog.classList.toggle('active',open);
      tog.setAttribute('aria-expanded',String(open));
      nav.setAttribute('aria-hidden',String(!open));
    });
    document.addEventListener('click',function(e){
      if(!tog.contains(e.target)&&!nav.contains(e.target)&&nav.classList.contains('open')){
        nav.classList.remove('open');tog.classList.remove('active');
        tog.setAttribute('aria-expanded','false');nav.setAttribute('aria-hidden','true');
      }
    });
    nav.querySelectorAll('a:not(.nav__link--dropdown-toggle)').forEach(function(a){
      a.addEventListener('click',function(){
        nav.classList.remove('open');tog.classList.remove('active');
        tog.setAttribute('aria-expanded','false');nav.setAttribute('aria-hidden','true');
      });
    });
    var drops=nav.querySelectorAll('.nav__link--dropdown-toggle');
    drops.forEach(function(d){
      d.addEventListener('click',function(ev){
        ev.preventDefault();
        if(window.innerWidth<=992){
          var p=d.closest('.nav__item--has-dropdown');
          nav.querySelectorAll('.nav__item--has-dropdown.is-active').forEach(function(i){
            if(i!==p)i.classList.remove('is-active');
          });
          p.classList.toggle('is-active');
        }
      });
    });
  }
  // Always defer via setTimeout so DOMContentLoaded listeners (components.js, main.js)
  // run first and set navInitialized — nav-failsafe is a true fallback, not a first runner.
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0)})}
  else{setTimeout(init,0)}
})();

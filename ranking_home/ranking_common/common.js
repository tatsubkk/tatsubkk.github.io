/* ===== ドロワー開閉（モバイル）===== */
const toggle = document.querySelector('.nav-toggle');
const drawer = document.getElementById('drawer');
const backdrop = document.getElementById('backdrop');
const closeBtn = document.querySelector('.drawer__close');

function openDrawer(){
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  toggle.setAttribute('aria-expanded','true');
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeDrawer(){
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  toggle.setAttribute('aria-expanded','false');
  backdrop.hidden = true;
  document.body.style.overflow = '';
}

if (toggle && drawer && backdrop && closeBtn) {
  toggle.addEventListener('click', openDrawer, {passive:true});
  backdrop.addEventListener('click', closeDrawer, {passive:true});
  closeBtn.addEventListener('click', closeDrawer, {passive:true});
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });
}

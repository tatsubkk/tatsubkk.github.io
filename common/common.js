/* ============================================
   Drawer (mobile) controller
   - Toggle open/close via hamburger button
   - Backdrop click, ESC key to close
   - Focus management & a11y attributes
   - Scroll lock while open
   ============================================ */
   (() => {
    // ---- DOM refs ------------------------------------------------------------
    const toggle   = document.querySelector('.nav-toggle');      // hamburger button
    const drawer   = document.getElementById('drawer');          // slide panel
    const backdrop = document.getElementById('backdrop');        // overlay
    const closeBtn = document.querySelector('.drawer__close');   // explicit close
  
    // If any required node is missing, bail (safe no-op instead of throwing)
    if (!toggle || !drawer || !backdrop || !closeBtn) {
      console.warn('[drawer] required element missing:', { toggle: !!toggle, drawer: !!drawer, backdrop: !!backdrop, closeBtn: !!closeBtn });
      return;
    }
  
    // ---- State ---------------------------------------------------------------
    let isOpen = false;
    let lastActive = null; // the element that had focus before opening
  
    // A list of selectors that can receive focus (for trapping)
    const FOCUSABLE = [
      'a[href]', 'area[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'summary',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');
  
    // ---- A11y bootstrap ------------------------------------------------------
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
  
    // Ensure toggle is tied to drawer for SRs
    if (!toggle.hasAttribute('aria-controls')) {
      toggle.setAttribute('aria-controls', 'drawer');
    }
    toggle.setAttribute('aria-expanded', 'false');
  
    // ---- Helpers -------------------------------------------------------------
  
    // Lock page scroll while drawer is open (simple & reliable)
    function lockScroll() {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      // iOS safari overscroll fix could be added if必要
    }
    function unlockScroll() {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  
    // Focus first focusable element inside drawer (or the drawer itself)
    function focusFirstInDrawer() {
      const focusables = drawer.querySelectorAll(FOCUSABLE);
      const first = focusables[0] || drawer;
      first.focus({ preventScroll: true });
    }
  
    // Keep focus trapped inside drawer while open
    function handleFocusTrap(e) {
      if (!isOpen) return;
      if (e.key !== 'Tab') return;
  
      const nodes = Array.from(drawer.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) {
        e.preventDefault();
        drawer.focus({ preventScroll: true });
        return;
      }
  
      const first = nodes[0];
      const last  = nodes[nodes.length - 1];
  
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  
    // Close when clicking outside panel (backdrop)
    function handleBackdropClick(e) {
      if (e.target === backdrop) closeDrawer();
    }
  
    // Reduce motion users: skip transitions
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    // ---- Open / Close --------------------------------------------------------
    function openDrawer() {
      if (isOpen) return;
      isOpen = true;
      lastActive = document.activeElement;
  
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      backdrop.hidden = false;
  
      // lock scroll & move focus
      lockScroll();
      // Give CSS a tick if you need transitions; otherwise focus immediately
      if (prefersReducedMotion) {
        focusFirstInDrawer();
      } else {
        requestAnimationFrame(() => focusFirstInDrawer());
      }
  
      // event bindings while open
      document.addEventListener('keydown', onKeydown, { passive: true });
      document.addEventListener('keydown', handleFocusTrap, { capture: true });
      backdrop.addEventListener('click', handleBackdropClick, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
    }
  
    function closeDrawer() {
      if (!isOpen) return;
      isOpen = false;
  
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      backdrop.hidden = true;
  
      unlockScroll();
  
      // restore focus to the toggler (or lastActive if it still exists in DOM)
      const target = (lastActive && document.contains(lastActive)) ? lastActive : toggle;
      target.focus({ preventScroll: true });
      lastActive = null;
  
      // remove open-time listeners
      document.removeEventListener('keydown', onKeydown, { passive: true });
      document.removeEventListener('keydown', handleFocusTrap, { capture: true });
      backdrop.removeEventListener('click', handleBackdropClick, { passive: true });
      window.removeEventListener('resize', onResize, { passive: true });
    }
  
    // ---- Event handlers ------------------------------------------------------
    function onKeydown(e) {
      if (e.key === 'Escape') {
        // ESC closes and prevents double handling
        e.stopPropagation();
        closeDrawer();
      }
    }
  
    function onResize() {
      // If layout switches to desktop (e.g., drawer hidden by CSS), ensure state reset
      const desktop = window.matchMedia('(min-width:1024px)').matches;
      if (desktop && isOpen) closeDrawer();
    }
  
    // ---- Public triggers -----------------------------------------------------
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      isOpen ? closeDrawer() : openDrawer();
    }, { passive: false });
  
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
    }, { passive: false });
  
    // Optional: expose to window for debugging/manual control
    // window.__drawer = { open: openDrawer, close: closeDrawer };
  
  })();
  
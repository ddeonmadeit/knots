/* Global theme behaviour:
   - Menu toggle (slide-in left)
   - Cart drawer toggle (slide-in right)
   - Glass-effect header on scroll
   - Split-view when both are open (applied via body classes)
*/
(function () {
  const body = document.body;
  const header = document.querySelector('[data-site-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuOverlay = document.querySelector('[data-menu-overlay]');
  const sideMenu = document.querySelector('[data-side-menu]');
  const cartToggle = document.querySelector('[data-cart-toggle]');
  const cartOverlay = document.querySelector('[data-cart-overlay]');
  const cartClose = document.querySelector('[data-cart-close]');

  // -------- Menu --------
  function openMenu() {
    body.classList.add('menu-open');
    updateMenuIcon(true);
    // hide the + button when cart is also visible (Lovable behaviour)
  }
  function closeMenu() {
    body.classList.remove('menu-open');
    updateMenuIcon(false);
  }
  function updateMenuIcon(isOpen) {
    if (!menuToggle) return;
    const plus = menuToggle.querySelector('[data-icon-plus]');
    const close = menuToggle.querySelector('[data-icon-close]');
    if (plus) plus.hidden = isOpen;
    if (close) close.hidden = !isOpen;
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      body.classList.contains('menu-open') ? closeMenu() : openMenu();
    });
  }
  if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

  // Close menu on nav link click
  document.querySelectorAll('.side-menu__link').forEach(link => {
    link.addEventListener('click', () => closeMenu());
  });

  // -------- Cart drawer --------
  function openCart() {
    body.classList.add('cart-open');
    if (menuToggle && body.classList.contains('menu-open') === false) {
      // menu toggle stays visible alone; hide when only cart open? Original hides when cart open
    }
    // hide menu toggle when cart is open and menu is not (Lovable hides it)
    if (menuToggle && !body.classList.contains('menu-open')) {
      menuToggle.classList.add('is-hidden');
    }
  }
  function closeCart() {
    body.classList.remove('cart-open');
    if (menuToggle) menuToggle.classList.remove('is-hidden');
  }

  if (cartToggle) {
    cartToggle.addEventListener('click', () => {
      body.classList.contains('cart-open') ? closeCart() : openCart();
    });
  }
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);

  // Escape closes whichever is open (cart takes priority)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (body.classList.contains('cart-open')) closeCart();
    else if (body.classList.contains('menu-open')) closeMenu();
  });

  // -------- Glass header on scroll --------
  if (header && header.dataset.sticky === 'true' && header.dataset.glass === 'true') {
    const scroller = document.querySelector('[data-home-scroll]')
      || document.querySelector('.text-page')
      || document.querySelector('.simple-list')
      || window;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scroller === window ? window.scrollY : scroller.scrollTop;
        header.classList.toggle('site-header--glass', y > 10);
        ticking = false;
      });
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // -------- Refresh cart drawer silently when item added (don't auto-open; matches Lovable UX) --------
  window.addEventListener('cart:updated', () => refreshCartDrawer());

  async function refreshCartDrawer() {
    try {
      const res = await fetch(window.theme.routes.root + '?section_id=header', {
        headers: { 'Accept': 'text/html' }
      });
      if (!res.ok) return;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newDrawer = doc.querySelector('.cart-drawer');
      const newCount = doc.querySelector('[data-cart-count]');
      const existingDrawer = document.querySelector('.cart-drawer');
      if (newDrawer && existingDrawer) {
        existingDrawer.innerHTML = newDrawer.innerHTML;
      }
      if (newCount) {
        const countEl = document.querySelector('[data-cart-count]');
        if (countEl) {
          countEl.textContent = newCount.textContent;
          countEl.hidden = newCount.hasAttribute('hidden');
        }
      }
    } catch (e) {
      console.error('Failed to refresh cart drawer', e);
    }
  }
})();

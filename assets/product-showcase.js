(function () {
  const pdp = document.querySelector('[data-pdp]');
  if (!pdp) return;

  const pageCache = new Map();
  let isTransitioning = false;
  let lastNav = 0;
  const NAV_COOLDOWN = 450;

  const state = {
    images: [],
    navList: [],
    current: {},
    variants: [],
    imgEl: null,
    dots: [],
    imageArea: null,
    body: null,
    panelsWrap: null,
    sizesPanel: null,
    detailsPanel: null,
    mysteryPanel: null,
    selectedOptions: {},
    showSizes: false,
    showDetails: false,
    showMystery: false,
    imageIndex: 0
  };

  function hydrate(root) {
    state.images = JSON.parse(root.querySelector('[data-pdp-images]').textContent || '[]');
    state.navList = JSON.parse(root.querySelector('[data-pdp-nav]').textContent || '[]');
    state.current = JSON.parse(root.querySelector('[data-pdp-current]').textContent || '{}');
    const variantMapEl = root.querySelector('[data-variant-map]');
    state.variants = variantMapEl ? JSON.parse(variantMapEl.textContent || '[]') : [];

    state.imgEl = root.querySelector('[data-pdp-image]');
    state.dots = root.querySelectorAll('[data-dot]');
    state.imageArea = root.querySelector('[data-image-area]');
    state.body = root.querySelector('[data-pdp-body]');
    state.panelsWrap = root.querySelector('[data-pdp-panels]');
    state.sizesPanel = root.querySelector('[data-pdp-sizes]');
    state.detailsPanel = root.querySelector('[data-pdp-details]');
    state.mysteryPanel = root.querySelector('[data-pdp-mystery]');
    state.imageIndex = 0;
    state.showSizes = false;
    state.showDetails = false;
    state.showMystery = false;
    state.selectedOptions = {};

    syncPanels();
    bindScopedListeners(root);
    updateIndicators();
    preloadNeighbors();
  }

  // -------- Image navigation --------
  function goToImage(dir) {
    if (state.images.length <= 1) return;
    const next = (state.imageIndex + dir + state.images.length) % state.images.length;
    state.imageIndex = next;
    if (state.imgEl && state.images[next]) {
      state.imgEl.classList.add('is-loading');
      state.imgEl.src = state.images[next].url;
      state.imgEl.alt = state.images[next].alt || '';
      state.imgEl.onload = () => state.imgEl.classList.remove('is-loading');
    }
    state.dots.forEach((d, i) => d.classList.toggle('is-active', i === next));
  }

  // -------- Panel toggles --------
  function syncPanels() {
    const anyOpen = state.showSizes || state.showDetails || state.showMystery;
    if (state.panelsWrap) state.panelsWrap.hidden = !anyOpen;
    if (state.body) state.body.classList.toggle('panels-open', anyOpen);

    if (state.sizesPanel) state.sizesPanel.hidden = !state.showSizes;
    if (state.detailsPanel) state.detailsPanel.hidden = !state.showDetails;
    if (state.mysteryPanel) state.mysteryPanel.hidden = !state.showMystery;

    const plus = pdp.querySelector('[data-sizes-plus]');
    const minus = pdp.querySelector('[data-sizes-minus]');
    if (plus && minus) { plus.hidden = state.showSizes; minus.hidden = !state.showSizes; }

    const on = pdp.querySelector('[data-details-on]');
    const off = pdp.querySelector('[data-details-off]');
    if (on && off) { on.hidden = state.showDetails; off.hidden = !state.showDetails; }

    const mysteryBtn = pdp.querySelector('[data-toggle-mystery]');
    if (mysteryBtn) mysteryBtn.classList.toggle('is-active', state.showMystery);
  }

  function updateIndicators() {
    const indicators = document.querySelectorAll('[data-pdp-indicators] .pdp__product-indicator');
    indicators.forEach((el, i) => {
      el.classList.toggle('is-current', i === state.current.index);
    });
  }

  // -------- Variant selection helpers --------
  function findVariant() {
    return state.variants.find(v =>
      v.options
        .filter(opt => opt.name !== 'Title')
        .every(opt => state.selectedOptions[opt.name] === opt.value)
    );
  }

  function requiredOptions() {
    return pdp.querySelectorAll('[data-option-name]');
  }

  function resetSelectedOptions() {
    Object.keys(state.selectedOptions).forEach(k => delete state.selectedOptions[k]);
    pdp.querySelectorAll('.pdp__variant-btn').forEach(b => b.classList.remove('is-selected'));
  }

  function showAddedMessage() {
    const msg = pdp.querySelector('[data-added-message]');
    if (!msg) return;
    msg.classList.add('is-visible');
    setTimeout(() => {
      msg.classList.remove('is-visible');
      state.showSizes = false;
      syncPanels();
    }, 700);
  }

  async function addToCart(variant) {
    if (!variant || !variant.available) return;
    try {
      const res = await fetch(window.theme.routes.cart_add_url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: variant.id, quantity: 1 })
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('Add to cart failed', res.status, body);
        return;
      }
      showAddedMessage();
      window.dispatchEvent(new CustomEvent('cart:updated'));
    } catch (e) {
      console.error('Add to cart network error', e);
    }
  }

  // -------- Scoped listeners (re-bound on each product swap) --------
  function bindScopedListeners(root) {
    const sizesBtn = root.querySelector('[data-toggle-sizes]');
    if (sizesBtn) sizesBtn.addEventListener('click', () => {
      state.showSizes = !state.showSizes;
      if (state.showSizes) {
        resetSelectedOptions();
        const opts = requiredOptions();
        if (opts.length === 0 && state.variants.length > 0) {
          addToCart(state.variants.find(v => v.available) || state.variants[0]);
        }
      }
      syncPanels();
    });

    const detailsBtn = root.querySelector('[data-toggle-details]');
    if (detailsBtn) detailsBtn.addEventListener('click', () => {
      state.showDetails = !state.showDetails;
      syncPanels();
    });

    const mysteryBtn = root.querySelector('[data-toggle-mystery]');
    if (mysteryBtn) mysteryBtn.addEventListener('click', () => {
      state.showMystery = !state.showMystery;
      if (state.showMystery && !state.showDetails) state.showDetails = true;
      syncPanels();
    });

    root.querySelectorAll('[data-accordion]').forEach((acc) => {
      const btn = acc.querySelector('.pdp__accordion-btn');
      if (btn) btn.addEventListener('click', () => {
        acc.dataset.open = acc.dataset.open === 'true' ? 'false' : 'true';
      });
    });

    root.querySelectorAll('.pdp__variant-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const optRow = btn.closest('[data-option-name]');
        if (!optRow) return;
        const name = optRow.dataset.optionName;
        const value = btn.dataset.optionValue;
        state.selectedOptions[name] = value;

        optRow.querySelectorAll('.pdp__variant-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        const allRows = requiredOptions();
        const allFilled = Array.from(allRows).every(r => state.selectedOptions[r.dataset.optionName]);
        if (!allFilled) return;

        const variant = findVariant();
        if (!variant) {
          console.warn('No variant matched for', state.selectedOptions);
          return;
        }
        await addToCart(variant);
      });
    });

    state.dots.forEach((d, i) => d.addEventListener('click', () => {
      const dir = i - state.imageIndex;
      if (dir !== 0) goToImage(dir > 0 ? 1 : -1);
    }));
  }

  // -------- Client-side product navigation --------
  async function fetchProduct(url) {
    if (pageCache.has(url)) return pageCache.get(url);
    const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const html = await res.text();
    pageCache.set(url, html);
    return html;
  }

  function parseProduct(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newPdp = doc.querySelector('[data-pdp]');
    const newTitle = doc.querySelector('title')?.textContent || '';
    return { newPdp, newTitle };
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function swapProduct(newPdp, url, newTitle, direction) {
    const dir = direction || 'up';

    pdp.dataset.transition = 'out-' + dir;
    await wait(280);

    pdp.innerHTML = newPdp.innerHTML;
    pdp.dataset.productHandle = newPdp.dataset.productHandle;
    document.title = newTitle;
    history.replaceState(null, '', url);

    pdp.dataset.transition = 'in-' + dir;
    hydrate(pdp);
    pdp.offsetHeight;

    pdp.dataset.transition = '';
    await wait(320);
  }

  async function goToProduct(dir) {
    if (isTransitioning) return;
    const target = state.current.index + dir;
    if (target < 0 || target >= state.navList.length) return;
    const now = Date.now();
    if (now - lastNav < NAV_COOLDOWN) return;
    lastNav = now;
    isTransitioning = true;

    try {
      const entry = state.navList[target];
      const html = await fetchProduct(entry.url);
      const { newPdp, newTitle } = parseProduct(html);
      if (!newPdp) { isTransitioning = false; return; }
      await swapProduct(newPdp, entry.url, newTitle, dir > 0 ? 'up' : 'down');
    } catch (e) {
      console.error('Product nav failed', e);
    }
    isTransitioning = false;
  }

  function preloadNeighbors() {
    const idx = state.current.index;
    [-1, 1].forEach(d => {
      const n = idx + d;
      if (n >= 0 && n < state.navList.length) {
        const entry = state.navList[n];
        if (entry.preview) new Image().src = entry.preview;
        if (!pageCache.has(entry.url)) {
          fetch(entry.url, { headers: { 'Accept': 'text/html' } })
            .then(r => r.ok ? r.text() : null)
            .then(html => { if (html) pageCache.set(entry.url, html); })
            .catch(() => {});
        }
      }
    });
  }

  // -------- Persistent listeners (bound once) --------

  // Wheel navigation
  window.addEventListener('wheel', (e) => {
    if (!document.body.classList.contains('template-product')) return;
    if (isTransitioning) { e.preventDefault(); return; }
    const onImage = state.imageArea && state.imageArea.contains(e.target);

    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastNav < NAV_COOLDOWN) return;
      lastNav = now;
      goToImage((e.deltaX || e.deltaY) > 0 ? 1 : -1);
      return;
    }

    const anyOpen = state.showSizes || state.showDetails || state.showMystery;
    if (anyOpen && !onImage) return;
    if (Math.abs(e.deltaY) < 8) return;
    e.preventDefault();
    goToProduct(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('template-product')) return;
    if (e.key === 'ArrowLeft') goToImage(-1);
    if (e.key === 'ArrowRight') goToImage(1);
    if (e.key === 'ArrowUp')    { e.preventDefault(); goToProduct(-1); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); goToProduct(1); }
    if (e.key === 'Escape') {
      if (state.showSizes) { state.showSizes = false; syncPanels(); }
      else if (state.showDetails) { state.showDetails = false; syncPanels(); }
      else if (state.showMystery) { state.showMystery = false; syncPanels(); }
      else window.location.href = window.theme.routes.root;
    }
  });

  // Touch on image area (persistent on pdp container since imageArea gets replaced)
  let touchStartX = 0, touchStartY = 0, imageSwipeHandled = false;

  pdp.addEventListener('touchstart', (e) => {
    const ia = state.imageArea;
    if (ia && ia.contains(e.target)) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      imageSwipeHandled = false;
    }
  }, { passive: true });

  pdp.addEventListener('touchend', (e) => {
    const ia = state.imageArea;
    if (ia && ia.contains(e.target)) {
      const dx = touchStartX - e.changedTouches[0].clientX;
      const dy = touchStartY - e.changedTouches[0].clientY;
      const adx = Math.abs(dx), ady = Math.abs(dy);

      if (adx > 40 && adx > ady) {
        goToImage(dx > 0 ? 1 : -1);
        imageSwipeHandled = true;
        return;
      }
      if (ady > 60 && ady > adx) {
        imageSwipeHandled = true;
        const anyOpen = state.showSizes || state.showDetails || state.showMystery;
        if (!anyOpen) {
          if (dy > 0) {
            state.showDetails = true;
            syncPanels();
          } else {
            goToProduct(-1);
          }
        } else {
          goToProduct(dy > 0 ? 1 : -1);
        }
        return;
      }
    }

    // Page-level touch for product nav
    if (imageSwipeHandled) { imageSwipeHandled = false; return; }
    const anyOpen = state.showSizes || state.showDetails || state.showMystery;
    if (anyOpen) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > 60) goToProduct(1);
    else if (dy < -60) goToProduct(-1);
  });

  // Page-level touchstart (always track Y for page swipe)
  let pageStartY = 0;
  pdp.addEventListener('touchstart', (e) => {
    pageStartY = e.touches[0].clientY;
    if (!state.imageArea || !state.imageArea.contains(e.target)) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Popstate — with replaceState nav, back goes to homepage
  window.addEventListener('popstate', () => {
    if (!document.body.classList.contains('template-product')) return;
    location.reload();
  });

  // -------- Initial hydrate + cache current page --------
  hydrate(pdp);
  pageCache.set(location.pathname, document.documentElement.outerHTML);
})();

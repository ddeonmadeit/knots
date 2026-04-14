/* Product showcase behaviour:
   - Swipe / wheel left-right to change image
   - Swipe / wheel up-down to change product (via collection nav)
   - +/Eye/Mystery buttons toggle panels
   - Selecting a complete variant triggers AJAX add-to-cart
*/
(function () {
  const pdp = document.querySelector('[data-pdp]');
  if (!pdp) return;

  // -------- Parse JSON data --------
  const images = JSON.parse(pdp.querySelector('[data-pdp-images]').textContent || '[]');
  const navList = JSON.parse(pdp.querySelector('[data-pdp-nav]').textContent || '[]');
  const current = JSON.parse(pdp.querySelector('[data-pdp-current]').textContent || '{}');
  const variantMapEl = pdp.querySelector('[data-variant-map]');
  const variants = variantMapEl ? JSON.parse(variantMapEl.textContent || '[]') : [];

  const imgEl = pdp.querySelector('[data-pdp-image]');
  const dots = pdp.querySelectorAll('[data-dot]');
  const imageArea = pdp.querySelector('[data-image-area]');
  const body = pdp.querySelector('[data-pdp-body]');
  const panelsWrap = pdp.querySelector('[data-pdp-panels]');
  const sizesPanel = pdp.querySelector('[data-pdp-sizes]');
  const detailsPanel = pdp.querySelector('[data-pdp-details]');
  const mysteryPanel = pdp.querySelector('[data-pdp-mystery]');

  let imageIndex = 0;
  let isTransitioning = false;
  let lastNav = 0;
  const NAV_COOLDOWN = 260;

  // -------- Image navigation --------
  function goToImage(dir) {
    if (images.length <= 1) return;
    const next = (imageIndex + dir + images.length) % images.length;
    imageIndex = next;
    if (imgEl && images[next]) {
      imgEl.classList.add('is-loading');
      imgEl.src = images[next].url;
      imgEl.alt = images[next].alt || '';
      imgEl.onload = () => imgEl.classList.remove('is-loading');
    }
    dots.forEach((d, i) => d.classList.toggle('is-active', i === next));
  }

  // -------- Product navigation (jump to next/prev product URL) --------
  function goToProduct(dir) {
    const target = current.index + dir;
    if (target < 0 || target >= navList.length) return;
    const now = Date.now();
    if (now - lastNav < 450) return;
    lastNav = now;
    window.location.href = navList[target].url;
  }

  // -------- Panel toggles --------
  let showSizes = false, showDetails = false, showMystery = false;

  function syncPanels() {
    const anyOpen = showSizes || showDetails || showMystery;
    panelsWrap.hidden = !anyOpen;
    body.classList.toggle('panels-open', anyOpen);

    if (sizesPanel) sizesPanel.hidden = !showSizes;
    if (detailsPanel) detailsPanel.hidden = !showDetails;
    if (mysteryPanel) mysteryPanel.hidden = !showMystery;

    // Plus/minus icon swap
    const plus = pdp.querySelector('[data-sizes-plus]');
    const minus = pdp.querySelector('[data-sizes-minus]');
    if (plus && minus) { plus.hidden = showSizes; minus.hidden = !showSizes; }
    // Eye on/off swap
    const on = pdp.querySelector('[data-details-on]');
    const off = pdp.querySelector('[data-details-off]');
    if (on && off) { on.hidden = showDetails; off.hidden = !showDetails; }

    const mysteryBtn = pdp.querySelector('[data-toggle-mystery]');
    if (mysteryBtn) mysteryBtn.classList.toggle('is-active', showMystery);
  }

  const sizesBtn = pdp.querySelector('[data-toggle-sizes]');
  if (sizesBtn) sizesBtn.addEventListener('click', () => {
    showSizes = !showSizes;
    if (showSizes) resetSelectedOptions();
    syncPanels();
  });

  const detailsBtn = pdp.querySelector('[data-toggle-details]');
  if (detailsBtn) detailsBtn.addEventListener('click', () => {
    showDetails = !showDetails;
    syncPanels();
  });

  const mysteryBtn = pdp.querySelector('[data-toggle-mystery]');
  if (mysteryBtn) mysteryBtn.addEventListener('click', () => {
    showMystery = !showMystery;
    if (showMystery && !showDetails) showDetails = true;
    syncPanels();
  });

  // -------- Accordions inside details --------
  pdp.querySelectorAll('[data-accordion]').forEach((acc) => {
    const btn = acc.querySelector('.pdp__accordion-btn');
    btn.addEventListener('click', () => {
      const open = acc.dataset.open === 'true';
      acc.dataset.open = open ? 'false' : 'true';
    });
  });

  // -------- Variant selection → auto add to cart --------
  const selectedOptions = {};

  function resetSelectedOptions() {
    Object.keys(selectedOptions).forEach(k => delete selectedOptions[k]);
    pdp.querySelectorAll('.pdp__variant-btn').forEach(b => b.classList.remove('is-selected'));
  }

  function findVariant() {
    return variants.find(v =>
      v.options.every(opt => selectedOptions[opt.name] === opt.value)
    );
  }

  function requiredOptions() {
    return pdp.querySelectorAll('[data-option-name]');
  }

  pdp.querySelectorAll('.pdp__variant-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const optRow = btn.closest('[data-option-name]');
      if (!optRow) return;
      const name = optRow.dataset.optionName;
      const value = btn.dataset.optionValue;
      selectedOptions[name] = value;

      // update UI
      optRow.querySelectorAll('.pdp__variant-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');

      // Check all options selected
      const allRows = requiredOptions();
      const allFilled = Array.from(allRows).every(r => selectedOptions[r.dataset.optionName]);
      if (!allFilled) return;

      const variant = findVariant();
      if (!variant || !variant.available) return;

      // AJAX add-to-cart — numeric ID works on /cart/add.js
      try {
        const res = await fetch(window.theme.routes.cart_add_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: variant.id, quantity: 1 })
        });
        if (res.ok) {
          showAddedMessage();
          window.dispatchEvent(new CustomEvent('cart:updated'));
        }
      } catch (e) {
        console.error('Add to cart failed', e);
      }
    });
  });

  function showAddedMessage() {
    const msg = pdp.querySelector('[data-added-message]');
    if (!msg) return;
    msg.classList.add('is-visible');
    setTimeout(() => {
      msg.classList.remove('is-visible');
      showSizes = false;
      syncPanels();
    }, 700);
  }

  // -------- Touch on image area --------
  let touchStartX = 0, touchStartY = 0, imageSwipeHandled = false;

  if (imageArea) {
    imageArea.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      imageSwipeHandled = false;
    }, { passive: true });

    imageArea.addEventListener('touchend', (e) => {
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
        const anyOpen = showSizes || showDetails || showMystery;
        if (!anyOpen) {
          if (dy > 0) {
            // open details on swipe up
            showDetails = true;
            syncPanels();
          } else {
            goToProduct(-1);
          }
        } else {
          goToProduct(dy > 0 ? 1 : -1);
        }
      }
    });
  }

  // -------- Page-level touch for product nav when no panels open --------
  let pageStartY = 0;
  pdp.addEventListener('touchstart', (e) => {
    pageStartY = e.touches[0].clientY;
  }, { passive: true });
  pdp.addEventListener('touchend', (e) => {
    const anyOpen = showSizes || showDetails || showMystery;
    if (anyOpen || imageSwipeHandled) { imageSwipeHandled = false; return; }
    const dy = pageStartY - e.changedTouches[0].clientY;
    if (dy > 60) goToProduct(1);
    else if (dy < -60) goToProduct(-1);
  });

  // -------- Wheel navigation --------
  window.addEventListener('wheel', (e) => {
    if (isTransitioning) { e.preventDefault(); return; }
    const onImage = imageArea && imageArea.contains(e.target);

    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastNav < NAV_COOLDOWN) return;
      lastNav = now;
      goToImage((e.deltaX || e.deltaY) > 0 ? 1 : -1);
      return;
    }

    const anyOpen = showSizes || showDetails || showMystery;
    if (anyOpen && !onImage) return;
    if (Math.abs(e.deltaY) < 8) return;
    e.preventDefault();
    goToProduct(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // -------- Keyboard --------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goToImage(-1);
    if (e.key === 'ArrowRight') goToImage(1);
    if (e.key === 'ArrowUp')    { e.preventDefault(); goToProduct(-1); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); goToProduct(1); }
    if (e.key === 'Escape') {
      if (showSizes) { showSizes = false; syncPanels(); }
      else if (showDetails) { showDetails = false; syncPanels(); }
      else if (showMystery) { showMystery = false; syncPanels(); }
      else window.location.href = window.theme.routes.root;
    }
  });

  // -------- Dots click --------
  dots.forEach((d, i) => d.addEventListener('click', () => {
    const dir = i - imageIndex;
    if (dir !== 0) goToImage(dir > 0 ? 1 : -1);
  }));
})();

/* AJAX cart — drives quantity +/−, removal, and count/total refresh */
(function () {
  function formatMoney(cents) {
    const fmt = (window.theme && window.theme.shop && window.theme.shop.moneyFormat) || '${{amount}}';
    const dollars = (cents / 100);
    const amount = dollars.toFixed(dollars % 1 === 0 ? 0 : 2);
    return fmt.replace(/\{\{\s*amount(_no_decimals)?\s*\}\}/gi, amount);
  }

  async function fetchCart() {
    const res = await fetch(window.theme.routes.cart_url + '.js', {
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  }

  async function changeLine(key, quantity) {
    const res = await fetch(window.theme.routes.cart_change_url + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    return res.json();
  }

  async function refresh() {
    const drawer = document.querySelector('[data-cart-drawer]');
    if (!drawer) return;

    try {
      // Re-fetch the header section HTML to get an up-to-date cart drawer with server-rendered money
      const res = await fetch(window.location.pathname + '?section_id=header', {
        headers: { 'Accept': 'text/html' }
      });
      if (res.ok) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const newDrawer = doc.querySelector('.cart-drawer');
        if (newDrawer) {
          drawer.innerHTML = newDrawer.innerHTML;
          bindDrawerEvents();
        }
        const newCount = doc.querySelector('[data-cart-count]');
        const count = document.querySelector('[data-cart-count]');
        if (newCount && count) {
          count.textContent = newCount.textContent;
          count.hidden = newCount.hasAttribute('hidden');
        }
        return;
      }
    } catch (e) { /* fall through to JSON update */ }

    // JSON fallback (in case section rendering fails)
    const cart = await fetchCart();
    const count = document.querySelector('[data-cart-count]');
    if (count) {
      count.textContent = cart.item_count;
      count.hidden = cart.item_count === 0;
    }
    const totalEl = document.querySelector('[data-cart-total]');
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
  }

  function bindDrawerEvents() {
    document.querySelectorAll('[data-cart-item]').forEach((row) => {
      const key = row.dataset.key;
      const qtyEl = row.querySelector('[data-qty-value]');
      if (!qtyEl) return;

      const inc = row.querySelector('[data-qty-increase]');
      const dec = row.querySelector('[data-qty-decrease]');
      const rem = row.querySelector('[data-qty-remove]');

      if (inc && !inc.dataset.bound) {
        inc.dataset.bound = '1';
        inc.addEventListener('click', async () => {
          const q = parseInt(qtyEl.textContent, 10) + 1;
          await changeLine(key, q);
          await refresh();
        });
      }
      if (dec && !dec.dataset.bound) {
        dec.dataset.bound = '1';
        dec.addEventListener('click', async () => {
          const q = Math.max(0, parseInt(qtyEl.textContent, 10) - 1);
          await changeLine(key, q);
          await refresh();
        });
      }
      if (rem && !rem.dataset.bound) {
        rem.dataset.bound = '1';
        rem.addEventListener('click', async () => {
          await changeLine(key, 0);
          await refresh();
        });
      }
    });
  }

  // initial bind
  document.addEventListener('DOMContentLoaded', bindDrawerEvents);
  // re-bind after `cart:updated` events
  window.addEventListener('cart:updated', () => setTimeout(bindDrawerEvents, 100));

  // expose for other scripts (e.g. product-showcase)
  window.theme = window.theme || {};
  window.theme.cart = { refresh, changeLine, fetchCart };
})();

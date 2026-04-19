/* Homepage grid: pinch-to-zoom (touch) + ctrl+wheel (desktop) to change column count */
(function () {
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  const min = parseInt(grid.dataset.minCols || '3', 10);
  const max = parseInt(grid.dataset.maxCols || '5', 10);
  let current = parseInt(grid.dataset.cols || '3', 10);

  function setCols(n) {
    const clamped = Math.max(min, Math.min(max, n));
    if (clamped === current) return;
    current = clamped;
    grid.dataset.cols = current;
  }

  // -------- Touch pinch (only active once a 2-finger gesture begins on the grid) --------
  let lastDist = null;
  const threshold = 40;

  function dist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Listen on the grid, not the document — keeps normal scrolling fast.
  grid.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) lastDist = dist(e.touches);
  }, { passive: true });

  grid.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 2 || lastDist == null) return;
    e.preventDefault();
    const d = dist(e.touches);
    const delta = d - lastDist;
    if (Math.abs(delta) > threshold) {
      if (delta > 0) setCols(current + 1);
      else setCols(current - 1);
      lastDist = d;
    }
  }, { passive: false });

  grid.addEventListener('touchend', function () { lastDist = null; }, { passive: true });
  grid.addEventListener('touchcancel', function () { lastDist = null; }, { passive: true });

  // -------- Desktop ctrl/cmd + wheel --------
  // Registered on window with passive:false (we need preventDefault when ctrl is held),
  // but we early-return when ctrl/cmd is NOT held so normal scrolling is not blocked.
  window.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    if (e.deltaY < 0) setCols(current - 1);
    else setCols(current + 1);
  }, { passive: false });
})();

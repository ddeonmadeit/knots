/* Homepage grid: pinch-to-zoom (touch) + ctrl+wheel (desktop) to change column count */
(function () {
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  const min = parseInt(grid.dataset.minCols || '3', 10);
  const max = parseInt(grid.dataset.maxCols || '5', 10);
  let current = parseInt(grid.dataset.cols || '3', 10);

  function setCols(n) {
    current = Math.max(min, Math.min(max, n));
    grid.dataset.cols = current;
  }

  // -------- Touch pinch --------
  let lastDist = null;
  const threshold = 40;

  function dist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) lastDist = dist(e.touches);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      if (lastDist == null) return;
      const d = dist(e.touches);
      const delta = d - lastDist;
      if (Math.abs(delta) > threshold) {
        // pinch in (shrink) → more cols; pinch out (spread) → fewer cols
        if (delta > 0) setCols(current - 1);
        else setCols(current + 1);
        lastDist = d;
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', function () { lastDist = null; });

  // -------- Desktop ctrl+wheel --------
  document.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    if (e.deltaY < 0) setCols(current - 1);
    else setCols(current + 1);
  }, { passive: false });
})();

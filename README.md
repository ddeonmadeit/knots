# KNOTS — Shopify Liquid theme

A 1:1 Liquid port of the Lovable React app at
[github.com/knots-raw/testalchemy](https://github.com/knots-raw/testalchemy).

## Install

1. **Zip the root of this repo** (not the folder — the contents: `layout/`, `templates/`, etc.)
2. In Shopify admin: *Online Store → Themes → Upload theme → upload ZIP*
3. Preview, then Publish.

Alternatively you can replace individual files in an existing theme (Spotlight)
by copying them into the theme code editor under the matching folder.

## Structure

```
layout/        theme.liquid, password.liquid
templates/     index.json, product.json, page.about.json, page.contact.json, collection.json, cart.json, 404.json, search.json, page.json, password.liquid
sections/      header, footer, product-grid, main-product, page-about, page-contact, main-collection, main-cart, main-404, main-search, main-page
snippets/      cart-drawer, product-card, icon-* (SVG icons), meta-tags
assets/        base.css, theme.js, cart.js, home-grid.js, product-showcase.js
config/        settings_schema.json, settings_data.json
locales/       en.default.json
```

## One-time store setup

1. **Logo**: Upload your `logo.gif` (or PNG) in *Theme editor → Header → Logo*.
2. **Pages**: Create two CMS pages with handles `about` and `contact`.
   They will automatically pick up `page.about.json` / `page.contact.json`.
2a. **Menu**: In *Navigation → Main menu*, keep only three items — `Store`
    (linked to the homepage), `About` (→ `/pages/about`), and `Contact`
    (→ `/pages/contact`). Or leave the Header → Menu setting empty in the
    theme editor and the theme falls back to those three links
    automatically.
3. **Homepage grid**: In *Theme editor → Home page → Product grid*, pick the
   collection to feature (maps to Lovable's `collection:MAIN`).
4. **Product showcase**: In *Theme editor → Product pages → Product showcase*,
   set the "Navigation collection" so swipe-up/down cycles through the correct
   product list.
5. **Mystery item (optional)**: In the same product-showcase settings, enter
   the handle (e.g. `untitled-oct1_21-14`) and pick the carousel collection.

## Features ported

- Fixed header: `+` menu toggle (left), floating logo (center), bag icon (right).
- Slide-in side menu with `Store / About / Contact` links.
- Cart drawer (right) with quantity controls and checkout.
- Split-view when both menu and cart are open.
- Homepage grid with pinch-to-zoom (touch) and `Ctrl + wheel` (desktop) to
  change between 3 / 4 / 5 columns.
- Product page: swipe up/down to switch products, left/right to flip images,
  +/eye/mystery buttons to toggle panels.
- Selecting a variant auto-adds to cart via `/cart/add.js` (no button needed).
- Contact form posts to Shopify's native `contact` form (replaces Supabase).

## Performance notes

- The homepage uses **native document scroll** (not a nested scroll
  container). URL bar hides on iOS/Android as you scroll, trackpad
  overscroll works, and everything feels snappier.
- Product-detail pages are intentionally viewport-locked (`body.template-
  product { overflow: hidden }`) because the UX is swipe-between-products,
  not scroll.
- Product-card fade-in stagger is capped at 8 × 20 ms (~160 ms max) so
  the grid doesn't look empty for 1.5 s on large stores.
- Only the first four products load eagerly; the rest are lazy. The first
  card also gets `fetchpriority="high"`.
- Google Fonts are loaded non-render-blocking via the `media="print"
  onload` trick with a `<noscript>` fallback.
- Pinch-to-zoom gestures on the home grid are scoped to the grid element
  (not the whole document) so they don't slow down normal scrolling.

## Differences vs the React app

- Uses Shopify's native AJAX cart (`/cart/add.js`, `/cart/change.js`) instead
  of the Storefront API + Zustand store. No tokens, no CORS, works on your
  custom domain out of the box.
- Product "creation-order numbering" (`001`, `002`…) is derived from a
  global `created_at` sort of every product in the store (same logic as
  the React app). First product added to the store = `001`, second = `002`,
  etc. The number stays the same no matter which collection it appears in.
  Note: `collections.all.products` is capped at 50 by default in Liquid; if
  your store has more products, wrap the sort in a `{% paginate ... by 250 %}`
  block in `sections/product-grid.liquid`.
- 404 uses Shopify's built-in template routing.
- PWA manifest / service worker is not ported (can be added per Shopify's
  guidance if desired).

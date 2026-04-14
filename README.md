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

## Differences vs the React app

- Uses Shopify's native AJAX cart (`/cart/add.js`, `/cart/change.js`) instead
  of the Storefront API + Zustand store. No tokens, no CORS, works on your
  custom domain out of the box.
- Product "creation-order numbering" (`001`, `002`…) is derived from the
  selected collection's natural order rather than a global `createdAt` sort.
- 404 uses Shopify's built-in template routing.
- PWA manifest / service worker is not ported (can be added per Shopify's
  guidance if desired).

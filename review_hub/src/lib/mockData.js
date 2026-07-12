// Embedded demo dataset — mirrors what the AI service returns from
// POST /report/generate (see ai service 2/ai/mockSuggestions.js). Used as a
// graceful fallback so the Review Hub is fully demoable even when the
// Analytics / AI services are not running locally.

const ITEMS = [
  {
    id: "mock-1", rank: 1, category: "conversion",
    title: "Overall conversion rate below e-commerce benchmarks",
    problem:
      "The store is converting 0.87% of 42,180 visitors into buyers — below the typical 1.5–3% range for Shopify stores. The overall bounce rate is 61.4%.",
    suggestion:
      "Review the homepage and top product pages to make sure the value proposition and buy buttons are immediately visible to new visitors.",
    issue:
      "Site converts at 0.87% across 42,180 sessions. Industry benchmark for Shopify stores is 1.5–3%. Bounce rate is 61.4%.",
    recommendation:
      "Audit the top 5 pages by traffic for CTA clarity and value proposition strength.",
    affectedPage: "site-wide",
    impactEstimate: "+0.3% to +0.8% conversion rate",
    effort: "medium", confidence: "high",
    dataSource: "overview.conversionRate, overview.totalSessions, overview.bounceRate",
    codePatch: { type: "manual", code: null, file: null, instructions: "Requires UX review before a specific code fix." },
  },
  {
    id: "mock-2", rank: 2, category: "funnel",
    title: "Shoppers adding to cart are not reaching checkout",
    problem:
      "5,120 shoppers added something to their cart, but only 2,240 made it to checkout — just 43.8% of those who showed buying intent.",
    suggestion:
      "Add a persistent cart drawer and a checkout progress bar so shoppers always know how close they are to completing their purchase.",
    issue:
      "5,120 sessions added to cart but only 2,240 reached checkout (43.8% reach rate).",
    recommendation:
      "Add a persistent cart drawer and reduce checkout friction. Consider a progress indicator.",
    affectedPage: "/cart",
    impactEstimate: "+0.5% to +1.2% checkout reach rate",
    effort: "medium", confidence: "high",
    dataSource: "funnel.sessionsWithCartAdditions, funnel.sessionsThatReachedCheckout, funnel.checkoutReachRate",
    codePatch: {
      type: "liquid",
      code: `{%- if cart.item_count > 0 -%}
  <div class="cart-progress">
    <span class="cart-progress__step cart-progress__step--active">Cart</span>
    <span class="cart-progress__step">Checkout</span>
    <span class="cart-progress__step">Confirmation</span>
  </div>
{%- endif -%}`,
      file: "sections/cart-drawer.liquid",
      instructions: "Add above the cart items list in the cart drawer section.",
    },
  },
  {
    id: "mock-3", rank: 3, category: "performance",
    title: "Page loads too slowly on /products/signature-hoodie",
    problem:
      "The /products/signature-hoodie page takes 4,820ms to show its main content — Google considers anything over 2500ms slow. This page receives 8,640 visits. Slow pages cause shoppers to leave before they even see the product.",
    suggestion:
      "Speed up the main product image on this page so shoppers see it immediately without waiting.",
    issue:
      "Page /products/signature-hoodie has LCP of 4,820ms (status: poor). Google threshold for good is ≤2500ms. This page receives 8,640 sessions.",
    recommendation:
      "Preload the hero image, serve WebP format, and add lazy loading to below-fold images.",
    affectedPage: "/products/signature-hoodie",
    impactEstimate: "100-800ms LCP improvement; correlates with 0.5–1% bounce rate reduction",
    effort: "low", confidence: "high",
    dataSource: "pages[].lcp_p75_ms, pages[].lcpStatus",
    codePatch: {
      type: "liquid",
      code: `{%- assign hero = section.settings.image -%}
{%- if hero -%}
  {{ hero | image_url: width: 1500 | image_tag:
    loading: 'eager',
    fetchpriority: 'high',
    widths: '375, 750, 1100, 1500',
    sizes: '100vw'
  }}
{%- endif -%}`,
      file: "sections/main-product.liquid",
      instructions: "Replace the hero image tag to add fetchpriority and eager loading for LCP.",
    },
  },
  {
    id: "mock-4", rank: 4, category: "conversion",
    title: "Most visitors immediately leave /collections/sale",
    problem:
      "78.2% of the 6,310 visitors to /collections/sale leave without clicking anything — well above the site average of 61.4%. This page is losing potential buyers.",
    suggestion:
      "Make the page's main offer and buy button visible the moment visitors land — they should not have to scroll to know what action to take.",
    issue:
      "/collections/sale has a 78.2% bounce rate with 6,310 sessions. Site average is 61.4%.",
    recommendation:
      "Add a clear value proposition above the fold and ensure the primary CTA is visible without scrolling.",
    affectedPage: "/collections/sale",
    impactEstimate: "5-15% bounce rate reduction on this page",
    effort: "medium", confidence: "medium",
    dataSource: "pages[].bounceRate, overview.bounceRate",
    codePatch: { type: "manual", code: null, file: null, instructions: "Requires visual review of the specific page before code changes." },
  },
  {
    id: "mock-5", rank: 5, category: "mobile",
    title: "Add sticky mobile Add to Cart button",
    problem:
      "72% of all visits come from mobile devices. Even small friction points on mobile — hard-to-tap buttons, slow pages, a confusing checkout — affect the majority of shoppers.",
    suggestion:
      "Add a sticky Add to Cart button so shoppers on mobile can buy without scrolling back up the page.",
    issue:
      "Mobile accounts for 72% of sessions. Per-device conversion data is not available from Shopify's analytics, but any mobile UX friction has outsized revenue impact at this traffic share.",
    recommendation:
      "Add a sticky Add to Cart bar on product pages for viewports under 749px and ensure primary buttons meet the 48px minimum touch target.",
    affectedPage: "sections/main-product.liquid",
    impactEstimate: "Risk mitigation — direct impact depends on audit findings",
    effort: "medium", confidence: "high",
    dataSource: "devices.mobile.percentage",
    codePatch: {
      type: "css",
      code: `@media (max-width: 749px) {
  .product-form__submit {
    position: sticky;
    bottom: 0;
    min-height: 48px;
    font-size: 1rem;
    width: 100%;
    z-index: 5;
  }
  .cart__checkout-button {
    min-height: 48px;
    font-size: 1rem;
  }
}`,
      file: "assets/theme.css",
      instructions: "Add to the end of theme.css to make the primary action button sticky and meet the 48px minimum touch target size on mobile.",
    },
  },
];

// Same split the AI service applies via splitItems() before returning.
export const MOCK_GENERATE_RESPONSE = {
  report: {
    problems: ITEMS.map(({ issue, recommendation, effort, dataSource, codePatch, ...owner }) => owner),
  },
  analysis: ITEMS.map(({ problem, suggestion, ...dev }) => dev),
  meta: { model: "demo", mode: "demo", tokensUsed: { totalTokens: 0 }, processingTimeMs: 0 },
};

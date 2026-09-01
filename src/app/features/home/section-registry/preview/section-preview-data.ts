import { SectionRenderContext } from '../models/section-variant.model';

/**
 * Static, offline demo data for the admin Section Library (fast-preview fallback thumbnails and the
 * full-preview dialog). Never sourced from an API — every registered variant must be previewable
 * with zero network calls. Kept in `home/section-registry` (not `admin/page-builder`) because the
 * bare preview-stage route that renders it is reached via a top-level, storefront-safe route.
 */
const PALETTE: readonly (readonly [string, string])[] = [
  ['#6C5CE7', '#341F97'],
  ['#00B894', '#00694A'],
  ['#0984E3', '#053E6B'],
  ['#E17055', '#8A3416'],
  ['#D63031', '#7A0E0E'],
  ['#00CEC9', '#036661'],
  ['#FD79A8', '#8F1F4C'],
  ['#636E72', '#2D3436'],
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** Deterministic gradient-plus-label placeholder image, used both as a 16:9 card thumbnail and as
 * `imageUrl`/`backgroundImageUrl` filler inside `previewConfig`. No network request, no asset file. */
export function placeholderImage(label: string, width = 640, height = 360): string {
  const [from, to] = PALETTE[hashString(label) % PALETTE.length];
  const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" ` +
    `font-size="${Math.round(height * 0.085)}" fill="rgba(255,255,255,0.92)" font-weight="700">${safeLabel}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Uniform demo `SectionRenderContext` every section variant renders with in the Section Library. */
export const SECTION_PREVIEW_CONTEXT: SectionRenderContext = {
  content: {
    hero: {
      title: 'Preview Title',
      subtitle: 'Preview subtitle text.',
      primaryButtonText: 'Shop Now',
      primaryButtonUrl: '/products',
      secondaryButtonText: 'Learn More',
      secondaryButtonUrl: '/products',
      backgroundImageUrl: placeholderImage('Hero', 1600, 800),
      overlayImageUrl: null,
      overlayOpacity: 0.4,
      badgeText: 'New',
      badgeColor: '#6C5CE7',
      visible: true,
    },
    promoBanner: {
      title: 'Preview Promotion',
      subtitle: 'Demo copy for the Section Library preview.',
      imageUrl: placeholderImage('Promo', 1200, 600),
      buttonText: 'Shop the Deal',
      buttonUrl: '/products',
      countdownSeconds: 3600,
      countdownEndsAtUtc: null,
      backgroundColor: '#341F97',
      visible: true,
    },
    flashDeals: {
      sectionTitle: 'Flash Deals',
      sectionSubtitle: 'Preview data',
      countdownEnabled: true,
      countdownDateUtc: null,
      maximumProducts: 8,
      sortMethod: 'newest',
      countdownSeconds: 3600,
      visible: true,
    },
    featuredCollections: {
      title: 'Trending Collections',
      subtitle: 'Preview data',
      maximumItems: 4,
      displayStyle: 'grid',
      visible: true,
    },
    popularCategories: {
      sectionTitle: 'Popular Categories',
      maximumCategories: 6,
      sortOrder: 'manual',
      visible: true,
    },
    featuredProduct: {
      productId: null,
      badge: 'Featured',
      callToAction: 'View Details',
      visible: true,
    },
    trustBar: [
      { id: 'trust-1', iconUrl: 'pi pi-shield', title: 'Secure Checkout', description: 'Encrypted payments', sortOrder: 0, visible: true },
      { id: 'trust-2', iconUrl: 'pi pi-bolt', title: 'Instant Delivery', description: 'Keys delivered instantly', sortOrder: 1, visible: true },
    ],
    footer: {
      companyName: 'HAMBOX',
      copyright: '© 2026 HAMBOX. All rights reserved.',
      supportEmail: 'support@hambox.example',
      supportPhone: '+1 (555) 010-0100',
      address: '123 Preview Street',
      workingHours: '24/7',
      facebookUrl: null,
      instagramUrl: null,
      xUrl: null,
      discordUrl: null,
      telegramUrl: null,
      youTubeUrl: null,
      tikTokUrl: null,
      whatsAppUrl: null,
    },
    seo: {
      defaultMetaTitle: 'HAMBOX',
      defaultMetaDescription: 'Preview data',
      openGraphImageUrl: null,
      twitterCard: 'summary_large_image',
      canonicalUrl: '/',
    },
    navigationLinks: [
      { id: 'games', labelEn: 'Games', labelAr: 'الألعاب', visible: true },
      { id: 'gift-cards', labelEn: 'Digital Products', labelAr: 'منتجات رقمية', visible: true },
      { id: 'subscriptions', labelEn: 'Subscriptions', labelAr: 'الاشتراكات', visible: true },
      { id: 'deals', labelEn: 'Deals', labelAr: 'العروض', visible: true },
    ],
  },
  categories: [
    { id: 'cat-1', title: 'PC Games', subtitle: 'Steam, Epic & more', imageUrl: placeholderImage('PC Games'), route: '/products' },
    { id: 'cat-2', title: 'Gift Cards', subtitle: 'Top up instantly', imageUrl: placeholderImage('Gift Cards'), route: '/products' },
    { id: 'cat-3', title: 'Subscriptions', subtitle: 'Game Pass & PS Plus', imageUrl: placeholderImage('Subscriptions'), route: '/products' },
    { id: 'cat-4', title: 'Mobile Top-ups', subtitle: 'Recharge & credits', imageUrl: placeholderImage('Mobile'), route: '/products' },
  ],
  featuredProducts: [
    { id: 'deal-1', title: 'Starfall Chronicles', subtitle: 'PC Digital Key', imageUrl: placeholderImage('Starfall'), discountLabel: '-30%', originalPriceUsd: 59.99, currentPriceUsd: 41.99, priceTone: 'green' },
    { id: 'deal-2', title: 'Neon Drift', subtitle: 'PC Digital Key', imageUrl: placeholderImage('Neon Drift'), discountLabel: '-20%', originalPriceUsd: 39.99, currentPriceUsd: 31.99, priceTone: 'blue' },
    { id: 'deal-3', title: '$50 Gift Card', subtitle: 'Instant delivery', imageUrl: placeholderImage('Gift Card'), discountLabel: '-10%', originalPriceUsd: 50, currentPriceUsd: 45, priceTone: 'peach' },
  ],
  featuredHighlight: {
    id: 'highlight-1',
    badge: 'Editor’s Pick',
    title: 'Ashen Realms: Gold Edition',
    description: 'The definitive edition, previewed with demo data.',
    imageUrl: placeholderImage('Ashen Realms'),
    ctaLabel: 'View Details',
    route: '/products',
  },
  trendingRanks: [
    { id: 'rank-1', rank: '#1', rankTone: 'green', iconSrc: 'pi pi-trophy', title: 'Starfall Chronicles', subtitle: 'PC Digital Key', priceUsd: 41.99, priceTone: 'green', route: '/products' },
    { id: 'rank-2', rank: '#2', rankTone: 'blue', iconSrc: 'pi pi-star', title: 'Neon Drift', subtitle: 'PC Digital Key', priceUsd: 31.99, priceTone: 'blue', route: '/products' },
  ],
  trendingValue: { id: 'value-1', badge: 'Best Value', title: '12-Month Game Pass', subtitle: 'Ultimate', priceUsd: 89.99, route: '/products' },
  trustFeatures: [
    { id: 'feature-1', iconSrc: 'pi pi-shield', title: 'Secure Checkout', description: 'Encrypted payments' },
    { id: 'feature-2', iconSrc: 'pi pi-bolt', title: 'Instant Delivery', description: 'Keys delivered instantly' },
    { id: 'feature-3', iconSrc: 'pi pi-headphones', title: '24/7 Support', description: 'Always here to help' },
  ],
  flashCountdownSeconds: 3600,
  targetFaqs: [
    {
      id: 'faq-preview-1',
      questionEn: 'How fast is delivery?',
      questionAr: null,
      answerEn: '<p>Digital keys are delivered instantly to your library after checkout.</p>',
      answerAr: null,
      categoryId: 'faq-category-preview',
      categoryNameEn: 'Orders',
      categoryNameAr: null,
      scope: 'Global',
      sortOrder: 0,
    },
    {
      id: 'faq-preview-2',
      questionEn: 'What payment methods are accepted?',
      questionAr: null,
      answerEn: '<p>Preview data — this section always renders real, published FAQ content on the live site.</p>',
      answerAr: null,
      categoryId: 'faq-category-preview',
      categoryNameEn: 'Payments',
      categoryNameAr: null,
      scope: 'Global',
      sortOrder: 1,
    },
  ],
};

import { SectionVariantDefinition } from './models/section-variant.model';
import { placeholderImage } from './preview/section-preview-data';
import {
  AiAssistantSectionConfig,
  ArenaBriefingsSectionConfig,
  CollectionShowcaseSectionConfig,
  CommunityNewsletterSectionConfig,
  ConsoleFavoritesSectionConfig,
  FeaturedCollectionsSectionConfig,
  FlashDealsSectionConfig,
  FooterSectionConfig,
  HardwareShowcaseSectionConfig,
  HeroEditorialSpotlightConfig,
  HeroGridShowcaseConfig,
  HeroSectionConfig,
  LatestArrivalsSectionConfig,
  PlatformSelectorSectionConfig,
  PopularCategoriesSectionConfig,
  PromoBannerSectionConfig,
  PulseFeedSectionConfig,
  SeasonalCampaignBannerConfig,
  TrustBarSectionConfig,
} from './models/section-config.model';
import { AiAssistantVariantDefaultComponent } from './variants/ai-assistant-variant-default.component';
import { ArenaBriefingsVariantDefaultComponent } from './variants/arena-briefings-variant-default.component';
import { CollectionVariantEditorialShowcaseComponent } from './variants/collection-variant-editorial-showcase.component';
import { CommunityNewsletterVariantDefaultComponent } from './variants/community-newsletter-variant-default.component';
import { ConsoleFavoritesVariantDefaultComponent } from './variants/console-favorites-variant-default.component';
import { FlashDealsVariantDefaultComponent } from './variants/flash-deals-variant-default.component';
import { FooterVariantDefaultComponent } from './variants/footer-variant-default.component';
import { HardwareShowcaseVariantDefaultComponent } from './variants/hardware-showcase-variant-default.component';
import { HeroVariantEditorialSpotlightComponent } from './variants/hero-variant-editorial-spotlight.component';
import { HeroVariantGridShowcaseComponent } from './variants/hero-variant-grid-showcase.component';
import { HeroVariantKineticGlassComponent } from './variants/hero-variant-kinetic-glass.component';
import { LatestArrivalsVariantDefaultComponent } from './variants/latest-arrivals-variant-default.component';
import { PlatformSelectorVariantDefaultComponent } from './variants/platform-selector-variant-default.component';
import { PopularCategoriesVariantDefaultComponent } from './variants/popular-categories-variant-default.component';
import { PromoBannerVariantDefaultComponent } from './variants/promo-banner-variant-default.component';
import { PromoBannerVariantSeasonalCampaignComponent } from './variants/promo-banner-variant-seasonal-campaign.component';
import { PulseFeedVariantDefaultComponent } from './variants/pulse-feed-variant-default.component';
import { TrendingSectionVariantDefaultComponent } from './variants/trending-section-variant-default.component';
import { TrustBarVariantCenteredComponent } from './variants/trust-bar-variant-centered.component';
import { TrustBarVariantDefaultComponent } from './variants/trust-bar-variant-default.component';

const ALL_BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;

/**
 * Must mirror the seeded "Default" template's category/variantKey pairs exactly (backend Content
 * module). Deliberately only lists the render side — this file is imported by the storefront home
 * page's lazy chunk (via `SectionRendererComponent`), so it must never import admin-only settings-
 * form components. See `features/admin/page-builder/section-settings-registry.ts` for those.
 *
 * `description`/`tags`/`badge`/`previewImage`/`previewConfig`/`supportedBreakpoints` back the admin
 * Section Library (fast-preview cards + full-preview dialog) — see `preview/section-preview-data.ts`
 * for the shared offline demo `SectionRenderContext` these `previewConfig`s render against.
 */
export const SECTION_VARIANT_REGISTRY: readonly SectionVariantDefinition[] = [
  {
    category: 'Navigation',
    variantKey: 'platform-selector',
    displayName: 'Platform Selector',
    renderComponent: PlatformSelectorVariantDefaultComponent,
    description: 'A row of platform icons (PC, PlayStation, Xbox, Mobile) linking into the catalog.',
    tags: ['navigation', 'icons', 'platforms'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      items: [
        { id: 'pc', label: 'PC Gaming', iconClass: 'pi pi-desktop', linkUrl: '/products' },
        { id: 'playstation', label: 'PlayStation', iconClass: 'pi pi-github', linkUrl: '/products' },
        { id: 'xbox', label: 'Xbox Series', iconClass: 'pi pi-box', linkUrl: '/products' },
        { id: 'mobile', label: 'Mobile', iconClass: 'pi pi-mobile', linkUrl: '/products' },
      ],
    } satisfies PlatformSelectorSectionConfig,
  },
  {
    category: 'Hero',
    variantKey: 'kinetic-glass',
    displayName: 'Hero — Kinetic Glass',
    renderComponent: HeroVariantKineticGlassComponent,
    description: 'Full-width glass hero banner with a title, subtitle, badge, and two call-to-action buttons.',
    tags: ['hero', 'banner', 'glass'],
    badge: 'popular',
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Level Up Your Library',
      subtitle: 'Instant digital keys, gift cards, and top-ups — delivered in seconds.',
      primaryButtonText: 'Shop Now',
      primaryButtonUrl: '/products',
      secondaryButtonText: 'Browse Deals',
      secondaryButtonUrl: '/products',
      backgroundImageUrl: placeholderImage('Kinetic Glass Hero', 1600, 800),
      overlayImageUrl: null,
      overlayOpacity: 0.45,
      badgeText: 'New Arrivals',
      badgeColor: '#6C5CE7',
    } satisfies HeroSectionConfig,
  },
  {
    category: 'Hero',
    variantKey: 'grid-showcase',
    displayName: 'Hero — Grid Showcase',
    renderComponent: HeroVariantGridShowcaseComponent,
    description: 'Two-tone headline hero with a background image, for a bold seasonal or franchise campaign.',
    tags: ['hero', 'banner', 'campaign'],
    badge: 'new',
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      badgeText: 'Featured',
      title: 'The Latest',
      titleAccent: 'Games',
      subtitle: 'Fresh releases added weekly across every platform.',
      primaryButtonText: 'Explore',
      primaryButtonUrl: '/products',
      secondaryButtonText: 'View All',
      secondaryButtonUrl: '/products',
      backgroundImageUrl: placeholderImage('Grid Showcase Hero', 1600, 800),
      overlayImageUrl: null,
      overlayOpacity: 0.5,
    } satisfies HeroGridShowcaseConfig,
  },
  {
    category: 'Hero',
    variantKey: 'editorial-spotlight',
    displayName: 'Hero — Editorial Spotlight',
    renderComponent: HeroVariantEditorialSpotlightComponent,
    description: 'One large featured card plus two stacked side cards — magazine-style hero layout.',
    tags: ['hero', 'editorial', 'spotlight'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      eyebrowText: 'Editor’s Picks',
      title: 'This Week’s Spotlight',
      viewAllText: 'View All',
      viewAllUrl: '/products',
      featuredBadgeText: 'Staff Pick',
      featuredImageUrl: placeholderImage('Editorial Featured', 900, 600),
      featuredTitle: 'Ashen Realms: Gold Edition',
      featuredSubtitle: 'The definitive edition',
      featuredButtonText: 'View Details',
      featuredButtonUrl: '/products',
      secondaryImageUrl: placeholderImage('Editorial Secondary', 600, 340),
      secondaryLabel: 'Neon Drift',
      tertiaryImageUrl: placeholderImage('Editorial Tertiary', 600, 340),
      tertiaryLabel: 'Starfall Chronicles',
    } satisfies HeroEditorialSpotlightConfig,
  },
  {
    category: 'Features',
    variantKey: 'trust-bar',
    displayName: 'Trust Bar',
    renderComponent: TrustBarVariantDefaultComponent,
    description: 'A horizontal row of trust badges — secure checkout, instant delivery, and support.',
    tags: ['trust', 'features', 'badges'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      items: [
        { id: 'trust-1', iconUrl: 'pi pi-shield', title: 'Secure Checkout', description: 'Encrypted payments', sortOrder: 0 },
        { id: 'trust-2', iconUrl: 'pi pi-bolt', title: 'Instant Delivery', description: 'Keys delivered instantly', sortOrder: 1 },
        { id: 'trust-3', iconUrl: 'pi pi-headphones', title: '24/7 Support', description: 'Always here to help', sortOrder: 2 },
      ],
    } satisfies TrustBarSectionConfig,
  },
  {
    category: 'Features',
    variantKey: 'centered-trust',
    displayName: 'Features — Centered Trust',
    renderComponent: TrustBarVariantCenteredComponent,
    description: 'The same trust badges as Trust Bar, laid out centered rather than edge-to-edge.',
    tags: ['trust', 'features', 'badges', 'centered'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      items: [
        { id: 'trust-1', iconUrl: 'pi pi-shield', title: 'Secure Checkout', description: 'Encrypted payments', sortOrder: 0 },
        { id: 'trust-2', iconUrl: 'pi pi-bolt', title: 'Instant Delivery', description: 'Keys delivered instantly', sortOrder: 1 },
        { id: 'trust-3', iconUrl: 'pi pi-headphones', title: '24/7 Support', description: 'Always here to help', sortOrder: 2 },
      ],
    } satisfies TrustBarSectionConfig,
  },
  {
    category: 'Promotions',
    variantKey: 'promo-banner',
    displayName: 'Promo Banner',
    renderComponent: PromoBannerVariantDefaultComponent,
    description: 'A single promotional banner with a countdown timer and one call-to-action button.',
    tags: ['promotion', 'banner', 'countdown'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Weekend Flash Sale',
      subtitle: 'Up to 40% off select titles — this weekend only.',
      imageUrl: placeholderImage('Promo Banner', 1200, 500),
      buttonText: 'Shop the Sale',
      buttonUrl: '/products',
      countdownSeconds: 5400,
      countdownEndsAtUtc: null,
      backgroundColor: '#341F97',
    } satisfies PromoBannerSectionConfig,
  },
  {
    category: 'Promotions',
    variantKey: 'seasonal-campaign',
    displayName: 'Promotions — Seasonal Campaign',
    renderComponent: PromoBannerVariantSeasonalCampaignComponent,
    description: 'A two-tone campaign banner with an eyebrow label, for seasonal or holiday promotions.',
    tags: ['promotion', 'banner', 'seasonal', 'campaign'],
    badge: 'new',
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      eyebrowText: 'Limited Time',
      title: 'Gift the',
      titleAccent: 'Galaxy',
      subtitle: 'Digital gift cards for every platform, delivered instantly.',
      imageUrl: placeholderImage('Seasonal Campaign', 1200, 500),
      buttonText: 'Shop Gift Cards',
      buttonUrl: '/products',
      countdownSeconds: 7200,
      countdownEndsAtUtc: null,
    } satisfies SeasonalCampaignBannerConfig,
  },
  {
    category: 'Categories',
    variantKey: 'popular-categories',
    displayName: 'Popular Categories',
    renderComponent: PopularCategoriesVariantDefaultComponent,
    description: 'A grid of the storefront’s active catalog categories, driven by live data at runtime.',
    tags: ['categories', 'grid', 'catalog'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      sectionTitle: 'Popular Categories',
      maximumCategories: 6,
      sortOrder: 'manual',
    } satisfies PopularCategoriesSectionConfig,
  },
  {
    category: 'Products',
    variantKey: 'flash-deals',
    displayName: 'Flash Deals',
    renderComponent: FlashDealsVariantDefaultComponent,
    description: 'A countdown-driven grid of discounted featured products.',
    tags: ['products', 'deals', 'countdown', 'grid'],
    badge: 'popular',
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      sectionTitle: 'Flash Deals',
      sectionSubtitle: 'Ends soon — don’t miss out.',
      countdownEnabled: true,
      countdownDateUtc: null,
      maximumProducts: 8,
      sortMethod: 'discount',
      countdownSeconds: 3600,
    } satisfies FlashDealsSectionConfig,
  },
  {
    category: 'Products',
    variantKey: 'latest-arrivals',
    displayName: 'Latest Arrivals',
    renderComponent: LatestArrivalsVariantDefaultComponent,
    description: 'One spotlighted product plus a grid of the rest — for newly published catalog items.',
    tags: ['products', 'new', 'grid'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      sectionTitle: 'Latest',
      sectionTitleAccent: 'Arrivals',
      sectionSubtitle: 'Fresh off the catalog.',
      maximumProducts: 8,
      sortMethod: 'newest',
    } satisfies LatestArrivalsSectionConfig,
  },
  {
    category: 'Collections',
    variantKey: 'trending-section',
    displayName: 'Trending Section',
    renderComponent: TrendingSectionVariantDefaultComponent,
    description: 'Live catalog-ranking data — top-ranked products plus one best-value highlight.',
    tags: ['trending', 'ranking', 'products'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Trending Now',
      subtitle: 'Preview data',
      maximumItems: 4,
      displayStyle: 'grid',
    } satisfies FeaturedCollectionsSectionConfig,
  },
  {
    category: 'Collections',
    variantKey: 'editorial-showcase',
    displayName: 'Collections — Editorial Showcase',
    renderComponent: CollectionVariantEditorialShowcaseComponent,
    description: 'A curator-authored row of collection cards, each linking to a themed catalog view.',
    tags: ['collections', 'editorial', 'cards'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Trending',
      titleAccent: 'Collections',
      subtitle: 'Hand-picked bundles worth checking out.',
      cards: [
        { id: 'card-1', imageUrl: placeholderImage('Collection A', 700, 420), title: 'RPG Essentials', subtitle: '12 titles', buttonText: 'Browse', buttonUrl: '/products' },
        { id: 'card-2', imageUrl: placeholderImage('Collection B', 700, 420), title: 'Indie Gems', subtitle: '20 titles', buttonText: 'Browse', buttonUrl: '/products' },
      ],
    } satisfies CollectionShowcaseSectionConfig,
  },
  {
    category: 'Editorial',
    variantKey: 'pulse-feed',
    displayName: 'Pulse Feed',
    renderComponent: PulseFeedVariantDefaultComponent,
    description: 'A grid of short news/update cards with a colored tag and timestamp.',
    tags: ['editorial', 'news', 'feed'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Latest',
      titleAccent: 'Updates',
      items: [
        { id: 'pulse-1', tagText: 'Update', tagTone: 'info', timestampText: '2h ago', title: 'New platform launch', description: 'Now live on mobile.', linkUrl: '/products' },
        { id: 'pulse-2', tagText: 'Sale', tagTone: 'success', timestampText: '5h ago', title: 'Weekend deals are live', description: 'Up to 40% off.', linkUrl: '/products' },
      ],
    } satisfies PulseFeedSectionConfig,
  },
  {
    category: 'Editorial',
    variantKey: 'arena-briefings',
    displayName: 'Arena Briefings',
    renderComponent: ArenaBriefingsVariantDefaultComponent,
    description: 'A center featured story flanked by two columns of compact link cards.',
    tags: ['editorial', 'news', 'briefing'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Arena Briefings',
      featuredTagText: 'Breaking',
      featuredImageUrl: placeholderImage('Briefing Featured', 900, 600),
      featuredTitle: 'Season 4 patch notes are here',
      featuredDescription: 'Balance changes across every ranked platform.',
      featuredButtonText: 'Read More',
      featuredButtonUrl: '/products',
      sideItems: [
        { id: 'side-1', tagText: 'News', title: 'New tournament announced', imageUrl: placeholderImage('Side 1', 400, 260), linkUrl: '/products' },
        { id: 'side-2', tagText: 'Guide', title: 'Best starter builds', imageUrl: placeholderImage('Side 2', 400, 260), linkUrl: '/products' },
      ],
    } satisfies ArenaBriefingsSectionConfig,
  },
  {
    category: 'Community',
    variantKey: 'community-newsletter',
    displayName: 'Community & Newsletter',
    renderComponent: CommunityNewsletterVariantDefaultComponent,
    description: 'Two side-by-side cards: a Discord invite and a newsletter signup form.',
    tags: ['community', 'newsletter', 'discord'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      discordTitle: 'Join the Discord',
      discordDescription: 'Trade tips, get support, and hear about drops first.',
      discordButtonText: 'Join Now',
      discordButtonUrl: '/products',
      newsletterTitle: 'Stay in the Loop',
      newsletterDescription: 'Deals and new releases, straight to your inbox.',
      newsletterPlaceholder: 'you@example.com',
      newsletterButtonText: 'Subscribe',
      newsletterPrivacyText: 'We respect your privacy.',
    } satisfies CommunityNewsletterSectionConfig,
  },
  {
    category: 'Showcase',
    variantKey: 'console-favorites',
    displayName: 'Console Favorites',
    renderComponent: ConsoleFavoritesVariantDefaultComponent,
    description: 'A horizontally scrollable row of game-cover cards, with one visually featured.',
    tags: ['showcase', 'console', 'carousel'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      title: 'Console Favorites',
      cards: [
        { id: 'console-1', imageUrl: placeholderImage('Console 1', 400, 560), title: 'Starfall Chronicles', tags: ['RPG', 'Open World'], badgeText: 'Top Rated', buttonText: 'View', buttonUrl: '/products', featured: true },
        { id: 'console-2', imageUrl: placeholderImage('Console 2', 400, 560), title: 'Neon Drift', tags: ['Racing'], badgeText: '', buttonText: 'View', buttonUrl: '/products', featured: false },
      ],
    } satisfies ConsoleFavoritesSectionConfig,
  },
  {
    category: 'Showcase',
    variantKey: 'hardware-spotlight',
    displayName: 'Showcase — Hardware Spotlight',
    renderComponent: HardwareShowcaseVariantDefaultComponent,
    description: 'A two-column image-plus-copy showcase, typically used to promote a membership tier.',
    tags: ['showcase', 'hardware', 'membership'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      eyebrowText: 'HAMBOX Elite',
      badgeText: 'Members Only',
      title: 'Forge Your Destiny',
      description: 'Unlock exclusive drops, faster delivery, and member-only pricing.',
      imageUrl: placeholderImage('Hardware Spotlight', 900, 700),
      primaryButtonText: 'Join Elite',
      primaryButtonUrl: '/products',
      secondaryButtonText: 'Learn More',
      secondaryButtonUrl: '/products',
    } satisfies HardwareShowcaseSectionConfig,
  },
  {
    category: 'Assistant',
    variantKey: 'ai-assistant',
    displayName: 'AI Assistant',
    renderComponent: AiAssistantVariantDefaultComponent,
    description: 'A promo card introducing the storefront’s AI shopping assistant.',
    tags: ['assistant', 'ai', 'promo'],
    badge: 'new',
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
      statusText: 'Now Live',
      title: 'Meet HAMBOX',
      titleAccent: 'Nexus',
      description: 'Your AI shopping assistant — find the perfect key in seconds.',
      buttonText: 'Try It Now',
      buttonUrl: '/products',
    } satisfies AiAssistantSectionConfig,
  },
  {
    category: 'Footer',
    variantKey: 'storefront-footer',
    displayName: 'Storefront Footer',
    renderComponent: FooterVariantDefaultComponent,
    description: 'The storefront’s global footer — company info, contact details, and social links.',
    tags: ['footer', 'navigation', 'contact'],
    supportedBreakpoints: ALL_BREAKPOINTS,
    previewConfig: {
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
    } satisfies FooterSectionConfig,
  },
];

const registryByKey = new Map(
  SECTION_VARIANT_REGISTRY.map((definition) => [`${definition.category}:${definition.variantKey}`, definition]),
);

export function resolveSectionVariant(category: string, variantKey: string): SectionVariantDefinition | undefined {
  return registryByKey.get(`${category}:${variantKey}`);
}

/** Groups variants by category, preserving registry order. Used by the admin Section Library. */
export function groupSectionVariantsByCategory(
  variants: readonly SectionVariantDefinition[] = SECTION_VARIANT_REGISTRY,
): ReadonlyMap<string, readonly SectionVariantDefinition[]> {
  const groups = new Map<string, SectionVariantDefinition[]>();

  for (const variant of variants) {
    const existing = groups.get(variant.category);
    if (existing) {
      existing.push(variant);
    } else {
      groups.set(variant.category, [variant]);
    }
  }

  return groups;
}

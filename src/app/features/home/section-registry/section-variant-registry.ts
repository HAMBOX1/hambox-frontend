import { SectionVariantDefinition } from './models/section-variant.model';
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

/**
 * Must mirror the seeded "Default" template's category/variantKey pairs exactly (backend Content
 * module). Deliberately only lists the render side — this file is imported by the storefront home
 * page's lazy chunk (via `SectionRendererComponent`), so it must never import admin-only settings-
 * form components. See `features/admin/page-builder/section-settings-registry.ts` for those.
 */
export const SECTION_VARIANT_REGISTRY: readonly SectionVariantDefinition[] = [
  {
    category: 'Navigation',
    variantKey: 'platform-selector',
    displayName: 'Platform Selector',
    renderComponent: PlatformSelectorVariantDefaultComponent,
  },
  {
    category: 'Hero',
    variantKey: 'kinetic-glass',
    displayName: 'Hero — Kinetic Glass',
    renderComponent: HeroVariantKineticGlassComponent,
  },
  {
    category: 'Hero',
    variantKey: 'grid-showcase',
    displayName: 'Hero — Grid Showcase',
    renderComponent: HeroVariantGridShowcaseComponent,
  },
  {
    category: 'Hero',
    variantKey: 'editorial-spotlight',
    displayName: 'Hero — Editorial Spotlight',
    renderComponent: HeroVariantEditorialSpotlightComponent,
  },
  {
    category: 'Features',
    variantKey: 'trust-bar',
    displayName: 'Trust Bar',
    renderComponent: TrustBarVariantDefaultComponent,
  },
  {
    category: 'Features',
    variantKey: 'centered-trust',
    displayName: 'Features — Centered Trust',
    renderComponent: TrustBarVariantCenteredComponent,
  },
  {
    category: 'Promotions',
    variantKey: 'promo-banner',
    displayName: 'Promo Banner',
    renderComponent: PromoBannerVariantDefaultComponent,
  },
  {
    category: 'Promotions',
    variantKey: 'seasonal-campaign',
    displayName: 'Promotions — Seasonal Campaign',
    renderComponent: PromoBannerVariantSeasonalCampaignComponent,
  },
  {
    category: 'Categories',
    variantKey: 'popular-categories',
    displayName: 'Popular Categories',
    renderComponent: PopularCategoriesVariantDefaultComponent,
  },
  {
    category: 'Products',
    variantKey: 'flash-deals',
    displayName: 'Flash Deals',
    renderComponent: FlashDealsVariantDefaultComponent,
  },
  {
    category: 'Products',
    variantKey: 'latest-arrivals',
    displayName: 'Latest Arrivals',
    renderComponent: LatestArrivalsVariantDefaultComponent,
  },
  {
    category: 'Collections',
    variantKey: 'trending-section',
    displayName: 'Trending Section',
    renderComponent: TrendingSectionVariantDefaultComponent,
  },
  {
    category: 'Collections',
    variantKey: 'editorial-showcase',
    displayName: 'Collections — Editorial Showcase',
    renderComponent: CollectionVariantEditorialShowcaseComponent,
  },
  {
    category: 'Editorial',
    variantKey: 'pulse-feed',
    displayName: 'Pulse Feed',
    renderComponent: PulseFeedVariantDefaultComponent,
  },
  {
    category: 'Editorial',
    variantKey: 'arena-briefings',
    displayName: 'Arena Briefings',
    renderComponent: ArenaBriefingsVariantDefaultComponent,
  },
  {
    category: 'Community',
    variantKey: 'community-newsletter',
    displayName: 'Community & Newsletter',
    renderComponent: CommunityNewsletterVariantDefaultComponent,
  },
  {
    category: 'Showcase',
    variantKey: 'console-favorites',
    displayName: 'Console Favorites',
    renderComponent: ConsoleFavoritesVariantDefaultComponent,
  },
  {
    category: 'Showcase',
    variantKey: 'hardware-spotlight',
    displayName: 'Showcase — Hardware Spotlight',
    renderComponent: HardwareShowcaseVariantDefaultComponent,
  },
  {
    category: 'Assistant',
    variantKey: 'ai-assistant',
    displayName: 'AI Assistant',
    renderComponent: AiAssistantVariantDefaultComponent,
  },
  {
    category: 'Footer',
    variantKey: 'storefront-footer',
    displayName: 'Storefront Footer',
    renderComponent: FooterVariantDefaultComponent,
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

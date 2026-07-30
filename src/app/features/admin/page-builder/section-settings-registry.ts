import { SectionSettingsFormType } from '../../home/section-registry/models/section-variant.model';
import { AiAssistantSettingsFormComponent } from './components/section-settings-forms/ai-assistant-settings-form.component';
import { ArenaBriefingsSettingsFormComponent } from './components/section-settings-forms/arena-briefings-settings-form.component';
import { CollectionShowcaseSettingsFormComponent } from './components/section-settings-forms/collection-showcase-settings-form.component';
import { ConsoleFavoritesSettingsFormComponent } from './components/section-settings-forms/console-favorites-settings-form.component';
import { CommunityNewsletterSettingsFormComponent } from './components/section-settings-forms/community-newsletter-settings-form.component';
import { FeaturedCollectionsSettingsFormComponent } from './components/section-settings-forms/featured-collections-settings-form.component';
import { FlashDealsSettingsFormComponent } from './components/section-settings-forms/flash-deals-settings-form.component';
import { FooterSettingsFormComponent } from './components/section-settings-forms/footer-settings-form.component';
import { HardwareShowcaseSettingsFormComponent } from './components/section-settings-forms/hardware-showcase-settings-form.component';
import { HeroEditorialSpotlightSettingsFormComponent } from './components/section-settings-forms/hero-editorial-spotlight-settings-form.component';
import { HeroGridShowcaseSettingsFormComponent } from './components/section-settings-forms/hero-grid-showcase-settings-form.component';
import { HeroSectionSettingsFormComponent } from './components/section-settings-forms/hero-section-settings-form.component';
import { LatestArrivalsSettingsFormComponent } from './components/section-settings-forms/latest-arrivals-settings-form.component';
import { PlatformSelectorSettingsFormComponent } from './components/section-settings-forms/platform-selector-settings-form.component';
import { PopularCategoriesSettingsFormComponent } from './components/section-settings-forms/popular-categories-settings-form.component';
import { PromoBannerSettingsFormComponent } from './components/section-settings-forms/promo-banner-settings-form.component';
import { PulseFeedSettingsFormComponent } from './components/section-settings-forms/pulse-feed-settings-form.component';
import { SeasonalCampaignBannerSettingsFormComponent } from './components/section-settings-forms/seasonal-campaign-banner-settings-form.component';
import { TrustBarSettingsFormComponent } from './components/section-settings-forms/trust-bar-settings-form.component';

/**
 * Admin-only counterpart to `SECTION_VARIANT_REGISTRY` (`home/section-registry/section-variant-
 * registry.ts`) — maps each `category:variantKey` to its settings-form component. Kept out of the
 * shared registry deliberately: that file is imported by the public storefront home page's lazy
 * chunk, and every one of these forms pulls in admin-only PrimeNG/CDK modules.
 *
 * A variant with no entry here is a valid, permanent state (`resolveSectionSettingsForm` returns
 * null) — `SectionSettingsPanelComponent` falls back to the raw-JSON editor for it, so adding a new
 * render variant never requires touching this file to keep working.
 */
const SECTION_SETTINGS_FORM_REGISTRY: Readonly<Record<string, SectionSettingsFormType>> = {
  'Navigation:platform-selector': PlatformSelectorSettingsFormComponent,
  'Hero:kinetic-glass': HeroSectionSettingsFormComponent,
  'Hero:grid-showcase': HeroGridShowcaseSettingsFormComponent,
  'Hero:editorial-spotlight': HeroEditorialSpotlightSettingsFormComponent,
  'Features:trust-bar': TrustBarSettingsFormComponent,
  'Features:centered-trust': TrustBarSettingsFormComponent,
  'Promotions:promo-banner': PromoBannerSettingsFormComponent,
  'Promotions:seasonal-campaign': SeasonalCampaignBannerSettingsFormComponent,
  'Categories:popular-categories': PopularCategoriesSettingsFormComponent,
  'Products:flash-deals': FlashDealsSettingsFormComponent,
  'Products:latest-arrivals': LatestArrivalsSettingsFormComponent,
  'Collections:trending-section': FeaturedCollectionsSettingsFormComponent,
  'Collections:editorial-showcase': CollectionShowcaseSettingsFormComponent,
  'Editorial:pulse-feed': PulseFeedSettingsFormComponent,
  'Editorial:arena-briefings': ArenaBriefingsSettingsFormComponent,
  'Community:community-newsletter': CommunityNewsletterSettingsFormComponent,
  'Showcase:console-favorites': ConsoleFavoritesSettingsFormComponent,
  'Showcase:hardware-spotlight': HardwareShowcaseSettingsFormComponent,
  'Assistant:ai-assistant': AiAssistantSettingsFormComponent,
  'Footer:storefront-footer': FooterSettingsFormComponent,
};

export function resolveSectionSettingsForm(category: string, variantKey: string): SectionSettingsFormType | null {
  return SECTION_SETTINGS_FORM_REGISTRY[`${category}:${variantKey}`] ?? null;
}

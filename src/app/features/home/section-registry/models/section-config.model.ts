/**
 * Per-section-category `configJson` shapes — camelCase mirrors of the backend's
 * `Storefront*Settings` records (`PlatformSettingsContracts.cs`), minus each `Visible` field.
 * Visibility already lives on `LandingPageSectionEntry.isVisible` at the section-instance level,
 * so it is never duplicated inside a section's own config blob.
 */

export interface HeroSectionConfig {
  readonly title: string;
  readonly subtitle: string;
  readonly primaryButtonText: string;
  readonly primaryButtonUrl: string;
  readonly secondaryButtonText: string;
  readonly secondaryButtonUrl: string;
  readonly backgroundImageUrl: string;
  readonly overlayImageUrl: string | null;
  readonly overlayOpacity: number;
  readonly badgeText: string;
  readonly badgeColor: string;
}

/** Figma "Latest Games" homepage hero — same slot/shape family as `HeroSectionConfig` but with a
 * two-tone title (plain first line + accented second line) instead of a single-line title. */
export interface HeroGridShowcaseConfig {
  readonly badgeText: string;
  readonly title: string;
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly primaryButtonText: string;
  readonly primaryButtonUrl: string;
  readonly secondaryButtonText: string;
  readonly secondaryButtonUrl: string;
  readonly backgroundImageUrl: string;
  readonly overlayImageUrl: string | null;
  readonly overlayOpacity: number;
}

/** Figma "Latest Games" editorial hero — one large featured card plus two stacked side cards.
 * Flat fields (not a repeatable array) because the 1-large + 2-small layout is structurally fixed. */
export interface HeroEditorialSpotlightConfig {
  readonly eyebrowText: string;
  readonly title: string;
  readonly viewAllText: string;
  readonly viewAllUrl: string;
  readonly featuredBadgeText: string;
  readonly featuredImageUrl: string;
  readonly featuredTitle: string;
  readonly featuredSubtitle: string;
  readonly featuredButtonText: string;
  readonly featuredButtonUrl: string;
  readonly secondaryImageUrl: string;
  readonly secondaryLabel: string;
  readonly tertiaryImageUrl: string;
  readonly tertiaryLabel: string;
}

/** Figma platform-selector icon row (PC Gaming / PlayStation / Xbox Series / Mobile / Steam Deck).
 * `iconClass` is a PrimeIcons class (e.g. `pi pi-desktop`) rather than an image URL — matches the
 * design-system rule to use PrimeIcons for icon chrome, and is far less admin friction than
 * requiring a custom SVG upload per platform. */
export interface PlatformSelectorItemConfig {
  readonly id: string;
  readonly label: string;
  readonly iconClass: string;
  readonly linkUrl: string;
}

export interface PlatformSelectorSectionConfig {
  readonly items: readonly PlatformSelectorItemConfig[];
}

export interface PromoBannerSectionConfig {
  readonly title: string;
  readonly subtitle: string;
  readonly imageUrl: string;
  readonly buttonText: string;
  readonly buttonUrl: string;
  readonly countdownSeconds: number;
  readonly countdownEndsAtUtc: string | null;
  readonly backgroundColor: string;
}

/** Figma "Gift the Galaxy" seasonal-campaign banner — same slot family as `PromoBannerSectionConfig`
 * plus an eyebrow label and a two-tone title; renders on the fixed brand gradient (no `backgroundColor`
 * override) so the campaign look stays consistent regardless of what an admin picks. */
export interface SeasonalCampaignBannerConfig {
  readonly eyebrowText: string;
  readonly title: string;
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly imageUrl: string;
  readonly buttonText: string;
  readonly buttonUrl: string;
  readonly countdownSeconds: number;
  readonly countdownEndsAtUtc: string | null;
}

/** Figma "Trending Collections" homepage section — a curator-authored duo/row of collection cards.
 * Distinct from `Collections:trending-section` (live catalog-ranking data, no admin-authored cards). */
export interface CollectionShowcaseCardConfig {
  readonly id: string;
  readonly imageUrl: string;
  readonly title: string;
  readonly subtitle: string;
  readonly buttonText: string;
  readonly buttonUrl: string;
}

export interface CollectionShowcaseSectionConfig {
  readonly title: string;
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly cards: readonly CollectionShowcaseCardConfig[];
}

export interface PopularCategoriesSectionConfig {
  readonly sectionTitle: string;
  readonly maximumCategories: number;
  readonly sortOrder: string;
}

export interface FlashDealsSectionConfig {
  readonly sectionTitle: string;
  readonly sectionSubtitle: string;
  readonly countdownEnabled: boolean;
  readonly countdownDateUtc: string | null;
  readonly maximumProducts: number;
  readonly sortMethod: string;
  readonly countdownSeconds: number;
}

/** Figma "Latest Arrivals" homepage section — one spotlighted product plus a grid of the rest.
 * Same `Products` category as `flash-deals`, sourced from the same live `context().featuredProducts`,
 * but without countdown fields (this layout has no countdown timer). */
export interface LatestArrivalsSectionConfig {
  readonly sectionTitle: string;
  readonly sectionTitleAccent: string;
  readonly sectionSubtitle: string;
  readonly maximumProducts: number;
  readonly sortMethod: string;
}

export interface FeaturedCollectionsSectionConfig {
  readonly title: string;
  readonly subtitle: string;
  readonly maximumItems: number;
  readonly displayStyle: string;
}

export interface TrustItemConfig {
  readonly id: string;
  readonly iconUrl: string;
  readonly title: string;
  readonly description: string;
  readonly sortOrder: number;
}

export interface TrustBarSectionConfig {
  readonly items: readonly TrustItemConfig[];
}

/** Figma "Pulse Feed" homepage section — a grid of short news/update cards. `tagTone` maps onto the
 * existing semantic palette (success/info/warning/danger) rather than a free color picker, so a new
 * card's tag always resolves to a real theme color. */
export type PulseFeedTagTone = 'success' | 'info' | 'warning' | 'danger';

export interface PulseFeedItemConfig {
  readonly id: string;
  readonly tagText: string;
  readonly tagTone: PulseFeedTagTone;
  readonly timestampText: string;
  readonly title: string;
  readonly description: string;
  readonly linkUrl: string;
}

export interface PulseFeedSectionConfig {
  readonly title: string;
  readonly titleAccent: string;
  readonly items: readonly PulseFeedItemConfig[];
}

/** Figma "Arena Briefings" homepage section — a center featured story flanked by two columns of
 * compact links. `sideItems` is a single flat list split evenly left/right at render time, so
 * reordering the admin list also moves an item between columns — matches the visual left-to-right
 * reading order in the Figma. */
export interface ArenaBriefingSideItemConfig {
  readonly id: string;
  readonly tagText: string;
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
}

export interface ArenaBriefingsSectionConfig {
  readonly title: string;
  readonly featuredTagText: string;
  readonly featuredImageUrl: string;
  readonly featuredTitle: string;
  readonly featuredDescription: string;
  readonly featuredButtonText: string;
  readonly featuredButtonUrl: string;
  readonly sideItems: readonly ArenaBriefingSideItemConfig[];
}

/** Figma "Forge Your Destiny With HAMBOX Elite" hardware showcase — image + copy, two-column. */
export interface HardwareShowcaseSectionConfig {
  readonly eyebrowText: string;
  readonly badgeText: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly primaryButtonText: string;
  readonly primaryButtonUrl: string;
  readonly secondaryButtonText: string;
  readonly secondaryButtonUrl: string;
}

/** Figma "Console Favorites" homepage section — a horizontally scrollable row of game-cover cards,
 * one of which can be visually featured (larger, glowing border, visible CTA). Reuses the same
 * scroll-track + nav-arrow mechanism as `CollectionShowcaseComponent`. */
export interface ConsoleFavoriteCardConfig {
  readonly id: string;
  readonly imageUrl: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly badgeText: string;
  readonly buttonText: string;
  readonly buttonUrl: string;
  readonly featured: boolean;
}

export interface ConsoleFavoritesSectionConfig {
  readonly title: string;
  readonly cards: readonly ConsoleFavoriteCardConfig[];
}

/** Figma "Meet HAMBOX Nexus" AI-assistant promo card. */
export interface AiAssistantSectionConfig {
  readonly statusText: string;
  readonly title: string;
  readonly titleAccent: string;
  readonly description: string;
  readonly buttonText: string;
  readonly buttonUrl: string;
}

/** Figma "Join the Discord" / "Encrypted Updates" homepage section — two structurally different
 * cards side by side, so flat fields rather than a repeatable array (same reasoning as
 * `HeroEditorialSpotlightConfig`). No newsletter API exists yet — the form emits `emailSubmitted`
 * rather than faking a subscribe response; wiring a real endpoint is a separate task. */
export interface CommunityNewsletterSectionConfig {
  readonly discordTitle: string;
  readonly discordDescription: string;
  readonly discordButtonText: string;
  readonly discordButtonUrl: string;
  readonly newsletterTitle: string;
  readonly newsletterDescription: string;
  readonly newsletterPlaceholder: string;
  readonly newsletterButtonText: string;
  readonly newsletterPrivacyText: string;
}

export interface FooterSectionConfig {
  readonly companyName: string;
  readonly copyright: string;
  readonly supportEmail: string;
  readonly supportPhone: string;
  readonly address: string;
  readonly workingHours: string;
  readonly facebookUrl: string | null;
  readonly instagramUrl: string | null;
  readonly xUrl: string | null;
  readonly discordUrl: string | null;
  readonly telegramUrl: string | null;
  readonly youTubeUrl: string | null;
  readonly tikTokUrl: string | null;
  readonly whatsAppUrl: string | null;
}

export type SectionConfig =
  | PlatformSelectorSectionConfig
  | HeroSectionConfig
  | HeroGridShowcaseConfig
  | HeroEditorialSpotlightConfig
  | CollectionShowcaseSectionConfig
  | LatestArrivalsSectionConfig
  | PromoBannerSectionConfig
  | SeasonalCampaignBannerConfig
  | PopularCategoriesSectionConfig
  | FlashDealsSectionConfig
  | FeaturedCollectionsSectionConfig
  | TrustBarSectionConfig
  | PulseFeedSectionConfig
  | ArenaBriefingsSectionConfig
  | ConsoleFavoritesSectionConfig
  | HardwareShowcaseSectionConfig
  | AiAssistantSectionConfig
  | CommunityNewsletterSectionConfig
  | FooterSectionConfig;

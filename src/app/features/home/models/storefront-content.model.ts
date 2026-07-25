export interface StorefrontHeroContent {
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
  readonly visible: boolean;
}

export interface StorefrontAnnouncementBarContent {
  readonly text: string;
  readonly link: string | null;
  readonly buttonText: string | null;
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly visible: boolean;
  readonly displayPosition: string;
}

export interface StorefrontPromoBannerContent {
  readonly title: string;
  readonly subtitle: string;
  readonly imageUrl: string;
  readonly buttonText: string;
  readonly buttonUrl: string;
  readonly countdownSeconds: number;
  readonly countdownEndsAtUtc: string | null;
  readonly backgroundColor: string;
  readonly visible: boolean;
}

export interface StorefrontFlashDealsContent {
  readonly sectionTitle: string;
  readonly sectionSubtitle: string;
  readonly countdownEnabled: boolean;
  readonly countdownDateUtc: string | null;
  readonly maximumProducts: number;
  readonly sortMethod: string;
  readonly countdownSeconds: number;
  readonly visible: boolean;
}

export interface StorefrontFeaturedCollectionsContent {
  readonly title: string;
  readonly subtitle: string;
  readonly maximumItems: number;
  readonly displayStyle: string;
  readonly visible: boolean;
}

export interface StorefrontPopularCategoriesContent {
  readonly sectionTitle: string;
  readonly maximumCategories: number;
  readonly sortOrder: string;
  readonly visible: boolean;
}

export interface StorefrontFeaturedProductContent {
  readonly productId: string | null;
  readonly badge: string;
  readonly callToAction: string;
  readonly visible: boolean;
}

export interface StorefrontTrustItemContent {
  readonly id: string;
  readonly iconUrl: string;
  readonly title: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly visible: boolean;
}

export interface StorefrontFooterContent {
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

export interface StorefrontSeoContent {
  readonly defaultMetaTitle: string;
  readonly defaultMetaDescription: string;
  readonly openGraphImageUrl: string | null;
  readonly twitterCard: string;
  readonly canonicalUrl: string;
}

export interface StorefrontContent {
  readonly hero: StorefrontHeroContent;
  readonly announcementBar: StorefrontAnnouncementBarContent;
  readonly promoBanner: StorefrontPromoBannerContent;
  readonly flashDeals: StorefrontFlashDealsContent;
  readonly featuredCollections: StorefrontFeaturedCollectionsContent;
  readonly popularCategories: StorefrontPopularCategoriesContent;
  readonly featuredProduct: StorefrontFeaturedProductContent;
  readonly trustBar: readonly StorefrontTrustItemContent[];
  readonly footer: StorefrontFooterContent;
  readonly seo: StorefrontSeoContent;
}

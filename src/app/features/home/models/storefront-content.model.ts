export interface StorefrontHeroContent {
  readonly eyebrow: string;
  readonly titleLine1: string;
  readonly titleAccent: string;
  readonly description: string;
  readonly backgroundImageUrl: string;
  readonly overlayImageUrl: string;
  readonly primaryCtaLabel: string;
  readonly primaryCtaRoute: string;
  readonly secondaryCtaLabel: string;
  readonly secondaryCtaRoute: string;
}

export interface StorefrontPromoBannerContent {
  readonly headline: string;
  readonly subheadline: string;
  readonly backgroundImageUrl: string;
  readonly countdownSeconds: number;
}

export interface StorefrontContent {
  readonly hero: StorefrontHeroContent;
  readonly promoBanner: StorefrontPromoBannerContent;
  readonly flashDealsCountdownSeconds: number;
}

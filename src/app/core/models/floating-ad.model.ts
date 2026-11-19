/** Who a floating ad is shown to (backend `FloatingAdAudience`). */
export type FloatingAdAudience = 'Everyone' | 'Guests' | 'SignedIn' | 'WithoutMembership' | 'WithMembership';

/** The card designs: a small card, a product (picture and price), or an offer. */
export type FloatingAdStyle = 'Mini' | 'Product' | 'Promo';
export type FloatingAdDesktopPosition = 'BottomLeft' | 'BottomRight';
export type FloatingAdMobilePosition = 'Bottom' | 'Top';

/** The storefront pages an ad can be limited to (none chosen = every page). */
export type FloatingAdPage = 'home' | 'products' | 'product' | 'category';

/** An ad as the storefront receives it. */
export interface FloatingAdPublic {
  readonly id: string;
  readonly titleEn: string;
  readonly titleAr: string | null;
  readonly messageEn: string | null;
  readonly messageAr: string | null;
  readonly buttonLabelEn: string | null;
  readonly buttonLabelAr: string | null;
  readonly linkUrl: string | null;
  readonly dismissHours: number;
  /** Picture shown on the card. */
  readonly imageUrl: string | null;
  /** When set, the card shows a live countdown to this moment. */
  readonly countdownEndsOnUtc: string | null;
  readonly style?: FloatingAdStyle;
  readonly positionDesktop?: FloatingAdDesktopPosition;
  readonly positionMobile?: FloatingAdMobilePosition;
  readonly pages?: readonly FloatingAdPage[] | null;
  readonly priceText?: string | null;
  readonly oldPriceText?: string | null;
}

/** An ad as the admin edits it. */
export interface FloatingAdAdmin {
  readonly id: string;
  readonly titleEn: string;
  readonly titleAr: string | null;
  readonly messageEn: string | null;
  readonly messageAr: string | null;
  readonly buttonLabelEn: string | null;
  readonly buttonLabelAr: string | null;
  readonly linkUrl: string | null;
  readonly audience: FloatingAdAudience;
  readonly isActive: boolean;
  readonly startsOnUtc: string | null;
  readonly endsOnUtc: string | null;
  readonly sortOrder: number;
  readonly dismissHours: number;
  readonly imageUrl: string | null;
  readonly showCountdown: boolean;
  readonly style: FloatingAdStyle;
  readonly positionDesktop: FloatingAdDesktopPosition;
  readonly positionMobile: FloatingAdMobilePosition;
  readonly pages: readonly FloatingAdPage[];
  readonly priceText: string | null;
  readonly oldPriceText: string | null;
}

export type FloatingAdInput = Omit<FloatingAdAdmin, 'id'>;

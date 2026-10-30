/** Who a floating ad is shown to (backend `FloatingAdAudience`). */
export type FloatingAdAudience = 'Everyone' | 'Guests' | 'SignedIn' | 'WithoutMembership' | 'WithMembership';

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
}

export type FloatingAdInput = Omit<FloatingAdAdmin, 'id'>;

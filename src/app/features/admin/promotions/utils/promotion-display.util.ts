import { CouponCodeDto, DiscountType, PromotionType } from '../models/promotion-api.model';

export type ScheduleStatus = 'live' | 'scheduled' | 'ended' | 'open-ended';
export type CouponStatus = 'active' | 'expired' | 'exhausted' | 'inactive';

const SCOPE_LABEL_KEYS: Record<PromotionType, string> = {
  CouponCode: 'ADMIN.PROMOTIONS.SCOPE.COUPON_CODE',
  Automatic: 'ADMIN.PROMOTIONS.SCOPE.AUTOMATIC',
  Membership: 'ADMIN.PROMOTIONS.SCOPE.MEMBERSHIP',
  Category: 'ADMIN.PROMOTIONS.SCOPE.CATEGORY',
  Product: 'ADMIN.PROMOTIONS.SCOPE.PRODUCT',
  FlashSale: 'ADMIN.PROMOTIONS.SCOPE.FLASH_SALE',
  ReferralReward: 'ADMIN.PROMOTIONS.SCOPE.REFERRAL_REWARD',
};

/** Translation key for the promotion's scope — derived purely from the real `type` field. */
export function scopeLabelKey(type: string): string {
  return SCOPE_LABEL_KEYS[type as PromotionType] ?? type;
}

/** Schedule state derived from the promotion's real start/end dates — no data invented. */
export function scheduleStatus(
  startDateUtc: string | null,
  endDateUtc: string | null,
  now: Date = new Date(),
): ScheduleStatus {
  const start = startDateUtc ? new Date(startDateUtc) : null;
  const end = endDateUtc ? new Date(endDateUtc) : null;

  if (end && end.getTime() < now.getTime()) {
    return 'ended';
  }
  if (start && start.getTime() > now.getTime()) {
    return 'scheduled';
  }
  if (!start && !end) {
    return 'open-ended';
  }
  return 'live';
}

/** "You save 15%" / "$20 discount" — computed straight from the real discount fields. */
export function discountPreviewText(discountType: string, discountValue: number): string {
  if (discountType === ('Percentage' satisfies DiscountType)) {
    return `${discountValue}%`;
  }
  return `${discountValue}`;
}

/** Non-blocking sanity warning for risky discount configurations. Returns null when fine. */
export function discountWarning(discountType: string, discountValue: number): string | null {
  if (discountType === ('Percentage' satisfies DiscountType) && discountValue >= 100) {
    return 'ADMIN.PROMOTIONS.EDIT.WARNING_FULL_DISCOUNT';
  }
  if (discountType === ('Percentage' satisfies DiscountType) && discountValue >= 70) {
    return 'ADMIN.PROMOTIONS.EDIT.WARNING_HIGH_DISCOUNT';
  }
  return null;
}

/** Coupon status computed from the real `CouponCodeDto` fields (isActive/usedCount/maxUses/expiresOnUtc). */
export function couponStatus(coupon: CouponCodeDto, now: Date = new Date()): CouponStatus {
  if (!coupon.isActive) {
    return 'inactive';
  }
  if (coupon.expiresOnUtc && new Date(coupon.expiresOnUtc).getTime() < now.getTime()) {
    return 'expired';
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return 'exhausted';
  }
  return 'active';
}

/** Remaining uses for a coupon, or null when unlimited (`maxUses` unset). */
export function couponRemaining(coupon: CouponCodeDto): number | null {
  if (coupon.maxUses === null) {
    return null;
  }
  return Math.max(0, coupon.maxUses - coupon.usedCount);
}

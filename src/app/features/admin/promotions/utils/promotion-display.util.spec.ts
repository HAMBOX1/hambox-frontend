import {
  couponRemaining,
  couponStatus,
  discountPreviewText,
  discountWarning,
  scheduleStatus,
} from './promotion-display.util';
import { CouponCodeDto } from '../models/promotion-api.model';

const NOW = new Date('2026-08-05T12:00:00.000Z');

function coupon(overrides: Partial<CouponCodeDto> = {}): CouponCodeDto {
  return {
    id: '1',
    code: 'SAVE10',
    isSingleUse: false,
    maxUses: null,
    perUserMaxUses: null,
    usedCount: 0,
    expiresOnUtc: null,
    isActive: true,
    ...overrides,
  };
}

describe('scheduleStatus', () => {
  it('is open-ended with no dates', () => {
    expect(scheduleStatus(null, null, NOW)).toBe('open-ended');
  });

  it('is scheduled when start is in the future', () => {
    expect(scheduleStatus('2026-09-01T00:00:00.000Z', null, NOW)).toBe('scheduled');
  });

  it('is ended when end is in the past', () => {
    expect(scheduleStatus(null, '2026-01-01T00:00:00.000Z', NOW)).toBe('ended');
  });

  it('is live when now falls within the window', () => {
    expect(scheduleStatus('2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z', NOW)).toBe(
      'live',
    );
  });
});

describe('discountPreviewText', () => {
  it('formats a percentage discount', () => {
    expect(discountPreviewText('Percentage', 15)).toBe('15%');
  });

  it('formats a fixed amount discount', () => {
    expect(discountPreviewText('FixedAmount', 20)).toBe('20');
  });
});

describe('discountWarning', () => {
  it('flags a 100%+ discount', () => {
    expect(discountWarning('Percentage', 100)).toBe('ADMIN.PROMOTIONS.EDIT.WARNING_FULL_DISCOUNT');
  });

  it('flags a high but valid discount', () => {
    expect(discountWarning('Percentage', 75)).toBe('ADMIN.PROMOTIONS.EDIT.WARNING_HIGH_DISCOUNT');
  });

  it('is null for a reasonable discount', () => {
    expect(discountWarning('Percentage', 15)).toBeNull();
  });

  it('is null for fixed amount discounts', () => {
    expect(discountWarning('FixedAmount', 500)).toBeNull();
  });
});

describe('couponStatus', () => {
  it('is inactive when isActive is false', () => {
    expect(couponStatus(coupon({ isActive: false }), NOW)).toBe('inactive');
  });

  it('is expired when past expiresOnUtc', () => {
    expect(couponStatus(coupon({ expiresOnUtc: '2026-01-01T00:00:00.000Z' }), NOW)).toBe(
      'expired',
    );
  });

  it('is exhausted when usedCount reaches maxUses', () => {
    expect(couponStatus(coupon({ maxUses: 5, usedCount: 5 }), NOW)).toBe('exhausted');
  });

  it('is active otherwise', () => {
    expect(couponStatus(coupon({ maxUses: 5, usedCount: 2 }), NOW)).toBe('active');
  });
});

describe('couponRemaining', () => {
  it('is null when unlimited', () => {
    expect(couponRemaining(coupon({ maxUses: null }))).toBeNull();
  });

  it('subtracts usedCount from maxUses', () => {
    expect(couponRemaining(coupon({ maxUses: 10, usedCount: 4 }))).toBe(6);
  });

  it('never goes below zero', () => {
    expect(couponRemaining(coupon({ maxUses: 5, usedCount: 9 }))).toBe(0);
  });
});

import { PagedResult } from '../../../catalog/models/category.model';

export type PromotionType =
  | 'CouponCode'
  | 'Automatic'
  | 'Membership'
  | 'Category'
  | 'Product'
  | 'FlashSale';

export type PromotionStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';

export type DiscountType = 'Percentage' | 'FixedAmount';

export type PromotionConditionType =
  | 'MinOrderAmount'
  | 'MaxDiscountAmount'
  | 'UsageLimit'
  | 'PerUserLimit'
  | 'FirstPurchaseOnly'
  | 'MembershipRequired'
  | 'CountryCode';

export type PromotionTargetType = 'Product' | 'Category';

export interface PromotionConditionDto {
  readonly type: string;
  readonly value: string;
}

export interface PromotionTargetDto {
  readonly type: string;
  readonly targetId: string;
}

export interface CouponCodeDto {
  readonly id: string;
  readonly code: string;
  readonly isSingleUse: boolean;
  readonly maxUses: number | null;
  readonly perUserMaxUses: number | null;
  readonly usedCount: number;
  readonly expiresOnUtc: string | null;
  readonly isActive: boolean;
}

export interface PromotionListItemDto {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly discountType: string;
  readonly discountValue: number;
  readonly status: string;
  readonly isPublished: boolean;
  readonly startDateUtc: string | null;
  readonly endDateUtc: string | null;
  readonly totalRedemptions: number;
  readonly couponCount: number;
  readonly createdOnUtc: string;
}

export interface PromotionDetailDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: string;
  readonly discountType: string;
  readonly discountValue: number;
  readonly status: string;
  readonly isPublished: boolean;
  readonly startDateUtc: string | null;
  readonly endDateUtc: string | null;
  readonly totalRedemptions: number;
  readonly conditions: readonly PromotionConditionDto[];
  readonly targets: readonly PromotionTargetDto[];
  readonly couponCodes: readonly CouponCodeDto[];
  readonly createdOnUtc: string;
  readonly modifiedOnUtc: string | null;
}

export interface PromotionStatisticsDto {
  readonly promotionId: string;
  readonly totalRedemptions: number;
  readonly totalDiscountGiven: number;
  readonly uniqueUsers: number;
  readonly activeCoupons: number;
  readonly expiredCoupons: number;
}

export interface PromotionRedemptionDto {
  readonly id: string;
  readonly promotionName: string;
  readonly couponCode: string | null;
  readonly userId: string | null;
  readonly orderId: string | null;
  readonly discountAmount: number;
  readonly redeemedOnUtc: string;
}

export interface CreatePromotionRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly type: string;
  readonly discountType: string;
  readonly discountValue: number;
  readonly startDateUtc?: string | null;
  readonly endDateUtc?: string | null;
  readonly conditions?: readonly PromotionConditionDto[] | null;
  readonly targets?: readonly PromotionTargetDto[] | null;
  readonly initialCouponCode?: string | null;
}

export interface UpdatePromotionRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly discountType: string;
  readonly discountValue: number;
  readonly startDateUtc?: string | null;
  readonly endDateUtc?: string | null;
  readonly conditions?: readonly PromotionConditionDto[] | null;
  readonly targets?: readonly PromotionTargetDto[] | null;
}

export interface GenerateCouponsRequest {
  readonly count: number;
  readonly prefix?: string | null;
  readonly isSingleUse: boolean;
  readonly maxUses?: number | null;
  readonly perUserMaxUses?: number | null;
  readonly expiresOnUtc?: string | null;
}

export interface CreateCouponRequest {
  readonly code: string;
  readonly isSingleUse: boolean;
  readonly maxUses?: number | null;
  readonly perUserMaxUses?: number | null;
  readonly expiresOnUtc?: string | null;
}

export interface DuplicatePromotionRequest {
  readonly newName?: string | null;
}

export interface PromotionListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: string;
  readonly type?: string;
}

export type PromotionListResult = PagedResult<PromotionListItemDto>;
export type PromotionRedemptionsResult = PagedResult<PromotionRedemptionDto>;

export const PROMOTION_TYPE_OPTIONS: readonly { label: string; value: PromotionType | 'all' }[] = [
  { label: 'All types', value: 'all' },
  { label: 'Coupon code', value: 'CouponCode' },
  { label: 'Automatic', value: 'Automatic' },
  { label: 'Membership', value: 'Membership' },
  { label: 'Category', value: 'Category' },
  { label: 'Product', value: 'Product' },
  { label: 'Flash sale', value: 'FlashSale' },
];

export const PROMOTION_STATUS_OPTIONS: readonly { label: string; value: PromotionStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

export const DISCOUNT_TYPE_OPTIONS: readonly { label: string; value: DiscountType }[] = [
  { label: 'Percentage', value: 'Percentage' },
  { label: 'Fixed amount', value: 'FixedAmount' },
];

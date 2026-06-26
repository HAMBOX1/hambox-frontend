import { PagedResult } from '../../catalog/models/category.model';

export type { PagedResult };

export interface UserProfileApiDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: string | null;
  readonly avatarUrl: string | null;
  readonly emailConfirmed: boolean;
  readonly status: string;
  readonly memberSince: string;
  readonly preferredLanguage: string;
  readonly preferredCurrency: string;
}

export interface UpdateProfileRequest {
  readonly firstName: string;
  readonly lastName: string;
  readonly phoneNumber: string | null;
  readonly preferredLanguage?: string;
  readonly preferredCurrency?: string;
}

export interface ChangePasswordRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface MembershipCardApiDto {
  readonly tier: string;
  readonly lifetimeSpend: number;
  readonly nextTierThreshold: number;
  readonly progressPercent: number;
}

export interface WishlistPreviewItemApiDto {
  readonly productId: string;
  readonly productNameEn: string;
  readonly unitPrice: number;
  readonly productImageUrl: string | null;
  readonly addedOnUtc: string;
}

export interface WishlistItemApiDto {
  readonly id: string;
  readonly productId: string;
  readonly productNameEn: string;
  readonly unitPrice: number;
  readonly productImageUrl: string | null;
  readonly addedOnUtc: string;
}

export interface ReferralSummaryApiDto {
  readonly referralCode: string;
  readonly tier: string;
  readonly lifetimePoints: number;
  readonly successfulReferrals: number;
}

export interface AccountActivityItemApiDto {
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly occurredOnUtc: string;
}

export interface AccountDashboardApiDto {
  readonly membership: MembershipCardApiDto;
  readonly wishlistPreview: readonly WishlistPreviewItemApiDto[];
  readonly referral: ReferralSummaryApiDto;
  readonly recentActivity: readonly AccountActivityItemApiDto[];
  readonly unreadNotificationCount: number;
}

export interface OrderSummaryApiDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly totalAmount: number;
  readonly itemCount: number;
  readonly createdOnUtc: string;
}

export interface OrderTimelineEventApiDto {
  readonly eventType: string;
  readonly description: string;
  readonly occurredOnUtc: string;
}

export interface OrderLicenseKeyApiDto {
  readonly orderItemId: string;
  readonly productId: string;
  readonly productNameEn: string;
  readonly licenseKey: string;
}

export interface OrderItemReviewStatusApiDto {
  readonly orderItemId: string;
  readonly productId: string;
  readonly productNameEn: string;
  readonly canReview: boolean;
  readonly hasReview: boolean;
  readonly reviewId: string | null;
}

export interface OrderItemApiDto {
  readonly productId: string;
  readonly productNameEn: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
}

export interface OrderDetailApiDto {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly email: string;
  readonly country: string;
  readonly paymentMethod: string;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly taxAmount: number;
  readonly totalAmount: number;
  readonly items: readonly OrderItemApiDto[];
  readonly timeline: readonly OrderTimelineEventApiDto[];
  readonly licenseKeys: readonly OrderLicenseKeyApiDto[];
  readonly invoiceUrl: string | null;
  readonly supportUrl: string | null;
  readonly itemReviewStatuses: readonly OrderItemReviewStatusApiDto[];
  readonly createdOnUtc: string;
}

export interface ProductReviewApiDto {
  readonly id: string;
  readonly userId: string;
  readonly productId: string;
  readonly orderId: string;
  readonly rating: number;
  readonly comment: string;
  readonly createdOnUtc: string;
  readonly modifiedOnUtc: string | null;
}

export interface UserNotificationApiDto {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly isRead: boolean;
  readonly createdOnUtc: string;
}

export interface ReferralTierApiDto {
  readonly name: string;
  readonly minimumPoints: number;
  readonly pointsPerReferral: number;
}

export interface ReferralHistoryApiDto {
  readonly id: string;
  readonly referredUserId: string;
  readonly pointsEarned: number;
  readonly createdOnUtc: string;
}

export interface ReferralDashboardApiDto {
  readonly referralCode: string;
  readonly tier: string;
  readonly lifetimePoints: number;
  readonly successfulReferrals: number;
  readonly availableTiers: readonly ReferralTierApiDto[];
  readonly recentHistory: readonly ReferralHistoryApiDto[];
}

export interface CreateReviewRequest {
  readonly productId: string;
  readonly orderId: string;
  readonly rating: number;
  readonly comment: string;
}

export interface UpdateReviewRequest {
  readonly rating: number;
  readonly comment: string;
}

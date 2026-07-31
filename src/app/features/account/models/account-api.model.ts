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
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
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

export interface MembershipBenefitApiDto {
  readonly type: string;
  readonly value: string;
  readonly displayName: string;
  readonly sortOrder: number;
}

export interface MembershipCardApiDto {
  readonly planName: string;
  readonly badgeLabel: string | null;
  readonly status: string;
  readonly expiresOnUtc: string | null;
  readonly discountPercent: number | null;
  readonly referralMultiplier: number;
  readonly lifetimeSpend: number;
  readonly benefits: readonly MembershipBenefitApiDto[];
}

export interface WalletApiDto {
  readonly points: number;
  readonly estimatedValueUsd: number;
  readonly lifetimeEarned: number;
  readonly lifetimeSpent: number;
  readonly tier: string;
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
  readonly imageUrl?: string | null;
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
  readonly maskedLicenseKey: string;
  readonly licenseKeyId: string;
}

export interface CustomerLibraryItemApiDto {
  readonly id: string;
  readonly orderId: string;
  readonly orderItemId: string;
  readonly productId: string;
  readonly productVariantId: string | null;
  readonly productNameEn: string;
  readonly productImageUrl: string | null;
  readonly platform: string | null;
  readonly edition: string | null;
  readonly region: string | null;
  readonly purchaseDate: string;
  readonly orderNumber: string;
  readonly orderStatus: string;
  readonly deliveryStatus: string;
  readonly maskedLicenseKey: string;
  readonly canReveal: boolean;
  readonly redeemInstructions: string | null;
  readonly invoiceUrl: string | null;
  readonly supportUrl: string | null;
  readonly isRecentPurchase: boolean;
  readonly hasInstructions: boolean;
}

export interface RevealCustomerLibraryKeyApiDto {
  readonly licenseKey: string;
}

export interface LibraryItemInstructionsApiDto {
  readonly title: string;
  readonly contentHtml: string;
  readonly version: number;
  readonly updatedOnUtc: string | null;
}

export interface CustomerLibraryQuery {
  readonly pageNumber?: number;
  readonly pageSize?: number;
  readonly searchTerm?: string;
  readonly deliveryStatus?: string;
  readonly sort?: 'recent' | 'oldest' | 'name';
  readonly group?: 'recent' | 'older';
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
  readonly imageUrl?: string | null;
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
  readonly actionUrl?: string | null;
  readonly isArchived?: boolean;
}

export interface NotificationQuery {
  readonly includeArchived?: boolean;
  readonly isRead?: boolean;
  readonly category?: string;
  readonly search?: string;
}

export interface CommunicationPreferencesApiDto {
  readonly emailEnabled: boolean;
  readonly inAppEnabled: boolean;
  readonly marketingEnabled: boolean;
  readonly securityEnabled: boolean;
  readonly orderEnabled: boolean;
  readonly membershipEnabled: boolean;
  readonly supportEnabled: boolean;
  readonly promotionEnabled: boolean;
  readonly generalEnabled: boolean;
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

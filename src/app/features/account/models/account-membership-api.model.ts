export interface MembershipBenefitApiDto {
  readonly type: string;
  readonly value: string;
  readonly displayName: string;
  readonly sortOrder: number;
}

export interface MembershipPlanSummaryApiDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly price: number;
  readonly durationDays: number;
  readonly status: string;
  readonly sortOrder: number;
  readonly badgeLabel: string | null;
  readonly isDefault: boolean;
  readonly benefitCount: number;
  readonly activeSubscribers: number;
  readonly benefits: readonly MembershipBenefitApiDto[];
}

export interface MembershipSubscriptionApiDto {
  readonly id: string;
  readonly userId: string;
  readonly planId: string;
  readonly planName: string;
  readonly status: string;
  readonly startsOnUtc: string;
  readonly expiresOnUtc: string;
  readonly autoRenew: boolean;
  readonly badgeLabel: string | null;
}

export interface CurrentMembershipApiDto {
  readonly subscription: MembershipSubscriptionApiDto | null;
  readonly benefits: readonly MembershipBenefitApiDto[];
  readonly availablePlans: readonly MembershipPlanSummaryApiDto[];
  readonly featureFlags: readonly string[];
}

export interface MembershipHistoryApiDto {
  readonly id: string;
  readonly planId: string;
  readonly planName: string;
  readonly action: string;
  readonly previousPlanId: string | null;
  readonly notes: string | null;
  readonly occurredOnUtc: string;
}

export interface MembershipTransactionApiDto {
  readonly id: string;
  readonly planId: string;
  readonly amount: number;
  readonly status: string;
  readonly createdOnUtc: string;
}

export interface ChangeMembershipPlanRequest {
  readonly targetPlanId: string;
}

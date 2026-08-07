import { PagedResult } from '../../../catalog/models/category.model';

export type { MembershipBenefitType } from '../../../../shared/utils/membership-benefit.util';

export type MembershipPlanStatus = 'Draft' | 'Active' | 'Archived';

export interface MembershipBenefitDto {
  readonly type: string;
  readonly value: string;
  readonly displayName: string;
  readonly sortOrder: number;
}

export interface MembershipPlanListItemDto {
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
}

export interface MembershipPlanDetailDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly price: number;
  readonly durationDays: number;
  readonly status: string;
  readonly sortOrder: number;
  readonly badgeLabel: string | null;
  readonly themeKey: string | null;
  readonly isDefault: boolean;
  readonly benefits: readonly MembershipBenefitDto[];
  readonly exclusiveProductIds: readonly string[];
  readonly unlockedThemeIds: readonly string[];
  readonly createdOnUtc: string;
}

export interface MembershipStatisticsDto {
  readonly totalPlans: number;
  readonly activePlans: number;
  readonly activeSubscriptions: number;
  readonly expiringWithin7Days: number;
  readonly monthlyRecurringRevenue: number;
}

export interface PlanComparisonDto {
  readonly plans: readonly MembershipPlanDetailDto[];
}

export interface MemberListItemDto {
  readonly userId: string;
  readonly subscriptionId: string;
  readonly planId: string;
  readonly planName: string;
  readonly status: string;
  readonly expiresOnUtc: string;
}

export interface CreateMembershipPlanRequest {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly price: number;
  readonly durationDays: number;
  readonly sortOrder: number;
  readonly badgeLabel?: string | null;
  readonly themeKey?: string | null;
  readonly isDefault: boolean;
  readonly benefits?: readonly MembershipBenefitDto[] | null;
  readonly exclusiveProductIds?: readonly string[] | null;
  readonly unlockedThemeIds?: readonly string[] | null;
}

export interface UpdateMembershipPlanRequest {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly price: number;
  readonly durationDays: number;
  readonly sortOrder: number;
  readonly badgeLabel?: string | null;
  readonly themeKey?: string | null;
  readonly benefits?: readonly MembershipBenefitDto[] | null;
  readonly exclusiveProductIds?: readonly string[] | null;
  readonly unlockedThemeIds?: readonly string[] | null;
}

export interface DuplicateMembershipPlanRequest {
  readonly newName?: string | null;
  readonly newSlug?: string | null;
}

export interface AssignMembershipRequest {
  readonly userId: string;
  readonly planId: string;
  readonly autoRenew: boolean;
}

export interface BulkAssignMembershipRequest {
  readonly userIds: readonly string[];
  readonly planId: string;
  readonly autoRenew: boolean;
}

export interface ChangeMembershipPlanRequest {
  readonly targetPlanId: string;
}

export interface MembershipPlanListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: string;
}

export type MembershipPlanListResult = PagedResult<MembershipPlanListItemDto>;
export type MemberListResult = PagedResult<MemberListItemDto>;

export const MEMBERSHIP_STATUS_OPTIONS: readonly { label: string; value: MembershipPlanStatus | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Archived', value: 'Archived' },
];


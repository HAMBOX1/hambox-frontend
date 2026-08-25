export interface AdminReferralListItemDto {
  readonly id: string;
  readonly referralCode: string;
  readonly referrerUserId: string;
  readonly referredEmail: string;
  readonly referredDisplayName: string;
  readonly status: string;
  readonly pointsEarned: number;
  readonly createdOnUtc: string;
  readonly qualifiedOnUtc: string | null;
  readonly rewardedOnUtc: string | null;
  readonly expiresOnUtc: string | null;
}

export interface AdminReferralAuditEntryDto {
  readonly id: string;
  readonly action: string;
  readonly points: number | null;
  readonly performedByUserId: string | null;
  readonly details: string | null;
  readonly occurredOnUtc: string;
}

export interface AdminReferralDetailDto {
  readonly referral: AdminReferralListItemDto;
  readonly auditTrail: readonly AdminReferralAuditEntryDto[];
}

export const REFERRAL_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Qualified', label: 'Qualified' },
  { value: 'Rewarded', label: 'Rewarded' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Reversed', label: 'Reversed' },
] as const;

import type { AdminStatusTone } from '../components/admin';

/**
 * Single source of truth for what a MembershipBenefitType actually does at runtime.
 * Every type here is enforced by real backend logic (see IMembershipAccessProvider and its
 * consumers in Checkout, Catalog, Support and Themes) — traced against the backend, not assumed.
 * Badge is deliberately absent: it is no longer a configurable benefit, since MembershipPlan.BadgeLabel
 * already carries that information at the plan level.
 */
export type MembershipBenefitType =
  | 'DiscountPercentage'
  | 'ReferralMultiplier'
  | 'PrioritySupport'
  | 'ExclusiveProducts'
  | 'EarlyAccess'
  | 'MaxPurchasesPerMonth'
  | 'ThemeUnlock'
  | 'FeatureFlag';

export type MembershipBenefitEnforcementStatus = 'enforced';

/** Which control the benefit editor should render for this type's Value field. */
export type MembershipBenefitValueKind =
  | 'percentage'
  | 'multiplier'
  | 'boolean'
  | 'number'
  | 'days'
  | 'products'
  | 'theme'
  | 'flags';

export interface MembershipBenefitTypeMeta {
  readonly value: MembershipBenefitType;
  readonly label: string;
  readonly status: MembershipBenefitEnforcementStatus;
  readonly valueKind: MembershipBenefitValueKind;
  /** Shown under the type picker so an admin knows exactly what selecting it does. */
  readonly hint: string;
}

export const MEMBERSHIP_BENEFIT_TYPE_META: readonly MembershipBenefitTypeMeta[] = [
  {
    value: 'DiscountPercentage',
    label: 'Discount percentage',
    status: 'enforced',
    valueKind: 'percentage',
    hint: 'Applied automatically at checkout by the promotion engine.',
  },
  {
    value: 'ReferralMultiplier',
    label: 'Referral multiplier',
    status: 'enforced',
    valueKind: 'multiplier',
    hint: 'Multiplies referral reward points when this member refers someone.',
  },
  {
    value: 'PrioritySupport',
    label: 'Priority support',
    status: 'enforced',
    valueKind: 'boolean',
    hint: 'New support tickets from this member are automatically routed to the highest-urgency priority queue, and their ticket-created notification is sent as High priority.',
  },
  {
    value: 'ExclusiveProducts',
    label: 'Exclusive products',
    status: 'enforced',
    valueKind: 'products',
    hint: 'Only members of this plan can add the selected products to cart or check out with them. Everyone else sees an upgrade prompt on the product page.',
  },
  {
    value: 'EarlyAccess',
    label: 'Early access',
    status: 'enforced',
    valueKind: 'days',
    hint: 'Members can purchase a scheduled product this many days before its public release date. Set the release date on the product itself.',
  },
  {
    value: 'ThemeUnlock',
    label: 'Theme unlock',
    status: 'enforced',
    valueKind: 'theme',
    hint: 'Members automatically see the selected theme instead of the store default. Updates immediately when their membership changes.',
  },
  {
    value: 'MaxPurchasesPerMonth',
    label: 'Max purchases per month',
    status: 'enforced',
    valueKind: 'number',
    hint: 'Checkout is blocked once the member reaches this many completed orders in the current calendar month. Resets automatically on the 1st.',
  },
  {
    value: 'FeatureFlag',
    label: 'Feature flag',
    status: 'enforced',
    valueKind: 'flags',
    hint: 'Unlocks the selected application capabilities for this member — evaluated centrally, the same way permissions are.',
  },
];

const META_BY_TYPE = new Map(MEMBERSHIP_BENEFIT_TYPE_META.map((meta) => [meta.value, meta]));

export function getMembershipBenefitTypeMeta(type: string): MembershipBenefitTypeMeta | null {
  return META_BY_TYPE.get(type as MembershipBenefitType) ?? null;
}

export function getMembershipBenefitStatusTone(
  status: MembershipBenefitEnforcementStatus,
): AdminStatusTone {
  switch (status) {
    case 'enforced':
      return 'success';
  }
}

/** i18n key for the status badge label. */
export function getMembershipBenefitStatusLabelKey(
  status: MembershipBenefitEnforcementStatus,
): string {
  switch (status) {
    case 'enforced':
      return 'ADMIN.MEMBERSHIPS.BENEFITS.STATUS.ENFORCED';
  }
}

/**
 * The known, gateable application capabilities a plan can unlock via the FeatureFlag benefit.
 * Deliberately short — every entry here has a real consumer (see hamboxHasFeature usages).
 * Add a new key here only once something actually checks it; an unused flag is dead configuration.
 */
export const MEMBERSHIP_FEATURE_FLAGS: readonly { key: string; label: string }[] = [
  { key: 'beta-access', label: 'Beta features badge (account dashboard)' },
];

const REFERRAL_TIERS = [
  { name: 'Starter', minimumPoints: 0 },
  { name: 'Bronze', minimumPoints: 100 },
  { name: 'Silver', minimumPoints: 500 },
  { name: 'Gold', minimumPoints: 1000 },
] as const;

export function referralTierProgress(tier: string, lifetimePoints: number): number {
  const tiers = [...REFERRAL_TIERS];
  const currentIndex = tiers.findIndex((t) => t.name === tier);
  const nextTier = tiers[currentIndex + 1];

  if (!nextTier) {
    return 100;
  }

  const currentMin = tiers[currentIndex]?.minimumPoints ?? 0;
  const range = nextTier.minimumPoints - currentMin;
  if (range <= 0) {
    return 100;
  }

  return Math.min(100, ((lifetimePoints - currentMin) / range) * 100);
}

export function referralInviteLink(referralCode: string): string {
  if (typeof window === 'undefined') {
    return `/auth/register?ref=${referralCode}`;
  }

  return `${window.location.origin}/auth/register?ref=${referralCode}`;
}

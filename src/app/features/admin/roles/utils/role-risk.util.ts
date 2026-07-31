import { AdminStatusTone } from '../../../../shared/components/admin';
import { PermissionGroupApiDto } from '../models/role-api.model';

/**
 * Single source of risk classification for roles, derived from `priorityLevel`
 * (lower = more privileged; Owner=0, Administrator=10, Customer=1000 per backend
 * domain doc comments). Every card/badge/filter/compare/matrix surface calls into
 * this module instead of re-deriving its own bands.
 */
export type RoleRiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

const RISK_BANDS: readonly { readonly max: number; readonly level: RoleRiskLevel }[] = [
  { max: 10, level: 'critical' },
  { max: 50, level: 'high' },
  { max: 200, level: 'medium' },
  { max: 500, level: 'low' },
];

export function riskLevelFor(priorityLevel: number): RoleRiskLevel {
  const band = RISK_BANDS.find((b) => priorityLevel <= b.max);
  return band?.level ?? 'minimal';
}

const RISK_TONES: Readonly<Record<RoleRiskLevel, AdminStatusTone>> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
  minimal: 'success',
};

export function riskTone(level: RoleRiskLevel): AdminStatusTone {
  return RISK_TONES[level];
}

/** Fixed lookup, not string concatenation — every template that shows a risk label calls this
 * instead of building `'ADMIN.ROLES.RISK.' + level.toUpperCase()` inline, so there is exactly one
 * place that can get a key wrong instead of five. */
const RISK_LABEL_KEYS: Readonly<Record<RoleRiskLevel, string>> = {
  critical: 'ADMIN.ROLES.RISK.CRITICAL',
  high: 'ADMIN.ROLES.RISK.HIGH',
  medium: 'ADMIN.ROLES.RISK.MEDIUM',
  low: 'ADMIN.ROLES.RISK.LOW',
  minimal: 'ADMIN.ROLES.RISK.MINIMAL',
};

export function riskLabelKey(level: RoleRiskLevel): string {
  return RISK_LABEL_KEYS[level];
}

export function isHighPrivilege(priorityLevel: number): boolean {
  const level = riskLevelFor(priorityLevel);
  return level === 'critical' || level === 'high';
}

export interface PermissionModuleSummaryEntry {
  readonly module: string;
  readonly count: number;
}

/** Buckets a role's granted permission ids by their group's `module`, using the already-loaded global matrix. */
export function permissionModuleSummary(
  permissionIds: readonly string[],
  groups: readonly PermissionGroupApiDto[],
): readonly PermissionModuleSummaryEntry[] {
  const granted = new Set(permissionIds);
  const counts = new Map<string, number>();

  for (const group of groups) {
    const grantedInGroup = group.permissions.filter((p) => granted.has(p.id)).length;
    if (grantedInGroup === 0) {
      continue;
    }
    counts.set(group.module, (counts.get(group.module) ?? 0) + grantedInGroup);
  }

  return [...counts.entries()]
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);
}

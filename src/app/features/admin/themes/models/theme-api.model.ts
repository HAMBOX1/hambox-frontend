import { PagedResult } from '../../../catalog/models/category.model';

export type ThemeStatus = 'Draft' | 'Published' | 'Archived';

export type ThemeBaseMode = 'Dark' | 'Light';

/**
 * 'Campaign' | 'Region' | 'Tenant' are reserved/obsolete — never resolved by the backend
 * ThemeEngine and rejected for new assignments. Kept in the type only so a pre-existing
 * assignment row (if any) can still render without a type error; never offered for new
 * assignments (see THEME_ASSIGNMENT_TYPE_OPTIONS). The real campaign mechanism is
 * features/admin/campaigns.
 */
export type ThemeAssignmentType = 'Store' | 'Membership' | 'Campaign' | 'Region' | 'Tenant';

export interface ThemeListItemDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly baseMode: string;
  readonly isDefault: boolean;
  readonly versionCount: number;
  readonly publishedOnUtc: string | null;
  readonly createdOnUtc: string;
  readonly previewPrimary: string | null;
  readonly previewBackground: string | null;
  readonly previewCard: string | null;
  readonly assignmentSummary: string | null;
}

export interface ThemeTemplateDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly baseMode: string;
  readonly tokens: Readonly<Record<string, string>>;
}

export interface ThemeVersionDto {
  readonly id: string;
  readonly versionNumber: number;
  readonly isPublished: boolean;
  /** Permanent — stays true after a later publish supersedes this version. Rollback eligibility. */
  readonly hasEverBeenPublished: boolean;
  readonly publishedOnUtc: string | null;
  readonly notes: string | null;
  readonly tokens: Readonly<Record<string, string>>;
  readonly validationWarnings: readonly string[];
}

export interface ThemeAssetDto {
  readonly assetType: string;
  readonly url: string;
  readonly altText: string | null;
}

export interface ThemeScheduleDto {
  readonly id: string;
  readonly startsAtUtc: string;
  readonly endsAtUtc: string | null;
  readonly recurrenceRule: string | null;
  readonly priority: number;
  readonly isActive: boolean;
  /** True when this window overlaps another active schedule (any theme) — resolution outcome is ambiguous. */
  readonly hasOverlap: boolean;
}

export interface ThemeAssignmentDto {
  readonly id: string;
  readonly assignmentType: string;
  readonly targetKey: string;
  readonly priority: number;
  readonly isActive: boolean;
}

export interface ThemeDetailDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly status: string;
  readonly baseMode: string;
  readonly isDefault: boolean;
  readonly publishedVersionId: string | null;
  readonly versionCounter: number;
  readonly versions: readonly ThemeVersionDto[];
  readonly assets: readonly ThemeAssetDto[];
  readonly schedules: readonly ThemeScheduleDto[];
  readonly assignments: readonly ThemeAssignmentDto[];
}

export interface ThemeStatisticsDto {
  readonly totalThemes: number;
  readonly publishedThemes: number;
  readonly draftThemes: number;
  readonly archivedThemes: number;
  readonly activeSchedules: number;
  readonly activeAssignments: number;
}

export interface ThemeHistoryEntryDto {
  readonly id: string;
  readonly action: string;
  readonly actorUserId: string | null;
  readonly createdOnUtc: string;
  readonly detailsJson: string | null;
}

export interface ThemeTokenDiffDto {
  readonly token: string;
  readonly leftValue: string | null;
  readonly rightValue: string | null;
}

export interface ThemeCompareDto {
  readonly leftThemeId: string;
  readonly rightThemeId: string;
  readonly tokenDiffs: readonly ThemeTokenDiffDto[];
}

export interface ThemePreviewSessionDto {
  readonly token: string;
  readonly expiresAtUtc: string;
  readonly themeId: string;
  readonly versionId: string;
}

export interface ExportThemeDto {
  readonly name: string;
  readonly slug: string;
  readonly baseMode: string;
  readonly tokens: Readonly<Record<string, string>>;
  readonly assets: readonly ThemeAssetDto[];
  readonly versionNumber: number;
}

export interface CreateThemeRequest {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly baseMode: string;
  readonly tokens?: Readonly<Record<string, string>> | null;
}

export interface UpdateThemeRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly tokens: Readonly<Record<string, string>>;
  readonly notes?: string | null;
}

export interface DuplicateThemeRequest {
  readonly newName: string;
  readonly newSlug: string;
}

export interface ScheduleThemeRequest {
  readonly startsAtUtc: string;
  readonly endsAtUtc?: string | null;
  readonly recurrenceRule?: string | null;
  readonly priority?: number;
}

export interface AssignThemeRequest {
  readonly assignmentType: string;
  readonly targetKey: string;
  readonly priority?: number;
}

export interface ThemeAssetRequest {
  readonly assetType: string;
  readonly url: string;
  readonly altText?: string | null;
}

export interface ImportThemeRequest {
  readonly name: string;
  readonly slug: string;
  readonly baseMode: string;
  readonly tokens: Readonly<Record<string, string>>;
  readonly assets?: readonly ThemeAssetRequest[] | null;
}

export interface ThemeListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: string;
}

export type ThemeListResult = PagedResult<ThemeListItemDto>;

export const THEME_STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Published', value: 'Published' },
  { label: 'Archived', value: 'Archived' },
] as const;

export const THEME_BASE_MODE_OPTIONS = [
  { label: 'Dark', value: 'Dark' },
  { label: 'Light', value: 'Light' },
] as const;

// Campaign/Region/Tenant are intentionally excluded — see the ThemeAssignmentType remarks above.
export const THEME_ASSIGNMENT_TYPE_OPTIONS = [
  { label: 'Store', value: 'Store' },
  { label: 'Membership', value: 'Membership' },
] as const;

export function latestThemeVersion(detail: ThemeDetailDto | null): ThemeVersionDto | null {
  if (!detail?.versions?.length) {
    return null;
  }

  return [...detail.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null;
}

export function tokensFromDetail(detail: ThemeDetailDto | null): Record<string, string> {
  const version = latestThemeVersion(detail);
  return version ? { ...version.tokens } : {};
}

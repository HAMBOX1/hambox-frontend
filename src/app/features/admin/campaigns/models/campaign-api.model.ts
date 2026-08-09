import { PagedResult } from '../../../catalog/models/category.model';
import { AdminStatusTone } from '../../../../shared/components/admin';

export type CampaignStatus = 'Draft' | 'Published' | 'Archived';

/** Computed, display-only — never edited directly. See ThemeCampaign.GetPhase on the backend. */
export type CampaignPhase = 'Draft' | 'Scheduled' | 'Active' | 'Ended' | 'Paused' | 'Archived';

export interface CampaignListItemDto {
  readonly id: string;
  readonly name: string;
  readonly themeId: string;
  readonly themeName: string;
  readonly themeStatus: string;
  readonly startsAtUtc: string;
  readonly endsAtUtc: string;
  readonly priority: number;
  readonly status: CampaignStatus;
  readonly isEnabled: boolean;
  readonly phase: CampaignPhase;
  readonly hasOverlap: boolean;
  /** True only for the single campaign ThemeEngine actually picks right now — computed
   *  server-side via the same tiebreak the resolver uses. Phase alone can say "Active" for more
   *  than one overlapping campaign; this is the authoritative answer to "which one is really live". */
  readonly isResolvedWinner: boolean;
  /** Set only when phase is 'Active' but isResolvedWinner is false — names the campaign that is
   *  actually driving the storefront theme instead. */
  readonly overriddenByCampaignName: string | null;
  readonly createdOnUtc: string;
}

export interface CampaignDetailDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly themeId: string;
  readonly themeName: string;
  readonly themeStatus: string;
  readonly themeIsPublishable: boolean;
  readonly startsAtUtc: string;
  readonly endsAtUtc: string;
  readonly priority: number;
  readonly status: CampaignStatus;
  readonly isEnabled: boolean;
  readonly phase: CampaignPhase;
  readonly hasOverlap: boolean;
  readonly isResolvedWinner: boolean;
  readonly overriddenByCampaignName: string | null;
  readonly createdOnUtc: string;
  readonly modifiedOnUtc: string | null;
}

export interface CreateCampaignRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly themeId: string;
  readonly startsAtUtc: string;
  readonly endsAtUtc: string;
  readonly priority?: number;
}

export interface UpdateCampaignRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly themeId: string;
  readonly startsAtUtc: string;
  readonly endsAtUtc: string;
  readonly priority: number;
}

export interface CampaignHistoryEntryDto {
  readonly id: string;
  readonly action: string;
  readonly actorUserId: string | null;
  readonly createdOnUtc: string;
  readonly detailsJson: string | null;
}

export interface CampaignListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly status?: string;
}

export type CampaignListResult = PagedResult<CampaignListItemDto>;

export const CAMPAIGN_STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Published', value: 'Published' },
  { label: 'Archived', value: 'Archived' },
] as const;

export const CAMPAIGN_PHASE_TONE: Record<CampaignPhase, AdminStatusTone> = {
  Draft: 'neutral',
  Scheduled: 'info',
  Active: 'success',
  Ended: 'neutral',
  Paused: 'warning',
  Archived: 'neutral',
};

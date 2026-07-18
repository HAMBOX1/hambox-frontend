export interface LegalSectionListItemDto {
  id: string;
  slug: string;
  titleEn: string;
  category: string | null;
  icon: string | null;
  sortOrder: number;
  showInFooter: boolean;
  showInNavigation: boolean;
  requireAcceptance: boolean;
  isArchived: boolean;
  hasPublishedVersion: boolean;
  publishedVersionNumber: number | null;
  publishedOnUtc: string | null;
  hasDraft: boolean;
  versionCount: number;
}

export interface LegalSectionVersionDto {
  id: string;
  versionNumber: number;
  titleEn: string;
  titleAr: string | null;
  contentEn: string;
  contentAr: string | null;
  versionNotes: string | null;
  isPublished: boolean;
  publishedOnUtc: string | null;
  publishedBy: string | null;
}

export interface LegalSectionDetailDto {
  id: string;
  slug: string;
  category: string | null;
  icon: string | null;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionAr: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  showInFooter: boolean;
  showInNavigation: boolean;
  requireAcceptance: boolean;
  isArchived: boolean;
  publishedVersionId: string | null;
  publishedVersion: LegalSectionVersionDto | null;
  draftVersion: LegalSectionVersionDto | null;
  versions: readonly LegalSectionVersionDto[];
  createdOnUtc: string;
  modifiedOnUtc: string | null;
  createdBy: string | null;
  modifiedBy: string | null;
}

export interface CreateLegalSectionRequest {
  slug: string;
  titleEn: string;
  titleAr: string | null;
  category: string | null;
  icon: string | null;
  showInFooter: boolean;
  showInNavigation: boolean;
  requireAcceptance: boolean;
}

export interface UpdateLegalSectionRequest {
  slug: string;
  titleEn: string;
  titleAr: string | null;
  contentEn: string;
  contentAr: string | null;
  category: string | null;
  icon: string | null;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionAr: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  showInFooter: boolean;
  showInNavigation: boolean;
  requireAcceptance: boolean;
  versionNotes: string | null;
}

export interface DuplicateLegalSectionRequest {
  newSlug: string;
  newTitleEn: string | null;
}

export interface LegalSectionHistoryEntryDto {
  id: string;
  action: string;
  actorUserId: string | null;
  createdOnUtc: string;
  detailsJson: string | null;
}

export type LegalSectionStatusFilter = 'Published' | 'Draft' | 'Archived';

export interface LegalSectionQueryFilter {
  search?: string;
  category?: string;
  status?: LegalSectionStatusFilter;
  showInFooter?: boolean;
  showInNavigation?: boolean;
  requireAcceptance?: boolean;
}

/** Suggested values only — Category is free text, admins can enter anything. */
export const LEGAL_SECTION_CATEGORY_SUGGESTIONS = ['Policies', 'Legal', 'Support', 'Membership', 'Commerce', 'General'] as const;

/** Backend requires slugs matching ^[a-z0-9]+(-[a-z0-9]+)*$ — normalize as the admin types instead of rejecting on save. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

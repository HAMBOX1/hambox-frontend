export interface PublicLegalSectionSummaryDto {
  slug: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  category: string | null;
  icon: string | null;
  sortOrder: number;
  showInFooter: boolean;
  showInNavigation: boolean;
  requireAcceptance: boolean;
  versionNumber: number;
  publishedOnUtc: string | null;
}

export interface PublicLegalSectionDto {
  slug: string;
  titleEn: string;
  titleAr: string | null;
  contentEn: string;
  contentAr: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  versionNumber: number;
  publishedOnUtc: string | null;
}

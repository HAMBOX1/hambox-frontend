/** Mirrors the backend `LandingPageScope` enum (Content module) — what a page-builder template is a page for. */
export type LandingPageScope = 'Homepage' | 'Product' | 'Category';

export interface LandingPageSectionEntry {
  readonly instanceId: string;
  readonly category: string;
  readonly variantKey: string;
  readonly sortOrder: number;
  readonly isVisible: boolean;
  readonly configJson: string;
}

export interface PublishedLandingPageResponse {
  readonly templateId: string;
  readonly templateName: string;
  readonly sections: readonly LandingPageSectionEntry[];
  readonly publishedOnUtc: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly seoOgImageUrl: string | null;
}

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
}

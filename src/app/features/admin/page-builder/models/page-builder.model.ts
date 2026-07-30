import { LandingPageSectionEntry } from '../../../home/models/landing-page-section.model';

export interface LandingPageTemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly hasUnpublishedChanges: boolean;
  readonly modifiedOnUtc: string;
}

export interface LandingPageTemplateDetail {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly hasUnpublishedChanges: boolean;
  readonly sections: readonly LandingPageSectionEntry[];
}

export type { LandingPageSectionEntry };

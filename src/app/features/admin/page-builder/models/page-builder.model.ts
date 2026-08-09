import {
  LandingPageScope,
  LandingPageSectionEntry,
} from '../../../home/models/landing-page-section.model';

export interface LandingPageTemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly hasUnpublishedChanges: boolean;
  readonly modifiedOnUtc: string;
  readonly scope: LandingPageScope;
  readonly targetId: string | null;
}

export interface LandingPageTemplateDetail {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly hasUnpublishedChanges: boolean;
  readonly sections: readonly LandingPageSectionEntry[];
  readonly scope: LandingPageScope;
  readonly targetId: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly seoOgImageUrl: string | null;
}

export type { LandingPageScope, LandingPageSectionEntry };

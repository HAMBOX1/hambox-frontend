import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CommunityNewsletterSectionComponent } from '../../components/community-newsletter-section/community-newsletter-section.component';
import { CommunityNewsletterSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-community-newsletter-variant-default',
  standalone: true,
  imports: [CommunityNewsletterSectionComponent],
  template: `<app-community-newsletter-section [config]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityNewsletterVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<CommunityNewsletterSectionConfig>();
}

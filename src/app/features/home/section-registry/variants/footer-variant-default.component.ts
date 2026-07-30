import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StorefrontFooterComponent } from '../../../../shared/components/storefront-footer/storefront-footer.component';
import { FooterSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-footer-variant-default',
  standalone: true,
  imports: [StorefrontFooterComponent],
  template: `<app-storefront-footer [footer]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<FooterSectionConfig>();
}

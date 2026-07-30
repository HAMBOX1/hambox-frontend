import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TrustBarComponent } from '../../components/trust-bar/trust-bar.component';
import { TrustFeature } from '../../models/storefront-home';
import { resolveStorefrontImageUrl } from '../../utils/storefront-home.mapper';
import { TrustBarSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-trust-bar-variant-default',
  standalone: true,
  imports: [TrustBarComponent],
  template: `
    @if (features().length) {
      <app-trust-bar [features]="features()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustBarVariantDefaultComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<TrustBarSectionConfig>();

  protected readonly features = computed<readonly TrustFeature[]>(() =>
    this.config().items.map((item) => ({
      id: item.id,
      iconSrc: resolveStorefrontImageUrl(item.iconUrl, 'assets/images/trust/instant-delivery.svg'),
      title: item.title,
      description: item.description,
    })),
  );
}

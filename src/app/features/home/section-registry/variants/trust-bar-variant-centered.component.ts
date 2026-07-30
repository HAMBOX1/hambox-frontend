import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CenteredTrustBarComponent } from '../../components/centered-trust-bar/centered-trust-bar.component';
import { TrustFeature } from '../../models/storefront-home';
import { resolveStorefrontImageUrl } from '../../utils/storefront-home.mapper';
import { TrustBarSectionConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-trust-bar-variant-centered',
  standalone: true,
  imports: [CenteredTrustBarComponent],
  template: `
    @if (features().length) {
      <app-centered-trust-bar [features]="features()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustBarVariantCenteredComponent {
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

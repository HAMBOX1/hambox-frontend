import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SeasonalCampaignBannerComponent } from '../../components/seasonal-campaign-banner/seasonal-campaign-banner.component';
import { SeasonalCampaignBannerConfig } from '../models/section-config.model';
import { SectionRenderContext } from '../models/section-variant.model';

@Component({
  selector: 'app-promo-banner-variant-seasonal-campaign',
  standalone: true,
  imports: [SeasonalCampaignBannerComponent],
  template: `<app-seasonal-campaign-banner [banner]="config()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBannerVariantSeasonalCampaignComponent {
  readonly context = input.required<SectionRenderContext>();
  readonly config = input.required<SeasonalCampaignBannerConfig>();
}

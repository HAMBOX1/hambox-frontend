import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FlashDealCardComponent } from '../../../../shared/components/flash-deal-card/flash-deal-card.component';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { FlashDeal } from '../../models/storefront-home';

@Component({
  selector: 'app-latest-arrivals-section',
  standalone: true,
  imports: [FlashDealCardComponent, ScrollRevealDirective],
  templateUrl: './latest-arrivals-section.component.html',
  styleUrl: './latest-arrivals-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestArrivalsSectionComponent {
  readonly deals = input.required<readonly FlashDeal[]>();
  readonly sectionTitle = input('Latest');
  readonly sectionTitleAccent = input('Arrivals');
  readonly sectionSubtitle = input('');

  protected readonly featured = computed(() => this.deals()[0] ?? null);
  protected readonly gridItems = computed(() => this.deals().slice(1, 5));
}

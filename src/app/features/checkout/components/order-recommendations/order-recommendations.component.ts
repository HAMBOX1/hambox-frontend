import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { OrderRecommendation } from '../../models/order-success';

import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';

@Component({
  selector: 'app-order-recommendations',
  standalone: true,
  imports: [RouterLink, HamboxCurrencyPipe, TranslatePipe],
  templateUrl: './order-recommendations.component.html',
  styleUrl: './order-recommendations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderRecommendationsComponent {
  recommendations = input.required<readonly OrderRecommendation[]>();

  protected readonly pageIndex = signal(0);

  protected visibleItems(): readonly OrderRecommendation[] {
    const items = this.recommendations();
    const start = this.pageIndex() * 4;
    return items.slice(start, start + 4);
  }

  protected canGoPrev(): boolean {
    return this.pageIndex() > 0;
  }

  protected canGoNext(): boolean {
    return (this.pageIndex() + 1) * 4 < this.recommendations().length;
  }

  protected prev(): void {
    if (this.canGoPrev()) {
      this.pageIndex.update((index) => index - 1);
    }
  }

  protected next(): void {
    if (this.canGoNext()) {
      this.pageIndex.update((index) => index + 1);
    }
  }
}

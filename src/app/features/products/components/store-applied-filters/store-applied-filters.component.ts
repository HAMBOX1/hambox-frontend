import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { StorefrontAppliedFilterChip } from '../../services/products.facade';

@Component({
  selector: 'app-store-applied-filters',
  standalone: true,
  templateUrl: './store-applied-filters.component.html',
  styleUrl: './store-applied-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreAppliedFiltersComponent {
  readonly chips = input<readonly StorefrontAppliedFilterChip[]>([]);

  readonly removeChip = output<string>();
  readonly clearAll = output<void>();

  protected onRemove(chipId: string): void {
    this.removeChip.emit(chipId);
  }

  protected onClearAll(): void {
    this.clearAll.emit();
  }
}

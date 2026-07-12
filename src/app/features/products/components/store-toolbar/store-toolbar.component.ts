import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { StoreSortOption } from '../../models/product';
import { StoreViewModeSwitcherComponent } from '../store-view-mode-switcher/store-view-mode-switcher.component';
import { HamboxBottomSheetComponent } from '../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';

@Component({
  selector: 'app-store-toolbar',
  standalone: true,
  imports: [StoreViewModeSwitcherComponent, HamboxBottomSheetComponent, TranslatePipe],
  templateUrl: './store-toolbar.component.html',
  styleUrl: './store-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreToolbarComponent {
  sortOptions = input.required<readonly StoreSortOption[]>();
  selectedSort = input<StoreSortOption['value']>('popular');
  activeFilterCount = input(0);
  resultCount = input<number | null>(null);

  sortChange = output<StoreSortOption['value']>();
  openFilters = output<void>();

  protected readonly sortSheetOpen = signal(false);

  protected onSortSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as StoreSortOption['value'];
    this.sortChange.emit(value);
  }

  protected onOpenFilters(): void {
    this.openFilters.emit();
  }

  protected openSortSheet(): void {
    this.sortSheetOpen.set(true);
  }

  protected closeSortSheet(): void {
    this.sortSheetOpen.set(false);
  }

  protected selectSort(value: StoreSortOption['value']): void {
    this.sortChange.emit(value);
    this.closeSortSheet();
  }

  protected currentSortLabel(): string {
    return this.sortOptions().find((option) => option.value === this.selectedSort())?.label ?? 'Popular';
  }
}

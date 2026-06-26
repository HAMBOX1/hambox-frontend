import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StoreCategoryPill, StoreSortOption } from '../../models/product';

@Component({
  selector: 'app-store-toolbar',
  standalone: true,
  templateUrl: './store-toolbar.component.html',
  styleUrl: './store-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreToolbarComponent {
  categories = input.required<readonly StoreCategoryPill[]>();
  sortOptions = input.required<readonly StoreSortOption[]>();
  activeCategoryId = input('all');
  selectedSort = input<StoreSortOption['value']>('popular');

  categoryChange = output<string>();
  sortChange = output<StoreSortOption['value']>();

  protected onCategorySelect(categoryId: string): void {
    if (categoryId === this.activeCategoryId()) {
      return;
    }

    this.categoryChange.emit(categoryId);
  }

  protected onSortSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as StoreSortOption['value'];
    this.sortChange.emit(value);
  }
}

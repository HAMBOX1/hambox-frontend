import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import {
  AdminSearchBarComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { ProductStatus } from '../../models/product.model';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

@Component({
  selector: 'app-product-catalog-toolbar',
  standalone: true,
  imports: [FormsModule, SelectModule, ButtonModule, AdminToolbarComponent, AdminSearchBarComponent],
  templateUrl: './product-catalog-toolbar.component.html',
  styleUrl: './product-catalog-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogToolbarComponent {
  readonly searchTerm = input('');
  readonly statusFilter = input('');
  readonly searchPlaceholder = input('Search products…');
  readonly hasActiveFilters = input(false);
  readonly searchChange = output<string>();
  readonly statusChange = output<ProductStatus | ''>();
  readonly clearFilters = output<void>();

  protected readonly statusOptions = STATUS_OPTIONS;

  protected onSearchChange(term: string): void {
    this.searchChange.emit(term);
  }

  protected onStatusChange(value: string): void {
    this.statusChange.emit(value as ProductStatus | '');
  }
}

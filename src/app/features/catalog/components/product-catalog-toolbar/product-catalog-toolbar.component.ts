import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

import {
  AdminIconButtonComponent,
  AdminSearchBarComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { CollectionOption } from '../../models/collection.model';
import { ProductStatus } from '../../models/product.model';
import { AdminProductsViewMode } from '../../services/admin-products-view-mode.service';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'Active' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

const SUPPLIER_MAPPING_OPTIONS: { label: string; value: string }[] = [
  { label: 'All suppliers', value: '' },
  { label: 'Fully mapped', value: 'FullyMapped' },
  { label: 'Partially mapped', value: 'PartiallyMapped' },
  { label: 'Unmapped', value: 'Unmapped' },
  { label: 'Supplier unavailable', value: 'SupplierUnavailable' },
  { label: 'Mapping error', value: 'MappingError' },
];

@Component({
  selector: 'app-product-catalog-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    SelectModule,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminIconButtonComponent,
  ],
  templateUrl: './product-catalog-toolbar.component.html',
  styleUrl: './product-catalog-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogToolbarComponent {
  readonly searchTerm = input('');
  readonly statusFilter = input('');
  readonly collectionFilter = input<string | null>(null);
  readonly collectionOptions = input<readonly CollectionOption[]>([]);
  readonly supplierMappingFilter = input('');
  readonly searchPlaceholder = input('Search products…');
  readonly hasActiveFilters = input(false);
  readonly viewMode = input<AdminProductsViewMode>('table');
  readonly searchChange = output<string>();
  readonly statusChange = output<ProductStatus | ''>();
  readonly collectionChange = output<string | null>();
  readonly supplierMappingChange = output<string>();
  readonly clearFilters = output<void>();
  readonly viewModeChange = output<AdminProductsViewMode>();

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly supplierMappingOptions = SUPPLIER_MAPPING_OPTIONS;

  protected onSearchChange(term: string): void {
    this.searchChange.emit(term);
  }

  protected onStatusChange(value: string): void {
    this.statusChange.emit(value as ProductStatus | '');
  }

  protected onCollectionChange(value: string | null): void {
    this.collectionChange.emit(value);
  }

  protected onSupplierMappingChange(value: string): void {
    this.supplierMappingChange.emit(value);
  }

  protected toggleViewMode(): void {
    this.viewModeChange.emit(this.viewMode() === 'table' ? 'cards' : 'table');
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import {
  AdminIconButtonComponent,
  AdminSearchBarComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { CollectionOption } from '../../models/collection.model';
import { ProductStatus } from '../../models/product.model';
import { AdminProductsViewMode } from '../../services/admin-products-view-mode.service';

const FILTER_KEY = 'ADMIN.CATALOG_PAGE.FILTERS.';

const STATUS_OPTIONS: { key: string; value: string }[] = [
  { key: `${FILTER_KEY}ALL_STATUSES`, value: '' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Active', value: 'Active' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Draft', value: 'Draft' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Inactive', value: 'Inactive' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Archived', value: 'Archived' },
];

const SUPPLIER_MAPPING_OPTIONS: { key: string; value: string }[] = [
  { key: `${FILTER_KEY}ALL_SUPPLIERS`, value: '' },
  { key: `${FILTER_KEY}FULLY_MAPPED`, value: 'FullyMapped' },
  { key: `${FILTER_KEY}PARTIALLY_MAPPED`, value: 'PartiallyMapped' },
  { key: `${FILTER_KEY}UNMAPPED`, value: 'Unmapped' },
  { key: `${FILTER_KEY}SUPPLIER_UNAVAILABLE`, value: 'SupplierUnavailable' },
  { key: `${FILTER_KEY}MAPPING_ERROR`, value: 'MappingError' },
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
    TranslatePipe,
  ],
  templateUrl: './product-catalog-toolbar.component.html',
  styleUrl: './product-catalog-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogToolbarComponent {
  readonly searchTerm = input('');
  readonly statusFilter = input('');
  readonly collectionFilter = input<string | null>(null);
  readonly categoryFilter = input<string | null>(null);
  readonly categoryOptions = input<readonly { id: string; label: string }[]>([]);
  readonly collectionOptions = input<readonly CollectionOption[]>([]);
  readonly supplierMappingFilter = input('');
  /** Overrides the default (translated) placeholder when a caller needs different wording. */
  readonly searchPlaceholder = input('');
  readonly hasActiveFilters = input(false);
  readonly viewMode = input<AdminProductsViewMode>('table');
  readonly searchChange = output<string>();
  readonly statusChange = output<ProductStatus | ''>();
  readonly collectionChange = output<string | null>();
  readonly categoryChange = output<string | null>();
  readonly supplierMappingChange = output<string>();
  readonly clearFilters = output<void>();
  readonly viewModeChange = output<AdminProductsViewMode>();

  private readonly translate = inject(TranslateService);
  // Re-evaluates the translated option labels whenever the language changes.
  private readonly language = toSignal(this.translate.onLangChange.pipe(startWith(null)));

  protected readonly statusOptions = computed(() => this.translateOptions(STATUS_OPTIONS));
  protected readonly supplierMappingOptions = computed(() => this.translateOptions(SUPPLIER_MAPPING_OPTIONS));

  private translateOptions(options: { key: string; value: string }[]): { label: string; value: string }[] {
    this.language();
    return options.map((option) => ({ label: this.translate.instant(option.key), value: option.value }));
  }

  protected onSearchChange(term: string): void {
    this.searchChange.emit(term);
  }

  protected onStatusChange(value: string): void {
    this.statusChange.emit(value as ProductStatus | '');
  }

  protected onCategoryChange(value: string | null): void {
    this.categoryChange.emit(value);
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

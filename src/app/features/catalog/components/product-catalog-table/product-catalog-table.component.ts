import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CategoryOption } from '../../models/category.model';
import { Product, ProductStatus } from '../../models/product.model';
import { productStatusLabel } from '../../utils/product-display.utils';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

type EditableField = 'name' | 'category' | 'price';

const STATUS_EDIT_OPTIONS: readonly ProductStatus[] = ['Draft', 'Active', 'Inactive', 'Archived'];

export interface ProductFieldEdit {
  readonly product: Product;
  readonly nameEn?: string;
  readonly categoryId?: string;
  readonly price?: number;
}

export interface ProductStatusEdit {
  readonly product: Product;
  readonly status: ProductStatus;
}

@Component({
  selector: 'app-product-catalog-table',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    TranslatePipe,
    HasPermissionDirective,
    HamboxCurrencyPipe,
    AdminDataTableShellComponent,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
  ],
  templateUrl: './product-catalog-table.component.html',
  styleUrl: './product-catalog-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogTableComponent {
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;

  readonly products = input.required<readonly Product[]>();
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly pageSize = input(20);
  readonly first = input(0);
  readonly selectedProductId = input<string | null>(null);
  readonly searchActive = input(false);
  readonly categoryOptions = input<readonly CategoryOption[]>([]);
  readonly sortField = input<string | undefined>(undefined);
  readonly sortOrder = input(0);
  readonly bulkSelectedIds = input<ReadonlySet<string>>(new Set());
  readonly allPageSelected = input(false);

  readonly createProduct = output<void>();

  readonly pageChange = output<TableLazyLoadEvent>();
  readonly productSelect = output<string>();
  readonly bulkToggle = output<{ productId: string; shiftKey: boolean }>();
  readonly bulkToggleAllPage = output<boolean>();
  readonly manageStock = output<Product>();
  readonly duplicateProduct = output<Product>();
  readonly archiveProduct = output<Product>();
  readonly deleteProduct = output<Product>();
  readonly fieldEdit = output<ProductFieldEdit>();
  readonly statusEdit = output<ProductStatusEdit>();

  protected readonly tableSelection = computed(() => {
    const selectedId = this.selectedProductId();
    if (!selectedId) {
      return null;
    }

    return this.products().find((product) => product.id === selectedId) ?? null;
  });

  protected readonly statusLabel = productStatusLabel;
  protected readonly resolveImageUrl = resolveProductImageUrl;
  protected readonly failedImageIds = signal<ReadonlySet<string>>(new Set());
  protected readonly statusOptions = STATUS_EDIT_OPTIONS;

  protected readonly editingCell = signal<{ productId: string; field: EditableField } | null>(null);
  protected readonly editDraftText = signal('');
  protected readonly editDraftNumber = signal<number | null>(null);

  protected statusTone(status: ProductStatus): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'warning';
      case 'Inactive':
        return 'danger';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit(event);
  }

  protected onSelectionChange(product: Product | Product[] | null | undefined): void {
    if (!product || Array.isArray(product)) {
      return;
    }

    this.productSelect.emit(product.id);
  }

  protected isBulkSelected(productId: string): boolean {
    return this.bulkSelectedIds().has(productId);
  }

  protected onBulkCheckboxClick(product: Product, event: Event | undefined): void {
    const shiftKey = event instanceof MouseEvent && event.shiftKey;
    this.bulkToggle.emit({ productId: product.id, shiftKey });
  }

  protected onBulkToggleAllPage(): void {
    this.bulkToggleAllPage.emit(!this.allPageSelected());
  }

  protected isImageFailed(productId: string): boolean {
    return this.failedImageIds().has(productId);
  }

  protected onImageError(productId: string): void {
    this.failedImageIds.update((ids) => new Set(ids).add(productId));
  }

  protected categoryLabel(categoryId: string, fallback: string): string {
    return this.categoryOptions().find((option) => option.id === categoryId)?.label ?? fallback;
  }

  protected onStockClick(product: Product, event: Event): void {
    event.stopPropagation();
    this.manageStock.emit(product);
  }

  protected isEditing(productId: string, field: EditableField): boolean {
    const cell = this.editingCell();
    return !!cell && cell.productId === productId && cell.field === field;
  }

  protected startEdit(product: Product, field: EditableField, event: Event): void {
    event.stopPropagation();

    if (field === 'name') {
      this.editDraftText.set(product.nameEn);
    } else if (field === 'category') {
      this.editDraftText.set(product.categoryId);
    } else {
      this.editDraftNumber.set(product.price);
    }

    this.editingCell.set({ productId: product.id, field });
  }

  protected cancelEdit(): void {
    this.editingCell.set(null);
  }

  protected saveEdit(product: Product): void {
    const cell = this.editingCell();
    if (!cell || cell.productId !== product.id) {
      return;
    }

    this.editingCell.set(null);

    if (cell.field === 'name') {
      const value = this.editDraftText().trim();
      if (value && value !== product.nameEn) {
        this.fieldEdit.emit({ product, nameEn: value });
      }
      return;
    }

    if (cell.field === 'category') {
      const value = this.editDraftText();
      if (value && value !== product.categoryId) {
        this.fieldEdit.emit({ product, categoryId: value });
      }
      return;
    }

    const value = this.editDraftNumber();
    if (value !== null && value !== product.price) {
      this.fieldEdit.emit({ product, price: value });
    }
  }

  protected onStatusEditChange(product: Product, status: ProductStatus): void {
    if (status !== product.status) {
      this.statusEdit.emit({ product, status });
    }
  }

  protected productActionMenuItems(product: Product): MenuItem[] {
    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [];

    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Create)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        command: () => this.duplicateProduct.emit(product),
      });
    }

    if (
      this.permissionService.hasPermission(this.permissions.Catalog.Products.Edit) &&
      product.status !== 'Archived'
    ) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        command: () => this.archiveProduct.emit(product),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Delete)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        command: () => this.deleteProduct.emit(product),
      });
    }

    return items;
  }

  protected onActionsCellClick(event: Event): void {
    event.stopPropagation();
  }
}

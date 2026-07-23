import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiError } from '../../../../core/models/api-error.model';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { CategoryCreateFormComponent } from '../category-create-form/category-create-form.component';
import { CategoryOption, CreateCategoryRequest } from '../../models/category.model';
import { Product, ProductStatus } from '../../models/product.model';
import { CategoryApiService, createCategoryWithHierarchy } from '../../services/category-api.service';
import { productStatusLabel } from '../../utils/product-display.utils';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

type EditableField = 'name' | 'price';

const STATUS_EDIT_OPTIONS: readonly ProductStatus[] = ['Draft', 'Active', 'Inactive', 'Archived'];

export interface ProductFieldEdit {
  readonly product: Product;
  readonly nameEn?: string;
  readonly categoryId?: string;
  readonly additionalCategoryIds?: readonly string[];
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
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    PopoverModule,
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
    AdminSearchBarComponent,
    CategoryCreateFormComponent,
  ],
  templateUrl: './product-catalog-table.component.html',
  styleUrl: './product-catalog-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogTableComponent {
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);
  private readonly categoryApi = inject(CategoryApiService);

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
  /** True while a prior inline edit (name/price/category) is still saving — blocks starting another
   * on the same row before its save+refetch resolves, which would otherwise race the row version. */
  readonly actionLoading = input(false);

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
  /** Emitted after a category is created inline from the popover, so the parent facade can refresh its category list. */
  readonly categoryCreated = output<void>();

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

  /** Every category id a product carries — primary first, then additional. */
  protected productCategoryIds(product: Product): readonly string[] {
    return product.categoryId
      ? [product.categoryId, ...(product.additionalCategoryIds ?? [])]
      : (product.additionalCategoryIds ?? []);
  }

  protected productCategoryLabels(product: Product): string[] {
    return this.productCategoryIds(product).map((id) =>
      this.categoryLabel(id, id === product.categoryId ? product.categoryName : id),
    );
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

    if (this.actionLoading()) {
      return;
    }

    if (field === 'name') {
      this.editDraftText.set(product.nameEn);
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

    const value = this.editDraftNumber();
    if (value !== null && value !== product.price) {
      this.fieldEdit.emit({ product, price: value });
    }
  }

  protected onStatusEditChange(product: Product, status: ProductStatus): void {
    if (!this.actionLoading() && status !== product.status) {
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

  // --- Category popover (chips + searchable checklist) ---

  private readonly categoryPopoverProductState = signal<Product | null>(null);
  private readonly categoryDraftIdsState = signal<readonly string[]>([]);
  protected readonly categorySearchTerm = signal('');
  protected readonly categorySaveError = signal<string | null>(null);

  private readonly newlyCreatedCategoryState = signal<CategoryOption | null>(null);
  protected readonly categoryDialogOpen = signal(false);
  protected readonly categoryCreating = signal(false);
  protected readonly categoryCreateError = signal<string | null>(null);
  protected readonly categoryFormResetToken = signal(0);

  private readonly categoryPopover = viewChild<Popover>('categoryPopover');

  /** categoryOptions() plus an optimistic entry for a just-created category, selectable before the parent's refetch lands. */
  protected readonly categoryPopoverOptions = computed(() => {
    const base = this.categoryOptions();
    const created = this.newlyCreatedCategoryState();

    if (!created || base.some((option) => option.id === created.id)) {
      return base;
    }

    return [...base, created];
  });

  protected readonly filteredCategoryPopoverOptions = computed(() => {
    const term = this.categorySearchTerm().trim().toLowerCase();
    const options = this.categoryPopoverOptions();

    if (!term) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(term));
  });

  protected isCategoryPopoverOpenFor(productId: string): boolean {
    return this.categoryPopoverProductState()?.id === productId;
  }

  protected isCategoryDraftChecked(categoryId: string): boolean {
    return this.categoryDraftIdsState().includes(categoryId);
  }

  protected openCategoryPopover(product: Product, event: Event): void {
    event.stopPropagation();

    if (this.actionLoading()) {
      return;
    }

    const popover = this.categoryPopover();
    if (!popover) {
      return;
    }

    const alreadyOpenForThisRow = this.categoryPopoverProductState()?.id === product.id;
    this.categoryPopoverProductState.set(product);
    this.categoryDraftIdsState.set(this.productCategoryIds(product));
    this.categorySearchTerm.set('');
    this.categorySaveError.set(null);

    if (alreadyOpenForThisRow) {
      popover.toggle(event);
    } else {
      popover.show(event, event.currentTarget);
    }
  }

  protected toggleCategoryDraft(categoryId: string, checked: boolean): void {
    this.categoryDraftIdsState.update((ids) =>
      checked ? [...ids, categoryId] : ids.filter((id) => id !== categoryId),
    );
    this.categorySaveError.set(null);
  }

  protected cancelCategoryPopover(): void {
    this.categorySaveError.set(null);
    this.categoryPopover()?.hide();
  }

  protected saveCategoryPopover(): void {
    if (this.actionLoading()) {
      return;
    }

    const product = this.categoryPopoverProductState();
    if (!product) {
      return;
    }

    const selectedIds = this.categoryDraftIdsState();
    if (selectedIds.length === 0) {
      this.categorySaveError.set('Select at least one category.');
      return;
    }

    // Keep the current primary if it's still checked; otherwise promote the first checked
    // category — mirrors the "first pick becomes primary" rule used in the full product editor.
    const primary = selectedIds.includes(product.categoryId) ? product.categoryId : selectedIds[0];
    const additional = selectedIds.filter((id) => id !== primary);

    this.categorySaveError.set(null);
    this.fieldEdit.emit({ product, categoryId: primary, additionalCategoryIds: additional });
    this.categoryPopover()?.hide();
  }

  protected openCategoryCreateDialog(): void {
    this.categoryCreateError.set(null);
    this.categoryFormResetToken.update((value) => value + 1);
    this.categoryDialogOpen.set(true);
  }

  protected closeCategoryCreateDialog(): void {
    this.categoryDialogOpen.set(false);
    this.categoryCreateError.set(null);
  }

  protected onCategoryCreateDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeCategoryCreateDialog();
    }
  }

  protected async onCategorySubmitted(request: CreateCategoryRequest): Promise<void> {
    this.categoryCreating.set(true);
    this.categoryCreateError.set(null);

    try {
      const id = await createCategoryWithHierarchy(this.categoryApi, request);
      this.newlyCreatedCategoryState.set({ id, label: request.nameEn, parentId: request.parentId ?? null });
      this.categoryDraftIdsState.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
      this.categoryDialogOpen.set(false);
      this.categoryCreated.emit();
    } catch (error) {
      this.categoryCreateError.set(this.toErrorMessage(error, 'Failed to create category.'));
    } finally {
      this.categoryCreating.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to manage categories. Sign in with an admin account (admin@hambox.local in development).';
      }

      return error.message;
    }

    return fallback;
  }
}

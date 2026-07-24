import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
import { CollectionCreateFormComponent } from '../collection-create-form/collection-create-form.component';
import { CategoryOption, CreateCategoryRequest } from '../../models/category.model';
import { CollectionOption, CreateCollectionRequest } from '../../models/collection.model';
import { Product, ProductStatus } from '../../models/product.model';
import { CategoryApiService, createCategoryWithHierarchy } from '../../services/category-api.service';
import { CollectionApiService } from '../../services/collection-api.service';
import { productStatusLabel } from '../../utils/product-display.utils';
import { resolveProductImageUrl } from '../../utils/product-image.utils';

type EditableField = 'name' | 'price';

const STATUS_EDIT_OPTIONS: readonly ProductStatus[] = ['Draft', 'Active', 'Inactive', 'Archived'];

export interface ProductFieldEdit {
  readonly product: Product;
  readonly nameEn?: string;
  readonly categoryId?: string;
  readonly additionalCategoryIds?: readonly string[];
  readonly collectionIds?: readonly string[];
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
    CollectionCreateFormComponent,
  ],
  templateUrl: './product-catalog-table.component.html',
  styleUrl: './product-catalog-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCatalogTableComponent {
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly collectionApi = inject(CollectionApiService);

  protected readonly permissions = PERMISSIONS;

  readonly products = input.required<readonly Product[]>();
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly pageSize = input(20);
  readonly first = input(0);
  readonly selectedProductId = input<string | null>(null);
  readonly searchActive = input(false);
  readonly categoryOptions = input<readonly CategoryOption[]>([]);
  readonly collectionOptions = input<readonly CollectionOption[]>([]);
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
  readonly previewProduct = output<Product>();
  readonly duplicateProduct = output<Product>();
  readonly archiveProduct = output<Product>();
  readonly deleteProduct = output<Product>();
  readonly fieldEdit = output<ProductFieldEdit>();
  readonly statusEdit = output<ProductStatusEdit>();
  /** Emitted after a category is created inline from the popover, so the parent facade can refresh its category list. */
  readonly categoryCreated = output<void>();
  /** Emitted after a collection is created inline from the popover, so the parent facade can refresh its collection list. */
  readonly collectionCreated = output<void>();

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

  protected collectionLabel(collectionId: string): string {
    return this.collectionOptions().find((option) => option.id === collectionId)?.label ?? collectionId;
  }

  protected productCollectionLabels(product: Product): string[] {
    return (product.collectionIds ?? []).map((id) => this.collectionLabel(id));
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

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  /** Mobile fallback for dblclick — touch-and-hold enters edit mode. */
  protected onNameTouchStart(product: Product, event: Event): void {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => this.startEdit(product, 'name', event), 500);
  }

  protected onNameTouchEnd(): void {
    this.clearLongPressTimer();
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
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
    const items: MenuItem[] = [
      {
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.PREVIEW'),
        icon: 'pi pi-external-link',
        command: () => this.previewProduct.emit(product),
      },
    ];

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

  // --- Collections popover (chips + searchable checklist) ---
  // Mirrors the category popover above exactly, minus the "primary category" concept —
  // collections are flat tags, so there's no star button and an empty selection is valid.

  private readonly collectionPopoverProductState = signal<Product | null>(null);
  private readonly collectionDraftIdsState = signal<readonly string[]>([]);
  protected readonly collectionSearchTerm = signal('');
  protected readonly collectionSaveError = signal<string | null>(null);

  private readonly newlyCreatedCollectionState = signal<CollectionOption | null>(null);
  protected readonly collectionDialogOpen = signal(false);
  protected readonly collectionCreating = signal(false);
  protected readonly collectionCreateError = signal<string | null>(null);
  protected readonly collectionFormResetToken = signal(0);

  private readonly collectionPopover = viewChild<Popover>('collectionPopover');

  protected readonly collectionPopoverOptions = computed(() => {
    const base = this.collectionOptions();
    const created = this.newlyCreatedCollectionState();

    if (!created || base.some((option) => option.id === created.id)) {
      return base;
    }

    return [...base, created];
  });

  protected readonly filteredCollectionPopoverOptions = computed(() => {
    const term = this.collectionSearchTerm().trim().toLowerCase();
    const options = this.collectionPopoverOptions();

    if (!term) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(term));
  });

  protected isCollectionPopoverOpenFor(productId: string): boolean {
    return this.collectionPopoverProductState()?.id === productId;
  }

  protected isCollectionDraftChecked(collectionId: string): boolean {
    return this.collectionDraftIdsState().includes(collectionId);
  }

  protected openCollectionPopover(product: Product, event: Event): void {
    event.stopPropagation();

    if (this.actionLoading()) {
      return;
    }

    const popover = this.collectionPopover();
    if (!popover) {
      return;
    }

    const alreadyOpenForThisRow = this.collectionPopoverProductState()?.id === product.id;
    this.collectionPopoverProductState.set(product);
    this.collectionDraftIdsState.set(product.collectionIds ?? []);
    this.collectionSearchTerm.set('');
    this.collectionSaveError.set(null);

    if (alreadyOpenForThisRow) {
      popover.toggle(event);
    } else {
      popover.show(event, event.currentTarget);
    }
  }

  protected toggleCollectionDraft(collectionId: string, checked: boolean): void {
    this.collectionDraftIdsState.update((ids) =>
      checked ? [...ids, collectionId] : ids.filter((id) => id !== collectionId),
    );
  }

  protected cancelCollectionPopover(): void {
    this.collectionSaveError.set(null);
    this.collectionPopover()?.hide();
  }

  protected saveCollectionPopover(): void {
    if (this.actionLoading()) {
      return;
    }

    const product = this.collectionPopoverProductState();
    if (!product) {
      return;
    }

    this.collectionSaveError.set(null);
    this.fieldEdit.emit({ product, collectionIds: this.collectionDraftIdsState() });
    this.collectionPopover()?.hide();
  }

  protected openCollectionCreateDialog(): void {
    this.collectionCreateError.set(null);
    this.collectionFormResetToken.update((value) => value + 1);
    this.collectionDialogOpen.set(true);
  }

  protected closeCollectionCreateDialog(): void {
    this.collectionDialogOpen.set(false);
    this.collectionCreateError.set(null);
  }

  protected onCollectionCreateDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeCollectionCreateDialog();
    }
  }

  protected async onCollectionSubmitted(request: CreateCollectionRequest): Promise<void> {
    this.collectionCreating.set(true);
    this.collectionCreateError.set(null);

    try {
      const id = await firstValueFrom(this.collectionApi.createCollection(request));
      this.newlyCreatedCollectionState.set({ id, label: request.name, parentId: request.parentId ?? null });
      this.collectionDraftIdsState.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
      this.collectionDialogOpen.set(false);
      this.collectionCreated.emit();
    } catch (error) {
      this.collectionCreateError.set(this.toErrorMessage(error, 'Failed to create collection.'));
    } finally {
      this.collectionCreating.set(false);
    }
  }
}

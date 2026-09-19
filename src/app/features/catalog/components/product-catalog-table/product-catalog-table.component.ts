import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { MenuItem, MessageService } from 'primeng/api';
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
import { ProductSupplierMappingStatusDto } from '../../../admin/suppliers/models/supplier.model';
import { CategoryOption, CreateCategoryRequest } from '../../models/category.model';
import { CollectionOption, CreateCollectionRequest } from '../../models/collection.model';
import { ProductVariantDto } from '../../models/inventory-api.model';
import { Product, ProductStatus } from '../../models/product.model';
import {
  CategoryApiService,
  createCategoryWithHierarchy,
} from '../../services/category-api.service';
import { CollectionApiService } from '../../services/collection-api.service';
import { InventoryApiService } from '../../services/inventory-api.service';
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
    RouterLink,
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
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly messageService = inject(MessageService);

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
  readonly mappingStatusByProductId = input<ReadonlyMap<string, ProductSupplierMappingStatusDto>>(new Map());
  readonly sortField = input<string | undefined>(undefined);
  readonly sortOrder = input(0);
  readonly bulkSelectedIds = input<ReadonlySet<string>>(new Set());
  readonly allPageSelected = input(false);
  /** True while "select all N matching the filter" is active — every loaded row counts as
   * selected even though `bulkSelectedIds` only tracks individually-toggled ids. */
  readonly selectAllMatchingActive = input(false);
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
  /** Row actions for a product parked as a pending merge (see `pendingMergeIntoProductId`) — runs
   * the actual merge (existing `MergeProductsCommand`, single source) / unlinks it back to normal. */
  readonly promoteToVariant = output<Product>();
  readonly unlinkPendingMerge = output<Product>();
  /** Opens the product-centric supplier mapping drawer for this product — the Supplier cell's status
   * badge / "+ Add Supplier Mapping" action. */
  readonly mappingOpenRequested = output<Product>();
  readonly manageMarketingPage = output<Product>();
  /** Opens the "set as On-Delivery" capacity dialog — only offered for products with 0 or 1
   * variant (see productActionMenuItems); multi-variant products use the per-variant controls
   * in the variant manager instead. */
  readonly setChatDeliveryRequested = output<Product>();
  /** The star toggle next to the product name — a personal admin bookmark, unrelated to status. */
  readonly favoriteToggle = output<Product>();
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

  /** Per-row "show every category / internal category chip instead of the +N overflow badge"
   * toggle — purely a client-side view over data already loaded, independent of the category/
   * collection edit popovers below (which still open on a click anywhere else in the cell). */
  protected readonly expandedRowIds = signal<ReadonlySet<string>>(new Set());

  /** Per-product "show its variants inline" toggle — a separate concept from `expandedRowIds`
   * above (which only expands category/collection chip overflow). Variant lists are fetched
   * on first expand and cached here for the row's lifetime. */
  protected readonly expandedVariantIds = signal<ReadonlySet<string>>(new Set());
  protected readonly variantsByProductId = signal<ReadonlyMap<string, readonly ProductVariantDto[]>>(new Map());
  protected readonly variantsLoadingIds = signal<ReadonlySet<string>>(new Set());

  /** Inline rename of a variant's option-describing label (see `variantDisplayLabel`) — mirrors
   * the product name's dblclick-to-edit above, scoped to variant ids instead of product ids. */
  protected readonly editingVariantId = signal<string | null>(null);
  protected readonly editVariantDraftText = signal('');

  /** Variant ids checked in the expander's own selection column — separate from the outer table's
   * `bulkSelectedIds` (which is scoped to product ids), so a variant-level bulk activate/deactivate
   * here never interacts with the product-level bulk bar. */
  protected readonly selectedVariantIds = signal<ReadonlySet<string>>(new Set());

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

  /** Variant status is a plain string on `ProductVariantDto` (not the `ProductStatus` union
   * `statusTone` above expects), but shares the same Draft/Active/Inactive/Archived values —
   * these two small helpers avoid an unsound cast just to reuse that switch. */
  protected variantStatusLabel(status: string): string {
    return status;
  }

  protected variantStatusTone(status: string): AdminStatusTone {
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

  protected mappingStatusFor(productId: string): ProductSupplierMappingStatusDto | undefined {
    return this.mappingStatusByProductId().get(productId);
  }

  protected mappingStatusTone(status: ProductSupplierMappingStatusDto['status']): AdminStatusTone {
    switch (status) {
      case 'FullyMapped':
        return 'success';
      case 'PartiallyMapped':
        return 'info';
      case 'Unmapped':
        return 'warning';
      case 'SupplierUnavailable':
      case 'MappingError':
        return 'danger';
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
    return this.selectAllMatchingActive() || this.bulkSelectedIds().has(productId);
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
    return (
      this.collectionOptions().find((option) => option.id === collectionId)?.label ?? collectionId
    );
  }

  protected productCollectionLabels(product: Product): string[] {
    return (product.collectionIds ?? []).map((id) => this.collectionLabel(id));
  }

  protected isRowExpanded(productId: string): boolean {
    return this.expandedRowIds().has(productId);
  }

  protected toggleRowExpanded(productId: string, event: Event): void {
    event.stopPropagation();
    this.expandedRowIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  /** Only multi-variant products get an expand arrow — a simple 0/1-variant product has nothing
   * distinct to drill into (mirrors the same threshold the On-Delivery quick action uses). */
  protected hasExpandableVariants(product: Product): boolean {
    return (product.variantCount ?? 0) > 1;
  }

  protected isVariantsExpanded(productId: string): boolean {
    return this.expandedVariantIds().has(productId);
  }

  protected isVariantsLoading(productId: string): boolean {
    return this.variantsLoadingIds().has(productId);
  }

  protected variantsFor(productId: string): readonly ProductVariantDto[] {
    return this.variantsByProductId().get(productId) ?? [];
  }

  /** Strips the SKU prefix shared by every variant of this product (typically the product's own
   * id/code, e.g. "9EBEE706-") so the expander shows the option-describing tail ("US-5") instead
   * of the full internal SKU — purely a display concern, the real SKU is unchanged everywhere else. */
  protected variantDisplayLabel(productId: string, variant: ProductVariantDto): string {
    const prefix = this.commonSkuPrefix(productId).replace(/[-_]+$/, '');
    const stripped = prefix.length > 0 && variant.sku.startsWith(prefix) ? variant.sku.slice(prefix.length).replace(/^[-_]+/, '') : '';
    return stripped.length > 0 ? stripped : variant.sku;
  }

  private commonSkuPrefix(productId: string): string {
    const skus = this.variantsFor(productId).map((variant) => variant.sku);
    if (skus.length === 0) {
      return '';
    }

    let prefix = skus[0];
    for (const sku of skus.slice(1)) {
      while (prefix.length > 0 && !sku.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
      if (prefix.length === 0) {
        break;
      }
    }

    return prefix;
  }

  protected toggleVariantsExpansion(product: Product, event: Event): void {
    event.stopPropagation();
    const productId = product.id;
    const alreadyExpanded = this.expandedVariantIds().has(productId);

    this.expandedVariantIds.update((ids) => {
      const next = new Set(ids);
      if (alreadyExpanded) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    if (!alreadyExpanded && !this.variantsByProductId().has(productId)) {
      void this.loadVariantsFor(productId);
    }
  }

  private async loadVariantsFor(productId: string): Promise<void> {
    this.variantsLoadingIds.update((ids) => new Set(ids).add(productId));
    try {
      const variants = await firstValueFrom(this.inventoryApi.getProductVariants(productId));
      this.variantsByProductId.update((current) => {
        const next = new Map(current);
        next.set(productId, variants);
        return next;
      });
    } catch {
      // Leave the row expanded with an empty list rather than surfacing a toast for a
      // read-only, low-stakes inline preview — the full variant manager (via Edit) is the
      // authoritative place to retry/diagnose.
    } finally {
      this.variantsLoadingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(productId);
        return next;
      });
    }
  }

  protected isEditingVariantLabel(variantId: string): boolean {
    return this.editingVariantId() === variantId;
  }

  protected startEditVariantLabel(productId: string, variant: ProductVariantDto, event: Event): void {
    event.stopPropagation();
    this.editVariantDraftText.set(this.variantDisplayLabel(productId, variant));
    this.editingVariantId.set(variant.id);
  }

  protected cancelEditVariantLabel(): void {
    this.editingVariantId.set(null);
    this.editVariantDraftText.set('');
  }

  protected async saveEditVariantLabel(productId: string, variant: ProductVariantDto): Promise<void> {
    const newLabel = this.editVariantDraftText().trim();
    this.editingVariantId.set(null);

    if (!newLabel) {
      return;
    }

    const prefix = this.commonSkuPrefix(productId).replace(/[-_]+$/, '');
    const newSku = (prefix.length > 0 ? `${prefix}-${newLabel}` : newLabel).toUpperCase();

    if (newSku === variant.sku) {
      return;
    }

    try {
      await firstValueFrom(
        this.inventoryApi.updateVariant(variant.id, {
          sku: newSku,
          planId: variant.planId,
          priceOverride: variant.priceOverride,
          comparePrice: variant.comparePrice,
          costPrice: variant.costPrice,
          memberPrice: variant.memberPrice,
          sortOrder: variant.sortOrder,
          status: variant.status,
          isVisible: variant.isVisible,
          membershipPlanId: variant.membershipPlanId,
          lowStockThreshold: variant.lowStockThreshold,
          optionIds: variant.optionIds,
        }),
      );
      await this.loadVariantsFor(productId);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to rename variant',
        detail: 'Please try again.',
      });
    }
  }

  protected async toggleVariantStatus(productId: string, variant: ProductVariantDto): Promise<void> {
    try {
      if (variant.status === 'Active') {
        await firstValueFrom(this.inventoryApi.deactivateVariant(variant.id));
      } else {
        await firstValueFrom(this.inventoryApi.activateVariant(variant.id));
      }
      await this.loadVariantsFor(productId);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to update status',
        detail: 'Please try again.',
      });
    }
  }

  protected isVariantSelected(variantId: string): boolean {
    return this.selectedVariantIds().has(variantId);
  }

  protected toggleVariantSelection(variantId: string, checked: boolean): void {
    this.selectedVariantIds.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(variantId);
      } else {
        next.delete(variantId);
      }
      return next;
    });
  }

  /** Scoped to this product's own currently-loaded variants — the selection set itself is global,
   * but only one product's panel is ever expanded/interacted with at a time in practice. */
  protected selectedVariantCountFor(productId: string): number {
    const selected = this.selectedVariantIds();
    return this.variantsFor(productId).filter((variant) => selected.has(variant.id)).length;
  }

  protected clearVariantSelection(productId: string): void {
    const idsForProduct = new Set(this.variantsFor(productId).map((variant) => variant.id));
    this.selectedVariantIds.update((ids) => new Set([...ids].filter((id) => !idsForProduct.has(id))));
  }

  protected async bulkSetVariantStatus(productId: string, status: 'Active' | 'Inactive'): Promise<void> {
    const selected = this.selectedVariantIds();
    const targetVariantIds = this.variantsFor(productId)
      .filter((variant) => selected.has(variant.id))
      .map((variant) => variant.id);

    if (targetVariantIds.length === 0) {
      return;
    }

    try {
      await Promise.all(
        targetVariantIds.map((variantId) =>
          firstValueFrom(
            status === 'Active' ? this.inventoryApi.activateVariant(variantId) : this.inventoryApi.deactivateVariant(variantId),
          ),
        ),
      );
      this.clearVariantSelection(productId);
      await this.loadVariantsFor(productId);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to update status for one or more variants',
        detail: 'Please try again.',
      });
    }
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

    if (product.pendingMergeIntoProductId) {
      return [
        {
          label: t('ADMIN.CATALOG_PAGE.PENDING_MERGE.PROMOTE_ACTION'),
          icon: 'pi pi-sitemap',
          command: () => this.promoteToVariant.emit(product),
        },
        {
          label: t('ADMIN.CATALOG_PAGE.PENDING_MERGE.UNLINK_ACTION'),
          icon: 'pi pi-link-slash',
          command: () => this.unlinkPendingMerge.emit(product),
        },
      ];
    }

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
      this.permissionService.hasPermission(this.permissions.Catalog.Inventory.Create) &&
      (product.variantCount ?? 0) <= 1
    ) {
      items.push({
        label: product.hasChatDeliveryVariant ? 'Edit On-Delivery' : 'Set as On-Delivery',
        icon: 'pi pi-comments',
        command: () => this.setChatDeliveryRequested.emit(product),
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

    if (this.permissionService.hasPermission(this.permissions.Catalog.Products.Edit)) {
      items.push({
        label: t('ADMIN.CATALOG_PAGE.ACTIONS.MARKETING_PAGE'),
        icon: 'pi pi-megaphone',
        command: () => this.manageMarketingPage.emit(product),
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
      this.newlyCreatedCategoryState.set({
        id,
        label: request.nameEn,
        parentId: request.parentId ?? null,
      });
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
      this.newlyCreatedCollectionState.set({
        id,
        label: request.name,
        parentId: request.parentId ?? null,
      });
      this.collectionDraftIdsState.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
      this.collectionDialogOpen.set(false);
      this.collectionCreated.emit();
    } catch (error) {
      this.collectionCreateError.set(this.toErrorMessage(error, 'Failed to create internal category.'));
    } finally {
      this.collectionCreating.set(false);
    }
  }
}

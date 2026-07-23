import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminBulkBarComponent,
  AdminConfirmDialogComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import { computeRangeIds } from '../../../../shared/utils/selection.utils';
import { CreateVariantRequest, ProductVariantDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import {
  breadcrumbForVariant,
  buildVariantTree,
  isLeafGroup,
  unassignedVariantLeaves,
  VariantTreeCallbacks,
  VariantTreeNode,
} from '../../utils/variant-tree.utils';
import { ProductVariantLeafListComponent } from '../product-variant-leaf-list/product-variant-leaf-list.component';
import { ProductVariantTreeNodeComponent } from '../product-variant-tree-node/product-variant-tree-node.component';
import { VariantInventoryPanelComponent } from '../variant-inventory-panel/variant-inventory-panel.component';

const VARIANT_STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  ...VARIANT_STATUS_OPTIONS,
];

type VariantFilter = 'all' | 'out-of-stock' | 'draft';


@Component({
  selector: 'app-product-variant-manager',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DialogModule,
    DrawerModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminConfirmDialogComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminBulkBarComponent,
    ProductVariantTreeNodeComponent,
    ProductVariantLeafListComponent,
    VariantInventoryPanelComponent,
  ],
  providers: [MessageService],
  templateUrl: './product-variant-manager.component.html',
  styleUrl: './product-variant-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantManagerComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly messageService = inject(MessageService);
  private readonly permissionService = inject(PermissionService);
  protected readonly mobileViewport = inject(MobileViewportService);

  readonly compact = input(false);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly variants = this.facade.variants;
  protected readonly product = this.facade.product;
  protected readonly loading = this.facade.loading;
  protected readonly statusOptions = VARIANT_STATUS_OPTIONS;
  protected readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  protected readonly variantGenerationResult = this.facade.variantGenerationResult;

  protected readonly saving = signal(false);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<ProductVariantDto | null>(null);
  protected readonly editTarget = signal<ProductVariantDto | null>(null);
  protected readonly editSku = signal('');
  protected readonly editPriceOverride = signal<number | null>(null);
  protected readonly editComparePrice = signal<number | null>(null);
  protected readonly editLowStockThreshold = signal(5);
  protected readonly editStatus = signal('Draft');

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly quickFilter = signal<VariantFilter>('all');
  /** Set, not array — O(1) toggle/lookup regardless of variant count (an array + `.includes()`
   * check per row is an O(n²) scan across the whole table on every render). */
  protected readonly selectedVariantIds = signal<ReadonlySet<string>>(new Set());
  private readonly bulkAnchorId = signal<string | null>(null);
  protected readonly bulkPrice = signal<number | null>(null);
  protected readonly bulkStatus = signal<string | null>(null);
  protected readonly bulkActionLoading = signal(false);
  protected readonly bulkDeleteDialogOpen = signal(false);
  protected readonly bulkPriceStatusDialogOpen = signal(false);

  protected readonly bulkSelectedCount = computed(() => this.selectedVariantIds().size);

  protected readonly bulkMoreMenuItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [];
    if (this.permissionService.hasPermission(this.permissions.Catalog.Inventory.Edit)) {
      items.push({
        label: 'Change price / status',
        icon: 'pi pi-pencil',
        command: () => this.bulkPriceStatusDialogOpen.set(true),
      });
    }
    if (this.permissionService.hasPermission(this.permissions.Catalog.Inventory.Create)) {
      items.push({ label: 'Duplicate', icon: 'pi pi-copy', command: () => void this.bulkDuplicateVariants() });
    }
    items.push({
      label: 'Manage inventory',
      icon: 'pi pi-box',
      disabled: this.bulkSelectedCount() !== 1,
      command: () => void this.bulkManageInventory(),
    });
    return items;
  });

  protected readonly codesDialogVisible = signal(false);
  protected readonly selectedVariantForCodes = signal<ProductVariantDto | null>(null);
  protected readonly creatingDefaultVariant = signal(false);
  protected readonly editDialogVisible = signal(false);

  /** Single "open chain" key (e.g. "steamId/globalId") — only one branch per level is ever expanded, matching a file-explorer accordion rather than free-for-all multi-expand. Keys are inherently hierarchical (child keys are prefixed with their parent's), so prefix matching alone tells us the whole open path. */
  private readonly expandedPath = signal<string | null>(null);

  /** Any active search/status/quick filter narrows the result set enough that branches should auto-expand instead of requiring manual clicks. */
  private readonly filtersActive = computed(
    () => this.searchTerm().trim().length > 0 || !!this.statusFilter() || this.quickFilter() !== 'all',
  );

  /** Variant ids matching the free-text search term specifically (not status/quick filters) — drives leaf-card highlight + scroll-to-match, kept separate from `filtersActive` because a status/quick filter alone shouldn't highlight anything. */
  private readonly searchMatchIds = computed<ReadonlySet<string> | null>(() => {
    if (!this.searchTerm().trim()) {
      return null;
    }
    return new Set(this.variantsTable().map((variant) => variant.id));
  });

  protected readonly variantTree = computed<readonly VariantTreeNode[]>(() =>
    buildVariantTree(this.optionGroups(), this.variantsTable()),
  );

  /** Leaves for variants with no option value in any root group (see `unassignedVariantLeaves` doc) — rendered as their own flat section so they're never dropped by the branch tree. */
  protected readonly unassignedVariants = computed<readonly VariantTreeNode[]>(() =>
    unassignedVariantLeaves(this.optionGroups(), this.variantsTable()),
  );

  /** True when the product has a single option group, so the tree root is itself a flat list of variant leaves rather than branches — that list still needs virtualizing directly, without a branch node to own it. */
  protected readonly rootIsLeafGroup = computed(() => isLeafGroup(this.variantTree()));

  /** "Select all (N)" when unfiltered, "Select all (N of TOTAL)" when a search/status/quick filter narrows the table — so it never reads as a second, conflicting total next to the header. */
  protected readonly selectAllLabel = computed(() => {
    const visible = this.variantsTable().length;
    return this.filtersActive() ? `Select all (${visible} of ${this.variants().length})` : `Select all (${visible})`;
  });

  protected readonly codesBreadcrumb = computed(() => {
    const variant = this.selectedVariantForCodes();
    return variant ? breadcrumbForVariant(this.optionGroups(), variant) : '';
  });

  /** Stable reference passed to every recursive tree row so OnPush doesn't re-diff it each cycle. */
  protected readonly treeCallbacks: VariantTreeCallbacks = {
    isExpanded: (key) => {
      if (this.filtersActive()) {
        return true;
      }
      const path = this.expandedPath();
      return path !== null && (path === key || path.startsWith(`${key}/`));
    },
    toggleExpand: (key) => {
      this.expandedPath.update((current) => {
        if (current !== null && (current === key || current.startsWith(`${key}/`))) {
          const lastSlash = key.lastIndexOf('/');
          return lastSlash === -1 ? null : key.slice(0, lastSlash);
        }
        return key;
      });
    },
    isSelected: (variantId) => this.isVariantSelected(variantId),
    toggleSelect: (variantId, checked, shiftKey) => this.toggleVariantSelection(variantId, checked, shiftKey),
    openVariant: (variant) => void this.manageCodes(variant),
    editVariant: (variant) => this.openEditDialog(variant),
    deleteVariant: (variant) => this.requestDelete(variant),
    isActive: (variantId) => this.selectedVariantForCodes()?.id === variantId,
    displayPrice: (variant) => variant.priceOverride ?? this.product()?.price ?? 0,
    statusSeverity: (variant) => this.statusSeverity(variant),
    isHighlighted: (variantId) => this.searchMatchIds()?.has(variantId) ?? false,
    searchActive: () => this.searchTerm().trim().length > 0,
    bulkSelectionActive: () => this.bulkSelectedCount() > 0,
  };

  constructor() {
    effect(() => {
      const message = this.facade.variantSyncError();
      if (message) {
        this.messageService.add({
          severity: 'error',
          summary: 'Variant sync failed',
          detail: message,
        });
      }
    });
  }

  protected readonly autoGenerationMessage = computed(() => {
    const result = this.variantGenerationResult();
    if (!result) {
      return null;
    }

    if (result.createdCount === 0) {
      return `Variants up to date (${result.preservedCount} already existed)`;
    }

    return result.preservedCount > 0
      ? `${result.createdCount} new, ${result.preservedCount} already existed`
      : `${result.createdCount} variant(s) created`;
  });

  protected readonly variantsTable = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const quick = this.quickFilter();

    return this.variants()
      .map((variant) => ({
        ...variant,
        optionsLabel: this.formatOptions(variant),
        displayPrice: variant.priceOverride ?? this.product()?.price ?? 0,
      }))
      .filter((variant) => {
        if (status && variant.status !== status) {
          return false;
        }

        if (quick === 'out-of-stock' && !variant.isOutOfStock) {
          return false;
        }

        if (quick === 'draft' && variant.status !== 'Draft') {
          return false;
        }

        if (!search) {
          return true;
        }

        return (
          variant.sku.toLowerCase().includes(search) ||
          variant.optionsLabel.toLowerCase().includes(search) ||
          variant.status.toLowerCase().includes(search)
        );
      });
  });

  protected readonly allVisibleSelected = computed(() => {
    const visibleIds = this.variantsTable().map((variant) => variant.id);
    const selected = this.selectedVariantIds();
    return visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  });

  protected openEditDialog(variant: ProductVariantDto): void {
    this.editTarget.set(variant);
    this.editSku.set(variant.sku);
    this.editPriceOverride.set(variant.priceOverride);
    this.editComparePrice.set(variant.comparePrice);
    this.editLowStockThreshold.set(variant.lowStockThreshold);
    this.editStatus.set(variant.status);
    this.editDialogVisible.set(true);
  }

  protected cancelEdit(): void {
    this.editDialogVisible.set(false);
    this.editTarget.set(null);
  }

  protected onEditDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.cancelEdit();
    }
  }

  protected async saveEdit(): Promise<void> {
    const variant = this.editTarget();
    const sku = this.editSku().trim();
    if (!variant || !sku) {
      return;
    }

    this.saving.set(true);
    try {
      const isVisible = this.editStatus() === 'Active';
      await this.facade.updateVariant(variant.id, {
        sku,
        priceOverride: this.editPriceOverride(),
        comparePrice: this.editComparePrice(),
        sortOrder: variant.sortOrder,
        status: this.editStatus(),
        isVisible,
        lowStockThreshold: this.editLowStockThreshold(),
        optionIds: variant.optionIds,
      });
      this.cancelEdit();
    } finally {
      this.saving.set(false);
    }
  }

  protected requestDelete(variant: ProductVariantDto): void {
    this.deleteTarget.set(variant);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const variant = this.deleteTarget();
    if (!variant) {
      return;
    }

    this.saving.set(true);
    try {
      await this.facade.deleteVariant(variant.id);
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      this.selectedVariantIds.update((ids) => {
        const next = new Set(ids);
        next.delete(variant.id);
        return next;
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected async createDefaultVariant(): Promise<void> {
    const product = this.product();
    if (!product || this.creatingDefaultVariant()) {
      return;
    }

    this.creatingDefaultVariant.set(true);
    try {
      const request: CreateVariantRequest = {
        sku: this.buildDefaultSku(product.nameEn),
        sortOrder: 0,
        lowStockThreshold: 5,
        optionIds: [],
      };

      const created = await this.facade.createVariant(request);
      if (!created) {
        this.messageService.add({
          severity: 'error',
          summary: 'Could not create variant',
          detail: this.facade.error() ?? 'Please try again.',
        });
        return;
      }

      const variant = this.variants().find((item) => item.optionIds.length === 0);
      if (variant) {
        await this.manageCodes(variant);
      }
    } finally {
      this.creatingDefaultVariant.set(false);
    }
  }

  private buildDefaultSku(name: string): string {
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');

    return slug || 'DEFAULT';
  }

  protected async manageCodes(variant: ProductVariantDto): Promise<void> {
    this.selectedVariantForCodes.set(variant);
    this.codesDialogVisible.set(true);
    await this.facade.selectVariant(variant.id);
  }

  protected onCodesDialogVisibleChange(visible: boolean): void {
    this.codesDialogVisible.set(visible);
    if (!visible) {
      this.selectedVariantForCodes.set(null);
    }
  }

  protected toggleSelectAll(checked: boolean): void {
    if (!checked) {
      this.selectedVariantIds.set(new Set());
      return;
    }

    this.selectedVariantIds.set(new Set(this.variantsTable().map((variant) => variant.id)));
  }

  protected toggleVariantSelection(variantId: string, checked: boolean, shiftKey = false): void {
    // Shift-click range follows the currently rendered `variantsTable()` order. For a flat
    // (single option group) product this exactly matches what's on screen; for a nested tree it's
    // an approximation (grouped-by-branch order, not literal pixel order) — acceptable given how
    // rarely a range spans multiple branches. Upgrade to a true flattened-tree order if that
    // becomes a real complaint.
    if (shiftKey && this.bulkAnchorId()) {
      const orderedIds = this.variantsTable().map((variant) => variant.id);
      const range = computeRangeIds(orderedIds, this.bulkAnchorId()!, variantId);
      this.selectedVariantIds.update((ids) => new Set([...ids, ...range]));
      this.bulkAnchorId.set(variantId);
      return;
    }

    this.selectedVariantIds.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(variantId);
      } else {
        next.delete(variantId);
      }
      return next;
    });
    this.bulkAnchorId.set(variantId);
  }

  protected isVariantSelected(variantId: string): boolean {
    return this.selectedVariantIds().has(variantId);
  }

  protected clearBulkSelection(): void {
    this.selectedVariantIds.set(new Set());
  }

  protected async confirmBulkPriceStatus(): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (!variantIds.length) {
      return;
    }

    if (this.bulkPrice() === null && !this.bulkStatus()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nothing to update',
        detail: 'Choose a bulk price or status first.',
      });
      return;
    }

    this.bulkActionLoading.set(true);
    try {
      const updated = await this.facade.bulkUpdateVariants({
        variantIds,
        priceOverride: this.bulkPrice(),
        status: this.bulkStatus(),
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Variants updated',
        detail: `Updated ${updated} variant(s).`,
      });
      this.bulkPriceStatusDialogOpen.set(false);
      this.bulkPrice.set(null);
      this.bulkStatus.set(null);
    } finally {
      this.bulkActionLoading.set(false);
    }
  }

  protected async bulkActivate(): Promise<void> {
    await this.runBulkStatusUpdate('Active', 'Activated');
  }

  protected async bulkDeactivate(): Promise<void> {
    await this.runBulkStatusUpdate('Inactive', 'Deactivated');
  }

  private async runBulkStatusUpdate(status: string, verb: string): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (!variantIds.length) {
      return;
    }

    this.bulkActionLoading.set(true);
    try {
      const updated = await this.facade.bulkUpdateVariants({ variantIds, priceOverride: null, status });
      this.messageService.add({ severity: 'success', summary: verb, detail: `${updated} variant(s) updated.` });
    } finally {
      this.bulkActionLoading.set(false);
    }
  }

  protected requestBulkDelete(): void {
    this.bulkDeleteDialogOpen.set(true);
  }

  protected async confirmBulkDelete(): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (!variantIds.length) {
      return;
    }

    this.bulkActionLoading.set(true);
    try {
      const deleted = await this.facade.bulkDeleteVariants(variantIds);
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${deleted} variant(s) deleted.` });
      this.clearBulkSelection();
      this.bulkDeleteDialogOpen.set(false);
    } finally {
      this.bulkActionLoading.set(false);
    }
  }

  protected async bulkDuplicateVariants(): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (!variantIds.length) {
      return;
    }

    this.bulkActionLoading.set(true);
    try {
      const duplicated = await this.facade.bulkDuplicateVariants(variantIds);
      this.messageService.add({
        severity: 'success',
        summary: 'Duplicated',
        detail: `${duplicated} variant(s) duplicated.`,
      });
      this.clearBulkSelection();
    } finally {
      this.bulkActionLoading.set(false);
    }
  }

  protected async bulkExportCodes(): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (!variantIds.length) {
      return;
    }

    this.bulkActionLoading.set(true);
    try {
      const blob = await this.facade.exportVariantsCodes(variantIds);
      if (!blob) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `variant-codes-export-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      this.bulkActionLoading.set(false);
    }
  }

  protected async bulkManageInventory(): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (variantIds.length !== 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Select one variant',
        detail: 'Inventory management opens one variant at a time — narrow your selection to exactly one.',
      });
      return;
    }

    const variant = this.variants().find((item) => item.id === variantIds[0]);
    if (variant) {
      await this.manageCodes(variant);
    }
  }

  @HostListener('keydown.escape')
  protected onEscapeKey(): void {
    if (this.bulkSelectedCount() > 0) {
      this.clearBulkSelection();
    }
  }

  @HostListener('keydown.control.a', ['$event'])
  @HostListener('keydown.meta.a', ['$event'])
  protected onSelectAllShortcut(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    event.preventDefault();
    this.toggleSelectAll(true);
  }

  protected statusSeverity(
    variant: ProductVariantDto,
  ): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
    if (variant.status === 'Draft') {
      return 'info';
    }
    if (variant.isOutOfStock) {
      return 'danger';
    }
    if (variant.status !== 'Active') {
      return 'secondary';
    }
    return 'success';
  }

  protected deleteDialogMessage(): string {
    const variant = this.deleteTarget();
    return variant ? `Delete variant "${variant.sku}"? This cannot be undone.` : '';
  }

  private formatOptions(variant: ProductVariantDto): string {
    const labels = this.optionGroups()
      .flatMap((group) =>
        group.options
          .filter((option) => variant.optionIds.includes(option.id))
          .map((option) => `${group.displayName}: ${option.label}`),
      );

    return labels.length ? labels.join(' · ') : '—';
  }
}

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
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import { computeRangeIds } from '../../../../shared/utils/selection.utils';
import { CreateVariantRequest, ProductVariantDto, VariantUsageDto } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import {
  breadcrumbForVariant,
  buildVariantTree,
  partitionTreeNodes,
  unassignedVariantLeaves,
  VariantTreeCallbacks,
  VariantTreeNode,
} from '../../utils/variant-tree.utils';
import { ProductVariantLeafListComponent } from '../product-variant-leaf-list/product-variant-leaf-list.component';
import { ProductVariantTreeNodeComponent } from '../product-variant-tree-node/product-variant-tree-node.component';
import { ProductVariantUsageDialogComponent } from '../product-variant-usage-dialog/product-variant-usage-dialog.component';
import { VariantFulfillmentPanelComponent } from '../variant-fulfillment-panel/variant-fulfillment-panel.component';
import { VariantInstructionsDialogComponent } from '../variant-instructions-dialog/variant-instructions-dialog.component';
import { VariantInventoryPanelComponent } from '../variant-inventory-panel/variant-inventory-panel.component';

import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
const VARIANT_STATUS_OPTIONS = [
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Draft', value: 'Draft' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Active', value: 'Active' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Inactive', value: 'Inactive' },
  { key: 'ADMIN.CATALOG_PAGE.STATUS_VALUES.Archived', value: 'Archived' },
];

const STATUS_FILTER_OPTIONS = [{ key: 'ADMIN.CATALOG_UI.ALL_STATUSES', value: '' }, ...VARIANT_STATUS_OPTIONS];

const PRICE_MODE_OPTIONS = [
  { key: 'ADMIN.CATALOG_UI.PRICE_MODE_MANUAL', value: 'manual' as const },
  { key: 'ADMIN.CATALOG_UI.PRICE_MODE_PERCENT', value: 'percent' as const },
];

// Mirror the backend limits so the dialog stops bad input instead of failing the save.
const MAX_PRICE = 10_000_000;
const MAX_SKU_LENGTH = 100;

type VariantFilter = 'all' | 'out-of-stock' | 'in-stock' | 'draft';


@Component({
  selector: 'app-product-variant-manager',
  standalone: true,
  imports: [TranslatePipe, 
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
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminConfirmDialogComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminBulkBarComponent,
    ProductVariantTreeNodeComponent,
    ProductVariantLeafListComponent,
    ProductVariantUsageDialogComponent,
    VariantInventoryPanelComponent,
    VariantFulfillmentPanelComponent,
    VariantInstructionsDialogComponent,
  ],
  // No private MessageService: toasts must reach the edit page's <p-toast> (a component-level provider would be a
  // different instance that nothing displays).
  templateUrl: './product-variant-manager.component.html',
  styleUrl: './product-variant-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantManagerComponent {
  private readonly translate = inject(TranslateService);
  private readonly facade = inject(ProductEditorFacade);
  private readonly messageService = inject(MessageService);
  private readonly permissionService = inject(PermissionService);
  protected readonly mobileViewport = inject(MobileViewportService);

  readonly compact = input(false);

  protected readonly permissions = PERMISSIONS;
  protected readonly optionGroups = this.facade.optionGroups;
  protected readonly variants = this.facade.variants;
  protected readonly product = this.facade.product;
  protected readonly productId = this.facade.productId;
  protected readonly loading = this.facade.loading;
  // Re-evaluates the translated option labels whenever the language changes.
  private readonly language = toSignal(this.translate.onLangChange.pipe(startWith(null)));
  protected readonly statusOptions = computed(() => this.translateOptions(VARIANT_STATUS_OPTIONS));
  protected readonly statusFilterOptions = computed(() => this.translateOptions(STATUS_FILTER_OPTIONS));
  protected readonly priceModeOptions = computed(() => this.translateOptions(PRICE_MODE_OPTIONS));
  protected readonly maxPrice = MAX_PRICE;
  protected readonly maxSkuLength = MAX_SKU_LENGTH;
  protected readonly skuError = signal(false);

  private translateOptions<T extends string>(options: { key: string; value: T }[]): { label: string; value: T }[] {
    this.language();
    return options.map((option) => ({ label: this.translate.instant(option.key), value: option.value }));
  }
  protected readonly variantGenerationResult = this.facade.variantGenerationResult;

  /**
   * Informational only — no blocking rule is invented here. A product with variants but none
   * Active+visible simply can't be bought yet (already enforced storefront-side by the existing
   * Status/IsVisible filters); this just surfaces that state to the admin instead of leaving them
   * to discover it by checking the storefront themselves.
   */
  protected readonly hasNoPurchasableVariant = computed(
    () => this.variants().length > 0 && !this.variants().some((v) => v.status === 'Active' && v.isVisible),
  );

  protected readonly saving = signal(false);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<ProductVariantDto | null>(null);
  protected readonly usageDialogOpen = signal(false);
  protected readonly usageTarget = signal<ProductVariantDto | null>(null);
  protected readonly variantUsage = signal<VariantUsageDto | null>(null);
  protected readonly usageLoading = signal(false);
  protected readonly usageCleanupLoading = signal(false);
  protected readonly usageArchiveLoading = signal(false);
  protected readonly usageDeleteLoading = signal(false);
  protected readonly editTarget = signal<ProductVariantDto | null>(null);
  protected readonly editSku = signal('');
  protected readonly editPriceOverride = signal<number | null>(null);
  protected readonly editComparePrice = signal<number | null>(null);
  protected readonly editLowStockThreshold = signal(5);
  protected readonly editStatus = signal('Draft');

  protected readonly editCostPrice = signal<number | null>(null);
  protected readonly editMemberPrice = signal<number | null>(null);
  /** Whether the sale/member price fields below are typed directly or computed as a % markup over
   * `editCostPrice`. Purely a data-entry convenience — only the resulting number is ever persisted. */
  protected readonly salePriceMode = signal<'manual' | 'percent'>('manual');
  protected readonly salePricePercent = signal<number | null>(null);
  protected readonly memberPriceMode = signal<'manual' | 'percent'>('manual');
  protected readonly memberPricePercent = signal<number | null>(null);

  protected readonly computedSalePrice = computed(() =>
    this.computePriceFromCost(this.editCostPrice(), this.salePricePercent()),
  );
  protected readonly computedMemberPrice = computed(() =>
    this.computePriceFromCost(this.editCostPrice(), this.memberPricePercent()),
  );

  private computePriceFromCost(cost: number | null, percent: number | null): number | null {
    if (cost == null || percent == null) {
      return null;
    }

    return Math.round(cost * (1 + percent / 100) * 100) / 100;
  }

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly quickFilter = signal<VariantFilter>('all');
  /** Deactivated / archived variants are hidden from the list by default (they are not sold anyway); this brings them back. */
  protected readonly showHidden = signal(false);
  protected readonly hiddenVariantCount = computed(
    () => this.variants().filter((variant) => this.isHiddenVariant(variant.status)).length,
  );
  /** Set, not array — O(1) toggle/lookup regardless of variant count (an array + `.includes()`
   * check per row is an O(n²) scan across the whole table on every render). */
  protected readonly selectedVariantIds = signal<ReadonlySet<string>>(new Set());
  private readonly bulkAnchorId = signal<string | null>(null);
  protected readonly bulkPrice = signal<number | null>(null);
  protected readonly bulkStatus = signal<string | null>(null);
  protected readonly bulkActionLoading = signal(false);
  protected readonly bulkDeleteDialogOpen = signal(false);
  protected readonly bulkPriceStatusDialogOpen = signal(false);
  /** Variants a bulk delete just blocked — lets the admin jump straight to "why" for each one
   * instead of guessing from a summary toast. */
  protected readonly bulkBlockedVariants = signal<readonly ProductVariantDto[]>([]);

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
  protected readonly instructionsDialogVariant = signal<ProductVariantDto | null>(null);

  /** Inline price editing on the leaf-list row itself (mobile's replacement for the hidden price
   * column) — only one row edits at a time, tracked here rather than per-row so `treeCallbacks`
   * stays a single stable reference. */
  protected readonly editingPriceVariantId = signal<string | null>(null);
  protected readonly priceDraftValue = signal<number | null>(null);

  /** Branches start expanded; this tracks only the ones an admin explicitly collapsed. Collapsing a parent hides its children from the render tree entirely, so no prefix/ancestor bookkeeping is needed here. */
  private readonly collapsedKeys = signal<ReadonlySet<string>>(new Set());

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

  /** Root-level siblings split into plain variant leaves vs. further sub-groups — see `partitionTreeNodes`. */
  protected readonly rootTree = computed(() => partitionTreeNodes(this.variantTree()));

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
    isExpanded: (key) => this.filtersActive() || !this.collapsedKeys().has(key),
    toggleExpand: (key) => {
      this.collapsedKeys.update((current) => {
        const next = new Set(current);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    isSelected: (variantId) => this.isVariantSelected(variantId),
    toggleSelect: (variantId, checked, shiftKey) => this.toggleVariantSelection(variantId, checked, shiftKey),
    openVariant: (variant) => void this.manageCodes(variant),
    editVariant: (variant) => this.openEditDialog(variant),
    editInstructions: (variant) => this.instructionsDialogVariant.set(variant),
    deleteVariant: (variant) => this.requestDelete(variant),
    isActive: (variantId) => this.selectedVariantForCodes()?.id === variantId,
    displayPrice: (variant) => variant.priceOverride ?? this.product()?.price ?? 0,
    isEditingPrice: (variantId) => this.editingPriceVariantId() === variantId,
    startEditPrice: (variant, event) => this.startEditPrice(variant, event),
    priceDraft: () => this.priceDraftValue(),
    setPriceDraft: (value) => this.priceDraftValue.set(value),
    saveEditPrice: (variant) => void this.saveEditPrice(variant),
    cancelEditPrice: () => this.cancelEditPrice(),
    isRecentlyEditedPrice: (variantId) => this.isRecentlyEditedPrice(variantId),
    toggleVariantStatus: (variant) => void this.toggleVariantStatus(variant),
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
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_SYNC_FAILED'),
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

  private isHiddenVariant(status: string): boolean {
    return status === 'Inactive' || status === 'Archived';
  }

  protected readonly variantsTable = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const quick = this.quickFilter();
    const showHidden = this.showHidden();

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

        // Without an explicit status filter, variants the admin hid (Inactive / Archived) stay out of the list.
        if (!status && !showHidden && this.isHiddenVariant(variant.status)) {
          return false;
        }

        if (quick === 'out-of-stock' && !variant.isOutOfStock) {
          return false;
        }

        if (quick === 'in-stock' && variant.isOutOfStock) {
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

  /** Deep-link entry point: opens the edit dialog for a specific variant once its data is loaded
   * (called by the host page after navigating here with an `editVariant` query param, e.g. from
   * the catalog list's per-row pricing shortcut) — a no-op if the variant isn't found yet. */
  openEditDialogForVariant(variantId: string): void {
    const variant = this.variants().find((entry) => entry.id === variantId);
    if (variant) {
      this.openEditDialog(variant);
    }
  }

  protected openEditDialog(variant: ProductVariantDto): void {
    this.editTarget.set(variant);
    this.skuError.set(false);
    this.editSku.set(variant.sku);
    this.editPriceOverride.set(variant.priceOverride);
    this.editComparePrice.set(variant.comparePrice);
    this.editLowStockThreshold.set(variant.lowStockThreshold);
    this.editStatus.set(variant.status);
    this.editCostPrice.set(variant.costPrice);
    this.editMemberPrice.set(variant.memberPrice);
    // Always reopens in manual mode — the % is a one-time calculator, not a stored setting, so it
    // isn't remembered between edits (the resulting number is what persists).
    this.salePriceMode.set('manual');
    this.salePricePercent.set(null);
    this.memberPriceMode.set('manual');
    this.memberPricePercent.set(null);
    this.editDialogVisible.set(true);
  }

  protected cancelEdit(): void {
    this.editDialogVisible.set(false);
    this.editTarget.set(null);
  }

  /** Set (with a timestamp) whenever price-editing ends on a row via `saveEditPrice`, so a click
   * arriving immediately after — e.g. the very same tap that blurred the input to dismiss a
   * mobile keyboard — can still be recognized as part of that edit. Plain fields, not signals:
   * read imperatively from a `(click)` binding, never from a template `[binding]`. */
  private recentlyEditedPriceVariantId: string | null = null;
  private recentlyEditedPriceAt = 0;
  private static readonly RECENT_EDIT_COOLDOWN_MS = 400;

  protected startEditPrice(variant: ProductVariantDto, event: Event): void {
    event.stopPropagation();
    this.priceDraftValue.set(variant.priceOverride ?? this.product()?.price ?? 0);
    this.editingPriceVariantId.set(variant.id);
  }

  protected cancelEditPrice(): void {
    this.editingPriceVariantId.set(null);
    this.priceDraftValue.set(null);
  }

  protected isRecentlyEditedPrice(variantId: string): boolean {
    return (
      this.recentlyEditedPriceVariantId === variantId &&
      Date.now() - this.recentlyEditedPriceAt < ProductVariantManagerComponent.RECENT_EDIT_COOLDOWN_MS
    );
  }

  /** Tapping a row's status tag flips it straight to Active/Inactive — a quicker one-tap
   * alternative to bulk-selecting variants just to activate a handful of them. */
  protected async toggleVariantStatus(variant: ProductVariantDto): Promise<void> {
    const success =
      variant.status === 'Active'
        ? await this.facade.deactivateVariant(variant.id)
        : await this.facade.activateVariant(variant.id);

    if (!success) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_STATUS_FAILED'),
        detail: this.facade.variantSyncError() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
      });
    }
  }

  /** Saves just the price, leaving every other field on the variant untouched — mirrors the
   * catalog table's inline price edit for products (`ProductCatalogFacade.updateProductInline`),
   * just against `ProductEditorFacade.updateVariant`'s full-payload shape instead of a partial one. */
  protected async saveEditPrice(variant: ProductVariantDto): Promise<void> {
    const priceOverride = this.priceDraftValue();
    this.editingPriceVariantId.set(null);
    this.recentlyEditedPriceVariantId = variant.id;
    this.recentlyEditedPriceAt = Date.now();

    if (priceOverride === null || priceOverride === variant.priceOverride) {
      return;
    }

    const success = await this.facade.updateVariant(variant.id, {
      sku: variant.sku,
      planId: variant.planId,
      priceOverride,
      comparePrice: variant.comparePrice,
      costPrice: variant.costPrice,
      memberPrice: variant.memberPrice,
      sortOrder: variant.sortOrder,
      status: variant.status,
      isVisible: variant.isVisible,
      membershipPlanId: variant.membershipPlanId,
      lowStockThreshold: variant.lowStockThreshold,
      optionIds: variant.optionIds,
    });

    if (!success) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.PRICE_UPDATE_FAILED'),
        detail: this.facade.variantSyncError() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_PRICE_FAILED'),
      });
    }
  }

  protected onEditDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.cancelEdit();
    }
  }

  protected async saveEdit(): Promise<void> {
    const variant = this.editTarget();
    const sku = this.editSku().trim();
    if (!variant) {
      return;
    }

    if (!sku) {
      this.skuError.set(true);
      return;
    }

    const priceOverride = this.salePriceMode() === 'percent' ? this.computedSalePrice() : this.editPriceOverride();
    const memberPrice = this.memberPriceMode() === 'percent' ? this.computedMemberPrice() : this.editMemberPrice();

    if (this.salePriceMode() === 'percent' && priceOverride == null) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.CANNOT_COMPUTE_SALE'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.ENTER_COST_AND_PERCENT'),
      });
      return;
    }

    if (this.memberPriceMode() === 'percent' && memberPrice == null) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.CANNOT_COMPUTE_MEMBER'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.ENTER_COST_AND_PERCENT'),
      });
      return;
    }

    this.saving.set(true);
    try {
      const isVisible = this.editStatus() === 'Active';
      const success = await this.facade.updateVariant(variant.id, {
        sku,
        priceOverride,
        comparePrice: this.editComparePrice(),
        costPrice: this.editCostPrice(),
        memberPrice,
        sortOrder: variant.sortOrder,
        status: this.editStatus(),
        isVisible,
        lowStockThreshold: this.editLowStockThreshold(),
        optionIds: variant.optionIds,
      });

      if (success) {
        this.cancelEdit();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_SAVE_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_UPDATE_FAILED'),
        });
      }
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * "Delete" always inspects usage first. A variant with nothing referencing it goes straight to
   * the plain confirm dialog; anything else opens the categorized usage dialog instead of
   * pretending a permanent delete is possible.
   */
  protected async requestDelete(variant: ProductVariantDto): Promise<void> {
    if (this.usageLoading()) {
      return; // already checking usage for a previous click — ignore the double-submit
    }

    this.usageLoading.set(true);
    try {
      const usage = await this.facade.getVariantUsage(variant.id);
      if (!usage) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.USAGE_CHECK_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
        });
        return;
      }

      const totalUsage =
        usage.safeToRemove.totalCount + usage.safeToDetach.totalCount + usage.protectedHistory.totalCount;

      if (totalUsage === 0) {
        this.deleteTarget.set(variant);
        this.deleteDialogOpen.set(true);
        return;
      }

      this.usageTarget.set(variant);
      this.variantUsage.set(usage);
      this.usageDialogOpen.set(true);
    } finally {
      this.usageLoading.set(false);
    }
  }

  protected closeUsageDialog(): void {
    this.usageDialogOpen.set(false);
    this.usageTarget.set(null);
    this.variantUsage.set(null);
  }

  protected async onUsageCleanup(): Promise<void> {
    const variant = this.usageTarget();
    if (!variant) {
      return;
    }

    this.usageCleanupLoading.set(true);
    try {
      const usage = await this.facade.cleanupVariant(variant.id);
      if (!usage) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.CLEANUP_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
        });
        return;
      }

      // Never assume cleanup removed everything shown before — the dialog re-renders from
      // whatever the backend reports right now.
      this.variantUsage.set(usage);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.CLEANED_UP'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.CLEANED_UP_DETAIL'),
      });
    } finally {
      this.usageCleanupLoading.set(false);
    }
  }

  protected async onUsageArchive(): Promise<void> {
    const variant = this.usageTarget();
    if (!variant) {
      return;
    }

    this.usageArchiveLoading.set(true);
    try {
      const archived = await this.facade.archiveVariant(variant.id);
      if (!archived) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_ARCHIVE_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
        });
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.ARCHIVED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_ARCHIVED', { p0: variant.sku }),
      });
      this.closeUsageDialog();
    } finally {
      this.usageArchiveLoading.set(false);
    }
  }

  protected async onUsageDeletePermanently(): Promise<void> {
    const variant = this.usageTarget();
    if (!variant) {
      return;
    }

    this.usageDeleteLoading.set(true);
    try {
      const deleted = await this.facade.deleteVariant(variant.id);
      if (!deleted) {
        // The backend re-checks usage fresh on every delete attempt — a concurrent purchase,
        // reservation, or cart add since we last looked can make this fail even though the
        // dialog showed zero blocking usage a moment ago. Refresh rather than assume anything.
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_DELETE_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_IN_USE'),
        });
        const refreshed = await this.facade.getVariantUsage(variant.id);
        if (refreshed) {
          this.variantUsage.set(refreshed);
        }
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.DELETED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_DELETED', { p0: variant.sku }),
      });
      this.selectedVariantIds.update((ids) => {
        const next = new Set(ids);
        next.delete(variant.id);
        return next;
      });
      this.closeUsageDialog();
    } finally {
      this.usageDeleteLoading.set(false);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const variant = this.deleteTarget();
    if (!variant) {
      return;
    }

    this.saving.set(true);
    try {
      const deleted = await this.facade.deleteVariant(variant.id);
      if (!deleted) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_DELETE_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
        });
        return;
      }

      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      this.selectedVariantIds.update((ids) => {
        const next = new Set(ids);
        next.delete(variant.id);
        return next;
      });
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.DELETED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_DELETED', { p0: variant.sku }),
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
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANT_CREATE_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
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
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.NOTHING_TO_UPDATE'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.CHOOSE_BULK_FIRST'),
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
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VARIANTS_UPDATED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.UPDATED_N_VARIANTS', { p0: updated }),
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

  protected async bulkArchive(): Promise<void> {
    await this.runBulkStatusUpdate('Archived', 'Archived');
  }

  private async runBulkStatusUpdate(status: string, verb: string): Promise<void> {
    const variantIds = [...this.selectedVariantIds()];
    if (!variantIds.length) {
      return;
    }

    this.bulkActionLoading.set(true);
    try {
      const updated = await this.facade.bulkUpdateVariants({ variantIds, priceOverride: null, status });
      this.messageService.add({ severity: 'success', summary: verb, detail: this.translate.instant('ADMIN.CATALOG_TOASTS.N_VARIANTS_UPDATED', { p0: updated }) });
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
      const result = await this.facade.bulkDeleteVariants(variantIds);
      if (!result) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.BULK_DELETE_FAILED'),
          detail: this.facade.error() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.TRY_AGAIN'),
        });
        return;
      }

      // Every id was attempted independently with the same protection a single delete gets — some
      // may legitimately be blocked (order history, sold codes, ...) while others succeed. Report
      // that honestly instead of a single count that would hide the blocked ones.
      if (result.errorCount === 0) {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.DELETED'),
          detail: this.translate.instant('ADMIN.CATALOG_TOASTS.N_VARIANTS_DELETED', { p0: result.successCount }),
        });
      } else if (result.successCount === 0) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.BULK_DELETE_BLOCKED'),
          detail: this.translate.instant('ADMIN.CATALOG_TOASTS.NONE_DELETED', { p0: result.errorCount }),
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.instant('ADMIN.CATALOG_TOASTS.PARTIALLY_DELETED'),
          detail: this.translate.instant('ADMIN.CATALOG_TOASTS.SOME_DELETED', { p0: result.successCount, p1: result.errorCount }),
        });
      }

      // Surface exactly which ones were blocked and let the admin jump straight to "why" instead
      // of re-selecting them one by one to find out.
      const blockedIds = new Set(result.blockedVariantIds);
      this.bulkBlockedVariants.set(this.variants().filter((v) => blockedIds.has(v.id)));

      this.clearBulkSelection();
      this.bulkDeleteDialogOpen.set(false);
    } finally {
      this.bulkActionLoading.set(false);
    }
  }

  /** Opens the usual usage-inspection flow for one variant a bulk delete just blocked. */
  protected async inspectBulkBlockedVariant(variant: ProductVariantDto): Promise<void> {
    this.bulkBlockedVariants.update((list) => list.filter((v) => v.id !== variant.id));
    await this.requestDelete(variant);
  }

  protected closeBulkBlockedDialog(): void {
    this.bulkBlockedVariants.set([]);
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
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.DUPLICATED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.N_VARIANTS_DUPLICATED', { p0: duplicated }),
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
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.SELECT_ONE_VARIANT'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.ONE_VARIANT_AT_A_TIME'),
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

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { FulfillmentChainListComponent } from '../../../admin/suppliers/components/fulfillment-chain-list/fulfillment-chain-list.component';
import {
  SupplierCatalogSearchDrawerComponent,
  SupplierCatalogSearchDrawerTarget,
} from '../../../admin/suppliers/components/supplier-catalog-search-drawer/supplier-catalog-search-drawer.component';
import { SupplierFulfillmentChainCandidateDto } from '../../../admin/suppliers/models/supplier.model';
import { SuppliersManagementFacade } from '../../../admin/suppliers/services/suppliers-management.facade';
import { AdminConfirmDialogComponent, AdminErrorAlertComponent, AdminSectionCardComponent, AdminStatusBadgeComponent } from '../../../../shared/components/admin';
import { HasPermissionPipe } from '../../../../shared/pipes/has-permission.pipe';
import { FulfillmentMode, FULFILLMENT_MODES } from '../../models/inventory-api.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';

interface FulfillmentModeOption {
  readonly mode: FulfillmentMode;
  readonly icon: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}

const MODE_OPTIONS: readonly FulfillmentModeOption[] = [
  { mode: 'ManualOnly', icon: 'pi pi-box', titleKey: 'ADMIN.FULFILLMENT.MODE.MANUAL_ONLY', descriptionKey: 'ADMIN.FULFILLMENT.MODE.MANUAL_ONLY_DESC' },
  { mode: 'ManualFirst', icon: 'pi pi-sort-amount-down', titleKey: 'ADMIN.FULFILLMENT.MODE.MANUAL_FIRST', descriptionKey: 'ADMIN.FULFILLMENT.MODE.MANUAL_FIRST_DESC' },
  { mode: 'SupplierFirst', icon: 'pi pi-sort-amount-up', titleKey: 'ADMIN.FULFILLMENT.MODE.SUPPLIER_FIRST', descriptionKey: 'ADMIN.FULFILLMENT.MODE.SUPPLIER_FIRST_DESC' },
  { mode: 'SupplierOnly', icon: 'pi pi-cloud', titleKey: 'ADMIN.FULFILLMENT.MODE.SUPPLIER_ONLY', descriptionKey: 'ADMIN.FULFILLMENT.MODE.SUPPLIER_ONLY_DESC' },
];

/**
 * The per-variant Fulfillment section — mode selection, readiness summary, and the fulfillment chain
 * (every eligible supplier mapping, in the order the backend router actually uses). Sits alongside
 * `app-variant-inventory-panel` in the same variant detail dialog/drawer
 * (`product-variant-manager`). Purely a thin view over already-existing backend functionality
 * (`ProductEditorFacade.setVariantFulfillmentMode`, `GET /suppliers/fulfillment-chain`) — this
 * component makes no fulfillment decisions of its own; the backend remains the sole authority for
 * which source(s) actually get used on a real paid order.
 */
@Component({
  selector: 'app-variant-fulfillment-panel',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    TranslatePipe,
    ButtonModule,
    HasPermissionPipe,
    AdminSectionCardComponent,
    AdminStatusBadgeComponent,
    AdminErrorAlertComponent,
    AdminConfirmDialogComponent,
    FulfillmentChainListComponent,
    SupplierCatalogSearchDrawerComponent,
  ],
  providers: [SuppliersManagementFacade],
  templateUrl: './variant-fulfillment-panel.component.html',
  styleUrl: './variant-fulfillment-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantFulfillmentPanelComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly suppliersFacade = inject(SuppliersManagementFacade);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly modeOptions = MODE_OPTIONS;

  protected readonly selectedVariant = this.facade.selectedVariant;
  protected readonly productId = this.facade.productId;

  protected readonly chain = this.suppliersFacade.fulfillmentChain;
  protected readonly chainLoading = this.suppliersFacade.fulfillmentChainLoading;
  protected readonly chainError = this.suppliersFacade.fulfillmentChainError;

  protected readonly saving = signal(false);
  protected readonly confirmDialogOpen = signal(false);
  protected readonly confirmMessage = signal('');
  private pendingMode: FulfillmentMode | null = null;

  private readonly loadedForVariantId = signal<string | null>(null);

  protected readonly manualAllowed = computed(() => {
    const mode = this.selectedVariant()?.fulfillmentMode;
    return mode === 'ManualOnly' || mode === 'ManualFirst';
  });

  protected readonly supplierChainRequired = computed(() => {
    const mode = this.selectedVariant()?.fulfillmentMode;
    return mode === 'ManualFirst' || mode === 'SupplierFirst' || mode === 'SupplierOnly';
  });

  protected readonly hasReadySupplier = computed(() => this.chain().some((c) => c.isReady));

  protected readonly drawerTarget = signal<SupplierCatalogSearchDrawerTarget | null>(null);

  /** The "Find Supplier Product" quick action targets the first enabled supplier not already covered by
   * this variant's chain — good enough for the common case (one primary automated supplier); an owner
   * managing several automated suppliers for the same variant still has the full Map Products workspace
   * and the Mappings page for anything beyond that. */
  protected readonly unmappedEnabledSupplier = computed(() => {
    const coveredSupplierIds = new Set(this.chain().map((c) => c.supplierId));
    return this.suppliersFacade.list()?.items.find((s) => s.isEnabled && !coveredSupplierIds.has(s.id)) ?? null;
  });

  /** Overall readiness for the currently-selected mode — drives the summary badge. */
  protected readonly overallReadiness = computed<'success' | 'warning'>(() => {
    const variant = this.selectedVariant();
    if (!variant) {
      return 'warning';
    }

    if (variant.fulfillmentMode === 'ManualOnly') {
      return variant.availableStock > 0 ? 'success' : 'warning';
    }

    if (variant.fulfillmentMode === 'SupplierOnly' || variant.fulfillmentMode === 'SupplierFirst') {
      return this.hasReadySupplier() ? 'success' : 'warning';
    }

    // ManualFirst: ready as long as either source can cover it.
    return variant.availableStock > 0 || this.hasReadySupplier() ? 'success' : 'warning';
  });

  constructor() {
    // Needed only to resolve `unmappedEnabledSupplier` above — safe to load once regardless of
    // permissions the way `fulfillment-chain` already is (see its own endpoint remarks).
    void this.suppliersFacade.loadSuppliers();

    effect(() => {
      const variant = this.selectedVariant();
      const productId = this.productId();

      if (!variant || !productId) {
        this.loadedForVariantId.set(null);
        this.suppliersFacade.clearFulfillmentChain();
        return;
      }

      if (this.loadedForVariantId() !== variant.id) {
        this.loadedForVariantId.set(variant.id);
        void this.suppliersFacade.loadFulfillmentChain(productId, variant.id);
      }
    });
  }

  protected openFindSupplierProduct(): void {
    const supplier = this.unmappedEnabledSupplier();
    const variant = this.selectedVariant();
    const productId = this.productId();
    if (!supplier || !variant || !productId) {
      return;
    }

    this.drawerTarget.set({
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId,
      productName: this.facade.product()?.nameEn ?? '',
      variantId: variant.id,
      variantLabel: variant.sku,
    });
  }

  protected onDrawerClosed(): void {
    this.drawerTarget.set(null);
  }

  protected onMappingCreated(): void {
    const variant = this.selectedVariant();
    const productId = this.productId();
    if (variant && productId) {
      void this.suppliersFacade.loadFulfillmentChain(productId, variant.id);
    }
  }

  protected isSelected(mode: FulfillmentMode): boolean {
    return this.selectedVariant()?.fulfillmentMode === mode;
  }

  protected onSelectMode(mode: FulfillmentMode): void {
    const variant = this.selectedVariant();
    if (!variant || this.saving() || mode === variant.fulfillmentMode) {
      return;
    }

    if (this.isDangerousTransition(variant.fulfillmentMode, mode)) {
      this.pendingMode = mode;
      this.confirmMessage.set(
        this.translate.instant(
          mode === 'SupplierOnly' ? 'ADMIN.FULFILLMENT.CONFIRM.TO_SUPPLIER_ONLY' : 'ADMIN.FULFILLMENT.CONFIRM.TO_MANUAL_ONLY',
        ),
      );
      this.confirmDialogOpen.set(true);
      return;
    }

    void this.applyMode(mode);
  }

  protected onConfirmModeChange(): void {
    this.confirmDialogOpen.set(false);
    const mode = this.pendingMode;
    this.pendingMode = null;
    if (mode) {
      void this.applyMode(mode);
    }
  }

  protected onCancelModeChange(): void {
    this.confirmDialogOpen.set(false);
    this.pendingMode = null;
  }

  protected onChainReordered(newOrder: readonly SupplierFulfillmentChainCandidateDto[]): void {
    void this.persistReorder(newOrder);
  }

  /** Only mode transitions that drop a whole fulfillment source's capability are confirmed. */
  private isDangerousTransition(from: FulfillmentMode, to: FulfillmentMode): boolean {
    return (to === 'SupplierOnly' && from !== 'SupplierOnly') || (to === 'ManualOnly' && from !== 'ManualOnly');
  }

  private async applyMode(mode: FulfillmentMode): Promise<void> {
    const variant = this.selectedVariant();
    if (!variant) {
      return;
    }

    this.saving.set(true);
    await this.facade.setVariantFulfillmentMode(variant.id, mode);
    this.saving.set(false);
  }

  private async persistReorder(newOrder: readonly SupplierFulfillmentChainCandidateDto[]): Promise<void> {
    const ok = await this.suppliersFacade.reorderFulfillmentChainPriorities(
      newOrder.map((c) => ({ supplierId: c.supplierId, mappingId: c.mappingId })),
    );

    const variant = this.selectedVariant();
    const productId = this.productId();
    if (ok && variant && productId) {
      await this.suppliersFacade.loadFulfillmentChain(productId, variant.id);
    }
  }
}

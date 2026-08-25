import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { Product } from '../../../../catalog/models/product.model';
import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { HamboxBottomSheetComponent } from '../../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';
import {
  CreateSupplierMappingRequest,
  ProductVariantSupplierMappingDto,
  SupplierCatalogItemDto,
  SupplierListItemDto,
} from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';
import { HamboxProductSelectComponent } from '../hambox-product-select/hambox-product-select.component';
import { SupplierCatalogSelectComponent } from '../supplier-catalog-select/supplier-catalog-select.component';

/**
 * Everything the drawer knows up front — every field is optional except that at least one of
 * `productId`/`supplierId` should normally be set by the caller (an empty target still "works," it just
 * asks the admin for everything). Whichever pieces ARE known let the drawer skip straight past that
 * step, so the exact same component serves a fully-scoped call (one variant, one supplier — the
 * existing `variant-fulfillment-panel`/Map Products call sites) all the way down to a fully-open one
 * (Supplier Mappings page's "+ Map HAMBOX Product", where only the supplier is known).
 */
export interface SupplierCatalogSearchDrawerTarget {
  readonly productId?: string;
  readonly productName?: string;
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly supplierId?: string;
  readonly supplierName?: string;
  /** Pre-seeds the picker with a suggested match (e.g. from a Medium-confidence auto-match) so the
   * owner reviews/confirms it rather than starting a search from scratch. Only meaningful when
   * `variantId`/`supplierId` are also given (a fully-scoped, create-only open). */
  readonly suggestedMatch?: SupplierCatalogItemDto | null;
}

/**
 * The one product-centric "map this variant to a supplier product" workflow — a right-side drawer
 * (bottom sheet on mobile) so the owner never leaves the page they're on, usable from the product
 * catalog list, the product edit page, the Map Products workspace, the per-variant fulfillment panel,
 * and the Supplier Mappings page. Reuses `HamboxProductSelectComponent` (product picker),
 * `SupplierCatalogSelectComponent` (supplier catalog search), and
 * `SuppliersManagementFacade.createMapping`/`updateMapping`/`loadProductVariantMappings` as-is — this
 * component only owns progressive disclosure (ask for whatever isn't already known) and the small set
 * of fields nothing else can supply (buying price, priority).
 */
@Component({
  selector: 'app-supplier-catalog-search-drawer',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DrawerModule,
    InputNumberModule,
    SelectModule,
    HamboxBottomSheetComponent,
    HamboxProductSelectComponent,
    SupplierCatalogSelectComponent,
  ],
  // Self-contained on purpose — every host page (Product Catalog, Product Edit, Supplier Mappings) can
  // drop this element in without also remembering to provide SuppliersManagementFacade itself.
  providers: [SuppliersManagementFacade],
  templateUrl: './supplier-catalog-search-drawer.component.html',
  styleUrl: './supplier-catalog-search-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierCatalogSearchDrawerComponent {
  protected readonly facade = inject(SuppliersManagementFacade);
  protected readonly mobileViewport = inject(MobileViewportService);

  readonly target = input<SupplierCatalogSearchDrawerTarget | null>(null);

  readonly closed = output<void>();
  /** Emitted after a mapping is successfully created or updated — the parent owns refreshing whatever
   * list/badge it's showing. */
  readonly mappingCreated = output<void>();

  protected readonly pickedProduct = signal<Product | null>(null);
  protected readonly productId = signal<string | null>(null);
  protected readonly productName = signal('');
  protected readonly variantId = signal<string | null>(null);
  protected readonly variantLabel = signal('');
  protected readonly supplierId = signal<string | null>(null);
  protected readonly supplierName = signal('');
  /** Non-null means Save updates this existing mapping instead of creating a new one. */
  protected readonly editingMappingId = signal<string | null>(null);

  protected readonly selectedItem = signal<SupplierCatalogItemDto | null>(null);
  protected readonly buyingPrice = signal(0);
  protected readonly priority = signal(100);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly variantMappings = this.facade.productVariantMappings;
  protected readonly variantMappingsLoading = this.facade.productVariantMappingsLoading;
  protected readonly enabledSuppliers = computed(() => this.facade.list()?.items.filter((s) => s.isEnabled) ?? []);

  protected readonly showProductPicker = computed(() => !this.productId());
  protected readonly showVariantList = computed(() => !!this.productId() && this.variantMappings().length > 1);
  protected readonly showSupplierPicker = computed(() => !!this.variantId() && !this.supplierId());
  protected readonly showMappingForm = computed(() => !!this.variantId() && !!this.supplierId());
  protected readonly canConfirm = computed(() => this.selectedItem() !== null && !this.saving());

  constructor() {
    // Opening (or re-targeting) the drawer — seed whatever the caller already knows, ask for the rest.
    effect(() => {
      const target = this.target();
      if (!target) {
        return;
      }

      this.resetAll();

      if (target.productId) {
        this.productId.set(target.productId);
        this.productName.set(target.productName ?? '');
      }

      if (target.variantId) {
        // Fully pre-scoped by the caller (variant-fulfillment-panel, Map Products) — always a fresh
        // mapping to whichever supplier was pinned; existing behavior, unchanged.
        this.variantId.set(target.variantId);
        this.variantLabel.set(target.variantLabel ?? '');
        this.editingMappingId.set(null);
        if (target.supplierId) {
          this.supplierId.set(target.supplierId);
          this.supplierName.set(target.supplierName ?? '');
        }
        this.selectedItem.set(target.suggestedMatch ?? null);
        this.buyingPrice.set(target.suggestedMatch?.minFaceValue ?? 0);
      } else if (target.supplierId) {
        // Supplier already known (Supplier Mappings page entry) — product/variant still to be picked.
        this.supplierId.set(target.supplierId);
        this.supplierName.set(target.supplierName ?? '');
      }

      if (!target.supplierId) {
        void this.facade.loadSuppliers();
      }
    });

    // Product resolved (from the target or the in-drawer picker) — load its variants' mapping state.
    effect(() => {
      const id = this.productId();
      if (id) {
        void this.facade.loadProductVariantMappings(id);
      }
    });

    // Single-variant products never need the list — jump straight to the form.
    effect(() => {
      const mappings = this.variantMappings();
      if (!this.variantId() && mappings.length === 1) {
        this.selectVariantToEdit(mappings[0]);
      }
    });
  }

  protected onProductPicked(product: Product | null): void {
    this.pickedProduct.set(product);
    if (product) {
      this.productId.set(product.id);
      this.productName.set(product.nameEn || product.nameAr);
    }
  }

  /** Used by both the [Map] and [Edit] actions in the variant list — the DTO itself tells us which. */
  protected selectVariantToEdit(entry: ProductVariantSupplierMappingDto): void {
    this.variantId.set(entry.variantId);
    this.variantLabel.set(entry.variantDisplayName);
    this.errorMessage.set(null);

    if (entry.mappingId && entry.supplierId) {
      this.editingMappingId.set(entry.mappingId);
      this.supplierId.set(entry.supplierId);
      this.supplierName.set(entry.supplierName ?? '');
      this.selectedItem.set(
        entry.externalProductId
          ? {
              externalProductId: entry.externalProductId,
              name: entry.externalName ?? entry.externalProductId,
              brandName: null,
              currency: entry.currency ?? 'USD',
              minFaceValue: entry.buyingPrice,
              maxFaceValue: entry.buyingPrice,
              available: entry.availabilityState !== 'Unavailable',
            }
          : null,
      );
      this.buyingPrice.set(entry.buyingPrice ?? 0);
      this.priority.set(entry.priority ?? 100);
      return;
    }

    this.editingMappingId.set(null);
    const pinnedSupplierId = this.target()?.supplierId;
    if (pinnedSupplierId) {
      this.supplierId.set(pinnedSupplierId);
      this.supplierName.set(this.target()?.supplierName ?? '');
    } else {
      this.supplierId.set(null);
      this.supplierName.set('');
    }
    this.selectedItem.set(null);
    this.buyingPrice.set(0);
    this.priority.set(100);
  }

  protected onSupplierPicked(supplier: SupplierListItemDto): void {
    this.supplierId.set(supplier.id);
    this.supplierName.set(supplier.name);
  }

  protected onSelectedChange(item: SupplierCatalogItemDto | null): void {
    this.selectedItem.set(item);
    if (item) {
      this.buyingPrice.set(item.minFaceValue ?? 0);
    }
  }

  protected async confirm(): Promise<void> {
    const supplierId = this.supplierId();
    const productId = this.productId();
    const variantId = this.variantId();
    const item = this.selectedItem();
    if (!supplierId || !productId || !variantId || !item) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const editingId = this.editingMappingId();
    const success = editingId
      ? await this.facade.updateMapping(supplierId, editingId, {
          externalProductId: item.externalProductId,
          externalSku: null,
          externalName: item.name,
          buyingPrice: this.buyingPrice(),
          currency: item.currency,
          priority: this.priority(),
          status: 'Active',
        })
      : await this.facade.createMapping(supplierId, {
          internalProductId: productId,
          internalProductVariantId: variantId,
          externalProductId: item.externalProductId,
          externalSku: null,
          externalName: item.name,
          buyingPrice: this.buyingPrice(),
          currency: item.currency,
          priority: this.priority(),
        } satisfies CreateSupplierMappingRequest);

    this.saving.set(false);

    if (success) {
      // Refresh this product's variant list in place so re-clicking [Edit] right away (or switching
      // to another variant) sees the just-saved state, without waiting for the host page to re-open us.
      await this.facade.loadProductVariantMappings(productId);
      this.mappingCreated.emit();
      this.closed.emit();
    } else {
      this.errorMessage.set('ADMIN.SUPPLIERS.MAP_PRODUCTS.DRAWER.SAVE_FAILED');
    }
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.resetAll();
      this.closed.emit();
    }
  }

  protected cancel(): void {
    this.resetAll();
    this.closed.emit();
  }

  private resetAll(): void {
    this.pickedProduct.set(null);
    this.productId.set(null);
    this.productName.set('');
    this.variantId.set(null);
    this.variantLabel.set('');
    this.supplierId.set(null);
    this.supplierName.set('');
    this.editingMappingId.set(null);
    this.selectedItem.set(null);
    this.buyingPrice.set(0);
    this.priority.set(100);
    this.errorMessage.set(null);
    this.facade.clearProductVariantMappings();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ProductVariantDto } from '../../../../catalog/models/inventory-api.model';
import { Product } from '../../../../catalog/models/product.model';
import { ProductApiService } from '../../../../catalog/services/product-api.service';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { HamboxProductSelectComponent } from '../../components/hambox-product-select/hambox-product-select.component';
import { HamboxVariantSelectComponent } from '../../components/hambox-variant-select/hambox-variant-select.component';
import { SupplierCatalogSelectComponent } from '../../components/supplier-catalog-select/supplier-catalog-select.component';
import { SupplierCatalogItemDto, SupplierMappingDto } from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

type MappingScope = 'product' | 'variant';

@Component({
  selector: 'app-supplier-mappings-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    RadioButtonModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    HamboxProductSelectComponent,
    HamboxVariantSelectComponent,
    SupplierCatalogSelectComponent,
    HamboxDatePipe,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './supplier-mappings-page.component.html',
  styleUrl: './supplier-mappings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierMappingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly productApi = inject(ProductApiService);
  protected readonly facade = inject(SuppliersManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly supplierId = signal('');
  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.SUPPLIERS.LIST.TITLE'), route: '/admin/suppliers' },
      { label: this.facade.detail()?.name ?? '', route: `/admin/suppliers/${this.supplierId()}` },
      { label: this.translate.instant('ADMIN.SUPPLIERS.MAPPINGS.TITLE') },
    ),
  );

  protected readonly mappings = this.facade.mappings;
  protected readonly loading = this.facade.mappingsLoading;
  protected readonly error = this.facade.mappingsError;

  protected readonly dialogOpen = signal(false);
  protected readonly editingMapping = signal<SupplierMappingDto | null>(null);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<SupplierMappingDto | null>(null);
  protected readonly saving = signal(false);

  protected readonly statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  // Selection state — this is the whole point of the redesign: the admin picks real products, the ids
  // are derived from these selections at save time, never typed in directly.
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly scope = signal<MappingScope>('product');
  protected readonly selectedVariant = signal<ProductVariantDto | null>(null);
  protected readonly selectedCatalogItem = signal<SupplierCatalogItemDto | null>(null);
  protected readonly buyingPriceTouched = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    buyingPrice: [0, [Validators.required, Validators.min(0)]],
    priority: [100, [Validators.required, Validators.min(0)]],
    status: ['Active'],
  });

  /** Currency is derived, never typed — from the selected supplier catalog item once picked, otherwise the existing mapping's currency in edit mode. */
  protected readonly currency = computed(() => this.selectedCatalogItem()?.currency ?? this.editingMapping()?.currency ?? 'USD');

  protected readonly canSave = computed(() => {
    if (this.form.invalid) {
      return false;
    }
    if (this.editingMapping()) {
      // Edit mode: internal product/variant are immutable, only the supplier product/pricing/priority/status change.
      return this.selectedCatalogItem() !== null || !!this.editingMapping()?.externalProductId;
    }
    if (!this.selectedProduct()) {
      return false;
    }
    if (this.scope() === 'variant' && !this.selectedVariant()) {
      return false;
    }
    return this.selectedCatalogItem() !== null;
  });

  ngOnInit(): void {
    const supplierId = this.route.snapshot.paramMap.get('id');
    if (!supplierId) {
      return;
    }

    this.supplierId.set(supplierId);
    void this.facade.loadDetail(supplierId);
    void this.facade.loadMappings(supplierId);
  }

  protected openCreateDialog(): void {
    this.editingMapping.set(null);
    this.resetSelectionState();
    this.form.reset({ buyingPrice: 0, priority: 100, status: 'Active' });
    this.dialogOpen.set(true);
  }

  protected async openEditDialog(mapping: SupplierMappingDto): Promise<void> {
    this.editingMapping.set(mapping);
    this.resetSelectionState();
    this.form.reset({ buyingPrice: mapping.buyingPrice, priority: mapping.priority, status: mapping.status });
    // Pre-populate the read-only "what this maps to" summary from the mapping's own already-known
    // display fields — no extra product lookup needed for the internal side in edit mode.
    this.scope.set(mapping.internalProductVariantId ? 'variant' : 'product');
    this.dialogOpen.set(true);

    // Best-effort: load the real Product so the header shows a name even before any edit — falls back
    // to the mapping's own enriched name if this lookup fails, never blocks opening the dialog.
    try {
      const product = await firstValueFrom(this.productApi.getProductById(mapping.internalProductId));
      this.selectedProduct.set(product);
    } catch {
      // Enrichment only — the mapping's own internalProductName (already loaded in the list) still displays.
    }
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingMapping.set(null);
    this.resetSelectionState();
  }

  protected onProductSelected(product: Product | null): void {
    this.selectedProduct.set(product);
    this.scope.set('product');
    this.selectedVariant.set(null);
  }

  protected onScopeChange(scope: MappingScope): void {
    this.scope.set(scope);
    if (scope === 'product') {
      this.selectedVariant.set(null);
    }
  }

  protected onVariantSelected(variant: ProductVariantDto | null): void {
    this.selectedVariant.set(variant);
  }

  protected onCatalogItemSelected(item: SupplierCatalogItemDto | null): void {
    this.selectedCatalogItem.set(item);
    // Sensible default, still an editable override (Phase 7): only auto-fill while the admin hasn't
    // typed their own buying price yet, and only when the catalog gives a concrete face value.
    if (item && !this.buyingPriceTouched() && item.minFaceValue !== null) {
      this.form.controls.buyingPrice.setValue(item.minFaceValue);
    }
  }

  protected onBuyingPriceInput(): void {
    this.buyingPriceTouched.set(true);
  }

  protected async saveMapping(): Promise<void> {
    if (!this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    const supplierId = this.supplierId();
    const editing = this.editingMapping();
    const catalogItem = this.selectedCatalogItem();

    const success = editing
      ? await this.facade.updateMapping(supplierId, editing.id, {
          externalProductId: catalogItem?.externalProductId ?? editing.externalProductId,
          externalSku: editing.externalSku,
          externalName: catalogItem?.name ?? editing.externalName,
          buyingPrice: value.buyingPrice,
          currency: this.currency(),
          priority: value.priority,
          status: value.status as SupplierMappingDto['status'],
        })
      : await this.facade.createMapping(supplierId, {
          internalProductId: this.selectedProduct()!.id,
          internalProductVariantId: this.scope() === 'variant' ? (this.selectedVariant()?.id ?? null) : null,
          externalProductId: catalogItem!.externalProductId,
          externalSku: null, // Bamboo's catalog has no SKU concept — never fabricated (see SupplierCatalogItemDto)
          externalName: catalogItem!.name,
          buyingPrice: value.buyingPrice,
          currency: this.currency(),
          priority: value.priority,
        });

    this.saving.set(false);

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.MAPPING_SAVED'),
        life: 4000,
      });
      this.closeDialog();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      detail: this.facade.mappingsError() ?? '',
      life: 5000,
    });
  }

  protected requestDelete(mapping: SupplierMappingDto): void {
    this.deleteTarget.set(mapping);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const mapping = this.deleteTarget();
    const supplierId = this.supplierId();
    if (!mapping) {
      return;
    }

    const success = await this.facade.deleteMapping(supplierId, mapping.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.MAPPING_DELETED'),
        life: 4000,
      });
    }

    this.deleteDialogOpen.set(false);
    this.deleteTarget.set(null);
  }

  protected retryLoad(): void {
    void this.facade.loadMappings(this.supplierId());
  }

  private resetSelectionState(): void {
    this.selectedProduct.set(null);
    this.scope.set('product');
    this.selectedVariant.set(null);
    this.selectedCatalogItem.set(null);
    this.buyingPriceTouched.set(false);
  }
}

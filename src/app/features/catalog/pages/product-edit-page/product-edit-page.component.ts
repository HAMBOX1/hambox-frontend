import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { debounceTime } from 'rxjs';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import {
  SupplierCatalogSearchDrawerComponent,
  SupplierCatalogSearchDrawerTarget,
} from '../../../admin/suppliers/components/supplier-catalog-search-drawer/supplier-catalog-search-drawer.component';
import { SuppliersManagementFacade } from '../../../admin/suppliers/services/suppliers-management.facade';
import { ProductAssetsUploadComponent } from '../../components/product-assets-upload/product-assets-upload.component';
import { ProductBasicInfoFormComponent } from '../../components/product-basic-info-form/product-basic-info-form.component';
import { ProductInstructionsPanelComponent } from '../../components/product-instructions-panel/product-instructions-panel.component';
import { ProductUsageInstructionsCardComponent } from '../../components/product-usage-instructions-card/product-usage-instructions-card.component';
import { ProductPurchaseControlsPanelComponent } from '../../components/product-purchase-controls-panel/product-purchase-controls-panel.component';
import { ProductOptionGroupsPanelComponent } from '../../components/product-option-groups-panel/product-option-groups-panel.component';
import { ProductVariantManagerComponent } from '../../components/product-variant-manager/product-variant-manager.component';
import { ProductStatus, UpdateProductRequest } from '../../models/product.model';
import { ProductEditorFacade } from '../../services/product-editor.facade';
import { AdminPageTitleService } from '../../../admin/services/admin-page-title.service';

import { TranslateService } from '@ngx-translate/core';
const STATUS_OPTIONS: { label: string; value: ProductStatus }[] = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

@Component({
  selector: 'app-product-edit-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TranslatePipe,
    ToastModule,
    ButtonModule,
    SelectModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
    ProductBasicInfoFormComponent,
    ProductAssetsUploadComponent,
    ProductOptionGroupsPanelComponent,
    ProductVariantManagerComponent,
    ProductInstructionsPanelComponent,
    ProductUsageInstructionsCardComponent,
    ProductPurchaseControlsPanelComponent,
    SupplierCatalogSearchDrawerComponent,
  ],
  providers: [ProductEditorFacade, SuppliersManagementFacade, MessageService],
  templateUrl: './product-edit-page.component.html',
  styleUrl: './product-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditPageComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly facade = inject(ProductEditorFacade);
  private readonly pageTitle = inject(AdminPageTitleService);
  protected readonly suppliersFacade = inject(SuppliersManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly productForm = viewChild('productForm', { read: ProductBasicInfoFormComponent });
  private readonly assetsUpload = viewChild(ProductAssetsUploadComponent);
  private readonly variantManager = viewChild(ProductVariantManagerComponent);
  private readonly variantsAnchor = viewChild<ElementRef<HTMLElement>>('variantsAnchor');
  private readonly imagesAnchor = viewChild<ElementRef<HTMLElement>>('imagesAnchor');
  private hasScrolledToFragment = false;
  private hasOpenedDeepLinkedVariant = false;
  private readonly draftCreatingState = signal(false);

  protected readonly permissions = PERMISSIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly product = this.facade.product;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly loadFailed = this.facade.loadFailed;
  protected readonly categories = this.facade.categories;
  protected readonly categoriesLoading = this.facade.categoriesLoading;
  protected readonly collections = this.facade.collections;
  protected readonly collectionsLoading = this.facade.collectionsLoading;
  protected readonly formSnapshot = this.facade.formSnapshot;
  protected readonly submitting = this.facade.submitting;
  protected readonly productId = this.facade.productId;
  protected readonly variants = this.facade.variants;
  protected readonly totalVariantCount = this.facade.totalVariantCount;
  protected readonly activeVariantCount = this.facade.activeVariantCount;

  protected readonly variantMappings = this.suppliersFacade.productVariantMappings;
  protected readonly variantMappingsLoading = this.suppliersFacade.productVariantMappingsLoading;
  protected readonly mappedVariantCount = computed(() => this.variantMappings().filter((m) => m.mappingId).length);
  protected readonly hasAnyMapping = computed(() => this.mappedVariantCount() > 0);
  protected readonly fullyMapped = computed(
    () => this.hasAnyMapping() && this.mappedVariantCount() === this.variantMappings().length,
  );
  /** First mapped variant's supplier — good enough for the summary line; the drawer shows the full
   * per-variant breakdown when a product is mapped to more than one supplier. */
  protected readonly primaryMappingSupplierName = computed(
    () => this.variantMappings().find((m) => m.supplierName)?.supplierName ?? null,
  );
  protected readonly mappingDrawerTarget = signal<SupplierCatalogSearchDrawerTarget | null>(null);
  private loadedMappingsForProductId: string | null = null;

  /** True once the owner has changed the General form or staged an image change since the last save. Drives the floating save bar. */
  protected readonly dirty = computed(
    () => (this.productForm()?.dirty() ?? false) || (this.assetsUpload()?.dirty() ?? false),
  );
  private readonly justSavedState = signal(false);
  /** Brief "Saved" flash after a successful save, so the bar doesn't just vanish the instant dirty flips back to false. */
  protected readonly justSaved = this.justSavedState.asReadonly();
  /** Gated on an existing product — pre-draft there's no Save button to match, so the bar has nothing to announce. */
  protected readonly showFloatingSaveBar = computed(
    () => !!this.product() && (this.dirty() || this.submitting() || this.justSaved()),
  );

  private justSavedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.justSavedTimeout !== null) {
        clearTimeout(this.justSavedTimeout);
      }
    });
    afterNextRender(() => this.setupAutoDraft());
    effect(() => this.pageTitle.setTitle(this.product()?.nameEn || 'New Product'));
    effect(() => {
      const id = this.productId();
      if (id && this.loadedMappingsForProductId !== id) {
        this.loadedMappingsForProductId = id;
        void this.suppliersFacade.loadProductVariantMappings(id);
      }
    });
    effect(() => {
      if (this.hasOpenedDeepLinkedVariant || this.loading() || !this.product()) {
        return;
      }

      const variantId = this.route.snapshot.queryParamMap.get('editVariant');
      if (!variantId) {
        return;
      }

      const manager = this.variantManager();
      if (!manager) {
        return;
      }

      this.hasOpenedDeepLinkedVariant = true;
      manager.openEditDialogForVariant(variantId);
    });

    effect(() => {
      if (this.hasScrolledToFragment || this.loading() || !this.product()) {
        return;
      }
      const fragment = this.route.snapshot.fragment;
      if (fragment === 'variants') {
        const anchor = this.variantsAnchor();
        if (!anchor) {
          return;
        }

        this.hasScrolledToFragment = true;
        anchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (fragment === 'images') {
        const anchor = this.imagesAnchor();
        const upload = this.assetsUpload();
        if (!anchor || !upload) {
          return;
        }

        this.hasScrolledToFragment = true;
        anchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        upload.openFilePicker();
      }
    });
  }

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      void this.facade.load(productId);
      return;
    }

    // No :id — this is the "Create Product" route. Nothing to load yet; the draft product
    // is created silently in the background once the admin enters a name and category.
    void this.facade.loadCategories();
    void this.facade.loadCollections();
  }

  /** Watches the General form and, on a pause in typing, either silently creates the backend Draft
   * product (before one exists) or silently persists the edit (once it does and is still
   * unpublished) — so the admin is always "just editing a product" and never loses in-progress work
   * to a missed Save click or a closed tab. */
  private setupAutoDraft(): void {
    const form = this.productForm();
    if (!form) {
      return;
    }

    form.valueChanges$.pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.product()) {
        void this.maybeAutoSaveDraft();
      } else {
        void this.maybeCreateDraft();
      }
    });
  }

  /** Auto-save for a Draft-status product: silent (no toast, no navigation) and a no-op unless the
   * form is both dirty and currently valid, so a mid-edit blank required field just skips this
   * cycle rather than surfacing a validation error the admin didn't ask for. Scoped to Draft status
   * only — once a product is Active, edits go through the explicit Save button like any other
   * change to something already live. */
  private async maybeAutoSaveDraft(): Promise<void> {
    const product = this.product();
    const form = this.productForm();
    if (!product || product.status !== 'Draft' || this.submitting() || !form?.dirty()) {
      return;
    }

    const value = form.getValue();
    if (!value) {
      return;
    }

    const saved = await this.facade.updateProduct({ ...value, status: product.status });
    if (saved) {
      this.flashSaved();
    }
  }

  private async maybeCreateDraft(): Promise<void> {
    if (this.product() || this.draftCreatingState()) {
      return;
    }

    const form = this.productForm();
    if (!form) {
      return;
    }

    const snapshot = form.getDraftSnapshot();
    const nameEn = snapshot.nameEn.trim();
    const categoryId = snapshot.categoryId;
    if (!nameEn || !categoryId) {
      return;
    }

    this.draftCreatingState.set(true);
    try {
      const id = await this.facade.createDraft({
        nameEn,
        nameAr: snapshot.nameAr.trim(),
        descriptionEn: snapshot.descriptionEn.trim(),
        descriptionAr: snapshot.descriptionAr.trim(),
        price: snapshot.price,
        categoryId,
        additionalCategoryIds: snapshot.additionalCategoryIds,
        collectionIds: snapshot.collectionIds,
      });
      if (!id) {
        return;
      }

      this.location.replaceState(`/admin/products/${id}/edit`);
    } finally {
      this.draftCreatingState.set(false);
    }
  }

  protected statusTone(status: ProductStatus): 'success' | 'warning' | 'info' | 'neutral' {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Inactive':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  protected onCategoryCreated(): void {
    void this.facade.loadCategories();
  }

  protected onCollectionCreated(): void {
    void this.facade.loadCollections();
  }

  protected onCancel(): void {
    void this.router.navigate(['/admin/products']);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.dirty() && !this.submitting()) {
        void this.onSave();
      }
    }
  }

  protected async onSave(navigateAway = false): Promise<boolean> {
    const product = this.product();
    const form = this.productForm();

    const generalValue = form?.getGeneralValue();
    const price = form?.getPriceValue();

    if (!generalValue || price === null || price === undefined || !product) {
      // Reveal the inline message on every invalid field (they only show once touched).
      form?.validate();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.VALIDATION_REQUIRED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.FIX_FIELDS'),
        life: 5000,
      });
      return false;
    }

    const updateRequest: UpdateProductRequest = {
      ...generalValue,
      price,
      status: product.status,
    };

    const saved = await this.facade.updateProduct(updateRequest);
    if (saved) {
      const assetsUpload = this.assetsUpload();
      if (assetsUpload?.dirty()) {
        await assetsUpload.commitChanges(product.id);
      }

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.PRODUCT_SAVED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.PRODUCT_SAVED_DETAIL', { p0: updateRequest.nameEn }),
        life: 4000,
      });
      this.flashSaved();
      if (navigateAway) {
        void this.router.navigate(['/admin/products']);
      }
      return true;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.CATALOG_TOASTS.SAVE_FAILED'),
      detail: this.facade.submitError() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.SAVE_PRODUCT_FAILED'),
      life: 5000,
    });
    return false;
  }

  private flashSaved(): void {
    if (this.justSavedTimeout !== null) {
      clearTimeout(this.justSavedTimeout);
    }
    this.justSavedState.set(true);
    this.justSavedTimeout = setTimeout(() => this.justSavedState.set(false), 2000);
  }

  protected async onStatusChange(status: ProductStatus): Promise<void> {
    const updated = await this.facade.updateStatus(status);
    if (updated) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.STATUS_UPDATED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.STATUS_CHANGED_TO', { p0: this.translate.instant(`ADMIN.CATALOG_PAGE.STATUS_VALUES.${status}`) }),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.CATALOG_TOASTS.STATUS_UPDATE_FAILED'),
      detail: this.facade.submitError() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.STATUS_UPDATE_PRODUCT_FAILED'),
      life: 5000,
    });
  }

  protected onPreview(): void {
    const id = this.productId();
    if (!id) {
      return;
    }

    window.open(`/products/${id}?preview=1`, '_blank', 'noopener');
  }

  protected async onPublish(): Promise<void> {
    // Publishing acts on what is stored, so pending edits are saved first; if that save fails (or is blocked by
    // validation) the product is not published with stale values.
    if (this.dirty() && !(await this.onSave())) {
      return;
    }

    const saved = await this.facade.publishProduct();
    if (saved) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.CATALOG_TOASTS.PRODUCT_PUBLISHED'),
        detail: this.translate.instant('ADMIN.CATALOG_TOASTS.PRODUCT_PUBLISHED_DETAIL'),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.CATALOG_TOASTS.PUBLISH_FAILED'),
      detail: this.facade.submitError() ?? this.translate.instant('ADMIN.CATALOG_TOASTS.PUBLISH_PRODUCT_FAILED'),
      life: 6000,
    });
  }

  protected openMappingDrawer(): void {
    const id = this.productId();
    if (!id) {
      return;
    }

    this.mappingDrawerTarget.set({ productId: id, productName: this.product()?.nameEn ?? '' });
  }

  protected onMappingDrawerClosed(): void {
    this.mappingDrawerTarget.set(null);
  }

  protected onMappingDrawerCreated(): void {
    const id = this.productId();
    if (id) {
      void this.suppliersFacade.loadProductVariantMappings(id);
    }
  }
}

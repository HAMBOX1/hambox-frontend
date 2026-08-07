import { computed, inject, Injectable, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';



import { ApiError, parseApiError } from '../../../core/models/api-error.model';

import { CategoryOption } from '../models/category.model';

import { CollectionOption } from '../models/collection.model';

import { isVariantLive } from '../utils/variant-status.utils';

import {

  CreateProductRequest,

  Product,

  ProductDraftFormSnapshot,

  ProductImage,

  ProductStatus,

  UpdateProductRequest,

} from '../models/product.model';

import {

  CreateBatchRequest,

  CreateOptionGroupRequest,

  CreateOptionRequest,

  CreateSupplierRequest,

  CreateVariantRequest,

  DigitalInventoryCodeDto,

  GenerateProductVariantsResultDto,

  ImportCodesResultDto,

  InventoryAuditLogDto,

  BulkUpdateVariantsRequest,

  InventoryBatchDto,

  InventoryStatisticsDto,

  InventorySupplierDto,

  ProductOptionGroupDto,

  ProductVariantDto,

  UpdateOptionGroupRequest,

  UpdateOptionRequest,

  UpdateVariantRequest,

} from '../models/inventory-api.model';

import { CategoryApiService } from './category-api.service';

import { CollectionApiService } from './collection-api.service';

import { InventoryApiService } from './inventory-api.service';

import { ProductApiService } from './product-api.service';



const CATEGORY_PAGE_SIZE = 100;

const COLLECTION_PAGE_SIZE = 200;

const DEFAULT_CODE_PAGE_SIZE = 25;



export interface CodeListFilters {

  readonly status?: string;

  readonly searchTerm?: string;

  readonly pageNumber?: number;

  readonly pageSize?: number;

}



@Injectable()

export class ProductEditorFacade {

  private readonly productApi = inject(ProductApiService);

  private readonly categoryApi = inject(CategoryApiService);

  private readonly collectionApi = inject(CollectionApiService);

  private readonly inventoryApi = inject(InventoryApiService);



  private readonly productState = signal<Product | null>(null);

  private readonly imagesState = signal<readonly ProductImage[]>([]);

  private readonly categoriesState = signal<readonly CategoryOption[]>([]);

  private readonly collectionsState = signal<readonly CollectionOption[]>([]);

  private readonly variantsState = signal<readonly ProductVariantDto[]>([]);

  private readonly optionGroupsState = signal<readonly ProductOptionGroupDto[]>([]);

  private readonly statisticsState = signal<InventoryStatisticsDto | null>(null);

  private readonly variantGenerationState = signal<GenerateProductVariantsResultDto | null>(null);

  private readonly variantSyncErrorState = signal<string | null>(null);

  private readonly batchesState = signal<readonly InventoryBatchDto[]>([]);

  private readonly codesState = signal<readonly DigitalInventoryCodeDto[]>([]);

  private readonly selectedVariantIdState = signal<string | null>(null);

  private readonly selectedBatchIdState = signal<string | null>(null);

  private readonly codesPageState = signal(1);

  private readonly codesPageSizeState = signal(DEFAULT_CODE_PAGE_SIZE);

  private readonly codesHasMoreState = signal(false);

  private readonly auditLogsState = signal<readonly InventoryAuditLogDto[]>([]);

  private readonly auditLogsLoadingState = signal(false);

  private readonly suppliersState = signal<readonly InventorySupplierDto[]>([]);

  private readonly suppliersLoadingState = signal(false);

  private suppliersLoaded = false;

  private draftCreationInFlight: Promise<string | null> | null = null;

  private readonly loadingState = signal(false);

  private readonly inventoryLoadingState = signal(false);

  private readonly categoriesLoadingState = signal(false);

  private readonly collectionsLoadingState = signal(false);

  private readonly errorState = signal<string | null>(null);

  private readonly submittingState = signal(false);

  private readonly submitErrorState = signal<string | null>(null);



  readonly product = this.productState.asReadonly();

  readonly images = this.imagesState.asReadonly();

  readonly categories = this.categoriesState.asReadonly();

  readonly collections = this.collectionsState.asReadonly();

  readonly collectionsLoading = this.collectionsLoadingState.asReadonly();

  readonly variants = this.variantsState.asReadonly();

  /** Canonical "variant count" — every non-deleted variant, any status. The single source of truth for the Edit Product header. */
  readonly totalVariantCount = computed(() => this.variantsState().length);

  /** Active + visible subset, i.e. sellable on the storefront right now — shown alongside the total so the two never look like a disagreement. */
  readonly activeVariantCount = computed(() => this.variantsState().filter(isVariantLive).length);

  readonly optionGroups = this.optionGroupsState.asReadonly();

  readonly statistics = this.statisticsState.asReadonly();

  readonly variantGenerationResult = this.variantGenerationState.asReadonly();

  readonly variantSyncError = this.variantSyncErrorState.asReadonly();

  readonly batches = this.batchesState.asReadonly();

  readonly codes = this.codesState.asReadonly();

  readonly loading = this.loadingState.asReadonly();

  readonly inventoryLoading = this.inventoryLoadingState.asReadonly();

  readonly categoriesLoading = this.categoriesLoadingState.asReadonly();

  readonly error = this.errorState.asReadonly();

  readonly submitting = this.submittingState.asReadonly();

  readonly submitError = this.submitErrorState.asReadonly();

  readonly selectedVariantId = this.selectedVariantIdState.asReadonly();

  readonly selectedBatchId = this.selectedBatchIdState.asReadonly();

  readonly codesPage = this.codesPageState.asReadonly();

  readonly codesPageSize = this.codesPageSizeState.asReadonly();

  readonly codesHasMore = this.codesHasMoreState.asReadonly();

  readonly auditLogs = this.auditLogsState.asReadonly();

  readonly auditLogsLoading = this.auditLogsLoadingState.asReadonly();

  readonly suppliers = this.suppliersState.asReadonly();

  readonly suppliersLoading = this.suppliersLoadingState.asReadonly();



  readonly productId = computed(() => this.productState()?.id ?? null);

  readonly formSnapshot = computed<ProductDraftFormSnapshot | null>(() => {

    const product = this.productState();

    if (!product) {

      return null;

    }



    return {

      nameEn: product.nameEn,

      nameAr: product.nameAr,

      descriptionEn: product.descriptionEn,

      descriptionAr: product.descriptionAr,

      price: product.price,

      categoryId: product.categoryId,

      additionalCategoryIds: product.additionalCategoryIds ?? [],

      collectionIds: product.collectionIds ?? [],

      publicReleaseOnUtc: product.publicReleaseOnUtc ?? null,

    };

  });



  readonly selectedVariant = computed(() => {

    const id = this.selectedVariantIdState();

    return this.variantsState().find((variant) => variant.id === id) ?? null;

  });



  readonly selectedBatch = computed(() => {

    const id = this.selectedBatchIdState();

    return this.batchesState().find((batch) => batch.id === id) ?? null;

  });



  /**
   * Silently creates the Draft product behind a brand-new "Create Product" page the moment the
   * admin has entered enough to save (name + category — the backend's minimum valid product).
   * Idempotent and dedupes concurrent callers so rapid typing can't create two products.
   */
  async createDraft(input: { nameEn: string; nameAr: string; categoryId: string }): Promise<string | null> {
    const existingId = this.productId();
    if (existingId) {
      return existingId;
    }

    if (this.draftCreationInFlight) {
      return this.draftCreationInFlight;
    }

    const request: CreateProductRequest = {
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      descriptionEn: '',
      descriptionAr: '',
      price: 0,
      categoryId: input.categoryId,
    };

    this.draftCreationInFlight = (async () => {
      try {
        const id = await firstValueFrom(this.productApi.createProduct(request));
        const product = await firstValueFrom(this.productApi.getProductById(id));

        this.productState.set({ ...product, images: [] });
        this.imagesState.set([]);
        this.variantsState.set([]);
        this.optionGroupsState.set([]);
        this.statisticsState.set(null);

        return id;
      } catch (error) {
        this.errorState.set(this.toErrorMessage(error, 'Failed to create product.'));
        return null;
      }
    })();

    try {
      return await this.draftCreationInFlight;
    } finally {
      this.draftCreationInFlight = null;
    }
  }

  async load(productId: string): Promise<void> {

    this.loadingState.set(true);

    this.errorState.set(null);



    try {

      const [product, images, variants, optionGroups, statistics] = await Promise.all([

        firstValueFrom(this.productApi.getProductById(productId)),

        firstValueFrom(this.productApi.getProductImages(productId)),

        firstValueFrom(this.inventoryApi.getProductVariants(productId)),

        firstValueFrom(this.inventoryApi.getOptionGroups(productId)),

        firstValueFrom(this.inventoryApi.getStatistics(productId)),

      ]);

      await this.loadCategories();

      await this.loadCollections();



      if (product.status === 'Active' && variants.some((variant) => variant.status !== 'Active')) {

        await firstValueFrom(this.inventoryApi.activateProductVariants(productId));

        await this.reloadInventory(productId);

      }



      this.productState.set({ ...product, images });

      this.imagesState.set(images);

      this.variantsState.set(variants);

      this.optionGroupsState.set(optionGroups);

      this.statisticsState.set(statistics);



      if (variants.length > 0) {

        const firstVariantId = this.selectedVariantIdState() ?? variants[0].id;

        await this.selectVariant(firstVariantId);

      } else {

        this.selectedVariantIdState.set(null);

        this.selectedBatchIdState.set(null);

        this.batchesState.set([]);

        this.codesState.set([]);

      }

    } catch (error) {

      this.productState.set(null);

      this.imagesState.set([]);

      this.variantsState.set([]);

      this.optionGroupsState.set([]);

      this.statisticsState.set(null);

      this.errorState.set(this.toErrorMessage(error, 'Failed to load product editor.'));

    } finally {

      this.loadingState.set(false);

    }

  }



  async selectVariant(variantId: string, filters?: CodeListFilters): Promise<void> {

    this.selectedVariantIdState.set(variantId);

    this.auditLogsState.set([]);

    this.inventoryLoadingState.set(true);



    const pageNumber = filters?.pageNumber ?? this.codesPageState();

    const pageSize = filters?.pageSize ?? this.codesPageSizeState();



    try {

      const [batches, codes, statistics] = await Promise.all([

        firstValueFrom(this.inventoryApi.getBatches(variantId)),

        firstValueFrom(

          this.inventoryApi.getCodes(

            variantId,

            pageNumber,

            pageSize,

            filters?.status,

            filters?.searchTerm,

          ),

        ),

        this.productId()

          ? firstValueFrom(this.inventoryApi.getStatistics(this.productId()!, variantId))

          : Promise.resolve(null),

      ]);



      this.batchesState.set(batches);

      this.codesState.set(codes);

      this.codesPageState.set(pageNumber);

      this.codesPageSizeState.set(pageSize);

      this.codesHasMoreState.set(codes.length >= pageSize);



      const currentBatchId = this.selectedBatchIdState();

      if (batches.length === 0) {

        this.selectedBatchIdState.set(null);

      } else if (!currentBatchId || !batches.some((batch) => batch.id === currentBatchId)) {

        this.selectedBatchIdState.set(batches[0].id);

      }



      if (statistics) {

        this.statisticsState.set(statistics);

      }

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to load variant inventory.'));

    } finally {

      this.inventoryLoadingState.set(false);

    }

  }



  selectBatch(batchId: string): void {

    this.selectedBatchIdState.set(batchId);

  }

  /** Lazy — only fetched when the owner opens the History panel for the selected variant, not on every variant switch. */
  async loadAuditLogs(variantId: string): Promise<void> {
    this.auditLogsLoadingState.set(true);
    try {
      const logs = await firstValueFrom(this.inventoryApi.getAuditLogs(variantId));
      this.auditLogsState.set(logs);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to load history.'));
    } finally {
      this.auditLogsLoadingState.set(false);
    }
  }

  /** Lazy and fetched once — only needed by the Advanced import panel / history detail, which most admins never open. */
  async loadSuppliers(): Promise<void> {
    if (this.suppliersLoaded) {
      return;
    }

    this.suppliersLoadingState.set(true);
    try {
      const suppliers = await firstValueFrom(this.inventoryApi.getSuppliers(1, 200));
      this.suppliersState.set(suppliers);
      this.suppliersLoaded = true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to load suppliers.'));
    } finally {
      this.suppliersLoadingState.set(false);
    }
  }



  async updateProduct(request: UpdateProductRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    this.submittingState.set(true);

    this.submitErrorState.set(null);



    try {

      await firstValueFrom(this.productApi.updateProduct(productId, request));

      const [product, images] = await Promise.all([

        firstValueFrom(this.productApi.getProductById(productId)),

        firstValueFrom(this.productApi.getProductImages(productId)),

      ]);

      this.productState.set({ ...product, images });

      this.imagesState.set(images);

      return true;

    } catch (error) {

      this.submitErrorState.set(this.toErrorMessage(error, 'Failed to update product.'));

      return false;

    } finally {

      this.submittingState.set(false);

    }

  }



  async updateStatus(status: ProductStatus): Promise<boolean> {

    const current = this.product()?.status;

    if (!current) {

      return false;

    }



    if (current === status) {

      return true;

    }



    switch (status) {

      case 'Active':

        return this.publishProduct();

      case 'Inactive':

        return this.deactivateProduct();

      case 'Archived':

        return this.archiveProduct();

      case 'Draft': {

        const snapshot = this.formSnapshot();

        if (!snapshot) {

          return false;

        }



        return this.updateProduct({ ...snapshot, status: 'Draft' });

      }

      default:

        return false;

    }

  }



  /** Early Access membership benefit: null makes the product public as soon as it's Active. */
  async updateReleaseDate(publicReleaseOnUtc: string | null): Promise<boolean> {
    const snapshot = this.formSnapshot();
    const status = this.product()?.status;
    if (!snapshot || !status) {
      return false;
    }

    return this.updateProduct({ ...snapshot, status, publicReleaseOnUtc });
  }

  async publishProduct(): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    const published = await this.runProductAction(
      () => firstValueFrom(this.productApi.publishProduct(productId)),
      'Failed to publish product.',
    );

    if (published) {

      try {

        await firstValueFrom(this.inventoryApi.activateProductVariants(productId));

        await this.reloadInventory(productId);

      } catch {

        // Product published; variant activation is best-effort for legacy draft rows.

      }

    }



    return published;

  }



  async deactivateProduct(): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    return this.runProductAction(() => firstValueFrom(this.productApi.deactivateProduct(productId)), 'Failed to deactivate product.');

  }



  async archiveProduct(): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    return this.runProductAction(() => firstValueFrom(this.productApi.archiveProduct(productId)), 'Failed to archive product.');

  }



  async restoreProduct(): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    return this.runProductAction(() => firstValueFrom(this.productApi.restoreProduct(productId)), 'Failed to restore product.');

  }



  async duplicateProduct(nameSuffix?: string | null): Promise<string | null> {

    const productId = this.productId();

    if (!productId) {

      return null;

    }



    try {

      return await firstValueFrom(this.productApi.duplicateProduct(productId, nameSuffix));

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to duplicate product.'));

      return null;

    }

  }



  async deleteProduct(): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.productApi.deleteProduct(productId));

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to delete product.'));

      return false;

    }

  }



  async createOptionGroup(request: CreateOptionGroupRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.createOptionGroup(productId, request));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to create option group.'));

      return false;

    }

  }



  async updateOptionGroup(groupId: string, request: UpdateOptionGroupRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.updateOptionGroup(groupId, request));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to update option group.'));

      return false;

    }

  }



  async deleteOptionGroup(groupId: string, force = false): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.deleteOptionGroup(groupId, force));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to delete option group.'));

      return false;

    }

  }



  async reorderOptionGroups(orderedIds: readonly string[]): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.reorderOptionGroups(productId, { orderedIds }));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to reorder option groups.'));

      return false;

    }

  }



  async createOption(groupId: string, request: CreateOptionRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.createOption(groupId, request));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to create option.'));

      return false;

    }

  }



  async updateOption(optionId: string, request: UpdateOptionRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.updateOption(optionId, request));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to update option.'));

      return false;

    }

  }



  async deleteOption(optionId: string): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.deleteOption(optionId));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to delete option.'));

      return false;

    }

  }



  async reorderOptions(groupId: string, orderedIds: readonly string[]): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.reorderOptions(groupId, { orderedIds }));

      await this.syncVariants(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to reorder options.'));

      return false;

    }

  }



  async createVariant(request: CreateVariantRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      const variantId = await firstValueFrom(this.inventoryApi.createVariant(productId, request));

      await this.reloadInventory(productId);

      await this.selectVariant(variantId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to create variant.'));

      return false;

    }

  }



  async bulkUpdateVariants(request: BulkUpdateVariantsRequest): Promise<number> {

    const productId = this.productId();

    if (!productId) {

      return 0;

    }



    try {

      const updated = await firstValueFrom(this.inventoryApi.bulkUpdateVariants(productId, request));

      await this.reloadInventory(productId);

      return updated;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to update variants.'));

      return 0;

    }

  }



  async bulkDeleteVariants(variantIds: readonly string[]): Promise<number> {
    const productId = this.productId();
    if (!productId || variantIds.length === 0) {
      return 0;
    }

    try {
      const result = await firstValueFrom(this.inventoryApi.bulkDeleteVariants(productId, { variantIds }));
      await this.reloadInventory(productId);
      return result.successCount;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to delete variants.'));
      return 0;
    }
  }

  async bulkDuplicateVariants(variantIds: readonly string[]): Promise<number> {
    const productId = this.productId();
    if (!productId || variantIds.length === 0) {
      return 0;
    }

    try {
      const result = await firstValueFrom(this.inventoryApi.bulkDuplicateVariants(productId, { variantIds }));
      await this.reloadInventory(productId);
      return result.successCount;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to duplicate variants.'));
      return 0;
    }
  }

  async exportVariantsCodes(variantIds: readonly string[], status?: string): Promise<Blob | null> {
    const productId = this.productId();
    if (!productId || variantIds.length === 0) {
      return null;
    }

    try {
      return await firstValueFrom(this.inventoryApi.exportVariantsCodes(productId, variantIds, status));
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to export codes.'));
      return null;
    }
  }

  async updateVariant(variantId: string, request: UpdateVariantRequest): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.updateVariant(variantId, request));

      await this.reloadInventory(productId);

      await this.selectVariant(variantId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to update variant.'));

      return false;

    }

  }



  async deleteVariant(variantId: string): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.deleteVariant(variantId));

      await this.reloadInventory(productId);

      const nextVariant = this.variantsState()[0];

      if (nextVariant) {

        await this.selectVariant(nextVariant.id);

      } else {

        this.selectedVariantIdState.set(null);

        this.batchesState.set([]);

        this.codesState.set([]);

      }

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to delete variant.'));

      return false;

    }

  }



  async duplicateVariant(variantId: string, skuSuffix?: string | null): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      const newVariantId = await firstValueFrom(

        this.inventoryApi.duplicateVariant(variantId, { skuSuffix: skuSuffix ?? null }),

      );

      await this.reloadInventory(productId);

      await this.selectVariant(newVariantId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to duplicate variant.'));

      return false;

    }

  }



  async activateVariant(variantId: string): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.activateVariant(variantId));

      await this.reloadInventory(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to activate variant.'));

      return false;

    }

  }



  async deactivateVariant(variantId: string): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.deactivateVariant(variantId));

      await this.reloadInventory(productId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to deactivate variant.'));

      return false;

    }

  }



  async createBatch(request: CreateBatchRequest): Promise<boolean> {

    const variant = this.selectedVariant();

    const productId = this.productId();

    if (!variant || !productId) {

      return false;

    }



    try {

      const batchId = await firstValueFrom(this.inventoryApi.createBatch(variant.id, request));

      await this.reloadInventory(productId);

      await this.selectVariant(variant.id);

      this.selectedBatchIdState.set(batchId);

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to create batch.'));

      return false;

    }

  }



  async importCodes(codes: readonly string[], batchId?: string): Promise<ImportCodesResultDto | null> {

    const variant = this.selectedVariant();

    const batch = batchId

      ? this.batchesState().find((item) => item.id === batchId)

      : this.selectedBatch();

    const productId = this.productId();

    if (!variant || !batch || !productId || codes.length === 0) {

      return null;

    }



    try {

      const result = await firstValueFrom(this.inventoryApi.importCodes(variant.id, batch.id, { codes }));

      await this.reloadInventory(productId);

      await this.selectVariant(variant.id);

      return result;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to import codes.'));

      return null;

    }

  }



  async disableCode(codeId: string): Promise<boolean> {

    return this.runCodeAction(() => firstValueFrom(this.inventoryApi.disableCode(codeId)));

  }



  async enableCode(codeId: string): Promise<boolean> {

    return this.runCodeAction(() => firstValueFrom(this.inventoryApi.enableCode(codeId)));

  }



  async deleteCode(codeId: string): Promise<boolean> {

    return this.runCodeAction(() => firstValueFrom(this.inventoryApi.deleteCode(codeId)));

  }



  /** Calls the dedicated reveal endpoint. Never caches the plaintext result. */
  async revealCode(codeId: string): Promise<string | null> {
    try {
      const result = await firstValueFrom(this.inventoryApi.revealCode(codeId));
      return result.digitalCode;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to reveal code.'));
      return null;
    }
  }



  async bulkDisableCodes(codeIds: readonly string[]): Promise<boolean> {

    const variant = this.selectedVariant();

    if (!variant || codeIds.length === 0) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.bulkDisableCodes(variant.id, { codeIds }));

      await this.refreshSelectedVariantCodes();

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to disable codes.'));

      return false;

    }

  }



  async bulkDeleteCodes(codeIds: readonly string[]): Promise<boolean> {

    const variant = this.selectedVariant();

    if (!variant || codeIds.length === 0) {

      return false;

    }



    try {

      await firstValueFrom(this.inventoryApi.bulkDeleteCodes(variant.id, { codeIds }));

      await this.refreshSelectedVariantCodes();

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to delete codes.'));

      return false;

    }

  }



  async exportCodes(status?: string): Promise<Blob | null> {

    const variant = this.selectedVariant();

    if (!variant) {

      return null;

    }



    try {

      return await firstValueFrom(this.inventoryApi.exportCodes(variant.id, status));

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to export codes.'));

      return null;

    }

  }



  async createSupplier(request: CreateSupplierRequest): Promise<boolean> {

    try {

      await firstValueFrom(this.inventoryApi.createSupplier(request));

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to create supplier.'));

      return false;

    }

  }



  private async runProductAction(action: () => Promise<void>, fallback: string): Promise<boolean> {

    const productId = this.productId();

    if (!productId) {

      return false;

    }



    this.submittingState.set(true);

    this.submitErrorState.set(null);



    try {

      await action();

      const product = await firstValueFrom(this.productApi.getProductById(productId));

      this.productState.set({ ...product, images: this.imagesState() });

      return true;

    } catch (error) {

      this.submitErrorState.set(this.toErrorMessage(error, fallback));

      return false;

    } finally {

      this.submittingState.set(false);

    }

  }



  private async runCodeAction(action: () => Promise<void>): Promise<boolean> {

    try {

      await action();

      await this.refreshSelectedVariantCodes();

      return true;

    } catch (error) {

      this.errorState.set(this.toErrorMessage(error, 'Failed to update code.'));

      return false;

    }

  }



  private async refreshSelectedVariantCodes(): Promise<void> {

    const variantId = this.selectedVariantIdState();

    const productId = this.productId();

    if (!variantId || !productId) {

      return;

    }



    await this.selectVariant(variantId, {

      pageNumber: this.codesPageState(),

      pageSize: this.codesPageSizeState(),

    });

    await this.reloadInventory(productId);

  }



  /** Best-effort: regenerates variants from the current option groups, then reloads. Fails silently while option groups are mid-edit (e.g. a group with no values yet) — same pattern as publishProduct()'s legacy variant activation. */
  private async syncVariants(productId: string): Promise<void> {
    try {
      const result = await firstValueFrom(this.inventoryApi.generateVariants(productId));
      this.variantGenerationState.set(result);
      this.variantSyncErrorState.set(null);
    } catch (error) {
      const apiError = parseApiError(error);
      // 400 = option groups are incomplete (e.g. a new group with no values yet); expected, not a failure.
      this.variantSyncErrorState.set(
        apiError.status === 400 ? null : this.toErrorMessage(error, 'Failed to regenerate variants.'),
      );
    }

    await this.reloadInventory(productId);
  }

  private async reloadInventory(productId: string): Promise<void> {

    const [variants, optionGroups, statistics] = await Promise.all([

      firstValueFrom(this.inventoryApi.getProductVariants(productId)),

      firstValueFrom(this.inventoryApi.getOptionGroups(productId)),

      firstValueFrom(this.inventoryApi.getStatistics(productId)),

    ]);

    this.variantsState.set(variants);

    this.optionGroupsState.set(optionGroups);

    this.statisticsState.set(statistics);

  }



  async loadCategories(): Promise<void> {

    this.categoriesLoadingState.set(true);



    try {

      const result = await firstValueFrom(

        this.categoryApi.getCategories({

          pageNumber: 1,

          pageSize: CATEGORY_PAGE_SIZE,

          activeOnly: true,

        }),

      );



      this.categoriesState.set(

        (result.items ?? []).map((category) => ({

          id: category.id,

          label: category.nameEn,

          parentId: category.parentId,

        })),

      );

    } catch {

      this.categoriesState.set([]);

    } finally {

      this.categoriesLoadingState.set(false);

    }

  }

  async loadCollections(): Promise<void> {
    this.collectionsLoadingState.set(true);

    try {
      const result = await firstValueFrom(
        this.collectionApi.getCollections({ pageNumber: 1, pageSize: COLLECTION_PAGE_SIZE }),
      );

      this.collectionsState.set(
        (result.items ?? []).map((collection) => ({
          id: collection.id,
          label: collection.name,
          parentId: collection.parentId,
        })),
      );
    } catch {
      this.collectionsState.set([]);
    } finally {
      this.collectionsLoadingState.set(false);
    }
  }



  private toErrorMessage(error: unknown, fallback: string): string {

    if (error instanceof ApiError) {

      return error.message;

    }



    return fallback;

  }

}



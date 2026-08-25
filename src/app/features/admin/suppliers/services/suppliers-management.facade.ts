import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { SUPPLIERS_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  BulkCreateSupplierMappingsResultDto,
  CreateSupplierMappingRequest,
  CreateSupplierRequest,
  ProductSupplierMappingStatusDto,
  ProductVariantSupplierMappingDto,
  SuggestionCandidate,
  SupplierAvailabilitySummaryDto,
  SupplierAvailabilitySyncResultDto,
  SupplierCatalogSearchResultDto,
  SupplierDetailDto,
  SupplierFulfillmentChainCandidateDto,
  SupplierListResult,
  SupplierMappingCandidatesResult,
  SupplierMappingCandidatesSummaryDto,
  SupplierMappingDto,
  SupplierMappingSuggestionDto,
  SupplierTestConnectionResultDto,
  UpdateSupplierCredentialsRequest,
  UpdateSupplierMappingRequest,
  UpdateSupplierRequest,
  UpdateSupplierSettingsRequest,
} from '../models/supplier.model';

@Injectable()
export class SuppliersManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly listState = signal<SupplierListResult | null>(null);
  private readonly listLoadingState = signal(false);
  private readonly listErrorState = signal<string | null>(null);

  private readonly detailState = signal<SupplierDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);
  private readonly savingState = signal(false);

  private readonly providerTypesState = signal<readonly string[]>([]);

  private readonly mappingsState = signal<readonly SupplierMappingDto[]>([]);
  private readonly mappingsLoadingState = signal(false);
  private readonly mappingsErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);
  private readonly testResultState = signal<SupplierTestConnectionResultDto | null>(null);

  private readonly availabilitySummaryState = signal<SupplierAvailabilitySummaryDto | null>(null);
  private readonly availabilitySummaryLoadingState = signal(false);
  private readonly availabilitySyncingState = signal(false);

  private readonly fulfillmentChainState = signal<readonly SupplierFulfillmentChainCandidateDto[]>([]);
  private readonly fulfillmentChainLoadingState = signal(false);
  private readonly fulfillmentChainErrorState = signal<string | null>(null);

  private readonly candidatesState = signal<SupplierMappingCandidatesResult | null>(null);
  private readonly candidatesLoadingState = signal(false);
  private readonly candidatesErrorState = signal<string | null>(null);
  private readonly candidatesSummaryState = signal<SupplierMappingCandidatesSummaryDto | null>(null);
  private readonly candidatesSummaryLoadingState = signal(false);
  private readonly bulkMappingState = signal(false);

  /** Suggestions computed so far this session, keyed by variantId — populated incrementally as
   * `suggestMappings` resolves for whatever page/selection is currently in view. Never a precomputed
   * global map (live matching has no bulk catalog to precompute from). */
  private readonly suggestionsByVariantIdState = signal<ReadonlyMap<string, SupplierMappingSuggestionDto>>(new Map());
  private readonly suggestingState = signal(false);

  private readonly productVariantMappingsState = signal<readonly ProductVariantSupplierMappingDto[]>([]);
  private readonly productVariantMappingsLoadingState = signal(false);

  readonly list = this.listState.asReadonly();
  readonly listLoading = this.listLoadingState.asReadonly();
  readonly listError = this.listErrorState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  readonly providerTypes = this.providerTypesState.asReadonly();

  readonly mappings = this.mappingsState.asReadonly();
  readonly mappingsLoading = this.mappingsLoadingState.asReadonly();
  readonly mappingsError = this.mappingsErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly testResult = this.testResultState.asReadonly();

  readonly availabilitySummary = this.availabilitySummaryState.asReadonly();
  readonly availabilitySummaryLoading = this.availabilitySummaryLoadingState.asReadonly();
  readonly availabilitySyncing = this.availabilitySyncingState.asReadonly();

  readonly fulfillmentChain = this.fulfillmentChainState.asReadonly();
  readonly fulfillmentChainLoading = this.fulfillmentChainLoadingState.asReadonly();
  readonly fulfillmentChainError = this.fulfillmentChainErrorState.asReadonly();

  readonly candidates = this.candidatesState.asReadonly();
  readonly candidatesLoading = this.candidatesLoadingState.asReadonly();
  readonly candidatesError = this.candidatesErrorState.asReadonly();
  readonly candidatesSummary = this.candidatesSummaryState.asReadonly();
  readonly candidatesSummaryLoading = this.candidatesSummaryLoadingState.asReadonly();
  readonly bulkMapping = this.bulkMappingState.asReadonly();
  readonly suggestionsByVariantId = this.suggestionsByVariantIdState.asReadonly();
  readonly suggesting = this.suggestingState.asReadonly();
  readonly productVariantMappings = this.productVariantMappingsState.asReadonly();
  readonly productVariantMappingsLoading = this.productVariantMappingsLoadingState.asReadonly();

  async loadSuppliers(search?: string, status?: string, page = 1, pageSize = 20): Promise<void> {
    this.listLoadingState.set(true);
    this.listErrorState.set(null);

    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) {
        params['search'] = search;
      }
      if (status && status !== 'all') {
        params['status'] = status;
      }

      const result = await firstValueFrom(this.api.get<SupplierListResult>(SUPPLIERS_API.suppliers, { params }));
      this.listState.set(result);
    } catch (error) {
      this.listState.set(null);
      this.listErrorState.set(this.toErrorMessage(error, 'Failed to load suppliers.'));
    } finally {
      this.listLoadingState.set(false);
    }
  }

  async loadProviderTypes(): Promise<void> {
    try {
      const types = await firstValueFrom(this.api.get<readonly string[]>(SUPPLIERS_API.providerTypes));
      this.providerTypesState.set(types ?? []);
    } catch {
      this.providerTypesState.set([]);
    }
  }

  async loadDetail(id: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);
    this.testResultState.set(null);
    this.availabilitySummaryState.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<SupplierDetailDto>(SUPPLIERS_API.supplier(id)));
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load supplier.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  clearDetail(): void {
    this.detailState.set(null);
    this.testResultState.set(null);
    this.availabilitySummaryState.set(null);
  }

  async createSupplier(request: CreateSupplierRequest): Promise<string | null> {
    this.savingState.set(true);
    this.detailErrorState.set(null);

    try {
      return await firstValueFrom(this.api.post<string>(SUPPLIERS_API.suppliers, request));
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create supplier.'));
      return null;
    } finally {
      this.savingState.set(false);
    }
  }

  async updateSupplier(id: string, request: UpdateSupplierRequest): Promise<boolean> {
    return this.runSave(id, () => this.api.put<void>(SUPPLIERS_API.supplier(id), request));
  }

  async updateCredentials(id: string, request: UpdateSupplierCredentialsRequest): Promise<boolean> {
    return this.runSave(id, () => this.api.put<void>(SUPPLIERS_API.credentials(id), request));
  }

  async updateSettings(id: string, request: UpdateSupplierSettingsRequest): Promise<boolean> {
    return this.runSave(id, () => this.api.put<void>(SUPPLIERS_API.settings(id), request));
  }

  async updatePriority(id: string, priority: number): Promise<boolean> {
    return this.runSave(id, () => this.api.put<void>(SUPPLIERS_API.priority(id), { priority }));
  }

  async enableSupplier(id: string): Promise<boolean> {
    return this.runAction(id, () => this.api.post<void>(SUPPLIERS_API.enable(id)));
  }

  async disableSupplier(id: string): Promise<boolean> {
    return this.runAction(id, () => this.api.post<void>(SUPPLIERS_API.disable(id)));
  }

  async deleteSupplier(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      await firstValueFrom(this.api.delete<void>(SUPPLIERS_API.supplier(id)));
      return true;
    } catch (error) {
      this.listErrorState.set(this.toErrorMessage(error, 'Failed to delete supplier.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  /**
   * Browses the supplier's live catalog for the mapping picker — stateless pass-through (unlike the rest
   * of this facade) since the picker component owns its own per-search loading/results/error signals,
   * matching the established `ProductPickerComponent`/category-picker pattern. Never calls the supplier
   * directly — always through the backend, which is the only place credentials are used.
   */
  async searchCatalog(supplierId: string, searchTerm: string, page = 1, pageSize = 20): Promise<SupplierCatalogSearchResultDto> {
    const params: Record<string, string | number> = { page, pageSize };
    if (searchTerm) {
      params['search'] = searchTerm;
    }

    return firstValueFrom(this.api.get<SupplierCatalogSearchResultDto>(SUPPLIERS_API.catalog(supplierId), { params }));
  }

  async testConnection(id: string): Promise<void> {
    this.actionLoadingState.set(true);
    this.testResultState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.post<SupplierTestConnectionResultDto>(SUPPLIERS_API.testConnection(id)),
      );
      this.testResultState.set(result);
    } catch (error) {
      this.testResultState.set({ isSuccess: false, message: this.toErrorMessage(error, 'Connection test failed.') });
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async loadAvailabilitySummary(supplierId: string): Promise<void> {
    this.availabilitySummaryLoadingState.set(true);

    try {
      const summary = await firstValueFrom(
        this.api.get<SupplierAvailabilitySummaryDto>(SUPPLIERS_API.availabilitySummary(supplierId)),
      );
      this.availabilitySummaryState.set(summary);
    } catch {
      this.availabilitySummaryState.set(null);
    } finally {
      this.availabilitySummaryLoadingState.set(false);
    }
  }

  /**
   * "Sync now" — synchronously calls the same ISupplierAvailabilityService the recurring background
   * job uses, then refreshes both the summary and the mapping list (so the table's per-row Availability
   * column reflects the fresh result immediately, without a page reload).
   */
  async syncAvailabilityNow(supplierId: string): Promise<SupplierAvailabilitySyncResultDto | null> {
    this.availabilitySyncingState.set(true);

    try {
      const result = await firstValueFrom(
        this.api.post<SupplierAvailabilitySyncResultDto>(SUPPLIERS_API.availabilitySync(supplierId)),
      );
      await Promise.all([this.loadAvailabilitySummary(supplierId), this.loadMappings(supplierId)]);
      return result;
    } catch (error) {
      this.availabilitySummaryState.set(null);
      return { supplierId, isSuccess: false, mappingsChecked: 0, availableCount: 0, unavailableCount: 0, unknownCount: 0, message: this.toErrorMessage(error, 'Sync failed.') };
    } finally {
      this.availabilitySyncingState.set(false);
    }
  }

  async loadMappings(supplierId: string): Promise<void> {
    this.mappingsLoadingState.set(true);
    this.mappingsErrorState.set(null);

    try {
      const mappings = await firstValueFrom(
        this.api.get<readonly SupplierMappingDto[]>(SUPPLIERS_API.mappings(supplierId)),
      );
      this.mappingsState.set(mappings ?? []);
    } catch (error) {
      this.mappingsState.set([]);
      this.mappingsErrorState.set(this.toErrorMessage(error, 'Failed to load product mappings.'));
    } finally {
      this.mappingsLoadingState.set(false);
    }
  }

  /**
   * Loads the full cross-supplier fulfillment chain for a product/variant — every eligible mapping in
   * the exact order the backend router uses (variant-specific mappings first, then priority), safe
   * metadata only. `variantId` omitted returns only product-wide mappings.
   */
  async loadFulfillmentChain(productId: string, variantId?: string | null): Promise<void> {
    this.fulfillmentChainLoadingState.set(true);
    this.fulfillmentChainErrorState.set(null);

    try {
      const params: Record<string, string> = { productId };
      if (variantId) {
        params['variantId'] = variantId;
      }

      const chain = await firstValueFrom(
        this.api.get<readonly SupplierFulfillmentChainCandidateDto[]>(SUPPLIERS_API.fulfillmentChain, { params }),
      );
      this.fulfillmentChainState.set(chain ?? []);
    } catch (error) {
      this.fulfillmentChainState.set([]);
      this.fulfillmentChainErrorState.set(this.toErrorMessage(error, 'Failed to load the fulfillment chain.'));
    } finally {
      this.fulfillmentChainLoadingState.set(false);
    }
  }

  clearFulfillmentChain(): void {
    this.fulfillmentChainState.set([]);
    this.fulfillmentChainErrorState.set(null);
  }

  /**
   * Persists a new priority order for a set of mappings that may belong to different suppliers, via
   * the dedicated priority-only endpoint (never the full mapping update — the chain view's safe-metadata
   * DTO deliberately doesn't carry buyingPrice/currency/externalSku/externalName, so round-tripping
   * those through a full update would silently corrupt them). Sends one PUT per mapping whose priority
   * actually changed; returns false if any of them fail, leaving `fulfillmentChainError` set.
   */
  async reorderFulfillmentChainPriorities(
    orderedMappingIds: readonly { supplierId: string; mappingId: string }[],
  ): Promise<boolean> {
    const current = this.fulfillmentChainState();
    const byId = new Map(current.map((c) => [c.mappingId, c]));

    this.fulfillmentChainLoadingState.set(true);
    this.fulfillmentChainErrorState.set(null);

    try {
      for (let index = 0; index < orderedMappingIds.length; index++) {
        const { supplierId, mappingId } = orderedMappingIds[index];
        const existing = byId.get(mappingId);
        if (!existing || existing.priority === index) {
          continue;
        }

        await firstValueFrom(this.api.put<void>(SUPPLIERS_API.mappingPriority(supplierId, mappingId), { priority: index }));
      }

      return true;
    } catch (error) {
      this.fulfillmentChainErrorState.set(this.toErrorMessage(error, 'Failed to save the new supplier order.'));
      return false;
    } finally {
      this.fulfillmentChainLoadingState.set(false);
    }
  }

  async createMapping(supplierId: string, request: CreateSupplierMappingRequest): Promise<boolean> {
    return this.runMappingMutation(supplierId, () =>
      this.api.post<string>(SUPPLIERS_API.mappings(supplierId), request),
    );
  }

  async updateMapping(supplierId: string, mappingId: string, request: UpdateSupplierMappingRequest): Promise<boolean> {
    return this.runMappingMutation(supplierId, () =>
      this.api.put<void>(SUPPLIERS_API.mapping(supplierId, mappingId), request),
    );
  }

  async deleteMapping(supplierId: string, mappingId: string): Promise<boolean> {
    return this.runMappingMutation(supplierId, () => this.api.delete<void>(SUPPLIERS_API.mapping(supplierId, mappingId)));
  }

  /** The Map Products workspace's table data — every eligible product/variant next to this supplier's
   * own mapping, if any. `status` is `'all' | 'mapped' | 'unmapped'`. */
  async loadMappingCandidates(supplierId: string, search?: string, status?: string, page = 1, pageSize = 20): Promise<void> {
    this.candidatesLoadingState.set(true);
    this.candidatesErrorState.set(null);

    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) {
        params['search'] = search;
      }
      if (status && status !== 'all') {
        params['status'] = status;
      }

      const result = await firstValueFrom(
        this.api.get<SupplierMappingCandidatesResult>(SUPPLIERS_API.mappingCandidates(supplierId), { params }),
      );
      this.candidatesState.set(result);
    } catch (error) {
      this.candidatesState.set(null);
      this.candidatesErrorState.set(this.toErrorMessage(error, 'Failed to load products to map.'));
    } finally {
      this.candidatesLoadingState.set(false);
    }
  }

  /** Count-only companion to `loadMappingCandidates` — feeds both the Map Products header stat cards and
   * the supplier detail page's Fulfillment Health block. */
  async loadMappingCandidatesSummary(supplierId: string): Promise<void> {
    this.candidatesSummaryLoadingState.set(true);

    try {
      const summary = await firstValueFrom(
        this.api.get<SupplierMappingCandidatesSummaryDto>(SUPPLIERS_API.mappingCandidatesSummary(supplierId)),
      );
      this.candidatesSummaryState.set(summary);
    } catch {
      this.candidatesSummaryState.set(null);
    } finally {
      this.candidatesSummaryLoadingState.set(false);
    }
  }

  /**
   * Live, on-demand auto-match for a bounded set of candidates (e.g. the current page's unmapped rows) —
   * never the whole catalog at once. Merges results into `suggestionsByVariantId` rather than replacing
   * it, so suggestions computed on an earlier page/selection stay visible.
   */
  async suggestMappings(supplierId: string, candidates: readonly SuggestionCandidate[]): Promise<readonly SupplierMappingSuggestionDto[]> {
    if (candidates.length === 0) {
      return [];
    }

    this.suggestingState.set(true);

    try {
      const suggestions = await firstValueFrom(
        this.api.post<readonly SupplierMappingSuggestionDto[]>(SUPPLIERS_API.suggestMappings(supplierId), candidates),
      );

      const next = new Map(this.suggestionsByVariantIdState());
      for (const suggestion of suggestions ?? []) {
        next.set(suggestion.variantId, suggestion);
      }
      this.suggestionsByVariantIdState.set(next);

      return suggestions ?? [];
    } catch (error) {
      this.candidatesErrorState.set(this.toErrorMessage(error, 'Failed to find matches.'));
      return [];
    } finally {
      this.suggestingState.set(false);
    }
  }

  clearSuggestions(): void {
    this.suggestionsByVariantIdState.set(new Map());
  }

  /** The "Confirm N Mappings" bulk action — one round trip, partial success supported (some rows may
   * fail e.g. a race with another admin creating the same mapping); refreshes the candidates list and
   * summary afterward so the table reflects the outcome immediately. */
  async bulkCreateMappings(
    supplierId: string,
    requests: readonly CreateSupplierMappingRequest[],
  ): Promise<BulkCreateSupplierMappingsResultDto | null> {
    this.bulkMappingState.set(true);
    this.candidatesErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.post<BulkCreateSupplierMappingsResultDto>(SUPPLIERS_API.bulkMappings(supplierId), requests),
      );
      return result;
    } catch (error) {
      this.candidatesErrorState.set(this.toErrorMessage(error, 'Failed to create mappings.'));
      return null;
    } finally {
      this.bulkMappingState.set(false);
    }
  }

  /** Cross-supplier mapping status for a batch of products (or every eligible product when `productIds`
   * is omitted) — used by the admin product list's Supplier Mapping column/filter. Stateless: the caller
   * (the product list facade) owns how the result is used. */
  async getProductMappingStatus(productIds?: readonly string[]): Promise<Readonly<Record<string, ProductSupplierMappingStatusDto>>> {
    return firstValueFrom(
      this.api.post<Readonly<Record<string, ProductSupplierMappingStatusDto>>>(SUPPLIERS_API.productMappingStatus, {
        productIds: productIds ?? null,
      }),
    );
  }

  /** For one product, every eligible variant next to its resolved mapping across ANY supplier — the
   * product-centric mapping drawer's and the product edit page's Supplier Fulfillment card's shared
   * data source, from `GET /suppliers/product-mappings`. */
  async loadProductVariantMappings(productId: string): Promise<void> {
    this.productVariantMappingsLoadingState.set(true);

    try {
      const mappings = await firstValueFrom(
        this.api.get<readonly ProductVariantSupplierMappingDto[]>(SUPPLIERS_API.productMappings, {
          params: { productId },
        }),
      );
      this.productVariantMappingsState.set(mappings ?? []);
    } catch {
      this.productVariantMappingsState.set([]);
    } finally {
      this.productVariantMappingsLoadingState.set(false);
    }
  }

  clearProductVariantMappings(): void {
    this.productVariantMappingsState.set([]);
  }

  private async runSave(id: string, action: () => Observable<unknown>): Promise<boolean> {
    this.savingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(action());
      await this.loadDetail(id);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to save supplier.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private async runAction(id: string, action: () => Observable<unknown>): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(action());
      await this.loadDetail(id);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Action failed.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async runMappingMutation(supplierId: string, action: () => Observable<unknown>): Promise<boolean> {
    this.mappingsLoadingState.set(true);
    this.mappingsErrorState.set(null);

    try {
      await firstValueFrom(action());
      await this.loadMappings(supplierId);
      return true;
    } catch (error) {
      this.mappingsErrorState.set(this.toErrorMessage(error, 'Failed to save mapping.'));
      return false;
    } finally {
      this.mappingsLoadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      return error.message;
    }

    return fallback;
  }
}

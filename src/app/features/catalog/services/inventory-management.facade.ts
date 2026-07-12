import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import {
  CreateBatchRequest,
  CreateOptionGroupRequest,
  CreateOptionRequest,
  CreateSupplierRequest,
  CreateVariantRequest,
  DigitalInventoryCodeDto,
  InventoryAuditLogDto,
  InventoryBatchDto,
  InventoryReservationDto,
  InventoryStatisticsDto,
  InventorySupplierDto,
  ProductOptionGroupDto,
  ProductVariantDto,
} from '../models/inventory-api.model';
import { InventoryApiService } from './inventory-api.service';

@Injectable()
export class InventoryManagementFacade {
  private readonly api = inject(InventoryApiService);

  private readonly statisticsState = signal<InventoryStatisticsDto | null>(null);
  private readonly variantsState = signal<readonly ProductVariantDto[]>([]);
  private readonly optionGroupsState = signal<readonly ProductOptionGroupDto[]>([]);
  private readonly suppliersState = signal<readonly InventorySupplierDto[]>([]);
  private readonly batchesState = signal<readonly InventoryBatchDto[]>([]);
  private readonly codesState = signal<readonly DigitalInventoryCodeDto[]>([]);
  private readonly auditLogsState = signal<readonly InventoryAuditLogDto[]>([]);
  private readonly reservationsState = signal<readonly InventoryReservationDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly selectedVariantIdState = signal<string | null>(null);

  readonly statistics = this.statisticsState.asReadonly();
  readonly variants = this.variantsState.asReadonly();
  readonly optionGroups = this.optionGroupsState.asReadonly();
  readonly suppliers = this.suppliersState.asReadonly();
  readonly batches = this.batchesState.asReadonly();
  readonly codes = this.codesState.asReadonly();
  readonly auditLogs = this.auditLogsState.asReadonly();
  readonly reservations = this.reservationsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly selectedVariantId = this.selectedVariantIdState.asReadonly();

  readonly selectedVariant = computed(() => {
    const id = this.selectedVariantIdState();
    return this.variantsState().find((v) => v.id === id) ?? null;
  });

  async loadDashboard(productId?: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [stats, reservations] = await Promise.all([
        firstValueFrom(this.api.getStatistics(productId)),
        firstValueFrom(this.api.getReservations()),
      ]);
      this.statisticsState.set(stats);
      this.reservationsState.set(reservations);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to load inventory dashboard.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadProductInventory(productId: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [variants, optionGroups, stats] = await Promise.all([
        firstValueFrom(this.api.getProductVariants(productId)),
        firstValueFrom(this.api.getOptionGroups(productId)),
        firstValueFrom(this.api.getStatistics(productId)),
      ]);
      this.variantsState.set(variants);
      this.optionGroupsState.set(optionGroups);
      this.statisticsState.set(stats);

      if (variants.length > 0 && !this.selectedVariantIdState()) {
        this.selectedVariantIdState.set(variants[0].id);
        await this.loadVariantDetails(variants[0].id);
      }
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to load product inventory.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadVariantDetails(variantId: string): Promise<void> {
    this.selectedVariantIdState.set(variantId);

    try {
      const [batches, codes] = await Promise.all([
        firstValueFrom(this.api.getBatches(variantId)),
        firstValueFrom(this.api.getCodes(variantId)),
      ]);
      this.batchesState.set(batches);
      this.codesState.set(codes);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to load variant inventory.'));
    }
  }

  async loadSuppliers(searchTerm?: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const suppliers = await firstValueFrom(this.api.getSuppliers(1, 100, searchTerm));
      this.suppliersState.set(suppliers);
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to load suppliers.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async createVariant(productId: string, request: CreateVariantRequest): Promise<string | null> {
    try {
      const id = await firstValueFrom(this.api.createVariant(productId, request));
      await this.loadProductInventory(productId);
      return id;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to create variant.'));
      return null;
    }
  }

  async createOptionGroup(productId: string, request: CreateOptionGroupRequest): Promise<boolean> {
    try {
      await firstValueFrom(this.api.createOptionGroup(productId, request));
      await this.loadProductInventory(productId);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to create option group.'));
      return false;
    }
  }

  async createOption(groupId: string, productId: string, request: CreateOptionRequest): Promise<boolean> {
    try {
      await firstValueFrom(this.api.createOption(groupId, request));
      await this.loadProductInventory(productId);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to create option.'));
      return false;
    }
  }

  async createSupplier(request: CreateSupplierRequest): Promise<boolean> {
    try {
      await firstValueFrom(this.api.createSupplier(request));
      await this.loadSuppliers();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to create supplier.'));
      return false;
    }
  }

  async createBatch(variantId: string, productId: string, request: CreateBatchRequest): Promise<string | null> {
    try {
      const id = await firstValueFrom(this.api.createBatch(variantId, request));
      await this.loadVariantDetails(variantId);
      await this.loadProductInventory(productId);
      return id;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to create batch.'));
      return null;
    }
  }

  async importCodes(
    variantId: string,
    batchId: string,
    productId: string,
    codes: readonly string[],
  ): Promise<boolean> {
    try {
      await firstValueFrom(this.api.importCodes(variantId, batchId, { codes }));
      await this.loadVariantDetails(variantId);
      await this.loadProductInventory(productId);
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to import codes.'));
      return false;
    }
  }

  async releaseReservation(codeId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.releaseReservation(codeId));
      await this.loadDashboard();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to release reservation.'));
      return false;
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

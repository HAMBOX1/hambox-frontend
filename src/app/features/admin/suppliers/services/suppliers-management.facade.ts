import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { SUPPLIERS_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  CreateSupplierMappingRequest,
  CreateSupplierRequest,
  SupplierDetailDto,
  SupplierListResult,
  SupplierMappingDto,
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

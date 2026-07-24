import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_API, INVENTORY_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import {
  BulkCodeActionResultDto,
  BulkCodeIdsRequest,
  BulkUpdateVariantsRequest,
  BulkVariantIdsRequest,
  BulkVariantsResultDto,
  CreateBatchRequest,
  CreateOptionGroupRequest,
  CreateOptionRequest,
  CreateSupplierRequest,
  CreateVariantRequest,
  DigitalInventoryCodeDto,
  DuplicateVariantRequest,
  GenerateProductVariantsResultDto,
  ImportCodesRequest,
  ImportCodesResultDto,
  InventoryAuditLogDto,
  InventoryBatchDto,
  InventoryReservationDto,
  InventoryStatisticsDto,
  InventorySupplierDto,
  ProductOptionGroupDto,
  ProductVariantDto,
  ReorderIdsRequest,
  RevealInventoryCodeDto,
  StorefrontProductConfigurationDto,
  UpdateOptionGroupRequest,
  UpdateOptionRequest,
  UpdateVariantRequest,
} from '../models/inventory-api.model';

@Injectable({
  providedIn: 'root',
})
export class InventoryApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getStatistics(productId?: string, variantId?: string): Observable<InventoryStatisticsDto> {
    return this.api.get<InventoryStatisticsDto>(INVENTORY_API.statistics, {
      params: {
        ...(productId ? { productId } : {}),
        ...(variantId ? { variantId } : {}),
      },
    });
  }

  getProductVariants(productId: string): Observable<readonly ProductVariantDto[]> {
    return this.api.get<readonly ProductVariantDto[]>(INVENTORY_API.productVariants(productId));
  }

  createVariant(productId: string, request: CreateVariantRequest): Observable<string> {
    return this.api.post<string>(INVENTORY_API.productVariants(productId), request);
  }

  generateVariants(productId: string): Observable<GenerateProductVariantsResultDto> {
    return this.api.post<GenerateProductVariantsResultDto>(
      INVENTORY_API.generateProductVariants(productId),
      {},
    );
  }

  bulkUpdateVariants(
    productId: string,
    request: BulkUpdateVariantsRequest,
  ): Observable<number> {
    return this.api.post<number>(INVENTORY_API.bulkUpdateProductVariants(productId), request);
  }

  updateVariant(variantId: string, request: UpdateVariantRequest): Observable<void> {
    return this.api.put<void>(INVENTORY_API.variant(variantId), request);
  }

  deleteVariant(variantId: string): Observable<void> {
    return this.api.delete<void>(INVENTORY_API.variant(variantId));
  }

  duplicateVariant(variantId: string, request?: DuplicateVariantRequest): Observable<string> {
    return this.api.post<string>(INVENTORY_API.variantDuplicate(variantId), request ?? {});
  }

  activateVariant(variantId: string): Observable<void> {
    return this.api.post<void>(INVENTORY_API.variantActivate(variantId), {});
  }

  deactivateVariant(variantId: string): Observable<void> {
    return this.api.post<void>(INVENTORY_API.variantDeactivate(variantId), {});
  }

  activateProductVariants(productId: string): Observable<number> {
    return this.api.post<number>(INVENTORY_API.activateProductVariants(productId), {});
  }

  bulkDeleteVariants(productId: string, request: BulkVariantIdsRequest): Observable<BulkVariantsResultDto> {
    return this.api.post<BulkVariantsResultDto>(INVENTORY_API.bulkDeleteProductVariants(productId), request);
  }

  bulkDuplicateVariants(productId: string, request: BulkVariantIdsRequest): Observable<BulkVariantsResultDto> {
    return this.api.post<BulkVariantsResultDto>(INVENTORY_API.bulkDuplicateProductVariants(productId), request);
  }

  exportVariantsCodes(productId: string, variantIds: readonly string[], status?: string): Observable<Blob> {
    let params = new HttpParams();
    for (const variantId of variantIds) {
      params = params.append('variantIds', variantId);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get(this.resolveUrl(INVENTORY_API.bulkExportProductVariantCodes(productId)), {
      params,
      responseType: 'blob',
    });
  }

  getOptionGroups(productId: string): Observable<readonly ProductOptionGroupDto[]> {
    return this.api.get<readonly ProductOptionGroupDto[]>(INVENTORY_API.productOptionGroups(productId));
  }

  createOptionGroup(productId: string, request: CreateOptionGroupRequest): Observable<string> {
    return this.api.post<string>(INVENTORY_API.productOptionGroups(productId), request);
  }

  updateOptionGroup(groupId: string, request: UpdateOptionGroupRequest): Observable<void> {
    return this.api.put<void>(INVENTORY_API.optionGroup(groupId), request);
  }

  deleteOptionGroup(groupId: string, force = false): Observable<void> {
    return this.api.delete<void>(INVENTORY_API.optionGroup(groupId), { params: { force } });
  }

  reorderOptionGroups(productId: string, request: ReorderIdsRequest): Observable<void> {
    return this.api.put<void>(INVENTORY_API.productOptionGroupsReorder(productId), request);
  }

  createOption(groupId: string, request: CreateOptionRequest): Observable<string> {
    return this.api.post<string>(INVENTORY_API.optionGroupOptions(groupId), request);
  }

  updateOption(optionId: string, request: UpdateOptionRequest): Observable<void> {
    return this.api.put<void>(INVENTORY_API.option(optionId), request);
  }

  deleteOption(optionId: string): Observable<void> {
    return this.api.delete<void>(INVENTORY_API.option(optionId));
  }

  reorderOptions(groupId: string, request: ReorderIdsRequest): Observable<void> {
    return this.api.put<void>(INVENTORY_API.optionGroupOptionsReorder(groupId), request);
  }

  getSuppliers(pageNumber = 1, pageSize = 50, searchTerm?: string): Observable<readonly InventorySupplierDto[]> {
    return this.api.get<readonly InventorySupplierDto[]>(INVENTORY_API.suppliers, {
      params: {
        pageNumber,
        pageSize,
        ...(searchTerm ? { searchTerm } : {}),
      },
    });
  }

  createSupplier(request: CreateSupplierRequest): Observable<string> {
    return this.api.post<string>(INVENTORY_API.suppliers, request);
  }

  getBatches(variantId: string): Observable<readonly InventoryBatchDto[]> {
    return this.api.get<readonly InventoryBatchDto[]>(INVENTORY_API.variantBatches(variantId));
  }

  createBatch(variantId: string, request: CreateBatchRequest): Observable<string> {
    return this.api.post<string>(INVENTORY_API.variantBatches(variantId), request);
  }

  importCodes(variantId: string, batchId: string, request: ImportCodesRequest): Observable<ImportCodesResultDto> {
    return this.api.post<ImportCodesResultDto>(INVENTORY_API.batchImport(variantId, batchId), request);
  }

  getCodes(
    variantId: string,
    pageNumber = 1,
    pageSize = 50,
    status?: string,
    searchTerm?: string,
  ): Observable<readonly DigitalInventoryCodeDto[]> {
    return this.api.get<readonly DigitalInventoryCodeDto[]>(INVENTORY_API.variantCodes(variantId), {
      params: {
        pageNumber,
        pageSize,
        ...(status ? { status } : {}),
        ...(searchTerm ? { searchTerm } : {}),
      },
    });
  }

  disableCode(codeId: string): Observable<void> {
    return this.api.post<void>(INVENTORY_API.codeDisable(codeId), {});
  }

  enableCode(codeId: string): Observable<void> {
    return this.api.post<void>(INVENTORY_API.codeEnable(codeId), {});
  }

  deleteCode(codeId: string): Observable<void> {
    return this.api.delete<void>(INVENTORY_API.code(codeId));
  }

  revealCode(codeId: string): Observable<RevealInventoryCodeDto> {
    return this.api.post<RevealInventoryCodeDto>(INVENTORY_API.codeReveal(codeId), {});
  }

  bulkDisableCodes(variantId: string, request: BulkCodeIdsRequest): Observable<BulkCodeActionResultDto> {
    return this.api.post<BulkCodeActionResultDto>(INVENTORY_API.variantCodesBulkDisable(variantId), request);
  }

  bulkDeleteCodes(variantId: string, request: BulkCodeIdsRequest): Observable<BulkCodeActionResultDto> {
    return this.api.post<BulkCodeActionResultDto>(INVENTORY_API.variantCodesBulkDelete(variantId), request);
  }

  exportCodes(variantId: string, status?: string): Observable<Blob> {
    return this.http.get(this.resolveUrl(INVENTORY_API.variantCodesExport(variantId)), {
      params: status ? { status } : {},
      responseType: 'blob',
    });
  }

  getAuditLogs(variantId?: string, pageNumber = 1, pageSize = 50): Observable<readonly InventoryAuditLogDto[]> {
    return this.api.get<readonly InventoryAuditLogDto[]>(INVENTORY_API.auditLogs, {
      params: {
        pageNumber,
        pageSize,
        ...(variantId ? { variantId } : {}),
      },
    });
  }

  getReservations(pageNumber = 1, pageSize = 50): Observable<readonly InventoryReservationDto[]> {
    return this.api.get<readonly InventoryReservationDto[]>(INVENTORY_API.reservations, {
      params: { pageNumber, pageSize },
    });
  }

  releaseReservation(codeId: string): Observable<void> {
    return this.api.post<void>(INVENTORY_API.releaseReservation(codeId), {});
  }

  getStorefrontConfiguration(
    productId: string,
    preview = false,
  ): Observable<StorefrontProductConfigurationDto> {
    const path = preview
      ? CATALOG_API.storefrontProductConfigurationPreview(productId)
      : CATALOG_API.storefrontProductConfiguration(productId);
    return this.api.get<StorefrontProductConfigurationDto>(path);
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.apiBaseUrl.replace(/\/$/, '');
    return `${base}${normalizedPath}`;
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { PagedResult } from '../models/category.model';
import {
  BulkProductsResult,
  CreateProductRequest,
  PriceAdjustmentMode,
  Product,
  ProductBulkSelection,
  ProductImage,
  ProductListQuery,
  UpdateProductRequest,
} from '../models/product.model';
import { productStatusToApi } from '../utils/product-display.utils';

@Injectable({
  providedIn: 'root',
})
export class ProductApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getProducts(query: ProductListQuery): Observable<PagedResult<Product>> {
    const params: Record<string, string | number | boolean> = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
    };

    const searchTerm = query.searchTerm?.trim();
    if (searchTerm) {
      params['searchTerm'] = searchTerm;
    }

    if (query.status) {
      params['status'] = query.status;
    }

    if (query.categoryId) {
      params['categoryId'] = query.categoryId;
    }

    if (query.sortBy) {
      params['sortBy'] = query.sortBy;
    }

    return this.api.get<PagedResult<Product>>(CATALOG_API.products, { params });
  }

  getProductById(id: string): Observable<Product> {
    return this.api.get<Product>(CATALOG_API.product(id));
  }

  createProduct(request: CreateProductRequest): Observable<string> {
    return this.api.post<string>(CATALOG_API.products, request);
  }

  updateProduct(id: string, request: UpdateProductRequest): Observable<void> {
    return this.api.put<void>(CATALOG_API.product(id), {
      ...request,
      status: productStatusToApi(request.status),
    });
  }

  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(CATALOG_API.product(id));
  }

  publishProduct(id: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.productPublish(id), {});
  }

  deactivateProduct(id: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.productDeactivate(id), {});
  }

  archiveProduct(id: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.productArchive(id), {});
  }

  restoreProduct(id: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.productRestore(id), {});
  }

  duplicateProduct(id: string, nameSuffix?: string | null): Observable<string> {
    return this.api.post<string>(CATALOG_API.productDuplicate(id), { nameSuffix: nameSuffix ?? null });
  }

  changeProductCategory(id: string, categoryId: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.productCategory(id), { categoryId });
  }

  adjustProductPrice(id: string, mode: PriceAdjustmentMode, value: number): Observable<void> {
    return this.api.post<void>(CATALOG_API.productPrice(id), { mode, value });
  }

  bulkProducts(
    selection: ProductBulkSelection,
    action: string,
    extra?: { targetCategoryId?: string; priceMode?: PriceAdjustmentMode; priceValue?: number },
  ): Observable<BulkProductsResult> {
    return this.api.post<BulkProductsResult>(CATALOG_API.productsBulk, {
      ...this.selectionBody(selection),
      action,
      targetCategoryId: extra?.targetCategoryId ?? null,
      priceMode: extra?.priceMode ?? null,
      priceValue: extra?.priceValue ?? null,
    });
  }

  bulkDeleteProducts(selection: ProductBulkSelection): Observable<BulkProductsResult> {
    return this.api.post<BulkProductsResult>(CATALOG_API.productsBulkDelete, this.selectionBody(selection));
  }

  bulkDuplicateProducts(selection: ProductBulkSelection, nameSuffix?: string | null): Observable<BulkProductsResult> {
    return this.api.post<BulkProductsResult>(CATALOG_API.productsBulkDuplicate, {
      ...this.selectionBody(selection),
      nameSuffix: nameSuffix ?? null,
    });
  }

  exportProducts(selection: ProductBulkSelection): Observable<Blob> {
    return this.http.post(this.resolveUrl(CATALOG_API.productsBulkExport), this.selectionBody(selection), {
      responseType: 'blob',
    });
  }

  private selectionBody(selection: ProductBulkSelection) {
    return {
      productIds: selection.productIds ?? null,
      searchTerm: selection.searchTerm ?? null,
      status: selection.status ?? null,
      categoryId: selection.categoryId ?? null,
      selectAllMatching: selection.selectAllMatching,
    };
  }

  getProductImages(productId: string): Observable<readonly ProductImage[]> {
    return this.api.get<readonly ProductImage[]>(CATALOG_API.productImages(productId));
  }

  uploadProductImage(productId: string, file: File): Observable<ProductImage> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ProductImage>(this.resolveUrl(CATALOG_API.productImages(productId)), formData);
  }

  deleteProductImage(productId: string, imageId: string): Observable<void> {
    return this.api.delete<void>(CATALOG_API.productImage(productId, imageId));
  }

  setPrimaryProductImage(productId: string, imageId: string): Observable<ProductImage> {
    return this.api.put<ProductImage>(CATALOG_API.productImagePrimary(productId, imageId), {});
  }

  reorderProductImages(productId: string, orderedImageIds: readonly string[]): Observable<readonly ProductImage[]> {
    return this.api.put<readonly ProductImage[]>(CATALOG_API.productImagesReorder(productId), {
      orderedImageIds,
    });
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

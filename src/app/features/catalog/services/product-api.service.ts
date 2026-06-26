import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { PagedResult } from '../models/category.model';
import {
  CreateProductRequest,
  Product,
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
    return this.api.get<Product>(`${CATALOG_API.products}/${id}`);
  }

  createProduct(request: CreateProductRequest): Observable<string> {
    return this.api.post<string>(CATALOG_API.products, request);
  }

  updateProduct(id: string, request: UpdateProductRequest): Observable<void> {
    return this.api.put<void>(`${CATALOG_API.products}/${id}`, {
      ...request,
      status: productStatusToApi(request.status),
    });
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

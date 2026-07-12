import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import {
  Category,
  CategoryListQuery,
  CreateCategoryRequest,
  PagedResult,
  UpdateCategoryRequest,
} from '../models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryApiService {
  private readonly api = inject(ApiClientService);

  getCategories(query: CategoryListQuery): Observable<PagedResult<Category>> {
    const params: Record<string, string | number | boolean> = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
    };

    const searchTerm = query.searchTerm?.trim();
    if (searchTerm) {
      params['searchTerm'] = searchTerm;
    }

    if (query.activeOnly !== undefined) {
      params['activeOnly'] = query.activeOnly;
    }

    return this.api.get<PagedResult<Category>>(CATALOG_API.categories, { params });
  }

  getCategoryById(id: string): Observable<Category> {
    return this.api.get<Category>(CATALOG_API.category(id));
  }

  createCategory(request: CreateCategoryRequest): Observable<string> {
    return this.api.post<string>(CATALOG_API.categories, request);
  }

  updateCategory(id: string, request: UpdateCategoryRequest): Observable<void> {
    return this.api.put<void>(CATALOG_API.category(id), request);
  }

  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(CATALOG_API.category(id));
  }

  restoreCategory(id: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.categoryRestore(id), {});
  }
}

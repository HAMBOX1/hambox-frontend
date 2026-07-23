import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import {
  Category,
  CategoryListQuery,
  CategoryReorderEntry,
  CategoryTreeItem,
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

  getCategoryTree(): Observable<readonly CategoryTreeItem[]> {
    return this.api.get<readonly CategoryTreeItem[]>(CATALOG_API.categoriesTree);
  }

  reorderCategories(entries: readonly CategoryReorderEntry[]): Observable<void> {
    return this.api.put<void>(CATALOG_API.categoriesReorder, { entries });
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

/**
 * Resolves a create request's `newParent`/`subcategories` drafts into real categories
 * before/after creating the primary one, since there's no batch/nested create endpoint.
 * Shared by every place that submits `CategoryCreateFormComponent`'s create-mode output
 * (the categories admin page facade, and the product form's inline "create category").
 *
 * ponytail: each step is a separate sequential call — no cross-entity transaction exists,
 * so a failure partway through can leave a standalone new parent or partial subcategory
 * set behind rather than rolling back. Acceptable since every entity created along the
 * way is still a valid, usable category on its own.
 */
export async function createCategoryWithHierarchy(
  api: CategoryApiService,
  request: CreateCategoryRequest,
): Promise<string> {
  const parentId = request.newParent
    ? await firstValueFrom(
        api.createCategory({
          nameEn: request.newParent.nameEn,
          nameAr: request.newParent.nameAr,
          slug: request.newParent.slug,
          parentId: null,
        }),
      )
    : (request.parentId ?? null);

  const rootId = await firstValueFrom(
    api.createCategory({
      nameEn: request.nameEn,
      nameAr: request.nameAr,
      slug: request.slug,
      parentId,
    }),
  );

  // A root category's extra rows are its own children (nest under rootId). A
  // child category has no "root" to nest under, so its extra rows are instead
  // created as siblings under that same fixed parent.
  const extrasParentId = parentId ?? rootId;

  for (const child of request.subcategories ?? []) {
    await firstValueFrom(
      api.createCategory({
        nameEn: child.nameEn,
        nameAr: child.nameAr,
        slug: child.slug,
        parentId: extrasParentId,
      }),
    );
  }

  return rootId;
}

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CATALOG_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { PagedResult } from '../models/category.model';
import {
  CollectionListQuery,
  CollectionReorderEntry,
  CollectionTreeItem,
  CreateCollectionRequest,
  ProductCollection,
  UpdateCollectionRequest,
} from '../models/collection.model';

@Injectable({
  providedIn: 'root',
})
export class CollectionApiService {
  private readonly api = inject(ApiClientService);

  getCollections(query: CollectionListQuery): Observable<PagedResult<ProductCollection>> {
    const params: Record<string, string | number | boolean> = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
    };

    const searchTerm = query.searchTerm?.trim();
    if (searchTerm) {
      params['searchTerm'] = searchTerm;
    }

    return this.api.get<PagedResult<ProductCollection>>(CATALOG_API.collections, { params });
  }

  getCollectionById(id: string): Observable<ProductCollection> {
    return this.api.get<ProductCollection>(CATALOG_API.collection(id));
  }

  getCollectionTree(): Observable<readonly CollectionTreeItem[]> {
    return this.api.get<readonly CollectionTreeItem[]>(CATALOG_API.collectionsTree);
  }

  reorderCollections(entries: readonly CollectionReorderEntry[]): Observable<void> {
    return this.api.put<void>(CATALOG_API.collectionsReorder, { entries });
  }

  createCollection(request: CreateCollectionRequest): Observable<string> {
    return this.api.post<string>(CATALOG_API.collections, request);
  }

  updateCollection(id: string, request: UpdateCollectionRequest): Observable<void> {
    return this.api.put<void>(CATALOG_API.collection(id), request);
  }

  deleteCollection(id: string): Observable<void> {
    return this.api.delete<void>(CATALOG_API.collection(id));
  }

  restoreCollection(id: string): Observable<void> {
    return this.api.post<void>(CATALOG_API.collectionRestore(id), {});
  }
}

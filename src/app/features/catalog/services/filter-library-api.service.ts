import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';

export interface FilterValueDraft {
  readonly id: string | null;
  readonly value: string;
  readonly labelEn: string;
  readonly labelAr: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly productCount?: number;
}

/** A filter the admin created by hand (Game Mode, Offers...). */
export interface FilterDefinition {
  readonly id: string;
  readonly key: string;
  readonly nameEn: string;
  readonly nameAr: string | null;
  readonly isMultiSelect: boolean;
  readonly isActive: boolean;
  readonly showWhenEmpty: boolean;
  readonly defaultExpanded: boolean;
  readonly scopeCategoryIds: readonly string[];
  readonly sortOrder: number;
  readonly productCount: number;
  readonly values: readonly FilterValueDraft[];
  readonly modifiedBy: string | null;
  readonly modifiedOnUtc: string | null;
}

export interface SaveFilterDefinitionInput {
  readonly nameEn: string;
  readonly nameAr: string | null;
  readonly isMultiSelect: boolean;
  readonly isActive: boolean;
  readonly showWhenEmpty: boolean;
  readonly defaultExpanded: boolean;
  readonly scopeCategoryIds: readonly string[];
  readonly values: readonly FilterValueDraft[];
  readonly key?: string | null;
}

export type FilterAssignMode = 'Merge' | 'Replace' | 'Remove';

export interface AssignFilterValuesResult {
  readonly productsChanged: number;
  readonly added: number;
  readonly removed: number;
  readonly unknownValues: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class FilterLibraryApiService {
  private readonly api = inject(ApiClientService);

  list(): Observable<readonly FilterDefinition[]> {
    return this.api.get<readonly FilterDefinition[]>('/api/v1/filters');
  }

  create(input: SaveFilterDefinitionInput): Observable<FilterDefinition> {
    return this.api.post<FilterDefinition>('/api/v1/filters', input);
  }

  update(id: string, input: SaveFilterDefinitionInput): Observable<FilterDefinition> {
    return this.api.put<FilterDefinition>(`/api/v1/filters/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/api/v1/filters/${id}`);
  }

  assign(productIds: readonly string[], filterKey: string, values: readonly string[], mode: FilterAssignMode): Observable<AssignFilterValuesResult> {
    return this.api.post<AssignFilterValuesResult>('/api/v1/filters/assign', { productIds, filterKey, values, mode });
  }

  productValues(productId: string): Observable<Readonly<Record<string, readonly string[]>>> {
    return this.api.get<Readonly<Record<string, readonly string[]>>>(`/api/v1/filters/product/${productId}`);
  }

  setProductValues(productId: string, values: Readonly<Record<string, readonly string[]>>): Observable<void> {
    return this.api.put<void>(`/api/v1/filters/product/${productId}`, values);
  }
}

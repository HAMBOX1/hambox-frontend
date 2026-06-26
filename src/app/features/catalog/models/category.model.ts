export interface Category {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly isActive: boolean;
}

export interface CreateCategoryRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
}

export interface CategoryListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly activeOnly?: boolean;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages?: number;
  readonly hasPreviousPage?: boolean;
  readonly hasNextPage?: boolean;
}

export interface Category {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly parentId: string | null;
}

export interface NewParentDraft {
  readonly nameEn: string;
  readonly nameAr: string;
  readonly slug: string;
}

export interface CreateCategoryRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly parentId?: string | null;
  readonly newParent?: NewParentDraft | null;
  readonly subcategories?: readonly NewParentDraft[] | null;
}

export interface UpdateCategoryRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly parentId?: string | null;
  readonly newParent?: NewParentDraft | null;
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

export interface CategoryOption {
  readonly id: string;
  readonly label: string;
}

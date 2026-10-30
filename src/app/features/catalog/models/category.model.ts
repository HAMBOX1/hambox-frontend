export interface Category {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly parentId: string | null;
  readonly imageUrl?: string | null;
  /** Optional rich-text instructions shown to customers browsing this category. */
  readonly descriptionHtml?: string | null;
}

/** One filter on a category's storefront filter list (admin). */
export interface CategoryFilterItem {
  readonly groupKey: string;
  readonly defaultName: string;
  readonly displayNameEn: string | null;
  readonly displayNameAr: string | null;
  readonly isVisible: boolean;
  readonly productCount: number;
  /** When set, customers only see this filter after picking one of `dependsOnValues` in that filter group. */
  readonly dependsOnGroupKey: string | null;
  readonly dependsOnValues: readonly string[];
}

export interface FilterGroupValues {
  readonly groupKey: string;
  readonly values: readonly { readonly value: string; readonly label: string }[];
}

export interface AvailableFilterGroup {
  readonly groupKey: string;
  readonly defaultName: string;
  readonly productCount: number;
}

export interface CategoryFilterConfig {
  readonly categoryId: string;
  readonly hasOwnList: boolean;
  readonly inheritedFromCategoryId: string | null;
  readonly inheritedFromDefault: boolean;
  readonly items: readonly CategoryFilterItem[];
  readonly availableGroups: readonly AvailableFilterGroup[];
  /** Every value of every filter group, for the "show only when ..." picker. */
  readonly groupValues: readonly FilterGroupValues[];
}

export interface CategoryFilterInput {
  readonly groupKey: string;
  readonly displayNameEn: string | null;
  readonly displayNameAr: string | null;
  readonly isVisible: boolean;
  readonly dependsOnGroupKey?: string | null;
  readonly dependsOnValues?: readonly string[];
}

export interface CategoryTreeItem extends Category {
  readonly sortOrder: number;
  readonly childrenCount: number;
  readonly productCount: number;
}

export interface CategoryTreeNode extends CategoryTreeItem {
  readonly children: readonly CategoryTreeNode[];
}

export interface CategoryReorderEntry {
  readonly id: string;
  readonly parentId: string | null;
  readonly sortOrder: number;
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
  readonly descriptionHtml?: string | null;
}

export interface UpdateCategoryRequest {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly parentId?: string | null;
  readonly descriptionHtml?: string | null;
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
  readonly parentId: string | null;
}

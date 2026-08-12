import { PagedResult } from '../../../catalog/models/category.model';

export type FaqScope = 'Global' | 'Product' | 'Category';

export interface FaqDto {
  readonly id: string;
  readonly questionEn: string;
  readonly questionAr: string | null;
  readonly answerEn: string;
  readonly answerAr: string | null;
  readonly categoryId: string;
  readonly categoryNameEn: string;
  readonly scope: FaqScope;
  readonly targetId: string | null;
  readonly targetLabel: string | null;
  readonly sortOrder: number;
  readonly isPublished: boolean;
  readonly publishedOnUtc: string | null;
  readonly modifiedOnUtc: string;
}

export interface FaqCategoryDto {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string | null;
  readonly slug: string;
  readonly sortOrder: number;
}

export interface PublicFaqDto {
  readonly id: string;
  readonly questionEn: string;
  readonly questionAr: string | null;
  readonly answerEn: string;
  readonly answerAr: string | null;
  readonly categoryId: string;
  readonly categoryNameEn: string;
  readonly categoryNameAr: string | null;
  readonly scope: FaqScope;
  readonly sortOrder: number;
}

export interface FaqListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly scope?: FaqScope | 'all';
  readonly categoryId?: string | 'all';
  readonly isPublished?: boolean | 'all';
}

export type FaqListResult = PagedResult<FaqDto>;

export interface CreateFaqRequest {
  readonly questionEn: string;
  readonly questionAr: string | null;
  readonly answerEn: string;
  readonly answerAr: string | null;
  readonly categoryId: string;
  readonly scope: FaqScope;
  readonly targetId: string | null;
  readonly sortOrder?: number;
}

export type UpdateFaqRequest = Omit<CreateFaqRequest, 'sortOrder'>;

export interface FaqReorderEntry {
  readonly id: string;
  readonly sortOrder: number;
}

export interface CreateFaqCategoryRequest {
  readonly nameEn: string;
  readonly nameAr: string | null;
}

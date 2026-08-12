export type FaqScope = 'Global' | 'Product' | 'Category';

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

export interface FaqCategoryDto {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string | null;
  readonly slug: string;
  readonly sortOrder: number;
}

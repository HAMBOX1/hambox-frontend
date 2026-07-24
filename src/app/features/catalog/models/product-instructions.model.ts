export interface ProductInstructionsDto {
  readonly productId: string;
  readonly title: string;
  readonly contentHtml: string;
  readonly version: number;
  readonly isPublished: boolean;
  readonly updatedOnUtc: string | null;
}

export interface SaveProductInstructionsRequest {
  readonly title: string;
  readonly contentHtml: string;
}

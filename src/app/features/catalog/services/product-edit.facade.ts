import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { CategoryOption, Product, UpdateProductRequest } from '../models/product.model';
import { CategoryApiService } from './category-api.service';
import { ProductApiService } from './product-api.service';

const CATEGORY_PAGE_SIZE = 100;

@Injectable()
export class ProductEditFacade {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly productApi = inject(ProductApiService);

  private readonly productState = signal<Product | null>(null);
  private readonly categoriesState = signal<readonly CategoryOption[]>([]);
  private readonly loadingState = signal(false);
  private readonly categoriesLoadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly submittingState = signal(false);
  private readonly submitErrorState = signal<string | null>(null);

  readonly product = this.productState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly categoriesLoading = this.categoriesLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly submitError = this.submitErrorState.asReadonly();
  readonly productId = computed(() => this.productState()?.id ?? null);

  async load(productId: string): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [product] = await Promise.all([
        firstValueFrom(this.productApi.getProductById(productId)),
        this.loadCategories(),
      ]);

      this.productState.set(product);
    } catch (error) {
      this.productState.set(null);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load product.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async updateProduct(productId: string, request: UpdateProductRequest): Promise<boolean> {
    this.submittingState.set(true);
    this.submitErrorState.set(null);

    try {
      await firstValueFrom(this.productApi.updateProduct(productId, request));
      const product = await firstValueFrom(this.productApi.getProductById(productId));
      this.productState.set(product);
      return true;
    } catch (error) {
      this.submitErrorState.set(this.toErrorMessage(error, 'Failed to update product.'));
      return false;
    } finally {
      this.submittingState.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    this.categoriesLoadingState.set(true);

    try {
      const result = await firstValueFrom(
        this.categoryApi.getCategories({
          pageNumber: 1,
          pageSize: CATEGORY_PAGE_SIZE,
          activeOnly: true,
        }),
      );

      this.categoriesState.set(
        (result.items ?? []).map((category) => ({
          id: category.id,
          label: category.nameEn,
        })),
      );
    } catch {
      this.categoriesState.set([]);
    } finally {
      this.categoriesLoadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

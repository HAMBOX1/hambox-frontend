import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { CategoryOption, CreateProductRequest, UpdateProductRequest } from '../models/product.model';
import { CategoryApiService } from './category-api.service';
import { ProductApiService } from './product-api.service';

const CATEGORY_PAGE_SIZE = 100;

@Injectable()
export class ProductCreateFacade {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly productApi = inject(ProductApiService);

  private readonly categoriesState = signal<readonly CategoryOption[]>([]);
  private readonly categoriesLoadingState = signal(false);
  private readonly categoriesErrorState = signal<string | null>(null);
  private readonly submittingState = signal(false);
  private readonly submitErrorState = signal<string | null>(null);

  readonly categories = this.categoriesState.asReadonly();
  readonly categoriesLoading = this.categoriesLoadingState.asReadonly();
  readonly categoriesError = this.categoriesErrorState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly submitError = this.submitErrorState.asReadonly();

  readonly hasCategories = computed(() => this.categoriesState().length > 0);

  async loadCategories(): Promise<void> {
    this.categoriesLoadingState.set(true);
    this.categoriesErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.categoryApi.getCategories({
          pageNumber: 1,
          pageSize: CATEGORY_PAGE_SIZE,
          activeOnly: true,
        }),
      );

      const options = (result.items ?? []).map((category) => ({
        id: category.id,
        label: category.nameEn,
      }));

      this.categoriesState.set(options);
    } catch (error) {
      this.categoriesState.set([]);
      this.categoriesErrorState.set(this.toErrorMessage(error, 'Failed to load categories.'));
    } finally {
      this.categoriesLoadingState.set(false);
    }
  }

  async createProduct(
    request: CreateProductRequest,
    options?: { publish?: boolean; imageFiles?: readonly File[] },
  ): Promise<string | null> {
    this.submittingState.set(true);
    this.submitErrorState.set(null);

    try {
      const id = await firstValueFrom(this.productApi.createProduct(request));

      if (options?.imageFiles?.length) {
        for (const file of options.imageFiles) {
          await firstValueFrom(this.productApi.uploadProductImage(id, file));
        }
      }

      if (options?.publish) {
        const updateRequest: UpdateProductRequest = {
          ...request,
          status: 'Active',
        };
        await firstValueFrom(this.productApi.updateProduct(id, updateRequest));
      }

      return id;
    } catch (error) {
      this.submitErrorState.set(this.toErrorMessage(error, 'Failed to create product.'));
      return null;
    } finally {
      this.submittingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to manage products. Sign in with an admin account (admin@hambox.local in development).';
      }

      return error.message;
    }

    return fallback;
  }
}

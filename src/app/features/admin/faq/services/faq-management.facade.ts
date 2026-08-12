import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FAQ_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  CreateFaqCategoryRequest,
  CreateFaqRequest,
  FaqCategoryDto,
  FaqDto,
  FaqListQuery,
  FaqListResult,
  FaqReorderEntry,
  FaqScope,
  UpdateFaqRequest,
} from '../models/faq-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class FaqManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly faqsState = signal<readonly FaqDto[]>([]);
  private readonly faqsLoadingState = signal(false);
  private readonly faqsErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly scopeFilterState = signal<FaqScope | 'all'>('all');
  private readonly categoryFilterState = signal<string>('all');
  private readonly publishedFilterState = signal<boolean | 'all'>('all');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);

  private readonly categoriesState = signal<readonly FaqCategoryDto[]>([]);
  private readonly categoriesLoadingState = signal(false);

  private readonly detailState = signal<FaqDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailSavingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly faqs = this.faqsState.asReadonly();
  readonly faqsLoading = this.faqsLoadingState.asReadonly();
  readonly faqsError = this.faqsErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly scopeFilter = this.scopeFilterState.asReadonly();
  readonly categoryFilter = this.categoryFilterState.asReadonly();
  readonly publishedFilter = this.publishedFilterState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly categories = this.categoriesState.asReadonly();
  readonly categoriesLoading = this.categoriesLoadingState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailSaving = this.detailSavingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  readonly hasActiveFilters = computed(
    () =>
      this.searchTermState().trim().length > 0 ||
      this.scopeFilterState() !== 'all' ||
      this.categoryFilterState() !== 'all' ||
      this.publishedFilterState() !== 'all',
  );

  loadFaqs(): void {
    void this.fetchFaqs();
  }

  reloadFaqs(): Promise<void> {
    return this.fetchFaqs();
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleFaqsReload();
  }

  setScopeFilter(scope: FaqScope | 'all'): void {
    this.scopeFilterState.set(scope);
    this.pageNumberState.set(1);
    void this.fetchFaqs();
  }

  setCategoryFilter(categoryId: string): void {
    this.categoryFilterState.set(categoryId);
    this.pageNumberState.set(1);
    void this.fetchFaqs();
  }

  setPublishedFilter(value: boolean | 'all'): void {
    this.publishedFilterState.set(value);
    this.pageNumberState.set(1);
    void this.fetchFaqs();
  }

  setPage(pageNumber: number, pageSize: number): void {
    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchFaqs();
  }

  async loadCategories(): Promise<void> {
    this.categoriesLoadingState.set(true);
    try {
      const categories = await firstValueFrom(this.api.get<FaqCategoryDto[]>(FAQ_API.categories));
      this.categoriesState.set(categories ?? []);
    } catch {
      this.categoriesState.set([]);
    } finally {
      this.categoriesLoadingState.set(false);
    }
  }

  async createCategory(request: CreateFaqCategoryRequest): Promise<FaqCategoryDto | null> {
    try {
      const created = await firstValueFrom(
        this.api.post<FaqCategoryDto>(FAQ_API.categories, request),
      );
      this.categoriesState.set([...this.categoriesState(), created]);
      return created;
    } catch {
      return null;
    }
  }

  async loadDetail(id: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<FaqDto>(FAQ_API.faq(id)));
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load FAQ.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  resetDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
  }

  async createFaq(request: CreateFaqRequest): Promise<string | null> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      return await firstValueFrom(this.api.post<string>(FAQ_API.faqs, request));
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create FAQ.'));
      return null;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async updateFaq(id: string, request: UpdateFaqRequest): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(FAQ_API.faq(id), request));
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to save FAQ.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async deleteFaq(id: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      await firstValueFrom(this.api.delete<void>(FAQ_API.faq(id)));
      await this.fetchFaqs();
      return true;
    } catch (error) {
      this.faqsErrorState.set(this.toErrorMessage(error, 'Failed to delete FAQ.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async setPublishState(id: string, publish: boolean): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      await firstValueFrom(this.api.post<void>(publish ? FAQ_API.publish(id) : FAQ_API.unpublish(id), {}));
      await this.fetchFaqs();
      return true;
    } catch (error) {
      this.faqsErrorState.set(this.toErrorMessage(error, 'Failed to update publish state.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicateFaq(id: string): Promise<string | null> {
    this.actionLoadingState.set(true);
    try {
      const createdId = await firstValueFrom(this.api.post<string>(FAQ_API.duplicate(id), {}));
      await this.fetchFaqs();
      return createdId;
    } catch (error) {
      this.faqsErrorState.set(this.toErrorMessage(error, 'Failed to duplicate FAQ.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async reorderFaqs(entries: readonly FaqReorderEntry[]): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      await firstValueFrom(this.api.put<void>(FAQ_API.reorder, { entries }));
      await this.fetchFaqs();
      return true;
    } catch (error) {
      this.faqsErrorState.set(this.toErrorMessage(error, 'Failed to reorder FAQs.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private scheduleFaqsReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchFaqs();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchFaqs(): Promise<void> {
    this.faqsLoadingState.set(true);
    this.faqsErrorState.set(null);

    const query: FaqListQuery = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      searchTerm: this.searchTermState(),
      scope: this.scopeFilterState(),
      categoryId: this.categoryFilterState(),
      isPublished: this.publishedFilterState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<FaqListResult>(FAQ_API.faqs, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
            ...(query.scope && query.scope !== 'all' ? { scope: query.scope } : {}),
            ...(query.categoryId && query.categoryId !== 'all' ? { categoryId: query.categoryId } : {}),
            ...(query.isPublished !== 'all' ? { isPublished: query.isPublished } : {}),
          },
        }),
      );

      this.faqsState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? query.pageNumber);
      this.pageSizeState.set(result.pageSize ?? query.pageSize);
    } catch (error) {
      this.faqsState.set([]);
      this.totalCountState.set(0);
      this.faqsErrorState.set(this.toErrorMessage(error, 'Failed to load FAQs.'));
    } finally {
      this.faqsLoadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to perform this action.';
      }
      return error.message;
    }
    return fallback;
  }
}

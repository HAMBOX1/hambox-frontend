import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { CreateCategoryRequest, Category } from '../models/category.model';
import { CategoryApiService } from './category-api.service';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class CategoryListFacade {
  private readonly api = inject(CategoryApiService);

  private readonly itemsState = signal<readonly Category[]>([]);
  private readonly loadingState = signal(false);
  private readonly creatingState = signal(false);
  private readonly searchTermState = signal('');
  private readonly errorState = signal<string | null>(null);
  private readonly createErrorState = signal<string | null>(null);
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly createDialogOpenState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly hasLoadedState = signal(false);

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly creating = this.creatingState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly createError = this.createErrorState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly createDialogOpen = this.createDialogOpenState.asReadonly();

  readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);
  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);
  readonly subtitle = computed(() => {
    const count = this.totalCount();
    const noun = count === 1 ? 'category' : 'categories';

    if (this.hasActiveSearch()) {
      return `Showing ${count} matching ${noun}`;
    }

    return `Managing ${count} catalog ${noun}`;
  });

  load(): void {
    void this.fetchCategories(true);
  }

  reload(): Promise<void> {
    return this.fetchCategories(true);
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleReload();
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (
      this.pageNumberState() === pageNumber &&
      this.pageSizeState() === pageSize &&
      this.hasLoadedState()
    ) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchCategories();
  }

  openCreateDialog(): void {
    this.createErrorState.set(null);
    this.createDialogOpenState.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpenState.set(false);
    this.createErrorState.set(null);
  }

  async createCategory(request: CreateCategoryRequest): Promise<boolean> {
    this.creatingState.set(true);
    this.createErrorState.set(null);

    try {
      await firstValueFrom(this.api.createCategory(request));
      this.createDialogOpenState.set(false);
      this.pageNumberState.set(1);
      await this.fetchCategories(true);
      return true;
    } catch (error) {
      this.createErrorState.set(this.toErrorMessage(error, 'Failed to create category.'));
      return false;
    } finally {
      this.creatingState.set(false);
    }
  }

  private scheduleReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchCategories();
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchCategories(force = false): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.getCategories({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          searchTerm: this.searchTermState(),
        }),
      );

      this.itemsState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? this.pageNumberState());
      this.pageSizeState.set(result.pageSize ?? this.pageSizeState());
      this.hasLoadedState.set(true);
    } catch (error) {
      this.itemsState.set([]);
      this.totalCountState.set(0);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load categories.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to manage categories. Sign in with an admin account (admin@hambox.local in development).';
      }

      return error.message;
    }

    return fallback;
  }
}

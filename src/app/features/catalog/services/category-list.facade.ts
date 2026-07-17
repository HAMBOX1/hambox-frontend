import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import {
  Category,
  CategoryOption,
  CreateCategoryRequest,
  NewParentDraft,
  UpdateCategoryRequest,
} from '../models/category.model';
import { CategoryApiService } from './category-api.service';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const PARENT_PAGE_SIZE = 100;

@Injectable()
export class CategoryListFacade {
  private readonly api = inject(CategoryApiService);

  private readonly itemsState = signal<readonly Category[]>([]);
  private readonly parentOptionsState = signal<readonly CategoryOption[]>([]);
  private readonly loadingState = signal(false);
  private readonly creatingState = signal(false);
  private readonly updatingState = signal(false);
  private readonly searchTermState = signal('');
  private readonly statusFilterState = signal('');
  private readonly deletingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly createErrorState = signal<string | null>(null);
  private readonly updateErrorState = signal<string | null>(null);
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly createDialogOpenState = signal(false);
  private readonly editDialogOpenState = signal(false);
  private readonly editingCategoryState = signal<Category | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly hasLoadedState = signal(false);

  readonly items = this.itemsState.asReadonly();
  readonly parentOptions = this.parentOptionsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly creating = this.creatingState.asReadonly();
  readonly updating = this.updatingState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly deleting = this.deletingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly createError = this.createErrorState.asReadonly();
  readonly updateError = this.updateErrorState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly createDialogOpen = this.createDialogOpenState.asReadonly();
  readonly editDialogOpen = this.editDialogOpenState.asReadonly();
  readonly editingCategory = this.editingCategoryState.asReadonly();

  readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);
  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);
  readonly hasActiveFilters = computed(
    () => this.hasActiveSearch() || this.statusFilterState().trim().length > 0,
  );
  readonly subtitle = computed(() => {
    const count = this.totalCount();
    const noun = count === 1 ? 'category' : 'categories';

    if (this.hasActiveFilters()) {
      return `Showing ${count} matching ${noun}`;
    }

    return `Managing ${count} catalog ${noun}`;
  });

  load(): void {
    void this.fetchCategories(true);
    void this.loadParentOptions();
  }

  reload(): Promise<void> {
    return this.fetchCategories(true);
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleReload();
  }

  setStatusFilter(status: string): void {
    this.statusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchCategories();
  }

  clearFilters(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchTermState.set('');
    this.statusFilterState.set('');
    this.pageNumberState.set(1);
    void this.fetchCategories();
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

  openEditDialog(category: Category): void {
    this.updateErrorState.set(null);
    this.editingCategoryState.set(category);
    this.editDialogOpenState.set(true);
  }

  closeEditDialog(): void {
    this.editDialogOpenState.set(false);
    this.editingCategoryState.set(null);
    this.updateErrorState.set(null);
  }

  async createCategory(request: CreateCategoryRequest): Promise<boolean> {
    this.creatingState.set(true);
    this.createErrorState.set(null);

    try {
      const parentId = await this.resolveParentId(request);
      const rootId = await firstValueFrom(
        this.api.createCategory({
          nameEn: request.nameEn,
          nameAr: request.nameAr,
          slug: request.slug,
          parentId,
        }),
      );

      // ponytail: subcategories are created as separate sequential calls (same non-transactional
      // trade-off as the inline new-parent creation below) — no batch/nested endpoint exists.
      for (const child of request.subcategories ?? []) {
        await firstValueFrom(
          this.api.createCategory({
            nameEn: child.nameEn,
            nameAr: child.nameAr,
            slug: child.slug,
            parentId: rootId,
          }),
        );
      }

      this.createDialogOpenState.set(false);
      this.pageNumberState.set(1);
      await this.fetchCategories(true);
      await this.loadParentOptions();
      return true;
    } catch (error) {
      this.createErrorState.set(this.toErrorMessage(error, 'Failed to create category.'));
      return false;
    } finally {
      this.creatingState.set(false);
    }
  }

  async updateCategory(request: UpdateCategoryRequest): Promise<boolean> {
    const category = this.editingCategoryState();
    if (!category) {
      return false;
    }

    this.updatingState.set(true);
    this.updateErrorState.set(null);

    try {
      const parentId = await this.resolveParentId(request);
      await firstValueFrom(
        this.api.updateCategory(category.id, {
          nameEn: request.nameEn,
          nameAr: request.nameAr,
          slug: request.slug,
          isActive: request.isActive,
          parentId,
        }),
      );
      this.editDialogOpenState.set(false);
      this.editingCategoryState.set(null);
      await this.fetchCategories(true);
      await this.loadParentOptions();
      return true;
    } catch (error) {
      this.updateErrorState.set(this.toErrorMessage(error, 'Failed to update category.'));
      return false;
    } finally {
      this.updatingState.set(false);
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    this.deletingState.set(true);

    try {
      await firstValueFrom(this.api.deleteCategory(categoryId));
      await this.fetchCategories(true);
      await this.loadParentOptions();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to delete category.'));
      return false;
    } finally {
      this.deletingState.set(false);
    }
  }

  async restoreCategory(category: Category): Promise<boolean> {
    try {
      await firstValueFrom(
        this.api.updateCategory(category.id, {
          nameAr: category.nameAr,
          nameEn: category.nameEn,
          slug: category.slug,
          isActive: true,
          parentId: category.parentId,
        }),
      );
      await this.fetchCategories(true);
      await this.loadParentOptions();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to reactivate category.'));
      return false;
    }
  }

  private async resolveParentId(request: {
    parentId?: string | null;
    newParent?: NewParentDraft | null;
  }): Promise<string | null> {
    if (!request.newParent) {
      return request.parentId ?? null;
    }

    // ponytail: parent + child are created as two separate calls (no cross-entity transaction
    // exists for this). If the child create fails after this succeeds, the new parent is left
    // standalone rather than rolled back — acceptable since it's still a valid category on its own.
    return firstValueFrom(
      this.api.createCategory({
        nameEn: request.newParent.nameEn,
        nameAr: request.newParent.nameAr,
        slug: request.newParent.slug,
        parentId: null,
      }),
    );
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
      const status = this.statusFilterState().trim();
      const activeOnly = status === 'active' ? true : status === 'inactive' ? false : undefined;

      const result = await firstValueFrom(
        this.api.getCategories({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          searchTerm: this.searchTermState(),
          activeOnly,
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

  private async loadParentOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.api.getCategories({
          pageNumber: 1,
          pageSize: PARENT_PAGE_SIZE,
          activeOnly: true,
        }),
      );

      this.parentOptionsState.set(
        (result.items ?? []).map((category) => ({
          id: category.id,
          label: category.nameEn,
        })),
      );
    } catch {
      this.parentOptionsState.set([]);
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

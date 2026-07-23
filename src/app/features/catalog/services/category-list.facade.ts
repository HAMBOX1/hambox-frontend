import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import {
  Category,
  CategoryOption,
  CategoryReorderEntry,
  CategoryTreeItem,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../models/category.model';
import { buildTree, findAncestorIds, isDescendantOf } from '../utils/category-tree.utils';
import { CategoryApiService, createCategoryWithHierarchy } from './category-api.service';

@Injectable()
export class CategoryListFacade {
  private readonly api = inject(CategoryApiService);

  private readonly flatItemsState = signal<readonly CategoryTreeItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly creatingState = signal(false);
  private readonly updatingState = signal(false);
  private readonly deletingState = signal(false);
  private readonly searchTermState = signal('');
  private readonly errorState = signal<string | null>(null);
  private readonly createErrorState = signal<string | null>(null);
  private readonly updateErrorState = signal<string | null>(null);
  private readonly createDialogOpenState = signal(false);
  private readonly editDialogOpenState = signal(false);
  private readonly editingCategoryState = signal<Category | null>(null);
  private readonly createParentIdState = signal<string | null>(null);
  private readonly manualExpandedIdsState = signal<ReadonlySet<string>>(new Set());

  readonly loading = this.loadingState.asReadonly();
  readonly creating = this.creatingState.asReadonly();
  readonly updating = this.updatingState.asReadonly();
  readonly deleting = this.deletingState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly createError = this.createErrorState.asReadonly();
  readonly updateError = this.updateErrorState.asReadonly();
  readonly createDialogOpen = this.createDialogOpenState.asReadonly();
  readonly editDialogOpen = this.editDialogOpenState.asReadonly();
  readonly editingCategory = this.editingCategoryState.asReadonly();
  readonly createParentId = this.createParentIdState.asReadonly();

  readonly flatItems = this.flatItemsState.asReadonly();
  readonly tree = computed(() => buildTree(this.flatItemsState()));
  readonly totalCount = computed(() => this.flatItemsState().length);
  readonly parentOptions = computed<readonly CategoryOption[]>(() =>
    this.flatItemsState().map((category) => ({
      id: category.id,
      label: category.nameEn,
      parentId: category.parentId,
    })),
  );

  private readonly parentMap = computed(
    () => new Map(this.flatItemsState().map((category) => [category.id, category])),
  );

  /** Parent options for the edit form: excludes the category being edited and every
   * one of its descendants, since assigning either as its own parent would create a
   * cycle. The backend rejects this too (`CategoryParentValidator`), but filtering it
   * out of the dropdown means the admin can't pick an option that's guaranteed to fail. */
  readonly editableParentOptions = computed<readonly CategoryOption[]>(() => {
    const editing = this.editingCategoryState();
    if (!editing) {
      return this.parentOptions();
    }

    const map = this.parentMap();
    return this.flatItemsState()
      .filter((category) => category.id !== editing.id && !isDescendantOf(category.id, editing.id, map))
      .map((category) => ({ id: category.id, label: category.nameEn, parentId: category.parentId }));
  });

  readonly isEmpty = computed(() => !this.loading() && this.flatItemsState().length === 0);
  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);

  readonly matchedIds = computed<ReadonlySet<string>>(() => {
    const term = this.searchTermState().trim().toLowerCase();
    if (!term) {
      return new Set();
    }

    return new Set(
      this.flatItemsState()
        .filter(
          (category) =>
            category.nameEn.toLowerCase().includes(term) ||
            category.nameAr.toLowerCase().includes(term) ||
            category.slug.toLowerCase().includes(term),
        )
        .map((category) => category.id),
    );
  });

  private readonly searchAncestorIds = computed<ReadonlySet<string>>(() => {
    const map = this.parentMap();
    const ancestors = new Set<string>();

    for (const id of this.matchedIds()) {
      for (const ancestorId of findAncestorIds(id, map)) {
        ancestors.add(ancestorId);
      }
    }

    return ancestors;
  });

  readonly effectiveExpandedIds = computed<ReadonlySet<string>>(() => {
    if (!this.hasActiveSearch()) {
      return this.manualExpandedIdsState();
    }

    return new Set([...this.manualExpandedIdsState(), ...this.searchAncestorIds()]);
  });

  readonly subtitle = computed(() => {
    const count = this.totalCount();
    const noun = count === 1 ? 'category' : 'categories';
    return `${count} ${noun}`;
  });

  load(): void {
    void this.loadTree();
  }

  reload(): Promise<void> {
    return this.loadTree();
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
  }

  toggleExpand(id: string): void {
    this.manualExpandedIdsState.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  expand(id: string): void {
    if (this.manualExpandedIdsState().has(id)) {
      return;
    }
    this.manualExpandedIdsState.update((current) => new Set(current).add(id));
  }

  openCreateDialog(parentId: string | null = null): void {
    this.createErrorState.set(null);
    this.createParentIdState.set(parentId);
    this.createDialogOpenState.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpenState.set(false);
    this.createErrorState.set(null);
    this.createParentIdState.set(null);
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
      await createCategoryWithHierarchy(this.api, request);
      this.createDialogOpenState.set(false);
      this.createParentIdState.set(null);
      await this.loadTree();
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
      await firstValueFrom(this.api.updateCategory(category.id, request));
      this.editDialogOpenState.set(false);
      this.editingCategoryState.set(null);
      await this.loadTree();
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
      await this.loadTree();
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
      await this.loadTree();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to reactivate category.'));
      return false;
    }
  }

  async reorderCategories(entries: readonly CategoryReorderEntry[]): Promise<boolean> {
    if (entries.length === 0) {
      return true;
    }

    const snapshot = this.flatItemsState();
    const patch = new Map(entries.map((entry) => [entry.id, entry]));

    this.flatItemsState.set(
      snapshot.map((item) => {
        const entry = patch.get(item.id);
        return entry ? { ...item, parentId: entry.parentId, sortOrder: entry.sortOrder } : item;
      }),
    );

    try {
      await firstValueFrom(this.api.reorderCategories(entries));
      return true;
    } catch (error) {
      this.flatItemsState.set(snapshot);
      this.errorState.set(this.toErrorMessage(error, 'Failed to reorder categories.'));
      return false;
    }
  }

  private async loadTree(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const items = await firstValueFrom(this.api.getCategoryTree());
      this.flatItemsState.set(items ?? []);
    } catch (error) {
      this.flatItemsState.set([]);
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

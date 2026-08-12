import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import {
  CollectionOption,
  CollectionReorderEntry,
  CollectionTreeItem,
  CreateCollectionRequest,
  ProductCollection,
  UpdateCollectionRequest,
} from '../models/collection.model';
import { buildTree, findAncestorIds, isDescendantOf } from '../utils/collection-tree.utils';
import { CollectionApiService } from './collection-api.service';

/** Mirrors `CategoryListFacade` — same state shape, over the flat (no bilingual/slug) Collection model. */
@Injectable()
export class CollectionListFacade {
  private readonly api = inject(CollectionApiService);

  private readonly flatItemsState = signal<readonly CollectionTreeItem[]>([]);
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
  private readonly editingCollectionState = signal<ProductCollection | null>(null);
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
  readonly editingCollection = this.editingCollectionState.asReadonly();
  readonly createParentId = this.createParentIdState.asReadonly();

  readonly flatItems = this.flatItemsState.asReadonly();
  readonly tree = computed(() => buildTree(this.flatItemsState()));
  readonly totalCount = computed(() => this.flatItemsState().length);
  readonly parentOptions = computed<readonly CollectionOption[]>(() =>
    this.flatItemsState().map((collection) => ({
      id: collection.id,
      label: collection.name,
      parentId: collection.parentId,
    })),
  );

  private readonly parentMap = computed(
    () => new Map(this.flatItemsState().map((collection) => [collection.id, collection])),
  );

  /** Excludes the collection being edited and every one of its descendants from the parent
   * picker — assigning either would create a cycle the backend rejects anyway. */
  readonly editableParentOptions = computed<readonly CollectionOption[]>(() => {
    const editing = this.editingCollectionState();
    if (!editing) {
      return this.parentOptions();
    }

    const map = this.parentMap();
    return this.flatItemsState()
      .filter((collection) => collection.id !== editing.id && !isDescendantOf(collection.id, editing.id, map))
      .map((collection) => ({ id: collection.id, label: collection.name, parentId: collection.parentId }));
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
          (collection) =>
            collection.name.toLowerCase().includes(term) ||
            (collection.description?.toLowerCase().includes(term) ?? false),
        )
        .map((collection) => collection.id),
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
    const noun = count === 1 ? 'internal category' : 'internal categories';
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

  openEditDialog(collection: ProductCollection): void {
    this.updateErrorState.set(null);
    this.editingCollectionState.set(collection);
    this.editDialogOpenState.set(true);
  }

  closeEditDialog(): void {
    this.editDialogOpenState.set(false);
    this.editingCollectionState.set(null);
    this.updateErrorState.set(null);
  }

  async createCollection(request: CreateCollectionRequest): Promise<string | null> {
    this.creatingState.set(true);
    this.createErrorState.set(null);

    try {
      const id = await firstValueFrom(this.api.createCollection(request));
      this.createDialogOpenState.set(false);
      this.createParentIdState.set(null);
      await this.loadTree();
      return id;
    } catch (error) {
      this.createErrorState.set(this.toErrorMessage(error, 'Failed to create internal category.'));
      return null;
    } finally {
      this.creatingState.set(false);
    }
  }

  async updateCollection(request: UpdateCollectionRequest): Promise<boolean> {
    const collection = this.editingCollectionState();
    if (!collection) {
      return false;
    }

    this.updatingState.set(true);
    this.updateErrorState.set(null);

    try {
      await firstValueFrom(this.api.updateCollection(collection.id, request));
      this.editDialogOpenState.set(false);
      this.editingCollectionState.set(null);
      await this.loadTree();
      return true;
    } catch (error) {
      this.updateErrorState.set(this.toErrorMessage(error, 'Failed to update internal category.'));
      return false;
    } finally {
      this.updatingState.set(false);
    }
  }

  async deleteCollection(collectionId: string): Promise<boolean> {
    this.deletingState.set(true);

    try {
      await firstValueFrom(this.api.deleteCollection(collectionId));
      await this.loadTree();
      return true;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Failed to delete internal category.'));
      return false;
    } finally {
      this.deletingState.set(false);
    }
  }

  async reorderCollections(entries: readonly CollectionReorderEntry[]): Promise<boolean> {
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
      await firstValueFrom(this.api.reorderCollections(entries));
      return true;
    } catch (error) {
      this.flatItemsState.set(snapshot);
      this.errorState.set(this.toErrorMessage(error, 'Failed to reorder internal categories.'));
      return false;
    }
  }

  private async loadTree(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const items = await firstValueFrom(this.api.getCollectionTree());
      this.flatItemsState.set(items ?? []);
    } catch (error) {
      this.flatItemsState.set([]);
      this.errorState.set(this.toErrorMessage(error, 'Failed to load internal categories.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to manage internal categories. Sign in with an admin account (admin@hambox.local in development).';
      }

      return error.message;
    }

    return fallback;
  }
}

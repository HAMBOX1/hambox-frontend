import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { PagedResult } from '../../catalog/models/category.model';
import { CustomerLibraryItemApiDto, CustomerLibraryQuery } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';
import { resolveWishlistItemImageUrl } from '../utils/wishlist-image.util';

const SEARCH_DEBOUNCE_MS = 300;
const REVEAL_TIMEOUT_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class AccountLibraryFacade {
  private readonly api = inject(AccountApiService);

  private readonly itemsState = signal<readonly CustomerLibraryItemApiDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly deliveryFilterState = signal('');
  private readonly sortState = signal<CustomerLibraryQuery['sort']>('recent');
  private readonly groupFilterState = signal<CustomerLibraryQuery['group'] | ''>('');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(12);
  private readonly revealedKeysState = signal<ReadonlyMap<string, string>>(new Map());
  private readonly revealingIdsState = signal<ReadonlySet<string>>(new Set());
  private readonly highlightItemIdState = signal<string | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly revealTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly deliveryFilter = this.deliveryFilterState.asReadonly();
  readonly sort = this.sortState.asReadonly();
  readonly groupFilter = this.groupFilterState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly revealedKeys = this.revealedKeysState.asReadonly();
  readonly highlightItemId = this.highlightItemIdState.asReadonly();

  readonly isEmpty = computed(() => !this.loading() && this.itemsState().length === 0);

  readonly recentItems = computed(() => this.itemsState().filter((item) => item.isRecentPurchase));

  readonly olderItems = computed(() => this.itemsState().filter((item) => !item.isRecentPurchase));

  readonly showGroupedSections = computed(
    () => !this.groupFilterState() && !this.searchTermState().trim() && !this.deliveryFilterState(),
  );

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.getLibrary({
          pageNumber: this.pageNumberState(),
          pageSize: this.pageSizeState(),
          searchTerm: this.searchTermState(),
          deliveryStatus: this.deliveryFilterState() || undefined,
          sort: this.sortState() ?? 'recent',
          group: this.groupFilterState() || undefined,
        }),
      );

      this.applyResult(result);
    } catch (error) {
      this.itemsState.set([]);
      this.totalCountState.set(0);
      this.errorState.set(this.toErrorMessage(error, 'Unable to load your library.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleReload();
  }

  setDeliveryFilter(status: string): void {
    this.deliveryFilterState.set(status);
    this.pageNumberState.set(1);
    void this.load();
  }

  setSort(sort: CustomerLibraryQuery['sort']): void {
    this.sortState.set(sort ?? 'recent');
    this.pageNumberState.set(1);
    void this.load();
  }

  setGroupFilter(group: CustomerLibraryQuery['group'] | ''): void {
    this.groupFilterState.set(group ?? '');
    this.pageNumberState.set(1);
    void this.load();
  }

  setPage(pageNumber: number): void {
    this.pageNumberState.set(Math.max(1, pageNumber));
    void this.load();
  }

  setHighlightItemId(itemId: string | null): void {
    this.highlightItemIdState.set(itemId);
  }

  isKeyRevealed(itemId: string): boolean {
    return this.revealedKeysState().has(itemId);
  }

  isRevealing(itemId: string): boolean {
    return this.revealingIdsState().has(itemId);
  }

  getRevealedKey(itemId: string): string | null {
    return this.revealedKeysState().get(itemId) ?? null;
  }

  async revealKey(itemId: string): Promise<string | null> {
    if (this.revealedKeysState().has(itemId)) {
      this.scheduleHide(itemId);
      return this.revealedKeysState().get(itemId) ?? null;
    }

    this.revealingIdsState.update((current) => new Set([...current, itemId]));

    try {
      const result = await firstValueFrom(this.api.revealLibraryKey(itemId));
      this.revealedKeysState.update((current) => {
        const next = new Map(current);
        next.set(itemId, result.licenseKey);
        return next;
      });
      this.scheduleHide(itemId);
      return result.licenseKey;
    } catch (error) {
      this.errorState.set(this.toErrorMessage(error, 'Unable to reveal activation code.'));
      return null;
    } finally {
      this.revealingIdsState.update((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }

  hideKey(itemId: string): void {
    const timer = this.revealTimers.get(itemId);
    if (timer) {
      clearTimeout(timer);
      this.revealTimers.delete(itemId);
    }

    this.revealedKeysState.update((current) => {
      const next = new Map(current);
      next.delete(itemId);
      return next;
    });
  }

  async copyKey(itemId: string): Promise<boolean> {
    const key = this.revealedKeysState().get(itemId);
    if (!key) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(key);
      return true;
    } catch {
      return false;
    }
  }

  resolveImageUrl(imageUrl: string | null | undefined, index: number): string {
    return resolveWishlistItemImageUrl(imageUrl, index);
  }

  private scheduleHide(itemId: string): void {
    const existing = this.revealTimers.get(itemId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.hideKey(itemId);
    }, REVEAL_TIMEOUT_MS);

    this.revealTimers.set(itemId, timer);
  }

  private scheduleReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.load();
    }, SEARCH_DEBOUNCE_MS);
  }

  private applyResult(result: PagedResult<CustomerLibraryItemApiDto>): void {
    this.itemsState.set(result.items ?? []);
    this.totalCountState.set(result.totalCount ?? 0);
    this.pageNumberState.set(result.pageNumber ?? this.pageNumberState());
    this.pageSizeState.set(result.pageSize ?? this.pageSizeState());
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

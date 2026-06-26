import { computed, Injectable, signal } from '@angular/core';

import { ProductDraftData, ProductDraftFormSnapshot } from '../models/product.model';

export const PRODUCT_DRAFT_STORAGE_KEY = 'hambox.product.draft';

export interface ProductDraftPayload extends ProductDraftFormSnapshot {
  readonly activeStep: ProductDraftData['activeStep'];
  readonly assets: ProductDraftData['assets'];
}

@Injectable({
  providedIn: 'root',
})
export class ProductDraftService {
  private readonly draftRestoredState = signal(false);
  private readonly savingState = signal(false);
  private readonly lastSavedAtState = signal<number | null>(null);
  private readonly nowState = signal(Date.now());

  private tickerId: ReturnType<typeof setInterval> | undefined;

  readonly draftRestored = this.draftRestoredState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly lastSavedAt = this.lastSavedAtState.asReadonly();

  readonly bannerText = computed(() => {
    if (this.savingState()) {
      return 'Saving...';
    }

    if (this.draftRestoredState()) {
      return 'Draft Restored';
    }

    const lastSavedAt = this.lastSavedAtState();
    if (lastSavedAt) {
      return this.formatSavedAgo(lastSavedAt, this.nowState());
    }

    return '';
  });

  readonly showBanner = computed(() => this.bannerText().length > 0);

  constructor() {
    if (typeof window !== 'undefined') {
      this.tickerId = setInterval(() => {
        this.nowState.set(Date.now());
      }, 1000);
    }
  }

  loadDraft(): ProductDraftData | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(PRODUCT_DRAFT_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as ProductDraftData;

      if (parsed.version !== 1) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  restoreDraft(): ProductDraftData | null {
    const draft = this.loadDraft();

    if (!draft || this.isDraftEmpty(draft)) {
      return null;
    }

    this.draftRestoredState.set(true);
    this.lastSavedAtState.set(Date.parse(draft.savedAt));

    return draft;
  }

  saveDraft(payload: ProductDraftPayload): void {
    if (this.isDraftEmpty(payload)) {
      return;
    }

    this.savingState.set(true);
    this.draftRestoredState.set(false);

    try {
      const draft: ProductDraftData = {
        version: 1,
        savedAt: new Date().toISOString(),
        ...payload,
      };

      localStorage.setItem(PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      this.lastSavedAtState.set(Date.now());
    } catch {
      // Ignore storage quota or serialization errors.
    } finally {
      this.savingState.set(false);
    }
  }

  clearDraft(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PRODUCT_DRAFT_STORAGE_KEY);
    }

    this.draftRestoredState.set(false);
    this.savingState.set(false);
    this.lastSavedAtState.set(null);
  }

  private isDraftEmpty(
    payload: ProductDraftPayload | ProductDraftData,
  ): boolean {
    return (
      !payload.nameEn.trim() &&
      !payload.nameAr.trim() &&
      !payload.descriptionEn.trim() &&
      !payload.descriptionAr.trim() &&
      !payload.categoryId.trim() &&
      payload.price === 0 &&
      payload.assets.length === 0
    );
  }

  private formatSavedAgo(lastSavedAt: number, now: number): string {
    const seconds = Math.max(0, Math.floor((now - lastSavedAt) / 1000));

    if (seconds < 5) {
      return 'Saved just now';
    }

    if (seconds < 60) {
      return `Saved ${seconds} seconds ago`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes === 1) {
      return 'Saved 1 minute ago';
    }

    if (minutes < 60) {
      return `Saved ${minutes} minutes ago`;
    }

    const hours = Math.floor(minutes / 60);
    return hours === 1 ? 'Saved 1 hour ago' : `Saved ${hours} hours ago`;
  }
}

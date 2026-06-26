import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WishlistItemApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountWishlistFacade {
  private readonly api = inject(AccountApiService);

  private readonly itemsState = signal<readonly WishlistItemApiDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly actionState = signal<string | null>(null);

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly actionError = this.actionState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const items = await firstValueFrom(this.api.getWishlist());
      this.itemsState.set(items);
    } catch {
      this.itemsState.set([]);
      this.errorState.set('Unable to load your wishlist.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async remove(productId: string): Promise<void> {
    this.actionState.set(null);
    try {
      await firstValueFrom(this.api.removeWishlistItem(productId));
      this.itemsState.update((items) => items.filter((i) => i.productId !== productId));
    } catch {
      this.actionState.set('Unable to remove item from wishlist.');
    }
  }

  async add(productId: string): Promise<boolean> {
    this.actionState.set(null);
    try {
      const item = await firstValueFrom(this.api.addWishlistItem(productId));
      this.itemsState.update((items) => {
        if (items.some((i) => i.productId === productId)) {
          return items;
        }

        return [...items, item];
      });
      return true;
    } catch {
      this.actionState.set('Unable to add item to your vault.');
      return false;
    }
  }

  async moveToCart(productId: string): Promise<void> {
    this.actionState.set(null);
    try {
      await firstValueFrom(this.api.moveWishlistToCart(productId));
      this.itemsState.update((items) => items.filter((i) => i.productId !== productId));
    } catch {
      this.actionState.set('Unable to move item to cart.');
    }
  }
}

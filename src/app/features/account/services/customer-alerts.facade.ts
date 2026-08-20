import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/models/api-error.model';
import { CustomerAlertSubscriptionApiDto, CustomerAlertType } from '../models/customer-alert.model';
import { CustomerAlertsApiService } from './customer-alerts-api.service';

function subscriptionKey(variantId: string, alertType: CustomerAlertType): string {
  return `${variantId}::${alertType}`;
}

/**
 * Owns customer "Notify Me" alert-subscription state. Mirrors AccountWishlistFacade's shape
 * (signals + optimistic local updates, errors surfaced as a message string rather than thrown) so
 * every consumer — the product card, the PDP, and the /account/alerts page — behaves the same way.
 */
@Injectable({
  providedIn: 'root',
})
export class CustomerAlertsFacade {
  private readonly api = inject(CustomerAlertsApiService);

  private readonly itemsState = signal<readonly CustomerAlertSubscriptionApiDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly actionState = signal<string | null>(null);

  /** (variantId, alertType) pairs this browser session has successfully subscribed to — lets a
   * product card/PDP button reflect "you're subscribed" immediately after a create call, without a
   * second round trip to re-fetch the list. Reset naturally on full page reload; harmless either way
   * since re-subscribing just surfaces the existing subscription instead of erroring. */
  private readonly subscribedKeysState = signal<ReadonlySet<string>>(new Set());

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly actionError = this.actionState.asReadonly();

  isSubscribed(variantId: string, alertType: CustomerAlertType): boolean {
    return this.subscribedKeysState().has(subscriptionKey(variantId, alertType));
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const items = await firstValueFrom(this.api.getMine());
      this.itemsState.set(items);
    } catch {
      this.itemsState.set([]);
      this.errorState.set('Unable to load your alerts.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async subscribe(variantId: string, alertType: CustomerAlertType): Promise<boolean> {
    this.actionState.set(null);

    try {
      await firstValueFrom(this.api.create({ variantId, alertType }));
      this.markSubscribed(variantId, alertType);
      return true;
    } catch (error) {
      // Already subscribed reads as success to the caller — the customer's intent (be notified) is
      // already satisfied, so the button should reflect "subscribed" rather than show an error.
      if (error instanceof ApiError && error.code === 'CustomerAlerts.AlreadyExists') {
        this.markSubscribed(variantId, alertType);
        return true;
      }

      this.actionState.set(
        error instanceof ApiError ? error.message : 'Unable to create this alert.',
      );
      return false;
    }
  }

  async remove(id: string): Promise<void> {
    this.actionState.set(null);
    try {
      await firstValueFrom(this.api.remove(id));
      this.itemsState.update((items) => items.filter((i) => i.id !== id));
    } catch {
      this.actionState.set('Unable to remove this alert.');
    }
  }

  /** Reassigns any anonymously-created alerts to the now-authenticated customer. Called
   * unconditionally after every login, mirroring CartFacade.mergeGuestCartIfNeeded() — a harmless
   * no-op when there's nothing to claim. */
  async claimGuestAlertsIfNeeded(): Promise<void> {
    try {
      await firstValueFrom(this.api.claimGuestAlerts());
    } catch {
      // Best-effort — a failed claim just leaves the guest alert(s) to try again next login.
    }
  }

  private markSubscribed(variantId: string, alertType: CustomerAlertType): void {
    this.subscribedKeysState.update((keys) => new Set(keys).add(subscriptionKey(variantId, alertType)));
  }
}

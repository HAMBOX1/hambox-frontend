import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AUTH_CONTEXT } from '../../../core/auth/auth-context';
import { NotificationHubService } from '../../../core/notifications/notification-hub.service';
import { CommunicationPreferencesApiDto, NotificationQuery, UserNotificationApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountNotificationsFacade {
  private readonly api = inject(AccountApiService);
  private readonly hub = inject(NotificationHubService);
  private realtimeWired = false;

  private readonly itemsState = signal<readonly UserNotificationApiDto[]>([]);
  private readonly unreadCountState = signal(0);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly preferencesState = signal<CommunicationPreferencesApiDto | null>(null);
  private readonly preferencesLoadingState = signal(false);
  private readonly preferencesSavingState = signal(false);
  private readonly preferencesErrorState = signal<string | null>(null);

  /** Bumped on every `load()` call. `AccountNotificationsFacade` is a singleton shared by every
   * concurrently-mounted `NotificationBellComponent` (desktop + mobile chrome render both at once,
   * CSS-hiding one) plus the dedicated notifications page — so multiple `load()` calls with different
   * filters are routinely in flight together. A response is only applied if it's still the most
   * recently *started* request by the time it resolves; an older, slower response is discarded instead
   * of clobbering whatever a newer call (or a SignalR push that landed in between) already set. */
  private loadRequestId = 0;

  readonly items = this.itemsState.asReadonly();
  readonly unreadCount = this.unreadCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hasUnread = computed(() => this.unreadCountState() > 0);

  readonly preferences = this.preferencesState.asReadonly();
  readonly preferencesLoading = this.preferencesLoadingState.asReadonly();
  readonly preferencesSaving = this.preferencesSavingState.asReadonly();
  readonly preferencesError = this.preferencesErrorState.asReadonly();

  /** Loads the caller's notifications. Called with no arguments by the notification bell — keep that
   * call's behavior (top 50, no filters) unchanged when extending this for the full notifications page.
   * Safe to call concurrently from multiple mounted consumers (see `loadRequestId` above) — a stale
   * response is discarded rather than overwriting newer state, and a failure never wipes out
   * previously-loaded data (it only surfaces `error`, leaving `items`/`unreadCount` as last known good). */
  async load(query: NotificationQuery = {}): Promise<void> {
    const requestId = ++this.loadRequestId;
    this.loadingState.set(true);
    this.errorState.set(null);
    void this.ensureRealtime();

    try {
      const [page, count] = await Promise.all([
        firstValueFrom(this.api.getNotifications(1, 50, query)),
        firstValueFrom(this.api.getUnreadNotificationCount()),
      ]);

      if (requestId !== this.loadRequestId) {
        return;
      }

      this.itemsState.set(page.items ?? []);
      this.unreadCountState.set(count);
    } catch {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.errorState.set('Unable to load notifications.');
    } finally {
      if (requestId === this.loadRequestId) {
        this.loadingState.set(false);
      }
    }
  }

  async markRead(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.markNotificationRead(id));
      this.itemsState.update((items) =>
        items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      this.unreadCountState.update((count) => Math.max(0, count - 1));
    } catch {
      this.errorState.set('Unable to mark notification as read.');
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(this.api.markAllNotificationsRead());
      this.itemsState.update((items) => items.map((item) => ({ ...item, isRead: true })));
      this.unreadCountState.set(0);
    } catch {
      this.errorState.set('Unable to mark all notifications as read.');
    }
  }

  async clearAll(): Promise<void> {
    await this.markAllRead();
    this.itemsState.set([]);
  }

  async archive(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.archiveNotification(id));
      this.itemsState.update((items) => items.filter((item) => item.id !== id));
      return true;
    } catch {
      this.errorState.set('Unable to archive notification.');
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteNotification(id));
      this.itemsState.update((items) => items.filter((item) => item.id !== id));
      return true;
    } catch {
      this.errorState.set('Unable to delete notification.');
      return false;
    }
  }

  async loadPreferences(): Promise<void> {
    this.preferencesLoadingState.set(true);
    this.preferencesErrorState.set(null);

    try {
      const preferences = await firstValueFrom(this.api.getNotificationPreferences());
      this.preferencesState.set(preferences);
    } catch {
      this.preferencesErrorState.set('Unable to load notification preferences.');
    } finally {
      this.preferencesLoadingState.set(false);
    }
  }

  async updatePreferences(preferences: CommunicationPreferencesApiDto): Promise<boolean> {
    this.preferencesSavingState.set(true);
    this.preferencesErrorState.set(null);

    try {
      await firstValueFrom(this.api.updateNotificationPreferences(preferences));
      this.preferencesState.set(preferences);
      return true;
    } catch {
      this.preferencesErrorState.set('Unable to save notification preferences.');
      return false;
    } finally {
      this.preferencesSavingState.set(false);
    }
  }

  /** Connects the notification hub and wires its events into local state, once. Failures (e.g. an
   * unauthenticated caller) leave `realtimeWired` false so the next `load()` retries. */
  private async ensureRealtime(): Promise<void> {
    if (this.realtimeWired) {
      return;
    }
    this.realtimeWired = true;

    try {
      await this.hub.connect(AUTH_CONTEXT.Customer);
    } catch {
      this.realtimeWired = false;
      return;
    }

    this.hub.notificationCreated$.subscribe(({ notification, unreadCount }) => {
      this.itemsState.update((items) => [notification, ...items.filter((item) => item.id !== notification.id)]);
      this.unreadCountState.set(unreadCount);
    });

    this.hub.notificationUpdated$.subscribe(({ notification, unreadCount }) => {
      this.itemsState.update((items) =>
        notification.isArchived
          ? items.filter((item) => item.id !== notification.id)
          : items.map((item) => (item.id === notification.id ? notification : item)),
      );
      this.unreadCountState.set(unreadCount);
    });

    this.hub.notificationDeleted$.subscribe(({ notificationId, unreadCount }) => {
      this.itemsState.update((items) => items.filter((item) => item.id !== notificationId));
      this.unreadCountState.set(unreadCount);
    });

    this.hub.allRead$.subscribe(() => {
      this.itemsState.update((items) => items.map((item) => ({ ...item, isRead: true })));
      this.unreadCountState.set(0);
    });
  }
}

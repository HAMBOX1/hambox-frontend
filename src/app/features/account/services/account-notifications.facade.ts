import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CommunicationPreferencesApiDto, NotificationQuery, UserNotificationApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountNotificationsFacade {
  private readonly api = inject(AccountApiService);

  private readonly itemsState = signal<readonly UserNotificationApiDto[]>([]);
  private readonly unreadCountState = signal(0);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly preferencesState = signal<CommunicationPreferencesApiDto | null>(null);
  private readonly preferencesLoadingState = signal(false);
  private readonly preferencesSavingState = signal(false);
  private readonly preferencesErrorState = signal<string | null>(null);

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
   * call's behavior (top 50, no filters) unchanged when extending this for the full notifications page. */
  async load(query: NotificationQuery = {}): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [page, count] = await Promise.all([
        firstValueFrom(this.api.getNotifications(1, 50, query)),
        firstValueFrom(this.api.getUnreadNotificationCount()),
      ]);
      this.itemsState.set(page.items ?? []);
      this.unreadCountState.set(count);
    } catch {
      this.itemsState.set([]);
      this.errorState.set('Unable to load notifications.');
    } finally {
      this.loadingState.set(false);
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
}

import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { UserNotificationApiDto } from '../models/account-api.model';
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

  readonly items = this.itemsState.asReadonly();
  readonly unreadCount = this.unreadCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hasUnread = computed(() => this.unreadCountState() > 0);

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [page, count] = await Promise.all([
        firstValueFrom(this.api.getNotifications(1, 50)),
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
}

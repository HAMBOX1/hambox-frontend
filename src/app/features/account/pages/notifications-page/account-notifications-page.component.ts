import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { HamboxRelativeTimePipe } from '../../../../shared/pipes/hambox-relative-time.pipe';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { getNotificationTypeMeta, groupNotificationsByDate } from '../../../../shared/utils/notification-type.util';
import { AccountNotificationsFacade } from '../../services/account-notifications.facade';
import { CommunicationPreferencesApiDto, UserNotificationApiDto } from '../../models/account-api.model';

type NotificationTab = 'all' | 'unread' | 'important';

@Component({
  selector: 'app-account-notifications-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    HamboxRelativeTimePipe,
    HamboxTranslateRefreshDirective,
    ToggleSwitchModule,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  templateUrl: './account-notifications-page.component.html',
  styleUrl: './account-notifications-page.component.scss',
})
export class AccountNotificationsPageComponent implements OnInit {
  private readonly facade = inject(AccountNotificationsFacade);
  private readonly router = inject(Router);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly unreadCount = this.facade.unreadCount;

  protected readonly preferences = this.facade.preferences;
  protected readonly preferencesLoading = this.facade.preferencesLoading;
  protected readonly preferencesSaving = this.facade.preferencesSaving;
  protected readonly preferencesError = this.facade.preferencesError;
  protected readonly preferencesOpen = signal(false);

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly showArchived = signal(false);
  protected readonly activeTab = signal<NotificationTab>('all');
  protected readonly markingAllRead = signal(false);

  protected readonly categories = computed(() => {
    const set = new Set(this.items().map((item) => item.category));
    return Array.from(set);
  });

  protected readonly importantUnreadCount = computed(
    () => this.items().filter((item) => !item.isRead && getNotificationTypeMeta(item.category).important).length,
  );

  /** Unread/Important are applied client-side on top of the already-loaded page — includeArchived,
   * category and search stay server-driven via `reload()` since those already round-trip correctly. */
  protected readonly tabFilteredItems = computed(() => {
    const tab = this.activeTab();
    const items = this.items();
    if (tab === 'unread') {
      return items.filter((item) => !item.isRead);
    }
    if (tab === 'important') {
      return items.filter((item) => getNotificationTypeMeta(item.category).important);
    }
    return items;
  });

  protected readonly groups = computed(() => groupNotificationsByDate(this.tabFilteredItems()));

  protected readonly isFiltered = computed(
    () =>
      this.activeTab() !== 'all' ||
      this.categoryFilter() !== 'all' ||
      this.showArchived() ||
      this.searchTerm().trim().length > 0,
  );

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    void this.facade.load({
      includeArchived: this.showArchived(),
      category: this.categoryFilter() === 'all' ? undefined : this.categoryFilter(),
      search: this.searchTerm().trim() || undefined,
    });
  }

  protected setTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
  }

  protected clearFilters(): void {
    this.activeTab.set('all');
    this.categoryFilter.set('all');
    this.showArchived.set(false);
    this.searchTerm.set('');
    this.reload();
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.reload();
  }

  protected onCategoryChange(category: string): void {
    this.categoryFilter.set(category);
    this.reload();
  }

  protected onShowArchivedChange(show: boolean): void {
    this.showArchived.set(show);
    this.reload();
  }

  protected typeIcon(item: UserNotificationApiDto): string {
    return getNotificationTypeMeta(item.category).icon;
  }

  protected typeSemantic(item: UserNotificationApiDto): string {
    return getNotificationTypeMeta(item.category).semantic;
  }

  protected typeLabelKey(item: UserNotificationApiDto): string {
    return getNotificationTypeMeta(item.category).labelKey;
  }

  protected markRead(id: string): void {
    void this.facade.markRead(id);
  }

  protected async markAllRead(): Promise<void> {
    this.markingAllRead.set(true);
    try {
      await this.facade.markAllRead();
    } finally {
      this.markingAllRead.set(false);
    }
  }

  protected archive(id: string): void {
    void this.facade.archive(id);
  }

  protected deleteNotification(id: string): void {
    void this.facade.deleteNotification(id);
  }

  protected async openItem(item: UserNotificationApiDto): Promise<void> {
    if (!item.isRead) {
      await this.facade.markRead(item.id);
    }

    void this.router.navigateByUrl(item.actionUrl?.trim() || '/account/library');
  }

  protected togglePreferences(): void {
    const next = !this.preferencesOpen();
    this.preferencesOpen.set(next);
    if (next && !this.preferences()) {
      void this.facade.loadPreferences();
    }
  }

  protected async togglePreference(key: keyof CommunicationPreferencesApiDto, value: boolean): Promise<void> {
    const current = this.preferences();
    if (!current) {
      return;
    }

    await this.facade.updatePreferences({ ...current, [key]: value });
  }
}

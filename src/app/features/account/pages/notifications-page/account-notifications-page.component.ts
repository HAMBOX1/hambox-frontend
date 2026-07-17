import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { AccountNotificationsFacade } from '../../services/account-notifications.facade';
import { CommunicationPreferencesApiDto, UserNotificationApiDto } from '../../models/account-api.model';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';

@Component({
  selector: 'app-account-notifications-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe, HamboxDatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './account-notifications-page.component.html',
  styleUrl: './account-notifications-page.component.scss',
})
export class AccountNotificationsPageComponent implements OnInit {
  private readonly facade = inject(AccountNotificationsFacade);
  private readonly router = inject(Router);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly preferences = this.facade.preferences;
  protected readonly preferencesLoading = this.facade.preferencesLoading;
  protected readonly preferencesSaving = this.facade.preferencesSaving;
  protected readonly preferencesError = this.facade.preferencesError;
  protected readonly preferencesOpen = signal(false);

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly showArchived = signal(false);

  protected readonly categories = computed(() => {
    const set = new Set(this.items().map((item) => item.category));
    return Array.from(set);
  });

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

  protected markRead(id: string): void {
    void this.facade.markRead(id);
  }

  protected markAllRead(): void {
    void this.facade.markAllRead();
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

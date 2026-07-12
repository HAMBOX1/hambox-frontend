import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { AccountNotificationsFacade } from '../../services/account-notifications.facade';
import { UserNotificationApiDto } from '../../models/account-api.model';
import { HamboxDatePipe } from '../../../../shared/pipes/hambox-date.pipe';

@Component({
  selector: 'app-account-notifications-page',
  standalone: true,
  imports: [TranslatePipe, HamboxDatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './account-notifications-page.component.html',
  styleUrl: './account-notifications-page.component.scss',
})
export class AccountNotificationsPageComponent implements OnInit {
  private readonly facade = inject(AccountNotificationsFacade);
  private readonly router = inject(Router);

  protected readonly items = this.facade.items;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.load();
  }

  protected markRead(id: string): void {
    void this.facade.markRead(id);
  }

  protected markAllRead(): void {
    void this.facade.markAllRead();
  }

  protected async openItem(item: UserNotificationApiDto): Promise<void> {
    if (!item.isRead) {
      await this.facade.markRead(item.id);
    }

    void this.router.navigateByUrl(item.actionUrl?.trim() || '/account/library');
  }
}

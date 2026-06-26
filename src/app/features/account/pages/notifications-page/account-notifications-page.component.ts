import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';

import { AccountNotificationsFacade } from '../../services/account-notifications.facade';

@Component({
  selector: 'app-account-notifications-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './account-notifications-page.component.html',
  styleUrl: './account-notifications-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationsPageComponent implements OnInit {
  private readonly facade = inject(AccountNotificationsFacade);

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
}

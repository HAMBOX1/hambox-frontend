import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AccountNotificationsFacade } from '../../services/account-notifications.facade';
import { AccountSidebarComponent } from '../../components/account-sidebar/account-sidebar.component';
import { AccountTopbarComponent } from '../../components/account-topbar/account-topbar.component';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [RouterOutlet, AccountSidebarComponent, AccountTopbarComponent],
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.scss',
})
export class AccountLayoutComponent {
  private readonly notifications = inject(AccountNotificationsFacade);

  constructor() {
    void this.notifications.load();
  }
}

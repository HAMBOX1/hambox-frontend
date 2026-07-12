import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { MobileTopBarComponent } from '../../../../shared/components/mobile-top-bar/mobile-top-bar.component';
import { MobileViewportService } from '../../../../shared/services/mobile-viewport.service';
import { AccountNotificationsFacade } from '../../services/account-notifications.facade';
import { AccountSidebarComponent } from '../../components/account-sidebar/account-sidebar.component';
import { AccountTopbarComponent } from '../../components/account-topbar/account-topbar.component';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    AccountSidebarComponent,
    AccountTopbarComponent,
    MobileTopBarComponent,
    HamboxTranslateRefreshDirective,
  ],
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.scss',
})
export class AccountLayoutComponent {
  private readonly notifications = inject(AccountNotificationsFacade);
  protected readonly mobile = inject(MobileViewportService);

  constructor() {
    void this.notifications.load();
  }
}

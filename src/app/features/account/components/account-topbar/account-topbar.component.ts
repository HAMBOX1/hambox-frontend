import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { AccountMenuComponent } from '../../../../shared/components/account-menu/account-menu.component';
import { NotificationBellComponent } from '../../../../shared/components/notification-bell/notification-bell.component';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { StorefrontSearchComponent } from '../../../../shared/components/storefront-search/storefront-search.component';
import { AccountSidebarStateService } from '../../services/account-sidebar-state.service';

@Component({
  selector: 'app-account-topbar',
  standalone: true,
  imports: [
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    CurrencySwitcherComponent,
    StorefrontSearchComponent,
    TranslatePipe,
    HamboxTranslateRefreshDirective,
    NotificationBellComponent,
    AccountMenuComponent,
  ],
  templateUrl: './account-topbar.component.html',
  styleUrl: './account-topbar.component.scss',
})
export class AccountTopbarComponent {
  private readonly sidebarState = inject(AccountSidebarStateService);

  protected openMobileNav(): void {
    this.sidebarState.openMobile();
  }
}

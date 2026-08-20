import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxTranslateRefreshDirective } from '../../../../shared/directives/hambox-translate-refresh.directive';
import { AccountSidebarStateService } from '../../services/account-sidebar-state.service';

interface AccountNavItem {
  readonly labelKey: string;
  readonly route: string;
  readonly icon: string;
}

@Component({
  selector: 'app-account-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, HamboxTranslateRefreshDirective],
  templateUrl: './account-sidebar.component.html',
  styleUrl: './account-sidebar.component.scss',
})
export class AccountSidebarComponent {
  private readonly sidebarState = inject(AccountSidebarStateService);

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly logoMarkSrc = 'assets/images/top-nav/hambox-mark.png';
  protected readonly collapsed = this.sidebarState.collapsed;
  protected readonly mobileOpen = this.sidebarState.mobileOpen;

  protected readonly navItems: readonly AccountNavItem[] = [
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_DASHBOARD', route: '/account/dashboard', icon: 'pi-th-large' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_LIBRARY', route: '/account/library', icon: 'pi-box' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_ORDERS', route: '/account/orders', icon: 'pi-shopping-cart' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_SUPPORT', route: '/account/support', icon: 'pi-ticket' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_MEMBERSHIP', route: '/account/membership', icon: 'pi-id-card' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_WISHLIST', route: '/account/wishlist', icon: 'pi-heart' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_ALERTS', route: '/account/alerts', icon: 'pi-bell' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_REFERRAL', route: '/account/referral', icon: 'pi-users' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_NOTIFICATIONS', route: '/account/notifications', icon: 'pi-bell' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_MARKETPLACE', route: '/products', icon: 'pi-shopping-bag' },
    { labelKey: 'ACCOUNT.SIDEBAR_UI.NAV_SETTINGS', route: '/account/profile', icon: 'pi-cog' },
  ];

  protected toggleCollapsed(): void {
    this.sidebarState.toggle();
  }

  protected openMobile(): void {
    this.sidebarState.openMobile();
  }

  protected closeMobile(): void {
    this.sidebarState.closeMobile();
  }
}

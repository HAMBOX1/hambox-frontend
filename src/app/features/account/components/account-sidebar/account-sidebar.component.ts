import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface AccountNavItem {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
}

@Component({
  selector: 'app-account-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './account-sidebar.component.html',
  styleUrl: './account-sidebar.component.scss',
})
export class AccountSidebarComponent {
  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';

  protected readonly navItems: readonly AccountNavItem[] = [
    { label: 'Dashboard', route: '/account/dashboard', icon: 'pi-th-large' },
    { label: 'Vault', route: '/account/wishlist', icon: 'pi-heart' },
    { label: 'Notifications', route: '/account/notifications', icon: 'pi-bell' },
    { label: 'Marketplace', route: '/products', icon: 'pi-shopping-bag' },
    { label: 'Settings', route: '/account/profile', icon: 'pi-cog' },
  ];
}

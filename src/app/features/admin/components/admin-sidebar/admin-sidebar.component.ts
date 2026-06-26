import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ADMIN_NAV_ITEMS } from '../../models/admin-nav.model';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSidebarComponent {
  readonly mobileOpen = input(false);
  readonly closeMobile = output<void>();

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly navItems = ADMIN_NAV_ITEMS;

  protected onNavigate(): void {
    this.closeMobile.emit();
  }
}

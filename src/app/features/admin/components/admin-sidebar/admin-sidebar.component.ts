import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PermissionService } from '../../../../core/permissions/permission.service';
import { ADMIN_NAV_ITEMS } from '../../models/admin-nav.model';
import { AdminSidebarStateService } from '../../services/admin-sidebar-state.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSidebarComponent {
  private readonly permissionService = inject(PermissionService);
  private readonly translate = inject(TranslateService);
  protected readonly sidebarState = inject(AdminSidebarStateService);

  readonly mobileOpen = input(false);
  readonly closeMobile = output<void>();

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly navItems = computed(() =>
    ADMIN_NAV_ITEMS.filter((item) => this.permissionService.canViewNavItem(item.permission)),
  );

  protected navTooltip(labelKey: string): string | null {
    return this.sidebarState.collapsed() ? this.translate.instant(labelKey) : null;
  }

  protected onNavigate(): void {
    this.closeMobile.emit();
  }

  protected toggleCollapsed(): void {
    this.sidebarState.toggle();
  }
}

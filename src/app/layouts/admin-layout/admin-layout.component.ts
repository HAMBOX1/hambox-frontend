import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AdminSidebarComponent } from '../../features/admin/components/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../../features/admin/components/admin-topbar/admin-topbar.component';
import { AdminSidebarStateService } from '../../features/admin/services/admin-sidebar-state.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminTopbarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  protected readonly sidebarState = inject(AdminSidebarStateService);

  protected readonly mobileNavOpen = signal(false);

  @HostBinding('class.admin-layout--sidebar-collapsed')
  protected get sidebarCollapsed(): boolean {
    return this.sidebarState.collapsed();
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mobileNavOpen()) {
      this.closeMobileNav();
    }
  }
}

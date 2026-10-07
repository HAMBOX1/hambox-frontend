import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostBinding,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { IdleSessionService } from '../../core/auth/idle-session.service';
import { AdminSidebarComponent } from '../../features/admin/components/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../../features/admin/components/admin-topbar/admin-topbar.component';
import { IdleSessionWarningComponent } from '../../features/admin/components/idle-session-warning/idle-session-warning.component';
import { AdminSidebarStateService } from '../../features/admin/services/admin-sidebar-state.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminTopbarComponent, IdleSessionWarningComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  protected readonly sidebarState = inject(AdminSidebarStateService);

  protected readonly mobileNavOpen = signal(false);

  constructor() {
    const idleSession = inject(IdleSessionService);
    idleSession.start();
    inject(DestroyRef).onDestroy(() => idleSession.stop());
  }

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

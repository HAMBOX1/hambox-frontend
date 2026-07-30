import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PopoverModule } from 'primeng/popover';

import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { AdminAuth } from '../../../auth/services/admin-auth';
import { AdminPageTitleService } from '../../services/admin-page-title.service';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    CurrencySwitcherComponent,
    PopoverModule,
    TranslatePipe,
  ],
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTopbarComponent {
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);
  protected readonly pageTitle = inject(AdminPageTitleService);

  readonly menuToggle = output<void>();

  protected readonly clearanceLevel = signal('ADMIN.CLEARANCE');

  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return 'Admin';
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || 'Admin';
  });

  protected readonly avatarInitial = computed(() => {
    const source = this.displayName();
    return source.charAt(0).toUpperCase();
  });

  protected readonly isLoggingOut = signal(false);

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.isLoggingOut.set(false);
        void this.router.navigate(['/admin/login']);
      },
      error: () => {
        this.isLoggingOut.set(false);
        void this.router.navigate(['/admin/login']);
      },
    });
  }

  protected openMobileMenu(): void {
    this.menuToggle.emit();
  }
}

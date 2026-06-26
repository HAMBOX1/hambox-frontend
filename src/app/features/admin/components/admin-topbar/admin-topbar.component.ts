import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { Auth } from '../../../auth/services/auth';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [InputTextModule, RouterLink, ThemeToggleComponent, LanguageSwitcherComponent, CurrencySwitcherComponent, TranslatePipe],
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTopbarComponent {
  private readonly auth = inject(Auth);

  readonly menuToggle = output<void>();

  protected readonly searchValue = signal('');
  protected readonly clearanceLevel = signal('ADMIN.CLEARANCE');

  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return 'Admin_Z-01';
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || 'Admin_Z-01';
  });

  protected readonly avatarInitial = computed(() => {
    const source = this.displayName();
    return source.charAt(0).toUpperCase();
  });

  protected onSearchInput(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  protected openMobileMenu(): void {
    this.menuToggle.emit();
  }
}

import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { CurrencySwitcherComponent } from '../../../../shared/components/currency-switcher/currency-switcher.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';
import { AccountNotificationsFacade } from '../../services/account-notifications.facade';

@Component({
  selector: 'app-account-topbar',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent, LanguageSwitcherComponent, CurrencySwitcherComponent, TranslatePipe],
  templateUrl: './account-topbar.component.html',
  styleUrl: './account-topbar.component.scss',
})
export class AccountTopbarComponent {
  private readonly session = inject(AuthSessionService);
  private readonly notifications = inject(AccountNotificationsFacade);
  private readonly router = inject(Router);

  protected readonly unreadCount = this.notifications.unreadCount;
  protected readonly avatarInitial = computed(() => {
    const user = this.session.user();
    const source = user?.firstName || user?.email || 'U';
    return source.charAt(0).toUpperCase();
  });

  protected onSearch(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    const query = input?.value?.trim();
    void this.router.navigate(['/products'], { queryParams: query ? { q: query } : {} });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Auth } from '../../../features/auth/services/auth';
import { HamboxBottomSheetComponent } from '../hambox-bottom-sheet/hambox-bottom-sheet.component';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { CurrencySwitcherComponent } from '../currency-switcher/currency-switcher.component';
import { MobileViewportService } from '../../services/mobile-viewport.service';

interface AccountSheetLink {
  readonly icon: string;
  readonly labelKey: string;
  readonly route: string;
}

const ACCOUNT_LINKS: readonly AccountSheetLink[] = [
  { icon: 'pi pi-book', labelKey: 'ACCOUNT_MENU.LIBRARY', route: '/account/library' },
  { icon: 'pi pi-shopping-bag', labelKey: 'ACCOUNT_MENU.ORDERS', route: '/account/orders' },
  { icon: 'pi pi-star', labelKey: 'ACCOUNT_MENU.MEMBERSHIP', route: '/account/membership' },
  { icon: 'pi pi-heart', labelKey: 'ACCOUNT_MENU.WISHLIST', route: '/account/wishlist' },
  { icon: 'pi pi-bell', labelKey: 'ACCOUNT_MENU.NOTIFICATIONS', route: '/account/notifications' },
  { icon: 'pi pi-cog', labelKey: 'ACCOUNT_MENU.SETTINGS', route: '/account/profile' },
];

@Component({
  selector: 'app-account-mobile-sheet',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    HamboxBottomSheetComponent,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
    CurrencySwitcherComponent,
  ],
  templateUrl: './account-mobile-sheet.component.html',
  styleUrl: './account-mobile-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMobileSheetComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly mobile = inject(MobileViewportService);

  protected readonly accountLinks = ACCOUNT_LINKS;
  protected readonly isLoggingOut = signal(false);

  protected readonly open = computed(() => this.mobile.profileSheetOpen() && this.mobile.isMobile());
  protected readonly user = this.auth.user;

  protected readonly avatarInitial = computed(() => {
    const current = this.auth.user();
    const source = current?.firstName || current?.email || 'U';
    return source.charAt(0).toUpperCase();
  });

  protected readonly displayName = computed(() => {
    const current = this.auth.user();
    if (!current) {
      return '';
    }
    const full = `${current.firstName ?? ''} ${current.lastName ?? ''}`.trim();
    return full || current.email;
  });

  protected close(): void {
    this.mobile.closeProfileSheet();
  }

  protected navigate(route: string): void {
    this.close();
    void this.router.navigate([route]);
  }

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.isLoggingOut.set(false);
        this.close();
        void this.router.navigate(['/home']);
      },
      error: () => {
        this.isLoggingOut.set(false);
        this.close();
        void this.router.navigate(['/home']);
      },
    });
  }
}

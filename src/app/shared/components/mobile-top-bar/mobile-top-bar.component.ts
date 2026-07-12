import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Auth } from '../../../features/auth/services/auth';
import { StorefrontNavMode } from '../storefront-nav/storefront-nav.model';
import { StorefrontSearchComponent } from '../storefront-search/storefront-search.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { AccountMenuComponent } from '../account-menu/account-menu.component';
import { MobileViewportService } from '../../services/mobile-viewport.service';
import { HamboxBottomSheetComponent } from '../hambox-bottom-sheet/hambox-bottom-sheet.component';

@Component({
  selector: 'app-mobile-top-bar',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    StorefrontSearchComponent,
    ThemeToggleComponent,
    NotificationBellComponent,
    AccountMenuComponent,
    HamboxBottomSheetComponent,
  ],
  templateUrl: './mobile-top-bar.component.html',
  styleUrl: './mobile-top-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTopBarComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly mobile = inject(MobileViewportService);

  readonly mode = input<StorefrontNavMode>('storefront');

  protected readonly logoSrc = 'assets/images/top-nav/hambox-title.png';
  protected readonly searchOpen = signal(false);
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected readonly showBackButton = computed(() => {
    if (this.mode() === 'checkout') {
      return true;
    }

    return this.mobile.isInnerPage();
  });

  protected readonly showPageTitle = computed(
    () => this.mobile.showPageTitle() && !!this.mobile.pageTitleKey(),
  );

  protected readonly showSearchButton = computed(
    () => !this.showBackButton() && this.mode() !== 'checkout' && !this.mobile.isAccountArea(),
  );

  protected goBack(): void {
    if (this.mobile.isAccountArea() && this.router.url.startsWith('/account/dashboard')) {
      void this.router.navigate(['/home']);
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/home']);
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }
}

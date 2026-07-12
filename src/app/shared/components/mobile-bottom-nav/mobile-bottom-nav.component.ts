import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Auth } from '../../../features/auth/services/auth';
import { CartFacade } from '../../../features/cart/services/cart.facade';
import { MobileViewportService } from '../../services/mobile-viewport.service';

interface BottomNavItem {
  readonly id: string;
  readonly labelKey: string;
  readonly icon: string;
  readonly route?: string;
  readonly action?: 'account';
}

const NAV_ITEMS: readonly BottomNavItem[] = [
  { id: 'home', labelKey: 'MOBILE_NAV.HOME', icon: 'pi pi-home', route: '/home' },
  { id: 'marketplace', labelKey: 'MOBILE_NAV.MARKETPLACE', icon: 'pi pi-shopping-bag', route: '/products' },
  { id: 'library', labelKey: 'MOBILE_NAV.LIBRARY', icon: 'pi pi-book', route: '/account/library' },
  { id: 'cart', labelKey: 'MOBILE_NAV.CART', icon: 'pi pi-shopping-cart', route: '/cart' },
  { id: 'account', labelKey: 'MOBILE_NAV.ACCOUNT', icon: 'pi pi-user', action: 'account' },
];

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileBottomNavComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly cart = inject(CartFacade);
  protected readonly mobile = inject(MobileViewportService);

  protected readonly items = NAV_ITEMS;
  protected readonly cartCount = this.cart.itemCount;
  protected readonly accountSheetOpen = computed(() => this.mobile.profileSheetOpen());
  protected readonly visible = computed(() => this.mobile.bottomNavVisible());

  constructor() {
    effect(() => this.mobile.syncBodyClass());

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mobile.closeProfileSheet());
  }

  protected badgeFor(item: BottomNavItem): number {
    if (item.id === 'cart') {
      return this.cartCount();
    }

    return 0;
  }

  protected onAccountClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login']);
      return;
    }

    if (this.mobile.profileSheetOpen()) {
      this.mobile.closeProfileSheet();
      return;
    }

    this.mobile.openProfileSheet();
  }

  protected resolveRoute(item: BottomNavItem): string | null {
    if (item.route === '/account/library' && !this.auth.isAuthenticated()) {
      return '/auth/login';
    }

    return item.route ?? null;
  }

  protected isAccountItem(item: BottomNavItem): boolean {
    return item.action === 'account';
  }
}

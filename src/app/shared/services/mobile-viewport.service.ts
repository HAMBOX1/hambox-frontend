import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import {
  isMobileAccountArea,
  resolveMobilePageTitleKey,
  shouldShowMobilePageTitle,
} from '../utils/mobile-page-titles';

/** Phone breakpoint — desktop/tablet unchanged above this width. */
export const MOBILE_MAX_WIDTH_PX = 767;

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH_PX}px)`;

const BOTTOM_NAV_HIDDEN_PREFIXES = [
  '/auth',
  '/login',
  '/register',
  '/admin',
  '/access-denied',
] as const;

@Injectable({ providedIn: 'root' })
export class MobileViewportService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaQuery =
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA_QUERY) : null;

  private readonly routeUrl = signal(this.router.url);
  readonly isMobile = signal(this.mediaQuery?.matches ?? false);
  readonly profileSheetOpen = signal(false);

  readonly bottomNavVisible = computed(() => {
    if (!this.isMobile()) {
      return false;
    }

    const url = this.routeUrl();
    return !BOTTOM_NAV_HIDDEN_PREFIXES.some((prefix) => url.startsWith(prefix));
  });

  readonly isAccountArea = computed(() => isMobileAccountArea(this.routeUrl()));

  readonly pageTitleKey = computed(() => resolveMobilePageTitleKey(this.routeUrl()));

  readonly showPageTitle = computed(() => shouldShowMobilePageTitle(this.routeUrl()));

  constructor() {
    if (this.mediaQuery) {
      const sync = (): void => this.isMobile.set(this.mediaQuery!.matches);
      this.mediaQuery.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => this.mediaQuery!.removeEventListener('change', sync));
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.routeUrl.set(event.urlAfterRedirects));

    this.destroyRef.onDestroy(() => {
      document.body.classList.remove('hambox-mobile-shell');
      document.body.style.removeProperty('--hambox-mobile-bottom-inset');
    });
  }

  syncBodyClass(): void {
    const active = this.bottomNavVisible();
    document.body.classList.toggle('hambox-mobile-shell', active);
    document.body.style.setProperty(
      '--hambox-mobile-bottom-inset',
      active ? 'calc(64px + env(safe-area-inset-bottom, 0px))' : '0px',
    );
  }

  openProfileSheet(): void {
    this.profileSheetOpen.set(true);
  }

  closeProfileSheet(): void {
    this.profileSheetOpen.set(false);
  }

  isInnerPage(url = this.routeUrl()): boolean {
    if (this.isAccountArea()) {
      return true;
    }

    if (url.startsWith('/home') && url === '/home') {
      return false;
    }

    if (url.startsWith('/products') && !url.match(/^\/products\/[^/]+/)) {
      return false;
    }

    return (
      url.startsWith('/products/') ||
      url.startsWith('/cart') ||
      url.startsWith('/checkout') ||
      url.startsWith('/support-chat')
    );
  }
}

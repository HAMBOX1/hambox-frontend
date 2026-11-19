import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { FLOATING_ADS_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { FloatingAdPage, FloatingAdPublic } from '../../../core/models/floating-ad.model';
import { FloatingAdCardComponent } from './floating-ad-card.component';
import { attachSmoothFollow } from './floating-ad-follow';

export { floatingAdCountdown } from './floating-ad-card.component';
export type { FloatingAdCountdown } from './floating-ad-card.component';

const DISMISSED_KEY_PREFIX = 'hambox.floating-ad.closed.';

/** Pages where an offer card would get in the way. */
const HIDDEN_ROUTE_PREFIXES = ['/checkout', '/cart', '/auth', '/admin', '/coming-soon', '/access-denied'];

/**
 * What "closed" is remembered against: the ad AND what it says. Editing an ad (new text, picture, link, end date) makes
 * it a fresh offer, so a visitor who closed the old wording sees the new one.
 */
export function floatingAdDismissKey(ad: FloatingAdPublic): string {
  const text = [
    ad.titleEn, ad.titleAr, ad.messageEn, ad.messageAr, ad.buttonLabelEn, ad.buttonLabelAr, ad.linkUrl, ad.imageUrl,
    ad.countdownEndsOnUtc, ad.style, ad.priceText,
  ].join('|');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }

  return `${DISMISSED_KEY_PREFIX}${ad.id}.${hash.toString(36)}`;
}

/** Which storefront page key a path belongs to; "other" for pages ads are not limited to (FAQ, legal, account...). */
export function floatingAdPageKey(path: string): FloatingAdPage | 'other' {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/home') {
    return 'home';
  }
  if (clean === '/products') {
    return 'products';
  }
  if (clean.startsWith('/products/')) {
    return 'product';
  }
  if (clean.startsWith('/categories/')) {
    return 'category';
  }

  return 'other';
}

/**
 * The floating offer card on the storefront. It sits in a corner chosen per device (and is lifted clear of the product
 * page's buy bar, the bottom bar and the assistant button, so it never covers a price or a buy button), glides along with the
 * scroll a little behind the page, and once a visitor closes it, it stays away for the rest of the session. The server already
 * filters by audience and dates; this keeps it off checkout-like pages and off pages the ad is not meant for.
 */
@Component({
  selector: 'app-floating-ad',
  standalone: true,
  imports: [FloatingAdCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleAd(); as ad) {
      <div
        #host
        class="floating-ad"
        [attr.data-desktop]="ad.positionDesktop ?? 'BottomLeft'"
        [attr.data-mobile]="ad.positionMobile ?? 'Bottom'"
      >
        <app-floating-ad-card [ad]="ad" (dismissed)="dismiss(ad)" (linkClicked)="dismiss(ad)" />
      </div>
    }
  `,
  styles: `
    .floating-ad {
      position: fixed;
      z-index: 80;
      inset-inline-start: 12px;
      will-change: transform;
      animation: floating-ad-in 260ms ease-out;
    }

    /* Phone: above the bottom bar (and the buy bar of a product page), or under the header. */
    /* Leaves room for the assistant button on the other side of the screen. */
    .floating-ad[data-mobile='Bottom'] {
      --floating-ad-max: calc(100vw - 92px);
      bottom: calc(84px + var(--hambox-buy-bar-inset, 0px) + env(safe-area-inset-bottom, 0px));
    }

    .floating-ad[data-mobile='Top'] {
      top: 72px;
    }

    .floating-ad[data-desktop='BottomRight'] {
      inset-inline-start: auto;
      inset-inline-end: 12px;
    }

    @media (min-width: 992px) {
      .floating-ad,
      .floating-ad[data-mobile='Top'] {
        --floating-ad-max: calc(100vw - 48px);
        top: auto;
        bottom: calc(24px + var(--hambox-buy-bar-inset, 0px));
        inset-inline-start: 24px;
      }

      .floating-ad[data-desktop='BottomRight'] {
        inset-inline-start: auto;
        /* Clear of the assistant button in the same corner. */
        inset-inline-end: 24px;
        bottom: calc(96px + var(--hambox-buy-bar-inset, 0px));
      }
    }

    @keyframes floating-ad-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,
})
export class FloatingAdComponent {
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private readonly ads = signal<readonly FloatingAdPublic[]>([]);
  private readonly dismissedTick = signal(0);
  private readonly url = signal(this.router.url);

  /** The first ad the visitor has not closed this session and that is meant for this page, unless the page should stay clear. */
  protected readonly visibleAd = computed(() => {
    this.dismissedTick();
    const path = this.url().split('?')[0];
    if (HIDDEN_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return null;
    }

    const page = floatingAdPageKey(path);
    return this.ads().find((ad) => !this.isDismissed(ad) && this.showsOn(ad, page)) ?? null;
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.url.set(event.urlAfterRedirects));

    // Reload when the visitor signs in or out: the audience is decided on the server from who is asking.
    effect(() => {
      this.session.isAuthenticated();
      void this.load();
    });

    // Smooth follow: while the page scrolls the card trails a little behind it, then settles.
    effect((onCleanup) => {
      const element = this.host()?.nativeElement;
      if (!element || typeof window === 'undefined') {
        return;
      }

      onCleanup(attachSmoothFollow(window, () => window.scrollY, element));
    });
  }

  protected dismiss(ad: FloatingAdPublic): void {
    try {
      sessionStorage.setItem(floatingAdDismissKey(ad), '1');
    } catch {
      // Storage blocked: the card is simply hidden until the next page load.
    }

    this.closedThisPage.add(ad.id);
    this.dismissedTick.update((n) => n + 1);
  }

  private readonly closedThisPage = new Set<string>();

  private showsOn(ad: FloatingAdPublic, page: FloatingAdPage | 'other'): boolean {
    const pages = ad.pages ?? [];
    if (ad.countdownEndsOnUtc && Date.parse(ad.countdownEndsOnUtc) <= Date.now()) {
      return false;
    }

    return pages.length === 0 || (page !== 'other' && pages.includes(page));
  }

  private isDismissed(ad: FloatingAdPublic): boolean {
    if (this.closedThisPage.has(ad.id)) {
      return true;
    }

    try {
      return sessionStorage.getItem(floatingAdDismissKey(ad)) !== null;
    } catch {
      return false;
    }
  }

  private async load(): Promise<void> {
    try {
      this.ads.set(await firstValueFrom(this.api.get<FloatingAdPublic[]>(FLOATING_ADS_API.active)));
    } catch {
      this.ads.set([]);
    }
  }
}

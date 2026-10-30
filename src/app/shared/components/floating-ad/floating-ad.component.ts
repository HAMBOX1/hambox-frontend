import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { FLOATING_ADS_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { FloatingAdPublic } from '../../../core/models/floating-ad.model';

const DISMISSED_KEY_PREFIX = 'hambox.floating-ad.dismissed.';

/** Pages where an offer card would get in the way. */
const HIDDEN_ROUTE_PREFIXES = ['/checkout', '/cart', '/auth', '/admin', '/coming-soon', '/access-denied'];

/**
 * A small offer card that floats over the storefront while customers browse. The admin decides what it says and who
 * sees it (guests, customers without a membership, ...); the server already filters by audience, so this only
 * remembers which ads a visitor closed and keeps the card off checkout-like pages.
 */
@Component({
  selector: 'app-floating-ad',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleAd(); as ad) {
      <aside class="floating-ad" role="complementary" [attr.aria-label]="title(ad)">
        <button type="button" class="floating-ad__close" aria-label="Close" (click)="dismiss(ad)">
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
        <strong class="floating-ad__title">{{ title(ad) }}</strong>
        @if (message(ad); as text) {
          <p class="floating-ad__message">{{ text }}</p>
        }
        @if (ad.linkUrl && buttonLabel(ad); as label) {
          @if (isInternal(ad.linkUrl)) {
            <a class="floating-ad__button" [routerLink]="ad.linkUrl" (click)="dismiss(ad)">{{ label }}</a>
          } @else {
            <a class="floating-ad__button" [href]="ad.linkUrl" target="_blank" rel="noopener noreferrer" (click)="dismiss(ad)">{{ label }}</a>
          }
        }
      </aside>
    }
  `,
  styles: `
    .floating-ad {
      position: fixed;
      z-index: 80;
      inset-inline-start: 12px;
      bottom: calc(84px + env(safe-area-inset-bottom, 0px));
      display: grid;
      gap: 6px;
      width: min(18rem, calc(100vw - 24px));
      padding: 14px 40px 14px 14px;
      border: 1px solid var(--color-primary-border, rgba(60, 220, 150, 0.45));
      border-radius: 16px;
      background: var(--color-surface, #14181a);
      color: var(--color-text-primary, #fff);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      animation: floating-ad-in 260ms ease-out;
    }

    @media (min-width: 992px) {
      .floating-ad {
        bottom: 24px;
        inset-inline-start: 24px;
      }
    }

    :host-context([dir='rtl']) .floating-ad {
      padding: 14px 14px 14px 40px;
    }

    .floating-ad__close {
      position: absolute;
      top: 8px;
      inset-inline-end: 8px;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--color-text-secondary, #bbb);
      cursor: pointer;
    }

    .floating-ad__title {
      font-size: 0.95rem;
      line-height: 1.3;
    }

    .floating-ad__message {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.45;
      color: var(--color-text-secondary, #c5c9cc);
    }

    .floating-ad__button {
      justify-self: start;
      margin-top: 4px;
      padding: 8px 16px;
      border-radius: 999px;
      background: var(--color-primary, #1f9d6b);
      color: var(--color-on-primary, #07130d);
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
    }

    @keyframes floating-ad-in {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class FloatingAdComponent {
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);
  private readonly translation = inject(TranslationService);

  private readonly ads = signal<readonly FloatingAdPublic[]>([]);
  private readonly dismissedTick = signal(0);
  private readonly url = signal(this.router.url);

  /** The first ad the visitor has not closed, unless this page should stay clear. */
  protected readonly visibleAd = computed(() => {
    this.dismissedTick();
    const path = this.url().split('?')[0];
    if (HIDDEN_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return null;
    }

    return this.ads().find((ad) => !this.isDismissed(ad.id)) ?? null;
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
  }

  protected title(ad: FloatingAdPublic): string {
    return this.isArabic() ? ad.titleAr || ad.titleEn : ad.titleEn;
  }

  protected message(ad: FloatingAdPublic): string | null {
    return (this.isArabic() ? ad.messageAr || ad.messageEn : ad.messageEn) || null;
  }

  protected buttonLabel(ad: FloatingAdPublic): string | null {
    return (this.isArabic() ? ad.buttonLabelAr || ad.buttonLabelEn : ad.buttonLabelEn) || null;
  }

  protected isInternal(link: string): boolean {
    return link.startsWith('/');
  }

  protected dismiss(ad: FloatingAdPublic): void {
    try {
      localStorage.setItem(DISMISSED_KEY_PREFIX + ad.id, String(Date.now() + ad.dismissHours * 3_600_000));
    } catch {
      // Private mode: the card simply comes back on the next visit.
    }

    this.dismissedTick.update((n) => n + 1);
  }

  private isArabic(): boolean {
    return this.translation.language() === 'ar';
  }

  private isDismissed(id: string): boolean {
    try {
      const until = Number(localStorage.getItem(DISMISSED_KEY_PREFIX + id));
      return Number.isFinite(until) && until > Date.now();
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

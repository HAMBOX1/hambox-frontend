import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { FLOATING_ADS_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { FloatingAdPublic } from '../../../core/models/floating-ad.model';
import { HamboxLinkDirective } from '../../directives/hambox-link.directive';

const DISMISSED_KEY_PREFIX = 'hambox.floating-ad.dismissed.';

/** Pages where an offer card would get in the way. */
const HIDDEN_ROUTE_PREFIXES = ['/checkout', '/cart', '/auth', '/admin', '/coming-soon', '/access-denied'];

export interface FloatingAdCountdown {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

/**
 * What "closed" is remembered against: the ad AND what it says. Editing an ad (new text, picture, link, end date) makes
 * it a fresh offer, so a visitor who closed the old wording (an admin testing their own change, for one) sees it again.
 */
export function floatingAdDismissKey(ad: FloatingAdPublic): string {
  const text = [
    ad.titleEn, ad.titleAr, ad.messageEn, ad.messageAr, ad.buttonLabelEn, ad.buttonLabelAr, ad.linkUrl, ad.imageUrl,
    ad.countdownEndsOnUtc,
  ].join('|');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }

  return `${DISMISSED_KEY_PREFIX}${ad.id}.${hash.toString(36)}`;
}

/** Splits the time left into days / hours / minutes / seconds; null once the moment has passed. */
export function floatingAdCountdown(endsOnUtc: string | null, nowMs: number): FloatingAdCountdown | null {
  if (!endsOnUtc) {
    return null;
  }

  const end = Date.parse(endsOnUtc);
  if (!Number.isFinite(end) || end <= nowMs) {
    return null;
  }

  const total = Math.floor((end - nowMs) / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/**
 * A small offer card that floats over the storefront while customers browse: an optional picture, a title and text, an
 * optional live countdown and a button. The admin decides what it says and who sees it (guests, customers without a
 * membership, ...); the server already filters by audience and dates, so this only remembers which ads a visitor closed
 * and keeps the card off checkout-like pages.
 */
@Component({
  selector: 'app-floating-ad',
  standalone: true,
  imports: [HamboxLinkDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleAd(); as ad) {
      <aside class="floating-ad" [class.floating-ad--has-image]="!!ad.imageUrl" role="complementary" [attr.aria-label]="title(ad)">
        <button type="button" class="floating-ad__close" aria-label="Close" (click)="dismiss(ad)">
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
        @if (ad.imageUrl; as image) {
          <img class="floating-ad__image" [src]="image" alt="" loading="lazy" />
        }
        <strong class="floating-ad__title">{{ title(ad) }}</strong>
        @if (message(ad); as text) {
          <p class="floating-ad__message">{{ text }}</p>
        }
        @if (countdown(); as left) {
          <div class="floating-ad__countdown" role="timer" [attr.aria-label]="endsInLabel()">
            <span class="floating-ad__countdown-label">{{ endsInLabel() }}</span>
            <div class="floating-ad__units">
              <span class="floating-ad__unit"><b>{{ pad(left.days) }}</b><small>{{ unitLabel('days') }}</small></span>
              <span class="floating-ad__unit"><b>{{ pad(left.hours) }}</b><small>{{ unitLabel('hours') }}</small></span>
              <span class="floating-ad__unit"><b>{{ pad(left.minutes) }}</b><small>{{ unitLabel('minutes') }}</small></span>
              <span class="floating-ad__unit"><b>{{ pad(left.seconds) }}</b><small>{{ unitLabel('seconds') }}</small></span>
            </div>
          </div>
        }
        @if (ad.linkUrl && buttonLabel(ad); as label) {
          <a class="floating-ad__button" [hamboxLink]="ad.linkUrl" (click)="dismiss(ad)">{{ label }}</a>
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
      /* On a short screen the card scrolls instead of running off the top. */
      max-height: calc(100vh - 110px);
      overflow-y: auto;
    }

    /* With a picture the card is a clean block: picture on top, everything centred under it, close button over the picture. */
    .floating-ad--has-image {
      padding: 0 0 14px;
      text-align: center;
    }

    .floating-ad--has-image > :not(.floating-ad__image):not(.floating-ad__close) {
      margin-inline: 14px;
    }

    .floating-ad--has-image .floating-ad__button {
      justify-self: stretch;
      text-align: center;
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

    :host-context([dir='rtl']) .floating-ad--has-image {
      padding: 0 0 14px;
    }

    .floating-ad__image {
      display: block;
      width: 100%;
      max-height: 11rem;
      object-fit: cover;
      margin-bottom: 4px;
    }

    .floating-ad__close {
      position: absolute;
      top: 8px;
      inset-inline-end: 8px;
      z-index: 1;
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

    .floating-ad--has-image .floating-ad__close {
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
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

    .floating-ad__countdown {
      display: grid;
      gap: 4px;
      margin-top: 2px;
      justify-items: center;
    }

    .floating-ad__countdown-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-secondary, #c5c9cc);
    }

    .floating-ad__units {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      width: 100%;
      direction: ltr;
    }

    .floating-ad__unit {
      display: grid;
      gap: 1px;
      padding: 6px 2px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .floating-ad__unit b {
      font-size: 1.15rem;
      line-height: 1.1;
    }

    .floating-ad__unit small {
      font-size: 0.6rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
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
  private readonly now = signal(Date.now());

  /** The first ad the visitor has not closed (and whose countdown has not run out), unless this page should stay clear. */
  protected readonly visibleAd = computed(() => {
    this.dismissedTick();
    const path = this.url().split('?')[0];
    if (HIDDEN_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return null;
    }

    return this.ads().find((ad) => !this.isDismissed(ad) && !this.hasEnded(ad)) ?? null;
  });

  /** The time left on the shown ad, ticking every second; null when the ad has no countdown. */
  protected readonly countdown = computed(() => floatingAdCountdown(this.visibleAd()?.countdownEndsOnUtc ?? null, this.now()));

  private readonly needsClock = computed(() => !!this.visibleAd()?.countdownEndsOnUtc);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.url.set(event.urlAfterRedirects));

    // Reload when the visitor signs in or out: the audience is decided on the server from who is asking.
    effect(() => {
      this.session.isAuthenticated();
      void this.load();
    });

    // The clock only runs while a countdown is on screen.
    effect((onCleanup) => {
      if (!this.needsClock()) {
        return;
      }

      this.now.set(Date.now());
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(timer));
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

  protected endsInLabel(): string {
    return this.isArabic() ? 'ينتهي خلال' : 'Ends in:';
  }

  protected unitLabel(unit: 'days' | 'hours' | 'minutes' | 'seconds'): string {
    const ar = { days: 'يوم', hours: 'ساعة', minutes: 'دقيقة', seconds: 'ثانية' };
    const en = { days: 'Days', hours: 'Hrs', minutes: 'Min', seconds: 'Sec' };
    return (this.isArabic() ? ar : en)[unit];
  }

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  protected dismiss(ad: FloatingAdPublic): void {
    try {
      localStorage.setItem(floatingAdDismissKey(ad), String(Date.now() + ad.dismissHours * 3_600_000));
    } catch {
      // Private mode: the card simply comes back on the next visit.
    }

    this.dismissedTick.update((n) => n + 1);
  }

  private isArabic(): boolean {
    return this.translation.language() === 'ar';
  }

  private hasEnded(ad: FloatingAdPublic): boolean {
    return !!ad.countdownEndsOnUtc && Date.parse(ad.countdownEndsOnUtc) <= this.now();
  }

  private isDismissed(ad: FloatingAdPublic): boolean {
    try {
      const until = Number(localStorage.getItem(floatingAdDismissKey(ad)));
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

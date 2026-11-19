import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { TranslationService } from '../../../core/i18n/translation.service';
import { FloatingAdPublic } from '../../../core/models/floating-ad.model';
import { HamboxLinkDirective } from '../../directives/hambox-link.directive';

export interface FloatingAdCountdown {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
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
 * The floating ad card itself, in the three designs the admin can pick: "Mini" (a small card), "Product" (picture and price)
 * and "Promo" (an offer / discount). It only draws the card; where it sits, how it follows the scroll and whether it was closed
 * is the job of the storefront wrapper (and the admin preview shows the very same card).
 */
@Component({
  selector: 'app-floating-ad-card',
  standalone: true,
  imports: [HamboxLinkDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="ad"
      [class.ad--mini]="style() === 'Mini'"
      [class.ad--product]="style() === 'Product'"
      [class.ad--promo]="style() === 'Promo'"
      [class.ad--image]="!!ad().imageUrl"
      role="complementary"
      [attr.aria-label]="title()"
    >
      <button type="button" class="ad__close" aria-label="Close" (click)="dismissed.emit()">
        <i class="pi pi-times" aria-hidden="true"></i>
      </button>

      @if (ad().imageUrl; as image) {
        <img class="ad__image" [src]="image" alt="" loading="lazy" />
      }

      <div class="ad__body">
        <strong class="ad__title">{{ title() }}</strong>
        @if (message(); as text) {
          <p class="ad__message">{{ text }}</p>
        }

        @if (style() === 'Product' && ad().priceText) {
          <div class="ad__price">
            <span class="ad__price-now">{{ ad().priceText }}</span>
            @if (ad().oldPriceText) {
              <s class="ad__price-old">{{ ad().oldPriceText }}</s>
            }
          </div>
        }

        @if (countdown(); as left) {
          <div class="ad__countdown" role="timer" [attr.aria-label]="endsInLabel()">
            <span class="ad__countdown-label">{{ endsInLabel() }}</span>
            <div class="ad__units">
              <span class="ad__unit"><b>{{ pad(left.days) }}</b><small>{{ unit('days') }}</small></span>
              <span class="ad__unit"><b>{{ pad(left.hours) }}</b><small>{{ unit('hours') }}</small></span>
              <span class="ad__unit"><b>{{ pad(left.minutes) }}</b><small>{{ unit('minutes') }}</small></span>
              <span class="ad__unit"><b>{{ pad(left.seconds) }}</b><small>{{ unit('seconds') }}</small></span>
            </div>
          </div>
        }

        @if (ad().linkUrl && buttonLabel(); as label) {
          <a class="ad__button" [hamboxLink]="ad().linkUrl" (click)="linkClicked.emit()">{{ label }}</a>
        }
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }

    .ad {
      position: relative;
      display: grid;
      overflow: hidden;
      border: 1px solid var(--color-primary-border, rgba(60, 220, 150, 0.45));
      border-radius: var(--sf-radius-xl, 24px);
      background: var(--color-surface, #14181a);
      color: var(--color-text-primary, #fff);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    }

    .ad__close {
      position: absolute;
      top: 8px;
      inset-inline-end: 8px;
      z-index: 2;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      cursor: pointer;
    }

    .ad__image {
      display: block;
      width: 100%;
      object-fit: cover;
    }

    .ad__body {
      display: grid;
      gap: 6px;
    }

    .ad__title {
      font-family: var(--sf-font-heading, inherit);
      font-size: 0.95rem;
      line-height: 1.3;
    }

    .ad__message {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.45;
      color: var(--color-text-secondary, #c5c9cc);
    }

    .ad__button {
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

    /* ---- Mini: a small card, picture as a thumbnail beside the text. */
    .ad--mini {
      width: min(16rem, var(--floating-ad-max, calc(100vw - 24px)));
    }

    .ad--mini.ad--image {
      grid-template-columns: 4.25rem minmax(0, 1fr);
      align-items: center;
    }

    .ad--mini .ad__image {
      width: 4.25rem;
      height: 100%;
      min-height: 4.25rem;
    }

    .ad--mini .ad__body {
      padding: 12px 40px 12px 14px;
    }

    :host-context([dir='rtl']) .ad--mini .ad__body {
      padding: 12px 14px 12px 40px;
    }

    /* ---- Product: picture on top, name, then the price. */
    .ad--product {
      width: min(15rem, var(--floating-ad-max, calc(100vw - 24px)));
      text-align: center;
    }

    .ad--product .ad__image {
      aspect-ratio: 4 / 3;
    }

    .ad--product .ad__body {
      padding: 12px 14px 14px;
    }

    .ad--product .ad__button {
      justify-self: stretch;
      text-align: center;
    }

    .ad__price {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
    }

    .ad__price-now {
      color: var(--color-price-display, var(--color-primary, #3cdc96));
      font-family: var(--sf-font-heading, inherit);
      font-size: 1.25rem;
      font-weight: 800;
    }

    .ad__price-old {
      color: var(--color-text-muted, #8b9094);
      font-size: 0.85rem;
    }

    /* ---- Promo: an offer, tinted with the store colour, the button is the main action. */
    .ad--promo {
      width: min(17rem, var(--floating-ad-max, calc(100vw - 24px)));
      border-color: color-mix(in srgb, var(--color-primary, #3cdc96) 70%, transparent);
      background:
        radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--color-primary, #3cdc96) 28%, transparent), transparent 60%),
        var(--color-surface, #14181a);
    }

    .ad--promo .ad__image {
      max-height: 7rem;
    }

    .ad--promo .ad__body {
      padding: 14px 16px 16px;
    }

    .ad--promo .ad__title {
      font-size: 1.1rem;
    }

    .ad--promo .ad__button {
      justify-self: stretch;
      padding: 11px 16px;
      text-align: center;
      font-size: 0.95rem;
      box-shadow: 0 6px 18px color-mix(in srgb, var(--color-primary, #3cdc96) 40%, transparent);
    }

    /* ---- Countdown (any design) */
    .ad__countdown {
      display: grid;
      gap: 4px;
      justify-items: center;
      margin-top: 2px;
    }

    .ad__countdown-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-secondary, #c5c9cc);
    }

    .ad__units {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      width: 100%;
      direction: ltr;
    }

    .ad__unit {
      display: grid;
      gap: 1px;
      padding: 6px 2px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .ad__unit b {
      font-size: 1.1rem;
      line-height: 1.1;
    }

    .ad__unit small {
      font-size: 0.58rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-secondary, #c5c9cc);
    }
  `,
})
export class FloatingAdCardComponent {
  private readonly translation = inject(TranslationService);

  readonly ad = input.required<FloatingAdPublic>();
  readonly dismissed = output<void>();
  readonly linkClicked = output<void>();

  private readonly now = signal(Date.now());

  protected readonly style = computed(() => this.ad().style ?? 'Mini');
  protected readonly countdown = computed(() => floatingAdCountdown(this.ad().countdownEndsOnUtc, this.now()));

  constructor() {
    // The clock only runs while the card shows a countdown.
    effect((onCleanup) => {
      if (!this.ad().countdownEndsOnUtc) {
        return;
      }

      this.now.set(Date.now());
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(timer));
    });
  }

  private isArabic(): boolean {
    return this.translation.language() === 'ar';
  }

  protected title(): string {
    const ad = this.ad();
    return this.isArabic() ? ad.titleAr || ad.titleEn : ad.titleEn;
  }

  protected message(): string | null {
    const ad = this.ad();
    return (this.isArabic() ? ad.messageAr || ad.messageEn : ad.messageEn) || null;
  }

  protected buttonLabel(): string | null {
    const ad = this.ad();
    return (this.isArabic() ? ad.buttonLabelAr || ad.buttonLabelEn : ad.buttonLabelEn) || null;
  }

  protected endsInLabel(): string {
    return this.isArabic() ? 'ينتهي خلال' : 'Ends in:';
  }

  protected unit(unit: 'days' | 'hours' | 'minutes' | 'seconds'): string {
    const ar = { days: 'يوم', hours: 'ساعة', minutes: 'دقيقة', seconds: 'ثانية' };
    const en = { days: 'Days', hours: 'Hrs', minutes: 'Min', seconds: 'Sec' };
    return (this.isArabic() ? ar : en)[unit];
  }

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}

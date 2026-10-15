import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ConsentService } from '../../../core/analytics/consent.service';

/**
 * Asks once whether the visitor allows measurement (audit R55). Shown only when the store actually has tracking
 * configured and the visitor has not answered yet; never on the back-office.
 */
@Component({
  selector: 'app-cookie-consent-banner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <aside class="consent" role="dialog" aria-live="polite" aria-label="Cookie preferences">
        <p class="consent__text">
          We use cookies to measure how the store is used and to improve it. You can accept or decline —
          nothing is loaded until you choose.
          <a routerLink="/legal">Privacy policy</a>
        </p>
        <div class="consent__actions">
          <button type="button" class="consent__btn consent__btn--ghost" (click)="consent.deny()">Decline</button>
          <button type="button" class="consent__btn" (click)="consent.grant()">Accept</button>
        </div>
      </aside>
    }
  `,
  styles: `
    .consent {
      position: fixed;
      inset-inline: 1rem;
      bottom: 1rem;
      z-index: 1100;
      max-width: 42rem;
      margin-inline: auto;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1.1rem;
      border-radius: 0.9rem;
      background: var(--surface-card, #fff);
      color: var(--text-color, #111);
      border: 1px solid var(--surface-border, rgba(0, 0, 0, 0.12));
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    }
    .consent__text {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.4;
      flex: 1 1 18rem;
    }
    .consent__actions {
      display: flex;
      gap: 0.5rem;
    }
    .consent__btn {
      cursor: pointer;
      border: 0;
      border-radius: 0.6rem;
      padding: 0.5rem 1rem;
      font-weight: 600;
      background: var(--primary-color, #6d5efc);
      color: #fff;
    }
    .consent__btn--ghost {
      background: transparent;
      color: inherit;
      border: 1px solid var(--surface-border, rgba(0, 0, 0, 0.2));
    }
  `,
})
export class CookieConsentBannerComponent {
  protected readonly consent = inject(ConsentService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);

  private readonly onAdmin = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: this.router.url.startsWith('/admin') },
  );

  protected readonly visible = computed(
    () => this.analytics.configured() && this.consent.status() === 'unknown' && !this.onAdmin(),
  );
}

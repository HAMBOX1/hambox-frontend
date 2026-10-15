import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { AnalyticsService } from './analytics.service';
import { ConsentService } from './consent.service';

interface AnalyticsPayload {
  googleAnalyticsId: string | null;
  googleTagManagerId: string | null;
  metaPixelId: string | null;
  enableTracking: boolean;
}

const ENABLED: AnalyticsPayload = {
  googleAnalyticsId: null,
  googleTagManagerId: 'GTM-ABC1234',
  metaPixelId: '1234567890',
  enableTracking: true,
};

/**
 * Audit R55 — nothing is measured before consent, the standard events reach the tools, and `purchase` is a
 * once-per-order event.
 */
describe('AnalyticsService', () => {
  function setup(payload: AnalyticsPayload | null) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiClientService, useValue: { get: () => of(payload ? { analytics: payload } : {}) } },
        { provide: Router, useValue: { events: new Subject() } },
      ],
    });

    return {
      analytics: TestBed.inject(AnalyticsService),
      consent: TestBed.inject(ConsentService),
    };
  }

  function injectedScripts(): string[] {
    return Array.from(document.head.querySelectorAll('script[src]'))
      .map((s) => (s as HTMLScriptElement).src)
      .filter((src) => src.includes('googletagmanager.com') || src.includes('facebook.net'));
  }

  beforeEach(() => {
    localStorage.clear();
    window.dataLayer = [];
    window.fbq = undefined;
  });

  afterEach(() => {
    document.head.querySelectorAll('script[src]').forEach((s) => {
      const src = (s as HTMLScriptElement).src;
      if (src.includes('googletagmanager.com') || src.includes('facebook.net')) {
        s.remove();
      }
    });
    localStorage.clear();
  });

  it('loads no tracking script until the visitor consents', async () => {
    const { analytics, consent } = setup(ENABLED);
    await analytics.init();

    expect(analytics.configured()).toBe(true);
    expect(consent.status()).toBe('unknown');
    expect(injectedScripts()).toHaveLength(0);
  });

  it('loads the configured tools after consent and flushes queued events', async () => {
    const { analytics, consent } = setup(ENABLED);
    await analytics.init();

    consent.grant();
    analytics.viewItem({ id: 'p1', name: 'Gift card', price: 25 }, 'USD');
    TestBed.flushEffects();

    const scripts = injectedScripts();
    expect(scripts.some((s) => s.includes('gtm.js?id=GTM-ABC1234'))).toBe(true);
    expect(scripts.some((s) => s.includes('fbevents.js'))).toBe(true);
    expect(window.dataLayer?.some((e) => (e as { event?: string }).event === 'view_item')).toBe(true);
  });

  it('drops events entirely when the visitor declined', async () => {
    const { analytics, consent } = setup(ENABLED);
    await analytics.init();
    consent.deny();
    TestBed.flushEffects();

    analytics.track('add_to_cart', { value: 5 });

    expect(injectedScripts()).toHaveLength(0);
    expect(window.dataLayer?.length ?? 0).toBe(0);
  });

  it('sends the Purchase event once per order, even if the confirmation page is revisited', async () => {
    const { analytics, consent } = setup(ENABLED);
    await analytics.init();
    consent.grant();
    TestBed.flushEffects();

    const items = [{ id: 'p1', name: 'Gift card', price: 25 }];
    analytics.purchase('order-1', 25, 'USD', items);
    analytics.purchase('order-1', 25, 'USD', items);
    analytics.purchase('order-2', 10, 'USD', items);

    const purchases = (window.dataLayer ?? []).filter((e) => (e as { event?: string }).event === 'purchase');
    expect(purchases).toHaveLength(2);
    expect((purchases[0] as { transaction_id: string }).transaction_id).toBe('order-1');
  });

  it('ignores malformed tool ids and a disabled master switch', async () => {
    const bad = setup({ googleAnalyticsId: 'G-<script>', googleTagManagerId: 'nope', metaPixelId: 'abc', enableTracking: true });
    await bad.analytics.init();
    expect(bad.analytics.configured()).toBe(false);

    TestBed.resetTestingModule();
    const off = setup({ ...ENABLED, enableTracking: false });
    await off.analytics.init();
    expect(off.analytics.configured()).toBe(false);
  });
});

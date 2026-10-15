import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ApiClientService } from '../api/api-client.service';
import { SETTINGS_API } from '../api/api-endpoints';
import { ConsentService } from './consent.service';

export interface AnalyticsItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly quantity?: number;
}

interface AnalyticsSettings {
  readonly googleAnalyticsId: string | null;
  readonly googleTagManagerId: string | null;
  readonly metaPixelId: string | null;
  readonly enableTracking: boolean;
}

type EventParams = Record<string, unknown>;

type GtagFunction = (...args: unknown[]) => void;

interface FbqFunction {
  (...args: unknown[]): void;
  queue: unknown[];
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
    fbq?: FbqFunction;
    _fbq?: unknown;
  }
}

const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
const PIXEL_ID = /^\d{5,20}$/;
const TRACKED_PURCHASES_KEY = 'hambox.trackedPurchases';
const MAX_QUEUED = 50;

/** Standard GA4 event name → the Meta Pixel standard event that means the same thing. */
const META_EVENT: Record<string, string> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  search: 'Search',
};

/**
 * GA4 / GTM / Meta Pixel for the storefront (audit R55). Behaviour that matters:
 *  - nothing is loaded unless the store enabled tracking AND the visitor consented;
 *  - the admin area is never measured;
 *  - every standard event goes to every configured tool, and `purchase` is sent at most once per order, even on
 *    reload or when the success page is revisited.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = inject(ApiClientService);
  private readonly consent = inject(ConsentService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private settings: AnalyticsSettings | null = null;
  private loaded = false;
  private readonly queue: { name: string; params: EventParams }[] = [];

  private readonly configuredState = signal(false);

  /** True when the store enabled tracking and has at least one valid tool id — the cookie banner only appears then. */
  readonly configured = this.configuredState.asReadonly();

  constructor() {
    effect(() => {
      if (this.consent.status() === 'granted') {
        this.loadScripts();
      }
    });

    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((event) => {
      if (!this.isTrackablePath(event.urlAfterRedirects)) {
        return;
      }

      this.track('page_view', {
        page_path: event.urlAfterRedirects.split('?')[0],
        page_title: this.document.title,
      });
    });
  }

  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<{ readonly analytics?: Partial<AnalyticsSettings> }>(SETTINGS_API.publicSettings),
      );
      const a = response.analytics;
      this.settings = {
        googleAnalyticsId: GA_ID.test(a?.googleAnalyticsId ?? '') ? a!.googleAnalyticsId! : null,
        googleTagManagerId: GTM_ID.test(a?.googleTagManagerId ?? '') ? a!.googleTagManagerId! : null,
        metaPixelId: PIXEL_ID.test(a?.metaPixelId ?? '') ? a!.metaPixelId! : null,
        enableTracking: a?.enableTracking === true,
      };
    } catch {
      this.settings = null;
    }

    const s = this.settings;
    this.configuredState.set(
      !!s && s.enableTracking && !!(s.googleAnalyticsId || s.googleTagManagerId || s.metaPixelId),
    );

    if (this.consent.status() === 'granted') {
      this.loadScripts();
    }
  }

  /** Sends a standard event to every configured tool (or queues it until the scripts are loaded). */
  track(name: string, params: EventParams = {}): void {
    if (!this.configuredState() || this.consent.status() === 'denied') {
      return;
    }

    if (!this.loaded) {
      if (this.consent.status() === 'granted' && this.queue.length < MAX_QUEUED) {
        this.queue.push({ name, params });
      }

      return;
    }

    this.dispatch(name, params);
  }

  viewItem(item: AnalyticsItem, currency: string): void {
    this.track('view_item', { currency, value: item.price, items: [this.toGaItem(item)] });
  }

  addToCart(item: AnalyticsItem, currency: string): void {
    const quantity = item.quantity ?? 1;
    this.track('add_to_cart', { currency, value: item.price * quantity, items: [this.toGaItem(item)] });
  }

  beginCheckout(items: readonly AnalyticsItem[], total: number, currency: string): void {
    this.track('begin_checkout', { currency, value: total, items: items.map((i) => this.toGaItem(i)) });
  }

  search(term: string): void {
    this.track('search', { search_term: term });
  }

  /** At most one Purchase per order, however many times the confirmation page is opened. */
  purchase(orderId: string, total: number, currency: string, items: readonly AnalyticsItem[]): void {
    if (!orderId || this.wasPurchaseTracked(orderId)) {
      return;
    }

    if (!this.configuredState() || this.consent.status() !== 'granted') {
      return;
    }

    this.rememberPurchase(orderId);
    this.track('purchase', {
      transaction_id: orderId,
      currency,
      value: total,
      items: items.map((i) => this.toGaItem(i)),
    });
  }

  private toGaItem(item: AnalyticsItem): EventParams {
    return { item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity ?? 1 };
  }

  private isTrackablePath(url: string): boolean {
    return !url.startsWith('/admin');
  }

  private loadScripts(): void {
    const s = this.settings;
    if (this.loaded || !s || !s.enableTracking) {
      return;
    }

    if (!s.googleAnalyticsId && !s.googleTagManagerId && !s.metaPixelId) {
      return;
    }

    this.loaded = true;
    const win = this.document.defaultView as Window | null;
    if (!win) {
      return;
    }

    win.dataLayer = win.dataLayer ?? [];

    if (s.googleTagManagerId) {
      win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      this.addScript(`https://www.googletagmanager.com/gtm.js?id=${s.googleTagManagerId}`);
    } else if (s.googleAnalyticsId) {
      win.gtag = function gtag(): void {
        // GA4 only recognises the real `arguments` object, not an array of the same values.
        // eslint-disable-next-line prefer-rest-params
        win.dataLayer!.push(arguments);
      } as GtagFunction;
      win.gtag('js', new Date());
      win.gtag('config', s.googleAnalyticsId, { send_page_view: false });
      this.addScript(`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`);
    }

    if (s.metaPixelId) {
      this.installMetaPixel(win, s.metaPixelId);
    }

    for (const queued of this.queue.splice(0)) {
      this.dispatch(queued.name, queued.params);
    }
  }

  private installMetaPixel(win: Window, pixelId: string): void {
    if (!win.fbq) {
      const fbq = ((...args: unknown[]): void => {
        if (fbq.callMethod) {
          fbq.callMethod(...args);
        } else {
          fbq.queue.push(args);
        }
      }) as FbqFunction;
      fbq.queue = [];
      fbq.loaded = true;
      win.fbq = fbq;
      win._fbq = fbq;
      this.addScript('https://connect.facebook.net/en_US/fbevents.js');
    }

    win.fbq('init', pixelId);
  }

  private dispatch(name: string, params: EventParams): void {
    const win = this.document.defaultView as Window | null;
    const s = this.settings;
    if (!win || !s) {
      return;
    }

    if (s.googleTagManagerId) {
      win.dataLayer?.push({ event: name, ...params });
    } else if (s.googleAnalyticsId && win.gtag) {
      win.gtag('event', name, params);
    }

    if (s.metaPixelId && win.fbq) {
      const metaName = META_EVENT[name];
      if (metaName) {
        win.fbq('track', metaName, this.toMetaParams(params));
      }
    }
  }

  private toMetaParams(params: EventParams): EventParams {
    const items = Array.isArray(params['items']) ? (params['items'] as EventParams[]) : [];
    const out: EventParams = {};
    if (params['currency']) out['currency'] = params['currency'];
    if (typeof params['value'] === 'number') out['value'] = params['value'];
    if (params['search_term']) out['search_string'] = params['search_term'];
    if (items.length) {
      out['content_ids'] = items.map((i) => i['item_id']);
      out['content_type'] = 'product';
      out['num_items'] = items.length;
    }

    return out;
  }

  private addScript(src: string): void {
    const script = this.document.createElement('script');
    script.async = true;
    script.src = src;
    this.document.head.appendChild(script);
  }

  private wasPurchaseTracked(orderId: string): boolean {
    return this.readTrackedPurchases().includes(orderId);
  }

  private rememberPurchase(orderId: string): void {
    const next = [...this.readTrackedPurchases(), orderId].slice(-100);
    try {
      localStorage.setItem(TRACKED_PURCHASES_KEY, JSON.stringify(next));
    } catch {
      // Not persisted: still de-duplicated for this page view through the in-memory copy below.
      this.memoryPurchases = next;
    }
  }

  private memoryPurchases: string[] = [];

  private readTrackedPurchases(): string[] {
    try {
      const raw = localStorage.getItem(TRACKED_PURCHASES_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : this.memoryPurchases;
    } catch {
      return this.memoryPurchases;
    }
  }
}

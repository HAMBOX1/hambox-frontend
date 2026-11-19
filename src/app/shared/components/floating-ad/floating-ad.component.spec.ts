import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { FloatingAdPublic } from '../../../core/models/floating-ad.model';
import { FloatingAdComponent, floatingAdCountdown, floatingAdDismissKey, floatingAdPageKey } from './floating-ad.component';

function ad(overrides: Partial<FloatingAdPublic> = {}): FloatingAdPublic {
  return {
    id: 'ad-1',
    titleEn: 'BE GTA VI READY!',
    titleAr: null,
    messageEn: null,
    messageAr: null,
    buttonLabelEn: 'See the deals',
    buttonLabelAr: null,
    linkUrl: '/products',
    dismissHours: 24,
    imageUrl: null,
    countdownEndsOnUtc: null,
    ...overrides,
  };
}

describe('floatingAdCountdown', () => {
  const now = Date.parse('2026-11-16T10:00:00Z');

  it('splits the time left into days, hours, minutes and seconds', () => {
    const ends = new Date(now + ((24 * 86_400) + (2 * 3_600) + (3 * 60) + 55) * 1000).toISOString();

    expect(floatingAdCountdown(ends, now)).toEqual({ days: 24, hours: 2, minutes: 3, seconds: 55 });
  });

  it('is null when there is no end, or the end has passed', () => {
    expect(floatingAdCountdown(null, now)).toBeNull();
    expect(floatingAdCountdown(new Date(now - 1000).toISOString(), now)).toBeNull();
    expect(floatingAdCountdown(new Date(now).toISOString(), now)).toBeNull();
    expect(floatingAdCountdown('not a date', now)).toBeNull();
  });
});

describe('floatingAdDismissKey', () => {
  it('stays the same for the same ad', () => {
    expect(floatingAdDismissKey(ad())).toBe(floatingAdDismissKey(ad()));
  });

  it('changes when the admin edits the ad, so a closed card comes back with its new wording', () => {
    const before = floatingAdDismissKey(ad());

    expect(floatingAdDismissKey(ad({ titleEn: 'New title' }))).not.toBe(before);
    expect(floatingAdDismissKey(ad({ imageUrl: '/uploads/a.png' }))).not.toBe(before);
    expect(floatingAdDismissKey(ad({ countdownEndsOnUtc: '2026-12-01T00:00:00Z' }))).not.toBe(before);
  });
});

describe('FloatingAdComponent', () => {
  function render(ads: FloatingAdPublic[], url = '/') {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ApiClientService, useValue: { get: () => of(ads) } },
        { provide: AuthSessionService, useValue: { isAuthenticated: () => false } },
        { provide: TranslationService, useValue: { language: () => 'en' } },
      ],
    });
    const fixture = TestBed.createComponent(FloatingAdComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a text-only ad with just a title', async () => {
    const fixture = render([ad({ buttonLabelEn: null, linkUrl: null })]);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ad__title')?.textContent).toContain('BE GTA VI READY!');
    expect(el.querySelector('.ad__image')).toBeNull();
    expect(el.querySelector('.ad__countdown')).toBeNull();
  });

  it('shows the picture and the countdown when the ad has them', async () => {
    const ends = new Date(Date.now() + (3 * 86_400 + 5) * 1000).toISOString();
    const fixture = render([ad({ imageUrl: '/uploads/gta.png', countdownEndsOnUtc: ends })]);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ad__image')?.getAttribute('src')).toBe('/uploads/gta.png');
    const units = [...el.querySelectorAll('.ad__unit b')].map((n) => n.textContent);
    expect(units).toHaveLength(4);
    expect(units[0]).toBe('03');
  });

  it('does not show an ad whose countdown has already run out', async () => {
    const fixture = render([ad({ countdownEndsOnUtc: new Date(Date.now() - 5000).toISOString() })]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.floating-ad')).toBeNull();
  });

  it('hides after the visitor closes it, and remembers that', async () => {
    const fixture = render([ad()]);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.ad__close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.floating-ad')).toBeNull();
    expect(sessionStorage.getItem(floatingAdDismissKey(ad()))).not.toBeNull();
  });

  it('shows the card design that was chosen, with its price on a Product card', async () => {
    const fixture = render([ad({ style: 'Product', priceText: '$19.99', oldPriceText: '$29.99' })]);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ad--product')).not.toBeNull();
    expect(el.querySelector('.ad__price-now')?.textContent).toContain('$19.99');
    expect(el.querySelector('.ad__price-old')?.textContent).toContain('$29.99');
  });

  it('sits where the ad says for a computer and for a phone', async () => {
    const fixture = render([ad({ positionDesktop: 'BottomRight', positionMobile: 'Top' })]);
    await fixture.whenStable();
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('.floating-ad') as HTMLElement;
    expect(host.dataset['desktop']).toBe('BottomRight');
    expect(host.dataset['mobile']).toBe('Top');
  });

  it('stays closed for the rest of the session once the visitor closed it', async () => {
    const first = render([ad()]);
    await first.whenStable();
    first.detectChanges();
    ((first.nativeElement as HTMLElement).querySelector('.ad__close') as HTMLButtonElement).click();
    TestBed.resetTestingModule();

    // A new page load in the same browser session: the card does not come back.
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ApiClientService, useValue: { get: () => of([ad()]) } },
        { provide: AuthSessionService, useValue: { isAuthenticated: () => false } },
        { provide: TranslationService, useValue: { language: () => 'en' } },
      ],
    });
    const again = TestBed.createComponent(FloatingAdComponent);
    again.detectChanges();
    await again.whenStable();
    again.detectChanges();

    expect((again.nativeElement as HTMLElement).querySelector('.floating-ad')).toBeNull();
  });
});

describe('floatingAdPageKey', () => {
  it('maps storefront paths to the pages an ad can be limited to', () => {
    expect(floatingAdPageKey('/')).toBe('home');
    expect(floatingAdPageKey('/home')).toBe('home');
    expect(floatingAdPageKey('/products')).toBe('products');
    expect(floatingAdPageKey('/products?platform=steam')).toBe('products');
    expect(floatingAdPageKey('/products/some-game')).toBe('product');
    expect(floatingAdPageKey('/categories/xbox')).toBe('category');
    expect(floatingAdPageKey('/faq')).toBe('other');
  });
});

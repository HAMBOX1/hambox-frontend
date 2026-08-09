import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { THEMES_API } from '../api/api-endpoints';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ActiveThemePayload, ThemeEngineService } from './theme-engine.service';

/**
 * Regression coverage for the Campaign Phase 2 audit finding: the backend correctly resolves
 * resolutionSource = "campaign", but the frontend only ever applied token overrides for
 * resolutionSource === "membership" — so an active campaign's tokens were fetched and silently
 * discarded. These tests pin the fixed, centralized behavior in `hasThemedOverride` so the two
 * sources can never drift apart again.
 */
describe('ThemeEngineService — token override application by resolutionSource', () => {
  let service: ThemeEngineService;
  let httpMock: HttpTestingController;

  const basePayload: ActiveThemePayload = {
    themeId: 'theme-1',
    themeName: 'Black Friday 2026',
    slug: 'black-friday-2026',
    baseMode: 'Dark',
    versionId: 'version-1',
    versionNumber: 1,
    tokens: { primary: '#ff0000' },
    assets: [],
    resolutionSource: 'campaign',
  };

  beforeEach(() => {
    sessionStorage.clear();
    document.documentElement.style.removeProperty('--theme-primary');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '' }],
    });

    service = TestBed.inject(ThemeEngineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearOverrides();
    sessionStorage.clear();
  });

  async function loadWith(payload: ActiveThemePayload): Promise<void> {
    const pending = service.loadActiveTheme();
    httpMock.expectOne((req) => req.url === THEMES_API.active).flush(payload);
    await pending;
  }

  it('applies real CSS token overrides on the storefront when resolutionSource is "campaign"', async () => {
    await loadWith(basePayload);

    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');
    expect(service.hasActiveTokenOverride()).toBe(true);
  });

  it('still applies token overrides for resolutionSource "membership" (existing behavior preserved)', async () => {
    await loadWith({ ...basePayload, resolutionSource: 'membership' });

    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');
    expect(service.hasActiveTokenOverride()).toBe(true);
  });

  it('applies real CSS token overrides on the storefront when resolutionSource is "schedule"', async () => {
    await loadWith({ ...basePayload, resolutionSource: 'schedule' });

    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');
    expect(service.hasActiveTokenOverride()).toBe(true);
  });

  it.each(['store', 'default'])(
    'does not apply token overrides for resolutionSource "%s" (unchanged semantics)',
    async (source) => {
      await loadWith({ ...basePayload, resolutionSource: source });

      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('');
      expect(service.hasActiveTokenOverride()).toBe(false);
    },
  );

  it('clears a previously-applied campaign override once resolution falls back to a non-themed source', async () => {
    await loadWith(basePayload);
    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');

    // Campaign ended / was disabled server-side — the next resolution call returns the store
    // default instead. The stale campaign token must not linger on the DOM.
    await loadWith({ ...basePayload, resolutionSource: 'default', tokens: {} });

    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('');
    expect(service.hasActiveTokenOverride()).toBe(false);
  });
});

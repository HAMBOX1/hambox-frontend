import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MaintenanceBypassService } from '../maintenance/maintenance-bypass.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { errorInterceptor } from './error.interceptor';

const BYPASS_STORAGE_KEY = 'hambox.maintenanceBypass';

describe('errorInterceptor — maintenance redirect loop', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    // A token that is still valid by its own client-side stamp, exactly like the one that
    // survives in a visitor's browser after the server's key ring has rotated under it.
    localStorage.setItem(
      BYPASS_STORAGE_KEY,
      JSON.stringify({
        token: 'stale-token',
        expiresOnUtc: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        // The interceptor navigates to /coming-soon on 503; give it a target to land on.
        provideRouter([{ path: 'coming-soon', children: [] }]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('drops a bypass token the server refuses, so /coming-soon cannot bounce back', () => {
    const bypass = TestBed.inject(MaintenanceBypassService);
    const maintenance = TestBed.inject(MaintenanceService);

    expect(bypass.hasValidToken()).toBe(true);

    http.get('/api/v1/storefront/content').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/v1/storefront/content').flush(
      { code: 'MAINTENANCE', message: 'Back soon' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    // Both halves of the cycle now agree with the server: the guard sends the visitor to
    // /coming-soon, and /coming-soon has no reason left to send them to the storefront.
    expect(bypass.hasValidToken()).toBe(false);
    expect(localStorage.getItem(BYPASS_STORAGE_KEY)).toBeNull();
    expect(maintenance.enabled()).toBe(true);
  });

  it('does not let a stale settings read downgrade a server-confirmed maintenance state', async () => {
    const maintenance = TestBed.inject(MaintenanceService);

    http.get('/api/v1/storefront/content').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/v1/storefront/content').flush(
      { code: 'MAINTENANCE', message: 'Back soon' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    const ready = maintenance.init();
    httpMock
      .expectOne('/api/v1/platform-settings')
      .flush({ maintenance: { enabled: false, message: '', allowedRoleNames: [] } });
    await ready;

    expect(maintenance.enabled()).toBe(true);
  });
});

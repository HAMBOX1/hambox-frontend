import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

import { fakeJwt } from '../../testing/fake-jwt';
import { AUTH_CONTEXT } from '../auth/auth-context';
import { AuthSessionService } from '../auth/auth-session.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { authInterceptor } from './auth.interceptor';

/** Lets the Promise microtask inside SessionBootstrapService (firstValueFrom → from()) settle. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);

    session.setSession(AUTH_CONTEXT.Customer, {
      accessToken: fakeJwt('customer'),
      expiresAt: new Date().toISOString(),
    });
  });

  afterEach(() => httpMock.verify());

  it('attaches the in-memory access token as a Bearer header', () => {
    http.get('/api/v1/account/profile').subscribe();
    const req = httpMock.expectOne('/api/v1/account/profile');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${session.getAccessToken(AUTH_CONTEXT.Customer)}`);
    req.flush({});
  });

  it('on a 401, refreshes exactly once and retries the original request', async () => {
    let result: unknown;
    http.get('/api/v1/account/profile').subscribe((v) => (result = v));

    httpMock
      .expectOne('/api/v1/account/profile')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    const newToken = fakeJwt('customer');
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: newToken, expiresAt: new Date().toISOString() });
    await flushMicrotasks();

    const retry = httpMock.expectOne('/api/v1/account/profile');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('coalesces concurrent 401s into a single refresh call, retrying both originals', async () => {
    let firstDone = false;
    let secondDone = false;
    http.get('/api/v1/account/profile').subscribe(() => (firstDone = true));
    http.get('/api/v1/account/orders').subscribe(() => (secondDone = true));

    httpMock.expectOne('/api/v1/account/profile').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/v1/account/orders').flush(null, { status: 401, statusText: 'Unauthorized' });

    // Exactly one refresh request in flight for both 401s — a second expectOne would throw if a
    // second refresh call had been fired.
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: fakeJwt('customer'), expiresAt: new Date().toISOString() });
    await flushMicrotasks();

    httpMock.expectOne('/api/v1/account/profile').flush({});
    httpMock.expectOne('/api/v1/account/orders').flush({});

    expect(firstDone).toBe(true);
    expect(secondDone).toBe(true);
  });

  it('clears the session and does not loop when refresh itself fails', async () => {
    let errored = false;
    http.get('/api/v1/account/profile').subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/api/v1/account/profile').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne('/api/auth/refresh')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await flushMicrotasks();

    expect(errored).toBe(true);
    expect(session.isCustomerAuthenticated()).toBe(false);
    httpMock.verify();
  });

  it('does not attempt a refresh for the refresh/login endpoints themselves', () => {
    http.post('/api/auth/refresh', null).subscribe({ error: () => undefined });
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.verify();
  });
});

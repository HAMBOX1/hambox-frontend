import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { fakeJwt } from '../../testing/fake-jwt';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AUTH_CONTEXT } from './auth-context';
import { AuthSessionService } from './auth-session.service';
import { SessionBootstrapService } from './session-bootstrap.service';

/** Lets the Promise microtask inside SessionBootstrapService (firstValueFrom → from()) settle. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SessionBootstrapService', () => {
  let bootstrap: SessionBootstrapService;
  let session: AuthSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '' }],
    });

    bootstrap = TestBed.inject(SessionBootstrapService);
    session = TestBed.inject(AuthSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('never touches localStorage or sessionStorage on bootstrap', async () => {
    const setLocal = vi.spyOn(Storage.prototype, 'setItem');

    const pending = bootstrap.bootstrapOnce();
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: fakeJwt('customer'), expiresAt: new Date().toISOString() });
    await pending;

    expect(setLocal).not.toHaveBeenCalled();
  });

  it('populates the context read off the returned token, not an assumption', async () => {
    const pending = bootstrap.bootstrapOnce();
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: fakeJwt('admin'), expiresAt: new Date().toISOString() });
    const context = await pending;

    expect(context).toBe(AUTH_CONTEXT.Admin);
    expect(session.isAdminAuthenticated()).toBe(true);
    expect(session.isCustomerAuthenticated()).toBe(false);
    expect(session.initialized(AUTH_CONTEXT.Customer)).toBe(true);
    expect(session.initialized(AUTH_CONTEXT.Admin)).toBe(true);
  });

  it('clears all sessions and still marks both contexts initialized when no cookie exists', async () => {
    const pending = bootstrap.bootstrapOnce();
    httpMock.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    const context = await pending;

    expect(context).toBeNull();
    expect(session.isCustomerAuthenticated()).toBe(false);
    expect(session.initialized(AUTH_CONTEXT.Customer)).toBe(true);
  });

  it('memoizes bootstrapOnce — a second caller does not fire a second request', async () => {
    const first = bootstrap.bootstrapOnce();
    const second = bootstrap.bootstrapOnce();

    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: fakeJwt('customer'), expiresAt: new Date().toISOString() });

    await Promise.all([first, second]);
    httpMock.verify();
  });

  it('coalesces concurrent refresh() calls into exactly one HTTP request', async () => {
    const first = bootstrap.refresh();
    const second = bootstrap.refresh();

    let firstResult: unknown;
    let secondResult: unknown;
    first.subscribe((v) => (firstResult = v));
    second.subscribe((v) => (secondResult = v));

    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush({ accessToken: fakeJwt('customer'), expiresAt: new Date().toISOString() });
    await flushMicrotasks();

    expect(firstResult).toBeDefined();
    expect(firstResult).toEqual(secondResult);
    httpMock.verify();
  });

  it('issues a fresh request on the next refresh() after the previous one settles', async () => {
    bootstrap.refresh().subscribe();
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: fakeJwt('customer'), expiresAt: new Date().toISOString() });
    await flushMicrotasks();

    bootstrap.refresh().subscribe();
    httpMock
      .expectOne('/api/auth/refresh')
      .flush({ accessToken: fakeJwt('customer'), expiresAt: new Date().toISOString() });
    await flushMicrotasks();
  });
});

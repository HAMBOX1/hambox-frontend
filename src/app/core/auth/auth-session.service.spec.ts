import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { fakeJwt } from '../../testing/fake-jwt';
import { AUTH_CONTEXT } from './auth-context';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('never reads or writes localStorage/sessionStorage', () => {
    const setLocal = vi.spyOn(Storage.prototype, 'setItem');
    const getLocal = vi.spyOn(Storage.prototype, 'getItem');

    service.setSession(AUTH_CONTEXT.Customer, {
      accessToken: fakeJwt('customer'),
      expiresAt: new Date().toISOString(),
    });
    service.getAccessToken(AUTH_CONTEXT.Customer);
    service.clearSession(AUTH_CONTEXT.Customer);

    expect(setLocal).not.toHaveBeenCalled();
    expect(getLocal).not.toHaveBeenCalled();
  });

  it('starts with no session — a fresh reload has nothing to restore synchronously', () => {
    expect(service.getAccessToken(AUTH_CONTEXT.Customer)).toBeNull();
    expect(service.getAccessToken(AUTH_CONTEXT.Admin)).toBeNull();
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.isAdminAuthenticated()).toBe(false);
  });

  it('purges legacy pre-cookie-auth token keys from localStorage on construction', () => {
    localStorage.setItem('hambox.customer.accessToken', 'stale-jwt');
    localStorage.setItem('hambox.customer.refreshToken', 'stale-refresh');
    localStorage.setItem('hambox.admin.accessToken', 'stale-admin-jwt');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    TestBed.inject(AuthSessionService);

    expect(localStorage.getItem('hambox.customer.accessToken')).toBeNull();
    expect(localStorage.getItem('hambox.customer.refreshToken')).toBeNull();
    expect(localStorage.getItem('hambox.admin.accessToken')).toBeNull();
  });

  it('setting an admin session clears any customer session, and vice versa', () => {
    service.setSession(AUTH_CONTEXT.Customer, {
      accessToken: fakeJwt('customer'),
      expiresAt: new Date().toISOString(),
    });
    expect(service.isCustomerAuthenticated()).toBe(true);

    service.setSession(AUTH_CONTEXT.Admin, {
      accessToken: fakeJwt('admin'),
      expiresAt: new Date().toISOString(),
    });
    expect(service.isAdminAuthenticated()).toBe(true);
    expect(service.isCustomerAuthenticated()).toBe(false);
  });
});

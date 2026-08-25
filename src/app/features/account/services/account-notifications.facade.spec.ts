import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { NotificationHubService } from '../../../core/notifications/notification-hub.service';
import { PagedResult } from '../../catalog/models/category.model';
import { UserNotificationApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';
import { AccountNotificationsFacade } from './account-notifications.facade';

function notification(id: string, overrides: Partial<UserNotificationApiDto> = {}): UserNotificationApiDto {
  return {
    id,
    title: `Title ${id}`,
    body: `Body ${id}`,
    category: 'General',
    isRead: false,
    createdOnUtc: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function page(items: readonly UserNotificationApiDto[]): PagedResult<UserNotificationApiDto> {
  return { items, pageNumber: 1, pageSize: 50, totalCount: items.length };
}

/**
 * `AccountNotificationsFacade` is a `providedIn: 'root'` singleton shared by every concurrently-mounted
 * `NotificationBellComponent` (desktop + mobile chrome both render, one CSS-hidden) plus the dedicated
 * notifications page — so overlapping `load()` calls are the normal case, not an edge case. These tests
 * pin down the exact race that made notifications disappear/flicker: a slower, older response must never
 * overwrite a newer one, and a failure must never wipe out already-loaded data.
 */
describe('AccountNotificationsFacade', () => {
  let facade: AccountNotificationsFacade;
  let api: {
    getNotifications: ReturnType<typeof vi.fn>;
    getUnreadNotificationCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getNotifications: vi.fn(),
      getUnreadNotificationCount: vi.fn(),
    };

    const hub = {
      connect: vi.fn().mockRejectedValue(new Error('no realtime in tests')),
      notificationCreated$: new Subject().asObservable(),
      notificationUpdated$: new Subject().asObservable(),
      notificationDeleted$: new Subject().asObservable(),
      allRead$: new Subject().asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountNotificationsFacade,
        { provide: AccountApiService, useValue: api },
        { provide: NotificationHubService, useValue: hub },
      ],
    });

    facade = TestBed.inject(AccountNotificationsFacade);
  });

  it('discards a stale load() response that resolves after a newer load() already started', async () => {
    const staleItems$ = new Subject<PagedResult<UserNotificationApiDto>>();
    const staleCount$ = new Subject<number>();
    const freshItems$ = new Subject<PagedResult<UserNotificationApiDto>>();
    const freshCount$ = new Subject<number>();

    api.getNotifications.mockReturnValueOnce(staleItems$).mockReturnValueOnce(freshItems$);
    api.getUnreadNotificationCount.mockReturnValueOnce(staleCount$).mockReturnValueOnce(freshCount$);

    // Two consumers (e.g. the desktop bell and the mobile bell, both mounted at once) call load()
    // back to back. Neither has resolved yet.
    const stalePromise = facade.load();
    const freshPromise = facade.load();

    // The second (newer) call resolves first — the common case, but the fix must not depend on
    // resolution order at all.
    freshItems$.next(page([notification('fresh-1')]));
    freshCount$.next(5);
    await freshPromise;

    expect(facade.items().map((i) => i.id)).toEqual(['fresh-1']);
    expect(facade.unreadCount()).toBe(5);

    // The first (older) call finally resolves with different data — it must be discarded, not applied.
    staleItems$.next(page([notification('stale-1'), notification('stale-2')]));
    staleCount$.next(99);
    await stalePromise;

    expect(facade.items().map((i) => i.id)).toEqual(['fresh-1']);
    expect(facade.unreadCount()).toBe(5);
  });

  it('does not clear previously-loaded notifications when a later load() call fails', async () => {
    // First load succeeds and populates state.
    const firstItems$ = new Subject<PagedResult<UserNotificationApiDto>>();
    const firstCount$ = new Subject<number>();
    api.getNotifications.mockReturnValueOnce(firstItems$);
    api.getUnreadNotificationCount.mockReturnValueOnce(firstCount$);

    const firstLoad = facade.load();
    firstItems$.next(page([notification('kept-1'), notification('kept-2')]));
    firstCount$.next(2);
    await firstLoad;

    expect(facade.items().map((i) => i.id)).toEqual(['kept-1', 'kept-2']);

    // Second load fails outright (e.g. a transient network error).
    api.getNotifications.mockReturnValueOnce(throwError(() => new Error('network down')));
    api.getUnreadNotificationCount.mockReturnValueOnce(throwError(() => new Error('network down')));

    await facade.load();

    expect(facade.items().map((i) => i.id)).toEqual(['kept-1', 'kept-2']);
    expect(facade.unreadCount()).toBe(2);
    expect(facade.error()).toBe('Unable to load notifications.');
  });

  it('discards a stale failure that resolves after a newer load() already succeeded', async () => {
    const staleItems$ = new Subject<PagedResult<UserNotificationApiDto>>();
    const freshItems$ = new Subject<PagedResult<UserNotificationApiDto>>();
    const freshCount$ = new Subject<number>();

    api.getNotifications.mockReturnValueOnce(staleItems$).mockReturnValueOnce(freshItems$);
    api.getUnreadNotificationCount.mockReturnValueOnce(new Subject<number>()).mockReturnValueOnce(freshCount$);

    const stalePromise = facade.load();
    const freshPromise = facade.load();

    freshItems$.next(page([notification('good-1')]));
    freshCount$.next(1);
    await freshPromise;

    expect(facade.items().map((i) => i.id)).toEqual(['good-1']);
    expect(facade.error()).toBeNull();

    // The older, now-stale request finally errors out — it must not clobber the good state that's
    // already on screen with an error message.
    staleItems$.error(new Error('slow request finally timed out'));
    await stalePromise;

    expect(facade.items().map((i) => i.id)).toEqual(['good-1']);
    expect(facade.error()).toBeNull();
  });
});

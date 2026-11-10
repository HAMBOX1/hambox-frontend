import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PointsSummaryApiDto, PointsTransactionApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';
import { AccountPointsFacade } from './account-points.facade';

function transaction(overrides: Partial<PointsTransactionApiDto> = {}): PointsTransactionApiDto {
  return {
    id: 'tx-1',
    type: 'Earned',
    points: 40,
    orderId: 'order-1',
    orderNumber: 'HB-1001',
    description: 'Points earned on order HB-1001.',
    occurredOnUtc: '2026-11-07T10:00:00Z',
    ...overrides,
  };
}

const SUMMARY: PointsSummaryApiDto = {
  balance: 115,
  totalEarned: 140,
  enabled: true,
  pointsPerUsd: 1,
};

describe('AccountPointsFacade', () => {
  let facade: AccountPointsFacade;
  let api: {
    getPointsSummary: ReturnType<typeof vi.fn>;
    getPointsHistory: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { getPointsSummary: vi.fn(), getPointsHistory: vi.fn() };

    TestBed.configureTestingModule({
      providers: [AccountPointsFacade, { provide: AccountApiService, useValue: api }],
    });

    facade = TestBed.inject(AccountPointsFacade);
  });

  it('loads the balance and total earned from the API', async () => {
    api.getPointsSummary.mockReturnValue(of(SUMMARY));

    await facade.load();

    expect(facade.summary()).toEqual(SUMMARY);
    expect(facade.error()).toBe(false);
    expect(facade.loading()).toBe(false);
  });

  it('shows an error (not a zero balance) when the summary cannot be loaded', async () => {
    api.getPointsSummary.mockReturnValue(throwError(() => new Error('boom')));

    await facade.load();

    expect(facade.summary()).toBeNull();
    expect(facade.error()).toBe(true);
  });

  it('loads a page of history and works out the page count', async () => {
    api.getPointsHistory.mockReturnValue(
      of({
        items: [transaction(), transaction({ id: 'tx-2', type: 'Reversed', points: -40 })],
        totalCount: 23,
        pageNumber: 1,
        pageSize: 10,
      }),
    );

    await facade.loadHistory();

    expect(facade.history()).toHaveLength(2);
    expect(facade.totalCount()).toBe(23);
    expect(facade.totalPages()).toBe(3);
    expect(api.getPointsHistory).toHaveBeenCalledWith({
      pageNumber: 1,
      pageSize: 10,
      type: undefined,
    });
  });

  it('filters by type and goes back to the first page', async () => {
    api.getPointsHistory.mockImplementation((query: { pageNumber: number }) =>
      of({ items: [], totalCount: 50, pageNumber: query.pageNumber, pageSize: 10 }),
    );
    await facade.loadHistory();
    facade.setPage(3);
    await vi.waitFor(() => expect(facade.pageNumber()).toBe(3));

    facade.setTypeFilter('Reversed');
    await vi.waitFor(() =>
      expect(api.getPointsHistory).toHaveBeenLastCalledWith({
        pageNumber: 1,
        pageSize: 10,
        type: 'Reversed',
      }),
    );

    expect(facade.typeFilter()).toBe('Reversed');
    expect(facade.pageNumber()).toBe(1);
  });

  it('flags a history failure and clears the stale rows', async () => {
    api.getPointsHistory.mockReturnValueOnce(
      of({ items: [transaction()], totalCount: 1, pageNumber: 1, pageSize: 10 }),
    );
    await facade.loadHistory();

    api.getPointsHistory.mockReturnValueOnce(throwError(() => new Error('boom')));
    await facade.loadHistory();

    expect(facade.history()).toEqual([]);
    expect(facade.historyError()).toBe(true);
  });
});

import { getNotificationTypeMeta, groupNotificationsByDate } from './notification-type.util';

describe('getNotificationTypeMeta', () => {
  it('maps known categories case-insensitively', () => {
    expect(getNotificationTypeMeta('Order').icon).toBe('pi pi-shopping-bag');
    expect(getNotificationTypeMeta('security').semantic).toBe('danger');
    expect(getNotificationTypeMeta('BackInStock').important).toBe(false);
    expect(getNotificationTypeMeta('Order').important).toBe(true);
  });

  it('falls back to the general/neutral default for unknown or missing categories', () => {
    expect(getNotificationTypeMeta('SomethingNew')).toEqual(getNotificationTypeMeta(null));
    expect(getNotificationTypeMeta(undefined).semantic).toBe('neutral');
  });
});

describe('groupNotificationsByDate', () => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Offsets anchored to the same midnight boundary the util itself uses, so this is never flaky
  // depending on what time of day the suite happens to run.
  const inToday = new Date(startToday + 3_600_000).toISOString();
  const inYesterday = new Date(startToday - 12 * 3_600_000).toISOString();
  const inEarlier = new Date(startToday - 30 * 3_600_000).toISOString();

  it('buckets items into Today / Yesterday / Earlier and drops empty groups', () => {
    const items = [
      { id: '1', createdOnUtc: inToday },
      { id: '2', createdOnUtc: inYesterday },
      { id: '3', createdOnUtc: inEarlier },
    ];

    const groups = groupNotificationsByDate(items);
    expect(groups.map((g) => g.labelKey)).toEqual([
      'ACCOUNT.NOTIFICATIONS_UI.TODAY',
      'ACCOUNT.NOTIFICATIONS_UI.YESTERDAY',
      'ACCOUNT.NOTIFICATIONS_UI.EARLIER',
    ]);
    expect(groups.every((g) => g.items.length === 1)).toBe(true);
  });

  it('omits groups with no items', () => {
    const groups = groupNotificationsByDate([{ id: '1', createdOnUtc: new Date().toISOString() }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].labelKey).toBe('ACCOUNT.NOTIFICATIONS_UI.TODAY');
  });
});

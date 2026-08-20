/**
 * Single source of truth for how a notification's `category` (raw string from the backend's
 * `CommunicationCategory` enum — see HAMBOX.Modules.Communication.Domain.Communication) maps to
 * display metadata. Used by both the notification bell and the account notifications page so the
 * two surfaces read as one system rather than two independent implementations.
 *
 * `semantic` drives icon tint/background only — it is a presentation classification, not a stored
 * severity (the backend has no per-notification "important" flag). `important` is the client-side
 * heuristic backing the Important filter tab: categories where missing the notification has real
 * account/order consequences.
 */
export type NotificationSemantic = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export interface NotificationTypeMeta {
  readonly icon: string;
  readonly semantic: NotificationSemantic;
  readonly labelKey: string;
  readonly important: boolean;
}

const TYPE_META: Record<string, NotificationTypeMeta> = {
  order: { icon: 'pi pi-shopping-bag', semantic: 'success', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.ORDER', important: true },
  membership: { icon: 'pi pi-crown', semantic: 'info', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.MEMBERSHIP', important: false },
  security: { icon: 'pi pi-shield', semantic: 'danger', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.SECURITY', important: true },
  promotion: { icon: 'pi pi-tag', semantic: 'warning', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.PROMOTION', important: false },
  system: { icon: 'pi pi-info-circle', semantic: 'neutral', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.SYSTEM', important: false },
  support: { icon: 'pi pi-comments', semantic: 'info', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.SUPPORT', important: false },
  supplier: { icon: 'pi pi-truck', semantic: 'neutral', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.SUPPLIER', important: false },
  marketing: { icon: 'pi pi-percentage', semantic: 'warning', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.MARKETING', important: false },
  general: { icon: 'pi pi-bell', semantic: 'neutral', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.GENERAL', important: false },
  backinstock: { icon: 'pi pi-box', semantic: 'success', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.BACK_IN_STOCK', important: false },
  pricedrop: { icon: 'pi pi-tag', semantic: 'success', labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.PRICE_DROP', important: false },
};

const DEFAULT_META: NotificationTypeMeta = {
  icon: 'pi pi-bell',
  semantic: 'neutral',
  labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TYPES.GENERAL',
  important: false,
};

/** Looks up display metadata for a raw notification category string (case-insensitive). */
export function getNotificationTypeMeta(category: string | null | undefined): NotificationTypeMeta {
  const key = (category ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return TYPE_META[key] ?? DEFAULT_META;
}

export interface NotificationDateGroup<T> {
  readonly labelKey: string;
  readonly items: readonly T[];
}

/** Buckets items with a `createdOnUtc` timestamp into Today / Yesterday / Earlier, in that order. */
export function groupNotificationsByDate<T extends { readonly createdOnUtc: string }>(
  items: readonly T[],
): readonly NotificationDateGroup<T>[] {
  const today: T[] = [];
  const yesterday: T[] = [];
  const earlier: T[] = [];

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;

  for (const item of items) {
    const stamp = new Date(item.createdOnUtc).getTime();
    if (stamp >= startToday) {
      today.push(item);
    } else if (stamp >= startYesterday) {
      yesterday.push(item);
    } else {
      earlier.push(item);
    }
  }

  return [
    { labelKey: 'ACCOUNT.NOTIFICATIONS_UI.TODAY', items: today },
    { labelKey: 'ACCOUNT.NOTIFICATIONS_UI.YESTERDAY', items: yesterday },
    { labelKey: 'ACCOUNT.NOTIFICATIONS_UI.EARLIER', items: earlier },
  ].filter((group) => group.items.length > 0);
}

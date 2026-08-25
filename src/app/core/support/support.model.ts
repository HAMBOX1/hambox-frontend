/** UI-facing ticket model — sourced from the real Support API (see support-api.model.ts for the
 * wire shapes and support-tickets.store.ts for the mapping). Field names are kept close to the
 * pre-existing mock model so page templates needed minimal changes when the backend landed. */

export type TicketStatus = 'open' | 'waiting_customer' | 'waiting_agent' | 'resolved' | 'closed';

export type StatusTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

export const OPEN_TICKET_STATUSES: readonly TicketStatus[] = ['open', 'waiting_customer', 'waiting_agent'];

export const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = ['resolved', 'closed'];

export const TICKET_STATUS_META: Readonly<Record<TicketStatus, { labelKey: string; tone: StatusTone }>> = {
  open: { labelKey: 'SUPPORT.STATUS.OPEN', tone: 'info' },
  waiting_customer: { labelKey: 'SUPPORT.STATUS.WAITING_CUSTOMER', tone: 'warning' },
  waiting_agent: { labelKey: 'SUPPORT.STATUS.WAITING_AGENT', tone: 'info' },
  resolved: { labelKey: 'SUPPORT.STATUS.RESOLVED', tone: 'success' },
  closed: { labelKey: 'SUPPORT.STATUS.CLOSED', tone: 'neutral' },
};

/** Backend TicketStatusApi <-> the lowercase keys used throughout the UI. */
export function statusFromApi(status: string): TicketStatus {
  switch (status) {
    case 'Open': return 'open';
    case 'WaitingCustomer': return 'waiting_customer';
    case 'WaitingAgent': return 'waiting_agent';
    case 'Resolved': return 'resolved';
    case 'Closed': return 'closed';
    default: return 'open';
  }
}

export function statusToApi(status: TicketStatus): 'Open' | 'WaitingCustomer' | 'WaitingAgent' | 'Resolved' | 'Closed' {
  switch (status) {
    case 'open': return 'Open';
    case 'waiting_customer': return 'WaitingCustomer';
    case 'waiting_agent': return 'WaitingAgent';
    case 'resolved': return 'Resolved';
    case 'closed': return 'Closed';
  }
}

/** Categories/priorities are now admin-managed DB rows (Support.ManageCategories), not a fixed
 * enum — see CLAUDE.md-approved plan decision to swap the old hardcoded union for live data. */
export interface TicketCategory {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly icon: string;
}

export interface TicketPriority {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly level: number;
}

export interface TicketTag {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export type MessageAuthorRole = 'customer' | 'agent' | 'system';

export interface TicketAttachment {
  readonly id: string;
  readonly name: string;
  readonly sizeKb: number;
  readonly kind: 'image' | 'pdf' | 'zip' | 'log' | 'video' | 'other';
  readonly url?: string;
}

export interface TicketMessage {
  readonly id: string;
  readonly authorRole: MessageAuthorRole;
  readonly authorName: string;
  readonly authorAvatarUrl?: string | null;
  readonly bodyHtml: string;
  readonly attachments: readonly TicketAttachment[];
  readonly internal: boolean;
  readonly createdAtUtc: string;
  readonly deliveryState: 'sent' | 'delivered' | 'seen';
}

export interface TicketTimelineEntry {
  readonly id: string;
  readonly labelKey: string;
  readonly detail?: string;
  readonly atUtc: string;
}

export interface TicketCustomerContext {
  readonly membershipPlanName: string | null;
  readonly membershipStatus: string | null;
  readonly relatedOrderId: string | null;
  readonly recentOrders: readonly {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly totalAmount: number;
    readonly status: string;
    readonly createdAtUtc: string;
    readonly productNames: readonly string[];
    readonly hasLicenseKeys: boolean;
  }[];
  readonly customerCountry: string | null;
  readonly customerBrowser: string | null;
  readonly customerDevice: string | null;
  readonly recentTicketsCount: number;
}

export interface Ticket {
  readonly id: string;
  readonly number: string;
  readonly subject: string;
  readonly category: TicketCategory | null;
  readonly status: TicketStatus;
  readonly priority: TicketPriority | null;
  readonly tags: readonly TicketTag[];
  readonly customerId: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly customerAvatarUrl?: string | null;
  readonly membershipTier?: string | null;
  readonly relatedOrderNumber?: string | null;
  readonly relatedProductName?: string | null;
  readonly assignedAgentId?: string | null;
  readonly assignedAgentName?: string | null;
  readonly messages: readonly TicketMessage[];
  readonly timeline: readonly TicketTimelineEntry[];
  readonly createdAtUtc: string;
  readonly updatedAtUtc: string;
  readonly lastReplyAtUtc?: string | null;
  readonly unreadByCustomer: boolean;
  readonly unreadByAgent: boolean;
  readonly ratingScore: number | null;
  readonly aiSummary?: string | null;
  readonly context?: TicketCustomerContext;
}

export interface CreateTicketInput {
  readonly categoryId: string | null;
  readonly priorityId: string | null;
  readonly subject: string;
  readonly descriptionHtml: string;
  readonly relatedOrderNumber?: string | null;
  readonly relatedProductName?: string | null;
}

export interface SupportAgent {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
  readonly online: boolean;
}

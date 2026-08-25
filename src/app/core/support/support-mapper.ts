import {
  MessageAuthorRoleApi,
  TicketAttachmentApiDto,
  TicketCategoryApiDto,
  TicketDetailApiDto,
  TicketMessageApiDto,
  TicketPriorityApiDto,
  TicketSummaryApiDto,
  TicketTagApiDto,
} from './support-api.model';
import {
  MessageAuthorRole,
  statusFromApi,
  Ticket,
  TicketAttachment,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketTag,
} from './support.model';

function roleFromApi(role: MessageAuthorRoleApi): MessageAuthorRole {
  return role.toLowerCase() as MessageAuthorRole;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Backend message bodies are plain text; render as safe HTML with line breaks preserved for the
 * existing bubble UI's [innerHTML] binding. */
function toBodyHtml(body: string): string {
  return escapeHtml(body).replace(/\n/g, '<br>');
}

/**
 * Converts the rich-text composer's HTML into genuine plain text before it's sent to the
 * backend. A naive `html.replace(/<[^>]*>/g, '')` (the previous approach) strips tags but leaves
 * HTML entities — like the `&nbsp;`/`&#39;` PrimeNG's editor inserts for spaces/apostrophes —
 * completely undecoded, so the literal entity text got stored and then re-escaped on display
 * (showing as visible "&nbsp;"/"&#39;" instead of a space/apostrophe). Using the browser's own
 * HTML parser to read `textContent` decodes entities correctly the same way the browser would.
 */
export function htmlToPlainText(html: string): string {
  const withBreaks = html.replace(/<\/(p|div|li|h[1-6])>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  const container = document.createElement('div');
  container.innerHTML = withBreaks;
  const text = container.textContent ?? '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function attachmentKindFromContentType(contentType: string): TicketAttachment['kind'] {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.includes('zip')) return 'zip';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('text/')) return 'log';
  return 'other';
}

export function mapCategory(dto: TicketCategoryApiDto | null): TicketCategory | null {
  return dto ? { id: dto.id, name: dto.name, color: dto.color, icon: dto.icon } : null;
}

export function mapPriority(dto: TicketPriorityApiDto | null): TicketPriority | null {
  return dto ? { id: dto.id, name: dto.name, color: dto.color, level: dto.level } : null;
}

export function mapTag(dto: TicketTagApiDto): TicketTag {
  return { id: dto.id, name: dto.name, color: dto.color };
}

export function mapAttachment(dto: TicketAttachmentApiDto): TicketAttachment {
  return {
    id: dto.id,
    name: dto.fileName,
    sizeKb: Math.max(1, Math.round(dto.fileSizeBytes / 1024)),
    kind: attachmentKindFromContentType(dto.contentType),
    url: dto.publicUrl,
  };
}

export function mapMessage(dto: TicketMessageApiDto): TicketMessage {
  return {
    id: dto.id,
    authorRole: roleFromApi(dto.authorRole),
    authorName: dto.authorName,
    bodyHtml: toBodyHtml(dto.body),
    attachments: dto.attachments.map(mapAttachment),
    internal: dto.isInternal,
    createdAtUtc: dto.createdOnUtc,
    deliveryState: dto.isRead ? 'seen' : dto.isDelivered ? 'delivered' : 'sent',
  };
}

export function mapSummaryToTicket(dto: TicketSummaryApiDto): Ticket {
  const status = statusFromApi(dto.status);
  return {
    id: dto.id,
    number: dto.ticketNumber,
    subject: dto.subject,
    category: mapCategory(dto.category),
    status,
    priority: mapPriority(dto.priority),
    tags: dto.tags.map(mapTag),
    customerId: dto.customerUserId,
    customerName: dto.customerName,
    customerEmail: dto.customerEmail,
    assignedAgentId: dto.assignedAgentUserId,
    assignedAgentName: dto.assignedAgentName,
    messages: [],
    timeline: [],
    createdAtUtc: dto.createdOnUtc,
    updatedAtUtc: dto.lastMessageOnUtc ?? dto.createdOnUtc,
    lastReplyAtUtc: dto.lastMessageOnUtc,
    unreadByCustomer: status === 'waiting_customer',
    unreadByAgent: status === 'waiting_agent' || status === 'open',
    ratingScore: dto.ratingScore,
  };
}

export function mapDetailToTicket(dto: TicketDetailApiDto): Ticket {
  const status = statusFromApi(dto.status);
  const lastMessage = dto.messages.at(-1);
  return {
    id: dto.id,
    number: dto.ticketNumber,
    subject: dto.subject,
    category: mapCategory(dto.category),
    status,
    priority: mapPriority(dto.priority),
    tags: dto.tags.map(mapTag),
    customerId: dto.context.customerUserId,
    customerName: dto.context.customerName,
    customerEmail: dto.context.customerEmail,
    membershipTier: dto.context.membershipPlanName,
    relatedOrderNumber: dto.context.relatedOrderNumber,
    relatedProductName: dto.context.relatedProductName,
    assignedAgentId: dto.assignedAgentUserId,
    assignedAgentName: dto.assignedAgentName,
    messages: dto.messages.map(mapMessage),
    timeline: dto.statusHistory.map((h, index) => ({
      id: `sh-${index}`,
      labelKey: 'SUPPORT.TIMELINE.STATUS_CHANGED',
      detail: h.toStatus,
      atUtc: h.createdOnUtc,
    })),
    createdAtUtc: dto.createdOnUtc,
    updatedAtUtc: lastMessage?.createdOnUtc ?? dto.createdOnUtc,
    lastReplyAtUtc: lastMessage?.createdOnUtc ?? null,
    unreadByCustomer: status === 'waiting_customer',
    unreadByAgent: status === 'waiting_agent' || status === 'open',
    ratingScore: dto.ratingScore,
    aiSummary: dto.aiSummary,
    context: {
      membershipPlanName: dto.context.membershipPlanName,
      membershipStatus: dto.context.membershipStatus,
      relatedOrderId: dto.context.relatedOrderId,
      recentOrders: dto.context.recentOrders.map((order) => ({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAtUtc: order.createdOnUtc,
        productNames: order.productNames,
        hasLicenseKeys: order.hasLicenseKeys,
      })),
      customerCountry: dto.context.customerCountry,
      customerBrowser: dto.context.customerBrowser,
      customerDevice: dto.context.customerDevice,
      recentTicketsCount: dto.context.recentTicketsCount,
    },
  };
}

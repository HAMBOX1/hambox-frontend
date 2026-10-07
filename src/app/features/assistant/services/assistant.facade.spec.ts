import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { AssistantFacade } from './assistant.facade';
import { SupportApiService } from '../../../core/support/support-api.service';
import { SupportTicketsStore } from '../../../core/support/support-tickets.store';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ProductDetails } from '../../product-details/services/product-details';
import {
  PagedResultApiDto,
  TicketDetailApiDto,
  TicketMessageApiDto,
  TicketSummaryApiDto,
} from '../../../core/support/support-api.model';

function summary(overrides: Partial<TicketSummaryApiDto> = {}): TicketSummaryApiDto {
  return {
    id: 't1',
    ticketNumber: 'TCK-20260101-AAAA1111',
    subject: "Can't redeem my key",
    status: 'Open',
    category: null,
    priority: null,
    customerUserId: 'customer-1',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    assignedAgentUserId: null,
    assignedAgentName: null,
    lastMessageOnUtc: '2026-01-02T00:00:00Z',
    lastMessageByRole: null,
    tags: [],
    ratingScore: null,
    createdOnUtc: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function pagedTickets(items: readonly TicketSummaryApiDto[]): PagedResultApiDto<TicketSummaryApiDto> {
  return {
    items,
    pageNumber: 1,
    pageSize: 100,
    totalCount: items.length,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function message(overrides: Partial<TicketMessageApiDto> = {}): TicketMessageApiDto {
  return {
    id: 'm1',
    authorUserId: 'customer-1',
    authorName: 'Jane Doe',
    authorRole: 'Customer',
    body: 'It says invalid code.',
    isInternal: false,
    isDelivered: true,
    isRead: true,
    createdOnUtc: '2026-01-01T10:00:00Z',
    attachments: [],
    ...overrides,
  };
}

function detail(overrides: Partial<TicketDetailApiDto> = {}): TicketDetailApiDto {
  return {
    id: 't1',
    ticketNumber: 'TCK-20260101-AAAA1111',
    subject: "Can't redeem my key",
    status: 'WaitingCustomer',
    category: null,
    priority: null,
    assignedAgentUserId: null,
    assignedAgentName: null,
    messages: [],
    statusHistory: [],
    tags: [],
    context: {
      customerUserId: 'customer-1',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      membershipPlanName: null,
      membershipStatus: null,
      membershipExpiresOnUtc: null,
      recentOrders: [],
      relatedOrderId: null,
      relatedOrderNumber: null,
      relatedProductName: null,
      customerCountry: null,
      customerBrowser: null,
      customerDevice: null,
      recentTicketsCount: 0,
    },
    ratingScore: null,
    ratingComment: null,
    mergedIntoTicketId: null,
    aiSummary: null,
    aiSentiment: null,
    createdOnUtc: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * The assistant's "ticket awareness" reads the same customer-scoped Support API the Account >
 * Support pages use (SupportApiService) — these tests cover the behavior layered on top of it:
 * answering from real data, never hallucinating a ticket, and never calling the API without an
 * authenticated customer. Cross-customer isolation and internal-note scoping are enforced by the
 * backend handlers themselves and covered there (HAMBOX.UnitTests/Support).
 */
describe('AssistantFacade ticket awareness', () => {
  let facade: AssistantFacade;
  let supportApi: {
    getMyTickets: ReturnType<typeof vi.fn>;
    getMyTicket: ReturnType<typeof vi.fn>;
    createTicket: ReturnType<typeof vi.fn>;
    reply: ReturnType<typeof vi.fn>;
  };
  let isCustomerAuthenticated: ReturnType<typeof signal<boolean>>;
  let messageReceived$: Subject<{ ticketId: string; message: TicketMessageApiDto }>;
  let hub: {
    messageReceived$: ReturnType<Subject<{ ticketId: string; message: TicketMessageApiDto }>['asObservable']>;
    joinTicket: ReturnType<typeof vi.fn>;
    leaveTicket: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    supportApi = {
      getMyTickets: vi.fn(),
      getMyTicket: vi.fn(),
      createTicket: vi.fn(),
      reply: vi.fn().mockReturnValue(of({})),
    };
    isCustomerAuthenticated = signal(true);
    const authSession = {
      customerUser: signal({ firstName: 'Jane' }),
      isCustomerAuthenticated,
    };
    const productDetails = { getById: vi.fn().mockRejectedValue(new Error('not needed by these tests')) };

    messageReceived$ = new Subject();
    hub = {
      messageReceived$: messageReceived$.asObservable(),
      joinTicket: vi.fn().mockResolvedValue(undefined),
      leaveTicket: vi.fn().mockResolvedValue(undefined),
    };
    const supportTicketsStore = { connectRealtime: vi.fn().mockResolvedValue(undefined), hub };

    TestBed.configureTestingModule({
      providers: [
        AssistantFacade,
        provideRouter([]),
        { provide: SupportApiService, useValue: supportApi },
        { provide: SupportTicketsStore, useValue: supportTicketsStore },
        { provide: AuthSessionService, useValue: authSession },
        { provide: ProductDetails, useValue: productDetails },
      ],
    });

    facade = TestBed.inject(AssistantFacade);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers with the customer\'s real open tickets when some exist', async () => {
    supportApi.getMyTickets.mockReturnValue(
      of(
        pagedTickets([
          summary({ id: 't1', ticketNumber: 'TCK-1', subject: "Can't redeem my key", status: 'Open' }),
          summary({ id: 't2', ticketNumber: 'TCK-2', subject: 'Billing question', status: 'Resolved' }),
        ]),
      ),
    );

    facade.send('What are my open tickets?');
    await vi.runAllTimersAsync();

    expect(supportApi.getMyTickets).toHaveBeenCalled();
    const last = facade.messages().at(-1)!;
    expect(last.role).toBe('ai');
    expect(last.content).toContain('TCK-1');
    expect(last.content).not.toContain('TCK-2');
  });

  it('tells the customer they have no tickets instead of inventing one', async () => {
    supportApi.getMyTickets.mockReturnValue(of(pagedTickets([])));

    facade.send('Do I have any support tickets?');
    await vi.runAllTimersAsync();

    const last = facade.messages().at(-1)!;
    expect(last.content.toLowerCase()).toContain("don't have any support tickets");
    expect(last.content).not.toMatch(/TCK-|#\d/);
  });

  it('never fetches ticket data when no customer is authenticated', async () => {
    isCustomerAuthenticated.set(false);

    facade.send('What are my tickets?');
    await vi.runAllTimersAsync();

    expect(supportApi.getMyTickets).not.toHaveBeenCalled();
    const last = facade.messages().at(-1)!;
    expect(last.content.toLowerCase()).toContain('sign in');
  });

  it("answers a status question using the customer's real ticket, not a canned reply", async () => {
    supportApi.getMyTickets.mockReturnValue(
      of(pagedTickets([summary({ id: 't1', ticketNumber: 'TCK-1', status: 'WaitingAgent' })])),
    );
    supportApi.getMyTicket.mockReturnValue(
      of(detail({ id: 't1', ticketNumber: 'TCK-1', status: 'WaitingAgent' })),
    );

    facade.send("What's the status of my ticket?");
    await vi.runAllTimersAsync();

    const last = facade.messages().at(-1)!;
    expect(last.content).toContain('TCK-1');
    expect(last.content).toContain('Waiting on agent');
  });

  it('quotes the real latest support reply rather than fabricating one, scoped to that ticket', async () => {
    supportApi.getMyTickets.mockReturnValue(
      of(pagedTickets([summary({ id: 't1', ticketNumber: 'TCK-1', status: 'WaitingCustomer' })])),
    );
    supportApi.getMyTicket.mockReturnValue(
      of(
        detail({
          id: 't1',
          ticketNumber: 'TCK-1',
          status: 'WaitingCustomer',
          messages: [
            message({ id: 'm1', authorRole: 'Customer', body: 'It says invalid code.' }),
            message({
              id: 'm2',
              authorUserId: 'agent-1',
              authorName: 'Sam Agent',
              authorRole: 'Agent',
              body: 'Please try again, we refreshed the code.',
              createdOnUtc: '2026-01-01T11:00:00Z',
            }),
          ],
        }),
      ),
    );

    facade.send('What did support reply?');
    await vi.runAllTimersAsync();

    expect(supportApi.getMyTicket).toHaveBeenCalledWith('t1');
    const last = facade.messages().at(-1)!;
    expect(last.content).toContain('Please try again, we refreshed the code.');
  });

  it('asks for a description, then opens a real ticket from the next message', async () => {
    supportApi.createTicket.mockReturnValue(
      of(detail({ id: 'new-1', ticketNumber: 'TCK-NEW-1', subject: "It says invalid code" })),
    );

    facade.send('I want to open a new ticket');
    await vi.runAllTimersAsync();

    let last = facade.messages().at(-1)!;
    expect(last.role).toBe('ai');
    expect(last.content.toLowerCase()).toContain('describe');
    expect(supportApi.createTicket).not.toHaveBeenCalled();

    facade.send("It says invalid code when I try to redeem my key");
    await vi.runAllTimersAsync();

    expect(supportApi.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ body: "It says invalid code when I try to redeem my key" }),
    );
    last = facade.messages().at(-1)!;
    expect(last.content).toContain('TCK-NEW-1');
  });

  it('treats "open MY ticket" as a lookup, not a creation request', async () => {
    supportApi.getMyTickets.mockReturnValue(
      of(pagedTickets([summary({ id: 't1', ticketNumber: 'TCK-1', status: 'Open' })])),
    );

    facade.send('open my ticket');
    await vi.runAllTimersAsync();

    expect(supportApi.createTicket).not.toHaveBeenCalled();
    expect(supportApi.getMyTickets).toHaveBeenCalled();
  });

  it('lets the customer back out of ticket creation instead of filing a junk ticket', async () => {
    facade.createTicket();

    facade.send('never mind');
    await vi.runAllTimersAsync();

    expect(supportApi.createTicket).not.toHaveBeenCalled();
    const last = facade.messages().at(-1)!;
    expect(last.content.toLowerCase()).toContain('no problem');
  });

  it('never creates a ticket when no customer is authenticated', async () => {
    isCustomerAuthenticated.set(false);
    facade.createTicket();

    facade.send("My key won't activate");
    await vi.runAllTimersAsync();

    expect(supportApi.createTicket).not.toHaveBeenCalled();
    const last = facade.messages().at(-1)!;
    expect(last.content.toLowerCase()).toContain('sign in');
  });

  it("enters a live ticket chat with the ticket's real messages and joins its realtime room", async () => {
    supportApi.getMyTicket.mockReturnValue(
      of(
        detail({
          id: 't1',
          ticketNumber: 'TCK-1',
          subject: "Can't redeem my key",
          messages: [
            message({ id: 'm1', authorRole: 'Customer', body: 'It says invalid code.' }),
            message({
              id: 'm2',
              authorUserId: 'agent-1',
              authorName: 'Sam Agent',
              authorRole: 'Agent',
              body: 'Try this fix.',
            }),
          ],
        }),
      ),
    );

    await facade.enterTicketChat('t1');

    expect(facade.activeTicket()?.subject).toBe("Can't redeem my key");
    expect(hub.joinTicket).toHaveBeenCalledWith('t1');
    const messages = facade.messages();
    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('agent');
    expect(messages[1].authorName).toBe('Sam Agent');
  });

  it('sends chat replies through the real ticket endpoint instead of the canned flows', async () => {
    supportApi.getMyTicket.mockReturnValue(of(detail({ id: 't1', ticketNumber: 'TCK-1' })));
    await facade.enterTicketChat('t1');

    facade.send('Still not working, can you check again?');
    await vi.runAllTimersAsync();

    expect(supportApi.reply).toHaveBeenCalledWith('t1', {
      body: 'Still not working, can you check again?',
      attachmentIds: null,
    });
    const last = facade.messages().at(-1)!;
    expect(last.role).toBe('user');
    expect(last.content).toBe('Still not working, can you check again?');
  });

  it('shows a real-time agent reply with their name and flags the floating icon while closed', async () => {
    supportApi.getMyTicket.mockReturnValue(of(detail({ id: 't1', ticketNumber: 'TCK-1' })));
    await facade.enterTicketChat('t1');
    facade.close();

    messageReceived$.next({
      ticketId: 't1',
      message: message({
        id: 'm-live',
        authorUserId: 'agent-1',
        authorName: 'Sam Agent',
        authorRole: 'Agent',
        body: 'Here is an update.',
      }),
    });

    const last = facade.messages().at(-1)!;
    expect(last.role).toBe('agent');
    expect(last.authorName).toBe('Sam Agent');
    expect(last.content).toBe('Here is an update.');
    expect(facade.hasUnreadTicketReply()).toBe(true);
  });

  it('clears the unread badge once the panel is reopened', async () => {
    supportApi.getMyTicket.mockReturnValue(of(detail({ id: 't1', ticketNumber: 'TCK-1' })));
    await facade.enterTicketChat('t1');
    facade.close();
    messageReceived$.next({
      ticketId: 't1',
      message: message({ authorRole: 'Agent', authorName: 'Sam Agent' }),
    });
    expect(facade.hasUnreadTicketReply()).toBe(true);

    facade.open();

    expect(facade.hasUnreadTicketReply()).toBe(false);
  });

  it('ignores its own message echoing back over the realtime channel', async () => {
    supportApi.getMyTicket.mockReturnValue(of(detail({ id: 't1', ticketNumber: 'TCK-1' })));
    await facade.enterTicketChat('t1');

    facade.send('My own message');
    await vi.runAllTimersAsync();
    const countAfterSend = facade.messages().length;

    messageReceived$.next({
      ticketId: 't1',
      message: message({ authorRole: 'Customer', body: 'My own message' }),
    });

    expect(facade.messages().length).toBe(countAfterSend);
  });

  it('leaves the ticket room and returns to normal assistant mode on exit', async () => {
    supportApi.getMyTicket.mockReturnValue(of(detail({ id: 't1', ticketNumber: 'TCK-1' })));
    await facade.enterTicketChat('t1');

    facade.exitTicketChat();

    expect(hub.leaveTicket).toHaveBeenCalledWith('t1');
    expect(facade.activeTicket()).toBeNull();
    expect(facade.messages()).toHaveLength(0);
  });
});

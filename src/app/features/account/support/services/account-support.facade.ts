import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AUTH_CONTEXT } from '../../../../core/auth/auth-context';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { SupportApiService } from '../../../../core/support/support-api.service';
import { SupportHubConnectionState } from '../../../../core/support/support-hub.service';
import { SupportTicketsStore } from '../../../../core/support/support-tickets.store';
import { htmlToPlainText, mapDetailToTicket, mapMessage, mapSummaryToTicket } from '../../../../core/support/support-mapper';
import { CreateTicketInput, Ticket, TicketMessage } from '../../../../core/support/support.model';

const TYPING_IDLE_MS = 4_000;

/** Account-side facade: the signed-in customer's own tickets, backed by the real Support API +
 * SignalR. Internal agent notes never reach this facade — the customer endpoints filter them
 * server-side. */
@Injectable({ providedIn: 'root' })
export class AccountSupportFacade {
  private readonly api = inject(SupportApiService);
  private readonly store = inject(SupportTicketsStore);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ticketsState = signal<readonly Ticket[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  private readonly currentTicketState = signal<Ticket | null>(null);
  private readonly currentTicketLoadingState = signal(false);
  private readonly agentTypingState = signal(false);
  private typingClearTimer: ReturnType<typeof setTimeout> | undefined;

  private realtimeWired = false;

  readonly displayName = computed(() => {
    const user = this.authSession.customerUser();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });

  readonly myTickets = this.ticketsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly openTickets = computed(() =>
    this.myTickets().filter((t) => t.status !== 'resolved' && t.status !== 'closed'),
  );
  readonly closedTickets = computed(() =>
    this.myTickets().filter((t) => t.status === 'resolved' || t.status === 'closed'),
  );
  readonly waitingForReplyCount = computed(() => this.myTickets().filter((t) => t.status === 'waiting_customer').length);
  readonly resolvedCount = computed(() => this.myTickets().filter((t) => t.status === 'resolved' || t.status === 'closed').length);

  readonly currentTicket = this.currentTicketState.asReadonly();
  readonly currentTicketLoading = this.currentTicketLoadingState.asReadonly();
  readonly agentTyping = this.agentTypingState.asReadonly();
  readonly connectionState: () => SupportHubConnectionState;

  constructor() {
    this.connectionState = toSignal(this.store.hub.connectionState$, { initialValue: this.store.hub.connectionState });
    void this.ensureRealtime();
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const page = await firstValueFrom(this.api.getMyTickets({ page: 1, pageSize: 100 }));
      this.ticketsState.set(page.items.map(mapSummaryToTicket));
    } catch {
      this.errorState.set('SUPPORT.ERRORS.LOAD_FAILED');
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadTicket(id: string): Promise<void> {
    this.currentTicketLoadingState.set(true);
    try {
      const dto = await firstValueFrom(this.api.getMyTicket(id));
      const ticket = mapDetailToTicket(dto);
      this.currentTicketState.set(ticket);
      await this.store.hub.joinTicket(id);
    } catch {
      this.currentTicketState.set(null);
    } finally {
      this.currentTicketLoadingState.set(false);
    }
  }

  leaveTicket(id: string): void {
    void this.store.hub.leaveTicket(id);
  }

  getVisibleMessages(): readonly TicketMessage[] {
    return this.currentTicketState()?.messages ?? [];
  }

  async createTicket(input: CreateTicketInput): Promise<string> {
    const dto = await firstValueFrom(
      this.api.createTicket({
        subject: input.subject,
        body: htmlToPlainText(input.descriptionHtml),
        categoryId: input.categoryId,
        priorityId: input.priorityId,
        relatedOrderId: null,
        relatedProductId: null,
        customerCountry: null,
        customerBrowser: navigator.userAgent,
        customerDevice: null,
      }),
    );
    return dto.id;
  }

  async reply(ticketId: string, bodyHtml: string): Promise<void> {
    const plainText = htmlToPlainText(bodyHtml);
    const message = await firstValueFrom(this.api.reply(ticketId, { body: plainText, attachmentIds: null }));
    this.appendMessageToCurrent(ticketId, mapMessage(message));
  }

  async uploadAttachment(ticketId: string, file: File): Promise<string> {
    const dto = await firstValueFrom(this.api.uploadAttachment(ticketId, file));
    return dto.id;
  }

  async close(ticketId: string): Promise<void> {
    await firstValueFrom(this.api.closeTicket(ticketId));
    await this.loadTicket(ticketId);
  }

  async reopen(ticketId: string): Promise<void> {
    await firstValueFrom(this.api.reopenTicket(ticketId));
    await this.loadTicket(ticketId);
  }

  async rate(ticketId: string, score: number, comment: string | null): Promise<void> {
    await firstValueFrom(this.api.rateTicket(ticketId, score, comment));
    await this.loadTicket(ticketId);
  }

  markRead(ticketId: string): void {
    const ticket = this.currentTicketState();
    if (!ticket || ticket.id !== ticketId) {
      return;
    }
    for (const message of ticket.messages) {
      if (message.authorRole === 'agent' && message.deliveryState !== 'seen') {
        void this.store.hub.markMessageRead(ticketId, message.id);
      }
    }
  }

  notifyTyping(ticketId: string): void {
    void this.store.hub.typing(ticketId);
  }

  notifyStopTyping(ticketId: string): void {
    void this.store.hub.stopTyping(ticketId);
  }

  private appendMessageToCurrent(ticketId: string, message: TicketMessage): void {
    this.currentTicketState.update((ticket) => {
      if (!ticket || ticket.id !== ticketId) {
        return ticket;
      }
      // The sender's own connection is a member of the ticket group too, so the SignalR
      // broadcast can arrive on top of the message already appended from the REST response —
      // dedupe by id rather than assume exactly one delivery path per message.
      if (ticket.messages.some((m) => m.id === message.id)) {
        return ticket;
      }
      return { ...ticket, messages: [...ticket.messages, message] };
    });
  }

  private async ensureRealtime(): Promise<void> {
    if (this.realtimeWired) {
      return;
    }
    this.realtimeWired = true;

    await this.store.connectRealtime(AUTH_CONTEXT.Customer);

    const messageSub = this.store.hub.messageReceived$.subscribe(({ ticketId, message }) => {
      if (message.isInternal) {
        return;
      }
      this.appendMessageToCurrent(ticketId, mapMessage(message));
    });
    const updatedSub = this.store.hub.ticketUpdated$.subscribe(({ ticketId }) => {
      if (this.currentTicketState()?.id === ticketId) {
        void this.loadTicket(ticketId);
      }
      void this.load();
    });
    const typingSub = this.store.hub.typingIndicator$.subscribe(({ ticketId, isTyping }) => {
      if (this.currentTicketState()?.id !== ticketId) {
        return;
      }
      clearTimeout(this.typingClearTimer);
      this.agentTypingState.set(isTyping);
      if (isTyping) {
        this.typingClearTimer = setTimeout(() => this.agentTypingState.set(false), TYPING_IDLE_MS);
      }
    });

    this.destroyRef.onDestroy(() => {
      messageSub.unsubscribe();
      updatedSub.unsubscribe();
      typingSub.unsubscribe();
      clearTimeout(this.typingClearTimer);
    });
  }
}

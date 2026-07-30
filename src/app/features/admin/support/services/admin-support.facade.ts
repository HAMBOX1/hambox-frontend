import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AUTH_CONTEXT } from '../../../../core/auth/auth-context';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { SupportStatisticsApiDto } from '../../../../core/support/support-api.model';
import { SupportApiService, TicketListParams } from '../../../../core/support/support-api.service';
import { SupportHubConnectionState } from '../../../../core/support/support-hub.service';
import { SupportTicketsStore } from '../../../../core/support/support-tickets.store';
import { htmlToPlainText, mapDetailToTicket, mapMessage, mapSummaryToTicket } from '../../../../core/support/support-mapper';
import { statusToApi, Ticket, TicketMessage, TicketStatus } from '../../../../core/support/support.model';

const TYPING_IDLE_MS = 4_000;

/** Admin-side facade: every ticket, both public replies and internal notes, backed by the real
 * Support API + SignalR. */
@Injectable({ providedIn: 'root' })
export class AdminSupportFacade {
  private readonly api = inject(SupportApiService);
  private readonly store = inject(SupportTicketsStore);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ticketsState = signal<readonly Ticket[]>([]);
  private readonly totalCountState = signal(0);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private lastParams: TicketListParams = { page: 1, pageSize: 50 };

  private readonly currentTicketState = signal<Ticket | null>(null);
  private readonly currentTicketLoadingState = signal(false);

  private readonly statisticsState = signal<SupportStatisticsApiDto | null>(null);
  private readonly statisticsLoadingState = signal(false);

  private readonly customerTypingState = signal(false);
  private typingClearTimer: ReturnType<typeof setTimeout> | undefined;

  private realtimeWired = false;

  readonly tickets = this.ticketsState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly currentTicket = this.currentTicketState.asReadonly();
  readonly currentTicketLoading = this.currentTicketLoadingState.asReadonly();

  readonly statistics = this.statisticsState.asReadonly();
  readonly statisticsLoading = this.statisticsLoadingState.asReadonly();

  readonly currentAgentId = computed(() => this.authSession.adminUser()?.id ?? null);
  readonly currentAgentName = computed(() => {
    const user = this.authSession.adminUser();
    return user ? `${user.firstName} ${user.lastName}`.trim() : null;
  });

  readonly customerTyping = this.customerTypingState.asReadonly();
  readonly connectionState: () => SupportHubConnectionState;

  constructor() {
    this.connectionState = toSignal(this.store.hub.connectionState$, { initialValue: this.store.hub.connectionState });
    void this.ensureRealtime();
  }

  async load(params: TicketListParams = {}): Promise<void> {
    this.lastParams = { page: 1, pageSize: 50, ...params };
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const page = await firstValueFrom(this.api.getTickets(this.lastParams));
      this.ticketsState.set(page.items.map(mapSummaryToTicket));
      this.totalCountState.set(page.totalCount);
    } catch {
      this.errorState.set('SUPPORT.ERRORS.LOAD_FAILED');
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadTicket(id: string): Promise<void> {
    this.currentTicketLoadingState.set(true);
    try {
      const dto = await firstValueFrom(this.api.getTicket(id));
      this.currentTicketState.set(mapDetailToTicket(dto));
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

  async reply(ticketId: string, bodyHtml: string, internal: boolean): Promise<void> {
    const plainText = htmlToPlainText(bodyHtml);
    const message = await firstValueFrom(
      this.api.replyAsAgent(ticketId, { body: plainText, isInternal: internal, attachmentIds: null, savedReplyId: null }),
    );
    this.appendMessageToCurrent(ticketId, mapMessage(message));
  }

  async uploadAttachment(ticketId: string, file: File): Promise<string> {
    const dto = await firstValueFrom(this.api.uploadAttachmentAsAgent(ticketId, file));
    return dto.id;
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<void> {
    await firstValueFrom(this.api.changeStatus(ticketId, statusToApi(status)));
    await this.refreshAfterMutation(ticketId);
  }

  async updatePriority(ticketId: string, priorityId: string | null): Promise<void> {
    await firstValueFrom(this.api.changePriority(ticketId, priorityId));
    await this.refreshAfterMutation(ticketId);
  }

  async assignToMe(ticketId: string): Promise<void> {
    const agentId = this.currentAgentId();
    if (!agentId) {
      return;
    }
    await this.assign(ticketId, agentId);
  }

  async assign(ticketId: string, agentUserId: string): Promise<void> {
    await firstValueFrom(this.api.assignTicket(ticketId, agentUserId));
    await this.refreshAfterMutation(ticketId);
  }

  async closeTicket(ticketId: string): Promise<void> {
    await firstValueFrom(this.api.closeTicketAsAgent(ticketId));
    await this.refreshAfterMutation(ticketId);
  }

  async reopenTicket(ticketId: string): Promise<void> {
    await firstValueFrom(this.api.reopenTicketAsAgent(ticketId));
    await this.refreshAfterMutation(ticketId);
  }

  async mergeInto(sourceTicketId: string, targetTicketId: string): Promise<void> {
    await firstValueFrom(this.api.mergeTicket(sourceTicketId, targetTicketId));
    await this.refreshAfterMutation(sourceTicketId);
  }

  async deleteTicket(ticketId: string): Promise<void> {
    await firstValueFrom(this.api.deleteTicket(ticketId));
    await this.load(this.lastParams);
  }

  async addTag(ticketId: string, tagId: string): Promise<void> {
    await firstValueFrom(this.api.addTag(ticketId, tagId));
    await this.refreshAfterMutation(ticketId);
  }

  async removeTag(ticketId: string, tagId: string): Promise<void> {
    await firstValueFrom(this.api.removeTag(ticketId, tagId));
    await this.refreshAfterMutation(ticketId);
  }

  markRead(ticketId: string): void {
    const ticket = this.currentTicketState();
    if (!ticket || ticket.id !== ticketId) {
      return;
    }
    for (const message of ticket.messages) {
      if (message.authorRole === 'customer' && message.deliveryState !== 'seen') {
        void this.store.hub.markMessageRead(ticketId, message.id);
      }
    }
  }

  getVisibleMessages(): readonly TicketMessage[] {
    return this.currentTicketState()?.messages ?? [];
  }

  notifyTyping(ticketId: string): void {
    void this.store.hub.typing(ticketId);
  }

  notifyStopTyping(ticketId: string): void {
    void this.store.hub.stopTyping(ticketId);
  }

  async loadStatistics(): Promise<void> {
    this.statisticsLoadingState.set(true);
    try {
      this.statisticsState.set(await firstValueFrom(this.api.getStatistics()));
    } finally {
      this.statisticsLoadingState.set(false);
    }
  }

  private async refreshAfterMutation(ticketId: string): Promise<void> {
    await this.loadTicket(ticketId);
    await this.load(this.lastParams);
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

    await this.store.connectRealtime(AUTH_CONTEXT.Admin);

    const messageSub = this.store.hub.messageReceived$.subscribe(({ ticketId, message }) => {
      this.appendMessageToCurrent(ticketId, mapMessage(message));
    });
    const updatedSub = this.store.hub.ticketUpdated$.subscribe(({ ticketId }) => {
      if (this.currentTicketState()?.id === ticketId) {
        void this.loadTicket(ticketId);
      }
      void this.load(this.lastParams);
    });
    const createdSub = this.store.hub.ticketCreated$.subscribe(() => {
      void this.load(this.lastParams);
    });
    const typingSub = this.store.hub.typingIndicator$.subscribe(({ ticketId, isTyping }) => {
      if (this.currentTicketState()?.id !== ticketId) {
        return;
      }
      clearTimeout(this.typingClearTimer);
      this.customerTypingState.set(isTyping);
      if (isTyping) {
        this.typingClearTimer = setTimeout(() => this.customerTypingState.set(false), TYPING_IDLE_MS);
      }
    });

    this.destroyRef.onDestroy(() => {
      messageSub.unsubscribe();
      updatedSub.unsubscribe();
      createdSub.unsubscribe();
      typingSub.unsubscribe();
      clearTimeout(this.typingClearTimer);
    });
  }
}

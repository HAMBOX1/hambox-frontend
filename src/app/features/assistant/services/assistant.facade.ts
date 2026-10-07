import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';

import {
  AssistantMessage,
  FlowKey,
  HistoryGroup,
  HistoryItem,
  MessageRole,
  QuickAction,
} from '../models/assistant.models';
import { FLOWS, SEED_HISTORY } from '../data/assistant-flows.data';
import { AUTH_CONTEXT } from '../../../core/auth/auth-context';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ProductDetails } from '../../product-details/services/product-details';
import { SupportApiService } from '../../../core/support/support-api.service';
import { SupportTicketsStore } from '../../../core/support/support-tickets.store';
import { TicketMessageApiDto } from '../../../core/support/support-api.model';
import {
  htmlToPlainText,
  mapDetailToTicket,
  mapMessage,
  mapSummaryToTicket,
} from '../../../core/support/support-mapper';
import { OPEN_TICKET_STATUSES, Ticket, TicketMessage, TicketStatus } from '../../../core/support/support.model';

const HISTORY_GROUP_ORDER: readonly HistoryGroup[] = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last Month',
];
const PRODUCT_ROUTE = /^\/products\/([^/?#]+)/;
const SUGGESTION_DELAY_MS = 15000;
const THINKING_DELAY_MS = 650;
const STREAM_MIN_MS = 14;
const STREAM_JITTER_MS = 22;

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function timeNow(): string {
  return formatClockTime(new Date());
}

/** Short, best-effort "message received" chime via the Web Audio API — no asset file to ship,
 * and a silent no-op wherever AudioContext is unavailable or blocked (e.g. autoplay policy). */
function playNotificationSound(): void {
  try {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1175, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Non-critical affordance — the unread badge is the primary signal.
  }
}

function toAssistantMessageFromTicketMessage(message: TicketMessage): AssistantMessage {
  const role: MessageRole =
    message.authorRole === 'agent' ? 'agent' : message.authorRole === 'customer' ? 'user' : 'ai';
  return {
    id: message.id,
    role,
    content: htmlToPlainText(message.bodyHtml),
    time: formatClockTime(new Date(message.createdAtUtc)),
    authorName: role === 'agent' ? message.authorName : undefined,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  waiting_customer: 'Waiting on you',
  waiting_agent: 'Waiting on agent',
  resolved: 'Resolved',
  closed: 'Closed',
};

function deriveTicketSubject(description: string): string {
  const oneLine = description.replace(/\s+/g, ' ').trim();
  return oneLine.length <= 80 ? oneLine : `${oneLine.slice(0, 77).trimEnd()}…`;
}

function summarizeTicket(ticket: Ticket): string {
  const priority = ticket.priority ? ` · ${ticket.priority.name} priority` : '';
  return (
    `**${ticket.number}** — ${ticket.subject}\n` +
    `Status: ${TICKET_STATUS_LABELS[ticket.status]}${priority}\n` +
    `Updated: ${formatDate(ticket.updatedAtUtc)}`
  );
}

@Injectable({ providedIn: 'root' })
export class AssistantFacade {
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);
  private readonly productDetails = inject(ProductDetails);
  private readonly supportApi = inject(SupportApiService);
  private readonly supportTickets = inject(SupportTicketsStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly openState = signal(false);
  private readonly collapsedState = signal(false);
  private readonly historyOpenState = signal(false);
  private readonly historySearchState = signal('');
  private readonly messagesState = signal<AssistantMessage[]>([]);
  private readonly streamingMessageState = signal<AssistantMessage | null>(null);
  private readonly thinkingState = signal(false);
  private readonly errorShownState = signal(false);
  private readonly historyState = signal<HistoryItem[]>([...SEED_HISTORY]);
  private readonly historyLoadingState = signal(false);
  private readonly contextProductIdState = signal<string | null>(null);
  private readonly contextProductNameState = signal<string | null>(null);
  private readonly contextDismissedState = signal(false);
  private readonly hasNewSuggestionState = signal(false);
  private readonly awaitingTicketDescriptionState = signal(false);
  private readonly activeTicketState = signal<Ticket | null>(null);
  private readonly activeTicketLoadingState = signal(false);
  private readonly hasUnreadTicketReplyState = signal(false);
  private readonly lastDescribedTicketIdState = signal<string | null>(null);

  private readonly shownSuggestionProductIds = new Set<string>();
  private suggestionTimer?: ReturnType<typeof setTimeout>;
  private historyLoadTimer?: ReturnType<typeof setTimeout>;

  readonly isOpen = this.openState.asReadonly();
  readonly isCollapsed = this.collapsedState.asReadonly();
  readonly isHistoryOpen = this.historyOpenState.asReadonly();
  readonly historySearch = this.historySearchState.asReadonly();
  readonly messages = this.messagesState.asReadonly();
  readonly streamingMessage = this.streamingMessageState.asReadonly();
  readonly isThinking = this.thinkingState.asReadonly();
  readonly historyLoading = this.historyLoadingState.asReadonly();
  readonly hasNewSuggestion = this.hasNewSuggestionState.asReadonly();
  readonly activeTicket = this.activeTicketState.asReadonly();
  readonly activeTicketLoading = this.activeTicketLoadingState.asReadonly();
  readonly hasUnreadTicketReply = this.hasUnreadTicketReplyState.asReadonly();
  readonly lastDescribedTicketId = this.lastDescribedTicketIdState.asReadonly();

  readonly greetingName = computed(() => this.authSession.customerUser()?.firstName ?? 'there');
  readonly userInitial = computed(() =>
    (this.authSession.customerUser()?.firstName?.[0] ?? 'U').toUpperCase(),
  );
  readonly contextProductId = this.contextProductIdState.asReadonly();
  readonly contextProductName = this.contextProductNameState.asReadonly();
  readonly showContextBanner = computed(
    () => this.contextProductNameState() !== null && !this.contextDismissedState(),
  );

  readonly historyGroups = computed(() => {
    const query = this.historySearchState().trim().toLowerCase();
    const filtered = this.historyState().filter((item) => item.title.toLowerCase().includes(query));
    return HISTORY_GROUP_ORDER.map((group) => ({
      group,
      items: filtered.filter((item) => item.group === group),
    })).filter((entry) => entry.items.length > 0);
  });
  readonly hasHistoryResults = computed(() => this.historyGroups().length > 0);

  constructor() {
    this.syncRouteContext(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.syncRouteContext(event.urlAfterRedirects));

    // Subscribing is harmless before connectRealtime() has ever run (no-op Subject) — the actual
    // SignalR connection only opens once the customer selects a ticket to chat in, so every
    // other visitor never pays for a websocket they never asked for.
    this.supportTickets.hub.messageReceived$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ ticketId, message }) => this.handleIncomingTicketMessage(ticketId, message));
  }

  open(): void {
    this.openState.set(true);
    this.hasNewSuggestionState.set(false);
    this.hasUnreadTicketReplyState.set(false);
    this.clearSuggestionTimer();
  }

  close(): void {
    this.openState.set(false);
    this.collapsedState.set(false);
  }

  toggleCollapse(): void {
    this.collapsedState.update((value) => !value);
  }

  startNewConversation(): void {
    void this.leaveActiveTicketRoom();
    this.activeTicketState.set(null);
    this.hasUnreadTicketReplyState.set(false);
    this.awaitingTicketDescriptionState.set(false);
    this.messagesState.set([]);
    this.streamingMessageState.set(null);
    this.thinkingState.set(false);
    this.errorShownState.set(false);
  }

  /** Leaves the current live ticket chat (if any) and returns to the normal assistant. */
  exitTicketChat(): void {
    this.startNewConversation();
  }

  /** Enters a live, real-time chat with support for one of the customer's own tickets — the
   * floating widget becomes that ticket's chat window until exitTicketChat()/startNewConversation(). */
  async enterTicketChat(ticketId: string): Promise<void> {
    if (this.activeTicketState()?.id === ticketId) {
      return;
    }

    await this.leaveActiveTicketRoom();
    this.awaitingTicketDescriptionState.set(false);
    this.hasUnreadTicketReplyState.set(false);
    this.messagesState.set([]);
    this.streamingMessageState.set(null);
    this.activeTicketLoadingState.set(true);

    try {
      await this.supportTickets.connectRealtime(AUTH_CONTEXT.Customer);
      const detailDto = await firstValueFrom(this.supportApi.getMyTicket(ticketId));
      const ticket = mapDetailToTicket(detailDto);
      this.activeTicketState.set(ticket);
      this.messagesState.set(ticket.messages.map(toAssistantMessageFromTicketMessage));
      await this.supportTickets.hub.joinTicket(ticketId);
    } catch {
      this.activeTicketState.set(null);
      this.pushAiMessage("I couldn't open that ticket right now — please try again in a moment.");
    } finally {
      this.activeTicketLoadingState.set(false);
    }
  }

  dismissContext(): void {
    this.contextDismissedState.set(true);
  }

  send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    if (this.activeTicketState()) {
      void this.replyInActiveTicket(trimmed);
      return;
    }

    if (this.awaitingTicketDescriptionState()) {
      void this.submitTicketFromDescription(trimmed);
      return;
    }

    const flow = this.matchFlow(trimmed);
    if (flow === 'createTicket') {
      this.pushUserMessage(trimmed);
      this.startTicketCreation();
      return;
    }
    if (flow === 'tickets') {
      void this.runTicketsFlow(trimmed);
      return;
    }
    this.runFlow(flow, trimmed);
  }

  selectSuggestion(flow: FlowKey): void {
    this.runFlow(flow);
  }

  regenerate(messageId: string): void {
    if (this.errorShownState()) {
      return;
    }
    this.errorShownState.set(true);
    this.messagesState.update((messages) =>
      messages.map((message) => (message.id === messageId ? { ...message, error: true } : message)),
    );
  }

  retry(messageId: string): void {
    const message = this.messagesState().find((item) => item.id === messageId);
    const note = message?.flow ? FLOWS[message.flow].retryNote : 'Here is that again.';
    this.messagesState.update((messages) =>
      messages.map((item) =>
        item.id === messageId
          ? { ...item, error: false, content: `${item.content}\n\n${note}` }
          : item,
      ),
    );
  }

  toggleLike(messageId: string): void {
    this.messagesState.update((messages) =>
      messages.map((message) =>
        message.id === messageId ? { ...message, liked: !message.liked, disliked: false } : message,
      ),
    );
  }

  toggleDislike(messageId: string): void {
    this.messagesState.update((messages) =>
      messages.map((message) =>
        message.id === messageId
          ? { ...message, disliked: !message.disliked, liked: false }
          : message,
      ),
    );
  }

  createTicket(): void {
    this.startTicketCreation();
  }

  openHistory(): void {
    this.historyOpenState.set(true);
    this.historySearchState.set('');
  }

  closeHistory(): void {
    this.historyOpenState.set(false);
  }

  setHistorySearch(query: string): void {
    this.historySearchState.set(query);
  }

  pinHistoryItem(id: string): void {
    this.historyState.update((items) =>
      items.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)),
    );
  }

  deleteHistoryItem(id: string): void {
    this.historyState.update((items) => items.filter((item) => item.id !== id));
  }

  renameHistoryItem(id: string, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    this.historyState.update((items) =>
      items.map((item) => (item.id === id ? { ...item, title: trimmed } : item)),
    );
  }

  loadHistoryConversation(id: string): void {
    const entry = this.historyState().find((item) => item.id === id);
    if (!entry) {
      return;
    }
    this.closeHistory();
    this.messagesState.set([]);
    this.streamingMessageState.set(null);
    this.thinkingState.set(false);
    this.historyLoadingState.set(true);
    if (this.historyLoadTimer) {
      clearTimeout(this.historyLoadTimer);
    }
    this.historyLoadTimer = setTimeout(() => {
      const flow = FLOWS[entry.flow];
      this.messagesState.set([
        { id: crypto.randomUUID(), role: 'user', content: flow.userText, time: timeNow() },
        {
          id: crypto.randomUUID(),
          role: 'ai',
          content: flow.reply,
          time: timeNow(),
          flow: entry.flow,
          cards: flow.cards,
          actions: flow.actions,
        },
      ]);
      this.historyLoadingState.set(false);
    }, 700);
  }

  private matchFlow(text: string): FlowKey {
    const value = text.toLowerCase();
    // "open/create/file/raise a (new) ticket" is a creation request; "open MY/THIS/THE ticket"
    // means look one up instead — the possessive/demonstrative is what disambiguates the two.
    const mentionsTicket = /\bticket/.test(value);
    const creationVerb = /\b(open|create|start|file|submit|raise)\b/.test(value);
    const referencesExisting = /\b(my|this|that|the)\b.{0,10}\bticket/.test(value);
    if (mentionsTicket && creationVerb && !referencesExisting) return 'createTicket';
    if (mentionsTicket || /support.*(repl|respond|answer|said)/.test(value)) return 'tickets';
    if (/product|game|steam|gift card|buy/.test(value)) return 'find';
    if (/order|track|deliver/.test(value)) return 'track';
    if (/member|plan|compare|upgrade/.test(value)) return 'compare';
    if (/activat|key|redeem|license/.test(value)) return 'activate';
    if (/refund|return|policy/.test(value)) return 'refund';
    if (/support|ticket|help|contact/.test(value)) return 'support';
    return 'find';
  }

  private runFlow(key: FlowKey, userText?: string): void {
    const flow = FLOWS[key];
    this.pushUserMessage(userText ?? flow.userText);
    this.thinkingState.set(true);
    setTimeout(() => {
      this.thinkingState.set(false);
      this.streamMessage(
        flow.reply,
        key,
        {
          cards: flow.followup ? undefined : flow.cards,
          actions: flow.followup ? undefined : flow.actions,
        },
        () => {
          if (!flow.followup) {
            return;
          }
          this.thinkingState.set(true);
          setTimeout(() => {
            this.thinkingState.set(false);
            this.streamMessage(flow.followup!, key, { actions: flow.actions });
          }, THINKING_DELAY_MS);
        },
      );
    }, THINKING_DELAY_MS);
  }

  private async runTicketsFlow(userText: string): Promise<void> {
    this.pushUserMessage(userText);

    if (!this.authSession.isCustomerAuthenticated()) {
      this.pushAiMessage('Please sign in to view your support tickets.');
      return;
    }

    this.thinkingState.set(true);
    try {
      const page = await firstValueFrom(this.supportApi.getMyTickets({ page: 1, pageSize: 100 }));
      const tickets = page.items.map(mapSummaryToTicket);
      const reply = await this.buildTicketsReply(tickets, userText);
      this.thinkingState.set(false);
      this.streamMessage(reply.content, 'tickets', { actions: reply.actions });
    } catch {
      this.thinkingState.set(false);
      this.pushAiMessage("I couldn't load your support tickets right now — please try again in a moment.");
    }
  }

  private async buildTicketsReply(
    tickets: readonly Ticket[],
    userText: string,
  ): Promise<{ content: string; actions?: readonly QuickAction[] }> {
    if (tickets.length === 0) {
      return {
        content: "You don't have any support tickets yet. Need help with something? I can open one for you.",
        actions: [{ label: 'Create Ticket', icon: 'comment', primary: true }],
      };
    }

    const viewAction: QuickAction = { label: 'View My Tickets', icon: 'list', primary: true };
    const lower = userText.toLowerCase();
    const wantsReply = /repl|respond|answer|said/.test(lower);

    // Ticket numbers (e.g. "TCK-20260807-ABCD1234") are rarely typed out in full — match on any
    // 5+ char alnum/dash token the customer did include, from either side. Require a digit so an
    // ordinary English word (e.g. "support", "reply") never masquerades as a ticket/order number.
    const tokens = (userText.toUpperCase().match(/[A-Z0-9-]{5,}/g) ?? []).filter((tok) => /\d/.test(tok));
    let target = tickets.find((t) =>
      tokens.some((tok) => t.number.toUpperCase().includes(tok) || tok.includes(t.number.toUpperCase())),
    );

    if (!target && (wantsReply || lower.includes('status'))) {
      target = [...tickets].sort(
        (a, b) => new Date(b.updatedAtUtc).getTime() - new Date(a.updatedAtUtc).getTime(),
      )[0];
    }

    if (target) {
      const detailDto = await firstValueFrom(this.supportApi.getMyTicket(target.id));
      const detail = mapDetailToTicket(detailDto);
      this.lastDescribedTicketIdState.set(detail.id);
      return {
        content: this.describeTicket(detail, wantsReply),
        actions: [viewAction, { label: 'Chat in This Ticket', icon: 'comments', primary: true }],
      };
    }

    if (lower.includes('order')) {
      const orderToken = tokens[0];
      const matches = orderToken
        ? tickets.filter(
            (t) =>
              t.number.toUpperCase().includes(orderToken) || t.subject.toUpperCase().includes(orderToken),
          )
        : [];
      if (matches.length === 0) {
        return {
          content: "I couldn't find an existing ticket linked to that order. Want me to help you open one?",
          actions: [{ label: 'Create Ticket', icon: 'comment' }],
        };
      }
      return { content: matches.map(summarizeTicket).join('\n\n'), actions: [viewAction] };
    }

    const wantsOpen = /\bopen\b/.test(lower);
    const list = wantsOpen ? tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)) : tickets;
    if (list.length === 0) {
      return { content: "You don't have any open tickets right now — everything's resolved.", actions: [viewAction] };
    }

    const shown = list.slice(0, 5);
    const more = list.length > shown.length ? `\n\n…and ${list.length - shown.length} more.` : '';
    return { content: shown.map(summarizeTicket).join('\n\n') + more, actions: [viewAction] };
  }

  private startTicketCreation(): void {
    if (this.awaitingTicketDescriptionState()) {
      return;
    }
    this.awaitingTicketDescriptionState.set(true);
    this.pushAiMessage("Sure — describe what's going on and I'll open a support ticket for you.");
  }

  private async submitTicketFromDescription(description: string): Promise<void> {
    this.pushUserMessage(description);
    this.awaitingTicketDescriptionState.set(false);

    if (/^(nevermind|never mind|cancel|forget it|no thanks?)$/i.test(description.trim())) {
      this.pushAiMessage('No problem — let me know if you need anything else.');
      return;
    }

    if (!this.authSession.isCustomerAuthenticated()) {
      this.pushAiMessage('Please sign in so I can open a support ticket for you.');
      return;
    }

    this.thinkingState.set(true);
    try {
      const dto = await firstValueFrom(
        this.supportApi.createTicket({
          subject: deriveTicketSubject(description),
          body: description,
          categoryId: null,
          priorityId: null,
          relatedOrderId: null,
          relatedProductId: null,
          customerCountry: null,
          customerBrowser: navigator.userAgent,
          customerDevice: null,
        }),
      );
      this.thinkingState.set(false);
      this.streamMessage(
        `✅ Ticket **${dto.ticketNumber}** created — "${dto.subject}". Our team typically replies within a few hours.`,
        'tickets',
        { actions: [{ label: 'View My Tickets', icon: 'list', primary: true }] },
      );
    } catch {
      this.thinkingState.set(false);
      this.pushAiMessage("I couldn't open that ticket right now — please try again in a moment.");
    }
  }

  /** Posts a message from the customer into the ticket the widget is currently acting as a chat
   * window for — the real `ReplyToTicketCommand` endpoint, same as the Account > Support page. */
  private async replyInActiveTicket(text: string): Promise<void> {
    const ticket = this.activeTicketState();
    if (!ticket) {
      return;
    }

    if (/^(exit|leave|stop|back to assistant)$/i.test(text.trim())) {
      this.exitTicketChat();
      return;
    }

    this.messagesState.update((messages) => [
      ...messages,
      { id: crypto.randomUUID(), role: 'user', content: text, time: timeNow() },
    ]);

    try {
      await firstValueFrom(this.supportApi.reply(ticket.id, { body: text, attachmentIds: null }));
    } catch {
      this.pushAiMessage("That message didn't go through — please try again.");
    }
  }

  /** Realtime fan-in for every ticket the customer is joined to (shared SignalR connection) —
   * only acts when it is the ticket the widget currently has open as a chat. Our own messages
   * echo back through this same channel, already shown optimistically, so they're ignored here. */
  private handleIncomingTicketMessage(ticketId: string, dto: TicketMessageApiDto): void {
    const ticket = this.activeTicketState();
    if (!ticket || ticket.id !== ticketId || dto.isInternal || dto.authorRole === 'Customer') {
      return;
    }

    const message = mapMessage(dto);
    this.messagesState.update((messages) => [...messages, toAssistantMessageFromTicketMessage(message)]);

    if (!this.openState()) {
      this.hasUnreadTicketReplyState.set(true);
    }
    playNotificationSound();
  }

  private async leaveActiveTicketRoom(): Promise<void> {
    const current = this.activeTicketState();
    if (current) {
      await this.supportTickets.hub.leaveTicket(current.id);
    }
  }

  private describeTicket(ticket: Ticket, wantsReply: boolean): string {
    const priority = ticket.priority ? ` · ${ticket.priority.name} priority` : '';
    const orderLine = ticket.relatedOrderNumber ? `\nRelated order: ${ticket.relatedOrderNumber}` : '';
    const header = `**${ticket.number}** — ${ticket.subject}\nStatus: ${TICKET_STATUS_LABELS[ticket.status]}${priority}`;

    if (wantsReply) {
      const lastAgentMessage = [...ticket.messages].reverse().find((m) => m.authorRole === 'agent');
      if (!lastAgentMessage) {
        return `${header}${orderLine}\n\nSupport hasn't replied yet — we'll notify you the moment they do.`;
      }
      const body = htmlToPlainText(lastAgentMessage.bodyHtml);
      return (
        `${header}${orderLine}\n\n` +
        `Latest reply from ${lastAgentMessage.authorName} (${formatDate(lastAgentMessage.createdAtUtc)}):\n> ${body}`
      );
    }

    return `${header}${orderLine}\nCreated: ${formatDate(ticket.createdAtUtc)} · Last updated: ${formatDate(ticket.updatedAtUtc)}`;
  }

  private streamMessage(
    content: string,
    flow: FlowKey,
    extras: Pick<AssistantMessage, 'cards' | 'actions'>,
    onDone?: () => void,
  ): void {
    const words = content.split(/(\s+)/);
    const id = crypto.randomUUID();
    const time = timeNow();
    this.streamingMessageState.set({ id, role: 'ai', content: '', time, flow, streaming: true });

    let index = 0;
    const tick = (): void => {
      index += 1;
      const partial = words.slice(0, index).join('');
      this.streamingMessageState.update((message) =>
        message ? { ...message, content: partial } : message,
      );
      if (index < words.length) {
        setTimeout(tick, STREAM_MIN_MS + Math.random() * STREAM_JITTER_MS);
        return;
      }
      const finalMessage: AssistantMessage = { id, role: 'ai', content, time, flow, ...extras };
      this.messagesState.update((messages) => [...messages, finalMessage]);
      this.streamingMessageState.set(null);
      onDone?.();
    };
    tick();
  }

  private pushUserMessage(text: string): void {
    this.messagesState.update((messages) => [
      ...messages,
      { id: crypto.randomUUID(), role: 'user', content: text, time: timeNow() },
    ]);
  }

  private pushAiMessage(content: string, actions?: readonly QuickAction[]): void {
    this.messagesState.update((messages) => [
      ...messages,
      { id: crypto.randomUUID(), role: 'ai', content, time: timeNow(), actions },
    ]);
  }

  private syncRouteContext(url: string): void {
    const match = PRODUCT_ROUTE.exec(url);
    if (!match) {
      this.contextProductIdState.set(null);
      this.contextProductNameState.set(null);
      this.clearSuggestionTimer();
      return;
    }

    const productId = decodeURIComponent(match[1]);
    if (productId === this.contextProductIdState()) {
      return;
    }

    this.contextProductIdState.set(productId);
    this.contextProductNameState.set(null);
    this.contextDismissedState.set(false);

    this.productDetails
      .getById(productId, true)
      .then((item) => {
        if (this.contextProductIdState() === productId) {
          this.contextProductNameState.set(item.title);
        }
      })
      .catch(() => {
        if (this.contextProductIdState() === productId) {
          this.contextProductNameState.set(null);
        }
      });

    this.armSuggestionTimer(productId);
  }

  private armSuggestionTimer(productId: string): void {
    this.clearSuggestionTimer();
    if (this.openState() || this.shownSuggestionProductIds.has(productId)) {
      return;
    }
    this.suggestionTimer = setTimeout(() => {
      if (this.openState() || this.contextProductIdState() !== productId) {
        return;
      }
      this.shownSuggestionProductIds.add(productId);
      this.hasNewSuggestionState.set(true);
      this.messagesState.update((messages) => [
        {
          id: crypto.randomUUID(),
          role: 'ai',
          content:
            "I noticed you're comparing gift cards — want a quick side-by-side of the best value options?",
          time: timeNow(),
          actions: [{ label: 'Compare options', icon: 'chart-bar', primary: true }],
        },
        ...messages,
      ]);
    }, SUGGESTION_DELAY_MS);
  }

  private clearSuggestionTimer(): void {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = undefined;
    }
  }
}

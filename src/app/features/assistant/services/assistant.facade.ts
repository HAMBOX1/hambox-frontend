import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import {
  AssistantMessage,
  FlowKey,
  HistoryGroup,
  HistoryItem,
  QuickAction,
} from '../models/assistant.models';
import { FLOWS, SEED_HISTORY } from '../data/assistant-flows.data';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ProductDetails } from '../../product-details/services/product-details';

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

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

@Injectable({ providedIn: 'root' })
export class AssistantFacade {
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);
  private readonly productDetails = inject(ProductDetails);
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
  }

  open(): void {
    this.openState.set(true);
    this.hasNewSuggestionState.set(false);
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
    this.messagesState.set([]);
    this.streamingMessageState.set(null);
    this.thinkingState.set(false);
    this.errorShownState.set(false);
  }

  dismissContext(): void {
    this.contextDismissedState.set(true);
  }

  send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.runFlow(this.matchFlow(trimmed), trimmed);
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
    this.pushAiMessage('✅ Ticket **#4821** created. Our team typically replies within 2 hours.');
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

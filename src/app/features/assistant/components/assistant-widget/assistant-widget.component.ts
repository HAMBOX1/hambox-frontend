import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AssistantFacade } from '../../services/assistant.facade';
import { AssistantMessageComponent } from '../assistant-message/assistant-message.component';
import { AssistantHistoryComponent } from '../assistant-history/assistant-history.component';
import { AssistantComposerComponent } from '../assistant-composer/assistant-composer.component';
import { SUGGESTIONS } from '../../data/assistant-flows.data';
import { FlowKey } from '../../models/assistant.models';

const TOAST_DURATION_MS = 2400;
const FAB_STORAGE_KEY = 'hambox.assistant.fab';
const FAB_SIZE = 60;
const FAB_MARGIN = 8;
const DRAG_THRESHOLD_PX = 6;

interface FabPosition {
  readonly x: number;
  readonly y: number;
}

interface FabPrefs {
  readonly pos: FabPosition | null;
  readonly docked: boolean;
}

@Component({
  selector: 'app-assistant-widget',
  standalone: true,
  imports: [
    TranslatePipe,
    AssistantMessageComponent,
    AssistantHistoryComponent,
    AssistantComposerComponent,
  ],
  templateUrl: './assistant-widget.component.html',
  styleUrl: './assistant-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantWidgetComponent {
  protected readonly facade = inject(AssistantFacade);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly suggestions = SUGGESTIONS;

  /** Where the user dragged the floating button to (null = the default corner) and whether they tucked it
   * away into the thin edge tab. Both are remembered per device so it never covers the same button twice. */
  protected readonly fabPos = signal<FabPosition | null>(null);
  protected readonly fabDocked = signal(false);
  protected readonly dragging = signal(false);
  private readonly viewportWidth = signal(typeof window === 'undefined' ? 400 : window.innerWidth);
  private readonly viewportHeight = signal(typeof window === 'undefined' ? 800 : window.innerHeight);
  protected readonly dockSide = computed<'start' | 'end'>(() => {
    const pos = this.fabPos();
    const x = pos ? pos.x + FAB_SIZE / 2 : this.viewportWidth() - FAB_SIZE;
    return x < this.viewportWidth() / 2 ? 'start' : 'end';
  });
  protected readonly dockTop = computed(() => {
    const pos = this.fabPos();
    const y = pos ? pos.y : this.viewportHeight() - 160;
    return Math.max(FAB_MARGIN, Math.min(y, this.viewportHeight() - 80));
  });
  private readonly fabWrap = viewChild<ElementRef<HTMLDivElement>>('fabWrap');
  private dragStart: { pointerX: number; pointerY: number; originX: number; originY: number } | null = null;
  private dragMoved = false;
  protected readonly toastText = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  private readonly composer = viewChild<AssistantComposerComponent>('composer');
  private readonly panelBody = viewChild<ElementRef<HTMLDivElement>>('panelBody');

  constructor() {
    this.restoreFabPrefs();
    effect(() => {
      // Track messages / streaming / thinking so the body scrolls to the latest turn.
      this.facade.messages();
      this.facade.streamingMessage();
      this.facade.isThinking();
      queueMicrotask(() => this.scrollToBottom());
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.facade.isOpen() ? this.facade.close() : this.facade.open();
      return;
    }
    if (event.key === 'Escape' && this.facade.isOpen()) {
      if (this.facade.isHistoryOpen()) {
        this.facade.closeHistory();
      } else {
        this.facade.close();
      }
    }
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);
    const pos = this.fabPos();
    if (pos) {
      this.fabPos.set(this.clampToViewport(pos.x, pos.y));
    }
  }

  protected onFabPointerDown(event: PointerEvent): void {
    const wrap = this.fabWrap()?.nativeElement;
    if (!wrap || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    const rect = wrap.getBoundingClientRect();
    this.dragStart = { pointerX: event.clientX, pointerY: event.clientY, originX: rect.left, originY: rect.top };
    this.dragMoved = false;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onFabPointerMove(event: PointerEvent): void {
    const start = this.dragStart;
    if (!start) {
      return;
    }

    const dx = event.clientX - start.pointerX;
    const dy = event.clientY - start.pointerY;
    if (!this.dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
      return;
    }

    this.dragMoved = true;
    this.dragging.set(true);
    this.fabPos.set(this.clampToViewport(start.originX + dx, start.originY + dy));
  }

  protected onFabPointerUp(event: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.dragStart = null;
    this.dragging.set(false);
    if (this.dragMoved) {
      this.persistFabPrefs();
    }
  }

  protected dockFab(event: Event): void {
    event.stopPropagation();
    this.fabDocked.set(true);
    this.persistFabPrefs();
  }

  protected undockFab(): void {
    this.fabDocked.set(false);
    this.persistFabPrefs();
  }

  private clampToViewport(x: number, y: number): FabPosition {
    const maxX = this.viewportWidth() - FAB_SIZE - FAB_MARGIN;
    const maxY = this.viewportHeight() - FAB_SIZE - FAB_MARGIN;
    return {
      x: Math.max(FAB_MARGIN, Math.min(x, maxX)),
      y: Math.max(FAB_MARGIN, Math.min(y, maxY)),
    };
  }

  private restoreFabPrefs(): void {
    try {
      const raw = localStorage.getItem(FAB_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const prefs = JSON.parse(raw) as Partial<FabPrefs>;
      if (prefs.pos && typeof prefs.pos.x === 'number' && typeof prefs.pos.y === 'number') {
        this.fabPos.set(this.clampToViewport(prefs.pos.x, prefs.pos.y));
      }
      this.fabDocked.set(prefs.docked === true);
    } catch {
      // Storage unavailable or corrupt: fall back to the default corner.
    }
  }

  private persistFabPrefs(): void {
    try {
      localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify({ pos: this.fabPos(), docked: this.fabDocked() }));
    } catch {
      // Best effort only.
    }
  }

  protected onFabClick(): void {
    if (this.dragMoved) {
      // The press was a drag, not a tap, so do not open the assistant.
      this.dragMoved = false;
      return;
    }

    this.facade.open();
    queueMicrotask(() => this.composer()?.focus());
  }

  protected onHeaderClick(): void {
    if (this.facade.isCollapsed()) {
      this.facade.toggleCollapse();
    }
  }

  protected onExitTicketChatClick(event: Event): void {
    event.stopPropagation();
    this.facade.exitTicketChat();
  }

  protected onCollapseClick(event: Event): void {
    event.stopPropagation();
    this.facade.toggleCollapse();
  }

  protected onCloseClick(event: Event): void {
    event.stopPropagation();
    this.facade.close();
  }

  protected onNewClick(event: Event): void {
    event.stopPropagation();
    this.facade.startNewConversation();
    this.showToast('ASSISTANT.TOAST_NEW_CONVERSATION');
  }

  protected onHistoryClick(event: Event): void {
    event.stopPropagation();
    this.facade.openHistory();
  }

  protected onChipClick(flow: FlowKey): void {
    this.facade.selectSuggestion(flow);
  }

  protected onComposerAction(command: string): void {
    switch (command) {
      case 'quick-add':
        this.showToast('ASSISTANT.TOAST_ADDED_TO_CART');
        return;
      case 'view-details': {
        this.showToast('ASSISTANT.TOAST_OPENING_PRODUCT');
        const productId = this.facade.contextProductId();
        if (productId) {
          void this.router.navigate(['/products', productId]);
          this.facade.close();
        }
        return;
      }
      case 'open-order':
      case 'Track Order':
        this.showToast('ASSISTANT.TOAST_OPENING_ORDER');
        void this.router.navigate(['/account/orders']);
        this.facade.close();
        return;
      case 'View Library':
        this.showToast('ASSISTANT.TOAST_OPENING_LIBRARY');
        void this.router.navigate(['/account/library']);
        this.facade.close();
        return;
      case 'Upgrade Membership':
        this.showToast('ASSISTANT.TOAST_OPENING_MEMBERSHIP');
        void this.router.navigate(['/checkout/membership']);
        this.facade.close();
        return;
      case 'view-instructions':
        this.showToast('ASSISTANT.TOAST_OPENING_INSTRUCTIONS');
        return;
      case 'Download License':
        this.showToast('ASSISTANT.TOAST_DOWNLOADING_LICENSE');
        return;
      case 'Contact Support':
        this.showToast('ASSISTANT.TOAST_CONNECTING_SUPPORT');
        return;
      case 'Create Ticket':
        this.facade.createTicket();
        return;
      case 'View My Tickets':
        void this.router.navigate(['/account/support']);
        this.facade.close();
        return;
      case 'Chat in This Ticket': {
        const ticketId = this.facade.lastDescribedTicketId();
        if (ticketId) {
          void this.facade.enterTicketChat(ticketId);
        }
        return;
      }
      case 'Compare options':
        this.facade.selectSuggestion('compare');
        return;
      default:
        return;
    }
  }

  protected onRegenerate(messageId: string): void {
    this.facade.regenerate(messageId);
  }

  protected onRetry(messageId: string): void {
    this.facade.retry(messageId);
  }

  protected onReportIssue(): void {
    this.showToast('ASSISTANT.TOAST_ISSUE_REPORTED');
  }

  protected onLike(messageId: string): void {
    this.facade.toggleLike(messageId);
  }

  protected onDislike(messageId: string): void {
    this.facade.toggleDislike(messageId);
  }

  protected onCopied(toastKey: string): void {
    this.showToast(toastKey);
  }

  private showToast(key: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastText.set(this.translate.instant(key));
    this.toastTimer = setTimeout(() => this.toastText.set(null), TOAST_DURATION_MS);
  }

  private scrollToBottom(): void {
    const el = this.panelBody()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
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
  protected readonly toastText = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  private readonly composer = viewChild<AssistantComposerComponent>('composer');
  private readonly panelBody = viewChild<ElementRef<HTMLDivElement>>('panelBody');

  constructor() {
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

  protected onFabClick(): void {
    this.facade.open();
    queueMicrotask(() => this.composer()?.focus());
  }

  protected onHeaderClick(): void {
    if (this.facade.isCollapsed()) {
      this.facade.toggleCollapse();
    }
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

import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EditorModule } from 'primeng/editor';
import { map } from 'rxjs';

import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../../shared/directives/hambox-translate-refresh.directive';
import { TICKET_STATUS_META } from '../../../../../core/support/support.model';
import { AccountSupportFacade } from '../../services/account-support.facade';
import { SupportChipComponent } from '../../components/support-chip/support-chip.component';

const TYPING_STOP_DELAY_MS = 2_000;

@Component({
  selector: 'app-account-ticket-detail-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    HamboxTranslateRefreshDirective,
    EditorModule,
    SupportChipComponent,
  ],
  templateUrl: './account-ticket-detail-page.component.html',
  styleUrl: './account-ticket-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTicketDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(AccountSupportFacade);

  private readonly conversationEl = viewChild<ElementRef<HTMLElement>>('conversation');
  private typingStopTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly ticketId = toSignal(this.route.paramMap.pipe(map((params) => params.get('ticketId') ?? '')), {
    initialValue: '',
  });

  protected readonly statusMeta = TICKET_STATUS_META;
  protected readonly replyHtml = signal('');
  protected readonly sending = signal(false);
  protected readonly ratingScore = signal(0);
  protected readonly ratingComment = signal('');

  protected readonly ticket = this.facade.currentTicket;
  protected readonly loading = this.facade.currentTicketLoading;
  protected readonly messages = computed(() => this.ticket()?.messages.filter((m) => !m.internal) ?? []);
  protected readonly agentTyping = this.facade.agentTyping;
  protected readonly connectionState = this.facade.connectionState;

  constructor() {
    effect((onCleanup) => {
      const id = this.ticketId();
      if (!id) {
        return;
      }
      void this.facade.loadTicket(id).then(() => this.facade.markRead(id));
      onCleanup(() => {
        this.facade.leaveTicket(id);
        clearTimeout(this.typingStopTimer);
      });
    });

    // Auto-scroll to the newest message whenever the conversation grows (new reply arriving
    // live, or the initial load) — re-runs whenever `messages()` is read here changes length.
    effect(() => {
      const count = this.messages().length;
      if (count === 0) {
        return;
      }
      queueMicrotask(() => {
        const el = this.conversationEl()?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  protected onComposerInput(): void {
    const id = this.ticketId();
    if (!id) {
      return;
    }
    this.facade.notifyTyping(id);
    clearTimeout(this.typingStopTimer);
    this.typingStopTimer = setTimeout(() => this.facade.notifyStopTyping(id), TYPING_STOP_DELAY_MS);
  }

  protected async sendReply(): Promise<void> {
    const html = this.replyHtml().trim();
    if (!html || html === '<p><br></p>') {
      return;
    }
    clearTimeout(this.typingStopTimer);
    this.facade.notifyStopTyping(this.ticketId());
    this.sending.set(true);
    try {
      await this.facade.reply(this.ticketId(), html);
      this.replyHtml.set('');
    } finally {
      this.sending.set(false);
    }
  }

  protected async closeTicket(): Promise<void> {
    await this.facade.close(this.ticketId());
  }

  protected async reopenTicket(): Promise<void> {
    await this.facade.reopen(this.ticketId());
  }

  protected async submitRating(): Promise<void> {
    if (this.ratingScore() < 1) {
      return;
    }
    await this.facade.rate(this.ticketId(), this.ratingScore(), this.ratingComment().trim() || null);
  }

  protected backToList(): void {
    void this.router.navigate(['/account/support/tickets/open']);
  }
}

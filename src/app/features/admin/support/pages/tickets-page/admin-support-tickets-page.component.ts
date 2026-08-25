import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { SelectModule } from 'primeng/select';
import { map } from 'rxjs';

import {
  AdminActionMenuComponent,
  AdminEmptyStateComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  adminBreadcrumbs,
} from '../../../../../shared/components/admin';
import { HamboxBottomSheetComponent } from '../../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { SupportTicketsStore } from '../../../../../core/support/support-tickets.store';
import { statusToApi, Ticket, TicketStatus, TICKET_STATUS_META } from '../../../../../core/support/support.model';
import { AdminSupportFacade } from '../../services/admin-support.facade';

const TYPING_STOP_DELAY_MS = 2_000;
const MOBILE_COMPOSER_MAX_HEIGHT_PX = 120;

/** Support workspace. Desktop and tablet get a fixed, non-responsive multi-column layout
 * (3 columns / 2 columns); phones (MobileViewportService.isMobile) get a completely separate,
 * navigation-based single-screen flow — its own list, conversation, and composer markup, not a
 * CSS-shrunk version of the desktop one. Message bubbles are the one piece genuinely identical
 * in both (a chat bubble looks the same at any width), so that inner loop is shared via
 * ng-template; everything else — headers, list rows, filters, the composer — is separate. */
@Component({
  selector: 'app-admin-support-tickets-page',
  standalone: true,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    ButtonModule,
    SelectModule,
    EditorModule,
    AdminPageHeaderComponent,
    AdminSearchBarComponent,
    AdminSectionCardComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
    AdminActionMenuComponent,
    HamboxBottomSheetComponent,
  ],
  templateUrl: './admin-support-tickets-page.component.html',
  styleUrl: './admin-support-tickets-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSupportTicketsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(AdminSupportFacade);
  private readonly store = inject(SupportTicketsStore);
  private readonly mobileViewport = inject(MobileViewportService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly conversationEl = viewChild<ElementRef<HTMLElement>>('conversation');
  private readonly mobileComposerEl = viewChild<ElementRef<HTMLTextAreaElement>>('mobileComposer');
  private typingStopTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly selectedTicketId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('ticketId'))),
    { initialValue: null },
  );

  protected readonly isMobile = this.mobileViewport.isMobile;
  protected readonly mobileContextOpen = signal(false);
  protected readonly mobileFiltersOpen = signal(false);

  // How far to lift the fixed composer off the true screen bottom. Needed because
  // position: fixed anchors to the *layout* viewport, not the *visual* one — the moment the
  // on-screen keyboard opens (or any reflow happens while it's open, e.g. sending a message
  // clears the input), iOS/Android can leave a naively `bottom: 0` element sitting behind the
  // keyboard instead of above it. Tracking window.visualViewport is the standard fix.
  protected readonly composerBottomOffsetPx = signal(0);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Support' });
  protected readonly statusMeta = TICKET_STATUS_META;
  protected readonly statusOptions = Object.entries(TICKET_STATUS_META).map(([value, meta]) => ({ value, labelKey: meta.labelKey }));
  protected readonly categories = this.store.categories;
  protected readonly priorities = this.store.priorities;

  protected readonly searchTerm = signal(this.route.snapshot.queryParamMap.get('search') ?? '');
  protected readonly statusFilter = signal<TicketStatus | null>(null);
  protected readonly priorityFilter = signal<string | null>(null);
  protected readonly categoryFilter = signal<string | null>(null);
  protected readonly activeFilterCount = computed(
    () => [this.statusFilter(), this.priorityFilter(), this.categoryFilter()].filter((v) => v !== null).length,
  );

  protected readonly listLoading = this.facade.loading;
  protected readonly tickets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.facade.tickets();
    if (!term) {
      return all;
    }
    return all.filter(
      (t) =>
        t.subject.toLowerCase().includes(term) ||
        t.number.toLowerCase().includes(term) ||
        t.customerName.toLowerCase().includes(term) ||
        t.customerEmail.toLowerCase().includes(term) ||
        (t.relatedOrderNumber?.toLowerCase().includes(term) ?? false) ||
        (t.relatedProductName?.toLowerCase().includes(term) ?? false),
    );
  });

  protected readonly replyHtml = signal('');
  protected readonly mobileReplyText = signal('');
  protected readonly replyInternal = signal(false);
  protected readonly sending = signal(false);

  protected readonly ticket = this.facade.currentTicket;
  protected readonly ticketLoading = this.facade.currentTicketLoading;
  protected readonly customerTyping = this.facade.customerTyping;
  protected readonly connectionState = this.facade.connectionState;

  protected readonly mobileTicketActions = computed<MenuItem[]>(() => {
    const t = this.ticket();
    if (!t) {
      return [];
    }
    const tr = (key: string): string => this.translate.instant(key);
    const items: MenuItem[] = [
      {
        label: tr('ADMIN.SUPPORT.DETAIL.STATUS'),
        icon: 'pi pi-sync',
        items: this.statusOptions.map((option) => ({
          label: tr(option.labelKey),
          icon: t.status === option.value ? 'pi pi-check' : 'pi pi-fw',
          command: () => void this.onStatusChange(option.value as TicketStatus),
        })),
      },
      {
        label: tr('ADMIN.SUPPORT.DETAIL.PRIORITY'),
        icon: 'pi pi-flag',
        items: this.priorities().map((priority) => ({
          label: priority.name,
          icon: t.priority?.id === priority.id ? 'pi pi-check' : 'pi pi-fw',
          command: () => void this.onPriorityChange(priority.id),
        })),
      },
    ];
    if (!t.assignedAgentId) {
      items.push({ label: tr('ADMIN.SUPPORT.DETAIL.ASSIGN_TO_ME'), icon: 'pi pi-user', command: () => void this.assignToMe() });
    }
    if (t.status !== 'closed') {
      items.push({ label: tr('SUPPORT.DETAIL.CLOSE'), icon: 'pi pi-check-circle', command: () => void this.closeTicket() });
    }
    if (t.status === 'resolved') {
      items.push({ label: tr('SUPPORT.DETAIL.REOPEN'), icon: 'pi pi-replay', command: () => void this.reopenTicket() });
    }
    return items;
  });

  constructor() {
    void this.store.loadLookups();

    effect(() => {
      void this.facade.load({
        status: this.statusFilter() ? statusToApi(this.statusFilter()!) : undefined,
        priorityId: this.priorityFilter() ?? undefined,
        categoryId: this.categoryFilter() ?? undefined,
        page: 1,
        pageSize: 50,
      });
    });

    effect((onCleanup) => {
      const id = this.selectedTicketId();
      this.replyHtml.set('');
      this.mobileReplyText.set('');
      this.replyInternal.set(false);
      this.mobileContextOpen.set(false);
      // untracked: the composer only exists once the ticket finishes loading, so a tracked
      // read here would make mounting it re-trigger this very effect — loadTicket -> mount ->
      // rerun -> loadTicket again, forever. We just want its *current* value, not to react to it.
      const composer = untracked(() => this.mobileComposerEl()?.nativeElement);
      if (composer) {
        composer.style.height = '';
      }
      if (!id) {
        return;
      }
      void this.facade.loadTicket(id).then(() => this.facade.markRead(id));
      onCleanup(() => {
        this.facade.leaveTicket(id);
        clearTimeout(this.typingStopTimer);
      });
    });

    effect(() => {
      const count = this.ticket()?.messages.length ?? 0;
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

    this.trackVisualViewport();
  }

  private trackVisualViewport(): void {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!viewport) {
      return;
    }
    const sync = (): void => {
      const offset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop));
      this.composerBottomOffsetPx.set(offset);
    };
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    sync();
    this.destroyRef.onDestroy(() => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
    });
  }

  protected isSelected(ticketId: string): boolean {
    return this.selectedTicketId() === ticketId;
  }

  protected selectTicket(ticket: Ticket): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ticketId: ticket.id },
      queryParamsHandling: 'merge',
    });
  }

  protected backToList(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ticketId: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  protected clearFilters(): void {
    this.statusFilter.set(null);
    this.priorityFilter.set(null);
    this.categoryFilter.set(null);
  }

  protected statusLabelKey(status: TicketStatus): string {
    return this.statusMeta[status].labelKey;
  }

  protected statusTone(status: TicketStatus): AdminStatusTone {
    return this.statusMeta[status].tone;
  }

  protected onComposerInput(): void {
    const id = this.selectedTicketId();
    // Typing broadcasts to the ticket's public group (the same one the customer's connection
    // joins) — never surface agent typing while drafting a customer-invisible internal note.
    if (!id || this.replyInternal()) {
      return;
    }
    this.facade.notifyTyping(id);
    clearTimeout(this.typingStopTimer);
    this.typingStopTimer = setTimeout(() => this.facade.notifyStopTyping(id), TYPING_STOP_DELAY_MS);
  }

  protected onMobileComposerInput(event: Event): void {
    this.onComposerInput();
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MOBILE_COMPOSER_MAX_HEIGHT_PX)}px`;
  }

  protected async sendReply(): Promise<void> {
    const id = this.selectedTicketId();
    const html = this.replyHtml().trim();
    if (!id || !html || html === '<p><br></p>') {
      return;
    }
    clearTimeout(this.typingStopTimer);
    this.facade.notifyStopTyping(id);
    this.sending.set(true);
    try {
      await this.facade.reply(id, html, this.replyInternal());
      this.replyHtml.set('');
    } finally {
      this.sending.set(false);
    }
  }

  protected async sendMobileReply(): Promise<void> {
    const id = this.selectedTicketId();
    const text = this.mobileReplyText().trim();
    if (!id || !text) {
      return;
    }
    clearTimeout(this.typingStopTimer);
    this.facade.notifyStopTyping(id);
    this.sending.set(true);
    try {
      await this.facade.reply(id, text, this.replyInternal());
      this.mobileReplyText.set('');
      const composer = this.mobileComposerEl()?.nativeElement;
      if (composer) {
        composer.style.height = '';
      }
    } finally {
      this.sending.set(false);
    }
  }

  protected async onStatusChange(status: TicketStatus): Promise<void> {
    const id = this.selectedTicketId();
    if (!id) return;
    await this.facade.updateStatus(id, status);
  }

  protected async onPriorityChange(priorityId: string | null): Promise<void> {
    const id = this.selectedTicketId();
    if (!id) return;
    await this.facade.updatePriority(id, priorityId);
  }

  protected async assignToMe(): Promise<void> {
    const id = this.selectedTicketId();
    if (!id) return;
    await this.facade.assignToMe(id);
  }

  protected async closeTicket(): Promise<void> {
    const id = this.selectedTicketId();
    if (!id) return;
    await this.facade.closeTicket(id);
  }

  protected async reopenTicket(): Promise<void> {
    const id = this.selectedTicketId();
    if (!id) return;
    await this.facade.reopenTicket(id);
  }
}

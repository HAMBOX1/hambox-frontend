import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';

import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { HamboxTranslateRefreshDirective } from '../../../../../shared/directives/hambox-translate-refresh.directive';
import { TICKET_STATUS_META } from '../../../../../core/support/support.model';
import { AccountSupportFacade } from '../../services/account-support.facade';
import { SupportSubnavComponent } from '../../components/support-subnav/support-subnav.component';
import { SupportChipComponent } from '../../components/support-chip/support-chip.component';

@Component({
  selector: 'app-account-support-tickets-list-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    HamboxTranslateRefreshDirective,
    SupportSubnavComponent,
    SupportChipComponent,
  ],
  templateUrl: './account-support-tickets-list-page.component.html',
  styleUrl: './account-support-tickets-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSupportTicketsListPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(AccountSupportFacade);

  private readonly statusGroup = toSignal(
    this.route.data.pipe(map((data) => (data['statusGroup'] as 'open' | 'closed') ?? 'open')),
    { initialValue: 'open' as const },
  );

  protected readonly statusMeta = TICKET_STATUS_META;
  protected readonly loading = this.facade.loading;
  protected readonly searchTerm = signal('');
  protected readonly isOpenView = computed(() => this.statusGroup() === 'open');

  constructor() {
    void this.facade.load();
  }

  protected readonly tickets = computed(() => {
    const base = this.isOpenView() ? this.facade.openTickets() : this.facade.closedTickets();
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return base;
    }
    return base.filter((t) => t.subject.toLowerCase().includes(term) || t.number.toLowerCase().includes(term));
  });

  protected onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
}

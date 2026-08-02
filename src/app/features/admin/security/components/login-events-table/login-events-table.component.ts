import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { LoginHistoryDto } from '../../models/security.model';
import { SecurityManagementFacade } from '../../services/security-management.facade';
import { activateOnceWhenTrue } from '../../utils/lazy-tab-activation';

/** Converts an ISO-3166 alpha-2 country code into its flag emoji via regional indicator symbols. */
function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

@Component({
  selector: 'app-login-events-table',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    DialogModule,
    SelectModule,
    TableModule,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
  ],
  templateUrl: './login-events-table.component.html',
  styleUrl: './login-events-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginEventsTableComponent {
  readonly active = input(false);

  protected readonly facade = inject(SecurityManagementFacade);

  protected readonly searchTerm = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly outcomeFilter = signal('all');
  protected readonly riskFilter = signal('all');

  protected readonly events = computed(() => this.facade.loginHistory()?.items ?? []);
  protected readonly total = computed(() => this.facade.loginHistory()?.totalCount ?? 0);
  protected readonly tableFirst = computed(() => (this.page() - 1) * this.pageSize());

  protected readonly detailTarget = signal<LoginHistoryDto | null>(null);

  protected readonly outcomeOptions = [
    { label: 'All outcomes', value: 'all' },
    { label: 'Successful', value: 'success' },
    { label: 'Failed', value: 'failed' },
  ];

  protected readonly riskOptions = [
    { label: 'All risk levels', value: 'all' },
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
    { label: 'Critical', value: 'Critical' },
  ];

  constructor() {
    activateOnceWhenTrue(this.active, () => this.reload());
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    this.reload();
  }

  protected onOutcomeChange(value: string): void {
    this.outcomeFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onRiskChange(value: string): void {
    this.riskFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
    this.reload();
  }

  protected retry(): void {
    this.reload();
  }

  protected openDetail(data: LoginHistoryDto | LoginHistoryDto[] | undefined): void {
    if (data && !Array.isArray(data)) {
      this.detailTarget.set(data);
    }
  }

  protected flag(countryCode: string | null): string {
    return countryFlag(countryCode);
  }

  protected riskTone(risk: string | null): AdminStatusTone {
    switch (risk) {
      case 'Critical':
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  protected outcomeTone(isSuccessful: boolean): AdminStatusTone {
    return isSuccessful ? 'success' : 'danger';
  }

  private reload(): void {
    void this.facade.loadLoginHistory(this.page(), this.pageSize(), {
      searchTerm: this.searchTerm(),
      isSuccessful: this.outcomeFilter() === 'all' ? undefined : this.outcomeFilter() === 'success',
      riskLevel: this.riskFilter() === 'all' ? undefined : this.riskFilter(),
    });
  }
}

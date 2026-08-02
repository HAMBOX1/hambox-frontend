import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import {
  AdminActionMenuComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { SecurityEventDto, SecurityEventStatus, SecurityEventType } from '../../models/security.model';
import { SecurityManagementFacade } from '../../services/security-management.facade';
import { activateOnceWhenTrue } from '../../utils/lazy-tab-activation';

/**
 * One table backing both the Alerts tab (severity >= High, status = Open by default, with
 * Acknowledge/Dismiss/Resolve actions) and the Timeline tab (every event, read-only) — the two
 * views are the same underlying `SecurityEventLog` data with different default filters, so this
 * avoids maintaining two near-identical tables.
 */
@Component({
  selector: 'app-security-event-table',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    SelectModule,
    TableModule,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminActionMenuComponent,
    AdminStatusBadgeComponent,
  ],
  templateUrl: './security-event-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityEventTableComponent {
  readonly mode = input.required<'alerts' | 'timeline'>();
  readonly active = input(false);

  protected readonly facade = inject(SecurityManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly searchTerm = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly statusFilter = signal('all');
  protected readonly eventTypeFilter = signal('all');
  protected readonly severityFilter = signal('all');

  protected readonly isAlerts = computed(() => this.mode() === 'alerts');
  protected readonly events = computed(() =>
    this.isAlerts() ? (this.facade.alerts()?.items ?? []) : (this.facade.events()?.items ?? []),
  );
  protected readonly total = computed(() =>
    this.isAlerts() ? (this.facade.alerts()?.totalCount ?? 0) : (this.facade.events()?.totalCount ?? 0),
  );
  protected readonly loading = computed(() => (this.isAlerts() ? this.facade.alertsLoading() : this.facade.eventsLoading()));
  protected readonly error = computed(() => (this.isAlerts() ? this.facade.alertsError() : this.facade.eventsError()));
  protected readonly tableFirst = computed(() => (this.page() - 1) * this.pageSize());

  protected readonly statusOptions: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'Open' },
    { label: 'Acknowledged', value: 'Acknowledged' },
    { label: 'Dismissed', value: 'Dismissed' },
    { label: 'Resolved', value: 'Resolved' },
  ];

  protected readonly eventTypeOptions: { label: string; value: string }[] = [
    { label: 'All types', value: 'all' },
    { label: 'Failed Login', value: 'FailedLogin' satisfies SecurityEventType },
    { label: 'Blocked Login', value: 'BlockedLogin' satisfies SecurityEventType },
    { label: 'Country Block', value: 'CountryBlock' satisfies SecurityEventType },
    { label: 'IP Block', value: 'IpBlock' satisfies SecurityEventType },
    { label: 'Email Block', value: 'EmailBlock' satisfies SecurityEventType },
    { label: 'Device Block', value: 'DeviceBlock' satisfies SecurityEventType },
    { label: 'Manual Suspension', value: 'ManualSuspension' satisfies SecurityEventType },
    { label: 'Manual Ban', value: 'ManualBan' satisfies SecurityEventType },
    { label: 'Permission Denied', value: 'PermissionDenied' satisfies SecurityEventType },
  ];

  protected readonly severityOptions: { label: string; value: string }[] = [
    { label: 'All severities', value: 'all' },
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

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onEventTypeChange(value: string): void {
    this.eventTypeFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onSeverityChange(value: string): void {
    this.severityFilter.set(value);
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

  protected severityTone(severity: string): AdminStatusTone {
    switch (severity) {
      case 'Critical':
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  protected statusTone(status: SecurityEventStatus): AdminStatusTone {
    switch (status) {
      case 'Open':
        return 'danger';
      case 'Acknowledged':
        return 'warning';
      case 'Resolved':
        return 'success';
      default:
        return 'neutral';
    }
  }

  protected rowActionMenuItems(event: SecurityEventDto): MenuItem[] {
    if (!this.isAlerts()) {
      return [];
    }

    const t = (key: string) => this.translate.instant(key);
    const items: MenuItem[] = [];

    if (event.status === 'Open' || event.status === 'Acknowledged') {
      if (event.status === 'Open') {
        items.push({
          label: t('ADMIN.SECURITY.ALERTS.ACTIONS.ACKNOWLEDGE'),
          icon: 'pi pi-eye',
          command: () => this.updateStatus(event, 'Acknowledged'),
        });
      }
      items.push({
        label: t('ADMIN.SECURITY.ALERTS.ACTIONS.RESOLVE'),
        icon: 'pi pi-check',
        command: () => this.updateStatus(event, 'Resolved'),
      });
      items.push({
        label: t('ADMIN.SECURITY.ALERTS.ACTIONS.DISMISS'),
        icon: 'pi pi-times',
        command: () => this.updateStatus(event, 'Dismissed'),
      });
    }

    return items;
  }

  private async updateStatus(event: SecurityEventDto, status: Exclude<SecurityEventStatus, 'Open'>): Promise<void> {
    const success = await this.facade.updateEventStatus(event.id, { status, notes: null });
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_SUCCEEDED'), life: 4000 });
      this.reload();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.SECURITY.MESSAGES.ACTION_FAILED'),
        detail: this.facade.alertsError() ?? '',
        life: 5000,
      });
    }
  }

  private reload(): void {
    if (this.isAlerts()) {
      const status = this.statusFilter() === 'all' ? undefined : this.statusFilter();
      void this.facade.loadAlerts(this.page(), this.pageSize(), { searchTerm: this.searchTerm(), status });
    } else {
      void this.facade.loadEvents(this.page(), this.pageSize(), {
        searchTerm: this.searchTerm(),
        eventType: this.eventTypeFilter() === 'all' ? undefined : this.eventTypeFilter(),
        severity: this.severityFilter() === 'all' ? undefined : this.severityFilter(),
      });
    }
  }
}

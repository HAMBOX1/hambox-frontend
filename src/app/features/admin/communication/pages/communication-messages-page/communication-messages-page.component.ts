import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { COMMUNICATION_CHANNELS, COMMUNICATION_STATUS_OPTIONS } from '../../models/communication.model';
import { CommunicationFacade } from '../../services/communication.facade';

@Component({
  selector: 'app-communication-messages-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    SelectModule,
    TableModule,
    AdminPageHeaderComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [CommunicationFacade],
  templateUrl: './communication-messages-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunicationMessagesPageComponent implements OnInit {
  protected readonly facade = inject(CommunicationFacade);
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Communication', route: '/admin/communication' }, { label: 'Notifications' });

  protected readonly statusOptions = [...COMMUNICATION_STATUS_OPTIONS];
  protected readonly channelOptions = [{ label: 'All', value: 'all' }, ...COMMUNICATION_CHANNELS.map((c) => ({ label: c, value: c }))];

  protected readonly result = this.facade.messages;
  protected readonly loading = this.facade.messagesLoading;
  protected readonly error = this.facade.messagesError;

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly channelFilter = signal('all');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);

  protected readonly items = computed(() => this.result()?.items ?? []);
  protected readonly totalCount = computed(() => this.result()?.totalCount ?? 0);
  protected readonly tableFirst = computed(() => (this.page() - 1) * this.pageSize());

  ngOnInit(): void {
    this.reload();
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    this.reload();
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.reload();
  }

  protected onChannelChange(value: string): void {
    this.channelFilter.set(value);
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

  protected retryLoad(): void {
    this.reload();
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Delivered':
      case 'Sent':
        return 'success';
      case 'Failed':
        return 'danger';
      case 'Retrying':
      case 'Sending':
        return 'info';
      default:
        return 'neutral';
    }
  }

  private reload(): void {
    void this.facade.loadMessages(
      this.page(),
      this.pageSize(),
      this.statusFilter(),
      this.channelFilter(),
      undefined,
      this.searchTerm(),
    );
  }
}

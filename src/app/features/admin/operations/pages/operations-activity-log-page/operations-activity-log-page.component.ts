import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { firstValueFrom } from 'rxjs';

import { ACTIVITY_LOG_API } from '../../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../../core/api/api-client.service';
import { ApiError } from '../../../../../core/models/api-error.model';

export interface ActivityLogEntryDto {
  readonly id: string;
  readonly source: string;
  readonly eventType: string;
  readonly description: string | null;
  readonly actorUserId: string | null;
  readonly actorName: string | null;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly reason: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly occurredOnUtc: string;
}

interface ActivityLogPage {
  readonly items: readonly ActivityLogEntryDto[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

const SOURCES = [
  { value: '', label: 'All sources' },
  { value: 'Order', label: 'Orders' },
  { value: 'Referral', label: 'Referrals' },
  { value: 'Membership', label: 'Memberships' },
  { value: 'Promotion', label: 'Promotions' },
  { value: 'Operations', label: 'Operations & settings' },
];

const PAGE_SIZE = 50;

/** The single searchable activity log (audit R56): who did what, when, from where, and what changed. */
@Component({
  selector: 'app-operations-activity-log-page',
  standalone: true,
  imports: [FormsModule, DatePipe, ButtonModule, InputTextModule, SelectModule, TableModule],
  templateUrl: './operations-activity-log-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsActivityLogPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);

  protected readonly sources = SOURCES;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly entries = signal<readonly ActivityLogEntryDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageNumber = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly search = signal('');
  protected readonly source = signal('');
  protected readonly entityId = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  ngOnInit(): void {
    void this.load(1);
  }

  protected applyFilters(): void {
    void this.load(1);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.source.set('');
    this.entityId.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    void this.load(1);
  }

  protected async changePage(delta: number): Promise<void> {
    const next = this.pageNumber() + delta;
    const last = Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE));
    if (next < 1 || next > last) return;
    await this.load(next);
  }

  protected async exportCsv(): Promise<void> {
    this.error.set(null);

    try {
      const rows: ActivityLogEntryDto[] = [];
      for (let page = 1; page <= 25; page++) {
        const result = await firstValueFrom(
          this.api.get<ActivityLogPage>(ACTIVITY_LOG_API.log, {
            params: { ...this.buildParams(), page, pageSize: 200 },
          }),
        );
        rows.push(...result.items);
        if (rows.length >= result.totalCount || result.items.length === 0) break;
      }

      const cell = (value: string | null | undefined): string => {
        const text = value && /^[=+\-@\t\r]/.test(value) ? `'${value}` : (value ?? '');
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      const header = [
        'Time (UTC)', 'Source', 'Event', 'Description', 'Actor', 'Actor id', 'Entity', 'Entity id',
        'Reason', 'Old value', 'New value', 'IP address', 'User agent',
      ];
      const lines = rows.map((r) =>
        [
          r.occurredOnUtc, r.source, r.eventType, r.description, r.actorName, r.actorUserId, r.entityType,
          r.entityId, r.reason, r.oldValue, r.newValue, r.ipAddress, r.userAgent,
        ]
          .map(cell)
          .join(','),
      );

      const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'hambox-activity-log.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(error instanceof ApiError ? error.message : 'Export failed.');
    }
  }

  private buildParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (this.search().trim()) params['search'] = this.search().trim();
    if (this.source()) params['source'] = this.source();
    if (this.entityId().trim()) params['entityId'] = this.entityId().trim();
    if (this.dateFrom()) params['dateFrom'] = new Date(this.dateFrom()).toISOString();
    if (this.dateTo()) params['dateTo'] = new Date(this.dateTo() + 'T23:59:59').toISOString();
    return params;
  }

  private async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<ActivityLogPage>(ACTIVITY_LOG_API.log, {
          params: { ...this.buildParams(), page, pageSize: PAGE_SIZE },
        }),
      );
      this.entries.set(result.items);
      this.totalCount.set(result.totalCount);
      this.pageNumber.set(page);
    } catch (error) {
      this.error.set(error instanceof ApiError ? error.message : 'Could not load the activity log.');
    } finally {
      this.loading.set(false);
    }
  }
}

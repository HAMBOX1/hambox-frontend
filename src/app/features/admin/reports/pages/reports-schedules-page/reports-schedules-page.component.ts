import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  REPORT_FORMATS,
  ReportFormat,
  ReportScheduleFrequency,
  ScheduledReport,
} from '../../models/reports-api.model';
import { ReportsFacade } from '../../services/reports.facade';

@Component({
  selector: 'app-reports-schedules-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    SelectModule,
    TableModule,
    TextareaModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
  ],
  templateUrl: './reports-schedules-page.component.html',
  styleUrl: './reports-schedules-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsSchedulesPageComponent implements OnInit {
  protected readonly facade = inject(ReportsFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly schedules = this.facade.schedules;
  protected readonly executions = this.facade.executions;
  protected readonly types = this.facade.types;
  protected readonly loading = this.facade.loading;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly error = this.facade.error;
  protected readonly selectedScheduleId = signal<string | null>(null);

  protected readonly reportType = signal<string>('Sales');
  protected readonly format = signal<ReportFormat>('pdf');
  protected readonly frequency = signal<ReportScheduleFrequency>('Daily');
  protected readonly emails = signal('');
  protected readonly isEnabled = signal(true);

  protected readonly frequencyOptions: {
    labelKey: string;
    value: ReportScheduleFrequency;
  }[] = [
    { labelKey: 'ADMIN.REPORTS.SCHEDULES.FREQ_DAILY', value: 'Daily' },
    { labelKey: 'ADMIN.REPORTS.SCHEDULES.FREQ_WEEKLY', value: 'Weekly' },
    { labelKey: 'ADMIN.REPORTS.SCHEDULES.FREQ_MONTHLY', value: 'Monthly' },
  ];

  protected readonly formatOptions = REPORT_FORMATS;
  protected readonly fallbackTypes = [
    'Sales',
    'Revenue',
    'Orders',
    'Inventory',
    'Products',
    'Categories',
    'Membership',
    'Promotion',
    'Coupon',
    'Referral',
    'Customer',
    'Operations',
    'Audit',
  ] as const;

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await Promise.all([this.facade.loadTypes(), this.facade.loadSchedules()]);
    const selected = this.selectedScheduleId();
    if (selected) {
      await this.facade.loadExecutions(selected);
    }
  }

  protected typeOptions(): { label: string; value: string }[] {
    const catalog = this.types();
    if (catalog.length > 0) {
      return catalog.map((item) => ({ label: item.name, value: item.type }));
    }
    return this.fallbackTypes.map((value) => ({ label: value, value }));
  }

  protected async createSchedule(): Promise<void> {
    const recipients = this.emails()
      .split(/[,;\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    const ok = await this.facade.createSchedule({
      reportType: this.reportType(),
      format: this.format(),
      frequency: this.frequency(),
      emailRecipients: recipients,
      isEnabled: this.isEnabled(),
      filtersJson: this.facade.filtersJson(),
    });

    if (ok) {
      this.emails.set('');
      this.isEnabled.set(true);
    }
  }

  protected async selectSchedule(schedule: ScheduledReport): Promise<void> {
    this.selectedScheduleId.set(schedule.id);
    await this.facade.loadExecutions(schedule.id);
  }

  protected async toggleEnabled(schedule: ScheduledReport): Promise<void> {
    await this.facade.updateSchedule(schedule.id, {
      filtersJson: schedule.filtersJson,
      format: schedule.format,
      frequency: schedule.frequency,
      emailRecipients: schedule.emailRecipients,
      isEnabled: !schedule.isEnabled,
    });
  }

  protected async run(schedule: ScheduledReport): Promise<void> {
    this.selectedScheduleId.set(schedule.id);
    await this.facade.runSchedule(schedule.id);
  }

  protected async remove(schedule: ScheduledReport): Promise<void> {
    const ok = await this.facade.deleteSchedule(schedule.id);
    if (ok && this.selectedScheduleId() === schedule.id) {
      this.selectedScheduleId.set(null);
    }
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Failed':
        return 'danger';
      case 'Pending':
      case 'Running':
        return 'info';
      case 'Succeeded':
        return 'success';
      case 'Skipped':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
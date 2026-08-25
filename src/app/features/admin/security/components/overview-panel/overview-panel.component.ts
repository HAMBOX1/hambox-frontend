import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';

import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { CountryFailureCountDto, SecurityEventDto } from '../../models/security.model';
import { SecurityManagementFacade } from '../../services/security-management.facade';
import { activateOnceWhenTrue } from '../../utils/lazy-tab-activation';
import { buildLoginTrendChart } from '../../utils/security-chart.util';

export interface RankedCountryFailure extends CountryFailureCountDto {
  readonly sharePercent: number;
}

@Component({
  selector: 'app-security-overview-panel',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    NgApexchartsModule,
    AdminErrorAlertComponent,
    AdminEmptyStateComponent,
    AdminSectionCardComponent,
    AdminStatCardComponent,
    AdminStatGridComponent,
    AdminStatusBadgeComponent,
  ],
  templateUrl: './overview-panel.component.html',
  styleUrl: './overview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPanelComponent {
  readonly active = input(false);

  protected readonly facade = inject(SecurityManagementFacade);

  /** Emitted when the admin wants to jump from an alert preview row to the full Alerts tab. */
  readonly viewAlerts = output<void>();

  protected readonly failedLoginTrend = computed(() => {
    const dashboard = this.facade.dashboard();
    if (!dashboard) return 0;
    return dashboard.failedLoginsLast24h - dashboard.failedLoginsPrevious24h;
  });

  protected readonly loginTrendChart = computed(() => buildLoginTrendChart(this.facade.dashboard()?.loginTrend ?? []));

  /** Same `topFailureCountries` data as before, just ranked with a computed share-of-total —
   * a compact list reads faster than a chart for the typical 3-5 rows this shows. */
  protected readonly rankedFailureCountries = computed<readonly RankedCountryFailure[]>(() => {
    const items = this.facade.dashboard()?.topFailureCountries ?? [];
    const total = items.reduce((sum, item) => sum + item.failedLogins, 0);
    return items.map((item) => ({
      ...item,
      sharePercent: total > 0 ? Math.round((item.failedLogins / total) * 100) : 0,
    }));
  });

  /** Highest severity present in the open-alerts preview — drives the status bar's tone/wording. */
  protected readonly highestOpenSeverity = computed(() => {
    const alerts = this.facade.dashboard()?.openAlertsPreview ?? [];
    const order: Record<SecurityEventDto['severity'], number> = { Critical: 3, High: 2, Medium: 1, Low: 0 };
    return alerts.reduce<SecurityEventDto['severity'] | null>(
      (highest, alert) => (!highest || order[alert.severity] > order[highest] ? alert.severity : highest),
      null,
    );
  });

  /** Most recent open-alert preview row, if any — the status bar's "last activity" line. */
  protected readonly lastActivity = computed(() => this.facade.dashboard()?.openAlertsPreview[0] ?? null);

  constructor() {
    activateOnceWhenTrue(this.active, () => void this.facade.loadDashboard());
  }

  protected retry(): void {
    void this.facade.loadDashboard();
  }

  protected severityTone(severity: string) {
    switch (severity) {
      case 'Critical':
      case 'High':
        return 'danger' as const;
      case 'Medium':
        return 'warning' as const;
      default:
        return 'neutral' as const;
    }
  }

  protected affectedResource(alert: SecurityEventDto): string {
    return alert.targetEmail ?? alert.actorEmail ?? alert.ipAddress ?? '—';
  }
}

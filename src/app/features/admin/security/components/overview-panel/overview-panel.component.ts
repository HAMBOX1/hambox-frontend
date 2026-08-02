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
import { SecurityManagementFacade } from '../../services/security-management.facade';
import { activateOnceWhenTrue } from '../../utils/lazy-tab-activation';
import { buildLoginTrendChart, buildTopFailureCountriesChart } from '../../utils/security-chart.util';

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
  protected readonly topFailureCountriesChart = computed(() =>
    buildTopFailureCountriesChart(this.facade.dashboard()?.topFailureCountries ?? []),
  );

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
}

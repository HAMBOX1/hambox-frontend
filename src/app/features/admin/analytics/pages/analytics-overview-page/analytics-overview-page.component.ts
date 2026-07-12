import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';

import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
} from '../../../../../shared/components/admin';
import { AnalyticsFacade } from '../../services/analytics.facade';
import { buildBarChart, buildLineChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-overview-page',
  standalone: true,
  imports: [
    DecimalPipe,
    TranslatePipe,
    NgApexchartsModule,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './analytics-overview-page.component.html',
  styleUrl: './analytics-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsOverviewPageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.overview;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly revenueChart = computed(() => {
    const series = this.data()?.revenueSeries ?? [];
    return buildLineChart(series, 'Revenue', true);
  });

  protected readonly ordersChart = computed(() => {
    const series = this.data()?.ordersSeries ?? [];
    return buildBarChart(series, 'Orders');
  });

  ngOnInit(): void {
    void this.facade.loadOverview();
  }

  protected formatGrowth(percent: number | null | undefined): string {
    if (percent == null) {
      return '—';
    }
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  }
}
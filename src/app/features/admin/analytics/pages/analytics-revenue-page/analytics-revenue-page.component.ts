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
import { TableModule } from 'primeng/table';

import {
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
} from '../../../../../shared/components/admin';
import { AnalyticsFacade } from '../../services/analytics.facade';
import { buildDonutChart, buildLineChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-revenue-page',
  standalone: true,
  imports: [
    DecimalPipe,
    TranslatePipe,
    NgApexchartsModule,
    TableModule,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './analytics-revenue-page.component.html',
  styleUrl: './analytics-revenue-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsRevenuePageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.revenue;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly seriesChart = computed(() =>
    buildLineChart(this.data()?.series ?? [], 'Revenue', true),
  );

  protected readonly categoryDonut = computed(() =>
    buildDonutChart(this.data()?.byCategory ?? []),
  );

  ngOnInit(): void {
    void this.facade.loadRevenue();
  }
}
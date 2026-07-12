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
import { buildLineChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-operations-page',
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
  templateUrl: './analytics-operations-page.component.html',
  styleUrl: './analytics-operations-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsOperationsPageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.operations;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly failedJobsChart = computed(() =>
    buildLineChart(this.data()?.failedJobsSeries ?? [], 'Failed jobs'),
  );
  protected readonly api5xxChart = computed(() =>
    buildLineChart(this.data()?.api5xxSeries ?? [], 'API 5xx'),
  );

  ngOnInit(): void {
    void this.facade.loadOperations();
  }

  protected formatSeconds(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return `${value.toFixed(1)}s`;
  }

  protected formatPercent(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return `${value.toFixed(1)}%`;
  }
}
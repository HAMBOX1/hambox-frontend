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
import { buildBarChart, buildDonutChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-orders-page',
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
  templateUrl: './analytics-orders-page.component.html',
  styleUrl: './analytics-orders-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsOrdersPageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.orders;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly statusDonut = computed(() => buildDonutChart(this.data()?.byStatus ?? []));
  protected readonly seriesChart = computed(() => buildBarChart(this.data()?.series ?? [], 'Orders'));

  ngOnInit(): void {
    void this.facade.loadOrders();
  }

  protected formatSeconds(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return `${value.toFixed(1)}s`;
  }
}
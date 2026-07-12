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
} from '../../../../../shared/components/admin';
import { AnalyticsFacade } from '../../services/analytics.facade';
import { buildDonutChart, buildLineChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-categories-page',
  standalone: true,
  imports: [
    DecimalPipe,
    TranslatePipe,
    NgApexchartsModule,
    TableModule,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './analytics-categories-page.component.html',
  styleUrl: './analytics-categories-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsCategoriesPageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.categories;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly revenueDonut = computed(() => buildDonutChart(this.data()?.byRevenue ?? []));
  protected readonly seriesChart = computed(() =>
    buildLineChart(this.data()?.series ?? [], 'Categories'),
  );

  ngOnInit(): void {
    void this.facade.loadCategories();
  }
}
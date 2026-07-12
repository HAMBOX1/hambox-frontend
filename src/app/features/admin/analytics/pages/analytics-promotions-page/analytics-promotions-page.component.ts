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
import { buildBarChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-promotions-page',
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
  templateUrl: './analytics-promotions-page.component.html',
  styleUrl: './analytics-promotions-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPromotionsPageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.promotions;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly seriesChart = computed(() =>
    buildBarChart(this.data()?.series ?? [], 'Redemptions'),
  );

  ngOnInit(): void {
    void this.facade.loadPromotions();
  }
}
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
import { buildDonutChart, buildLineChart } from '../../utils/analytics-chart.util';

@Component({
  selector: 'app-analytics-memberships-page',
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
  templateUrl: './analytics-memberships-page.component.html',
  styleUrl: './analytics-memberships-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsMembershipsPageComponent implements OnInit {
  private readonly facade = inject(AnalyticsFacade);

  protected readonly data = this.facade.memberships;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  protected readonly planDonut = computed(() =>
    buildDonutChart(this.data()?.revenueByPlan ?? []),
  );
  protected readonly seriesChart = computed(() =>
    buildLineChart(this.data()?.series ?? [], 'Memberships'),
  );

  ngOnInit(): void {
    void this.facade.loadMemberships();
  }
}
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { AnalyticsFiltersComponent } from '../../components/analytics-filters/analytics-filters.component';
import { AnalyticsFacade } from '../../services/analytics.facade';

@Component({
  selector: 'app-analytics-shell-page',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AnalyticsFiltersComponent,
  ],
  providers: [AnalyticsFacade],
  templateUrl: './analytics-shell-page.component.html',
  styleUrl: './analytics-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsShellPageComponent {
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Analytics' });

  protected readonly navItems = [
    { path: 'overview', labelKey: 'ADMIN.ANALYTICS.NAV.OVERVIEW' },
    { path: 'revenue', labelKey: 'ADMIN.ANALYTICS.NAV.REVENUE' },
    { path: 'orders', labelKey: 'ADMIN.ANALYTICS.NAV.ORDERS' },
    { path: 'products', labelKey: 'ADMIN.ANALYTICS.NAV.PRODUCTS' },
    { path: 'categories', labelKey: 'ADMIN.ANALYTICS.NAV.CATEGORIES' },
    { path: 'customers', labelKey: 'ADMIN.ANALYTICS.NAV.CUSTOMERS' },
    { path: 'memberships', labelKey: 'ADMIN.ANALYTICS.NAV.MEMBERSHIPS' },
    { path: 'promotions', labelKey: 'ADMIN.ANALYTICS.NAV.PROMOTIONS' },
    { path: 'referrals', labelKey: 'ADMIN.ANALYTICS.NAV.REFERRALS' },
    { path: 'search', labelKey: 'ADMIN.ANALYTICS.NAV.SEARCH' },
    { path: 'operations', labelKey: 'ADMIN.ANALYTICS.NAV.OPERATIONS' },
  ] as const;
}
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { ReportsFiltersComponent } from '../../components/reports-filters/reports-filters.component';
import { ReportsFacade } from '../../services/reports.facade';

@Component({
  selector: 'app-reports-shell-page',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    ReportsFiltersComponent,
  ],
  providers: [ReportsFacade],
  templateUrl: './reports-shell-page.component.html',
  styleUrl: './reports-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsShellPageComponent {
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Reports' });

  protected readonly navItems = [
    { path: './', labelKey: 'ADMIN.REPORTS.NAV.LIBRARY', exact: true },
    { path: 'generate', labelKey: 'ADMIN.REPORTS.NAV.GENERATE', exact: false },
    { path: 'downloads', labelKey: 'ADMIN.REPORTS.NAV.DOWNLOADS', exact: false },
    { path: 'schedules', labelKey: 'ADMIN.REPORTS.NAV.SCHEDULES', exact: false },
  ] as const;
}
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

import { AdminPageHeaderComponent, AdminStatCardComponent, AdminStatGridComponent } from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { LegalManagementFacade } from '../../services/legal-management.facade';

@Component({
  selector: 'app-legal-dashboard-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, ButtonModule, AdminPageHeaderComponent, AdminStatGridComponent, AdminStatCardComponent],
  providers: [LegalManagementFacade],
  templateUrl: './legal-dashboard-page.component.html',
  styleUrl: './legal-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalDashboardPageComponent implements OnInit {
  protected readonly facade = inject(LegalManagementFacade);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Legal Center' });
  protected readonly loading = this.facade.documentsLoading;

  protected readonly stats = computed(() => {
    const sections = this.facade.documents();
    return {
      total: sections.length,
      published: sections.filter((s) => s.hasPublishedVersion && !s.isArchived).length,
      draft: sections.filter((s) => !s.hasPublishedVersion && !s.isArchived).length,
      archived: sections.filter((s) => s.isArchived).length,
    };
  });

  ngOnInit(): void {
    void this.facade.loadDocuments();
  }
}

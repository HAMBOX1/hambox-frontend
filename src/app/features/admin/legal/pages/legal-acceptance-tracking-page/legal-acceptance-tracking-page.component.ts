import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';

import { AdminDataTableShellComponent, AdminEmptyStateComponent, AdminPageHeaderComponent } from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { LegalManagementFacade } from '../../services/legal-management.facade';

@Component({
  selector: 'app-legal-acceptance-tracking-page',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslatePipe, TableModule, AdminPageHeaderComponent, AdminDataTableShellComponent, AdminEmptyStateComponent],
  providers: [LegalManagementFacade],
  templateUrl: './legal-acceptance-tracking-page.component.html',
  styleUrl: './legal-acceptance-tracking-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalAcceptanceTrackingPageComponent implements OnInit {
  protected readonly facade = inject(LegalManagementFacade);

  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Legal Center' });
  protected readonly sections = this.facade.documents;
  protected readonly loading = this.facade.documentsLoading;

  ngOnInit(): void {
    void this.facade.loadDocuments({ requireAcceptance: true });
  }
}

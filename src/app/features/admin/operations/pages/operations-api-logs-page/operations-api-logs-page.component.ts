import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { OperationsFacade } from '../../services/operations.facade';

@Component({
  selector: 'app-operations-api-logs-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    TableModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [OperationsFacade],
  templateUrl: './operations-api-logs-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsApiLogsPageComponent implements OnInit {
  private readonly facade = inject(OperationsFacade);
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Operations', route: '/admin/operations' },
    { label: 'API Logs' },
  );
  protected readonly apiLogs = this.facade.apiLogs;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly path = signal('');
  protected readonly userId = signal('');
  protected readonly minStatus = signal<number | null>(null);
  protected readonly rows = computed(() => this.apiLogs()?.items ?? []);

  ngOnInit(): void {
    void this.reload();
  }

  protected async reload(): Promise<void> {
    await this.facade.loadApiLogs({
      path: this.path() || undefined,
      userId: this.userId() || undefined,
      minStatusCode: this.minStatus() ?? undefined,
      page: 1,
      pageSize: 50,
    });
  }

  protected tone(code: number): AdminStatusTone {
    if (code >= 500) return 'danger';
    if (code >= 400) return 'warning';
    return 'success';
  }
}

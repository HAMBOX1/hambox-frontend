import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CommunicationMessageListItemDto } from '../../models/communication.model';
import { CommunicationFacade } from '../../services/communication.facade';

@Component({
  selector: 'app-communication-failed-deliveries-page',
  standalone: true,
  imports: [
    TranslatePipe,
    ButtonModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
  ],
  providers: [CommunicationFacade, MessageService],
  templateUrl: './communication-failed-deliveries-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunicationFailedDeliveriesPageComponent implements OnInit {
  protected readonly facade = inject(CommunicationFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Communication', route: '/admin/communication' },
    { label: 'Failed Deliveries' },
  );

  protected readonly result = this.facade.failedDeliveries;
  protected readonly loading = this.facade.failedLoading;
  protected readonly error = this.facade.failedError;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);

  protected readonly items = computed(() => this.result()?.items ?? []);
  protected readonly totalCount = computed(() => this.result()?.totalCount ?? 0);
  protected readonly tableFirst = computed(() => (this.page() - 1) * this.pageSize());

  ngOnInit(): void {
    this.reload();
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize();
    const first = event.first ?? 0;
    this.pageSize.set(rows);
    this.page.set(Math.floor(first / rows) + 1);
    this.reload();
  }

  protected retryLoad(): void {
    this.reload();
  }

  protected async retryDelivery(message: CommunicationMessageListItemDto): Promise<void> {
    const success = await this.facade.retryDelivery(message.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.COMMUNICATION.FAILED_DELIVERIES.MESSAGES.RETRIED'),
        life: 4000,
      });
      this.reload();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.COMMUNICATION.FAILED_DELIVERIES.MESSAGES.RETRY_FAILED'),
      detail: this.facade.failedError() ?? '',
      life: 5000,
    });
  }

  private reload(): void {
    void this.facade.loadFailedDeliveries(this.page(), this.pageSize());
  }
}

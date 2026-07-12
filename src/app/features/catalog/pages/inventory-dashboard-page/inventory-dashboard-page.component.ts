import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HamboxCurrencyPipe } from '../../../../shared/pipes/hambox-currency.pipe';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { InventoryManagementFacade } from '../../services/inventory-management.facade';

@Component({
  selector: 'app-inventory-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    ButtonModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    HamboxCurrencyPipe,
    DatePipe,
  ],
  providers: [InventoryManagementFacade, MessageService],
  templateUrl: './inventory-dashboard-page.component.html',
  styleUrl: './inventory-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDashboardPageComponent implements OnInit {
  private readonly facade = inject(InventoryManagementFacade);
  private readonly messageService = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Inventory', route: '/admin/inventory' },
    { label: 'Dashboard' },
  );
  protected readonly statistics = this.facade.statistics;
  protected readonly reservations = this.facade.reservations;
  protected readonly reservationsTable = computed(() => [...this.facade.reservations()]);
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;

  ngOnInit(): void {
    void this.facade.loadDashboard();
  }

  protected async releaseReservation(codeId: string): Promise<void> {
    const released = await this.facade.releaseReservation(codeId);
    if (released) {
      this.messageService.add({
        severity: 'success',
        summary: 'Reservation released',
        detail: 'The code is available again.',
        life: 3000,
      });
    }
  }
}

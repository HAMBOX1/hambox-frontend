import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { SUPPLIER_STATUS_OPTIONS, SupplierListItemDto } from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

@Component({
  selector: 'app-suppliers-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [SuppliersManagementFacade, MessageService],
  templateUrl: './suppliers-list-page.component.html',
  styleUrl: './suppliers-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersListPageComponent implements OnInit {
  protected readonly facade = inject(SuppliersManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Suppliers' });
  protected readonly statusOptions = [...SUPPLIER_STATUS_OPTIONS];

  protected readonly list = this.facade.list;
  protected readonly loading = this.facade.listLoading;
  protected readonly error = this.facade.listError;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);

  protected readonly suppliers = computed(() => this.list()?.items ?? []);
  protected readonly totalCount = computed(() => this.list()?.totalCount ?? 0);
  protected readonly tableFirst = computed(() => (this.page() - 1) * this.pageSize());
  protected readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all',
  );

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<SupplierListItemDto | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    this.reload();
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
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

  protected navigateToNew(): void {
    void this.router.navigate(['/admin/suppliers/new']);
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Suspended':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected async enableSupplier(supplier: SupplierListItemDto): Promise<void> {
    const success = await this.facade.enableSupplier(supplier.id);
    this.showActionResult(success, 'ADMIN.SUPPLIERS.MESSAGES.ENABLED', 'ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED');
    this.reload();
  }

  protected async disableSupplier(supplier: SupplierListItemDto): Promise<void> {
    const success = await this.facade.disableSupplier(supplier.id);
    this.showActionResult(success, 'ADMIN.SUPPLIERS.MESSAGES.DISABLED', 'ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED');
    this.reload();
  }

  protected requestDelete(supplier: SupplierListItemDto): void {
    this.deleteTarget.set(supplier);
    this.deleteDialogOpen.set(true);
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  protected deleteDialogMessage(): string {
    const supplier = this.deleteTarget();
    return supplier ? this.translate.instant('ADMIN.CONFIRM.DELETE_SUPPLIER', { name: supplier.name }) : '';
  }

  protected async confirmDelete(): Promise<void> {
    const supplier = this.deleteTarget();
    if (!supplier) {
      return;
    }

    const success = await this.facade.deleteSupplier(supplier.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.DELETED'),
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      this.reload();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.SUPPLIERS.MESSAGES.ACTION_FAILED'),
      detail: this.facade.listError() ?? '',
      life: 5000,
    });
  }

  protected actionMenuItems(supplier: SupplierListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    items.push({
      label: t('ADMIN.SUPPLIERS.ACTIONS.MAPPINGS'),
      icon: 'pi pi-sitemap',
      routerLink: ['/admin/suppliers', supplier.id, 'mappings'],
    });

    if (this.permissionService.hasPermission(this.permissions.Suppliers.Edit)) {
      items.push(
        supplier.isEnabled
          ? {
              label: t('ADMIN.SUPPLIERS.ACTIONS.DISABLE'),
              icon: 'pi pi-ban',
              disabled: this.actionLoading(),
              command: () => void this.disableSupplier(supplier),
            }
          : {
              label: t('ADMIN.SUPPLIERS.ACTIONS.ENABLE'),
              icon: 'pi pi-check',
              disabled: this.actionLoading(),
              command: () => void this.enableSupplier(supplier),
            },
      );
    }

    if (this.permissionService.hasPermission(this.permissions.Suppliers.Delete)) {
      items.push({
        label: t('ADMIN.SUPPLIERS.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDelete(supplier),
      });
    }

    return items;
  }

  private reload(): void {
    void this.facade.loadSuppliers(this.searchTerm(), this.statusFilter(), this.page(), this.pageSize());
  }

  private showActionResult(success: boolean, successKey: string, failKey: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant(successKey), life: 4000 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(failKey),
      detail: this.facade.listError() ?? '',
      life: 5000,
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { CurrencyService } from '../../../../../core/currency/currency.service';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminBulkBarComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  AdminOrderListItemDto,
  ORDER_COLUMN_KEYS,
  ORDER_DATE_RANGE_OPTIONS,
  ORDER_DELIVERY_OPTIONS,
  ORDER_PAYMENT_OPTIONS,
  ORDER_SORT_OPTIONS,
  ORDER_STATUS_OPTIONS,
  OrderColumnKey,
} from '../../models/order-api.model';
import { OrderManagementFacade } from '../../services/order-management.facade';
import { exportOrdersToCsv, exportOrdersToExcel } from '../../utils/order-export.util';

@Component({
  selector: 'app-orders-list-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
    ToastModule,
    HamboxCurrencyPipe,
    AdminPageHeaderComponent,
    AdminStatCardComponent,
    AdminStatGridComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminStatusBadgeComponent,
    AdminBulkBarComponent,
    HasPermissionDirective,
  ],
  providers: [OrderManagementFacade, MessageService],
  templateUrl: './orders-list-page.component.html',
  styleUrl: './orders-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersListPageComponent implements OnInit {
  private readonly facade = inject(OrderManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  private readonly currencyService = inject(CurrencyService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Orders' });
  protected readonly statusOptions = [...ORDER_STATUS_OPTIONS];
  protected readonly deliveryOptions = [...ORDER_DELIVERY_OPTIONS];
  protected readonly paymentOptions = [...ORDER_PAYMENT_OPTIONS];
  protected readonly dateRangeOptions = [...ORDER_DATE_RANGE_OPTIONS];
  protected readonly sortOptions = [...ORDER_SORT_OPTIONS];

  protected readonly orders = this.facade.orders;
  protected readonly loading = this.facade.ordersLoading;
  protected readonly error = this.facade.ordersError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly orderStatusFilter = this.facade.orderStatusFilter;
  protected readonly deliveryStatusFilter = this.facade.deliveryStatusFilter;
  protected readonly paymentStatusFilter = this.facade.paymentStatusFilter;
  protected readonly dateRangeFilter = this.facade.dateRangeFilter;
  protected readonly minAmount = this.facade.minAmount;
  protected readonly maxAmount = this.facade.maxAmount;
  protected readonly sort = this.facade.sort;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly statistics = this.facade.statistics;
  protected readonly statisticsLoading = this.facade.statisticsLoading;
  protected readonly statisticsError = this.facade.statisticsError;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly selectedOrders = signal<AdminOrderListItemDto[]>([]);
  protected readonly customDateDialogOpen = signal(false);
  protected readonly customDateFrom = signal('');
  protected readonly customDateTo = signal('');
  protected readonly amountMinInput = signal<number | null>(null);
  protected readonly amountMaxInput = signal<number | null>(null);
  protected readonly filtersOpen = signal(false);
  protected readonly advancedFiltersOpen = signal(false);

  protected readonly pageSizeOptions = [
    { label: '10 / page', value: 10 },
    { label: '20 / page', value: 20 },
    { label: '50 / page', value: 50 },
  ];

  private readonly columnLabelKeys: Record<OrderColumnKey, string> = {
    orderNumber: 'ADMIN.ORDERS.LIST.COLUMNS.ORDER_NUMBER',
    customer: 'ADMIN.ORDERS.LIST.COLUMNS.CUSTOMER',
    email: 'ADMIN.ORDERS.LIST.COLUMNS.EMAIL',
    itemsCount: 'ADMIN.ORDERS.LIST.COLUMNS.ITEMS',
    products: 'ADMIN.ORDERS.LIST.COLUMNS.PRODUCTS',
    orderTotal: 'ADMIN.ORDERS.LIST.COLUMNS.TOTAL',
    paymentMethod: 'ADMIN.ORDERS.LIST.COLUMNS.PAYMENT_METHOD',
    paymentStatus: 'ADMIN.ORDERS.LIST.COLUMNS.PAYMENT_STATUS',
    orderStatus: 'ADMIN.ORDERS.LIST.COLUMNS.ORDER_STATUS',
    purchaseDate: 'ADMIN.ORDERS.LIST.COLUMNS.PURCHASE_DATE',
    deliveryStatus: 'ADMIN.ORDERS.LIST.COLUMNS.DELIVERY',
    membershipDiscount: 'ADMIN.ORDERS.LIST.COLUMNS.MEMBERSHIP',
    coupon: 'ADMIN.ORDERS.LIST.COLUMNS.COUPON',
  };

  protected readonly columnOptions = ORDER_COLUMN_KEYS.map((key) => ({
    label: this.translate.instant(this.columnLabelKeys[key]),
    value: key,
  }));

  protected readonly visibleColumns = signal<readonly OrderColumnKey[]>([...ORDER_COLUMN_KEYS]);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  ngOnInit(): void {
    this.facade.loadOrders();
    this.facade.loadStatistics();
  }

  protected isColumnVisible(key: OrderColumnKey): boolean {
    return this.visibleColumns().includes(key);
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusChange(value: string): void {
    this.facade.setOrderStatusFilter(value);
  }

  protected onDeliveryChange(value: string): void {
    this.facade.setDeliveryStatusFilter(value);
  }

  protected onPaymentChange(value: string): void {
    this.facade.setPaymentStatusFilter(value);
  }

  protected onDateRangeChange(value: string): void {
    if (value === 'custom') {
      this.customDateDialogOpen.set(true);
      return;
    }
    this.facade.setDateRangeFilter(value);
  }

  protected onSortChange(value: string): void {
    this.facade.setSort(value);
  }

  protected applyCustomDateRange(): void {
    this.facade.setCustomDateRange(
      this.customDateFrom() || null,
      this.customDateTo() || null,
    );
    this.customDateDialogOpen.set(false);
  }

  protected applyAmountFilter(): void {
    this.facade.setAmountRange(this.amountMinInput(), this.amountMaxInput());
  }

  protected clearFilters(): void {
    this.amountMinInput.set(null);
    this.amountMaxInput.set(null);
    this.facade.clearFilters();
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected toggleAdvancedFilters(): void {
    this.advancedFiltersOpen.update((open) => !open);
  }

  protected onPageSizeChange(pageSize: number): void {
    this.facade.setPage(1, pageSize);
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const pageSize = event.rows ?? this.facade.pageSize();
    const pageNumber = Math.floor((event.first ?? 0) / pageSize) + 1;
    this.facade.setPage(pageNumber, pageSize);
  }

  protected onSelectionChange(selection: AdminOrderListItemDto[]): void {
    this.selectedOrders.set(selection);
  }

  protected clearSelection(): void {
    this.selectedOrders.set([]);
  }

  protected async bulkAction(action: string): Promise<void> {
    const ids = this.selectedOrders().map((o) => o.id);
    const result = await this.facade.bulkOrders(action, ids);
    if (!result) return;

    if (result.failureCount === 0) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.ORDERS.ACTIONS.BULK_SUCCESS', {
          count: result.successCount,
        }),
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('ADMIN.ORDERS.ACTIONS.BULK_PARTIAL', {
          success: result.successCount,
          failed: result.failureCount,
        }),
      });
    }

    this.clearSelection();
  }

  protected retryLoad(): void {
    this.facade.loadOrders();
    this.facade.loadStatistics();
  }

  protected exportCsv(): void {
    exportOrdersToCsv(this.orders());
    this.toastSuccess('ADMIN.ORDERS.ACTIONS.EXPORT_CSV');
  }

  protected exportExcel(): void {
    exportOrdersToExcel(this.orders());
    this.toastSuccess('ADMIN.ORDERS.ACTIONS.EXPORT_EXCEL');
  }

  protected printTable(): void {
    window.print();
  }

  protected orderActionMenuItems(order: AdminOrderListItemDto): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: this.translate.instant('ADMIN.ORDERS.ACTIONS.VIEW'),
        icon: 'pi pi-eye',
        routerLink: ['/admin/orders', order.id],
      },
      {
        label: this.translate.instant('ADMIN.ORDERS.ACTIONS.COPY_ID'),
        icon: 'pi pi-copy',
        command: () => void navigator.clipboard.writeText(order.id),
      },
    ];

    if (this.permissionService.hasPermission(PERMISSIONS.Orders.Edit)) {
      items.push({
        label: this.translate.instant('ADMIN.ORDERS.ACTIONS.RESEND_CODES'),
        icon: 'pi pi-send',
        command: () => void this.facade.resendCodes(order.id),
      });
    }

    return items;
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Completed':
      case 'Delivered':
      case 'Paid':
        return 'success';
      case 'Processing':
      case 'Partially Delivered':
        return 'info';
      case 'Pending':
      case 'Awaiting Delivery':
        return 'warning';
      case 'Cancelled':
      case 'Failed':
        return 'danger';
      case 'Refunded':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected formatMoney(amount: number | null | undefined): string {
    return this.currencyService.format(amount ?? 0);
  }

  private toastSuccess(key: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant(key),
    });
  }
}

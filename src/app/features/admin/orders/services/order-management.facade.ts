import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ORDERS_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  AdminOrderDetailDto,
  AdminOrderListItemDto,
  AdminOrderListResult,
  AdminOrderStatisticsDto,
  BulkAdminOrdersResultDto,
  RetryAdminOrderFulfillmentResultDto,
} from '../models/order-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class OrderManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly ordersState = signal<readonly AdminOrderListItemDto[]>([]);
  private readonly ordersLoadingState = signal(false);
  private readonly ordersErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly orderStatusFilterState = signal('all');
  private readonly deliveryStatusFilterState = signal('all');
  private readonly paymentStatusFilterState = signal('all');
  private readonly dateRangeFilterState = signal('all');
  private readonly dateFromState = signal<string | null>(null);
  private readonly dateToState = signal<string | null>(null);
  private readonly minAmountState = signal<number | null>(null);
  private readonly maxAmountState = signal<number | null>(null);
  private readonly sortState = signal('newest');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly hasLoadedOrdersState = signal(false);

  private readonly statisticsState = signal<AdminOrderStatisticsDto | null>(null);
  private readonly statisticsLoadingState = signal(false);
  private readonly statisticsErrorState = signal<string | null>(null);

  private readonly detailState = signal<AdminOrderDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly orders = this.ordersState.asReadonly();
  readonly ordersLoading = this.ordersLoadingState.asReadonly();
  readonly ordersError = this.ordersErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly orderStatusFilter = this.orderStatusFilterState.asReadonly();
  readonly deliveryStatusFilter = this.deliveryStatusFilterState.asReadonly();
  readonly paymentStatusFilter = this.paymentStatusFilterState.asReadonly();
  readonly dateRangeFilter = this.dateRangeFilterState.asReadonly();
  readonly dateFrom = this.dateFromState.asReadonly();
  readonly dateTo = this.dateToState.asReadonly();
  readonly minAmount = this.minAmountState.asReadonly();
  readonly maxAmount = this.maxAmountState.asReadonly();
  readonly sort = this.sortState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly statistics = this.statisticsState.asReadonly();
  readonly statisticsLoading = this.statisticsLoadingState.asReadonly();
  readonly statisticsError = this.statisticsErrorState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();

  readonly hasActiveFilters = computed(
    () =>
      this.searchTermState().trim().length > 0 ||
      this.orderStatusFilterState() !== 'all' ||
      this.deliveryStatusFilterState() !== 'all' ||
      this.paymentStatusFilterState() !== 'all' ||
      this.dateRangeFilterState() !== 'all' ||
      this.minAmountState() != null ||
      this.maxAmountState() != null,
  );

  loadOrders(): void {
    void this.fetchOrders(true);
  }

  reloadOrders(): Promise<void> {
    return this.fetchOrders(true);
  }

  loadStatistics(): void {
    void this.fetchStatistics();
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleOrdersReload();
  }

  setOrderStatusFilter(status: string): void {
    this.orderStatusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  setDeliveryStatusFilter(status: string): void {
    this.deliveryStatusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  setPaymentStatusFilter(status: string): void {
    this.paymentStatusFilterState.set(status);
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  setDateRangeFilter(range: string): void {
    this.dateRangeFilterState.set(range);
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  setCustomDateRange(from: string | null, to: string | null): void {
    this.dateFromState.set(from);
    this.dateToState.set(to);
    this.dateRangeFilterState.set('custom');
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  setAmountRange(min: number | null, max: number | null): void {
    this.minAmountState.set(min);
    this.maxAmountState.set(max);
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  setSort(sort: string): void {
    this.sortState.set(sort);
    void this.fetchOrders();
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (
      this.pageNumberState() === pageNumber &&
      this.pageSizeState() === pageSize &&
      this.hasLoadedOrdersState()
    ) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchOrders();
  }

  clearFilters(): void {
    this.searchTermState.set('');
    this.orderStatusFilterState.set('all');
    this.deliveryStatusFilterState.set('all');
    this.paymentStatusFilterState.set('all');
    this.dateRangeFilterState.set('all');
    this.dateFromState.set(null);
    this.dateToState.set(null);
    this.minAmountState.set(null);
    this.maxAmountState.set(null);
    this.pageNumberState.set(1);
    void this.fetchOrders();
  }

  async loadDetail(orderId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<AdminOrderDetailDto>(ORDERS_API.order(orderId)),
      );
      this.detailState.set(detail);
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      this.detailState.set(null);
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  async updateStatus(orderId: string, status: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      const detail = await firstValueFrom(
        this.api.patch<AdminOrderDetailDto>(ORDERS_API.status(orderId), { status }),
      );
      this.detailState.set(detail);
      await this.fetchOrders(true);
      await this.fetchStatistics();
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async refundOrder(orderId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      const detail = await firstValueFrom(
        this.api.post<AdminOrderDetailDto>(ORDERS_API.refund(orderId), {}),
      );
      this.detailState.set(detail);
      await this.fetchOrders(true);
      await this.fetchStatistics();
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async resendCodes(orderId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      await firstValueFrom(this.api.post<void>(ORDERS_API.resendCodes(orderId), {}));
      await this.loadDetail(orderId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async saveNote(orderId: string, body: string, noteId?: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      if (noteId) {
        await firstValueFrom(this.api.put<void>(ORDERS_API.note(orderId, noteId), { body }));
      } else {
        await firstValueFrom(this.api.post<void>(ORDERS_API.notes(orderId), { body }));
      }
      await this.loadDetail(orderId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async revealLicenseKey(orderId: string, licenseKeyId: string): Promise<string | null> {
    try {
      const result = await firstValueFrom(
        this.api.get<{ licenseKey: string }>(ORDERS_API.revealLicenseKey(orderId, licenseKeyId)),
      );
      return result.licenseKey;
    } catch {
      return null;
    }
  }

  async bulkOrders(
    action: string,
    orderIds: readonly string[],
  ): Promise<BulkAdminOrdersResultDto | null> {
    if (orderIds.length === 0) {
      return null;
    }

    this.actionLoadingState.set(true);
    try {
      const result = await firstValueFrom(
        this.api.post<BulkAdminOrdersResultDto>(ORDERS_API.bulk, {
          action,
          orderIds,
        }),
      );
      await this.fetchOrders(true);
      await this.fetchStatistics();
      return result;
    } catch (error) {
      this.ordersErrorState.set(this.toErrorMessage(error));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async retryFulfillment(orderId: string): Promise<RetryAdminOrderFulfillmentResultDto | null> {
    this.actionLoadingState.set(true);
    try {
      const result = await firstValueFrom(
        this.api.post<RetryAdminOrderFulfillmentResultDto>(
          ORDERS_API.retryFulfillment(orderId),
          {},
        ),
      );
      await this.loadDetail(orderId);
      await this.fetchOrders(true);
      await this.fetchStatistics();
      return result;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async assignManualCode(
    orderId: string,
    orderItemId: string,
    licenseKey: string,
  ): Promise<boolean> {
    this.actionLoadingState.set(true);
    try {
      const detail = await firstValueFrom(
        this.api.post<AdminOrderDetailDto>(ORDERS_API.manualCode(orderId), {
          orderItemId,
          licenseKey,
        }),
      );
      this.detailState.set(detail);
      await this.fetchOrders(true);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async fetchOrders(force = false): Promise<void> {
    if (!force && this.ordersLoadingState()) {
      return;
    }

    this.ordersLoadingState.set(true);
    this.ordersErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<AdminOrderListResult>(ORDERS_API.orders, {
          params: this.buildListParams(),
        }),
      );

      this.ordersState.set(result.items);
      this.totalCountState.set(result.totalCount);
      this.pageNumberState.set(result.pageNumber);
      this.pageSizeState.set(result.pageSize);
      this.hasLoadedOrdersState.set(true);
    } catch (error) {
      this.ordersErrorState.set(this.toErrorMessage(error));
    } finally {
      this.ordersLoadingState.set(false);
    }
  }

  private async fetchStatistics(): Promise<void> {
    this.statisticsLoadingState.set(true);
    this.statisticsErrorState.set(null);

    try {
      const stats = await firstValueFrom(
        this.api.get<AdminOrderStatisticsDto>(ORDERS_API.statistics),
      );
      this.statisticsState.set(stats);
    } catch (error) {
      this.statisticsErrorState.set(this.toErrorMessage(error));
    } finally {
      this.statisticsLoadingState.set(false);
    }
  }

  private buildListParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      sort: this.sortState(),
    };

    const search = this.searchTermState().trim();
    if (search) params['searchTerm'] = search;

    if (this.orderStatusFilterState() !== 'all') {
      params['orderStatus'] = this.orderStatusFilterState();
    }
    if (this.deliveryStatusFilterState() !== 'all') {
      params['deliveryStatus'] = this.deliveryStatusFilterState();
    }
    if (this.paymentStatusFilterState() !== 'all') {
      params['paymentStatus'] = this.paymentStatusFilterState();
    }
    if (this.dateRangeFilterState() !== 'all') {
      params['dateRange'] = this.dateRangeFilterState();
    }
    if (this.dateFromState()) params['dateFrom'] = this.dateFromState()!;
    if (this.dateToState()) params['dateTo'] = this.dateToState()!;
    if (this.minAmountState() != null) params['minAmount'] = this.minAmountState()!;
    if (this.maxAmountState() != null) params['maxAmount'] = this.maxAmountState()!;

    return params;
  }

  private scheduleOrdersReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchOrders();
    }, SEARCH_DEBOUNCE_MS);
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  }
}

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OrderDetailApiDto, OrderSummaryApiDto } from '../models/account-api.model';
import { AccountApiService } from './account-api.service';

@Injectable({
  providedIn: 'root',
})
export class AccountOrdersFacade {
  private readonly api = inject(AccountApiService);

  private readonly ordersState = signal<readonly OrderSummaryApiDto[]>([]);
  private readonly selectedOrderState = signal<OrderDetailApiDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly detailLoadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly orders = this.ordersState.asReadonly();
  readonly selectedOrder = this.selectedOrderState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async loadOrders(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const result = await firstValueFrom(this.api.getOrders(1, 50));
      this.ordersState.set(result.items ?? []);
    } catch {
      this.ordersState.set([]);
      this.errorState.set('Unable to load your orders.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadOrder(orderId: string): Promise<OrderDetailApiDto | null> {
    this.detailLoadingState.set(true);
    this.errorState.set(null);

    try {
      const order = await firstValueFrom(this.api.getOrder(orderId));
      this.selectedOrderState.set(order);
      return order;
    } catch {
      this.selectedOrderState.set(null);
      this.errorState.set('Unable to load order details.');
      return null;
    } finally {
      this.detailLoadingState.set(false);
    }
  }
}

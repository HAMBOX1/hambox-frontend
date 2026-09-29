import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { PAYMENT_GATEWAYS_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  PaymentGatewayDetailDto,
  PaymentGatewayListItemDto,
  PaymentGatewayTestConnectionResultDto,
  UpdatePaymentGatewayCredentialsRequest,
  UpdatePaymentGatewayGeneralRequest,
} from '../models/payment-gateway.model';

@Injectable()
export class PaymentGatewaysManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly listState = signal<readonly PaymentGatewayListItemDto[]>([]);
  private readonly listLoadingState = signal(false);
  private readonly listErrorState = signal<string | null>(null);

  private readonly detailState = signal<PaymentGatewayDetailDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);
  private readonly savingState = signal(false);

  private readonly actionLoadingState = signal(false);
  private readonly testResultState = signal<PaymentGatewayTestConnectionResultDto | null>(null);

  readonly list = this.listState.asReadonly();
  readonly listLoading = this.listLoadingState.asReadonly();
  readonly listError = this.listErrorState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly testResult = this.testResultState.asReadonly();

  async loadGateways(): Promise<void> {
    this.listLoadingState.set(true);
    this.listErrorState.set(null);

    try {
      const result = await firstValueFrom(this.api.get<readonly PaymentGatewayListItemDto[]>(PAYMENT_GATEWAYS_API.gateways));
      this.listState.set(result ?? []);
    } catch (error) {
      this.listState.set([]);
      this.listErrorState.set(this.toErrorMessage(error, 'Failed to load payment gateways.'));
    } finally {
      this.listLoadingState.set(false);
    }
  }

  async loadDetail(gatewayKey: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);
    this.testResultState.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<PaymentGatewayDetailDto>(PAYMENT_GATEWAYS_API.gateway(gatewayKey)));
      this.detailState.set(detail);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load payment gateway.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  clearDetail(): void {
    this.detailState.set(null);
    this.testResultState.set(null);
  }

  async updateGeneral(gatewayKey: string, request: UpdatePaymentGatewayGeneralRequest): Promise<boolean> {
    return this.runSave(gatewayKey, () => this.api.put<void>(PAYMENT_GATEWAYS_API.gateway(gatewayKey), request));
  }

  async updateCredentials(gatewayKey: string, request: UpdatePaymentGatewayCredentialsRequest): Promise<boolean> {
    return this.runSave(gatewayKey, () => this.api.put<void>(PAYMENT_GATEWAYS_API.credentials(gatewayKey), request));
  }

  async enable(gatewayKey: string): Promise<boolean> {
    return this.runAction(gatewayKey, () => this.api.post<void>(PAYMENT_GATEWAYS_API.enable(gatewayKey)));
  }

  async disable(gatewayKey: string): Promise<boolean> {
    return this.runAction(gatewayKey, () => this.api.post<void>(PAYMENT_GATEWAYS_API.disable(gatewayKey)));
  }

  async testConnection(gatewayKey: string): Promise<void> {
    this.actionLoadingState.set(true);
    this.testResultState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.post<PaymentGatewayTestConnectionResultDto>(PAYMENT_GATEWAYS_API.testConnection(gatewayKey)),
      );
      this.testResultState.set(result);
    } catch (error) {
      this.testResultState.set({ isSuccess: false, message: this.toErrorMessage(error, 'Connection test failed.') });
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private async runSave(gatewayKey: string, action: () => import('rxjs').Observable<unknown>): Promise<boolean> {
    this.savingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(action());
      await this.loadDetail(gatewayKey);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to save.'));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private async runAction(gatewayKey: string, action: () => import('rxjs').Observable<unknown>): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(action());
      await this.loadDetail(gatewayKey);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Action failed.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      return error.message;
    }

    return fallback;
  }
}

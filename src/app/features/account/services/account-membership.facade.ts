import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ACCOUNT_API } from '../../../core/api/api-endpoints';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ApiError } from '../../../core/models/api-error.model';
import {
  ChangeMembershipPlanRequest,
  CurrentMembershipApiDto,
  MembershipHistoryApiDto,
  MembershipTransactionApiDto,
} from '../models/account-membership-api.model';

@Injectable({
  providedIn: 'root',
})
export class AccountMembershipFacade {
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  private readonly membershipState = signal<CurrentMembershipApiDto | null>(null);
  private readonly historyState = signal<readonly MembershipHistoryApiDto[]>([]);
  private readonly transactionsState = signal<readonly MembershipTransactionApiDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly actionLoadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly membership = this.membershipState.asReadonly();
  readonly history = this.historyState.asReadonly();
  readonly transactions = this.transactionsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly actionLoading = this.actionLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly subscription = computed(() => this.membershipState()?.subscription ?? null);
  readonly benefits = computed(() => this.membershipState()?.benefits ?? []);
  readonly availablePlans = computed(() => this.membershipState()?.availablePlans ?? []);

  readonly hasActiveSubscription = computed(() => {
    const subscription = this.subscription();
    return subscription?.status === 'Active'
      || subscription?.status === 'PendingRenewal'
      || subscription?.status === 'PendingPayment';
  });

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [membership, history, transactions] = await Promise.all([
        firstValueFrom(this.api.get<CurrentMembershipApiDto>(ACCOUNT_API.membership)),
        firstValueFrom(this.api.get<readonly MembershipHistoryApiDto[]>(ACCOUNT_API.membershipHistory)),
        firstValueFrom(this.api.get<readonly MembershipTransactionApiDto[]>(ACCOUNT_API.membershipTransactions)),
      ]);

      this.membershipState.set(membership);
      this.historyState.set(history ?? []);
      this.transactionsState.set(transactions ?? []);
    } catch (error) {
      this.membershipState.set(null);
      this.historyState.set([]);
      this.transactionsState.set([]);
      this.errorState.set(this.toErrorMessage(error, 'Unable to load your membership.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadMembershipSummary(): Promise<CurrentMembershipApiDto | null> {
    try {
      const membership = await firstValueFrom(
        this.api.get<CurrentMembershipApiDto>(ACCOUNT_API.membership),
      );
      this.membershipState.set(membership);
      return membership;
    } catch {
      return null;
    }
  }

  startCheckout(planId: string, action: 'subscribe' | 'upgrade' | 'downgrade' | 'renew'): void {
    void this.router.navigate(['/checkout/membership'], {
      queryParams: { planId, action },
    });
  }

  async upgrade(targetPlanId: string): Promise<boolean> {
    this.startCheckout(targetPlanId, 'upgrade');
    return true;
  }

  async downgrade(targetPlanId: string): Promise<boolean> {
    this.startCheckout(targetPlanId, 'downgrade');
    return true;
  }

  async subscribe(targetPlanId: string): Promise<boolean> {
    this.startCheckout(targetPlanId, 'subscribe');
    return true;
  }

  async renew(): Promise<boolean> {
    const planId = this.subscription()?.planId;
    if (!planId) {
      this.errorState.set('No active membership plan to renew.');
      return false;
    }

    this.startCheckout(planId, 'renew');
    return true;
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return fallback;
  }
}

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ACCOUNT_API } from '../api/api-endpoints';
import { ApiClientService } from '../api/api-client.service';
import { AuthSessionService } from '../auth/auth-session.service';

interface CurrentMembershipFeatureFlagsResponse {
  readonly featureFlags?: readonly string[];
  readonly subscription?: { readonly status?: string } | null;
}

/**
 * Centralized evaluation for the FeatureFlag membership benefit — mirrors PermissionService's
 * role for RBAC permissions. Consumers should never re-derive "does this member have X" by reading
 * MembershipBenefitDto rows themselves; go through hasFeature()/hamboxHasFeature so there is exactly
 * one place that knows how a plan's FeatureFlag benefits translate into an unlocked capability.
 */
@Injectable({ providedIn: 'root' })
export class MembershipFeatureService {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);

  private readonly flagsState = signal<readonly string[]>([]);
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  readonly flags = this.flagsState.asReadonly();

  private readonly memberState = signal(false);

  /**
   * True for a customer with a membership they bought and that is active (an "Elite" customer). Like hasFeature, it is
   * safe in a template or computed: the first read starts the load and it re-evaluates once the answer arrives.
   */
  isMember(): boolean {
    void this.ensureLoaded();
    return this.memberState();
  }

  /** Synchronous, signal-reactive check — safe to call from a template or an effect(). Triggers a
   * background load on first use; returns false until that load resolves (then re-evaluates). */
  hasFeature(key: string): boolean {
    void this.ensureLoaded();
    return this.flagsState().includes(key);
  }

  async ensureLoaded(): Promise<void> {
    if (this.loaded || !this.session.isCustomerAuthenticated()) {
      return;
    }

    this.loadingPromise ??= this.load();
    await this.loadingPromise;
  }

  /** Call after login/logout or a membership change so the next hasFeature() re-fetches. */
  reset(): void {
    this.loaded = false;
    this.loadingPromise = null;
    this.flagsState.set([]);
    this.memberState.set(false);
  }

  private async load(): Promise<void> {
    try {
      const dto = await firstValueFrom(
        this.api.get<CurrentMembershipFeatureFlagsResponse>(ACCOUNT_API.membership),
      );
      this.flagsState.set(dto.featureFlags ?? []);
      this.memberState.set(dto.subscription?.status?.toLowerCase() === 'active');
    } catch {
      this.flagsState.set([]);
      this.memberState.set(false);
    } finally {
      this.loaded = true;
      this.loadingPromise = null;
    }
  }
}

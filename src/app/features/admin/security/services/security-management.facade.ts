import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { SECURITY_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  BanUserRequest,
  BlockedEmailDto,
  BlockedIpDto,
  BlockUserRequest,
  CountryRestrictionDto,
  CreateBlockedEmailRequest,
  CreateBlockedIpRequest,
  PagedResult,
  SecurityDashboardDto,
  SecurityEventDto,
  SetCountryRestrictionRequest,
  SuspendUserRequest,
  BlockedUserListItemDto,
} from '../models/security.model';

@Injectable()
export class SecurityManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly dashboardState = signal<SecurityDashboardDto | null>(null);
  private readonly dashboardLoadingState = signal(false);
  private readonly dashboardErrorState = signal<string | null>(null);

  private readonly usersState = signal<PagedResult<BlockedUserListItemDto> | null>(null);
  private readonly usersLoadingState = signal(false);
  private readonly usersErrorState = signal<string | null>(null);

  private readonly emailsState = signal<PagedResult<BlockedEmailDto> | null>(null);
  private readonly emailsLoadingState = signal(false);
  private readonly emailsErrorState = signal<string | null>(null);

  private readonly ipsState = signal<PagedResult<BlockedIpDto> | null>(null);
  private readonly ipsLoadingState = signal(false);
  private readonly ipsErrorState = signal<string | null>(null);

  private readonly countriesState = signal<readonly CountryRestrictionDto[]>([]);
  private readonly countriesLoadingState = signal(false);
  private readonly countriesErrorState = signal<string | null>(null);

  private readonly eventsState = signal<PagedResult<SecurityEventDto> | null>(null);
  private readonly eventsLoadingState = signal(false);
  private readonly eventsErrorState = signal<string | null>(null);

  private readonly actionLoadingState = signal(false);

  readonly dashboard = this.dashboardState.asReadonly();
  readonly dashboardLoading = this.dashboardLoadingState.asReadonly();
  readonly dashboardError = this.dashboardErrorState.asReadonly();

  readonly users = this.usersState.asReadonly();
  readonly usersLoading = this.usersLoadingState.asReadonly();
  readonly usersError = this.usersErrorState.asReadonly();

  readonly emails = this.emailsState.asReadonly();
  readonly emailsLoading = this.emailsLoadingState.asReadonly();
  readonly emailsError = this.emailsErrorState.asReadonly();

  readonly ips = this.ipsState.asReadonly();
  readonly ipsLoading = this.ipsLoadingState.asReadonly();
  readonly ipsError = this.ipsErrorState.asReadonly();

  readonly countries = this.countriesState.asReadonly();
  readonly countriesLoading = this.countriesLoadingState.asReadonly();
  readonly countriesError = this.countriesErrorState.asReadonly();

  readonly events = this.eventsState.asReadonly();
  readonly eventsLoading = this.eventsLoadingState.asReadonly();
  readonly eventsError = this.eventsErrorState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  async loadDashboard(): Promise<void> {
    this.dashboardLoadingState.set(true);
    this.dashboardErrorState.set(null);

    try {
      const result = await firstValueFrom(this.api.get<SecurityDashboardDto>(SECURITY_API.dashboard));
      this.dashboardState.set(result);
    } catch (error) {
      this.dashboardState.set(null);
      this.dashboardErrorState.set(this.toErrorMessage(error, 'Failed to load the security dashboard.'));
    } finally {
      this.dashboardLoadingState.set(false);
    }
  }

  async loadUsers(pageNumber: number, pageSize: number, searchTerm?: string, status?: string): Promise<void> {
    this.usersLoadingState.set(true);
    this.usersErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<BlockedUserListItemDto>>(SECURITY_API.users, {
          params: {
            pageNumber,
            pageSize,
            ...(searchTerm?.trim() ? { searchTerm: searchTerm.trim() } : {}),
            ...(status && status !== 'all' ? { status } : {}),
          },
        }),
      );
      this.usersState.set(result);
    } catch (error) {
      this.usersState.set(null);
      this.usersErrorState.set(this.toErrorMessage(error, 'Failed to load users.'));
    } finally {
      this.usersLoadingState.set(false);
    }
  }

  async blockUser(userId: string, request: BlockUserRequest): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.blockUser(userId), request), this.usersErrorState, 'Failed to block the user.');
  }

  async suspendUser(userId: string, request: SuspendUserRequest): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.suspendUser(userId), request), this.usersErrorState, 'Failed to suspend the user.');
  }

  async banUser(userId: string, request: BanUserRequest): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.banUser(userId), request), this.usersErrorState, 'Failed to ban the user.');
  }

  async unblockUser(userId: string): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.unblockUser(userId)), this.usersErrorState, 'Failed to restore the user.');
  }

  async loadEmails(pageNumber: number, pageSize: number, searchTerm?: string): Promise<void> {
    this.emailsLoadingState.set(true);
    this.emailsErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<BlockedEmailDto>>(SECURITY_API.emails, {
          params: { pageNumber, pageSize, ...(searchTerm?.trim() ? { searchTerm: searchTerm.trim() } : {}) },
        }),
      );
      this.emailsState.set(result);
    } catch (error) {
      this.emailsState.set(null);
      this.emailsErrorState.set(this.toErrorMessage(error, 'Failed to load blocked emails.'));
    } finally {
      this.emailsLoadingState.set(false);
    }
  }

  async createBlockedEmail(request: CreateBlockedEmailRequest): Promise<boolean> {
    return this.runAction(() => this.api.post<string>(SECURITY_API.emails, request), this.emailsErrorState, 'Failed to block the email.');
  }

  async deleteBlockedEmail(id: string): Promise<boolean> {
    return this.runAction(() => this.api.delete<void>(SECURITY_API.email(id)), this.emailsErrorState, 'Failed to remove the blocked email.');
  }

  async loadIps(pageNumber: number, pageSize: number, searchTerm?: string): Promise<void> {
    this.ipsLoadingState.set(true);
    this.ipsErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<BlockedIpDto>>(SECURITY_API.ips, {
          params: { pageNumber, pageSize, ...(searchTerm?.trim() ? { searchTerm: searchTerm.trim() } : {}) },
        }),
      );
      this.ipsState.set(result);
    } catch (error) {
      this.ipsState.set(null);
      this.ipsErrorState.set(this.toErrorMessage(error, 'Failed to load blocked IPs.'));
    } finally {
      this.ipsLoadingState.set(false);
    }
  }

  async createBlockedIp(request: CreateBlockedIpRequest): Promise<boolean> {
    return this.runAction(() => this.api.post<string>(SECURITY_API.ips, request), this.ipsErrorState, 'Failed to block the IP address.');
  }

  async deleteBlockedIp(id: string): Promise<boolean> {
    return this.runAction(() => this.api.delete<void>(SECURITY_API.ip(id)), this.ipsErrorState, 'Failed to remove the blocked IP.');
  }

  async loadCountries(searchTerm?: string, overriddenOnly = false): Promise<void> {
    this.countriesLoadingState.set(true);
    this.countriesErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<readonly CountryRestrictionDto[]>(SECURITY_API.countries, {
          params: { overriddenOnly, ...(searchTerm?.trim() ? { searchTerm: searchTerm.trim() } : {}) },
        }),
      );
      this.countriesState.set(result ?? []);
    } catch (error) {
      this.countriesState.set([]);
      this.countriesErrorState.set(this.toErrorMessage(error, 'Failed to load country restrictions.'));
    } finally {
      this.countriesLoadingState.set(false);
    }
  }

  async setCountryRestriction(countryCode: string, request: SetCountryRestrictionRequest): Promise<boolean> {
    return this.runAction(
      () => this.api.put<void>(SECURITY_API.country(countryCode), request),
      this.countriesErrorState,
      'Failed to update the country restriction.',
    );
  }

  async loadEvents(
    pageNumber: number,
    pageSize: number,
    filters?: { eventType?: string; severity?: string; fromUtc?: string; toUtc?: string; searchTerm?: string },
  ): Promise<void> {
    this.eventsLoadingState.set(true);
    this.eventsErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<SecurityEventDto>>(SECURITY_API.events, {
          params: {
            pageNumber,
            pageSize,
            ...(filters?.eventType ? { eventType: filters.eventType } : {}),
            ...(filters?.severity ? { severity: filters.severity } : {}),
            ...(filters?.fromUtc ? { fromUtc: filters.fromUtc } : {}),
            ...(filters?.toUtc ? { toUtc: filters.toUtc } : {}),
            ...(filters?.searchTerm?.trim() ? { searchTerm: filters.searchTerm.trim() } : {}),
          },
        }),
      );
      this.eventsState.set(result);
    } catch (error) {
      this.eventsState.set(null);
      this.eventsErrorState.set(this.toErrorMessage(error, 'Failed to load security events.'));
    } finally {
      this.eventsLoadingState.set(false);
    }
  }

  private async runAction<T>(
    call: () => Observable<T>,
    errorState: WritableSignal<string | null>,
    fallbackMessage: string,
  ): Promise<boolean> {
    this.actionLoadingState.set(true);
    errorState.set(null);

    try {
      await firstValueFrom(call());
      return true;
    } catch (error) {
      errorState.set(this.toErrorMessage(error, fallbackMessage));
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

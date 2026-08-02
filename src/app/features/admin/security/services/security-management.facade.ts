import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { SECURITY_API } from '../../../../core/api/api-endpoints';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  BanUserRequest,
  BlockDeviceRequest,
  BlockedEmailDto,
  BlockedIpDto,
  BlockUserRequest,
  CountryRestrictionDto,
  CreateBlockedEmailRequest,
  CreateBlockedIpRequest,
  LoginHistoryDto,
  PagedResult,
  SecurityDashboardDto,
  SecurityEventDto,
  SetCountryRestrictionRequest,
  SuspendUserRequest,
  BlockedUserListItemDto,
  TrustedDeviceDto,
  UpdateSecurityEventStatusRequest,
  UserSessionDto,
} from '../models/security.model';

export interface SecurityEventFilters {
  eventType?: string;
  severity?: string;
  minSeverity?: string;
  status?: string;
  fromUtc?: string;
  toUtc?: string;
  searchTerm?: string;
}

export interface LoginHistoryFilters {
  userId?: string;
  isSuccessful?: boolean;
  countryCode?: string;
  riskLevel?: string;
  fromUtc?: string;
  toUtc?: string;
  searchTerm?: string;
}

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

  private readonly alertsState = signal<PagedResult<SecurityEventDto> | null>(null);
  private readonly alertsLoadingState = signal(false);
  private readonly alertsErrorState = signal<string | null>(null);

  private readonly loginHistoryState = signal<PagedResult<LoginHistoryDto> | null>(null);
  private readonly loginHistoryLoadingState = signal(false);
  private readonly loginHistoryErrorState = signal<string | null>(null);

  private readonly devicesState = signal<PagedResult<TrustedDeviceDto> | null>(null);
  private readonly devicesLoadingState = signal(false);
  private readonly devicesErrorState = signal<string | null>(null);

  private readonly userSessionsState = signal<readonly UserSessionDto[]>([]);
  private readonly userSessionsLoadingState = signal(false);
  private readonly userSessionsErrorState = signal<string | null>(null);

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

  readonly alerts = this.alertsState.asReadonly();
  readonly alertsLoading = this.alertsLoadingState.asReadonly();
  readonly alertsError = this.alertsErrorState.asReadonly();

  readonly loginHistory = this.loginHistoryState.asReadonly();
  readonly loginHistoryLoading = this.loginHistoryLoadingState.asReadonly();
  readonly loginHistoryError = this.loginHistoryErrorState.asReadonly();

  readonly devices = this.devicesState.asReadonly();
  readonly devicesLoading = this.devicesLoadingState.asReadonly();
  readonly devicesError = this.devicesErrorState.asReadonly();

  readonly userSessions = this.userSessionsState.asReadonly();
  readonly userSessionsLoading = this.userSessionsLoadingState.asReadonly();
  readonly userSessionsError = this.userSessionsErrorState.asReadonly();

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
    filters?: SecurityEventFilters,
  ): Promise<void> {
    await this.fetchEvents(pageNumber, pageSize, filters, this.eventsState, this.eventsLoadingState, this.eventsErrorState);
  }

  /** Same endpoint as {@link loadEvents}, defaulting to open High+ severity events — the Alerts feed. */
  async loadAlerts(
    pageNumber: number,
    pageSize: number,
    filters?: SecurityEventFilters,
  ): Promise<void> {
    await this.fetchEvents(
      pageNumber,
      pageSize,
      { status: 'Open', minSeverity: 'High', ...filters },
      this.alertsState,
      this.alertsLoadingState,
      this.alertsErrorState,
    );
  }

  async updateEventStatus(id: string, request: UpdateSecurityEventStatusRequest): Promise<boolean> {
    return this.runAction(
      () => this.api.put<void>(SECURITY_API.eventStatus(id), request),
      this.alertsErrorState,
      'Failed to update the event status.',
    );
  }

  async loadLoginHistory(pageNumber: number, pageSize: number, filters?: LoginHistoryFilters): Promise<void> {
    this.loginHistoryLoadingState.set(true);
    this.loginHistoryErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<LoginHistoryDto>>(SECURITY_API.loginHistory, {
          params: {
            pageNumber,
            pageSize,
            ...(filters?.userId ? { userId: filters.userId } : {}),
            ...(filters?.isSuccessful !== undefined ? { isSuccessful: filters.isSuccessful } : {}),
            ...(filters?.countryCode ? { countryCode: filters.countryCode } : {}),
            ...(filters?.riskLevel ? { riskLevel: filters.riskLevel } : {}),
            ...(filters?.fromUtc ? { fromUtc: filters.fromUtc } : {}),
            ...(filters?.toUtc ? { toUtc: filters.toUtc } : {}),
            ...(filters?.searchTerm?.trim() ? { searchTerm: filters.searchTerm.trim() } : {}),
          },
        }),
      );
      this.loginHistoryState.set(result);
    } catch (error) {
      this.loginHistoryState.set(null);
      this.loginHistoryErrorState.set(this.toErrorMessage(error, 'Failed to load login events.'));
    } finally {
      this.loginHistoryLoadingState.set(false);
    }
  }

  async loadDevices(
    pageNumber: number,
    pageSize: number,
    filters?: { userId?: string; isTrusted?: boolean; isBlocked?: boolean; searchTerm?: string },
  ): Promise<void> {
    this.devicesLoadingState.set(true);
    this.devicesErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<TrustedDeviceDto>>(SECURITY_API.devices, {
          params: {
            pageNumber,
            pageSize,
            ...(filters?.userId ? { userId: filters.userId } : {}),
            ...(filters?.isTrusted !== undefined ? { isTrusted: filters.isTrusted } : {}),
            ...(filters?.isBlocked !== undefined ? { isBlocked: filters.isBlocked } : {}),
            ...(filters?.searchTerm?.trim() ? { searchTerm: filters.searchTerm.trim() } : {}),
          },
        }),
      );
      this.devicesState.set(result);
    } catch (error) {
      this.devicesState.set(null);
      this.devicesErrorState.set(this.toErrorMessage(error, 'Failed to load devices.'));
    } finally {
      this.devicesLoadingState.set(false);
    }
  }

  async trustDevice(id: string): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.trustDevice(id)), this.devicesErrorState, 'Failed to trust the device.');
  }

  async untrustDevice(id: string): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.untrustDevice(id)), this.devicesErrorState, 'Failed to untrust the device.');
  }

  async blockDevice(id: string, request: BlockDeviceRequest): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.blockDevice(id), request), this.devicesErrorState, 'Failed to block the device.');
  }

  async unblockDevice(id: string): Promise<boolean> {
    return this.runAction(() => this.api.post<void>(SECURITY_API.unblockDevice(id)), this.devicesErrorState, 'Failed to unblock the device.');
  }

  async loadUserSessions(userId: string): Promise<void> {
    this.userSessionsLoadingState.set(true);
    this.userSessionsErrorState.set(null);

    try {
      const result = await firstValueFrom(this.api.get<readonly UserSessionDto[]>(SECURITY_API.userSessions(userId)));
      this.userSessionsState.set(result ?? []);
    } catch (error) {
      this.userSessionsState.set([]);
      this.userSessionsErrorState.set(this.toErrorMessage(error, 'Failed to load sessions.'));
    } finally {
      this.userSessionsLoadingState.set(false);
    }
  }

  async revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
    return this.runAction(
      () => this.api.delete<void>(SECURITY_API.revokeUserSession(userId, sessionId)),
      this.userSessionsErrorState,
      'Failed to revoke the session.',
    );
  }

  async revokeAllUserSessions(userId: string): Promise<boolean> {
    return this.runAction(
      () => this.api.post<void>(SECURITY_API.revokeAllUserSessions(userId)),
      this.userSessionsErrorState,
      'Failed to revoke sessions.',
    );
  }

  private async fetchEvents(
    pageNumber: number,
    pageSize: number,
    filters: SecurityEventFilters | undefined,
    state: WritableSignal<PagedResult<SecurityEventDto> | null>,
    loadingState: WritableSignal<boolean>,
    errorState: WritableSignal<string | null>,
  ): Promise<void> {
    loadingState.set(true);
    errorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<SecurityEventDto>>(SECURITY_API.events, {
          params: {
            pageNumber,
            pageSize,
            ...(filters?.eventType ? { eventType: filters.eventType } : {}),
            ...(filters?.severity ? { severity: filters.severity } : {}),
            ...(filters?.minSeverity ? { minSeverity: filters.minSeverity } : {}),
            ...(filters?.status ? { status: filters.status } : {}),
            ...(filters?.fromUtc ? { fromUtc: filters.fromUtc } : {}),
            ...(filters?.toUtc ? { toUtc: filters.toUtc } : {}),
            ...(filters?.searchTerm?.trim() ? { searchTerm: filters.searchTerm.trim() } : {}),
          },
        }),
      );
      state.set(result);
    } catch (error) {
      state.set(null);
      errorState.set(this.toErrorMessage(error, 'Failed to load security events.'));
    } finally {
      loadingState.set(false);
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

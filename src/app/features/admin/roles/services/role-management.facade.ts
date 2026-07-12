import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ROLES_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { PagedResult } from '../../../catalog/models/category.model';
import {
  AssignUsersRequest,
  CreateRoleRequest,
  DuplicateRoleRequest,
  PermissionGroupApiDto,
  RoleDetailApiDto,
  RoleListItemApiDto,
  RoleListQuery,
  RoleUsersQuery,
  SetRolePermissionsRequest,
  UpdateRoleRequest,
  UserSearchQuery,
  UserSearchResultApiDto,
} from '../models/role-api.model';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class RoleManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly rolesState = signal<readonly RoleListItemApiDto[]>([]);
  private readonly rolesLoadingState = signal(false);
  private readonly rolesErrorState = signal<string | null>(null);
  private readonly searchTermState = signal('');
  private readonly totalCountState = signal(0);
  private readonly pageNumberState = signal(1);
  private readonly pageSizeState = signal(DEFAULT_PAGE_SIZE);
  private readonly hasLoadedRolesState = signal(false);

  private readonly detailState = signal<RoleDetailApiDto | null>(null);
  private readonly detailLoadingState = signal(false);
  private readonly detailSavingState = signal(false);
  private readonly detailErrorState = signal<string | null>(null);

  private readonly matrixState = signal<readonly PermissionGroupApiDto[]>([]);
  private readonly matrixLoadingState = signal(false);
  private readonly matrixErrorState = signal<string | null>(null);
  private readonly selectedPermissionIdsState = signal<readonly string[]>([]);

  private readonly roleUsersState = signal<readonly UserSearchResultApiDto[]>([]);
  private readonly roleUsersLoadingState = signal(false);
  private readonly roleUsersErrorState = signal<string | null>(null);
  private readonly roleUsersSearchState = signal('');
  private readonly roleUsersTotalState = signal(0);
  private readonly roleUsersPageState = signal(1);
  private readonly roleUsersPageSizeState = signal(10);

  private readonly userSearchResultsState = signal<readonly UserSearchResultApiDto[]>([]);
  private readonly userSearchLoadingState = signal(false);
  private readonly userSearchErrorState = signal<string | null>(null);
  private readonly userSearchTermState = signal('');
  private readonly userSearchTotalState = signal(0);

  private readonly actionLoadingState = signal(false);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private roleUsersDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private userSearchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly roles = this.rolesState.asReadonly();
  readonly rolesLoading = this.rolesLoadingState.asReadonly();
  readonly rolesError = this.rolesErrorState.asReadonly();
  readonly searchTerm = this.searchTermState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly pageNumber = this.pageNumberState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();

  readonly detail = this.detailState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly detailSaving = this.detailSavingState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();

  readonly matrix = this.matrixState.asReadonly();
  readonly matrixLoading = this.matrixLoadingState.asReadonly();
  readonly matrixError = this.matrixErrorState.asReadonly();
  readonly selectedPermissionIds = this.selectedPermissionIdsState.asReadonly();

  readonly roleUsers = this.roleUsersState.asReadonly();
  readonly roleUsersLoading = this.roleUsersLoadingState.asReadonly();
  readonly roleUsersError = this.roleUsersErrorState.asReadonly();
  readonly roleUsersSearch = this.roleUsersSearchState.asReadonly();
  readonly roleUsersTotal = this.roleUsersTotalState.asReadonly();
  readonly roleUsersPage = this.roleUsersPageState.asReadonly();
  readonly roleUsersPageSize = this.roleUsersPageSizeState.asReadonly();

  readonly userSearchResults = this.userSearchResultsState.asReadonly();
  readonly userSearchLoading = this.userSearchLoadingState.asReadonly();
  readonly userSearchError = this.userSearchErrorState.asReadonly();
  readonly userSearchTerm = this.userSearchTermState.asReadonly();
  readonly userSearchTotal = this.userSearchTotalState.asReadonly();

  readonly actionLoading = this.actionLoadingState.asReadonly();

  readonly hasActiveSearch = computed(() => this.searchTermState().trim().length > 0);
  readonly matrixModules = computed(() => {
    const modules = new Set(this.matrixState().map((group) => group.module));
    return [...modules].sort();
  });

  loadRoles(): void {
    void this.fetchRoles(true);
  }

  reloadRoles(): Promise<void> {
    return this.fetchRoles(true);
  }

  setSearchTerm(term: string): void {
    this.searchTermState.set(term);
    this.pageNumberState.set(1);
    this.scheduleRolesReload();
  }

  setPage(pageNumber: number, pageSize: number): void {
    if (
      this.pageNumberState() === pageNumber &&
      this.pageSizeState() === pageSize &&
      this.hasLoadedRolesState()
    ) {
      return;
    }

    this.pageNumberState.set(pageNumber);
    this.pageSizeState.set(pageSize);
    void this.fetchRoles();
  }

  async loadRoleDetail(roleId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);

    try {
      const detail = await firstValueFrom(
        this.api.get<RoleDetailApiDto>(ROLES_API.role(roleId)),
      );
      this.detailState.set(detail);
      this.selectedPermissionIdsState.set([...(detail.permissionIds ?? [])]);
    } catch (error) {
      this.detailState.set(null);
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to load role.'));
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  resetDetail(): void {
    this.detailState.set(null);
    this.detailErrorState.set(null);
    this.selectedPermissionIdsState.set([]);
  }

  async loadPermissionMatrix(): Promise<void> {
    this.matrixLoadingState.set(true);
    this.matrixErrorState.set(null);

    try {
      const matrix = await firstValueFrom(
        this.api.get<readonly PermissionGroupApiDto[]>(ROLES_API.permissionMatrix),
      );
      this.matrixState.set(matrix ?? []);
    } catch (error) {
      this.matrixState.set([]);
      this.matrixErrorState.set(this.toErrorMessage(error, 'Failed to load permissions.'));
    } finally {
      this.matrixLoadingState.set(false);
    }
  }

  setSelectedPermissionIds(ids: readonly string[]): void {
    this.selectedPermissionIdsState.set([...ids]);
  }

  togglePermission(permissionId: string, selected: boolean): void {
    const current = new Set(this.selectedPermissionIdsState());
    if (selected) {
      current.add(permissionId);
    } else {
      current.delete(permissionId);
    }
    this.selectedPermissionIdsState.set([...current]);
  }

  selectAllInGroup(group: PermissionGroupApiDto): void {
    const current = new Set(this.selectedPermissionIdsState());
    for (const permission of group.permissions) {
      current.add(permission.id);
    }
    this.selectedPermissionIdsState.set([...current]);
  }

  clearAllInGroup(group: PermissionGroupApiDto): void {
    const removeIds = new Set(group.permissions.map((permission) => permission.id));
    this.selectedPermissionIdsState.set(
      this.selectedPermissionIdsState().filter((id) => !removeIds.has(id)),
    );
  }

  async createRole(request: CreateRoleRequest): Promise<string | null> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      const roleId = await firstValueFrom(
        this.api.post<string>(ROLES_API.roles, request),
      );
      return roleId;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to create role.'));
      return null;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async updateRole(roleId: string, request: UpdateRoleRequest): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    try {
      await firstValueFrom(this.api.put<void>(ROLES_API.role(roleId), request));
      await this.loadRoleDetail(roleId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to update role.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async savePermissions(roleId: string): Promise<boolean> {
    this.detailSavingState.set(true);
    this.detailErrorState.set(null);

    const body: SetRolePermissionsRequest = {
      permissionIds: this.selectedPermissionIdsState(),
    };

    try {
      await firstValueFrom(this.api.put<void>(ROLES_API.permissions(roleId), body));
      await this.loadRoleDetail(roleId);
      return true;
    } catch (error) {
      this.detailErrorState.set(this.toErrorMessage(error, 'Failed to save permissions.'));
      return false;
    } finally {
      this.detailSavingState.set(false);
    }
  }

  async deleteRole(roleId: string): Promise<boolean> {
    this.actionLoadingState.set(true);

    try {
      await firstValueFrom(this.api.delete<void>(ROLES_API.role(roleId)));
      await this.fetchRoles(true);
      return true;
    } catch (error) {
      this.rolesErrorState.set(this.toErrorMessage(error, 'Failed to delete role.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async duplicateRole(roleId: string, newName?: string): Promise<string | null> {
    this.actionLoadingState.set(true);
    this.rolesErrorState.set(null);

    const body: DuplicateRoleRequest = { newName: newName ?? null };

    try {
      const createdId = await firstValueFrom(
        this.api.post<string>(ROLES_API.duplicate(roleId), body),
      );
      await this.fetchRoles(true);
      return createdId;
    } catch (error) {
      this.rolesErrorState.set(this.toErrorMessage(error, 'Failed to duplicate role.'));
      return null;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  loadRoleUsers(roleId: string): void {
    void this.fetchRoleUsers(roleId);
  }

  setRoleUsersSearch(term: string, roleId: string): void {
    this.roleUsersSearchState.set(term);
    this.roleUsersPageState.set(1);
    this.scheduleRoleUsersReload(roleId);
  }

  setRoleUsersPage(pageNumber: number, pageSize: number, roleId: string): void {
    this.roleUsersPageState.set(pageNumber);
    this.roleUsersPageSizeState.set(pageSize);
    void this.fetchRoleUsers(roleId);
  }

  async assignUsers(roleId: string, userIds: readonly string[]): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.roleUsersErrorState.set(null);

    const body: AssignUsersRequest = { userIds };

    try {
      await firstValueFrom(this.api.post<void>(ROLES_API.roleUsers(roleId), body));
      await this.fetchRoleUsers(roleId);
      return true;
    } catch (error) {
      this.roleUsersErrorState.set(this.toErrorMessage(error, 'Failed to assign users.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  async removeUser(roleId: string, userId: string): Promise<boolean> {
    this.actionLoadingState.set(true);
    this.roleUsersErrorState.set(null);

    try {
      await firstValueFrom(this.api.delete<void>(ROLES_API.roleUser(roleId, userId)));
      await this.fetchRoleUsers(roleId);
      return true;
    } catch (error) {
      this.roleUsersErrorState.set(this.toErrorMessage(error, 'Failed to remove user.'));
      return false;
    } finally {
      this.actionLoadingState.set(false);
    }
  }

  searchUsersForAssignment(roleId: string): void {
    void this.fetchUserSearch(roleId);
  }

  setUserSearchTerm(term: string, roleId: string): void {
    this.userSearchTermState.set(term);
    this.scheduleUserSearchReload(roleId);
  }

  private scheduleRolesReload(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      void this.fetchRoles();
    }, SEARCH_DEBOUNCE_MS);
  }

  private scheduleRoleUsersReload(roleId: string): void {
    if (this.roleUsersDebounceTimer) {
      clearTimeout(this.roleUsersDebounceTimer);
    }

    this.roleUsersDebounceTimer = setTimeout(() => {
      void this.fetchRoleUsers(roleId);
    }, SEARCH_DEBOUNCE_MS);
  }

  private scheduleUserSearchReload(roleId: string): void {
    if (this.userSearchDebounceTimer) {
      clearTimeout(this.userSearchDebounceTimer);
    }

    this.userSearchDebounceTimer = setTimeout(() => {
      void this.fetchUserSearch(roleId);
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchRoles(force = false): Promise<void> {
    this.rolesLoadingState.set(true);
    this.rolesErrorState.set(null);

    const query: RoleListQuery = {
      pageNumber: this.pageNumberState(),
      pageSize: this.pageSizeState(),
      searchTerm: this.searchTermState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<RoleListItemApiDto>>(ROLES_API.roles, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
          },
        }),
      );

      this.rolesState.set(result.items ?? []);
      this.totalCountState.set(result.totalCount ?? 0);
      this.pageNumberState.set(result.pageNumber ?? query.pageNumber);
      this.pageSizeState.set(result.pageSize ?? query.pageSize);
      this.hasLoadedRolesState.set(true);
    } catch (error) {
      this.rolesState.set([]);
      this.totalCountState.set(0);
      this.rolesErrorState.set(this.toErrorMessage(error, 'Failed to load roles.'));
    } finally {
      this.rolesLoadingState.set(false);
    }
  }

  private async fetchRoleUsers(roleId: string): Promise<void> {
    this.roleUsersLoadingState.set(true);
    this.roleUsersErrorState.set(null);

    const query: RoleUsersQuery = {
      pageNumber: this.roleUsersPageState(),
      pageSize: this.roleUsersPageSizeState(),
      searchTerm: this.roleUsersSearchState(),
    };

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<UserSearchResultApiDto>>(ROLES_API.roleUsers(roleId), {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
          },
        }),
      );

      this.roleUsersState.set(result.items ?? []);
      this.roleUsersTotalState.set(result.totalCount ?? 0);
    } catch (error) {
      this.roleUsersState.set([]);
      this.roleUsersTotalState.set(0);
      this.roleUsersErrorState.set(this.toErrorMessage(error, 'Failed to load role users.'));
    } finally {
      this.roleUsersLoadingState.set(false);
    }
  }

  private async fetchUserSearch(roleId: string): Promise<void> {
    this.userSearchLoadingState.set(true);
    this.userSearchErrorState.set(null);

    const query: UserSearchQuery = {
      pageNumber: 1,
      pageSize: 20,
      searchTerm: this.userSearchTermState(),
      excludeRoleId: roleId,
    };

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<UserSearchResultApiDto>>(ROLES_API.userSearch, {
          params: {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            excludeRoleId: roleId,
            ...(query.searchTerm?.trim() ? { searchTerm: query.searchTerm.trim() } : {}),
          },
        }),
      );

      this.userSearchResultsState.set(result.items ?? []);
      this.userSearchTotalState.set(result.totalCount ?? 0);
    } catch (error) {
      this.userSearchResultsState.set([]);
      this.userSearchTotalState.set(0);
      this.userSearchErrorState.set(this.toErrorMessage(error, 'Failed to search users.'));
    } finally {
      this.userSearchLoadingState.set(false);
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

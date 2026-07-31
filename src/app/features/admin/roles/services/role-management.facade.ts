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
  RoleUsersQuery,
  SetRolePermissionsRequest,
  UpdateRoleRequest,
  UserSearchQuery,
  UserSearchResultApiDto,
} from '../models/role-api.model';

/** Server-enforced cap (`GetRolesQueryValidator`/`InclusiveBetween(1,100)`) — the list page loads the
 * full role set in one call and does all filtering/search/paging client-side, since real org role
 * counts are realistically in the tens. If that ceiling is ever hit, the fix is a dedicated
 * aggregate/search endpoint, not a bigger page size. */
const ROLES_FETCH_ALL_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

@Injectable()
export class RoleManagementFacade {
  private readonly api = inject(ApiClientService);

  private readonly rolesState = signal<readonly RoleListItemApiDto[]>([]);
  private readonly rolesLoadingState = signal(false);
  private readonly rolesErrorState = signal<string | null>(null);
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

  private readonly roleDetailCacheState = signal<ReadonlyMap<string, RoleDetailApiDto>>(new Map());

  private readonly compareLeftState = signal<RoleDetailApiDto | null>(null);
  private readonly compareRightState = signal<RoleDetailApiDto | null>(null);
  private readonly compareLoadingState = signal(false);
  private readonly compareErrorState = signal<string | null>(null);

  private roleUsersDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private userSearchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly roles = this.rolesState.asReadonly();
  readonly rolesLoading = this.rolesLoadingState.asReadonly();
  readonly rolesError = this.rolesErrorState.asReadonly();
  readonly hasLoadedRoles = this.hasLoadedRolesState.asReadonly();

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

  readonly roleDetailCache = this.roleDetailCacheState.asReadonly();

  readonly compareLeft = this.compareLeftState.asReadonly();
  readonly compareRight = this.compareRightState.asReadonly();
  readonly compareLoading = this.compareLoadingState.asReadonly();
  readonly compareError = this.compareErrorState.asReadonly();

  readonly matrixModules = computed(() => {
    const modules = new Set(this.matrixState().map((group) => group.module));
    return [...modules].sort();
  });

  readonly matrixTotalPermissionCount = computed(() =>
    this.matrixState().reduce((sum, group) => sum + group.permissions.length, 0),
  );

  loadRoles(): void {
    void this.fetchAllRoles();
  }

  reloadRoles(): Promise<void> {
    return this.fetchAllRoles();
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
      this.cacheRoleDetail(detail);
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

  /** Cache-first lookup used by the quick-preview drawer, bulk export, and smart search
   * (module/permission matching needs a role's full `permissionIds`, which the list endpoint
   * doesn't return). Populated opportunistically so repeat lookups of the same role are free. */
  async getRoleDetail(roleId: string): Promise<RoleDetailApiDto | null> {
    const cached = this.roleDetailCacheState().get(roleId);
    if (cached) {
      return cached;
    }

    try {
      const detail = await firstValueFrom(
        this.api.get<RoleDetailApiDto>(ROLES_API.role(roleId)),
      );
      this.cacheRoleDetail(detail);
      return detail;
    } catch {
      return null;
    }
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

  /** Bulk ops take a plain permission-id list rather than a `PermissionGroupApiDto` — the
   * module-first permission editor flattens a module's permissions across its groups before
   * calling these, so "group" isn't a meaningful unit here anymore. Still just a client-side
   * selection-list edit; `savePermissions`/the persisted permission model are unchanged. */
  selectAllIds(ids: readonly string[]): void {
    const current = new Set(this.selectedPermissionIdsState());
    for (const id of ids) {
      current.add(id);
    }
    this.selectedPermissionIdsState.set([...current]);
  }

  clearAllIds(ids: readonly string[]): void {
    const removeIds = new Set(ids);
    this.selectedPermissionIdsState.set(
      this.selectedPermissionIdsState().filter((id) => !removeIds.has(id)),
    );
  }

  invertIds(ids: readonly string[]): void {
    const current = new Set(this.selectedPermissionIdsState());
    for (const id of ids) {
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
    }
    this.selectedPermissionIdsState.set([...current]);
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
      this.invalidateRoleDetail(roleId);
      await this.fetchAllRoles();
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
      await this.fetchAllRoles();
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
      this.invalidateRoleDetail(roleId);
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
      this.invalidateRoleDetail(roleId);
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

  /** Same user search, without an `excludeRoleId` filter — used by the roles list page's bulk
   * "assign users to selected roles" dialog, where no single role should be excluded. */
  searchUsersGlobal(): void {
    void this.fetchUserSearch(undefined);
  }

  setBulkUserSearchTerm(term: string): void {
    this.userSearchTermState.set(term);
    this.scheduleUserSearchReload(undefined);
  }

  /** Two parallel cache-first detail fetches, stored separately from `detail` so compare
   * doesn't clobber the edit page's working copy. Diffing itself is done by the compare page
   * as a computed() over the two `permissionIds` arrays, mirroring the themes module's
   * `theme-compare-panel` version-diff pattern — no backend diff endpoint needed. */
  async loadCompare(leftId: string, rightId: string): Promise<void> {
    this.compareLoadingState.set(true);
    this.compareErrorState.set(null);

    try {
      const [left, right] = await Promise.all([
        this.getRoleDetail(leftId),
        this.getRoleDetail(rightId),
      ]);

      if (!left || !right) {
        this.compareErrorState.set('Failed to load roles for comparison.');
        this.compareLeftState.set(null);
        this.compareRightState.set(null);
        return;
      }

      this.compareLeftState.set(left);
      this.compareRightState.set(right);
    } catch (error) {
      this.compareErrorState.set(
        this.toErrorMessage(error, 'Failed to load roles for comparison.'),
      );
    } finally {
      this.compareLoadingState.set(false);
    }
  }

  resetCompare(): void {
    this.compareLeftState.set(null);
    this.compareRightState.set(null);
    this.compareErrorState.set(null);
  }

  private cacheRoleDetail(detail: RoleDetailApiDto): void {
    const next = new Map(this.roleDetailCacheState());
    next.set(detail.id, detail);
    this.roleDetailCacheState.set(next);
  }

  private invalidateRoleDetail(roleId: string): void {
    if (!this.roleDetailCacheState().has(roleId)) {
      return;
    }
    const next = new Map(this.roleDetailCacheState());
    next.delete(roleId);
    this.roleDetailCacheState.set(next);
  }

  private scheduleRoleUsersReload(roleId: string): void {
    if (this.roleUsersDebounceTimer) {
      clearTimeout(this.roleUsersDebounceTimer);
    }

    this.roleUsersDebounceTimer = setTimeout(() => {
      void this.fetchRoleUsers(roleId);
    }, SEARCH_DEBOUNCE_MS);
  }

  private scheduleUserSearchReload(roleId: string | undefined): void {
    if (this.userSearchDebounceTimer) {
      clearTimeout(this.userSearchDebounceTimer);
    }

    this.userSearchDebounceTimer = setTimeout(() => {
      void this.fetchUserSearch(roleId);
    }, SEARCH_DEBOUNCE_MS);
  }

  private async fetchAllRoles(): Promise<void> {
    this.rolesLoadingState.set(true);
    this.rolesErrorState.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<PagedResult<RoleListItemApiDto>>(ROLES_API.roles, {
          params: {
            pageNumber: 1,
            pageSize: ROLES_FETCH_ALL_PAGE_SIZE,
          },
        }),
      );

      this.rolesState.set(result.items ?? []);
      this.hasLoadedRolesState.set(true);
    } catch (error) {
      this.rolesState.set([]);
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

  private async fetchUserSearch(roleId: string | undefined): Promise<void> {
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
            ...(roleId ? { excludeRoleId: roleId } : {}),
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

import { PagedResult } from '../../../catalog/models/category.model';

export type { PagedResult };

export interface RoleListItemApiDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isDefault: boolean;
  readonly priorityLevel: number;
  readonly userCount: number;
  readonly permissionCount: number;
}

export interface RoleDetailApiDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isDefault: boolean;
  readonly priorityLevel: number;
  readonly userCount: number;
  readonly permissionIds: readonly string[];
}

export interface PermissionApiDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
}

export interface PermissionGroupApiDto {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly module: string;
  readonly sortOrder: number;
  readonly description: string | null;
  readonly permissions: readonly PermissionApiDto[];
}

export interface UserSearchResultApiDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly status: string;
}

export interface CreateRoleRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly priorityLevel?: number | null;
}

export interface UpdateRoleRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly priorityLevel?: number | null;
  readonly isDefault?: boolean | null;
}

export interface SetRolePermissionsRequest {
  readonly permissionIds: readonly string[];
}

export interface AssignUsersRequest {
  readonly userIds: readonly string[];
}

export interface DuplicateRoleRequest {
  readonly newName?: string | null;
}

export interface RoleListQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
}

export interface RoleUsersQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
}

export interface UserSearchQuery {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly searchTerm?: string;
  readonly excludeRoleId?: string;
}

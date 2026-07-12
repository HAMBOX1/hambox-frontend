import { computed, inject, Injectable } from '@angular/core';



import { AuthContextType } from '../auth/auth-context';

import { AuthSessionService } from '../auth/auth-session.service';

import {

  isAdminAccessPermission,

  OWNER_ROLE_NAMES,

} from './permission.constants';



export interface UserAccessProfile {

  readonly roles: readonly string[];

  readonly permissions: readonly string[];

}



@Injectable({

  providedIn: 'root',

})

export class PermissionService {

  private readonly session = inject(AuthSessionService);



  private readonly adminRoles = computed(() => this.session.adminUser()?.roles ?? []);

  private readonly adminPermissions = computed(() => this.session.adminUser()?.permissions ?? []);

  private readonly customerRoles = computed(() => this.session.customerUser()?.roles ?? []);

  private readonly customerPermissions = computed(

    () => this.session.customerUser()?.permissions ?? [],

  );



  syncFromProfile(context: AuthContextType, profile: UserAccessProfile): void {

    this.session.updateUserAccess(context, profile.roles, profile.permissions);

  }



  hasPermission(name: string): boolean {

    if (this.session.isAdminAuthenticated()) {

      if (this.isOwnerRoleSet(this.adminRoles())) {

        return true;

      }

      return this.adminPermissions().includes(name);

    }



    if (this.isOwnerRoleSet(this.customerRoles())) {

      return true;

    }



    return this.customerPermissions().includes(name);

  }



  hasAnyPermission(...names: readonly string[]): boolean {

    if (this.session.isAdminAuthenticated()) {

      if (this.isOwnerRoleSet(this.adminRoles())) {

        return true;

      }

      const granted = this.adminPermissions();

      return names.some((name) => granted.includes(name));

    }



    if (this.isOwnerRoleSet(this.customerRoles())) {

      return true;

    }



    const granted = this.customerPermissions();

    return names.some((name) => granted.includes(name));

  }



  hasAllPermissions(...names: readonly string[]): boolean {

    if (this.session.isAdminAuthenticated()) {

      if (this.isOwnerRoleSet(this.adminRoles())) {

        return true;

      }

      const granted = this.adminPermissions();

      return names.every((name) => granted.includes(name));

    }



    if (this.isOwnerRoleSet(this.customerRoles())) {

      return true;

    }



    const granted = this.customerPermissions();

    return names.every((name) => granted.includes(name));

  }



  isOwner(): boolean {

    if (this.session.isAdminAuthenticated()) {

      return this.isOwnerRoleSet(this.adminRoles());

    }

    return this.isOwnerRoleSet(this.customerRoles());

  }



  hasAdminAccess(): boolean {

    if (!this.session.isAdminAuthenticated()) {

      return false;

    }



    if (this.isOwnerRoleSet(this.adminRoles())) {

      return true;

    }



    return this.adminPermissions().some(isAdminAccessPermission);

  }



  canViewNavItem(requiredPermission?: string | readonly string[]): boolean {

    if (!requiredPermission) {

      return true;

    }



    const permissions = Array.isArray(requiredPermission)

      ? requiredPermission

      : [requiredPermission];



    return this.hasAnyPermission(...permissions);

  }



  private isOwnerRoleSet(roles: readonly string[]): boolean {

    return roles.some((role) => OWNER_ROLE_NAMES.some((ownerRole) => ownerRole === role));

  }

}


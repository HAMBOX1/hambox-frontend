import { inject, Pipe, PipeTransform } from '@angular/core';

import { PermissionService } from '../../core/permissions/permission.service';

@Pipe({
  name: 'hamboxHasPermission',
  standalone: true,
  pure: false,
})
export class HasPermissionPipe implements PipeTransform {
  private readonly permissionService = inject(PermissionService);

  transform(permission: string | readonly string[] | null | undefined): boolean {
    if (!permission) {
      return false;
    }

    const permissions = typeof permission === 'string' ? [permission] : permission;

    return (
      this.permissionService.isOwner() ||
      this.permissionService.hasAnyPermission(...permissions)
    );
  }
}

import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';

import { PermissionService } from '../../core/permissions/permission.service';

@Directive({
  selector: '[hamboxHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  readonly hamboxHasPermission = input.required<string | readonly string[]>();

  constructor() {
    effect(() => {
      const value = this.hamboxHasPermission();
      const permissions = typeof value === 'string' ? [value] : value;
      const allowed =
        this.permissionService.isOwner() ||
        this.permissionService.hasAnyPermission(...permissions);

      this.viewContainer.clear();

      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}

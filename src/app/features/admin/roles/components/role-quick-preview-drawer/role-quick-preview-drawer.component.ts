import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { DrawerModule } from 'primeng/drawer';

import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { HamboxBottomSheetComponent } from '../../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';
import { RoleListItemApiDto } from '../../models/role-api.model';
import { RoleManagementFacade } from '../../services/role-management.facade';
import { RolePreviewContentComponent } from '../role-preview-content/role-preview-content.component';

/** Desktop: right-side p-drawer (same pattern as the product catalog inspector). Mobile: bottom
 * sheet. Both wrap the same `RolePreviewContentComponent` template via ngTemplateOutlet so the
 * preview markup is authored once. Reuses the page's existing `RoleManagementFacade` instance
 * (inherited from the parent's `providers: [RoleManagementFacade]`) and its `loadRoleDetail`/
 * `detail` signal — the same call the edit page already makes. */
@Component({
  selector: 'app-role-quick-preview-drawer',
  standalone: true,
  imports: [NgTemplateOutlet, DrawerModule, HamboxBottomSheetComponent, RolePreviewContentComponent],
  templateUrl: './role-quick-preview-drawer.component.html',
  styleUrl: './role-quick-preview-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleQuickPreviewDrawerComponent {
  private readonly facade = inject(RoleManagementFacade);
  private readonly translate = inject(TranslateService);
  protected readonly mobileViewport = inject(MobileViewportService);

  readonly role = input<RoleListItemApiDto | null>(null);

  readonly closed = output<void>();
  readonly editRequested = output<RoleListItemApiDto>();
  readonly duplicateRequested = output<RoleListItemApiDto>();
  readonly assignUsersRequested = output<RoleListItemApiDto>();
  readonly deleteRequested = output<RoleListItemApiDto>();

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly matrix = this.facade.matrix;

  constructor() {
    effect(() => {
      const role = this.role();
      if (!role) {
        return;
      }

      void this.facade.loadRoleDetail(role.id);
    });
  }

  protected title(): string {
    return this.role()?.name ?? this.translate.instant('ADMIN.ROLES.DRAWER.TITLE');
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closed.emit();
    }
  }

  protected onEdit(): void {
    const role = this.role();
    if (role) {
      this.editRequested.emit(role);
    }
  }

  protected onDuplicate(): void {
    const role = this.role();
    if (role) {
      this.duplicateRequested.emit(role);
    }
  }

  protected onAssignUsers(): void {
    const role = this.role();
    if (role) {
      this.assignUsersRequested.emit(role);
    }
  }

  protected onDelete(): void {
    const role = this.role();
    if (role) {
      this.deleteRequested.emit(role);
    }
  }
}

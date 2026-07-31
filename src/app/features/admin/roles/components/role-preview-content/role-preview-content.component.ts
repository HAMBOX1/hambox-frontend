import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  AdminLoadingSkeletonComponent,
  AdminProgressBarComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { PermissionGroupApiDto, RoleDetailApiDto, RoleListItemApiDto } from '../../models/role-api.model';
import { permissionModuleSummary, riskLabelKey, riskLevelFor, riskTone } from '../../utils/role-risk.util';

@Component({
  selector: 'app-role-preview-content',
  standalone: true,
  imports: [
    TranslatePipe,
    HamboxDatePipe,
    HasPermissionDirective,
    AdminStatusBadgeComponent,
    AdminProgressBarComponent,
    AdminLoadingSkeletonComponent,
  ],
  templateUrl: './role-preview-content.component.html',
  styleUrl: './role-preview-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePreviewContentComponent {
  readonly role = input<RoleListItemApiDto | null>(null);
  readonly detail = input<RoleDetailApiDto | null>(null);
  readonly matrix = input<readonly PermissionGroupApiDto[]>([]);
  readonly loading = input(false);

  readonly editRequested = output<void>();
  readonly duplicateRequested = output<void>();
  readonly assignUsersRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly permissions = PERMISSIONS;

  protected readonly risk = computed(() => {
    const role = this.role();
    return role ? riskLevelFor(role.priorityLevel) : null;
  });

  protected readonly riskKey = computed(() => {
    const risk = this.risk();
    return risk ? riskLabelKey(risk) : '';
  });

  protected readonly riskTone = computed(() => {
    const risk = this.risk();
    return risk ? riskTone(risk) : 'neutral';
  });

  protected readonly moduleSummary = computed(() => {
    const detail = this.detail();
    const matrix = this.matrix();
    if (!detail || matrix.length === 0) {
      return [];
    }
    return permissionModuleSummary(detail.permissionIds, matrix);
  });

  protected readonly totalPermissionCount = computed(() =>
    this.matrix().reduce((sum, group) => sum + group.permissions.length, 0),
  );

  protected readonly permissionCoveragePercent = computed(() => {
    const detail = this.detail();
    const total = this.totalPermissionCount();
    if (!detail || total === 0) {
      return 0;
    }
    return Math.round((detail.permissionIds.length / total) * 100);
  });

  protected moduleSummaryPercent(count: number): number {
    const detail = this.detail();
    if (!detail || detail.permissionIds.length === 0) {
      return 0;
    }
    return Math.round((count / detail.permissionIds.length) * 100);
  }
}

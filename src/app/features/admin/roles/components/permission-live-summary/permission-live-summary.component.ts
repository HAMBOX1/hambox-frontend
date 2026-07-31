import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AdminProgressBarComponent, AdminSectionCardComponent, AdminStatusBadgeComponent } from '../../../../../shared/components/admin';
import { PermissionGroupApiDto } from '../../models/role-api.model';
import { riskLabelKey, riskLevelFor, riskTone } from '../../utils/role-risk.util';

/** Right-rail of the permission matrix workspace — pure presentational, no state/service of its
 * own. Granted/Denied/Risk are all derived from inputs the edit page already holds. */
@Component({
  selector: 'app-permission-live-summary',
  standalone: true,
  imports: [TranslatePipe, AdminSectionCardComponent, AdminProgressBarComponent, AdminStatusBadgeComponent],
  templateUrl: './permission-live-summary.component.html',
  styleUrl: './permission-live-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionLiveSummaryComponent {
  readonly groups = input.required<readonly PermissionGroupApiDto[]>();
  readonly selectedIds = input.required<readonly string[]>();
  readonly userCount = input<number | null>(null);
  readonly priorityLevel = input<number>(1000);

  protected readonly totalCount = computed(() =>
    this.groups().reduce((sum, group) => sum + group.permissions.length, 0),
  );

  protected readonly grantedCount = computed(() => this.selectedIds().length);
  protected readonly deniedCount = computed(() => this.totalCount() - this.grantedCount());

  protected readonly coveragePercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.grantedCount() / total) * 100);
  });

  protected readonly risk = computed(() => riskLevelFor(this.priorityLevel()));
  protected readonly riskKey = computed(() => riskLabelKey(this.risk()));
  protected readonly riskTone = computed(() => riskTone(this.risk()));
}

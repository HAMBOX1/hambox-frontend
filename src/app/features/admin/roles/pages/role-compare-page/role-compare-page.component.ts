import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { RoleManagementFacade } from '../../services/role-management.facade';
import { riskLabelKey, riskLevelFor, riskTone } from '../../utils/role-risk.util';

interface PermissionDiffRow {
  readonly permissionId: string;
  readonly name: string;
  readonly module: string;
  readonly inLeft: boolean;
  readonly inRight: boolean;
}

@Component({
  selector: 'app-role-compare-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
  ],
  providers: [RoleManagementFacade],
  templateUrl: './role-compare-page.component.html',
  styleUrl: './role-compare-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleComparePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(RoleManagementFacade);

  protected readonly breadcrumbs = adminBreadcrumbs(
    { label: 'Roles', route: '/admin/roles' },
    { label: 'Compare' },
  );

  protected readonly riskLevelFor = riskLevelFor;
  protected readonly riskLabelKey = riskLabelKey;
  protected readonly riskTone = riskTone;

  protected readonly roles = this.facade.roles;
  protected readonly compareLoading = this.facade.compareLoading;
  protected readonly compareError = this.facade.compareError;
  protected readonly left = this.facade.compareLeft;
  protected readonly right = this.facade.compareRight;

  protected readonly leftId = signal<string | null>(null);
  protected readonly rightId = signal<string | null>(null);

  protected readonly roleOptions = computed(() =>
    this.roles().map((role) => ({ label: role.name, value: role.id })),
  );

  protected readonly diffRows = computed<PermissionDiffRow[]>(() => {
    const left = this.left();
    const right = this.right();
    if (!left || !right) {
      return [];
    }

    const leftIds = new Set(left.permissionIds);
    const rightIds = new Set(right.permissionIds);
    const permissionMeta = new Map(
      this.facade
        .matrix()
        .flatMap((group) => group.permissions.map((p) => [p.id, { name: p.name, module: group.module }] as const)),
    );

    const allIds = new Set([...leftIds, ...rightIds]);
    return [...allIds]
      .filter((id) => leftIds.has(id) !== rightIds.has(id))
      .map((id) => ({
        permissionId: id,
        name: permissionMeta.get(id)?.name ?? id,
        module: permissionMeta.get(id)?.module ?? '',
        inLeft: leftIds.has(id),
        inRight: rightIds.has(id),
      }))
      .sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
  });

  protected readonly sharedPermissionCount = computed(() => {
    const left = this.left();
    const right = this.right();
    if (!left || !right) {
      return 0;
    }
    const rightIds = new Set(right.permissionIds);
    return left.permissionIds.filter((id) => rightIds.has(id)).length;
  });

  ngOnInit(): void {
    this.facade.loadRoles();
    void this.facade.loadPermissionMatrix();

    const params = this.route.snapshot.queryParamMap;
    const left = params.get('left');
    const right = params.get('right');
    if (left) {
      this.leftId.set(left);
    }
    if (right) {
      this.rightId.set(right);
    }
    if (left && right) {
      void this.facade.loadCompare(left, right);
    }
  }

  protected runCompare(): void {
    const left = this.leftId();
    const right = this.rightId();
    if (!left || !right || left === right) {
      return;
    }
    void this.facade.loadCompare(left, right);
  }

  protected retryCompare(): void {
    this.runCompare();
  }
}

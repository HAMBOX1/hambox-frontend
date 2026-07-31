import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminBulkBarComponent,
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminProgressBarComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { HamboxRelativeTimePipe } from '../../../../../shared/pipes/hambox-relative-time.pipe';
import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { RoleQuickPreviewDrawerComponent } from '../../components/role-quick-preview-drawer/role-quick-preview-drawer.component';
import { PermissionGroupApiDto, RoleListItemApiDto } from '../../models/role-api.model';
import { RoleManagementFacade } from '../../services/role-management.facade';
import { isHighPrivilege, riskLabelKey, riskLevelFor, riskTone } from '../../utils/role-risk.util';

type RoleFilterKey =
  | 'all'
  | 'system'
  | 'custom'
  | 'highRisk'
  | 'unused'
  | 'assigned'
  | 'recentlyModified';

const VALID_FILTERS: readonly RoleFilterKey[] = [
  'system',
  'custom',
  'highRisk',
  'unused',
  'assigned',
  'recentlyModified',
];

const RECENTLY_MODIFIED_DAYS = 7;
const SMART_SEARCH_MIN_LENGTH = 2;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Component({
  selector: 'app-roles-list-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TranslatePipe,
    HamboxDatePipe,
    HamboxRelativeTimePipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    AdminBulkBarComponent,
    AdminSectionCardComponent,
    AdminProgressBarComponent,
    AdminLoadingSkeletonComponent,
    RoleQuickPreviewDrawerComponent,
  ],
  providers: [RoleManagementFacade, MessageService],
  templateUrl: './roles-list-page.component.html',
  styleUrl: './roles-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListPageComponent implements OnInit {
  private readonly facade = inject(RoleManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  protected readonly mobileViewport = inject(MobileViewportService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Roles' });
  protected readonly riskLevelFor = riskLevelFor;
  protected readonly riskLabelKey = riskLabelKey;
  protected readonly riskTone = riskTone;

  protected readonly roles = this.facade.roles;
  protected readonly loading = this.facade.rolesLoading;
  protected readonly error = this.facade.rolesError;
  protected readonly matrix = this.facade.matrix;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly totalPermissionCount = this.facade.matrixTotalPermissionCount;

  protected readonly searchTerm = signal('');
  private readonly smartSearchExtraIds = signal<ReadonlySet<string>>(new Set());
  private smartSearchToken = 0;

  protected readonly activeFilter = toSignal(
    this.route.queryParamMap.pipe(
      map((params): RoleFilterKey => {
        const raw = params.get('filter');
        return raw && (VALID_FILTERS as readonly string[]).includes(raw)
          ? (raw as RoleFilterKey)
          : 'all';
      }),
    ),
    { initialValue: 'all' as RoleFilterKey },
  );

  /** One compact dropdown instead of a row of chip buttons — the chip row was competing
   * visually with the table for attention. `translate.instant` here mirrors the same
   * non-reactive-to-language-switch pattern already used by `permission-matrix`'s
   * `moduleOptions` — acceptable since this list is rebuilt on every relevant render anyway. */
  protected readonly filterOptions = computed(() => [
    { label: this.translate.instant('ADMIN.ROLES.FILTERS.ALL'), value: 'all' as RoleFilterKey },
    { label: this.translate.instant('ADMIN.ROLES.FILTERS.SYSTEM'), value: 'system' as RoleFilterKey },
    { label: this.translate.instant('ADMIN.ROLES.FILTERS.CUSTOM'), value: 'custom' as RoleFilterKey },
    { label: this.translate.instant('ADMIN.ROLES.FILTERS.HIGH_RISK'), value: 'highRisk' as RoleFilterKey },
    { label: this.translate.instant('ADMIN.ROLES.FILTERS.UNUSED'), value: 'unused' as RoleFilterKey },
    { label: this.translate.instant('ADMIN.ROLES.FILTERS.ASSIGNED'), value: 'assigned' as RoleFilterKey },
    {
      label: this.translate.instant('ADMIN.ROLES.FILTERS.RECENTLY_MODIFIED'),
      value: 'recentlyModified' as RoleFilterKey,
    },
  ]);

  protected readonly selectedRoles = signal<RoleListItemApiDto[]>([]);
  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateTarget = signal<RoleListItemApiDto | null>(null);
  protected readonly duplicateName = signal('');

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<RoleListItemApiDto | null>(null);
  protected readonly bulkDeleteDialogOpen = signal(false);

  protected readonly bulkAssignDialogOpen = signal(false);
  protected readonly bulkAssignSelectedUserIds = signal<readonly string[]>([]);
  protected readonly bulkExporting = signal(false);

  protected readonly previewRole = signal<RoleListItemApiDto | null>(null);

  protected readonly userSearchResults = this.facade.userSearchResults;
  protected readonly userSearchLoading = this.facade.userSearchLoading;
  protected readonly userSearchError = this.facade.userSearchError;
  protected readonly userSearchTerm = this.facade.userSearchTerm;

  protected readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();
    const extraIds = this.smartSearchExtraIds();

    return this.roles().filter((role) => {
      if (!this.matchesFilter(role, filter)) {
        return false;
      }
      if (!term) {
        return true;
      }
      const quickMatch =
        role.name.toLowerCase().includes(term) ||
        (role.description?.toLowerCase().includes(term) ?? false);
      return quickMatch || extraIds.has(role.id);
    });
  });

  protected readonly hasActiveSearch = computed(() => this.searchTerm().trim().length > 0);

  protected readonly emptyStateTitleKey = computed(() => {
    if (this.hasActiveSearch()) {
      return 'ADMIN.ROLES.LIST.EMPTY_SEARCH';
    }
    switch (this.activeFilter()) {
      case 'unused':
        return 'ADMIN.ROLES.EMPTY.UNUSED';
      case 'custom':
        return 'ADMIN.ROLES.EMPTY.NO_CUSTOM';
      default:
        return 'ADMIN.ROLES.LIST.EMPTY';
    }
  });

  protected readonly canCompareSelected = computed(() => this.selectedRoles().length === 2);
  protected readonly canBulkDeleteSelected = computed(() =>
    this.selectedRoles().some((r) => !r.isSystem),
  );

  constructor() {
    effect(() => {
      const term = this.searchTerm().trim().toLowerCase();
      const roles = this.roles();
      const matrix = this.matrix();

      if (term.length < SMART_SEARCH_MIN_LENGTH || roles.length === 0 || matrix.length === 0) {
        this.smartSearchExtraIds.set(new Set());
        return;
      }

      void this.resolveSmartSearchMatches(term, roles, matrix);
    });
  }

  ngOnInit(): void {
    this.facade.loadRoles();
    void this.facade.loadPermissionMatrix();
  }

  protected onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  protected setFilter(filter: RoleFilterKey): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'all' ? null : filter },
      queryParamsHandling: 'merge',
    });
  }

  protected retryLoad(): void {
    void this.facade.reloadRoles();
  }

  protected permissionCoveragePercent(role: RoleListItemApiDto): number {
    const total = this.totalPermissionCount();
    if (total === 0) {
      return 0;
    }
    return Math.round((role.permissionCount / total) * 100);
  }

  protected openPreview(role: RoleListItemApiDto): void {
    this.previewRole.set(role);
  }

  protected closePreview(): void {
    this.previewRole.set(null);
  }

  protected onPreviewEdit(role: RoleListItemApiDto): void {
    this.closePreview();
    void this.router.navigate(['/admin/roles', role.id, 'edit']);
  }

  protected onPreviewAssignUsers(role: RoleListItemApiDto): void {
    this.closePreview();
    void this.router.navigate(['/admin/roles', role.id, 'edit'], {
      fragment: 'role-users-panel',
    });
  }

  protected onPreviewDuplicate(role: RoleListItemApiDto): void {
    this.closePreview();
    this.openDuplicateDialog(role);
  }

  protected onPreviewDelete(role: RoleListItemApiDto): void {
    this.closePreview();
    this.requestDeleteRole(role);
  }

  protected openDuplicateDialog(role: RoleListItemApiDto): void {
    this.duplicateTarget.set(role);
    this.duplicateName.set(`${role.name} Copy`);
    this.duplicateDialogOpen.set(true);
  }

  protected closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
    this.duplicateTarget.set(null);
    this.duplicateName.set('');
  }

  protected async confirmDuplicate(): Promise<void> {
    const role = this.duplicateTarget();
    if (!role) {
      return;
    }

    const createdId = await this.facade.duplicateRole(role.id, this.duplicateName().trim());
    if (createdId) {
      this.messageService.add({
        severity: 'success',
        summary: 'Role duplicated',
        detail: 'A copy of the role was created.',
        life: 4000,
      });
      this.closeDuplicateDialog();
      void this.router.navigate(['/admin/roles', createdId, 'edit']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Duplicate failed',
      detail: this.facade.rolesError() ?? 'Unable to duplicate role.',
      life: 5000,
    });
  }

  protected requestDeleteRole(role: RoleListItemApiDto): void {
    this.deleteTarget.set(role);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDeleteRole(): Promise<void> {
    const role = this.deleteTarget();
    if (!role) {
      return;
    }

    const success = await this.facade.deleteRole(role.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Role deleted',
        detail: `"${role.name}" was removed.`,
        life: 4000,
      });
      this.selectedRoles.set(this.selectedRoles().filter((r) => r.id !== role.id));
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: this.facade.rolesError() ?? 'Unable to delete role.',
      life: 5000,
    });
  }

  protected requestDeleteSelected(): void {
    const deletable = this.selectedRoles().filter((r) => !r.isSystem);
    if (deletable.length === 0) {
      return;
    }
    this.bulkDeleteDialogOpen.set(true);
  }

  protected async confirmDeleteSelected(): Promise<void> {
    const deletable = this.selectedRoles().filter((r) => !r.isSystem);
    for (const role of deletable) {
      await this.facade.deleteRole(role.id);
    }

    this.selectedRoles.set([]);
    this.bulkDeleteDialogOpen.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Roles deleted',
      detail: `${deletable.length} role(s) removed.`,
      life: 4000,
    });
  }

  protected async duplicateSelected(): Promise<void> {
    const targets = this.selectedRoles();
    if (targets.length === 0) {
      return;
    }

    for (const role of targets) {
      await this.facade.duplicateRole(role.id);
    }

    this.selectedRoles.set([]);
    this.messageService.add({
      severity: 'success',
      summary: 'Roles duplicated',
      detail: `${targets.length} role(s) duplicated.`,
      life: 4000,
    });
  }

  protected compareSelected(): void {
    const [left, right] = this.selectedRoles();
    if (!left || !right) {
      return;
    }
    void this.router.navigate(['/admin/roles/compare'], {
      queryParams: { left: left.id, right: right.id },
    });
  }

  protected async exportSelected(): Promise<void> {
    await this.exportRoles(this.selectedRoles());
  }

  protected async exportAll(): Promise<void> {
    await this.exportRoles(this.filteredRoles());
  }

  protected openBulkAssignDialog(): void {
    this.bulkAssignSelectedUserIds.set([]);
    this.facade.setBulkUserSearchTerm('');
    this.facade.searchUsersGlobal();
    this.bulkAssignDialogOpen.set(true);
  }

  protected closeBulkAssignDialog(): void {
    this.bulkAssignDialogOpen.set(false);
    this.bulkAssignSelectedUserIds.set([]);
  }

  protected onBulkAssignSearchChange(term: string): void {
    this.facade.setBulkUserSearchTerm(term);
  }

  protected toggleBulkAssignUser(userId: string, selected: boolean): void {
    const current = new Set(this.bulkAssignSelectedUserIds());
    if (selected) {
      current.add(userId);
    } else {
      current.delete(userId);
    }
    this.bulkAssignSelectedUserIds.set([...current]);
  }

  protected isBulkAssignUserSelected(userId: string): boolean {
    return this.bulkAssignSelectedUserIds().includes(userId);
  }

  protected async confirmBulkAssign(): Promise<void> {
    const userIds = this.bulkAssignSelectedUserIds();
    const roles = this.selectedRoles();
    if (userIds.length === 0 || roles.length === 0) {
      return;
    }

    for (const role of roles) {
      await this.facade.assignUsers(role.id, userIds);
    }

    this.closeBulkAssignDialog();
    this.selectedRoles.set([]);
    void this.facade.reloadRoles();
    this.messageService.add({
      severity: 'success',
      summary: 'Users assigned',
      detail: `${userIds.length} user(s) assigned to ${roles.length} role(s).`,
      life: 4000,
    });
  }

  protected deleteDialogMessage(): string {
    const role = this.deleteTarget();
    if (!role) {
      return '';
    }
    return this.translate.instant('ADMIN.CONFIRM.DELETE_ROLE', { name: role.name });
  }

  protected bulkDeleteDialogMessage(): string {
    const count = this.selectedRoles().filter((r) => !r.isSystem).length;
    return this.translate.instant('ADMIN.CONFIRM.DELETE_ROLES', { count });
  }

  protected clearSelection(): void {
    this.selectedRoles.set([]);
  }

  protected navigateToNew(): void {
    void this.router.navigate(['/admin/roles/new']);
  }

  protected onSelectionChange(selection: RoleListItemApiDto[]): void {
    this.selectedRoles.set(selection);
  }

  protected roleActionMenuItems(role: RoleListItemApiDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    if (this.permissionService.hasPermission(this.permissions.Roles.Create)) {
      items.push({
        label: t('ADMIN.ROLES.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        disabled: this.actionLoading(),
        command: () => this.openDuplicateDialog(role),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Roles.Delete)) {
      items.push({
        label: t('ADMIN.ROLES.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading() || role.isSystem,
        command: () => this.requestDeleteRole(role),
      });
    }

    return items;
  }

  private matchesFilter(role: RoleListItemApiDto, filter: RoleFilterKey): boolean {
    switch (filter) {
      case 'system':
        return role.isSystem;
      case 'custom':
        return !role.isSystem;
      case 'highRisk':
        return isHighPrivilege(role.priorityLevel);
      case 'unused':
        return role.userCount === 0;
      case 'assigned':
        return role.userCount > 0;
      case 'recentlyModified':
        return this.isRecentlyModified(role);
      default:
        return true;
    }
  }

  private isRecentlyModified(role: RoleListItemApiDto): boolean {
    const timestamp = role.modifiedOnUtc ?? role.createdOnUtc;
    if (!timestamp) {
      return false;
    }
    const ageDays = (Date.now() - new Date(timestamp).getTime()) / 86_400_000;
    return ageDays >= 0 && ageDays <= RECENTLY_MODIFIED_DAYS;
  }

  /** Module/permission search resolves against the already-loaded global matrix; only if the
   * term matches a permission/module name does it fetch each visible role's full detail
   * (parallel, cached via `facade.getRoleDetail`) to check membership — avoids the round trip
   * entirely for plain name/description searches. */
  private async resolveSmartSearchMatches(
    term: string,
    roles: readonly RoleListItemApiDto[],
    matrix: readonly PermissionGroupApiDto[],
  ): Promise<void> {
    const token = ++this.smartSearchToken;

    const matchingPermissionIds = new Set(
      matrix
        .filter(
          (group) =>
            group.module.toLowerCase().includes(term) || group.name.toLowerCase().includes(term),
        )
        .flatMap((group) => group.permissions.map((p) => p.id))
        .concat(
          matrix
            .flatMap((group) => group.permissions)
            .filter((p) => p.name.toLowerCase().includes(term))
            .map((p) => p.id),
        ),
    );

    if (matchingPermissionIds.size === 0) {
      this.smartSearchExtraIds.set(new Set());
      return;
    }

    const details = await Promise.all(roles.map((role) => this.facade.getRoleDetail(role.id)));
    if (token !== this.smartSearchToken) {
      return;
    }

    const extraIds = new Set<string>();
    details.forEach((detail, index) => {
      if (detail?.permissionIds.some((id) => matchingPermissionIds.has(id))) {
        extraIds.add(roles[index].id);
      }
    });

    this.smartSearchExtraIds.set(extraIds);
  }

  private async exportRoles(roles: readonly RoleListItemApiDto[]): Promise<void> {
    if (roles.length === 0 || this.bulkExporting()) {
      return;
    }

    this.bulkExporting.set(true);
    try {
      const details = await Promise.all(roles.map((role) => this.facade.getRoleDetail(role.id)));
      const permissionNameById = new Map(
        this.matrix().flatMap((group) => group.permissions.map((p) => [p.id, p.name] as const)),
      );

      const header = ['Name', 'Description', 'Priority', 'Risk', 'Type', 'Users', 'Permissions'];
      const rows = roles.map((role, index) => {
        const detail = details[index];
        const permissionNames =
          detail?.permissionIds.map((id) => permissionNameById.get(id) ?? id).join('; ') ?? '';
        return [
          role.name,
          role.description ?? '',
          String(role.priorityLevel),
          riskLevelFor(role.priorityLevel),
          role.isSystem ? 'System' : 'Custom',
          String(role.userCount),
          permissionNames,
        ];
      });

      const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hambox-roles-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      this.bulkExporting.set(false);
    }
  }
}

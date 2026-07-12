import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
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
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { RoleListItemApiDto } from '../../models/role-api.model';
import { RoleManagementFacade } from '../../services/role-management.facade';

@Component({
  selector: 'app-roles-list-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
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
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Roles' });

  protected readonly roles = this.facade.roles;
  protected readonly loading = this.facade.rolesLoading;
  protected readonly error = this.facade.rolesError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly selectedRoles = signal<RoleListItemApiDto[]>([]);
  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateTarget = signal<RoleListItemApiDto | null>(null);
  protected readonly duplicateName = signal('');

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<RoleListItemApiDto | null>(null);
  protected readonly bulkDeleteDialogOpen = signal(false);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  protected readonly listStats = computed(() => {
    const items = this.roles();

    return {
      total: this.totalCount(),
      system: items.filter((r) => r.isSystem).length,
      custom: items.filter((r) => !r.isSystem).length,
      users: items.reduce((sum, r) => sum + (r.userCount ?? 0), 0),
    };
  });

  ngOnInit(): void {
    this.facade.loadRoles();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;
    this.facade.setPage(pageNumber, rows);
    this.selectedRoles.set([]);
  }

  protected retryLoad(): void {
    void this.facade.reloadRoles();
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
}

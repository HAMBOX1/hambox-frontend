import {

  ChangeDetectionStrategy,

  Component,

  inject,

  input,

  output,

  signal,

} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';

import { DialogModule } from 'primeng/dialog';

import { InputTextModule } from 'primeng/inputtext';

import { TableModule } from 'primeng/table';



import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';

import {

  AdminConfirmDialogComponent,

  AdminDataTableShellComponent,

  AdminEmptyStateComponent,

  AdminErrorAlertComponent,

  AdminIconButtonComponent,

  AdminLoadingSkeletonComponent,

  AdminSearchBarComponent,

  AdminStatusBadgeComponent,

  AdminStatusTone,

  AdminToolbarComponent,

} from '../../../../../shared/components/admin';

import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

import { UserSearchResultApiDto } from '../../models/role-api.model';

import { RoleManagementFacade } from '../../services/role-management.facade';



@Component({

  selector: 'app-role-users-panel',

  standalone: true,

  imports: [

    FormsModule,

    TranslatePipe,

    ButtonModule,

    DialogModule,

    InputTextModule,

    TableModule,

    HasPermissionDirective,

    AdminToolbarComponent,

    AdminSearchBarComponent,

    AdminErrorAlertComponent,

    AdminDataTableShellComponent,

  AdminEmptyStateComponent,

  AdminIconButtonComponent,

  AdminLoadingSkeletonComponent,

  AdminStatusBadgeComponent,

  AdminConfirmDialogComponent,

  ],

  templateUrl: './role-users-panel.component.html',

  styleUrl: './role-users-panel.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class RoleUsersPanelComponent {

  protected readonly permissions = PERMISSIONS;



  readonly roleId = input.required<string>();

  readonly disabled = input(false);



  readonly usersChanged = output<void>();



  protected readonly facade = inject(RoleManagementFacade);



  protected readonly assignDialogOpen = signal(false);

  protected readonly selectedUserIds = signal<readonly string[]>([]);

  protected readonly removeDialogOpen = signal(false);

  protected readonly removeTarget = signal<UserSearchResultApiDto | null>(null);



  protected readonly users = this.facade.roleUsers;

  protected readonly usersLoading = this.facade.roleUsersLoading;

  protected readonly usersError = this.facade.roleUsersError;

  protected readonly usersSearch = this.facade.roleUsersSearch;

  protected readonly usersTotal = this.facade.roleUsersTotal;

  protected readonly usersPage = this.facade.roleUsersPage;

  protected readonly usersPageSize = this.facade.roleUsersPageSize;

  protected readonly userSearchResults = this.facade.userSearchResults;

  protected readonly userSearchLoading = this.facade.userSearchLoading;

  protected readonly userSearchError = this.facade.userSearchError;

  protected readonly userSearchTerm = this.facade.userSearchTerm;

  protected readonly actionLoading = this.facade.actionLoading;



  protected onUsersSearchChange(term: string): void {

    this.facade.setRoleUsersSearch(term, this.roleId());

  }



  protected onAssignSearchChange(term: string): void {

    this.facade.setUserSearchTerm(term, this.roleId());

  }



  protected openAssignDialog(): void {

    this.selectedUserIds.set([]);

    this.facade.setUserSearchTerm('', this.roleId());

    this.facade.searchUsersForAssignment(this.roleId());

    this.assignDialogOpen.set(true);

  }



  protected closeAssignDialog(): void {

    this.assignDialogOpen.set(false);

    this.selectedUserIds.set([]);

  }



  protected toggleUserSelection(userId: string, selected: boolean): void {

    const current = new Set(this.selectedUserIds());

    if (selected) {

      current.add(userId);

    } else {

      current.delete(userId);

    }

    this.selectedUserIds.set([...current]);

  }



  protected isUserSelected(userId: string): boolean {

    return this.selectedUserIds().includes(userId);

  }



  protected async assignSelectedUsers(): Promise<void> {

    const userIds = this.selectedUserIds();

    if (userIds.length === 0) {

      return;

    }



    const success = await this.facade.assignUsers(this.roleId(), userIds);

    if (success) {

      this.closeAssignDialog();

      this.usersChanged.emit();

    }

  }



  protected requestRemoveUser(user: UserSearchResultApiDto): void {

    this.removeTarget.set(user);

    this.removeDialogOpen.set(true);

  }

  protected closeRemoveDialog(): void {

    this.removeDialogOpen.set(false);

    this.removeTarget.set(null);

  }

  protected async confirmRemoveUser(): Promise<void> {

    const user = this.removeTarget();

    if (!user) {

      return;

    }

    const success = await this.facade.removeUser(this.roleId(), user.id);

    if (success) {

      this.closeRemoveDialog();

      this.usersChanged.emit();

    }

  }

  protected removeDialogMessage(): string {

    const user = this.removeTarget();

    return user ? this.displayName(user) : '';

  }



  protected displayName(user: UserSearchResultApiDto): string {

    const name = `${user.firstName} ${user.lastName}`.trim();

    return name || user.email;

  }



  protected statusTone(status: string): AdminStatusTone {

    const normalized = status?.toLowerCase() ?? '';



    if (normalized === 'active') {

      return 'success';

    }



    if (normalized === 'inactive' || normalized === 'disabled') {

      return 'neutral';

    }



    if (normalized === 'suspended' || normalized === 'blocked') {

      return 'danger';

    }



    return 'info';

  }

}


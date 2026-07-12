import {

  ChangeDetectionStrategy,

  Component,

  computed,

  effect,

  inject,

  OnInit,

  signal,

} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { TranslatePipe } from '@ngx-translate/core';

import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';

import { CheckboxModule } from 'primeng/checkbox';

import { InputTextModule } from 'primeng/inputtext';

import { TextareaModule } from 'primeng/textarea';

import { ToastModule } from 'primeng/toast';



import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';

import { PermissionService } from '../../../../../core/permissions/permission.service';

import {

  AdminErrorAlertComponent,

  AdminLoadingSkeletonComponent,

  AdminPageHeaderComponent,

  AdminSectionCardComponent,

  AdminStickySaveBarComponent,

} from '../../../../../shared/components/admin';

import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';

import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

import { PermissionMatrixComponent } from '../../components/permission-matrix/permission-matrix.component';

import { RoleUsersPanelComponent } from '../../components/role-users-panel/role-users-panel.component';

import { RoleManagementFacade } from '../../services/role-management.facade';



@Component({

  selector: 'app-role-edit-page',

  standalone: true,

  imports: [

    FormsModule,

    RouterLink,

    TranslatePipe,

    ButtonModule,

    CheckboxModule,

    InputTextModule,

    TextareaModule,

    ToastModule,

    HasPermissionDirective,

    AdminPageHeaderComponent,

    AdminSectionCardComponent,

    AdminErrorAlertComponent,

    AdminLoadingSkeletonComponent,

    AdminStickySaveBarComponent,

    PermissionMatrixComponent,

    RoleUsersPanelComponent,

  ],

  providers: [RoleManagementFacade, MessageService],

  templateUrl: './role-edit-page.component.html',

  styleUrl: './role-edit-page.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class RoleEditPageComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  protected readonly facade = inject(RoleManagementFacade);

  private readonly messageService = inject(MessageService);

  private readonly permissionService = inject(PermissionService);

  private readonly translate = inject(TranslateService);



  protected readonly permissions = PERMISSIONS;



  protected readonly roleId = signal<string | null>(null);

  protected readonly isCreateMode = computed(() => this.roleId() === null);

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.ROLES.LIST.TITLE'),
        route: '/admin/roles',
      },
      {
        label: this.translate.instant(
          this.isCreateMode() ? 'ADMIN.ROLES.EDIT.CREATE_TITLE' : 'ADMIN.ROLES.EDIT.EDIT_TITLE',
        ),
      },
    ),
  );



  protected readonly name = signal('');

  protected readonly description = signal('');

  protected readonly priorityLevel = signal(100);

  protected readonly isDefault = signal(false);



  protected readonly detail = this.facade.detail;

  protected readonly detailLoading = this.facade.detailLoading;

  protected readonly detailSaving = this.facade.detailSaving;

  protected readonly detailError = this.facade.detailError;

  protected readonly matrix = this.facade.matrix;

  protected readonly matrixLoading = this.facade.matrixLoading;

  protected readonly matrixError = this.facade.matrixError;

  protected readonly matrixModules = this.facade.matrixModules;

  protected readonly selectedPermissionIds = this.facade.selectedPermissionIds;



  protected readonly canEdit = computed(

    () =>

      this.permissionService.isOwner() ||

      this.permissionService.hasPermission(PERMISSIONS.Roles.Edit),

  );



  protected readonly formDisabled = computed(() => {

    const detail = this.detail();

    return !!detail?.isSystem || !this.canEdit();

  });



  constructor() {

    effect(() => {

      const detail = this.detail();

      if (!detail || this.isCreateMode()) {

        return;

      }



      this.name.set(detail.name);

      this.description.set(detail.description ?? '');

      this.priorityLevel.set(detail.priorityLevel);

      this.isDefault.set(detail.isDefault);

    });

  }



  ngOnInit(): void {

    const idParam = this.route.snapshot.paramMap.get('id');

    const isNew = !idParam || idParam === 'new';



    if (isNew) {

      this.roleId.set(null);

      this.facade.resetDetail();

    } else {

      this.roleId.set(idParam);

      void this.facade.loadRoleDetail(idParam);

      this.facade.loadRoleUsers(idParam);

    }



    void this.facade.loadPermissionMatrix();

  }



  protected onPermissionToggle(event: { permissionId: string; selected: boolean }): void {

    this.facade.togglePermission(event.permissionId, event.selected);

  }



  protected async saveRole(): Promise<void> {

    const roleId = this.roleId();



    if (roleId) {

      const updated = await this.facade.updateRole(roleId, {

        name: this.name().trim(),

        description: this.description().trim() || null,

        priorityLevel: this.priorityLevel(),

        isDefault: this.isDefault(),

      });



      if (!updated) {

        this.showError('ADMIN.ROLES.EDIT.SAVE_FAILED');

        return;

      }



      const permissionsSaved = await this.facade.savePermissions(roleId);

      if (!permissionsSaved) {

        this.showError('ADMIN.ROLES.EDIT.PERMISSIONS_SAVE_FAILED');

        return;

      }



      this.messageService.add({

        severity: 'success',

        summary: 'Role saved',

        detail: 'Role details and permissions were updated.',

        life: 4000,

      });

      return;

    }



    const createdId = await this.facade.createRole({

      name: this.name().trim(),

      description: this.description().trim() || null,

      priorityLevel: this.priorityLevel(),

    });



    if (!createdId) {

      this.showError('ADMIN.ROLES.EDIT.CREATE_FAILED');

      return;

    }



    this.facade.setSelectedPermissionIds(this.selectedPermissionIds());

    const permissionsSaved = await this.facade.savePermissions(createdId);

    if (!permissionsSaved) {

      this.showError('ADMIN.ROLES.EDIT.PERMISSIONS_SAVE_FAILED');

      void this.router.navigate(['/admin/roles', createdId, 'edit']);

      return;

    }



    this.messageService.add({

      severity: 'success',

      summary: 'Role created',

      detail: 'The new role was created successfully.',

      life: 4000,

    });

    void this.router.navigate(['/admin/roles', createdId, 'edit']);

  }



  private showError(detailKey: string): void {

    this.messageService.add({

      severity: 'error',

      summary: 'Save failed',

      detail: this.facade.detailError() ?? detailKey,

      life: 5000,

    });

  }

}


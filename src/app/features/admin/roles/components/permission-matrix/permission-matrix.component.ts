import {

  ChangeDetectionStrategy,

  Component,

  computed,

  input,

  output,

  signal,

} from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';



import {

  AdminEmptyStateComponent,

  AdminLoadingSkeletonComponent,

  AdminSearchBarComponent,

  AdminSectionCardComponent,

  AdminToolbarComponent,

} from '../../../../../shared/components/admin';

import { PermissionApiDto, PermissionGroupApiDto } from '../../models/role-api.model';



@Component({

  selector: 'app-permission-matrix',

  standalone: true,

  imports: [

    TranslatePipe,

    ButtonModule,

    AdminSearchBarComponent,

    AdminToolbarComponent,

    AdminSectionCardComponent,

    AdminEmptyStateComponent,

    AdminLoadingSkeletonComponent,

  ],

  templateUrl: './permission-matrix.component.html',

  styleUrl: './permission-matrix.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class PermissionMatrixComponent {

  readonly groups = input.required<readonly PermissionGroupApiDto[]>();

  readonly modules = input.required<readonly string[]>();

  readonly selectedIds = input.required<readonly string[]>();

  readonly loading = input(false);

  readonly disabled = input(false);



  readonly selectedIdsChange = output<readonly string[]>();

  readonly permissionToggle = output<{ permissionId: string; selected: boolean }>();

  readonly selectAllGroup = output<PermissionGroupApiDto>();

  readonly clearAllGroup = output<PermissionGroupApiDto>();



  protected readonly permissionSearchTerm = signal('');

  protected readonly selectedModule = signal('');



  protected readonly moduleOptions = computed(() => [

    { label: 'All modules', value: '' },

    ...this.modules().map((module) => ({ label: module, value: module })),

  ]);



  protected readonly filteredGroups = computed(() => {

    const module = this.selectedModule();

    const groups = this.groups();



    if (!module) {

      return groups;

    }



    return groups.filter((group) => group.module === module);

  });



  protected readonly hasVisibleGroups = computed(() => {

    const search = this.permissionSearchTerm().trim().toLowerCase();



    return this.filteredGroups().some((group) => {

      const permissions = this.visiblePermissions(group, search);

      return permissions.length > 0;

    });

  });



  protected isSelected(permissionId: string): boolean {

    return this.selectedIds().includes(permissionId);

  }



  protected onPermissionChange(permissionId: string, selected: boolean): void {

    this.permissionToggle.emit({ permissionId, selected });

  }



  protected onSelectAll(group: PermissionGroupApiDto): void {

    this.selectAllGroup.emit(group);

  }



  protected onClearAll(group: PermissionGroupApiDto): void {

    this.clearAllGroup.emit(group);

  }



  protected selectedCount(group: PermissionGroupApiDto): number {

    const selected = new Set(this.selectedIds());

    return group.permissions.filter((permission) => selected.has(permission.id)).length;

  }



  protected progressPercent(group: PermissionGroupApiDto): number {

    const total = group.permissions.length;

    if (total === 0) {

      return 0;

    }



    return Math.round((this.selectedCount(group) / total) * 100);

  }



  protected visiblePermissions(

    group: PermissionGroupApiDto,

    search = this.permissionSearchTerm().trim().toLowerCase(),

  ): readonly PermissionApiDto[] {

    if (!search) {

      return group.permissions;

    }



    return group.permissions.filter(

      (permission) =>

        permission.name.toLowerCase().includes(search) ||

        (permission.description?.toLowerCase().includes(search) ?? false),

    );

  }



  protected onModuleSelect(module: string): void {

    this.selectedModule.set(module);

  }



  protected onSearchChange(term: string): void {

    this.permissionSearchTerm.set(term);

  }

}


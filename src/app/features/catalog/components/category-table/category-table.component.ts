import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminStatusBadgeComponent,
} from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-category-table',
  standalone: true,
  imports: [
    TableModule,
    HasPermissionDirective,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminLoadingSkeletonComponent,
    AdminDataTableShellComponent,
  ],
  templateUrl: './category-table.component.html',
  styleUrl: './category-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTableComponent {
  protected readonly permissions = PERMISSIONS;

  readonly categories = input.required<readonly Category[]>();
  readonly parentOptions = input<readonly Category[]>([]);
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly pageSize = input(20);
  readonly first = input(0);
  readonly searchActive = input(false);

  readonly createCategory = output<void>();
  readonly editCategory = output<Category>();
  readonly deleteCategory = output<Category>();
  readonly restoreCategory = output<Category>();

  readonly pageChange = output<TableLazyLoadEvent>();

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.pageChange.emit(event);
  }

  protected parentLabel(category: Category): string {
    if (!category.parentId) {
      return '—';
    }

    return this.parentOptions().find((item) => item.id === category.parentId)?.nameEn ?? category.parentId;
  }
}

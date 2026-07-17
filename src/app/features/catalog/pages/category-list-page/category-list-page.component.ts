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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TableLazyLoadEvent } from 'primeng/table';

import { CategoryCreateFormComponent } from '../../components/category-create-form/category-create-form.component';
import { CategoryTableComponent } from '../../components/category-table/category-table.component';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';
import { CategoryListFacade } from '../../services/category-list.facade';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminToolbarComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

@Component({
  selector: 'app-category-list-page',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    SelectModule,
    ToastModule,
    CategoryTableComponent,
    CategoryCreateFormComponent,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [CategoryListFacade, MessageService],
  templateUrl: './category-list-page.component.html',
  styleUrl: './category-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListPageComponent implements OnInit {
  private readonly facade = inject(CategoryListFacade);
  private readonly messageService = inject(MessageService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Categories' });
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly items = this.facade.items;
  protected readonly parentOptions = this.facade.parentOptions;
  protected readonly loading = this.facade.loading;
  protected readonly creating = this.facade.creating;
  protected readonly updating = this.facade.updating;
  protected readonly deleting = this.facade.deleting;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly error = this.facade.error;
  protected readonly createError = this.facade.createError;
  protected readonly updateError = this.facade.updateError;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly createDialogOpen = this.facade.createDialogOpen;
  protected readonly editDialogOpen = this.facade.editDialogOpen;
  protected readonly editingCategory = this.facade.editingCategory;
  protected readonly hasActiveSearch = this.facade.hasActiveSearch;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly subtitle = this.facade.subtitle;

  protected readonly formResetToken = signal(0);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<Category | null>(null);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  protected readonly listStats = computed(() => {
    const items = this.items();

    return {
      total: this.totalCount(),
      active: items.filter((category) => category.isActive).length,
      inactive: items.filter((category) => !category.isActive).length,
    };
  });

  constructor() {
    effect(() => {
      if (this.facade.createDialogOpen() || this.facade.editDialogOpen()) {
        this.formResetToken.update((value) => value + 1);
      }
    });
  }

  ngOnInit(): void {
    this.facade.load();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusFilterChange(status: string): void {
    this.facade.setStatusFilter(status);
  }

  protected onClearFilters(): void {
    this.facade.clearFilters();
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;

    this.facade.setPage(pageNumber, rows);
  }

  protected retryLoad(): void {
    void this.facade.reload();
  }

  protected openCreateDialog(): void {
    this.facade.openCreateDialog();
  }

  protected openEditDialog(category: Category): void {
    this.facade.openEditDialog(category);
  }

  protected onCreateDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeCreateDialog();
    }
  }

  protected onEditDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeEditDialog();
    }
  }

  protected async onCreateSubmitted(request: CreateCategoryRequest): Promise<void> {
    const created = await this.facade.createCategory(request);

    if (created) {
      this.messageService.add({
        severity: 'success',
        summary: 'Category created',
        detail: `"${request.nameEn}" was added to the catalog.`,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Create failed',
      detail: this.facade.createError() ?? 'Unable to create category.',
      life: 5000,
    });
  }

  protected async onUpdateSubmitted(request: UpdateCategoryRequest): Promise<void> {
    const updated = await this.facade.updateCategory(request);

    if (updated) {
      this.messageService.add({
        severity: 'success',
        summary: 'Category updated',
        detail: `"${request.nameEn}" was saved.`,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Update failed',
      detail: this.facade.updateError() ?? 'Unable to update category.',
      life: 5000,
    });
  }

  protected requestDelete(category: Category): void {
    this.deleteTarget.set(category);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const category = this.deleteTarget();
    if (!category) {
      return;
    }

    const success = await this.facade.deleteCategory(category.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Category deleted',
        detail: `"${category.nameEn}" was removed.`,
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
    }
  }

  protected async restoreCategory(category: Category): Promise<void> {
    const success = await this.facade.restoreCategory(category);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Category restored',
        detail: `"${category.nameEn}" is active again.`,
        life: 4000,
      });
    }
  }

  protected deleteDialogMessage(): string {
    const category = this.deleteTarget();
    return category ? `Delete "${category.nameEn}"? Products will remain but lose this category link.` : '';
  }

  protected onCreateCancelled(): void {
    this.facade.closeCreateDialog();
  }

  protected onEditCancelled(): void {
    this.facade.closeEditDialog();
  }
}

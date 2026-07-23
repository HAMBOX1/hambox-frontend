import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { CategoryCreateFormComponent } from '../../components/category-create-form/category-create-form.component';
import { CategoryTreeComponent } from '../../components/category-tree/category-tree.component';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';
import { CategoryListFacade } from '../../services/category-list.facade';
import { exportCategoriesToCsv } from '../../utils/category-export.util';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
} from '../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../shared/components/admin/admin-breadcrumb.helpers';

@Component({
  selector: 'app-category-list-page',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    DrawerModule,
    ToastModule,
    CategoryTreeComponent,
    CategoryCreateFormComponent,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminIconButtonComponent,
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

  protected readonly totalCount = this.facade.totalCount;
  protected readonly loading = this.facade.loading;
  protected readonly creating = this.facade.creating;
  protected readonly updating = this.facade.updating;
  protected readonly deleting = this.facade.deleting;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly error = this.facade.error;
  protected readonly createError = this.facade.createError;
  protected readonly updateError = this.facade.updateError;
  protected readonly flatItems = this.facade.flatItems;
  protected readonly parentOptions = this.facade.parentOptions;
  protected readonly editableParentOptions = this.facade.editableParentOptions;
  protected readonly createDialogOpen = this.facade.createDialogOpen;
  protected readonly editDialogOpen = this.facade.editDialogOpen;
  protected readonly editingCategory = this.facade.editingCategory;
  protected readonly createParentId = this.facade.createParentId;
  protected readonly subtitle = this.facade.subtitle;

  protected readonly formResetToken = signal(0);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<Category | null>(null);
  protected readonly discardChangesDialogOpen = signal(false);

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

  protected retryLoad(): void {
    void this.facade.reload();
  }

  protected exportCategories(): void {
    exportCategoriesToCsv(this.flatItems());
  }

  protected openCreateDialog(): void {
    this.facade.openCreateDialog();
  }

  protected openCreateDialogForParent(parentId: string): void {
    this.facade.openCreateDialog(parentId);
  }

  protected openEditDialog(category: Category): void {
    this.facade.openEditDialog(category);
  }

  protected onCreateDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.facade.closeCreateDialog();
    }
  }

  protected onEditDialogVisibleChange(visible: boolean, form: CategoryCreateFormComponent): void {
    if (visible) {
      return;
    }

    if (form.isDirty()) {
      // Leave `editDialogOpen` true so the drawer's own [visible] binding snaps back
      // open on the next check — the confirm dialog decides whether the close proceeds.
      this.discardChangesDialogOpen.set(true);
      return;
    }

    this.facade.closeEditDialog();
  }

  protected confirmDiscardChanges(): void {
    this.discardChangesDialogOpen.set(false);
    this.facade.closeEditDialog();
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

  protected requestDeleteFromEditForm(): void {
    const category = this.editingCategory();
    if (category) {
      this.requestDelete(category);
    }
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
      this.facade.closeEditDialog();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Delete failed',
        detail: this.facade.error() ?? 'Unable to delete category.',
        life: 5000,
      });
    }
  }

  protected deleteDialogMessage(): string {
    const category = this.deleteTarget();
    return category
      ? `Delete "${category.nameEn}"? Categories with products or subcategories can't be deleted — reassign or remove those first.`
      : '';
  }

  protected onCreateCancelled(): void {
    this.facade.closeCreateDialog();
  }
}

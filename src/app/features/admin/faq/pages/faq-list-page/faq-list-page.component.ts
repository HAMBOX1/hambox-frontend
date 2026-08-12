import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { FaqDto, FaqScope } from '../../models/faq-api.model';
import { FaqManagementFacade } from '../../services/faq-management.facade';

const SCOPE_OPTIONS: { label: string; value: FaqScope | 'all' }[] = [
  { label: 'All scopes', value: 'all' },
  { label: 'Global', value: 'Global' },
  { label: 'Product', value: 'Product' },
  { label: 'Category', value: 'Category' },
];

const PUBLISHED_OPTIONS: { label: string; value: boolean | 'all' }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Published', value: true },
  { label: 'Draft', value: false },
];

@Component({
  selector: 'app-faq-list-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    ButtonModule,
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
  ],
  providers: [FaqManagementFacade, MessageService],
  templateUrl: './faq-list-page.component.html',
  styleUrl: './faq-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqListPageComponent implements OnInit {
  private readonly facade = inject(FaqManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'FAQ' });
  protected readonly scopeOptions = SCOPE_OPTIONS;
  protected readonly publishedOptions = PUBLISHED_OPTIONS;

  protected readonly faqs = this.facade.faqs;
  protected readonly loading = this.facade.faqsLoading;
  protected readonly error = this.facade.faqsError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly scopeFilter = this.facade.scopeFilter;
  protected readonly categoryFilter = this.facade.categoryFilter;
  protected readonly publishedFilter = this.facade.publishedFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly categories = this.facade.categories;

  protected readonly categoryOptions = computed(() => [
    { label: 'All categories', value: 'all' },
    ...this.categories().map((c) => ({ label: c.nameEn, value: c.id })),
  ]);

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<FaqDto | null>(null);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  ngOnInit(): void {
    this.facade.loadFaqs();
    void this.facade.loadCategories();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onScopeChange(value: FaqScope | 'all'): void {
    this.facade.setScopeFilter(value);
  }

  protected onCategoryChange(value: string): void {
    this.facade.setCategoryFilter(value);
  }

  protected onPublishedChange(value: boolean | 'all'): void {
    this.facade.setPublishedFilter(value);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;
    this.facade.setPage(pageNumber, rows);
  }

  protected navigateToNew(): void {
    void this.router.navigate(['/admin/faqs/new']);
  }

  protected retryLoad(): void {
    void this.facade.reloadFaqs();
  }

  protected scopeTone(scope: FaqScope): AdminStatusTone {
    switch (scope) {
      case 'Global':
        return 'info';
      case 'Product':
        return 'success';
      case 'Category':
        return 'warning';
    }
  }

  protected publishedTone(isPublished: boolean): AdminStatusTone {
    return isPublished ? 'success' : 'neutral';
  }

  /** Swaps SortOrder with the adjacent row within the currently loaded page — reordering across
   * a page/search boundary isn't supported (deliberate scope limit, see moveUp/moveDown callers). */
  protected canMoveUp(faq: FaqDto): boolean {
    return this.faqs().findIndex((f) => f.id === faq.id) > 0;
  }

  protected canMoveDown(faq: FaqDto): boolean {
    const items = this.faqs();
    const index = items.findIndex((f) => f.id === faq.id);
    return index >= 0 && index < items.length - 1;
  }

  protected async moveUp(faq: FaqDto): Promise<void> {
    const items = this.faqs();
    const index = items.findIndex((f) => f.id === faq.id);
    if (index <= 0) {
      return;
    }
    const above = items[index - 1];
    await this.facade.reorderFaqs([
      { id: faq.id, sortOrder: above.sortOrder },
      { id: above.id, sortOrder: faq.sortOrder },
    ]);
  }

  protected async moveDown(faq: FaqDto): Promise<void> {
    const items = this.faqs();
    const index = items.findIndex((f) => f.id === faq.id);
    if (index < 0 || index >= items.length - 1) {
      return;
    }
    const below = items[index + 1];
    await this.facade.reorderFaqs([
      { id: faq.id, sortOrder: below.sortOrder },
      { id: below.id, sortOrder: faq.sortOrder },
    ]);
  }

  protected async togglePublish(faq: FaqDto): Promise<void> {
    const success = await this.facade.setPublishState(faq.id, !faq.isPublished);
    this.showActionResult(
      success,
      faq.isPublished ? 'FAQ unpublished' : 'FAQ published',
      'Failed to update publish state',
    );
  }

  protected async duplicate(faq: FaqDto): Promise<void> {
    const createdId = await this.facade.duplicateFaq(faq.id);
    if (createdId) {
      this.messageService.add({ severity: 'success', summary: 'FAQ duplicated', life: 4000 });
      void this.router.navigate(['/admin/faqs', createdId, 'edit']);
      return;
    }
    this.messageService.add({
      severity: 'error',
      summary: 'Duplicate failed',
      detail: this.facade.faqsError() ?? undefined,
      life: 5000,
    });
  }

  protected requestDelete(faq: FaqDto): void {
    this.deleteTarget.set(faq);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const faq = this.deleteTarget();
    if (!faq) {
      return;
    }

    const success = await this.facade.deleteFaq(faq.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'FAQ deleted',
        detail: `"${faq.questionEn}" was removed.`,
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: this.facade.faqsError() ?? undefined,
      life: 5000,
    });
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  protected deleteDialogMessage(): string {
    const faq = this.deleteTarget();
    return faq ? `Delete "${faq.questionEn}"? This cannot be undone.` : '';
  }

  private showActionResult(success: boolean, successMsg: string, failMsg: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: successMsg, life: 4000 });
      return;
    }
    this.messageService.add({
      severity: 'error',
      summary: failMsg,
      detail: this.facade.faqsError() ?? undefined,
      life: 5000,
    });
  }

  protected faqActionMenuItems(faq: FaqDto): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.permissionService.hasPermission(this.permissions.Faq.Create)) {
      items.push({
        label: 'Duplicate',
        icon: 'pi pi-copy',
        disabled: this.actionLoading(),
        command: () => void this.duplicate(faq),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Faq.Publish)) {
      items.push({
        label: faq.isPublished ? 'Unpublish' : 'Publish',
        icon: faq.isPublished ? 'pi pi-eye-slash' : 'pi pi-send',
        disabled: this.actionLoading(),
        command: () => void this.togglePublish(faq),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Faq.Delete)) {
      items.push({
        label: 'Delete',
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDelete(faq),
      });
    }

    return items;
  }
}

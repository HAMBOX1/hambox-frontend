import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
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
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import {
  PROMOTION_STATUS_OPTIONS,
  PROMOTION_TYPE_OPTIONS,
  PromotionListItemDto,
} from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';

@Component({
  selector: 'app-promotions-list-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    SelectModule,
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
  providers: [PromotionManagementFacade, MessageService],
  templateUrl: './promotions-list-page.component.html',
  styleUrl: './promotions-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsListPageComponent implements OnInit {
  private readonly facade = inject(PromotionManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Promotions' });
  protected readonly statusOptions = [...PROMOTION_STATUS_OPTIONS];
  protected readonly typeOptions = [...PROMOTION_TYPE_OPTIONS];

  protected readonly promotions = this.facade.promotions;
  protected readonly loading = this.facade.promotionsLoading;
  protected readonly error = this.facade.promotionsError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly typeFilter = this.facade.typeFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly listStats = this.facade.listStats;

  protected readonly selectedPromotions = signal<PromotionListItemDto[]>([]);
  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateTarget = signal<PromotionListItemDto | null>(null);
  protected readonly duplicateName = signal('');

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<PromotionListItemDto | null>(null);
  protected readonly bulkDeleteDialogOpen = signal(false);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  ngOnInit(): void {
    this.facade.loadPromotions();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusChange(value: string): void {
    this.facade.setStatusFilter(value);
  }

  protected onTypeChange(value: string): void {
    this.facade.setTypeFilter(value);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;
    this.facade.setPage(pageNumber, rows);
    this.selectedPromotions.set([]);
  }

  protected onSelectionChange(selection: PromotionListItemDto[]): void {
    this.selectedPromotions.set(selection);
  }

  protected clearSelection(): void {
    this.selectedPromotions.set([]);
  }

  protected navigateToNew(): void {
    void this.router.navigate(['/admin/promotions/new']);
  }

  protected retryLoad(): void {
    void this.facade.reloadPromotions();
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Inactive':
        return 'warning';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected formatDiscount(item: PromotionListItemDto): string {
    if (item.discountType === 'Percentage') {
      return `${item.discountValue}%`;
    }
    return `${item.discountValue}`;
  }

  protected openDuplicateDialog(promotion: PromotionListItemDto): void {
    this.duplicateTarget.set(promotion);
    this.duplicateName.set(`${promotion.name} Copy`);
    this.duplicateDialogOpen.set(true);
  }

  protected closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
    this.duplicateTarget.set(null);
    this.duplicateName.set('');
  }

  protected async confirmDuplicate(): Promise<void> {
    const promotion = this.duplicateTarget();
    if (!promotion) {
      return;
    }

    const createdId = await this.facade.duplicatePromotion(
      promotion.id,
      this.duplicateName().trim(),
    );
    if (createdId) {
      this.messageService.add({
        severity: 'success',
        summary: 'Promotion duplicated',
        detail: 'A copy of the promotion was created.',
        life: 4000,
      });
      this.closeDuplicateDialog();
      void this.router.navigate(['/admin/promotions', createdId, 'edit']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Duplicate failed',
      detail: this.facade.promotionsError() ?? 'Unable to duplicate promotion.',
      life: 5000,
    });
  }

  protected requestDeletePromotion(promotion: PromotionListItemDto): void {
    this.deleteTarget.set(promotion);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDeletePromotion(): Promise<void> {
    const promotion = this.deleteTarget();
    if (!promotion) {
      return;
    }

    const success = await this.facade.deletePromotion(promotion.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Promotion deleted',
        detail: `"${promotion.name}" was removed.`,
        life: 4000,
      });
      this.selectedPromotions.set(this.selectedPromotions().filter((p) => p.id !== promotion.id));
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: this.facade.promotionsError() ?? 'Unable to delete promotion.',
      life: 5000,
    });
  }

  protected requestDeleteSelected(): void {
    if (this.selectedPromotions().length === 0) {
      return;
    }
    this.bulkDeleteDialogOpen.set(true);
  }

  protected async confirmDeleteSelected(): Promise<void> {
    const selected = this.selectedPromotions();
    for (const promotion of selected) {
      await this.facade.deletePromotion(promotion.id);
    }

    this.selectedPromotions.set([]);
    this.bulkDeleteDialogOpen.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Promotions deleted',
      detail: `${selected.length} promotion(s) removed.`,
      life: 4000,
    });
  }

  protected deleteDialogMessage(): string {
    const promotion = this.deleteTarget();
    if (!promotion) {
      return '';
    }
    return this.translate.instant('ADMIN.CONFIRM.DELETE_PROMOTION', { name: promotion.name });
  }

  protected bulkDeleteDialogMessage(): string {
    return this.translate.instant('ADMIN.CONFIRM.DELETE_PROMOTIONS', {
      count: this.selectedPromotions().length,
    });
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  protected async publishPromotion(promotion: PromotionListItemDto): Promise<void> {
    const success = await this.facade.publishPromotion(promotion.id);
    this.showActionResult(success, 'Promotion published', 'Publish failed');
  }

  protected async archivePromotion(promotion: PromotionListItemDto): Promise<void> {
    const success = await this.facade.archivePromotion(promotion.id);
    this.showActionResult(success, 'Promotion archived', 'Archive failed');
  }

  protected async archiveSelected(): Promise<void> {
    const archivable = this.selectedPromotions().filter((p) => p.status !== 'Archived');
    if (archivable.length === 0) {
      return;
    }

    for (const promotion of archivable) {
      await this.facade.archivePromotion(promotion.id);
    }

    this.selectedPromotions.set([]);
    this.messageService.add({
      severity: 'success',
      summary: 'Promotions archived',
      detail: `${archivable.length} promotion(s) archived.`,
      life: 4000,
    });
  }

  protected async publishSelected(): Promise<void> {
    const publishable = this.selectedPromotions().filter((p) => p.status !== 'Active');
    if (publishable.length === 0) {
      return;
    }

    for (const promotion of publishable) {
      await this.facade.publishPromotion(promotion.id);
    }

    this.selectedPromotions.set([]);
    this.messageService.add({
      severity: 'success',
      summary: 'Promotions published',
      detail: `${publishable.length} promotion(s) published.`,
      life: 4000,
    });
  }

  private showActionResult(success: boolean, successMsg: string, failMsg: string): void {
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: successMsg,
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: failMsg,
      detail: this.facade.promotionsError() ?? 'Action failed.',
      life: 5000,
    });
  }

  protected promotionActionMenuItems(promotion: PromotionListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    items.push({
      label: t('ADMIN.PROMOTIONS.ACTIONS.VIEW'),
      icon: 'pi pi-eye',
      routerLink: ['/admin/promotions', promotion.id],
    });

    if (this.permissionService.hasPermission(this.permissions.Promotions.Create)) {
      items.push({
        label: t('ADMIN.PROMOTIONS.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        disabled: this.actionLoading(),
        command: () => this.openDuplicateDialog(promotion),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Promotions.Publish)) {
      items.push({
        label: t('ADMIN.PROMOTIONS.ACTIONS.PUBLISH'),
        icon: 'pi pi-send',
        disabled: this.actionLoading() || promotion.status === 'Active',
        command: () => void this.publishPromotion(promotion),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Promotions.Edit)) {
      items.push({
        label: t('ADMIN.PROMOTIONS.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        disabled: this.actionLoading() || promotion.status === 'Archived',
        command: () => void this.archivePromotion(promotion),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Promotions.Delete)) {
      items.push({
        label: t('ADMIN.PROMOTIONS.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDeletePromotion(promotion),
      });
    }

    return items;
  }
}

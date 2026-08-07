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
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { PromotionQuickPreviewDrawerComponent } from '../../components/promotion-quick-preview-drawer/promotion-quick-preview-drawer.component';
import {
  PROMOTION_STATUS_OPTIONS,
  PROMOTION_TYPE_OPTIONS,
  PromotionListItemDto,
} from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';
import {
  discountPreviewText,
  promotionApplicabilityIssues,
  scheduleStatus,
  ScheduleStatus,
  scopeLabelKey,
} from '../../utils/promotion-display.util';

/** Types whose applicability never depends on per-promotion config (no targets/coupon/settings to
 * check) — skipped by `ensureCanApply` to avoid an unnecessary detail fetch. */
const ALWAYS_APPLICABLE_TYPES = new Set(['Automatic', 'FlashSale', 'Membership']);

const SCHEDULE_TONE: Record<ScheduleStatus, AdminStatusTone> = {
  live: 'success',
  scheduled: 'info',
  ended: 'neutral',
  'open-ended': 'neutral',
};

@Component({
  selector: 'app-promotions-list-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    HamboxDatePipe,
    ButtonModule,
    CheckboxModule,
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
    PromotionQuickPreviewDrawerComponent,
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

  protected readonly selectedPromotions = signal<PromotionListItemDto[]>([]);
  protected readonly previewPromotion = signal<PromotionListItemDto | null>(null);

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

  protected scopeOf(promotion: PromotionListItemDto): string {
    return scopeLabelKey(promotion.type);
  }

  protected scheduleOf(promotion: PromotionListItemDto): ScheduleStatus {
    return scheduleStatus(promotion.startDateUtc, promotion.endDateUtc);
  }

  protected scheduleTone(status: ScheduleStatus): AdminStatusTone {
    return SCHEDULE_TONE[status];
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
    return discountPreviewText(item.discountType, item.discountValue);
  }

  protected openPreview(promotion: PromotionListItemDto): void {
    this.previewPromotion.set(promotion);
  }

  protected closePreview(): void {
    this.previewPromotion.set(null);
  }

  protected onPreviewEdit(promotion: PromotionListItemDto): void {
    this.closePreview();
    void this.router.navigate(['/admin/promotions', promotion.id, 'edit']);
  }

  protected onPreviewDuplicate(promotion: PromotionListItemDto): void {
    this.closePreview();
    this.openDuplicateDialog(promotion);
  }

  protected async onPreviewPublish(promotion: PromotionListItemDto): Promise<void> {
    await this.publishPromotion(promotion);
    this.closePreview();
  }

  protected async onPreviewActivate(promotion: PromotionListItemDto): Promise<void> {
    await this.activatePromotion(promotion);
    this.closePreview();
  }

  protected async onPreviewDeactivate(promotion: PromotionListItemDto): Promise<void> {
    await this.deactivatePromotion(promotion);
    this.closePreview();
  }

  protected async onPreviewArchive(promotion: PromotionListItemDto): Promise<void> {
    await this.archivePromotion(promotion);
    this.closePreview();
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

  /** The list only carries `PromotionListItemDto` (no targets/coupons) — fetches the full detail
   * on demand to run the same applicability check the edit/detail pages use, rather than let a
   * promotion that can never apply go live from here. Types with nothing to misconfigure skip the
   * fetch entirely. */
  private async ensureCanApply(
    promotion: PromotionListItemDto,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (ALWAYS_APPLICABLE_TYPES.has(promotion.type)) {
      return { ok: true };
    }

    await this.facade.loadDetail(promotion.id);
    const detail = this.facade.detail();
    if (!detail || detail.id !== promotion.id) {
      return { ok: true };
    }

    const issues = promotionApplicabilityIssues({
      type: detail.type,
      productTargetCount: detail.targets.filter((t) => t.type === 'Product').length,
      categoryTargetCount: detail.targets.filter((t) => t.type === 'Category').length,
      hasCoupon: detail.couponCodes.length > 0,
    });

    if (issues.length === 0) {
      return { ok: true };
    }

    return { ok: false, reason: this.translate.instant(issues[0]) };
  }

  protected async publishPromotion(promotion: PromotionListItemDto): Promise<void> {
    const check = await this.ensureCanApply(promotion);
    if (!check.ok) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('ADMIN.PROMOTIONS.DETAIL.CANNOT_PUBLISH_TITLE'),
        detail: check.reason,
        life: 6000,
      });
      return;
    }

    const success = await this.facade.publishPromotion(promotion.id);
    this.showActionResult(success, 'Promotion published', 'Publish failed');
  }

  protected async activatePromotion(promotion: PromotionListItemDto): Promise<void> {
    const check = await this.ensureCanApply(promotion);
    if (!check.ok) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('ADMIN.PROMOTIONS.DETAIL.CANNOT_ACTIVATE_TITLE'),
        detail: check.reason,
        life: 6000,
      });
      return;
    }

    const success = await this.facade.activatePromotion(promotion.id);
    this.showActionResult(success, 'Promotion activated', 'Activate failed');
  }

  protected async deactivatePromotion(promotion: PromotionListItemDto): Promise<void> {
    const success = await this.facade.deactivatePromotion(promotion.id);
    this.showActionResult(success, 'Promotion paused', 'Pause failed');
  }

  protected async archivePromotion(promotion: PromotionListItemDto): Promise<void> {
    const success = await this.facade.archivePromotion(promotion.id);
    this.showActionResult(success, 'Promotion archived', 'Archive failed');
  }

  protected async archiveSelected(): Promise<void> {
    await this.runBulk(
      this.selectedPromotions().filter((p) => p.status !== 'Archived'),
      (p) => this.facade.archivePromotion(p.id),
      'Promotions archived',
    );
  }

  protected async publishSelected(): Promise<void> {
    const { allowed, blockedCount } = await this.partitionByApplicability(
      this.selectedPromotions().filter((p) => p.status !== 'Active'),
    );
    await this.runBulk(allowed, (p) => this.facade.publishPromotion(p.id), 'Promotions published');
    this.warnIfSkipped(blockedCount);
  }

  protected async activateSelected(): Promise<void> {
    const { allowed, blockedCount } = await this.partitionByApplicability(
      this.selectedPromotions().filter((p) => p.status !== 'Active'),
    );
    await this.runBulk(allowed, (p) => this.facade.activatePromotion(p.id), 'Promotions activated');
    this.warnIfSkipped(blockedCount);
  }

  private async partitionByApplicability(
    candidates: readonly PromotionListItemDto[],
  ): Promise<{ allowed: PromotionListItemDto[]; blockedCount: number }> {
    const allowed: PromotionListItemDto[] = [];
    let blockedCount = 0;

    for (const promotion of candidates) {
      const check = await this.ensureCanApply(promotion);
      if (check.ok) {
        allowed.push(promotion);
      } else {
        blockedCount++;
      }
    }

    return { allowed, blockedCount };
  }

  private warnIfSkipped(blockedCount: number): void {
    if (blockedCount === 0) {
      return;
    }
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.instant('ADMIN.PROMOTIONS.DETAIL.SOME_SKIPPED_TITLE'),
      detail: this.translate.instant('ADMIN.PROMOTIONS.DETAIL.SOME_SKIPPED_DETAIL', {
        count: blockedCount,
      }),
      life: 6000,
    });
  }

  protected async deactivateSelected(): Promise<void> {
    await this.runBulk(
      this.selectedPromotions().filter((p) => p.status === 'Active'),
      (p) => this.facade.deactivatePromotion(p.id),
      'Promotions paused',
    );
  }

  protected async duplicateSelected(): Promise<void> {
    await this.runBulk(
      this.selectedPromotions(),
      (p) => this.facade.duplicatePromotion(p.id).then((id) => id !== null),
      'Promotions duplicated',
    );
  }

  private async runBulk(
    targets: readonly PromotionListItemDto[],
    action: (promotion: PromotionListItemDto) => Promise<boolean>,
    successMessage: string,
  ): Promise<void> {
    if (targets.length === 0) {
      return;
    }

    for (const promotion of targets) {
      await action(promotion);
    }

    this.selectedPromotions.set([]);
    this.messageService.add({
      severity: 'success',
      summary: successMessage,
      detail: `${targets.length} promotion(s) updated.`,
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

  protected exportSelected(): void {
    this.exportPromotions(this.selectedPromotions(), 'selected-promotions');
  }

  protected exportAll(): void {
    this.exportPromotions(this.promotions(), 'promotions');
  }

  private exportPromotions(items: readonly PromotionListItemDto[], filename: string): void {
    if (items.length === 0) {
      return;
    }

    const header = ['Name', 'Type', 'Discount', 'Status', 'Start', 'End', 'Redemptions', 'Coupons', 'Created'];
    const rows = items.map((p) => [
      p.name,
      p.type,
      this.formatDiscount(p),
      p.status,
      p.startDateUtc ?? '',
      p.endDateUtc ?? '',
      String(p.totalRedemptions),
      String(p.couponCount),
      p.createdOnUtc,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

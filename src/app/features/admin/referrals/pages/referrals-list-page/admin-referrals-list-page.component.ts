import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { PaginatorState } from 'primeng/paginator';
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
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { AdminReferralAuditEntryDto, AdminReferralListItemDto, REFERRAL_STATUS_OPTIONS } from '../../models/admin-referral.model';
import { AdminReferralsFacade } from '../../services/admin-referrals.facade';

@Component({
  selector: 'app-admin-referrals-list-page',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    DialogModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    HamboxDatePipe,
    AdminPageHeaderComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    AdminLoadingSkeletonComponent,
  ],
  providers: [AdminReferralsFacade, MessageService],
  templateUrl: './admin-referrals-list-page.component.html',
  styleUrl: './admin-referrals-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReferralsListPageComponent implements OnInit {
  private readonly facade = inject(AdminReferralsFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Referrals' });
  protected readonly statusOptions = [...REFERRAL_STATUS_OPTIONS];

  protected readonly referrals = this.facade.referrals;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;

  protected readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter().length > 0,
  );

  protected readonly tableFirst = computed(() => (this.facade.pageNumber() - 1) * this.facade.pageSize());

  protected reverseTarget: AdminReferralListItemDto | null = null;
  protected reverseDialogOpen = false;

  ngOnInit(): void {
    this.facade.loadReferrals();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusChange(value: string): void {
    this.facade.setStatusFilter(value);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    this.applyPageChange(event.first, event.rows);
  }

  protected onCardsPageChange(event: PaginatorState): void {
    this.applyPageChange(event.first, event.rows);
  }

  private applyPageChange(first: number | null | undefined, rows: number | null | undefined): void {
    const resolvedRows = rows ?? this.facade.pageSize();
    const pageNumber = Math.floor((first ?? 0) / resolvedRows) + 1;
    this.facade.setPage(pageNumber, resolvedRows);
  }

  protected retryLoad(): void {
    void this.facade.reloadReferrals();
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Rewarded':
        return 'success';
      case 'Qualified':
        return 'info';
      case 'Pending':
        return 'warning';
      case 'Expired':
      case 'Reversed':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected canReverse(referral: AdminReferralListItemDto): boolean {
    return referral.status === 'Pending' || referral.status === 'Qualified' || referral.status === 'Rewarded';
  }

  protected openDetail(referral: AdminReferralListItemDto): void {
    void this.facade.loadDetail(referral.id);
  }

  protected closeDetail(): void {
    this.facade.clearDetail();
  }

  protected requestReverse(referral: AdminReferralListItemDto): void {
    this.reverseTarget = referral;
    this.reverseDialogOpen = true;
  }

  protected reverseDialogMessage(): string {
    if (!this.reverseTarget) {
      return '';
    }

    return this.reverseTarget.status === 'Pending'
      ? this.translate.instant('ADMIN.REFERRALS.CONFIRM.VOID_MESSAGE', { code: this.reverseTarget.referralCode })
      : this.translate.instant('ADMIN.REFERRALS.CONFIRM.REVERSE_MESSAGE', { code: this.reverseTarget.referralCode });
  }

  protected onReverseDialogVisibleChange(visible: boolean): void {
    this.reverseDialogOpen = visible;
    if (!visible) {
      this.reverseTarget = null;
    }
  }

  protected async confirmReverse(): Promise<void> {
    const referral = this.reverseTarget;
    if (!referral) {
      return;
    }

    const success = await this.facade.reverseReferral(referral.id);
    this.reverseDialogOpen = false;
    this.reverseTarget = null;

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.REFERRALS.TOAST.REVERSED'),
        life: 4000,
      });
      void this.facade.reloadReferrals();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.REFERRALS.TOAST.REVERSE_FAILED'),
      detail: this.facade.error() ?? undefined,
      life: 5000,
    });
  }

  protected actionMenuItems(referral: AdminReferralListItemDto): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: this.translate.instant('ADMIN.REFERRALS.ACTIONS.VIEW'),
        icon: 'pi pi-eye',
        command: () => this.openDetail(referral),
      },
    ];

    if (this.canReverse(referral) && this.permissionService.hasPermission(this.permissions.Referral.Manage)) {
      items.push({
        label:
          referral.status === 'Pending'
            ? this.translate.instant('ADMIN.REFERRALS.ACTIONS.VOID')
            : this.translate.instant('ADMIN.REFERRALS.ACTIONS.REVERSE'),
        icon: 'pi pi-undo',
        command: () => this.requestReverse(referral),
      });
    }

    return items;
  }

  protected auditActionLabel(entry: AdminReferralAuditEntryDto): string {
    return this.translate.instant(`ADMIN.REFERRALS.AUDIT_ACTION.${entry.action.toUpperCase()}`);
  }
}

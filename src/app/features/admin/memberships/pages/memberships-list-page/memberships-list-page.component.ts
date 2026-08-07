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
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
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
  AdminLoadingSkeletonComponent,
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
import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';
import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { MembershipPlanCardComponent } from '../../components/membership-plan-card/membership-plan-card.component';
import {
  MEMBERSHIP_STATUS_OPTIONS,
  MembershipPlanListItemDto,
} from '../../models/membership-api.model';
import { MembershipManagementFacade } from '../../services/membership-management.facade';

@Component({
  selector: 'app-memberships-list-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    TableModule,
    ToastModule,
    HasPermissionDirective,
    HamboxCurrencyPipe,
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
    AdminLoadingSkeletonComponent,
    MembershipPlanCardComponent,
  ],
  providers: [MembershipManagementFacade, MessageService],
  templateUrl: './memberships-list-page.component.html',
  styleUrl: './memberships-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipsListPageComponent implements OnInit {
  private readonly facade = inject(MembershipManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  protected readonly mobileViewport = inject(MobileViewportService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Memberships' });
  protected readonly statusOptions = [...MEMBERSHIP_STATUS_OPTIONS];

  protected readonly plans = this.facade.plans;
  protected readonly loading = this.facade.plansLoading;
  protected readonly error = this.facade.plansError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly listStats = this.facade.listStats;
  protected readonly statistics = this.facade.statistics;

  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateTarget = signal<MembershipPlanListItemDto | null>(null);
  protected readonly duplicateName = signal('');
  protected readonly duplicateSlug = signal('');

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<MembershipPlanListItemDto | null>(null);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  ngOnInit(): void {
    this.facade.loadPlans();
    void this.facade.loadStatistics();
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
    void this.facade.reloadPlans();
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected navigateToNew(): void {
    void this.router.navigate(['/admin/memberships/new']);
  }

  protected canEditPlans(): boolean {
    return this.permissionService.hasPermission(this.permissions.Memberships.Edit);
  }

  protected openDuplicateDialog(plan: MembershipPlanListItemDto): void {
    this.duplicateTarget.set(plan);
    this.duplicateName.set(`${plan.name} Copy`);
    this.duplicateSlug.set(`${plan.slug}-copy`);
    this.duplicateDialogOpen.set(true);
  }

  protected closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
    this.duplicateTarget.set(null);
    this.duplicateName.set('');
    this.duplicateSlug.set('');
  }

  protected async confirmDuplicate(): Promise<void> {
    const plan = this.duplicateTarget();
    if (!plan) {
      return;
    }

    const createdId = await this.facade.duplicatePlan(
      plan.id,
      this.duplicateName().trim(),
      this.duplicateSlug().trim(),
    );
    if (createdId) {
      this.messageService.add({
        severity: 'success',
        summary: 'Plan duplicated',
        detail: 'A copy of the membership plan was created.',
        life: 4000,
      });
      this.closeDuplicateDialog();
      void this.router.navigate(['/admin/memberships', createdId, 'edit']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Duplicate failed',
      detail: this.facade.plansError() ?? 'Unable to duplicate plan.',
      life: 5000,
    });
  }

  protected requestDeletePlan(plan: MembershipPlanListItemDto): void {
    this.deleteTarget.set(plan);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDeletePlan(): Promise<void> {
    const plan = this.deleteTarget();
    if (!plan) {
      return;
    }

    const success = await this.facade.deletePlan(plan.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Plan deleted',
        detail: `"${plan.name}" was removed.`,
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Delete failed',
      detail: this.facade.plansError() ?? 'Unable to delete plan.',
      life: 5000,
    });
  }

  protected deleteDialogMessage(): string {
    const plan = this.deleteTarget();
    if (!plan) {
      return '';
    }
    return this.translate.instant('ADMIN.CONFIRM.DELETE_PLAN', { name: plan.name });
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  protected async archivePlan(plan: MembershipPlanListItemDto): Promise<void> {
    const success = await this.facade.archivePlan(plan.id);
    this.showActionResult(success, 'Plan archived', 'Archive failed');
  }

  protected async activatePlan(plan: MembershipPlanListItemDto): Promise<void> {
    const success = await this.facade.activatePlan(plan.id);
    this.showActionResult(success, 'Plan activated', 'Activate failed');
  }

  private showActionResult(success: boolean, successMsg: string, failMsg: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: successMsg, life: 4000 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: failMsg,
      detail: this.facade.plansError() ?? 'Action failed.',
      life: 5000,
    });
  }

  protected planActionMenuItems(plan: MembershipPlanListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    items.push({
      label: t('ADMIN.MEMBERSHIPS.ACTIONS.VIEW'),
      icon: 'pi pi-eye',
      routerLink: ['/admin/memberships', plan.id],
    });

    if (this.permissionService.hasPermission(this.permissions.Memberships.Create)) {
      items.push({
        label: t('ADMIN.MEMBERSHIPS.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        disabled: this.actionLoading(),
        command: () => this.openDuplicateDialog(plan),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Memberships.Edit)) {
      items.push({
        label: t('ADMIN.MEMBERSHIPS.ACTIONS.ACTIVATE'),
        icon: 'pi pi-check',
        disabled: this.actionLoading() || plan.status === 'Active',
        command: () => void this.activatePlan(plan),
      });

      items.push({
        label: t('ADMIN.MEMBERSHIPS.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        disabled: this.actionLoading() || plan.status === 'Archived',
        command: () => void this.archivePlan(plan),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Memberships.Delete)) {
      items.push({
        label: t('ADMIN.MEMBERSHIPS.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDeletePlan(plan),
      });
    }

    return items;
  }
}

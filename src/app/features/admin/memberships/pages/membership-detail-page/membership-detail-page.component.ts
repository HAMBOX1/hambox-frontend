import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSearchBarComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
  AdminToolbarComponent,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxCurrencyPipe } from '../../../../../shared/pipes/hambox-currency.pipe';
import { MemberListItemDto } from '../../models/membership-api.model';
import { MembershipManagementFacade } from '../../services/membership-management.facade';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';

@Component({
  selector: 'app-membership-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    TableModule,
    TabsModule,
    ToastModule,
    HasPermissionDirective,
    HamboxCurrencyPipe,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminLoadingSkeletonComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminIconButtonComponent,
    AdminStatusBadgeComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [MembershipManagementFacade, MessageService],
  templateUrl: './membership-detail-page.component.html',
  styleUrl: './membership-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  protected readonly facade = inject(MembershipManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly planId = signal<string | null>(null);
  protected readonly activeTab = signal('0');

  protected readonly assignDialogOpen = signal(false);
  protected readonly assignUserId = signal('');
  protected readonly assignAutoRenew = signal(true);

  protected readonly cancelDialogOpen = signal(false);
  protected readonly cancelTarget = signal<MemberListItemDto | null>(null);

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly statistics = this.facade.statistics;
  protected readonly statisticsLoading = this.facade.statisticsLoading;
  protected readonly comparison = this.facade.comparison;
  protected readonly comparisonLoading = this.facade.comparisonLoading;
  protected readonly members = this.facade.members;
  protected readonly membersLoading = this.facade.membersLoading;
  protected readonly membersError = this.facade.membersError;
  protected readonly membersSearch = this.facade.membersSearch;
  protected readonly membersTotal = this.facade.membersTotal;
  protected readonly membersPageSize = this.facade.membersPageSize;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly planMembers = computed(() => {
    const planId = this.planId();
    if (!planId) {
      return [];
    }

    return this.members().filter((member) => member.planId === planId);
  });

  protected readonly membersTableFirst = computed(
    () => (this.facade.membersPage() - 1) * this.facade.membersPageSize(),
  );

  protected readonly breadcrumbs = computed(() => {
    const plan = this.detail();
    return adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.MEMBERSHIPS.LIST.TITLE'),
        route: '/admin/memberships',
      },
      { label: plan?.name ?? this.translate.instant('ADMIN.MEMBERSHIPS.DETAIL.TAB_OVERVIEW') },
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.planId.set(id);
    void this.facade.loadDetail(id);
    void this.facade.loadStatistics();
    void this.facade.loadComparison();
    this.facade.loadMembers();
  }

  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(String(value ?? '0'));
  }

  protected onMembersSearchChange(term: string): void {
    this.facade.setMembersSearch(term);
  }

  protected onMembersPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.membersPageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;
    this.facade.setMembersPage(pageNumber, rows);
  }

  protected memberStatusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Expired':
        return 'warning';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected openAssignDialog(): void {
    this.assignUserId.set('');
    this.assignAutoRenew.set(true);
    this.assignDialogOpen.set(true);
  }

  protected closeAssignDialog(): void {
    this.assignDialogOpen.set(false);
  }

  protected async confirmAssign(): Promise<void> {
    const planId = this.planId();
    const userId = this.assignUserId().trim();
    if (!planId || !userId) {
      return;
    }

    const success = await this.facade.assignMembership({
      userId,
      planId,
      autoRenew: this.assignAutoRenew(),
    });

    if (success) {
      this.messageService.add({ severity: 'success', summary: 'Membership assigned', life: 4000 });
      this.closeAssignDialog();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Assign failed',
      detail: this.facade.membersError() ?? 'Unable to assign membership.',
      life: 5000,
    });
  }

  protected async renewMember(member: MemberListItemDto): Promise<void> {
    const success = await this.facade.renewSubscription(member.subscriptionId);
    this.showMemberActionResult(success, 'Subscription renewed', 'Renew failed');
  }

  protected requestCancelMember(member: MemberListItemDto): void {
    this.cancelTarget.set(member);
    this.cancelDialogOpen.set(true);
  }

  protected async confirmCancelMember(): Promise<void> {
    const member = this.cancelTarget();
    if (!member) {
      return;
    }

    const success = await this.facade.cancelSubscription(member.subscriptionId);
    if (success) {
      this.cancelDialogOpen.set(false);
      this.cancelTarget.set(null);
    }
    this.showMemberActionResult(success, 'Subscription cancelled', 'Cancel failed');
  }

  protected onCancelDialogVisibleChange(visible: boolean): void {
    this.cancelDialogOpen.set(visible);
    if (!visible) {
      this.cancelTarget.set(null);
    }
  }

  private showMemberActionResult(success: boolean, successMsg: string, failMsg: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: successMsg, life: 4000 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: failMsg,
      detail: this.facade.membersError() ?? 'Action failed.',
      life: 5000,
    });
  }
}

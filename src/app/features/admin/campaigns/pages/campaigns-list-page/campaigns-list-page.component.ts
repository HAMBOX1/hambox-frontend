import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

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
import {
  CAMPAIGN_PHASE_TONE,
  CAMPAIGN_STATUS_OPTIONS,
  CampaignListItemDto,
  CampaignPhase,
} from '../../models/campaign-api.model';
import { CampaignManagementFacade } from '../../services/campaign-management.facade';

@Component({
  selector: 'app-campaigns-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    ToastModule,
    TooltipModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminToolbarComponent,
    AdminSearchBarComponent,
    AdminErrorAlertComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    AdminIconButtonComponent,
  ],
  providers: [CampaignManagementFacade, MessageService],
  templateUrl: './campaigns-list-page.component.html',
  styleUrl: './campaigns-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignsListPageComponent implements OnInit {
  private readonly facade = inject(CampaignManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Campaigns' });
  protected readonly statusOptions = [...CAMPAIGN_STATUS_OPTIONS];

  protected readonly campaigns = this.facade.campaigns;
  protected readonly loading = this.facade.campaignsLoading;
  protected readonly error = this.facade.campaignsError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly actionLoading = this.facade.actionLoading;

  /** The row currently driving the live storefront theme, if any — at most one, since only one
   *  campaign can resolve at a time. Uses the backend's authoritative isResolvedWinner flag
   *  (computed via the same tiebreak ThemeEngine uses), not phase or array order — two
   *  overlapping campaigns can both report phase 'Active', and relying on list order to pick
   *  between them is exactly the class of bug a missing final tiebreak caused before. */
  protected readonly liveCampaign = computed(() => this.campaigns().find((c) => c.isResolvedWinner) ?? null);
  protected readonly nextCampaign = computed(() => {
    const scheduled = this.campaigns()
      .filter((c) => c.phase === 'Scheduled')
      .sort((a, b) => new Date(a.startsAtUtc).getTime() - new Date(b.startsAtUtc).getTime());
    return scheduled[0] ?? null;
  });

  protected readonly hasOverlaps = computed(() => this.campaigns().some((c) => c.hasOverlap));

  protected readonly tableFirst = computed(() => (this.facade.pageNumber() - 1) * this.facade.pageSize());

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<CampaignListItemDto | null>(null);

  ngOnInit(): void {
    this.facade.loadCampaigns();
  }

  protected onSearchChange(term: string): void {
    this.facade.setSearchTerm(term);
  }

  protected onStatusChange(value: string): void {
    this.facade.setStatusFilter(value);
  }

  protected onPageChange(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.facade.pageSize();
    const first = event.first ?? 0;
    const pageNumber = Math.floor(first / rows) + 1;
    this.facade.setPage(pageNumber, rows);
  }

  protected retryLoad(): void {
    void this.facade.reloadCampaigns();
  }

  protected phaseTone(phase: CampaignPhase): AdminStatusTone {
    return CAMPAIGN_PHASE_TONE[phase];
  }

  /** CampaignPhase itself is unchanged (still just 'Active') — this only decides how an Active
   *  row is *labeled*, distinguishing the actual resolver winner ("Live now") from an Active
   *  campaign that's overlapped and overridden by a higher-priority one. */
  protected statusLabelKey(campaign: CampaignListItemDto): string {
    if (campaign.phase === 'Active') {
      return campaign.isResolvedWinner ? 'ADMIN.CAMPAIGNS.PHASE.LIVE_NOW' : 'ADMIN.CAMPAIGNS.PHASE.ACTIVE_OVERRIDDEN';
    }
    return 'ADMIN.CAMPAIGNS.PHASE.' + campaign.phase.toUpperCase();
  }

  protected statusTone(campaign: CampaignListItemDto): AdminStatusTone {
    if (campaign.phase === 'Active' && !campaign.isResolvedWinner) {
      return 'warning';
    }
    return CAMPAIGN_PHASE_TONE[campaign.phase];
  }

  protected navigateToNew(): void {
    void this.router.navigate(['/admin/campaigns/new']);
  }

  protected async enableCampaign(campaign: CampaignListItemDto): Promise<void> {
    const success = await this.facade.enableCampaign(campaign.id);
    this.showActionResult(success, 'ADMIN.CAMPAIGNS.MESSAGES.ENABLED', 'ADMIN.CAMPAIGNS.MESSAGES.ACTION_FAILED');
  }

  protected async disableCampaign(campaign: CampaignListItemDto): Promise<void> {
    const success = await this.facade.disableCampaign(campaign.id);
    this.showActionResult(success, 'ADMIN.CAMPAIGNS.MESSAGES.DISABLED', 'ADMIN.CAMPAIGNS.MESSAGES.ACTION_FAILED');
  }

  protected async archiveCampaign(campaign: CampaignListItemDto): Promise<void> {
    const success = await this.facade.archiveCampaign(campaign.id);
    this.showActionResult(success, 'ADMIN.CAMPAIGNS.MESSAGES.ARCHIVED', 'ADMIN.CAMPAIGNS.MESSAGES.ACTION_FAILED');
  }

  protected requestDeleteCampaign(campaign: CampaignListItemDto): void {
    this.deleteTarget.set(campaign);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDeleteCampaign(): Promise<void> {
    const campaign = this.deleteTarget();
    if (!campaign) {
      return;
    }

    const success = await this.facade.deleteCampaign(campaign.id);
    this.deleteDialogOpen.set(false);
    this.deleteTarget.set(null);
    this.showActionResult(success, 'ADMIN.CAMPAIGNS.MESSAGES.DELETED', 'ADMIN.CAMPAIGNS.MESSAGES.DELETE_FAILED');
  }

  protected deleteDialogMessage(): string {
    const campaign = this.deleteTarget();
    return campaign ? this.translate.instant('ADMIN.CAMPAIGNS.CONFIRM.DELETE', { name: campaign.name }) : '';
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  private showActionResult(success: boolean, successKey: string, failKey: string): void {
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant(successKey), life: 4000 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(failKey),
      detail: this.facade.campaignsError() ?? '',
      life: 5000,
    });
  }

  protected campaignActionMenuItems(campaign: CampaignListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);
    const canEdit = this.permissionService.hasPermission(this.permissions.Campaigns.Edit);

    if (canEdit && campaign.status !== 'Archived') {
      if (campaign.isEnabled) {
        items.push({
          label: t('ADMIN.CAMPAIGNS.ACTIONS.DISABLE'),
          icon: 'pi pi-pause',
          disabled: this.actionLoading(),
          command: () => void this.disableCampaign(campaign),
        });
      } else {
        items.push({
          label: t('ADMIN.CAMPAIGNS.ACTIONS.ENABLE'),
          icon: 'pi pi-play',
          disabled: this.actionLoading(),
          command: () => void this.enableCampaign(campaign),
        });
      }
    }

    if (canEdit && campaign.status !== 'Archived') {
      items.push({
        label: t('ADMIN.CAMPAIGNS.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        disabled: this.actionLoading(),
        command: () => void this.archiveCampaign(campaign),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Campaigns.Delete)) {
      items.push({
        label: t('ADMIN.CAMPAIGNS.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading() || (campaign.status === 'Published' && campaign.isEnabled),
        command: () => this.requestDeleteCampaign(campaign),
      });
    }

    return items;
  }
}

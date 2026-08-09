import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ThemeEngineService } from '../../../../../core/theme/theme-engine.service';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatCardComponent,
  AdminStatGridComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { ThemeAssignmentsPanelComponent } from '../../components/theme-assignments-panel/theme-assignments-panel.component';
import { ThemeComparePanelComponent } from '../../components/theme-compare-panel/theme-compare-panel.component';
import { ThemeHistoryPanelComponent } from '../../components/theme-history-panel/theme-history-panel.component';
import { ThemeSchedulerPanelComponent } from '../../components/theme-scheduler-panel/theme-scheduler-panel.component';
import { latestThemeVersion } from '../../models/theme-api.model';
import { ThemeManagementFacade } from '../../services/theme-management.facade';

@Component({
  selector: 'app-theme-detail-page',
  standalone: true,
  imports: [
    TranslatePipe,
    ButtonModule,
    TabsModule,
    ToastModule,
    TooltipModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
    AdminActionMenuComponent,
    AdminStatGridComponent,
    AdminStatCardComponent,
    AdminSectionCardComponent,
    ThemeSchedulerPanelComponent,
    ThemeAssignmentsPanelComponent,
    ThemeHistoryPanelComponent,
    ThemeComparePanelComponent,
    HasPermissionDirective,
  ],
  providers: [ThemeManagementFacade, MessageService],
  templateUrl: './theme-detail-page.component.html',
  styleUrl: './theme-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  private readonly themeEngine = inject(ThemeEngineService);
  protected readonly facade = inject(ThemeManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly permissionServicePublic = this.permissionService;
  protected readonly themeId = signal<string | null>(null);
  protected readonly activeTab = signal('0');

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly history = this.facade.history;
  protected readonly historyLoading = this.facade.historyLoading;
  protected readonly historyError = this.facade.historyError;
  protected readonly themes = this.facade.themes;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly breadcrumbs = computed(() => {
    const theme = this.detail();
    return adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.THEMES.LIST.TITLE'),
        route: '/admin/themes',
      },
      { label: theme?.name ?? this.translate.instant('ADMIN.THEMES.DETAIL.TAB_OVERVIEW') },
    );
  });

  protected readonly latestVersion = computed(() => latestThemeVersion(this.detail()));

  protected readonly previewMode = this.themeEngine.previewMode;
  protected readonly activeResolution = this.facade.activeResolution;

  /** Human label for the storefront's real resolution source — never recomputed here, just
   *  translated from the same `resolutionSource` value the backend resolver already returns. */
  protected readonly activeResolutionLabel = computed(() => {
    const resolution = this.activeResolution();
    const theme = this.detail();
    if (!resolution || !theme || resolution.themeId !== theme.id) {
      return null;
    }

    const labels: Record<string, string> = {
      campaign: this.translate.instant('ADMIN.THEMES.DETAIL.RESOLUTION.CAMPAIGN'),
      schedule: this.translate.instant('ADMIN.THEMES.DETAIL.RESOLUTION.SCHEDULE'),
      membership: this.translate.instant('ADMIN.THEMES.DETAIL.RESOLUTION.MEMBERSHIP'),
      store: this.translate.instant('ADMIN.THEMES.DETAIL.RESOLUTION.STORE'),
      default: this.translate.instant('ADMIN.THEMES.DETAIL.RESOLUTION.DEFAULT'),
      preview: this.translate.instant('ADMIN.THEMES.DETAIL.RESOLUTION.PREVIEW'),
    };

    return labels[resolution.resolutionSource] ?? resolution.resolutionSource;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.themeId.set(id);
    this.facade.loadThemes();
    void this.facade.loadDetail(id);
    void this.facade.loadHistory(id);
    void this.facade.loadActiveResolution();
  }

  ngOnDestroy(): void {
    if (this.themeEngine.previewMode()) {
      this.themeEngine.deactivatePreview();
    }
  }

  protected exitPreview(): void {
    this.themeEngine.deactivatePreview();
  }

  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(String(value ?? '0'));
  }

  protected retryDetail(): void {
    const id = this.themeId();
    if (id) {
      void this.facade.loadDetail(id);
    }
  }

  protected retryHistory(): void {
    const id = this.themeId();
    if (id) {
      void this.facade.loadHistory(id);
    }
  }

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Published':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected async publish(): Promise<void> {
    const id = this.themeId();
    if (!id) {
      return;
    }

    const success = await this.facade.publishTheme(id);
    if (success) {
      await this.facade.loadDetail(id);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.PUBLISHED'),
        life: 4000,
      });
      return;
    }

    // Reload so a concurrency conflict (someone else published in the meantime) shows the
    // now-current server state instead of the stale one this admin was looking at.
    await this.facade.loadDetail(id);
    this.messageService.add({
      severity: 'error',
      summary: this.facade.themesError() ?? this.translate.instant('ADMIN.THEMES.MESSAGES.PUBLISH_FAILED'),
      life: 6000,
    });
  }

  protected async archive(): Promise<void> {
    const id = this.themeId();
    if (!id) {
      return;
    }

    const success = await this.facade.archiveTheme(id);
    if (success) {
      await this.facade.loadDetail(id);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.ARCHIVED'),
        life: 4000,
      });
    }
  }

  protected async rollback(versionId: string): Promise<void> {
    const id = this.themeId();
    if (!id) {
      return;
    }

    const success = await this.facade.rollbackTheme(id, versionId);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.ROLLED_BACK'),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.facade.themesError() ?? this.translate.instant('ADMIN.THEMES.MESSAGES.ROLLBACK_FAILED'),
      life: 6000,
    });
  }

  protected async scheduleTheme(request: {
    startsAtUtc: string;
    endsAtUtc?: string | null;
    recurrenceRule?: string | null;
  }): Promise<void> {
    const id = this.themeId();
    if (!id) {
      return;
    }

    const success = await this.facade.scheduleTheme(id, request);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.SCHEDULED'),
        life: 4000,
      });
    }
  }

  protected async assignTheme(request: {
    assignmentType: string;
    targetKey: string;
    priority?: number;
  }): Promise<void> {
    const id = this.themeId();
    if (!id) {
      return;
    }

    const success = await this.facade.assignTheme(id, request);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.ASSIGNED'),
        life: 4000,
      });
    }
  }

  protected async previewTheme(): Promise<void> {
    const id = this.themeId();
    if (!id) {
      return;
    }

    const session = await this.facade.createPreviewSession(id, this.latestVersion()?.id);
    if (session) {
      await this.themeEngine.activatePreview(session.token);
      window.open(`/?themePreview=${session.token}`, '_blank', 'noopener');
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.PREVIEW_STARTED'),
        life: 4000,
      });
    }
  }

  protected overflowMenuItems(theme: { id: string; status: string }): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    if (this.permissionService.hasPermission(this.permissions.Themes.Edit)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.EDIT'),
        icon: 'pi pi-pencil',
        routerLink: ['/admin/themes', theme.id, 'edit'],
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.View)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.PREVIEW'),
        icon: 'pi pi-eye',
        disabled: this.actionLoading(),
        command: () => void this.previewTheme(),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Publish)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.PUBLISH'),
        icon: 'pi pi-send',
        disabled: this.actionLoading() || this.latestVersion()?.isPublished !== false,
        command: () => void this.publish(),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Edit)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        disabled: this.actionLoading() || theme.status === 'Archived',
        command: () => void this.archive(),
      });
    }

    return items;
  }
}

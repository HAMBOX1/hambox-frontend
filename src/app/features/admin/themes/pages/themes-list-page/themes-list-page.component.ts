import { DatePipe } from '@angular/common';
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
import { THEME_STATUS_OPTIONS, ThemeListItemDto } from '../../models/theme-api.model';
import { ThemeManagementFacade } from '../../services/theme-management.facade';

@Component({
  selector: 'app-themes-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
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
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStatusBadgeComponent,
    AdminIconButtonComponent,
    AdminLoadingSkeletonComponent,
  ],
  providers: [ThemeManagementFacade, MessageService],
  templateUrl: './themes-list-page.component.html',
  styleUrl: './themes-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemesListPageComponent implements OnInit {
  private readonly facade = inject(ThemeManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Themes' });
  protected readonly statusOptions = [...THEME_STATUS_OPTIONS];

  protected readonly themes = this.facade.themes;
  protected readonly loading = this.facade.themesLoading;
  protected readonly error = this.facade.themesError;
  protected readonly searchTerm = this.facade.searchTerm;
  protected readonly statusFilter = this.facade.statusFilter;
  protected readonly totalCount = this.facade.totalCount;
  protected readonly pageSize = this.facade.pageSize;
  protected readonly hasActiveFilters = this.facade.hasActiveFilters;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly listStats = this.facade.listStats;

  protected readonly viewMode = signal<'grid' | 'list'>('grid');

  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateTarget = signal<ThemeListItemDto | null>(null);
  protected readonly duplicateName = signal('');
  protected readonly duplicateSlug = signal('');

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<ThemeListItemDto | null>(null);

  protected readonly tableFirst = computed(
    () => (this.facade.pageNumber() - 1) * this.facade.pageSize(),
  );

  ngOnInit(): void {
    this.facade.loadThemes();
  }

  protected setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
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
    void this.facade.reloadThemes();
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

  protected openDuplicateDialog(theme: ThemeListItemDto): void {
    this.duplicateTarget.set(theme);
    this.duplicateName.set(`${theme.name} Copy`);
    this.duplicateSlug.set(`${theme.slug}-copy`);
    this.duplicateDialogOpen.set(true);
  }

  protected closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
    this.duplicateTarget.set(null);
    this.duplicateName.set('');
    this.duplicateSlug.set('');
  }

  protected async confirmDuplicate(): Promise<void> {
    const theme = this.duplicateTarget();
    if (!theme) {
      return;
    }

    const createdId = await this.facade.duplicateTheme(theme.id, {
      newName: this.duplicateName().trim(),
      newSlug: this.duplicateSlug().trim(),
    });

    if (createdId) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.DUPLICATED'),
        life: 4000,
      });
      this.closeDuplicateDialog();
      void this.router.navigate(['/admin/themes', createdId, 'edit']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.THEMES.MESSAGES.DUPLICATE_FAILED'),
      detail: this.facade.themesError() ?? '',
      life: 5000,
    });
  }

  protected requestDeleteTheme(theme: ThemeListItemDto): void {
    this.deleteTarget.set(theme);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmDeleteTheme(): Promise<void> {
    const theme = this.deleteTarget();
    if (!theme) {
      return;
    }

    const success = await this.facade.deleteTheme(theme.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.DELETED'),
        life: 4000,
      });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.THEMES.MESSAGES.DELETE_FAILED'),
      detail: this.facade.themesError() ?? '',
      life: 5000,
    });
  }

  protected deleteDialogMessage(): string {
    const theme = this.deleteTarget();
    if (!theme) {
      return '';
    }
    return this.translate.instant('ADMIN.THEMES.CONFIRM.DELETE', { name: theme.name });
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  protected async publishTheme(theme: ThemeListItemDto): Promise<void> {
    const success = await this.facade.publishTheme(theme.id);
    this.showActionResult(success, 'ADMIN.THEMES.MESSAGES.PUBLISHED', 'ADMIN.THEMES.MESSAGES.PUBLISH_FAILED');
  }

  protected async archiveTheme(theme: ThemeListItemDto): Promise<void> {
    const success = await this.facade.archiveTheme(theme.id);
    this.showActionResult(success, 'ADMIN.THEMES.MESSAGES.ARCHIVED', 'ADMIN.THEMES.MESSAGES.ARCHIVE_FAILED');
  }

  protected async exportTheme(theme: ThemeListItemDto): Promise<void> {
    const payload = await this.facade.exportTheme(theme.id);
    if (!payload) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.THEMES.MESSAGES.EXPORT_FAILED'),
        life: 5000,
      });
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${payload.slug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private showActionResult(success: boolean, successKey: string, failKey: string): void {
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant(successKey),
        life: 4000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(failKey),
      detail: this.facade.themesError() ?? '',
      life: 5000,
    });
  }

  protected themeActionMenuItems(theme: ThemeListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    items.push({
      label: t('ADMIN.THEMES.ACTIONS.VIEW'),
      icon: 'pi pi-eye',
      routerLink: ['/admin/themes', theme.id],
    });

    if (this.permissionService.hasPermission(this.permissions.Themes.Edit)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.EDIT'),
        icon: 'pi pi-pencil',
        routerLink: ['/admin/themes', theme.id, 'edit'],
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Create)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        disabled: this.actionLoading(),
        command: () => this.openDuplicateDialog(theme),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Publish)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.PUBLISH'),
        icon: 'pi pi-send',
        disabled: this.actionLoading() || theme.status === 'Published',
        command: () => void this.publishTheme(theme),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Edit)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        disabled: this.actionLoading() || theme.status === 'Archived',
        command: () => void this.archiveTheme(theme),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Export)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.EXPORT'),
        icon: 'pi pi-download',
        disabled: this.actionLoading(),
        command: () => void this.exportTheme(theme),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Themes.Delete)) {
      items.push({
        label: t('ADMIN.THEMES.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDeleteTheme(theme),
      });
    }

    return items;
  }
}

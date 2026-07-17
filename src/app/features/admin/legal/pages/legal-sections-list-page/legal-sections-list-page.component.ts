import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
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
import {
  LEGAL_SECTION_CATEGORY_SUGGESTIONS,
  LegalSectionListItemDto,
  LegalSectionQueryFilter,
  LegalSectionStatusFilter,
} from '../../models/legal-section.model';
import { LegalManagementFacade } from '../../services/legal-management.facade';

const TRI_STATE_OPTIONS: { label: string; value: boolean | null }[] = [
  { label: 'All', value: null },
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

@Component({
  selector: 'app-legal-sections-list-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    FormsModule,
    TranslatePipe,
    ButtonModule,
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
  ],
  providers: [LegalManagementFacade, MessageService],
  templateUrl: './legal-sections-list-page.component.html',
  styleUrl: './legal-sections-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalSectionsListPageComponent implements OnInit {
  protected readonly facade = inject(LegalManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Legal Center' });
  protected readonly triStateOptions = TRI_STATE_OPTIONS;
  protected readonly categoryOptions = [
    { label: 'All', value: null },
    ...LEGAL_SECTION_CATEGORY_SUGGESTIONS.map((c) => ({ label: c, value: c })),
  ];
  protected readonly statusOptions: { label: string; value: LegalSectionStatusFilter | null }[] = [
    { label: 'All', value: null },
    { label: 'Published', value: 'Published' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Archived', value: 'Archived' },
  ];

  protected readonly sections = this.facade.documents;
  protected readonly loading = this.facade.documentsLoading;
  protected readonly error = this.facade.documentsError;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly search = signal('');
  protected readonly categoryFilter = signal<string | null>(null);
  protected readonly statusFilter = signal<LegalSectionStatusFilter | null>(null);
  protected readonly footerFilter = signal<boolean | null>(null);
  protected readonly navFilter = signal<boolean | null>(null);
  protected readonly acceptanceFilter = signal<boolean | null>(null);
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.search() ||
      this.categoryFilter() !== null ||
      this.statusFilter() !== null ||
      this.footerFilter() !== null ||
      this.navFilter() !== null ||
      this.acceptanceFilter() !== null,
  );

  protected readonly createDialogOpen = signal(false);
  protected readonly createSlug = signal('');
  protected readonly createTitle = signal('');

  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateTarget = signal<LegalSectionListItemDto | null>(null);
  protected readonly duplicateSlug = signal('');
  protected readonly duplicateTitle = signal('');

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTarget = signal<LegalSectionListItemDto | null>(null);

  ngOnInit(): void {
    void this.reload();
  }

  protected onSearchChange(term: string): void {
    this.search.set(term);
    void this.reload();
  }

  protected onFilterChange(): void {
    void this.reload();
  }

  private reload(): Promise<void> {
    const filter: LegalSectionQueryFilter = {
      search: this.search() || undefined,
      category: this.categoryFilter() ?? undefined,
      status: this.statusFilter() ?? undefined,
      showInFooter: this.footerFilter() ?? undefined,
      showInNavigation: this.navFilter() ?? undefined,
      requireAcceptance: this.acceptanceFilter() ?? undefined,
    };
    return this.facade.loadDocuments(filter);
  }

  protected retryLoad(): void {
    void this.reload();
  }

  protected statusTone(section: LegalSectionListItemDto): AdminStatusTone {
    if (section.isArchived) {
      return 'neutral';
    }
    return section.hasPublishedVersion ? 'success' : 'info';
  }

  protected statusLabel(section: LegalSectionListItemDto): string {
    if (section.isArchived) {
      return this.translate.instant('ADMIN.LEGAL.LIST.STATUS_ARCHIVED');
    }
    return section.hasPublishedVersion
      ? this.translate.instant('ADMIN.LEGAL.LIST.STATUS_PUBLISHED')
      : this.translate.instant('ADMIN.LEGAL.LIST.STATUS_DRAFT');
  }

  protected openCreateDialog(): void {
    this.createSlug.set('');
    this.createTitle.set('');
    this.createDialogOpen.set(true);
  }

  protected closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  protected async confirmCreate(): Promise<void> {
    const slug = this.createSlug().trim().toLowerCase();
    const titleEn = this.createTitle().trim();
    if (!slug || !titleEn) {
      return;
    }

    const success = await this.facade.createSection({
      slug,
      titleEn,
      titleAr: null,
      category: null,
      icon: null,
      showInFooter: true,
      showInNavigation: true,
      requireAcceptance: false,
    });

    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.CREATED'), life: 4000 });
      this.closeCreateDialog();
      void this.router.navigate(['/admin/legal', slug]);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.CREATE_FAILED'),
      detail: this.facade.documentsError() ?? '',
      life: 5000,
    });
  }

  protected openDuplicateDialog(section: LegalSectionListItemDto): void {
    this.duplicateTarget.set(section);
    this.duplicateSlug.set(`${section.slug}-copy`);
    this.duplicateTitle.set(`${section.titleEn} Copy`);
    this.duplicateDialogOpen.set(true);
  }

  protected closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
    this.duplicateTarget.set(null);
  }

  protected async confirmDuplicate(): Promise<void> {
    const source = this.duplicateTarget();
    const newSlug = this.duplicateSlug().trim().toLowerCase();
    if (!source || !newSlug) {
      return;
    }

    const createdSlug = await this.facade.duplicateSection(source.slug, {
      newSlug,
      newTitleEn: this.duplicateTitle().trim() || null,
    });

    if (createdSlug) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DUPLICATED'), life: 4000 });
      this.closeDuplicateDialog();
      void this.reload();
      void this.router.navigate(['/admin/legal', createdSlug]);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DUPLICATE_FAILED'),
      detail: this.facade.documentsError() ?? '',
      life: 5000,
    });
  }

  protected async toggleArchive(section: LegalSectionListItemDto): Promise<void> {
    const archived = !section.isArchived;
    const success = await this.facade.archiveSection(section.slug, archived);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant(archived ? 'ADMIN.LEGAL.MESSAGES.ARCHIVED' : 'ADMIN.LEGAL.MESSAGES.UNARCHIVED'),
        life: 4000,
      });
      void this.reload();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.ARCHIVE_FAILED'),
      detail: this.facade.documentsError() ?? '',
      life: 5000,
    });
  }

  protected requestDelete(section: LegalSectionListItemDto): void {
    this.deleteTarget.set(section);
    this.deleteDialogOpen.set(true);
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
    if (!visible) {
      this.deleteTarget.set(null);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const section = this.deleteTarget();
    if (!section) {
      return;
    }

    const success = await this.facade.deleteSection(section.slug);
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DELETED'), life: 4000 });
      this.deleteDialogOpen.set(false);
      this.deleteTarget.set(null);
      void this.reload();
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DELETE_FAILED'),
      detail: this.facade.documentsError() ?? '',
      life: 5000,
    });
  }

  protected deleteDialogMessage(): string {
    const section = this.deleteTarget();
    return section ? this.translate.instant('ADMIN.LEGAL.MESSAGES.CONFIRM_DELETE', { slug: section.slug }) : '';
  }

  protected sectionActionMenuItems(section: LegalSectionListItemDto): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    items.push({
      label: t('ADMIN.LEGAL.ACTIONS.PREVIEW'),
      icon: 'pi pi-eye',
      url: `/legal/${section.slug}`,
      target: '_blank',
    });

    if (this.permissionService.hasPermission(this.permissions.Legal.Create)) {
      items.push({
        label: t('ADMIN.LEGAL.ACTIONS.DUPLICATE'),
        icon: 'pi pi-copy',
        disabled: this.actionLoading(),
        command: () => this.openDuplicateDialog(section),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Legal.Edit)) {
      items.push({
        label: t(section.isArchived ? 'ADMIN.LEGAL.ACTIONS.UNARCHIVE' : 'ADMIN.LEGAL.ACTIONS.ARCHIVE'),
        icon: 'pi pi-inbox',
        disabled: this.actionLoading(),
        command: () => void this.toggleArchive(section),
      });
    }

    if (this.permissionService.hasPermission(this.permissions.Legal.Delete)) {
      items.push({
        label: t('ADMIN.LEGAL.ACTIONS.DELETE'),
        icon: 'pi pi-trash',
        disabled: this.actionLoading(),
        command: () => this.requestDelete(section),
      });
    }

    return items;
  }
}

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminConfirmDialogComponent,
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminUnsavedChangesDialogComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { LEGAL_SECTION_CATEGORY_SUGGESTIONS, LegalSectionVersionDto } from '../../models/legal-section.model';
import { LegalManagementFacade } from '../../services/legal-management.facade';

@Component({
  selector: 'app-legal-section-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    EditorModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TabsModule,
    ToastModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminLoadingSkeletonComponent,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
    AdminUnsavedChangesDialogComponent,
    AdminConfirmDialogComponent,
  ],
  providers: [LegalManagementFacade, MessageService],
  templateUrl: './legal-section-detail-page.component.html',
  styleUrl: './legal-section-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalSectionDetailPageComponent implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly facade = inject(LegalManagementFacade);

  protected readonly permissions = PERMISSIONS;
  protected readonly permissionServicePublic = this.permissionService;
  protected readonly slug = signal<string | null>(null);
  protected readonly activeTab = signal('0');
  protected readonly categoryOptions = [...LEGAL_SECTION_CATEGORY_SUGGESTIONS];

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailError = this.facade.detailError;
  protected readonly saving = this.facade.saving;
  protected readonly actionLoading = this.facade.actionLoading;
  protected readonly history = this.facade.history;
  protected readonly historyLoading = this.facade.historyLoading;
  protected readonly historyError = this.facade.historyError;

  protected readonly form = this.fb.nonNullable.group({
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]],
    titleEn: ['', Validators.required],
    titleAr: [''],
    contentEn: ['', Validators.required],
    contentAr: [''],
    category: [''],
    icon: [''],
    sortOrder: [0],
    descriptionEn: [''],
    descriptionAr: [''],
    seoTitle: [''],
    seoDescription: [''],
    seoKeywords: [''],
    showInFooter: [true],
    showInNavigation: [true],
    requireAcceptance: [false],
    versionNotes: [''],
  });

  protected readonly previewUrl = computed(() => `/legal/${this.slug() ?? ''}`);

  protected readonly unsavedDialogOpen = signal(false);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  protected readonly duplicateDialogOpen = signal(false);
  protected readonly duplicateSlug = signal('');
  protected readonly duplicateTitle = signal('');

  protected readonly deleteDialogOpen = signal(false);

  protected readonly breadcrumbs = computed(() => {
    const detail = this.detail();
    return adminBreadcrumbs(
      { label: this.translate.instant('ADMIN.LEGAL.LIST.TITLE'), route: '/admin/legal' },
      { label: detail?.slug ?? '' },
    );
  });

  ngOnInit(): void {
    // p-editor (Quill) updates the form via its own internal event bus rather than an
    // Angular-instrumented listener, so it never triggers OnPush change detection on its
    // own — the control ends up genuinely dirty while the view (e.g. the Save/Publish
    // buttons' [disabled] bindings) stays stale. Bridge every form event through
    // markForCheck() so any control, including the editor, reliably repaints this view.
    this.form.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cdr.markForCheck());

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      return;
    }

    this.slug.set(slug);
    void this.facade.loadDetail(slug).then(() => this.patchForm());
    void this.facade.loadHistory(slug);
  }

  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(String(value ?? '0'));
  }

  protected retryDetail(): void {
    const slug = this.slug();
    if (slug) {
      void this.facade.loadDetail(slug).then(() => this.patchForm());
    }
  }

  protected retryHistory(): void {
    const slug = this.slug();
    if (slug) {
      void this.facade.loadHistory(slug);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  promptUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise((resolve) => {
      this.unsavedDialogResolver = resolve;
      this.unsavedDialogOpen.set(true);
    });
  }

  protected onUnsavedDialogVisibleChange(visible: boolean): void {
    this.unsavedDialogOpen.set(visible);
    if (!visible && this.unsavedDialogResolver) {
      this.resolveUnsavedDialog('cancel');
    }
  }

  protected async onUnsavedSave(): Promise<void> {
    const saved = await this.save();
    this.resolveUnsavedDialog(saved ? 'save' : 'cancel');
  }

  protected onUnsavedDiscard(): void {
    this.resolveUnsavedDialog('discard');
  }

  protected async save(): Promise<boolean> {
    const slug = this.slug();
    if (!slug || this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }

    const value = this.form.getRawValue();
    const success = await this.facade.updateDocument(slug, {
      slug: value.slug,
      titleEn: value.titleEn,
      titleAr: value.titleAr.trim() ? value.titleAr : null,
      contentEn: value.contentEn,
      contentAr: value.contentAr.trim() ? value.contentAr : null,
      category: value.category.trim() ? value.category : null,
      icon: value.icon.trim() ? value.icon : null,
      sortOrder: value.sortOrder,
      descriptionEn: value.descriptionEn.trim() ? value.descriptionEn : null,
      descriptionAr: value.descriptionAr.trim() ? value.descriptionAr : null,
      seoTitle: value.seoTitle.trim() ? value.seoTitle : null,
      seoDescription: value.seoDescription.trim() ? value.seoDescription : null,
      seoKeywords: value.seoKeywords.trim() ? value.seoKeywords : null,
      showInFooter: value.showInFooter,
      showInNavigation: value.showInNavigation,
      requireAcceptance: value.requireAcceptance,
      versionNotes: value.versionNotes.trim() ? value.versionNotes : null,
    });

    if (success) {
      this.form.markAsPristine();
      if (value.slug !== slug) {
        this.slug.set(value.slug);
        void this.router.navigate(['/admin/legal', value.slug], { replaceUrl: true });
      }
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.SAVED'),
        life: 4000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.SAVE_FAILED'),
        detail: this.facade.detailError() ?? '',
        life: 5000,
      });
    }

    return success;
  }

  protected async publish(): Promise<void> {
    const slug = this.slug();
    if (!slug) {
      return;
    }

    if (this.form.dirty) {
      const saved = await this.save();
      if (!saved) {
        return;
      }
    }

    const success = await this.facade.publishDocument(this.slug()!);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.PUBLISHED'),
        life: 4000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.PUBLISH_FAILED'),
        detail: this.facade.detailError() ?? '',
        life: 5000,
      });
    }
  }

  protected async restoreVersion(version: LegalSectionVersionDto): Promise<void> {
    const slug = this.slug();
    if (!slug) {
      return;
    }

    const success = await this.facade.restoreVersion(slug, version.id);
    if (success) {
      this.patchForm();
    }
    this.messageService.add(
      success
        ? { severity: 'success', summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.RESTORED'), life: 4000 }
        : {
            severity: 'error',
            summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.PUBLISH_FAILED'),
            detail: this.facade.detailError() ?? '',
            life: 5000,
          },
    );
  }

  protected async toggleArchive(): Promise<void> {
    const slug = this.slug();
    const archived = !this.detail()?.isArchived;
    if (!slug) {
      return;
    }

    const success = await this.facade.archiveSection(slug, archived);
    if (success) {
      await this.facade.loadDetail(slug);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant(archived ? 'ADMIN.LEGAL.MESSAGES.ARCHIVED' : 'ADMIN.LEGAL.MESSAGES.UNARCHIVED'),
        life: 4000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.ARCHIVE_FAILED'),
        detail: this.facade.documentsError() ?? '',
        life: 5000,
      });
    }
  }

  protected openDuplicateDialog(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    this.duplicateSlug.set(`${detail.slug}-copy`);
    this.duplicateTitle.set(`${detail.publishedVersion?.titleEn ?? detail.draftVersion?.titleEn ?? detail.slug} Copy`);
    this.duplicateDialogOpen.set(true);
  }

  protected closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
  }

  protected async confirmDuplicate(): Promise<void> {
    const slug = this.slug();
    const newSlug = this.duplicateSlug().trim().toLowerCase();
    if (!slug || !newSlug) {
      return;
    }

    const createdSlug = await this.facade.duplicateSection(slug, {
      newSlug,
      newTitleEn: this.duplicateTitle().trim() || null,
    });

    if (createdSlug) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DUPLICATED'), life: 4000 });
      this.closeDuplicateDialog();
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

  protected requestDelete(): void {
    this.deleteDialogOpen.set(true);
  }

  protected onDeleteDialogVisibleChange(visible: boolean): void {
    this.deleteDialogOpen.set(visible);
  }

  protected deleteDialogMessage(): string {
    const slug = this.slug();
    return slug ? this.translate.instant('ADMIN.LEGAL.MESSAGES.CONFIRM_DELETE', { slug }) : '';
  }

  protected async confirmDelete(): Promise<void> {
    const slug = this.slug();
    if (!slug) {
      return;
    }

    const success = await this.facade.deleteSection(slug);
    if (success) {
      this.messageService.add({ severity: 'success', summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DELETED'), life: 4000 });
      void this.router.navigate(['/admin/legal']);
      return;
    }

    this.deleteDialogOpen.set(false);
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.LEGAL.MESSAGES.DELETE_FAILED'),
      detail: this.facade.documentsError() ?? '',
      life: 5000,
    });
  }

  private patchForm(): void {
    const detail = this.detail();
    const source = detail?.draftVersion ?? detail?.publishedVersion;

    this.form.reset({
      slug: detail?.slug ?? '',
      titleEn: source?.titleEn ?? '',
      titleAr: source?.titleAr ?? '',
      contentEn: source?.contentEn ?? '',
      contentAr: source?.contentAr ?? '',
      category: detail?.category ?? '',
      icon: detail?.icon ?? '',
      sortOrder: detail?.sortOrder ?? 0,
      descriptionEn: detail?.descriptionEn ?? '',
      descriptionAr: detail?.descriptionAr ?? '',
      seoTitle: detail?.seoTitle ?? '',
      seoDescription: detail?.seoDescription ?? '',
      seoKeywords: detail?.seoKeywords ?? '',
      showInFooter: detail?.showInFooter ?? true,
      showInNavigation: detail?.showInNavigation ?? true,
      requireAcceptance: detail?.requireAcceptance ?? false,
      versionNotes: source?.versionNotes ?? '',
    });

    // p-editor (Quill) writes its initial content asynchronously and fires its own
    // change event when it does, which marks contentEn/contentAr dirty even though the
    // user hasn't touched anything. Resync pristine state after that settles, so the
    // unsaved-changes guard doesn't fire on a page nobody actually edited.
    setTimeout(() => this.form.markAsPristine());
  }

  private resolveUnsavedDialog(action: 'save' | 'discard' | 'cancel'): void {
    this.unsavedDialogOpen.set(false);
    this.unsavedDialogResolver?.(action);
    this.unsavedDialogResolver = null;
  }
}

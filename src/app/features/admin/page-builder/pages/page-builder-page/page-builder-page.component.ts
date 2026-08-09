import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import { PermissionService } from '../../../../../core/permissions/permission.service';
import {
  AdminActionMenuComponent,
  AdminConfirmDialogComponent,
  AdminEmptyStateComponent,
  AdminErrorAlertComponent,
  AdminIconButtonComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CategoryPickerComponent } from '../../../../../shared/components/admin/category-picker/category-picker.component';
import { ProductPickerComponent } from '../../../../../shared/components/admin/product-picker/product-picker.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { CategoryApiService } from '../../../../catalog/services/category-api.service';
import { LandingPageScope } from '../../../../home/models/landing-page-section.model';
import { SectionVariantDefinition } from '../../../../home/section-registry/models/section-variant.model';
import {
  HOMEPAGE_ONLY_SECTION_CATEGORIES,
  resolveSectionVariant,
} from '../../../../home/section-registry/section-variant-registry';
import {
  BuilderPreviewPaneComponent,
  PreviewTarget,
} from '../../components/builder-preview-pane/builder-preview-pane.component';
import {
  DevicePreviewToggleComponent,
  PreviewDevice,
} from '../../components/device-preview-toggle/device-preview-toggle.component';
import { SectionLibraryDrawerComponent } from '../../components/section-library-drawer/section-library-drawer.component';
import { SectionSettingsPanelComponent } from '../../components/section-settings-panel/section-settings-panel.component';
import {
  LandingPageSectionEntry,
  LandingPageTemplateSummary,
} from '../../models/page-builder.model';
import { PageBuilderFacade } from '../../services/page-builder.facade';
import { SectionCommandStackService } from '../../services/section-command-stack.service';

const SCOPE_TABS: readonly { readonly labelKey: string; readonly value: LandingPageScope }[] = [
  { labelKey: 'ADMIN.PAGE_BUILDER.SCOPE.HOMEPAGE', value: 'Homepage' },
  { labelKey: 'ADMIN.PAGE_BUILDER.SCOPE.PRODUCT', value: 'Product' },
  { labelKey: 'ADMIN.PAGE_BUILDER.SCOPE.CATEGORY', value: 'Category' },
];

@Component({
  selector: 'app-page-builder-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ToastModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    DragDropModule,
    HasPermissionDirective,
    AdminPageHeaderComponent,
    AdminSectionCardComponent,
    AdminErrorAlertComponent,
    AdminEmptyStateComponent,
    AdminLoadingSkeletonComponent,
    AdminStatusBadgeComponent,
    AdminIconButtonComponent,
    AdminActionMenuComponent,
    AdminConfirmDialogComponent,
    AdminStickySaveBarComponent,
    SectionLibraryDrawerComponent,
    SectionSettingsPanelComponent,
    BuilderPreviewPaneComponent,
    DevicePreviewToggleComponent,
    ProductPickerComponent,
    CategoryPickerComponent,
  ],
  providers: [PageBuilderFacade, MessageService, SectionCommandStackService],
  templateUrl: './page-builder-page.component.html',
  styleUrl: './page-builder-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageBuilderPageComponent implements OnInit {
  protected readonly facade = inject(PageBuilderFacade);
  protected readonly commandStack = inject(SectionCommandStackService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryApi = inject(CategoryApiService);

  protected readonly permissions = PERMISSIONS;
  protected readonly breadcrumbs = adminBreadcrumbs({ label: 'Page Builder' });

  protected readonly scopeTabs = SCOPE_TABS;
  protected readonly scope = this.facade.scope;
  protected readonly homepageOnlySectionCategories = HOMEPAGE_ONLY_SECTION_CATEGORIES;

  /** Only Product/Category templates carry a target — the preview pane needs it to fetch the real entity. */
  protected readonly previewTarget = computed<PreviewTarget | null>(() => {
    const template = this.selectedTemplate();
    if (!template || template.scope === 'Homepage' || !template.targetId) {
      return null;
    }
    return { scope: template.scope, targetId: template.targetId };
  });

  protected readonly templates = this.facade.templates;
  protected readonly loading = this.facade.loading;
  protected readonly error = this.facade.error;
  protected readonly selectedTemplate = this.facade.selectedTemplate;
  protected readonly selectedLoading = this.facade.selectedLoading;
  protected readonly activatingId = this.facade.activatingId;
  protected readonly draftSections = this.facade.draftSections;
  protected readonly draftSeo = this.facade.draftSeo;
  protected readonly dirty = this.facade.dirty;
  protected readonly saving = this.facade.saving;
  protected readonly publishing = this.facade.publishing;

  protected readonly selectedId = signal<string | null>(null);
  protected readonly selectedInstanceId = signal<string | null>(null);
  protected readonly libraryOpen = signal(false);

  protected readonly previewCollapsed = signal(true);
  protected readonly previewDevice = signal<PreviewDevice>('desktop');

  protected readonly stickyBarVisible = computed(
    () =>
      this.selectedTemplate() !== null &&
      (this.dirty() || (this.selectedTemplate()?.hasUnpublishedChanges ?? false)),
  );

  protected readonly selectedEntry = computed<LandingPageSectionEntry | null>(() => {
    const id = this.selectedInstanceId();
    if (!id) {
      return null;
    }
    return this.draftSections().find((section) => section.instanceId === id) ?? null;
  });

  protected readonly newTemplateDialogOpen = signal(false);
  protected readonly newTemplateName = signal('');
  protected readonly newTemplateCloneFromId = signal<string | null>(null);
  protected readonly newTemplateTargetId = signal<string | null>(null);
  /** Set only when the dialog was opened via a deep link (Catalog admin "Marketing Page" button) — the target is already decided, so the dialog shows a static confirmation instead of the picker. */
  protected readonly newTemplateTargetName = signal<string | null>(null);
  protected readonly cloneOptions = computed(() =>
    this.templates().map((template) => ({ label: template.name, value: template.id })),
  );
  protected readonly newTemplateTargetIds = computed(() =>
    this.newTemplateTargetId() ? [this.newTemplateTargetId()!] : [],
  );

  protected readonly pendingRemoveInstanceId = signal<string | null>(null);
  protected readonly pendingDeleteTemplate = signal<LandingPageTemplateSummary | null>(null);
  protected readonly viewingId = signal<string | null>(null);

  ngOnInit(): void {
    void this.initialize();
  }

  /** Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo — matches the browser-native shortcuts. */
  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'z';
    const isRedo =
      (event.ctrlKey || event.metaKey) && ((event.shiftKey && key === 'z') || key === 'y');

    if (!isUndo && !isRedo) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    if (!this.canEdit()) {
      return;
    }

    if (isUndo && this.commandStack.canUndo()) {
      event.preventDefault();
      this.commandStack.undo();
    } else if (isRedo && this.commandStack.canRedo()) {
      event.preventDefault();
      this.commandStack.redo();
    }
  }

  protected selectTemplate(template: LandingPageTemplateSummary): void {
    if (this.selectedId() === template.id) {
      return;
    }

    this.selectedId.set(template.id);
    this.selectedInstanceId.set(null);
    void this.facade.selectTemplate(template.id);
  }

  protected async changeScope(scope: LandingPageScope): Promise<void> {
    if (this.scope() === scope) {
      return;
    }

    this.selectedId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { scope: scope.toLowerCase(), targetId: null, targetName: null },
      queryParamsHandling: 'merge',
    });

    await this.facade.setScope(scope);
    this.autoSelectDefault();
  }

  protected onTargetPicked(ids: readonly string[]): void {
    this.newTemplateTargetId.set(ids.length ? ids[ids.length - 1] : null);
  }

  protected async activate(template: LandingPageTemplateSummary): Promise<void> {
    const success = await this.facade.activateTemplate(template.id);

    if (success) {
      this.selectedId.set(template.id);
      this.toast('success', 'ADMIN.PAGE_BUILDER.MESSAGES.ACTIVATED');
      return;
    }

    this.toast('error', 'ADMIN.PAGE_BUILDER.MESSAGES.ACTIVATE_FAILED');
  }

  protected retryLoad(): void {
    void this.initialize();
  }

  protected canEdit(): boolean {
    return (
      this.permissionService.isOwner() ||
      this.permissionService.hasPermission(this.permissions.PageBuilder.Edit)
    );
  }

  /** Homepage keeps the "Template" wording; Product/Category tabs use the generic "Page" wording
   * instead, since a merchant thinks of these as "the product's page," not "a template." */
  protected scopedKey(baseKey: string): string {
    return this.scope() === 'Homepage' ? baseKey : `${baseKey}_SCOPED`;
  }

  /** Opens the real storefront URL for this template's target in a new tab — works regardless of
   * whether the page is currently published (shows the marketing page if live, the normal PDP/
   * category page otherwise, which is itself useful feedback). */
  protected async viewLivePage(template: LandingPageTemplateSummary): Promise<void> {
    if (template.scope === 'Homepage' || !template.targetId) {
      return;
    }

    this.viewingId.set(template.id);
    try {
      const url =
        template.scope === 'Product'
          ? `/products/${template.targetId}`
          : `/categories/${(await firstValueFrom(this.categoryApi.getCategoryById(template.targetId))).slug}`;
      window.open(url, '_blank', 'noopener');
    } catch {
      this.toast('error', 'ADMIN.PAGE_BUILDER.MESSAGES.VIEW_FAILED');
    } finally {
      this.viewingId.set(null);
    }
  }

  // --- Template creation ---------------------------------------------------

  protected openNewTemplateDialog(): void {
    this.newTemplateName.set('');
    this.newTemplateCloneFromId.set(null);
    this.newTemplateTargetId.set(null);
    this.newTemplateTargetName.set(null);
    this.newTemplateDialogOpen.set(true);
  }

  /** Opened via a deep link (Catalog admin "Marketing Page" button) — target already decided. */
  private openNewTemplateDialogForTarget(targetId: string, targetName: string | null): void {
    this.newTemplateName.set(targetName ? `${targetName} Marketing Page` : '');
    this.newTemplateCloneFromId.set(null);
    this.newTemplateTargetId.set(targetId);
    this.newTemplateTargetName.set(targetName);
    this.newTemplateDialogOpen.set(true);
  }

  protected canCreateTemplate(): boolean {
    if (!this.newTemplateName().trim()) {
      return false;
    }
    return this.scope() === 'Homepage' || this.newTemplateTargetId() !== null;
  }

  protected async confirmCreateTemplate(): Promise<void> {
    const name = this.newTemplateName().trim();
    if (!this.canCreateTemplate()) {
      return;
    }

    const newId = await this.facade.createTemplate(
      name,
      this.newTemplateCloneFromId() ?? undefined,
      this.newTemplateTargetId() ?? undefined,
    );
    if (newId) {
      this.newTemplateDialogOpen.set(false);
      this.selectedId.set(newId);
      this.selectedInstanceId.set(null);
      this.toast('success', 'ADMIN.PAGE_BUILDER.MESSAGES.CREATED');
      return;
    }

    this.toast('error', 'ADMIN.PAGE_BUILDER.MESSAGES.CREATE_FAILED');
  }

  // --- Per-template action menu (duplicate / delete) ------------------------

  protected templateActionMenuItems(template: LandingPageTemplateSummary): MenuItem[] {
    const items: MenuItem[] = [];
    const t = (key: string) => this.translate.instant(key);

    if (
      this.permissionService.hasPermission(this.permissions.PageBuilder.Edit) ||
      this.permissionService.isOwner()
    ) {
      items.push({
        label: t('ADMIN.PAGE_BUILDER.TEMPLATES.DUPLICATE'),
        icon: 'pi pi-copy',
        command: () => void this.duplicateTemplate(template),
      });

      items.push({
        label: t('ADMIN.PAGE_BUILDER.TEMPLATES.DELETE'),
        icon: 'pi pi-trash',
        disabled: template.isActive,
        command: () => this.pendingDeleteTemplate.set(template),
      });
    }

    return items;
  }

  private async duplicateTemplate(template: LandingPageTemplateSummary): Promise<void> {
    const name = `${template.name} ${this.translate.instant('ADMIN.PAGE_BUILDER.TEMPLATES.COPY_SUFFIX')}`;
    // Preserves the source's target — duplicating a product page creates another candidate layout
    // for the SAME product, mirroring how the homepage's duplicate-then-activate workflow already works.
    const newId = await this.facade.createTemplate(
      name,
      template.id,
      template.targetId ?? undefined,
    );

    if (newId) {
      this.selectedId.set(newId);
      this.selectedInstanceId.set(null);
      this.toast('success', 'ADMIN.PAGE_BUILDER.MESSAGES.CREATED');
      return;
    }

    this.toast('error', 'ADMIN.PAGE_BUILDER.MESSAGES.CREATE_FAILED');
  }

  protected async confirmDeleteTemplate(): Promise<void> {
    const template = this.pendingDeleteTemplate();
    if (!template) {
      return;
    }

    const success = await this.facade.deleteTemplate(template.id);
    this.pendingDeleteTemplate.set(null);

    if (success) {
      if (this.selectedId() === template.id) {
        const next = this.templates().find((t) => t.isActive) ?? this.templates()[0] ?? null;
        this.selectedId.set(next?.id ?? null);
        this.selectedInstanceId.set(null);
        if (next) {
          void this.facade.selectTemplate(next.id);
        }
      }
      this.toast('success', 'ADMIN.PAGE_BUILDER.MESSAGES.DELETED');
      return;
    }

    this.toast('error', 'ADMIN.PAGE_BUILDER.MESSAGES.DELETE_FAILED');
  }

  // --- Section list editing -------------------------------------------------

  protected variantLabel(section: LandingPageSectionEntry): string {
    return (
      resolveSectionVariant(section.category, section.variantKey)?.displayName ?? section.variantKey
    );
  }

  protected selectSection(instanceId: string): void {
    this.selectedInstanceId.set(this.selectedInstanceId() === instanceId ? null : instanceId);
  }

  protected onDrop(event: CdkDragDrop<readonly LandingPageSectionEntry[]>): void {
    this.commandStack.reorderSections(event.previousIndex, event.currentIndex);
  }

  protected toggleVisibility(instanceId: string): void {
    this.commandStack.toggleVisibility(instanceId);
  }

  protected duplicateSection(instanceId: string): void {
    this.commandStack.duplicateSection(instanceId);
  }

  protected requestRemoveSection(instanceId: string): void {
    this.pendingRemoveInstanceId.set(instanceId);
  }

  protected confirmRemoveSection(): void {
    const instanceId = this.pendingRemoveInstanceId();
    if (!instanceId) {
      return;
    }

    this.commandStack.removeSection(instanceId);
    if (this.selectedInstanceId() === instanceId) {
      this.selectedInstanceId.set(null);
    }
    this.pendingRemoveInstanceId.set(null);
  }

  protected onVariantSelected(variant: SectionVariantDefinition): void {
    this.commandStack.addSection(variant.category, variant.variantKey);
  }

  protected onConfigChange(change: { instanceId: string; configJson: string }): void {
    this.commandStack.updateSectionConfig(change.instanceId, change.configJson);
  }

  // --- Page SEO (Product/Category scope only) --------------------------------

  protected onSeoTitleChange(value: string): void {
    this.facade.updateSeo({ seoTitle: value.trim() || null });
  }

  protected onSeoDescriptionChange(value: string): void {
    this.facade.updateSeo({ seoDescription: value.trim() || null });
  }

  protected onSeoOgImageChange(value: string): void {
    this.facade.updateSeo({ seoOgImageUrl: value.trim() || null });
  }

  // --- Save / publish / discard ---------------------------------------------

  protected async saveDraft(): Promise<void> {
    const success = await this.facade.saveDraft();
    this.commandStack.reset();
    this.toast(
      success ? 'success' : 'error',
      success ? 'ADMIN.PAGE_BUILDER.MESSAGES.SAVED' : 'ADMIN.PAGE_BUILDER.MESSAGES.SAVE_FAILED',
    );
  }

  protected async publish(): Promise<void> {
    const success = await this.facade.publish();
    this.commandStack.reset();
    this.toast(
      success ? 'success' : 'error',
      success
        ? 'ADMIN.PAGE_BUILDER.MESSAGES.PUBLISHED'
        : 'ADMIN.PAGE_BUILDER.MESSAGES.PUBLISH_FAILED',
    );
  }

  protected async discardDraft(): Promise<void> {
    const success = await this.facade.discardDraft();
    this.commandStack.reset();
    this.toast(
      success ? 'success' : 'error',
      success
        ? 'ADMIN.PAGE_BUILDER.MESSAGES.DISCARDED'
        : 'ADMIN.PAGE_BUILDER.MESSAGES.DISCARD_FAILED',
    );
  }

  private async initialize(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const requestedScope = this.parseScope(params.get('scope'));
    const targetId = params.get('targetId');
    const targetName = params.get('targetName');

    if (requestedScope !== 'Homepage') {
      await this.facade.setScope(requestedScope);
    } else {
      await this.facade.loadTemplates();
    }

    if (targetId) {
      const existing = this.facade.templates().find((template) => template.targetId === targetId);
      if (existing) {
        this.selectedId.set(existing.id);
        await this.facade.selectTemplate(existing.id);
        return;
      }

      this.openNewTemplateDialogForTarget(targetId, targetName);
      return;
    }

    this.autoSelectDefault();
  }

  private parseScope(raw: string | null): LandingPageScope {
    switch (raw?.toLowerCase()) {
      case 'product':
        return 'Product';
      case 'category':
        return 'Category';
      default:
        return 'Homepage';
    }
  }

  private autoSelectDefault(): void {
    const templates = this.facade.templates();
    const target = templates.find((template) => template.isActive) ?? templates[0];

    if (target) {
      this.selectedId.set(target.id);
      void this.facade.selectTemplate(target.id);
    }
  }

  private toast(severity: 'success' | 'error', summaryKey: string): void {
    this.messageService.add({
      severity,
      summary: this.translate.instant(summaryKey),
      detail: severity === 'error' ? (this.facade.error() ?? '') : '',
      life: severity === 'error' ? 5000 : 4000,
    });
  }
}

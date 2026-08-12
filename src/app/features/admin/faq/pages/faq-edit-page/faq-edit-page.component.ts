import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
  AdminUnsavedChangesDialogComponent,
  CategoryPickerComponent,
  ProductPickerComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CreateFaqRequest, FaqScope, UpdateFaqRequest } from '../../models/faq-api.model';
import { FaqManagementFacade } from '../../services/faq-management.facade';

interface FaqFormSnapshot {
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  categoryId: string;
  scope: FaqScope;
  targetId: string | null;
}

const SCOPE_OPTIONS: { label: string; value: FaqScope }[] = [
  { label: 'Global (shown everywhere)', value: 'Global' },
  { label: 'Product-specific', value: 'Product' },
  { label: 'Category-specific', value: 'Category' },
];

@Component({
  selector: 'app-faq-edit-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    EditorModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    AdminUnsavedChangesDialogComponent,
    ProductPickerComponent,
    CategoryPickerComponent,
  ],
  providers: [FaqManagementFacade, MessageService],
  templateUrl: './faq-edit-page.component.html',
  styleUrl: './faq-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqEditPageComponent implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(FaqManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly scopeOptions = SCOPE_OPTIONS;

  protected readonly faqId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.faqId() === null);

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      { label: 'FAQ', route: '/admin/faqs' },
      { label: this.isCreateMode() ? 'New FAQ' : 'Edit FAQ' },
    ),
  );

  protected readonly questionEn = signal('');
  protected readonly questionAr = signal('');
  protected readonly answerEn = signal('');
  protected readonly answerAr = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly scope = signal<FaqScope>('Global');
  protected readonly targetIds = signal<readonly string[]>([]);

  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;
  protected readonly categories = this.facade.categories;

  protected readonly categoryOptions = computed(() =>
    this.categories().map((c) => ({ label: c.nameEn, value: c.id })),
  );

  protected readonly showTargetPicker = computed(() => this.scope() !== 'Global');

  protected readonly quickAddCategoryOpen = signal(false);
  protected readonly quickAddCategoryName = signal('');
  protected readonly quickAddCategorySaving = signal(false);

  private readonly formSnapshot = computed<FaqFormSnapshot>(() => ({
    questionEn: this.questionEn(),
    questionAr: this.questionAr(),
    answerEn: this.answerEn(),
    answerAr: this.answerAr(),
    categoryId: this.categoryId() ?? '',
    scope: this.scope(),
    targetId: this.targetIds()[0] ?? null,
  }));

  private savedSnapshot: string | null = null;

  protected readonly unsavedDialogOpen = signal(false);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  constructor() {
    effect(() => {
      const detail = this.facade.detail();
      if (!detail || this.isCreateMode()) {
        return;
      }

      this.questionEn.set(detail.questionEn);
      this.questionAr.set(detail.questionAr ?? '');
      this.answerEn.set(detail.answerEn);
      this.answerAr.set(detail.answerAr ?? '');
      this.categoryId.set(detail.categoryId);
      this.scope.set(detail.scope);
      this.targetIds.set(detail.targetId ? [detail.targetId] : []);
      this.markPristine();
    });
  }

  ngOnInit(): void {
    void this.facade.loadCategories();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.faqId.set(id);
      void this.facade.loadDetail(id);
      return;
    }

    this.facade.resetDetail();
    this.markPristine();
  }

  protected onScopeChange(value: FaqScope): void {
    this.scope.set(value);
    if (value === 'Global') {
      this.targetIds.set([]);
    }
  }

  /** CategoryPickerComponent has no built-in single-select mode (it's a multi-select chip picker,
   * reused as-is per project convention) — keep only the most recently chosen id. */
  protected onCategoryTargetChange(ids: readonly string[]): void {
    this.targetIds.set(ids.length > 0 ? [ids[ids.length - 1]] : []);
  }

  protected canSubmit(): boolean {
    if (!this.questionEn().trim() || !this.stripHtml(this.answerEn()).trim()) {
      return false;
    }
    if (!this.categoryId()) {
      return false;
    }
    if (this.scope() !== 'Global' && this.targetIds().length === 0) {
      return false;
    }
    return true;
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!this.detailSaving() && this.canSubmit()) {
        void this.save();
      }
    }
  }

  protected async save(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    const targetId = this.scope() === 'Global' ? null : (this.targetIds()[0] ?? null);
    const payload = {
      questionEn: this.questionEn().trim(),
      questionAr: this.questionAr().trim() || null,
      answerEn: this.answerEn(),
      answerAr: this.answerAr().trim() || null,
      categoryId: this.categoryId()!,
      scope: this.scope(),
      targetId,
    };

    if (this.isCreateMode()) {
      const request: CreateFaqRequest = payload;
      const createdId = await this.facade.createFaq(request);
      if (createdId) {
        this.messageService.add({ severity: 'success', summary: 'FAQ created', life: 4000 });
        this.markPristine();
        void this.router.navigate(['/admin/faqs']);
        return;
      }
      this.messageService.add({
        severity: 'error',
        summary: 'Create failed',
        detail: this.facade.detailError() ?? 'Unable to create FAQ.',
        life: 5000,
      });
      return;
    }

    const faqId = this.faqId();
    if (!faqId) {
      return;
    }

    const request: UpdateFaqRequest = payload;
    const success = await this.facade.updateFaq(faqId, request);
    if (success) {
      this.messageService.add({ severity: 'success', summary: 'FAQ saved', life: 4000 });
      this.markPristine();
      void this.router.navigate(['/admin/faqs']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Save failed',
      detail: this.facade.detailError() ?? 'Unable to save FAQ.',
      life: 5000,
    });
  }

  protected openQuickAddCategory(): void {
    this.quickAddCategoryName.set('');
    this.quickAddCategoryOpen.set(true);
  }

  protected async confirmQuickAddCategory(): Promise<void> {
    const name = this.quickAddCategoryName().trim();
    if (!name) {
      return;
    }

    this.quickAddCategorySaving.set(true);
    const created = await this.facade.createCategory({ nameEn: name, nameAr: null });
    this.quickAddCategorySaving.set(false);

    if (created) {
      this.categoryId.set(created.id);
      this.quickAddCategoryOpen.set(false);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Failed to add category',
      life: 4000,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private markPristine(): void {
    this.savedSnapshot = JSON.stringify(this.formSnapshot());
  }

  // --- Unsaved-changes guard (HasUnsavedChanges) ---

  hasUnsavedChanges(): boolean {
    return this.savedSnapshot !== null && this.savedSnapshot !== JSON.stringify(this.formSnapshot());
  }

  promptUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise((resolve) => {
      this.unsavedDialogResolver = resolve;
      this.unsavedDialogOpen.set(true);
    });
  }

  protected async onUnsavedSave(): Promise<void> {
    await this.save();
    this.finishUnsavedDialog(this.hasUnsavedChanges() ? 'cancel' : 'save');
  }

  protected onUnsavedDiscard(): void {
    this.finishUnsavedDialog('discard');
  }

  protected onUnsavedDialogVisibleChange(visible: boolean): void {
    this.unsavedDialogOpen.set(visible);
    if (!visible && this.unsavedDialogResolver) {
      this.finishUnsavedDialog('cancel');
    }
  }

  private finishUnsavedDialog(action: 'save' | 'discard' | 'cancel'): void {
    this.unsavedDialogOpen.set(false);
    this.unsavedDialogResolver?.(action);
    this.unsavedDialogResolver = null;
  }
}

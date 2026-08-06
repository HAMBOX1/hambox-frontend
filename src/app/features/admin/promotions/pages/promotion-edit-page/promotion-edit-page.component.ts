import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { HasUnsavedChanges } from '../../../../../core/guards/unsaved-changes.guard';
import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminConfirmDialogComponent,
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStepperComponent,
  AdminStepperStep,
  AdminStickySaveBarComponent,
  AdminUnsavedChangesDialogComponent,
  CategoryPickerComponent,
  ProductPickerComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import { CHECKOUT_COUNTRIES } from '../../../../checkout/services/checkout.constants';
import { PromotionSummaryPanelComponent } from '../../components/promotion-summary-panel/promotion-summary-panel.component';
import {
  CreatePromotionRequest,
  DISCOUNT_TYPE_OPTIONS,
  PromotionConditionDto,
  PromotionTargetDto,
  PROMOTION_TYPE_OPTIONS,
  UpdatePromotionRequest,
} from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';
import { discountPreviewText, discountWarning } from '../../utils/promotion-display.util';

const STEP_KEYS = [
  { key: 'ADMIN.PROMOTIONS.EDIT.STEP_BASICS', icon: 'pi pi-info-circle' },
  { key: 'ADMIN.PROMOTIONS.EDIT.STEP_DISCOUNT', icon: 'pi pi-percentage' },
  { key: 'ADMIN.PROMOTIONS.EDIT.STEP_ELIGIBILITY', icon: 'pi pi-shield' },
  { key: 'ADMIN.PROMOTIONS.EDIT.STEP_TARGETS', icon: 'pi pi-crosshairs' },
  { key: 'ADMIN.PROMOTIONS.EDIT.STEP_REVIEW', icon: 'pi pi-check-circle' },
] as const;

interface PromotionFormSnapshot {
  name: string;
  description: string;
  type: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  initialCouponCode: string;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  firstPurchaseOnly: boolean;
  membershipRequired: boolean;
  countryCodes: readonly string[];
  productTargetIds: readonly string[];
  categoryTargetIds: readonly string[];
}

const DRAFT_PREFIX = 'hambox.admin.promotion-draft.';
const AUTOSAVE_DEBOUNCE_MS = 800;

@Component({
  selector: 'app-promotion-edit-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
    AdminStepperComponent,
    AdminUnsavedChangesDialogComponent,
    AdminConfirmDialogComponent,
    ProductPickerComponent,
    CategoryPickerComponent,
    PromotionSummaryPanelComponent,
  ],
  providers: [PromotionManagementFacade, MessageService],
  templateUrl: './promotion-edit-page.component.html',
  styleUrl: './promotion-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionEditPageComponent implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(PromotionManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly typeOptions = [...PROMOTION_TYPE_OPTIONS.filter((o) => o.value !== 'all')];
  protected readonly discountTypeOptions = [...DISCOUNT_TYPE_OPTIONS];
  protected readonly steps = computed<readonly AdminStepperStep[]>(() =>
    STEP_KEYS.map((step) => ({ label: this.translate.instant(step.key), icon: step.icon })),
  );
  protected readonly activeIndex = signal(0);

  protected readonly promotionId = signal<string | null>(null);
  protected readonly isCreateMode = computed(() => this.promotionId() === null);

  protected readonly breadcrumbs = computed(() =>
    adminBreadcrumbs(
      {
        label: this.translate.instant('ADMIN.PROMOTIONS.LIST.TITLE'),
        route: '/admin/promotions',
      },
      {
        label: this.translate.instant(
          this.isCreateMode()
            ? 'ADMIN.PROMOTIONS.EDIT.CREATE_TITLE'
            : 'ADMIN.PROMOTIONS.EDIT.EDIT_TITLE',
        ),
      },
    ),
  );

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly type = signal('CouponCode');
  protected readonly discountType = signal('Percentage');
  protected readonly discountValue = signal(10);
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly initialCouponCode = signal('');

  protected readonly minOrderAmount = signal<number | null>(null);
  protected readonly maxDiscountAmount = signal<number | null>(null);
  protected readonly usageLimit = signal<number | null>(null);
  protected readonly perUserLimit = signal<number | null>(null);
  protected readonly firstPurchaseOnly = signal(false);
  protected readonly membershipRequired = signal(false);
  protected readonly countryCodes = signal<readonly string[]>([]);
  protected readonly countryOptions = CHECKOUT_COUNTRIES;

  protected readonly productTargetIds = signal<readonly string[]>([]);
  protected readonly categoryTargetIds = signal<readonly string[]>([]);

  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;

  protected readonly discountWarningKey = computed(() =>
    discountWarning(this.discountType(), this.discountValue()),
  );

  protected readonly discountPreview = computed(() =>
    discountPreviewText(this.discountType(), this.discountValue()),
  );

  protected readonly summaryData = computed(() => ({
    name: this.name(),
    type: this.type(),
    discountType: this.discountType(),
    discountValue: this.discountValue(),
    startDateUtc: this.toUtcIso(this.startDate()),
    endDateUtc: this.toUtcIso(this.endDate()),
    conditions: this.buildConditions(),
    productTargetCount: this.productTargetIds().length,
    categoryTargetCount: this.categoryTargetIds().length,
  }));

  private readonly formSnapshot = computed<PromotionFormSnapshot>(() => ({
    name: this.name(),
    description: this.description(),
    type: this.type(),
    discountType: this.discountType(),
    discountValue: this.discountValue(),
    startDate: this.startDate(),
    endDate: this.endDate(),
    initialCouponCode: this.initialCouponCode(),
    minOrderAmount: this.minOrderAmount(),
    maxDiscountAmount: this.maxDiscountAmount(),
    usageLimit: this.usageLimit(),
    perUserLimit: this.perUserLimit(),
    firstPurchaseOnly: this.firstPurchaseOnly(),
    membershipRequired: this.membershipRequired(),
    countryCodes: this.countryCodes(),
    productTargetIds: this.productTargetIds(),
    categoryTargetIds: this.categoryTargetIds(),
  }));

  private savedSnapshot: string | null = null;
  private draftLoaded = false;

  protected readonly restoreDraftDialogOpen = signal(false);
  protected readonly unsavedDialogOpen = signal(false);
  private unsavedDialogResolver: ((action: 'save' | 'discard' | 'cancel') => void) | null = null;

  constructor() {
    effect(() => {
      const detail = this.facade.detail();
      if (!detail || this.isCreateMode()) {
        return;
      }

      this.name.set(detail.name);
      this.description.set(detail.description ?? '');
      this.type.set(detail.type);
      this.discountType.set(detail.discountType);
      this.discountValue.set(detail.discountValue);
      this.startDate.set(this.toDateInput(detail.startDateUtc));
      this.endDate.set(this.toDateInput(detail.endDateUtc));
      this.applyConditions(detail.conditions);
      this.applyTargets(detail.targets);
      this.markPristine();
      this.checkForDraft();
    });

    effect(() => {
      const snapshot = this.formSnapshot();
      if (!this.draftLoaded || !this.hasUnsavedChanges()) {
        return;
      }
      this.scheduleAutosave(snapshot);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.promotionId.set(id);
      void this.facade.loadDetail(id);
      return;
    }

    this.facade.resetDetail();
    this.markPristine();
    this.checkForDraft();
  }

  protected nextStep(): void {
    if (this.activeIndex() < this.steps().length - 1) {
      this.activeIndex.set(this.activeIndex() + 1);
    }
  }

  protected previousStep(): void {
    if (this.activeIndex() > 0) {
      this.activeIndex.set(this.activeIndex() - 1);
    }
  }

  protected canAdvanceFromBasics(): boolean {
    return this.name().trim().length > 0;
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!this.detailSaving() && this.canAdvanceFromBasics()) {
        void this.save();
      }
    }
  }

  protected async save(): Promise<void> {
    const conditions = this.buildConditions();
    const targets = this.buildTargets();
    const startDateUtc = this.toUtcIso(this.startDate());
    const endDateUtc = this.toUtcIso(this.endDate());

    if (this.isCreateMode()) {
      const request: CreatePromotionRequest = {
        name: this.name().trim(),
        description: this.description().trim() || null,
        type: this.type(),
        discountType: this.discountType(),
        discountValue: this.discountValue(),
        startDateUtc,
        endDateUtc,
        conditions,
        targets,
        initialCouponCode: this.initialCouponCode().trim() || null,
      };

      const createdId = await this.facade.createPromotion(request);
      if (createdId) {
        this.messageService.add({
          severity: 'success',
          summary: 'Promotion created',
          life: 4000,
        });
        this.markPristine();
        this.clearDraft();
        void this.router.navigate(['/admin/promotions', createdId]);
        return;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Create failed',
        detail: this.facade.detailError() ?? 'Unable to create promotion.',
        life: 5000,
      });
      return;
    }

    const promotionId = this.promotionId();
    if (!promotionId) {
      return;
    }

    const request: UpdatePromotionRequest = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      discountType: this.discountType(),
      discountValue: this.discountValue(),
      startDateUtc,
      endDateUtc,
      conditions,
      targets,
    };

    const success = await this.facade.updatePromotion(promotionId, request);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Promotion saved',
        life: 4000,
      });
      this.markPristine();
      this.clearDraft();
      void this.router.navigate(['/admin/promotions', promotionId]);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Save failed',
      detail: this.facade.detailError() ?? 'Unable to save promotion.',
      life: 5000,
    });
  }

  private buildConditions(): PromotionConditionDto[] {
    const conditions: PromotionConditionDto[] = [];

    if (this.minOrderAmount() != null && this.minOrderAmount()! > 0) {
      conditions.push({ type: 'MinOrderAmount', value: String(this.minOrderAmount()) });
    }
    if (this.maxDiscountAmount() != null && this.maxDiscountAmount()! > 0) {
      conditions.push({ type: 'MaxDiscountAmount', value: String(this.maxDiscountAmount()) });
    }
    if (this.usageLimit() != null && this.usageLimit()! > 0) {
      conditions.push({ type: 'UsageLimit', value: String(this.usageLimit()) });
    }
    if (this.perUserLimit() != null && this.perUserLimit()! > 0) {
      conditions.push({ type: 'PerUserLimit', value: String(this.perUserLimit()) });
    }
    if (this.firstPurchaseOnly()) {
      conditions.push({ type: 'FirstPurchaseOnly', value: 'true' });
    }
    if (this.membershipRequired()) {
      conditions.push({ type: 'MembershipRequired', value: 'true' });
    }
    // Backend only ever evaluates the first CountryCode condition on a promotion (exact-match
    // equality against the customer's country, see PromotionEligibilityChecker), so only the
    // first selected country is persisted even though the control allows searching many.
    if (this.countryCodes().length > 0) {
      conditions.push({ type: 'CountryCode', value: this.countryCodes()[0] });
    }

    return conditions;
  }

  private buildTargets(): PromotionTargetDto[] {
    const targets: PromotionTargetDto[] = [];

    for (const id of this.productTargetIds()) {
      targets.push({ type: 'Product', targetId: id });
    }
    for (const id of this.categoryTargetIds()) {
      targets.push({ type: 'Category', targetId: id });
    }

    return targets;
  }

  private applyConditions(conditions: readonly PromotionConditionDto[]): void {
    this.minOrderAmount.set(null);
    this.maxDiscountAmount.set(null);
    this.usageLimit.set(null);
    this.perUserLimit.set(null);
    this.firstPurchaseOnly.set(false);
    this.membershipRequired.set(false);
    this.countryCodes.set([]);

    for (const condition of conditions) {
      switch (condition.type) {
        case 'MinOrderAmount':
          this.minOrderAmount.set(Number(condition.value));
          break;
        case 'MaxDiscountAmount':
          this.maxDiscountAmount.set(Number(condition.value));
          break;
        case 'UsageLimit':
          this.usageLimit.set(Number(condition.value));
          break;
        case 'PerUserLimit':
          this.perUserLimit.set(Number(condition.value));
          break;
        case 'FirstPurchaseOnly':
          this.firstPurchaseOnly.set(condition.value === 'true');
          break;
        case 'MembershipRequired':
          this.membershipRequired.set(condition.value === 'true');
          break;
        case 'CountryCode':
          this.countryCodes.set(condition.value ? [condition.value] : []);
          break;
      }
    }
  }

  private applyTargets(targets: readonly PromotionTargetDto[]): void {
    this.productTargetIds.set(targets.filter((t) => t.type === 'Product').map((t) => t.targetId));
    this.categoryTargetIds.set(
      targets.filter((t) => t.type === 'Category').map((t) => t.targetId),
    );
  }

  private toDateInput(value: string | null): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 16);
  }

  private toUtcIso(value: string): string | null {
    if (!value.trim()) {
      return null;
    }
    return new Date(value).toISOString();
  }

  // --- Autosave draft (localStorage only — no backend, no fabricated data, just the user's own
  // in-progress input surviving an accidental navigation/reload) ---

  private draftKey(): string {
    return `${DRAFT_PREFIX}${this.promotionId() ?? 'new'}`;
  }

  private autosaveTimer: ReturnType<typeof setTimeout> | undefined;

  private scheduleAutosave(snapshot: PromotionFormSnapshot): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = setTimeout(() => {
      localStorage.setItem(
        this.draftKey(),
        JSON.stringify({ savedAt: new Date().toISOString(), data: snapshot }),
      );
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  private checkForDraft(): void {
    this.draftLoaded = true;
    if (typeof localStorage === 'undefined') {
      return;
    }

    const raw = localStorage.getItem(this.draftKey());
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { savedAt: string; data: PromotionFormSnapshot };
      if (JSON.stringify(parsed.data) !== this.savedSnapshot) {
        this.restoreDraftDialogOpen.set(true);
      }
    } catch {
      localStorage.removeItem(this.draftKey());
    }
  }

  protected confirmRestoreDraft(): void {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.draftKey()) : null;
    this.restoreDraftDialogOpen.set(false);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { savedAt: string; data: PromotionFormSnapshot };
      this.applyDraft(parsed.data);
    } catch {
      // ignore malformed draft
    }
  }

  protected onRestoreDraftDialogVisibleChange(visible: boolean): void {
    this.restoreDraftDialogOpen.set(visible);
    if (!visible) {
      this.clearDraft();
    }
  }

  private clearDraft(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.draftKey());
    }
  }

  private applyDraft(data: PromotionFormSnapshot): void {
    this.name.set(data.name);
    this.description.set(data.description);
    this.type.set(data.type);
    this.discountType.set(data.discountType);
    this.discountValue.set(data.discountValue);
    this.startDate.set(data.startDate);
    this.endDate.set(data.endDate);
    this.initialCouponCode.set(data.initialCouponCode);
    this.minOrderAmount.set(data.minOrderAmount);
    this.maxDiscountAmount.set(data.maxDiscountAmount);
    this.usageLimit.set(data.usageLimit);
    this.perUserLimit.set(data.perUserLimit);
    this.firstPurchaseOnly.set(data.firstPurchaseOnly);
    this.membershipRequired.set(data.membershipRequired);
    this.countryCodes.set(data.countryCodes);
    this.productTargetIds.set(data.productTargetIds);
    this.categoryTargetIds.set(data.categoryTargetIds);
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
    this.clearDraft();
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

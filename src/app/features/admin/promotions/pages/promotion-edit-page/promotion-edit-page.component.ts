import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminErrorAlertComponent,
  AdminLoadingSkeletonComponent,
  AdminPageHeaderComponent,
  AdminSectionCardComponent,
  AdminStickySaveBarComponent,
} from '../../../../../shared/components/admin';
import { adminBreadcrumbs } from '../../../../../shared/components/admin/admin-breadcrumb.helpers';
import {
  CreatePromotionRequest,
  DISCOUNT_TYPE_OPTIONS,
  PromotionConditionDto,
  PromotionTargetDto,
  PROMOTION_TYPE_OPTIONS,
  UpdatePromotionRequest,
} from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';

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
    SelectModule,
    TextareaModule,
    ToastModule,
    AdminPageHeaderComponent,
    AdminErrorAlertComponent,
    AdminSectionCardComponent,
    AdminLoadingSkeletonComponent,
    AdminStickySaveBarComponent,
  ],
  providers: [PromotionManagementFacade, MessageService],
  templateUrl: './promotion-edit-page.component.html',
  styleUrl: './promotion-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionEditPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(PromotionManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly permissions = PERMISSIONS;
  protected readonly typeOptions = [...PROMOTION_TYPE_OPTIONS.filter((o) => o.value !== 'all')];
  protected readonly discountTypeOptions = [...DISCOUNT_TYPE_OPTIONS];

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

  protected readonly productTargetIds = signal('');
  protected readonly categoryTargetIds = signal('');

  protected readonly detailLoading = this.facade.detailLoading;
  protected readonly detailSaving = this.facade.detailSaving;
  protected readonly detailError = this.facade.detailError;

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

    return conditions;
  }

  private buildTargets(): PromotionTargetDto[] {
    const targets: PromotionTargetDto[] = [];

    for (const id of this.parseGuidList(this.productTargetIds())) {
      targets.push({ type: 'Product', targetId: id });
    }
    for (const id of this.parseGuidList(this.categoryTargetIds())) {
      targets.push({ type: 'Category', targetId: id });
    }

    return targets;
  }

  private parseGuidList(value: string): string[] {
    return value
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private applyConditions(conditions: readonly PromotionConditionDto[]): void {
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
      }
    }
  }

  private applyTargets(targets: readonly PromotionTargetDto[]): void {
    const products = targets.filter((t) => t.type === 'Product').map((t) => t.targetId);
    const categories = targets.filter((t) => t.type === 'Category').map((t) => t.targetId);
    this.productTargetIds.set(products.join(', '));
    this.categoryTargetIds.set(categories.join(', '));
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
}

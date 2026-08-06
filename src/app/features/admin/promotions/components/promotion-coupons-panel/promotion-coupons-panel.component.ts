import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { CouponCodeDto } from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';
import { couponRemaining, CouponStatus, couponStatus } from '../../utils/promotion-display.util';
import {
  CouponFormValue,
  EMPTY_COUPON_FORM_VALUE,
  GenerateCouponsFormComponent,
} from '../generate-coupons-form/generate-coupons-form.component';

const COUPON_STATUS_TONE: Record<CouponStatus, AdminStatusTone> = {
  active: 'success',
  expired: 'warning',
  exhausted: 'warning',
  inactive: 'neutral',
};

@Component({
  selector: 'app-promotion-coupons-panel',
  standalone: true,
  imports: [
    TranslatePipe,
    ButtonModule,
    DialogModule,
    TableModule,
    TooltipModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
    GenerateCouponsFormComponent,
  ],
  templateUrl: './promotion-coupons-panel.component.html',
  styleUrl: './promotion-coupons-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionCouponsPanelComponent {
  private readonly facade = inject(PromotionManagementFacade);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly promotionId = input.required<string>();
  readonly promotionName = input<string>('');
  readonly promotionType = input<string>('');
  readonly coupons = input.required<readonly CouponCodeDto[]>();

  protected readonly permissions = PERMISSIONS;
  protected readonly actionLoading = this.facade.actionLoading;

  // Backend rejects coupon creation on any promotion whose type isn't CouponCode (see
  // CreateCouponCommandHandler/GenerateCouponsCommandHandler) — gated here so the buttons never
  // lead to a raw backend error.
  protected readonly canManageCoupons = computed(() => this.promotionType() === 'CouponCode');

  protected readonly generateDialogOpen = signal(false);
  protected readonly customDialogOpen = signal(false);

  protected readonly generateForm = signal<CouponFormValue>({ ...EMPTY_COUPON_FORM_VALUE, count: 10 });
  protected readonly customForm = signal<CouponFormValue>({ ...EMPTY_COUPON_FORM_VALUE });

  protected statusOf(coupon: CouponCodeDto): CouponStatus {
    return couponStatus(coupon);
  }

  protected statusTone(coupon: CouponCodeDto): AdminStatusTone {
    return COUPON_STATUS_TONE[this.statusOf(coupon)];
  }

  protected statusLabel(coupon: CouponCodeDto): string {
    return this.translate.instant(`ADMIN.PROMOTIONS.COUPONS.STATUS.${this.statusOf(coupon).toUpperCase()}`);
  }

  protected remainingOf(coupon: CouponCodeDto): string {
    const remaining = couponRemaining(coupon);
    return remaining === null ? this.translate.instant('ADMIN.PROMOTIONS.COUPONS.UNLIMITED') : String(remaining);
  }

  protected async confirmGenerate(): Promise<void> {
    const form = this.generateForm();
    const success = await this.facade.generateCoupons(this.promotionId(), {
      count: form.count,
      prefix: form.prefix.trim() || null,
      isSingleUse: form.isSingleUse,
      maxUses: form.maxUses,
      perUserMaxUses: form.perUserMaxUses,
      expiresOnUtc: this.toIso(form.expiresOnUtc),
    });

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.PROMOTIONS.COUPONS.GENERATE_SUCCESS'),
        life: 4000,
      });
      this.generateDialogOpen.set(false);
      this.generateForm.set({ ...EMPTY_COUPON_FORM_VALUE, count: 10 });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.PROMOTIONS.COUPONS.GENERATE_FAILED'),
      detail: this.facade.promotionsError() ?? undefined,
      life: 5000,
    });
  }

  protected async confirmCustomCoupon(): Promise<void> {
    const form = this.customForm();
    const code = form.code.trim();
    if (!code) {
      return;
    }

    const success = await this.facade.createCoupon(this.promotionId(), {
      code,
      isSingleUse: form.isSingleUse,
      maxUses: form.maxUses,
      perUserMaxUses: form.perUserMaxUses,
      expiresOnUtc: this.toIso(form.expiresOnUtc),
    });

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('ADMIN.PROMOTIONS.COUPONS.CUSTOM_SUCCESS'),
        life: 4000,
      });
      this.customDialogOpen.set(false);
      this.customForm.set({ ...EMPTY_COUPON_FORM_VALUE });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('ADMIN.PROMOTIONS.COUPONS.CUSTOM_FAILED'),
      detail: this.facade.promotionsError() ?? undefined,
      life: 5000,
    });
  }

  protected async copyCode(code: string): Promise<void> {
    await navigator.clipboard.writeText(code);
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('ADMIN.PROMOTIONS.COUPONS.COPIED'),
      life: 2500,
    });
  }

  protected exportCoupons(): void {
    const coupons = this.coupons();
    if (coupons.length === 0) {
      return;
    }

    const header = ['Code', 'Status', 'Used', 'Max uses', 'Remaining', 'Per-user max', 'Expires', 'Single use'];
    const rows = coupons.map((coupon) => [
      coupon.code,
      this.statusOf(coupon),
      String(coupon.usedCount),
      coupon.maxUses === null ? 'Unlimited' : String(coupon.maxUses),
      this.remainingOf(coupon),
      coupon.perUserMaxUses === null ? 'Unlimited' : String(coupon.perUserMaxUses),
      coupon.expiresOnUtc ?? 'Never',
      coupon.isSingleUse ? 'Yes' : 'No',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const namePart = this.promotionName().trim() || this.promotionId();
    link.download = `${namePart}-coupons.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private toIso(value: string): string | null {
    if (!value.trim()) {
      return null;
    }
    return new Date(value).toISOString();
  }
}

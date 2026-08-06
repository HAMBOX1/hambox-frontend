import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

export interface CouponFormValue {
  readonly count: number;
  readonly prefix: string;
  readonly code: string;
  readonly isSingleUse: boolean;
  readonly maxUses: number | null;
  readonly perUserMaxUses: number | null;
  /** `datetime-local` input value (not ISO) — converted to UTC ISO by the host on submit. */
  readonly expiresOnUtc: string;
}

export const EMPTY_COUPON_FORM_VALUE: CouponFormValue = {
  count: 10,
  prefix: '',
  code: '',
  isSingleUse: false,
  maxUses: null,
  perUserMaxUses: null,
  expiresOnUtc: '',
};

/**
 * Shared field set for both "generate bulk" and "create custom" coupon dialogs — used by the
 * promotion coupons panel and the list page's promotion-picker-first Generate Coupons flow, so the
 * fields (previously duplicated per-dialog) are authored once.
 */
@Component({
  selector: 'app-generate-coupons-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe, CheckboxModule, InputNumberModule, InputTextModule],
  templateUrl: './generate-coupons-form.component.html',
  styleUrl: './generate-coupons-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateCouponsFormComponent {
  readonly mode = input.required<'bulk' | 'custom'>();
  readonly value = input.required<CouponFormValue>();

  readonly valueChange = output<CouponFormValue>();

  protected patch(partial: Partial<CouponFormValue>): void {
    this.valueChange.emit({ ...this.value(), ...partial });
  }

  /** Backend rejects a single-use coupon whose maxUses isn't exactly 1 (see
   * CreateCouponCommandValidator/GenerateCouponsCommandValidator) — enforced here so the
   * combination can't even be entered, instead of surfacing a raw validation error after submit. */
  protected onSingleUseChange(isSingleUse: boolean): void {
    this.patch({ isSingleUse, maxUses: isSingleUse ? 1 : null });
  }
}

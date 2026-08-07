import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { PromotionConditionDto } from '../../models/promotion-api.model';
import {
  discountPreviewText,
  promotionApplicabilityIssues,
  promotionInfoNoteKey,
  scheduleStatus,
  scopeLabelKey,
} from '../../utils/promotion-display.util';

export interface PromotionSummaryData {
  readonly name: string;
  readonly type: string;
  readonly discountType: string;
  readonly discountValue: number;
  readonly startDateUtc: string | null;
  readonly endDateUtc: string | null;
  readonly conditions: readonly PromotionConditionDto[];
  readonly productTargetCount: number;
  readonly categoryTargetCount: number;
  readonly hasCoupon: boolean;
}

const RESTRICTION_TYPES = new Set([
  'MinOrderAmount',
  'MaxDiscountAmount',
  'FirstPurchaseOnly',
  'MembershipRequired',
  'CountryCode',
]);
const USAGE_LIMIT_TYPES = new Set(['UsageLimit', 'PerUserLimit']);

/** Pure "Live Summary" presentation — used as the sticky panel in the promotion edit form and as
 * the Overview tab content on the detail page. Every value is derived from the real
 * conditions/targets/discount fields already on the wire; nothing here is fabricated. */
@Component({
  selector: 'app-promotion-summary-panel',
  standalone: true,
  imports: [TranslatePipe, HamboxDatePipe],
  templateUrl: './promotion-summary-panel.component.html',
  styleUrl: './promotion-summary-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionSummaryPanelComponent {
  readonly data = input.required<PromotionSummaryData>();
  readonly warningKey = input<string | null>(null);

  /** Translation keys explaining why this promotion, as configured right now, can never apply —
   * empty means fully configured for its type. Mirrors the exact gate each backend evaluator
   * checks; see promotion-display.util's `promotionApplicabilityIssues`. */
  protected readonly applicabilityIssueKeys = computed(() =>
    promotionApplicabilityIssues({
      type: this.data().type,
      productTargetCount: this.data().productTargetCount,
      categoryTargetCount: this.data().categoryTargetCount,
      hasCoupon: this.data().hasCoupon,
    }),
  );

  protected readonly canApply = computed(() => this.applicabilityIssueKeys().length === 0);

  protected readonly infoNoteKey = computed(() => promotionInfoNoteKey(this.data().type));

  protected readonly scopeKey = computed(() => scopeLabelKey(this.data().type));

  protected readonly discountText = computed(() => {
    const d = this.data();
    return discountPreviewText(d.discountType, d.discountValue);
  });

  protected readonly schedule = computed(() => {
    const d = this.data();
    return scheduleStatus(d.startDateUtc, d.endDateUtc);
  });

  protected readonly restrictions = computed(() =>
    this.data().conditions.filter((c) => RESTRICTION_TYPES.has(c.type)),
  );

  protected readonly usageLimits = computed(() =>
    this.data().conditions.filter((c) => USAGE_LIMIT_TYPES.has(c.type)),
  );

  protected readonly targetSummaryKey = computed(() => {
    const d = this.data();
    if (d.productTargetCount === 0 && d.categoryTargetCount === 0) {
      return 'ADMIN.PROMOTIONS.SUMMARY.NO_TARGETS';
    }
    return 'ADMIN.PROMOTIONS.SUMMARY.HAS_TARGETS';
  });

  protected conditionLabelKey(condition: PromotionConditionDto): string {
    return `ADMIN.PROMOTIONS.CONDITION_TYPE.${condition.type.toUpperCase()}`;
  }
}

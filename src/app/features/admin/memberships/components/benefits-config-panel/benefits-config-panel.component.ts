import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import {
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
  ProductPickerComponent,
  ThemePickerComponent,
} from '../../../../../shared/components/admin';
import {
  getMembershipBenefitStatusLabelKey,
  getMembershipBenefitStatusTone,
  getMembershipBenefitTypeMeta,
  MEMBERSHIP_BENEFIT_TYPE_META,
  MEMBERSHIP_FEATURE_FLAGS,
  MembershipBenefitTypeMeta,
} from '../../../../../shared/utils/membership-benefit.util';
import { MembershipBenefitDto } from '../../models/membership-api.model';

/** Feature Flags are edited as their own multiselect, not through the generic Type+Value row editor. */
const ROW_EDITABLE_TYPES = MEMBERSHIP_BENEFIT_TYPE_META.filter((meta) => meta.value !== 'FeatureFlag');

@Component({
  selector: 'app-benefits-config-panel',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputNumberModule,
    MultiSelectModule,
    SelectModule,
    ToggleSwitchModule,
    AdminSectionCardComponent,
    AdminIconButtonComponent,
    AdminEmptyStateComponent,
    AdminStatusBadgeComponent,
    ProductPickerComponent,
    ThemePickerComponent,
  ],
  templateUrl: './benefits-config-panel.component.html',
  styleUrl: './benefits-config-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitsConfigPanelComponent {
  readonly benefits = input.required<readonly MembershipBenefitDto[]>();
  readonly disabled = input(false);
  readonly benefitsChange = output<MembershipBenefitDto[]>();

  /** Plan-level structured data for the ExclusiveProducts / ThemeUnlock benefits — these live
   * outside the benefit's Value string (a single product/theme id wouldn't fit a "one or more"
   * relationship), backed by MembershipPlanDetailDto.exclusiveProductIds / unlockedThemeIds. */
  readonly exclusiveProductIds = input<readonly string[]>([]);
  readonly exclusiveProductIdsChange = output<readonly string[]>();
  readonly unlockedThemeIds = input<readonly string[]>([]);
  readonly unlockedThemeIdsChange = output<readonly string[]>();

  protected readonly typeOptions = ROW_EDITABLE_TYPES.map((meta) => ({
    label: meta.label,
    value: meta.value,
  }));

  protected readonly featureFlagOptions = [...MEMBERSHIP_FEATURE_FLAGS];

  protected readonly selectedFeatureFlags = computed(() =>
    this.benefits()
      .filter((b) => b.type === 'FeatureFlag')
      .map((b) => b.displayName),
  );

  protected sortedBenefits(benefits: readonly MembershipBenefitDto[]): MembershipBenefitDto[] {
    return [...benefits].filter((b) => b.type !== 'FeatureFlag').sort((a, b) => a.sortOrder - b.sortOrder);
  }

  protected findIndex(benefits: readonly MembershipBenefitDto[], target: MembershipBenefitDto): number {
    return benefits.findIndex(
      (benefit) =>
        benefit.type === target.type &&
        benefit.value === target.value &&
        benefit.displayName === target.displayName &&
        benefit.sortOrder === target.sortOrder,
    );
  }

  protected metaFor(type: string): MembershipBenefitTypeMeta | null {
    return getMembershipBenefitTypeMeta(type);
  }

  protected statusTone(type: string) {
    return getMembershipBenefitStatusTone(this.metaFor(type)?.status ?? 'enforced');
  }

  protected statusLabel(type: string): string {
    return getMembershipBenefitStatusLabelKey(this.metaFor(type)?.status ?? 'enforced');
  }

  protected numericValue(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  protected booleanValue(value: string): boolean {
    return value === 'true';
  }

  protected addBenefit(): void {
    const current = [...this.benefits()];
    const nextOrder = current.length;
    this.benefitsChange.emit([
      ...current,
      {
        type: 'DiscountPercentage',
        value: '10',
        displayName: 'Member discount',
        sortOrder: nextOrder,
      },
    ]);
  }

  protected removeBenefit(index: number): void {
    const removed = this.benefits()[index];
    const updated = this.benefits()
      .filter((_, i) => i !== index)
      .map((benefit, sortOrder) => ({ ...benefit, sortOrder }));
    this.benefitsChange.emit(updated);

    if (removed?.type === 'ExclusiveProducts') {
      this.exclusiveProductIdsChange.emit([]);
    }
    if (removed?.type === 'ThemeUnlock') {
      this.unlockedThemeIdsChange.emit([]);
    }
  }

  protected updateBenefit(index: number, patch: Partial<MembershipBenefitDto>): void {
    const updated = this.benefits().map((benefit, i) =>
      i === index ? { ...benefit, ...patch } : benefit,
    );
    this.benefitsChange.emit(updated);
  }

  protected onTypeChange(index: number, type: string): void {
    const meta = this.metaFor(type);
    const defaultValue = meta?.valueKind === 'boolean' ? 'true' : meta?.valueKind === 'percentage' ? '0' : '1';
    this.updateBenefit(index, { type, value: defaultValue });
  }

  protected onFeatureFlagsChange(selectedKeys: readonly string[]): void {
    const nonFlagBenefits = this.benefits().filter((b) => b.type !== 'FeatureFlag');
    const flagBenefits: MembershipBenefitDto[] = selectedKeys.map((key, i) => ({
      type: 'FeatureFlag',
      value: 'true',
      displayName: key,
      sortOrder: nonFlagBenefits.length + i,
    }));
    this.benefitsChange.emit([...nonFlagBenefits, ...flagBenefits]);
  }

  protected moveBenefit(index: number, direction: -1 | 1): void {
    const items = this.sortedBenefits(this.benefits());
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const currentIndex = this.findIndex(this.benefits(), items[index]);
    const swapIndex = this.findIndex(this.benefits(), items[targetIndex]);
    if (currentIndex < 0 || swapIndex < 0) {
      return;
    }

    const updated = [...this.benefits()];
    const temp = updated[currentIndex];
    updated[currentIndex] = { ...updated[swapIndex], sortOrder: updated[currentIndex].sortOrder };
    updated[swapIndex] = { ...temp, sortOrder: updated[swapIndex].sortOrder };
    this.benefitsChange.emit(updated);
  }
}

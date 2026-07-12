import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  AdminEmptyStateComponent,
  AdminIconButtonComponent,
  AdminSectionCardComponent,
} from '../../../../../shared/components/admin';
import {
  MEMBERSHIP_BENEFIT_TYPE_OPTIONS,
  MembershipBenefitDto,
} from '../../models/membership-api.model';

@Component({
  selector: 'app-benefits-config-panel',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    AdminSectionCardComponent,
    AdminIconButtonComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './benefits-config-panel.component.html',
  styleUrl: './benefits-config-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitsConfigPanelComponent {
  readonly benefits = input.required<readonly MembershipBenefitDto[]>();
  readonly disabled = input(false);
  readonly benefitsChange = output<MembershipBenefitDto[]>();

  protected readonly typeOptions = [...MEMBERSHIP_BENEFIT_TYPE_OPTIONS];

  protected sortedBenefits(benefits: readonly MembershipBenefitDto[]): MembershipBenefitDto[] {
    return [...benefits].sort((a, b) => a.sortOrder - b.sortOrder);
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
    const updated = this.benefits()
      .filter((_, i) => i !== index)
      .map((benefit, sortOrder) => ({ ...benefit, sortOrder }));
    this.benefitsChange.emit(updated);
  }

  protected updateBenefit(index: number, patch: Partial<MembershipBenefitDto>): void {
    const updated = this.benefits().map((benefit, i) =>
      i === index ? { ...benefit, ...patch } : benefit,
    );
    this.benefitsChange.emit(updated);
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

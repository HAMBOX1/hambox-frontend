import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminDataTableShellComponent,
  AdminEmptyStateComponent,
  AdminSectionCardComponent,
  AdminStatusBadgeComponent,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { CouponCodeDto } from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';

@Component({
  selector: 'app-promotion-coupons-panel',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
    AdminDataTableShellComponent,
    AdminStatusBadgeComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: './promotion-coupons-panel.component.html',
  styleUrl: './promotion-coupons-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionCouponsPanelComponent {
  private readonly facade = inject(PromotionManagementFacade);
  private readonly messageService = inject(MessageService);

  readonly promotionId = input.required<string>();
  readonly coupons = input.required<readonly CouponCodeDto[]>();

  protected readonly permissions = PERMISSIONS;
  protected readonly actionLoading = this.facade.actionLoading;

  protected readonly generateDialogOpen = signal(false);
  protected readonly customDialogOpen = signal(false);

  protected readonly generateCount = signal(10);
  protected readonly generatePrefix = signal('');
  protected readonly generateSingleUse = signal(true);
  protected readonly generateMaxUses = signal<number | null>(null);
  protected readonly generatePerUserMax = signal<number | null>(null);
  protected readonly generateExpires = signal('');

  protected readonly customCode = signal('');
  protected readonly customSingleUse = signal(false);
  protected readonly customMaxUses = signal<number | null>(null);
  protected readonly customPerUserMax = signal<number | null>(null);
  protected readonly customExpires = signal('');

  protected async confirmGenerate(): Promise<void> {
    const success = await this.facade.generateCoupons(this.promotionId(), {
      count: this.generateCount(),
      prefix: this.generatePrefix().trim() || null,
      isSingleUse: this.generateSingleUse(),
      maxUses: this.generateMaxUses(),
      perUserMaxUses: this.generatePerUserMax(),
      expiresOnUtc: this.customExpiresToIso(this.generateExpires()),
    });

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Coupons generated',
        life: 4000,
      });
      this.generateDialogOpen.set(false);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Generation failed',
      detail: this.facade.promotionsError() ?? 'Unable to generate coupons.',
      life: 5000,
    });
  }

  protected async confirmCustomCoupon(): Promise<void> {
    const code = this.customCode().trim();
    if (!code) {
      return;
    }

    const success = await this.facade.createCoupon(this.promotionId(), {
      code,
      isSingleUse: this.customSingleUse(),
      maxUses: this.customMaxUses(),
      perUserMaxUses: this.customPerUserMax(),
      expiresOnUtc: this.customExpiresToIso(this.customExpires()),
    });

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Coupon created',
        life: 4000,
      });
      this.customDialogOpen.set(false);
      this.customCode.set('');
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Create failed',
      detail: this.facade.promotionsError() ?? 'Unable to create coupon.',
      life: 5000,
    });
  }

  private customExpiresToIso(value: string): string | null {
    if (!value.trim()) {
      return null;
    }
    return new Date(value).toISOString();
  }
}

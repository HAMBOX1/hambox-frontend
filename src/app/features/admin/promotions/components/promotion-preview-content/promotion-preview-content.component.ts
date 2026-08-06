import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { PERMISSIONS } from '../../../../../core/permissions/permission.constants';
import {
  AdminLoadingSkeletonComponent,
  AdminStatusBadgeComponent,
  AdminStatusTone,
} from '../../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { HamboxDatePipe } from '../../../../../shared/pipes/hambox-date.pipe';
import { PromotionDetailDto, PromotionListItemDto } from '../../models/promotion-api.model';
import { discountPreviewText, scopeLabelKey } from '../../utils/promotion-display.util';

@Component({
  selector: 'app-promotion-preview-content',
  standalone: true,
  imports: [
    TranslatePipe,
    HamboxDatePipe,
    HasPermissionDirective,
    AdminStatusBadgeComponent,
    AdminLoadingSkeletonComponent,
  ],
  templateUrl: './promotion-preview-content.component.html',
  styleUrl: './promotion-preview-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionPreviewContentComponent {
  readonly promotion = input<PromotionListItemDto | null>(null);
  readonly detail = input<PromotionDetailDto | null>(null);
  readonly detailLoading = input(false);

  readonly editRequested = output<void>();
  readonly duplicateRequested = output<void>();
  readonly publishRequested = output<void>();
  readonly activateRequested = output<void>();
  readonly deactivateRequested = output<void>();
  readonly archiveRequested = output<void>();

  protected readonly permissions = PERMISSIONS;

  protected readonly scopeKey = computed(() => {
    const promo = this.promotion();
    return promo ? scopeLabelKey(promo.type) : '';
  });

  protected readonly discountText = computed(() => {
    const promo = this.promotion();
    if (!promo) {
      return '';
    }
    return discountPreviewText(promo.discountType, promo.discountValue);
  });

  protected statusTone(status: string): AdminStatusTone {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Draft':
        return 'info';
      case 'Inactive':
        return 'warning';
      case 'Archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected primaryAction(status: string): 'publish' | 'activate' | 'deactivate' | null {
    switch (status) {
      case 'Draft':
        return 'publish';
      case 'Inactive':
        return 'activate';
      case 'Active':
        return 'deactivate';
      default:
        return null;
    }
  }

  protected runPrimaryAction(status: string): void {
    switch (this.primaryAction(status)) {
      case 'publish':
        this.publishRequested.emit();
        break;
      case 'activate':
        this.activateRequested.emit();
        break;
      case 'deactivate':
        this.deactivateRequested.emit();
        break;
    }
  }

  protected primaryActionIcon(status: string): string {
    switch (this.primaryAction(status)) {
      case 'publish':
        return 'pi pi-send';
      case 'activate':
        return 'pi pi-play';
      case 'deactivate':
        return 'pi pi-pause';
      default:
        return 'pi pi-check';
    }
  }
}

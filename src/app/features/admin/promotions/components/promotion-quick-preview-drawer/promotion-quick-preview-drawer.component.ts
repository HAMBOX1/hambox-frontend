import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';

import { MobileViewportService } from '../../../../../shared/services/mobile-viewport.service';
import { HamboxBottomSheetComponent } from '../../../../../shared/components/hambox-bottom-sheet/hambox-bottom-sheet.component';
import { PromotionListItemDto } from '../../models/promotion-api.model';
import { PromotionManagementFacade } from '../../services/promotion-management.facade';
import { PromotionPreviewContentComponent } from '../promotion-preview-content/promotion-preview-content.component';

/** Desktop: right-side p-drawer (same pattern as the Roles quick preview). Mobile: bottom sheet.
 * Both wrap the same `PromotionPreviewContentComponent` template via ngTemplateOutlet. Reuses the
 * host page's existing `PromotionManagementFacade` instance and its `loadDetail`/`detail` signal. */
@Component({
  selector: 'app-promotion-quick-preview-drawer',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    DrawerModule,
    HamboxBottomSheetComponent,
    PromotionPreviewContentComponent,
  ],
  templateUrl: './promotion-quick-preview-drawer.component.html',
  styleUrl: './promotion-quick-preview-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionQuickPreviewDrawerComponent {
  private readonly facade = inject(PromotionManagementFacade);
  protected readonly mobileViewport = inject(MobileViewportService);

  readonly promotion = input<PromotionListItemDto | null>(null);

  readonly closed = output<void>();
  readonly editRequested = output<PromotionListItemDto>();
  readonly duplicateRequested = output<PromotionListItemDto>();
  readonly publishRequested = output<PromotionListItemDto>();
  readonly activateRequested = output<PromotionListItemDto>();
  readonly deactivateRequested = output<PromotionListItemDto>();
  readonly archiveRequested = output<PromotionListItemDto>();

  protected readonly detail = this.facade.detail;
  protected readonly detailLoading = this.facade.detailLoading;

  constructor() {
    effect(() => {
      const promotion = this.promotion();
      if (!promotion) {
        return;
      }

      void this.facade.loadDetail(promotion.id);
    });
  }

  protected title(): string {
    return this.promotion()?.name ?? '';
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closed.emit();
    }
  }

  protected onEdit(): void {
    const promotion = this.promotion();
    if (promotion) {
      this.editRequested.emit(promotion);
    }
  }

  protected onDuplicate(): void {
    const promotion = this.promotion();
    if (promotion) {
      this.duplicateRequested.emit(promotion);
    }
  }

  protected onPublish(): void {
    const promotion = this.promotion();
    if (promotion) {
      this.publishRequested.emit(promotion);
    }
  }

  protected onActivate(): void {
    const promotion = this.promotion();
    if (promotion) {
      this.activateRequested.emit(promotion);
    }
  }

  protected onDeactivate(): void {
    const promotion = this.promotion();
    if (promotion) {
      this.deactivateRequested.emit(promotion);
    }
  }

  protected onArchive(): void {
    const promotion = this.promotion();
    if (promotion) {
      this.archiveRequested.emit(promotion);
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { AdminStatusBadgeComponent } from '../../../../shared/components/admin';
import { VariantUsageCategoryDto, VariantUsageDto } from '../../models/inventory-api.model';

/** Maps the backend's stable machine key to a translation key suffix under ADMIN.VARIANT_USAGE.ITEMS. */
const ITEM_TRANSLATION_KEYS: Record<string, string> = {
  ActiveReservations: 'ACTIVE_RESERVATIONS',
  AvailableInventoryCodes: 'AVAILABLE_INVENTORY_CODES',
  DisabledInventoryCodes: 'DISABLED_INVENTORY_CODES',
  CartItems: 'CART_ITEMS',
  InventoryBatches: 'INVENTORY_BATCHES',
  InventoryAuditLogReferences: 'INVENTORY_AUDIT_LOG_REFERENCES',
  SoldInventoryCodes: 'SOLD_INVENTORY_CODES',
  OtherProtectedInventoryCodes: 'OTHER_PROTECTED_INVENTORY_CODES',
  OrderItems: 'ORDER_ITEMS',
  OrderLicenseKeys: 'ORDER_LICENSE_KEYS',
};

interface DisplayItem {
  readonly key: string;
  readonly count: number;
}

@Component({
  selector: 'app-product-variant-usage-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, TranslatePipe, AdminStatusBadgeComponent],
  templateUrl: './product-variant-usage-dialog.component.html',
  styleUrl: './product-variant-usage-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantUsageDialogComponent {
  readonly visible = input(false);
  readonly variantSku = input<string>('');
  readonly usage = input<VariantUsageDto | null>(null);
  readonly cleanupLoading = input(false);
  readonly archiveLoading = input(false);
  readonly deleteLoading = input(false);

  readonly visibleChange = output<boolean>();
  readonly cleanupRequested = output<void>();
  readonly archiveRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly safeToRemoveItems = computed(() => this.toDisplayItems(this.usage()?.safeToRemove));
  protected readonly safeToDetachItems = computed(() => this.toDisplayItems(this.usage()?.safeToDetach));
  protected readonly protectedHistoryItems = computed(() => this.toDisplayItems(this.usage()?.protectedHistory));

  protected readonly hasRemovableUsage = computed(() => (this.usage()?.safeToRemove.totalCount ?? 0) > 0);
  protected readonly hasProtectedUsage = computed(() => (this.usage()?.protectedHistory.totalCount ?? 0) > 0);
  protected readonly canDeletePermanently = computed(() => this.usage()?.canPermanentlyDelete ?? false);

  protected readonly anyLoading = computed(
    () => this.cleanupLoading() || this.archiveLoading() || this.deleteLoading(),
  );

  protected translationKeyFor(type: string): string {
    const suffix = ITEM_TRANSLATION_KEYS[type] ?? type;
    return `ADMIN.VARIANT_USAGE.ITEMS.${suffix}`;
  }

  protected onHide(): void {
    this.visibleChange.emit(false);
  }

  private toDisplayItems(category: VariantUsageCategoryDto | undefined): readonly DisplayItem[] {
    if (!category) {
      return [];
    }

    return category.items
      .filter((item) => item.count > 0)
      .map((item) => ({ key: item.type, count: item.count }));
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

import { ProductVariantDto } from '../../models/inventory-api.model';
import { ProductInstructionsPanelComponent } from '../product-instructions-panel/product-instructions-panel.component';

/**
 * Thin dialog wrapper around `ProductInstructionsPanelComponent`, scoped to one variant instead of
 * the whole product. Opened from a variant row's "Instructions" icon — see `VariantTreeCallbacks.editInstructions`.
 * Reuses the product-level editor as-is (autosave/preview/publish) rather than building a second editor,
 * since the only difference is which `variantId` gets threaded through to the API.
 */
@Component({
  selector: 'app-variant-instructions-dialog',
  standalone: true,
  imports: [DialogModule, ProductInstructionsPanelComponent],
  templateUrl: './variant-instructions-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantInstructionsDialogComponent {
  readonly visible = input(false);
  readonly productId = input.required<string>();
  readonly variant = input<ProductVariantDto | null>(null);

  readonly visibleChange = output<boolean>();

  protected readonly header = computed(() => {
    const sku = this.variant()?.sku;
    return sku ? `Instructions — ${sku}` : 'Instructions';
  });

  protected onVisibleChange(visible: boolean): void {
    this.visibleChange.emit(visible);
  }
}

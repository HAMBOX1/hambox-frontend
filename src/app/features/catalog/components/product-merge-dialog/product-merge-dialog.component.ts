import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TranslatePipe } from '@ngx-translate/core';

import { Product } from '../../models/product.model';

export interface ProductMergeConfirmEvent {
  readonly targetProductId: string;
  readonly sourceProductIds: readonly string[];
  readonly confirmStockLoss: boolean;
}

/**
 * Lets the admin pick which of the currently bulk-selected products stays as the parent; every
 * other selected product becomes a variant of it (see `ProductCatalogFacade.mergeProducts`).
 * `needsStockLossConfirmation` is set by the caller after a first attempt comes back from the
 * backend with `Products.MergeStockLossRequiresConfirmation` — the dialog stays open and surfaces
 * the warning + checkbox rather than the caller re-opening a fresh dialog.
 */
@Component({
  selector: 'app-product-merge-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, CheckboxModule, DialogModule, RadioButtonModule, TranslatePipe],
  templateUrl: './product-merge-dialog.component.html',
  styleUrl: './product-merge-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductMergeDialogComponent {
  readonly visible = input(false);
  readonly products = input<readonly Product[]>([]);
  readonly loading = input(false);
  readonly needsStockLossConfirmation = input(false);

  readonly visibleChange = output<boolean>();
  readonly confirmed = output<ProductMergeConfirmEvent>();

  protected readonly targetProductId = signal<string | null>(null);
  protected readonly stockLossAcknowledged = signal(false);

  protected readonly sourceProducts = computed(() => {
    const targetId = this.targetProductId();
    return this.products().filter((product) => product.id !== targetId);
  });

  /** Re-picks a default parent (first selected product) every time the dialog opens with a fresh
   * selection — `stockLossAcknowledged` is deliberately NOT reset here so a re-confirm round trip
   * (see class doc) keeps the checkbox state the caller is reacting to. */
  protected onDialogShow(): void {
    const current = this.targetProductId();
    const stillSelected = current !== null && this.products().some((product) => product.id === current);
    if (!stillSelected) {
      this.targetProductId.set(this.products()[0]?.id ?? null);
    }
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.stockLossAcknowledged.set(false);
    }
    this.visibleChange.emit(visible);
  }

  protected selectTarget(productId: string): void {
    this.targetProductId.set(productId);
  }

  protected confirm(): void {
    const targetProductId = this.targetProductId();
    if (!targetProductId) {
      return;
    }

    this.confirmed.emit({
      targetProductId,
      sourceProductIds: this.sourceProducts().map((product) => product.id),
      confirmStockLoss: this.stockLossAcknowledged(),
    });
  }
}

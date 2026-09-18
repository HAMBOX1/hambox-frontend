import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TranslatePipe } from '@ngx-translate/core';

import { CategoryOption } from '../../models/category.model';
import { CreateProductRequest, Product } from '../../models/product.model';

export type ProductMergeMode = 'merge' | 'pending';
export type ProductMergeTargetKind = 'existing' | 'new';

/** Either one of the bulk-selected products (today's behavior) or a brand-new product to create
 * as the parent — see `ProductCatalogFacade.createProduct`. */
export type ProductMergeTarget =
  | { readonly kind: 'existing'; readonly productId: string }
  | { readonly kind: 'new'; readonly request: CreateProductRequest };

export interface ProductMergeConfirmEvent {
  readonly target: ProductMergeTarget;
  readonly sourceProductIds: readonly string[];
  readonly confirmStockLoss: boolean;
  /** 'merge' runs the immediate merge (today's behavior); 'pending' just parks every source as a
   * pending merge into the target — see `ProductCatalogFacade.setPendingMergeForSelection`. */
  readonly mode: ProductMergeMode;
}

/**
 * Lets the admin pick which of the currently bulk-selected products stays as the parent; every
 * other selected product either becomes a variant of it right away, or is parked as a pending
 * merge for later (see `ProductCatalogFacade.mergeProducts` / `setPendingMergeForSelection`).
 * `needsStockLossConfirmation` is set by the caller after a first attempt comes back from the
 * backend with `Products.MergeStockLossRequiresConfirmation` — the dialog stays open and surfaces
 * the warning + checkbox rather than the caller re-opening a fresh dialog. Only relevant in 'merge'
 * mode — parking as pending never touches stock, so 'pending' mode never shows it.
 */
@Component({
  selector: 'app-product-merge-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    RadioButtonModule,
    SelectModule,
    TranslatePipe,
  ],
  templateUrl: './product-merge-dialog.component.html',
  styleUrl: './product-merge-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductMergeDialogComponent {
  readonly visible = input(false);
  readonly products = input<readonly Product[]>([]);
  readonly loading = input(false);
  readonly needsStockLossConfirmation = input(false);
  readonly categoryOptions = input<readonly CategoryOption[]>([]);

  readonly visibleChange = output<boolean>();
  readonly confirmed = output<ProductMergeConfirmEvent>();

  protected readonly targetProductId = signal<string | null>(null);
  protected readonly stockLossAcknowledged = signal(false);
  protected readonly mode = signal<ProductMergeMode>('merge');
  protected readonly targetKind = signal<ProductMergeTargetKind>('existing');
  protected readonly newProductNameEn = signal('');
  protected readonly newProductCategoryId = signal<string | null>(null);
  protected readonly newProductPrice = signal<number | null>(null);

  /** Every selected product becomes a source when creating a brand-new parent; otherwise every
   * selected product except the chosen existing parent. */
  protected readonly sourceProducts = computed(() => {
    if (this.targetKind() === 'new') {
      return this.products();
    }

    const targetId = this.targetProductId();
    return this.products().filter((product) => product.id !== targetId);
  });

  protected readonly canConfirm = computed(() => {
    if (this.targetKind() === 'new') {
      return (
        this.newProductNameEn().trim().length > 0 &&
        this.newProductCategoryId() !== null &&
        this.newProductPrice() !== null
      );
    }

    return this.targetProductId() !== null;
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
      this.mode.set('merge');
      this.targetKind.set('existing');
      this.newProductNameEn.set('');
      this.newProductCategoryId.set(null);
      this.newProductPrice.set(null);
    }
    this.visibleChange.emit(visible);
  }

  protected selectTarget(productId: string): void {
    this.targetProductId.set(productId);
  }

  protected selectMode(mode: ProductMergeMode): void {
    this.mode.set(mode);
  }

  protected selectTargetKind(kind: ProductMergeTargetKind): void {
    this.targetKind.set(kind);
  }

  protected confirm(): void {
    if (!this.canConfirm()) {
      return;
    }

    const target: ProductMergeTarget =
      this.targetKind() === 'new'
        ? {
            kind: 'new',
            request: {
              nameEn: this.newProductNameEn().trim(),
              nameAr: '',
              descriptionEn: '',
              descriptionAr: '',
              price: this.newProductPrice() ?? 0,
              categoryId: this.newProductCategoryId()!,
            },
          }
        : { kind: 'existing', productId: this.targetProductId()! };

    this.confirmed.emit({
      target,
      sourceProductIds: this.sourceProducts().map((product) => product.id),
      confirmStockLoss: this.mode() === 'merge' && this.stockLossAcknowledged(),
      mode: this.mode(),
    });
  }
}

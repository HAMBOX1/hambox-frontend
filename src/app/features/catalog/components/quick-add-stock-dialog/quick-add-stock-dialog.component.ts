import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { ImportCodesResultDto, ProductVariantDto } from '../../models/inventory-api.model';
import { Product } from '../../models/product.model';
import { InventoryApiService } from '../../services/inventory-api.service';

interface VariantChoice {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
}

/**
 * Add stock straight from the products list: pick the variant (pre-selected when there is only one), paste the
 * codes and press Add — no trip to the product editor, no batch to name. The batch the backend requires is
 * created behind the scenes, exactly as the editor's own import does when nothing is grouped.
 */
@Component({
  selector: 'app-quick-add-stock-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule, SelectModule],
  templateUrl: './quick-add-stock-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddStockDialogComponent {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly router = inject(Router);

  /** The product to add stock to; `null` keeps the dialog closed. */
  readonly product = input<Product | null>(null);

  readonly closed = output<void>();
  /** Fired after codes were stored, so the list can refresh its stock figures. */
  readonly stockAdded = output<void>();

  protected readonly variants = signal<readonly ProductVariantDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly variantId = signal<string | null>(null);
  protected readonly codesText = signal('');
  protected readonly multiLine = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ImportCodesResultDto | null>(null);

  protected readonly choices = computed<VariantChoice[]>(() =>
    this.variants().map((variant) => ({
      label: `${variant.sku} — ${variant.fulfillmentMode === 'ChatDelivery' ? 'On-Delivery' : `${variant.availableStock} in stock`}`,
      value: variant.id,
      disabled: variant.fulfillmentMode === 'ChatDelivery',
    })),
  );

  protected readonly selectedVariant = computed(() => this.variants().find((v) => v.id === this.variantId()) ?? null);

  protected readonly codeCount = computed(() => {
    const raw = this.codesText().trim();
    if (!raw) {
      return 0;
    }
    return this.multiLine() ? 1 : raw.split(/\r?\n/).filter((line) => line.trim()).length;
  });

  constructor() {
    effect(() => {
      const product = this.product();
      this.variants.set([]);
      this.variantId.set(null);
      this.codesText.set('');
      this.multiLine.set(false);
      this.error.set(null);
      this.result.set(null);
      if (product) {
        void this.loadVariants(product.id);
      }
    });
  }

  protected openEditor(): void {
    const product = this.product();
    this.closed.emit();
    if (product) {
      void this.router.navigate(['/admin/products', product.id, 'edit'], { fragment: 'variants' });
    }
  }

  protected async add(): Promise<void> {
    const variant = this.selectedVariant();
    const raw = this.codesText().trim();
    if (!variant || !raw || this.saving()) {
      return;
    }

    const codes = this.multiLine()
      ? [raw.split(/\r?\n/).map((line) => line.trimEnd()).join('\n').trim()]
      : raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    this.saving.set(true);
    this.error.set(null);
    try {
      const batchId = await firstValueFrom(
        this.inventoryApi.createBatch(variant.id, {
          name: `Import ${new Date().toISOString()}`,
          currency: 'USD',
          purchaseCost: 0,
        }),
      );
      const result = await firstValueFrom(this.inventoryApi.importCodes(variant.id, batchId, { codes, note: null }));
      this.result.set(result);
      this.codesText.set('');
      this.stockAdded.emit();
      await this.loadVariants(variant.productId, variant.id);
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not add the stock. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadVariants(productId: string, keepSelected?: string): Promise<void> {
    this.loading.set(true);
    try {
      const variants = await firstValueFrom(this.inventoryApi.getProductVariants(productId));
      this.variants.set(variants);
      const usable = variants.filter((v) => v.fulfillmentMode !== 'ChatDelivery');
      const keep = keepSelected && usable.some((v) => v.id === keepSelected) ? keepSelected : null;
      this.variantId.set(keep ?? (usable.length === 1 ? usable[0].id : null));
    } catch {
      this.error.set('Could not load this product\'s variants.');
    } finally {
      this.loading.set(false);
    }
  }
}

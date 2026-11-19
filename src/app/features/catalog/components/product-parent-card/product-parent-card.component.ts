import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { AdminSectionCardComponent } from '../../../../shared/components/admin';
import { ProductApiService } from '../../services/product-api.service';

/**
 * "Parent product" switch. A parent is only a doorway to its variants: on the store its card shows "From <lowest variant
 * price>" and an Explore options button instead of its own price, stock and Add to cart, and it never reads as out of stock.
 * Turning it on or off changes how the product is presented only; its variants, prices and stock are not touched.
 */
@Component({
  selector: 'app-product-parent-card',
  standalone: true,
  imports: [FormsModule, CheckboxModule, ToastModule, AdminSectionCardComponent],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast position="top-right" />
    <app-admin-section-card title="Parent product" description="For a product that only groups options (platform, region, duration...), such as a membership with many variants." [compact]="true">
      @if (!productId()) {
        <p class="parent-card__hint">Save the product first.</p>
      } @else {
        <label class="parent-card__row">
          <p-checkbox [binary]="true" [ngModel]="isParent()" [disabled]="saving()" (ngModelChange)="toggle($event)" />
          <span>This is a parent product</span>
        </label>
        <p class="parent-card__hint">
          On the store it shows the lowest variant price and an "Explore options" button instead of its own price, stock and
          Add to cart, and never shows as out of stock. Its variants are not affected.
        </p>
      }
    </app-admin-section-card>
  `,
  styles: `
    .parent-card__row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 600;
    }

    .parent-card__hint {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }
  `,
})
export class ProductParentCardComponent {
  private readonly productApi = inject(ProductApiService);
  private readonly messages = inject(MessageService);

  readonly productId = input<string | null>(null);
  /** What the product currently has saved. */
  readonly value = input(false);

  protected readonly isParent = signal(false);
  protected readonly saving = signal(false);

  constructor() {
    effect(() => this.isParent.set(this.value()));
  }

  protected async toggle(next: boolean): Promise<void> {
    const productId = this.productId();
    if (!productId || this.saving()) {
      return;
    }

    const previous = this.isParent();
    this.isParent.set(next);
    this.saving.set(true);
    try {
      await firstValueFrom(this.productApi.setParentProduct(productId, next));
      this.messages.add({ severity: 'success', summary: next ? 'Marked as a parent product' : 'Back to a normal product', life: 3000 });
    } catch (error) {
      this.isParent.set(previous);
      this.messages.add({
        severity: 'error',
        summary: error instanceof ApiError && error.message ? error.message : 'Could not save. Please try again.',
        life: 5000,
      });
    } finally {
      this.saving.set(false);
    }
  }
}

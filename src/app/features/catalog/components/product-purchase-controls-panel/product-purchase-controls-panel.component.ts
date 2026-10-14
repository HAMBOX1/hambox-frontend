import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../../../../core/api/api-client.service';
import { CATALOG_API } from '../../../../core/api/api-endpoints';
import { PERMISSIONS } from '../../../../core/permissions/permission.constants';
import { AdminSectionCardComponent } from '../../../../shared/components/admin';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ProductEditorFacade } from '../../services/product-editor.facade';

interface ProductPurchaseControls {
  readonly maxQuantityPerOrder: number | null;
  readonly maxQuantityPerUserPerDay: number | null;
  readonly requiresManualReview: boolean;
}

/**
 * Per-product abuse controls (audit R22): the most one order may contain, the most one customer may buy in
 * any rolling 24 hours, and the "sensitive product" flag that parks every paid order for an admin to approve
 * before anything is delivered. All three are enforced server-side at every checkout path.
 */
@Component({
  selector: 'app-product-purchase-controls-panel',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    HasPermissionDirective,
    AdminSectionCardComponent,
  ],
  template: `
    <app-admin-section-card
      title="Purchase limits & review"
      description="Cap how much of this product one customer can buy, and hold sensitive orders for manual approval."
    >
      @if (product(); as current) {
        <div class="purchase-controls">
          <label class="purchase-controls__field">
            <span>Max quantity per order</span>
            <p-inputNumber
              [ngModel]="maxPerOrder()"
              (ngModelChange)="maxPerOrder.set($event)"
              [min]="1"
              [useGrouping]="false"
              placeholder="No limit"
            />
          </label>

          <label class="purchase-controls__field">
            <span>Max quantity per customer / 24 h</span>
            <p-inputNumber
              [ngModel]="maxPerDay()"
              (ngModelChange)="maxPerDay.set($event)"
              [min]="1"
              [useGrouping]="false"
              placeholder="No limit"
            />
          </label>

          <label class="purchase-controls__check">
            <p-checkbox
              [binary]="true"
              [ngModel]="requiresReview()"
              (ngModelChange)="requiresReview.set($event)"
              [inputId]="'review-' + current.id"
            />
            <span>Sensitive product — every paid order waits for manual approval</span>
          </label>

          @if (error()) {
            <p class="purchase-controls__error" role="alert">{{ error() }}</p>
          }

          <div *hamboxHasPermission="permissions.Catalog.Products.Edit">
            <button
              pButton
              type="button"
              label="Save limits"
              icon="pi pi-save"
              [loading]="saving()"
              (click)="save(current.id)"
            ></button>
          </div>
        </div>
      }
    </app-admin-section-card>
  `,
  styles: `
    .purchase-controls {
      display: grid;
      gap: 1rem;
      max-width: 32rem;
    }
    .purchase-controls__field {
      display: grid;
      gap: 0.35rem;
    }
    .purchase-controls__check {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .purchase-controls__error {
      color: var(--p-red-500, #c0392b);
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPurchaseControlsPanelComponent {
  private readonly facade = inject(ProductEditorFacade);
  private readonly api = inject(ApiClientService);

  protected readonly permissions = PERMISSIONS;
  protected readonly product = this.facade.product;
  protected readonly maxPerOrder = signal<number | null>(null);
  protected readonly maxPerDay = signal<number | null>(null);
  protected readonly requiresReview = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const current = this.product();
      if (current) {
        void this.load(current.id);
      }
    });
  }

  private async load(productId: string): Promise<void> {
    try {
      const controls = await firstValueFrom(
        this.api.get<ProductPurchaseControls>(CATALOG_API.productPurchaseControls(productId)),
      );
      this.maxPerOrder.set(controls.maxQuantityPerOrder);
      this.maxPerDay.set(controls.maxQuantityPerUserPerDay);
      this.requiresReview.set(controls.requiresManualReview);
    } catch {
      this.error.set('Could not load the purchase controls.');
    }
  }

  protected async save(productId: string): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.put<void>(CATALOG_API.productPurchaseControls(productId), {
          maxQuantityPerOrder: this.maxPerOrder() || null,
          maxQuantityPerUserPerDay: this.maxPerDay() || null,
          requiresManualReview: this.requiresReview(),
        }),
      );
    } catch {
      this.error.set('Could not save the purchase controls.');
    } finally {
      this.saving.set(false);
    }
  }
}

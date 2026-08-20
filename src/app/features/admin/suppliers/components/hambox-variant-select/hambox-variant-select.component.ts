import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, of, switchMap } from 'rxjs';

import { InventoryApiService } from '../../../../catalog/services/inventory-api.service';
import { ProductVariantDto } from '../../../../catalog/models/inventory-api.model';

/**
 * Single-select variant list for one HAMBOX product — reuses `InventoryApiService.getProductVariants`
 * (the same call the Catalog admin's own variant manager uses), no separate search implementation
 * needed since a product's variant count is always small. `switchMap` cancels any in-flight load if
 * `productId` changes again before it resolves, so a stale response can never land after the admin has
 * already moved to a different product.
 */
@Component({
  selector: 'app-hambox-variant-select',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe],
  templateUrl: './hambox-variant-select.component.html',
  styleUrl: './hambox-variant-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HamboxVariantSelectComponent {
  readonly productId = input<string | null>(null);
  readonly selectedVariantId = input<string | null>(null);
  readonly disabled = input(false);

  readonly selectedChange = output<ProductVariantDto | null>();

  protected readonly variants = signal<readonly ProductVariantDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  private readonly api = inject(InventoryApiService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.productId)
      .pipe(
        distinctUntilChanged(),
        switchMap((productId) => {
          if (!productId) {
            return of<readonly ProductVariantDto[]>([]);
          }

          this.loading.set(true);
          this.error.set(false);
          return this.api.getProductVariants(productId).pipe(
            catchError((err) => {
              console.error('HamboxVariantSelectComponent: load failed', err);
              this.error.set(true);
              return of<readonly ProductVariantDto[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((variants) => {
        this.loading.set(false);
        this.variants.set(variants);
      });
  }

  protected select(variant: ProductVariantDto): void {
    if (!this.disabled()) {
      this.selectedChange.emit(variant);
    }
  }

  protected retry(): void {
    const productId = this.productId();
    if (!productId) {
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getProductVariants(productId)
      .pipe(
        catchError((err) => {
          console.error('HamboxVariantSelectComponent: retry failed', err);
          this.error.set(true);
          return of<readonly ProductVariantDto[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((variants) => {
        this.loading.set(false);
        this.variants.set(variants);
      });
  }
}

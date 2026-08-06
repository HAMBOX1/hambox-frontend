import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { ProductApiService } from '../../../../features/catalog/services/product-api.service';
import { PagedResult } from '../../../../features/catalog/models/category.model';
import { Product } from '../../../../features/catalog/models/product.model';

let nextId = 0;

/**
 * Reusable searchable multi-select over the real catalog (`ProductApiService.getProducts`) — not yet
 * wired into any Page Builder section, since none currently stores a manual product-id list (every
 * product-driven section is `sortMethod`-driven live ranking, see CLAUDE.md §"product config"). Ready
 * for the first section/feature that needs an admin-curated product list.
 */
@Component({
  selector: 'app-product-picker',
  standalone: true,
  imports: [TranslatePipe, InputTextModule, DecimalPipe],
  templateUrl: './product-picker.component.html',
  styleUrl: './product-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPickerComponent {
  readonly value = input<readonly string[]>([]);
  readonly disabled = input(false);
  readonly maxItems = input<number | null>(null);

  readonly valueChange = output<readonly string[]>();

  protected readonly fieldId = `product-picker-${++nextId}`;
  protected readonly query = signal('');
  protected readonly results = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly selectedDetails = signal<Map<string, Product>>(new Map());

  private readonly api = inject(ProductApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  protected readonly atLimit = computed(() => {
    const max = this.maxItems();
    return max !== null && this.value().length >= max;
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        switchMap((term) =>
          this.api.getProducts({ pageNumber: 1, pageSize: 20, searchTerm: term, sortBy: 'Newest' }).pipe(
            catchError((err) => {
              console.error('ProductPickerComponent: search failed', err);
              this.error.set(true);
              return of<PagedResult<Product>>({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.loading.set(false);
        this.results.set([...page.items]);
        this.cacheDetails(page.items);
      });
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.loading.set(true);
    this.error.set(false);
    this.search$.next(value);
  }

  protected isSelected(id: string): boolean {
    return this.value().includes(id);
  }

  protected toggle(product: Product): void {
    if (this.disabled()) {
      return;
    }
    if (this.isSelected(product.id)) {
      this.valueChange.emit(this.value().filter((id) => id !== product.id));
      return;
    }
    if (this.atLimit()) {
      return;
    }
    this.cacheDetails([product]);
    this.valueChange.emit([...this.value(), product.id]);
  }

  protected remove(id: string): void {
    if (!this.disabled()) {
      this.valueChange.emit(this.value().filter((existing) => existing !== id));
    }
  }

  protected clearAll(): void {
    if (!this.disabled()) {
      this.valueChange.emit([]);
    }
  }

  protected detailsFor(id: string): Product | undefined {
    return this.selectedDetails().get(id);
  }

  protected productName(product: Product): string {
    return product.nameEn || product.nameAr;
  }

  private cacheDetails(products: readonly Product[]): void {
    const next = new Map(this.selectedDetails());
    for (const product of products) {
      next.set(product.id, product);
    }
    this.selectedDetails.set(next);
  }
}

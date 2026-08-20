import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { ProductApiService } from '../../../../catalog/services/product-api.service';
import { PagedResult } from '../../../../catalog/models/category.model';
import { Product } from '../../../../catalog/models/product.model';

let nextId = 0;

/**
 * Single-select searchable HAMBOX product picker for the supplier mapping workflow — the admin matches
 * two real products, never pastes a UUID. Reuses `ProductApiService.getProducts` (the same search the
 * generic multi-select `ProductPickerComponent` uses) rather than a second product-search
 * implementation; only the single-select "pick one, show its card" interaction is new, since the
 * existing picker is chip/multi-select and doesn't fit this dialog's one-product-per-mapping shape.
 */
@Component({
  selector: 'app-hambox-product-select',
  standalone: true,
  imports: [TranslatePipe, InputTextModule],
  templateUrl: './hambox-product-select.component.html',
  styleUrl: './hambox-product-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HamboxProductSelectComponent {
  readonly selected = input<Product | null>(null);
  readonly disabled = input(false);

  readonly selectedChange = output<Product | null>();

  protected readonly fieldId = `hambox-product-select-${++nextId}`;
  protected readonly query = signal('');
  protected readonly results = signal<readonly Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly searched = signal(false);

  private readonly api = inject(ProductApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        switchMap((term) =>
          this.api.getProducts({ pageNumber: 1, pageSize: 20, searchTerm: term, sortBy: 'Newest' }).pipe(
            catchError((err) => {
              console.error('HamboxProductSelectComponent: search failed', err);
              this.error.set(true);
              return of<PagedResult<Product>>({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.loading.set(false);
        this.searched.set(true);
        this.results.set(page.items);
      });
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.loading.set(true);
    this.error.set(false);
    this.search$.next(value);
  }

  protected select(product: Product): void {
    if (!this.disabled()) {
      this.selectedChange.emit(product);
    }
  }

  protected clear(): void {
    if (!this.disabled()) {
      this.selectedChange.emit(null);
      this.query.set('');
      this.results.set([]);
      this.searched.set(false);
    }
  }

  protected retry(): void {
    this.onQueryChange(this.query());
  }

  protected productName(product: Product): string {
    return product.nameEn || product.nameAr;
  }
}

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { SupplierCatalogItemDto } from '../../models/supplier.model';
import { SuppliersManagementFacade } from '../../services/suppliers-management.facade';

let nextId = 0;

/**
 * Single-select searchable supplier catalog picker for the mapping workflow. Deliberately generic:
 * it only ever calls `SuppliersManagementFacade.searchCatalog(supplierId, ...)`, which resolves the
 * supplier's own `ISupplierProvider` server-side (Bamboo today, any future provider automatically) —
 * this component has no Bamboo-specific knowledge, no direct Bamboo HTTP call, and never sees a
 * credential. The supplier is already known on this page, so it's a required input, never a picker.
 */
@Component({
  selector: 'app-supplier-catalog-select',
  standalone: true,
  imports: [TranslatePipe, InputTextModule, DecimalPipe],
  templateUrl: './supplier-catalog-select.component.html',
  styleUrl: './supplier-catalog-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierCatalogSelectComponent {
  readonly supplierId = input.required<string>();
  readonly selected = input<SupplierCatalogItemDto | null>(null);
  readonly disabled = input(false);

  readonly selectedChange = output<SupplierCatalogItemDto | null>();

  protected readonly query = signal('');
  protected readonly results = signal<readonly SupplierCatalogItemDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  /** Set when the provider itself reports "no catalog" (e.g. Manual) rather than a transient failure — a different, non-retryable message. */
  protected readonly unsupportedMessage = signal<string | null>(null);

  protected readonly fieldId = `supplier-catalog-select-${++nextId}`;

  private readonly facade = inject(SuppliersManagementFacade);
  private readonly search$ = new Subject<string>();
  /** Bumped on every search kicked off — a response only gets applied if it's still the most recent
   * request, so a slow reply for an old keystroke can never clobber a newer one's results. */
  private searchToken = 0;

  constructor() {
    this.search$.pipe(debounceTime(300)).subscribe((term) => {
      void this.runSearch(term);
    });
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.loading.set(true);
    this.error.set(false);
    this.unsupportedMessage.set(null);
    this.search$.next(value);
  }

  protected select(item: SupplierCatalogItemDto): void {
    if (!this.disabled()) {
      this.selectedChange.emit(item);
    }
  }

  protected clear(): void {
    if (!this.disabled()) {
      this.selectedChange.emit(null);
      this.query.set('');
      this.results.set([]);
    }
  }

  protected retry(): void {
    void this.runSearch(this.query());
  }

  private async runSearch(term: string): Promise<void> {
    const token = ++this.searchToken;
    this.loading.set(true);
    this.error.set(false);
    this.unsupportedMessage.set(null);

    try {
      const result = await this.facade.searchCatalog(this.supplierId(), term);
      if (token !== this.searchToken) {
        return;
      }
      this.loading.set(false);
      if (!result.isSuccess) {
        this.results.set([]);
        this.unsupportedMessage.set(result.message ?? null);
        return;
      }
      this.results.set(result.items);
    } catch (err) {
      if (token !== this.searchToken) {
        return;
      }
      console.error('SupplierCatalogSelectComponent: search failed', err);
      this.loading.set(false);
      this.error.set(true);
      this.results.set([]);
    }
  }
}

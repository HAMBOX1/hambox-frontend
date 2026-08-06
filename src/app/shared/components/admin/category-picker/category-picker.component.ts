import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { CategoryApiService } from '../../../../features/catalog/services/category-api.service';
import { Category, PagedResult } from '../../../../features/catalog/models/category.model';

let nextId = 0;

/**
 * Reusable searchable multi-select chips over the real catalog (`CategoryApiService.getCategories`) —
 * same "built, not yet wired" status as `ProductPickerComponent`: no section config currently stores a
 * manual category-id list.
 */
@Component({
  selector: 'app-category-picker',
  standalone: true,
  imports: [TranslatePipe, InputTextModule],
  templateUrl: './category-picker.component.html',
  styleUrl: './category-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPickerComponent {
  readonly value = input<readonly string[]>([]);
  readonly disabled = input(false);

  readonly valueChange = output<readonly string[]>();

  protected readonly fieldId = `category-picker-${++nextId}`;
  protected readonly query = signal('');
  protected readonly results = signal<Category[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly selectedDetails = signal<Map<string, Category>>(new Map());

  private readonly api = inject(CategoryApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        switchMap((term) =>
          this.api.getCategories({ pageNumber: 1, pageSize: 20, searchTerm: term }).pipe(
            catchError((err) => {
              console.error('CategoryPickerComponent: search failed', err);
              this.error.set(true);
              return of<PagedResult<Category>>({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.loading.set(false);
        this.results.set([...page.items]);
        const next = new Map(this.selectedDetails());
        for (const category of page.items) {
          next.set(category.id, category);
        }
        this.selectedDetails.set(next);
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

  protected toggle(category: Category): void {
    if (this.disabled()) {
      return;
    }
    if (this.isSelected(category.id)) {
      this.valueChange.emit(this.value().filter((id) => id !== category.id));
      return;
    }
    this.valueChange.emit([...this.value(), category.id]);
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

  protected nameFor(id: string): string {
    return this.selectedDetails().get(id)?.nameEn ?? id;
  }
}

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { THEMES_API } from '../../../../core/api/api-endpoints';
import { ApiClientService } from '../../../../core/api/api-client.service';
import { PagedResult } from '../../../../features/catalog/models/category.model';

interface ThemePickerResult {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

let nextId = 0;

/**
 * Searchable multi-select over real Theme Center themes (`GET /api/v1/themes`) — used by the
 * Theme Unlock membership benefit. The first selected theme becomes the plan's primary (highest
 * priority) unlocked theme; mirrors app-product-picker's shape for a consistent editing feel.
 */
@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [TranslatePipe, InputTextModule],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePickerComponent {
  readonly value = input<readonly string[]>([]);
  readonly disabled = input(false);

  readonly valueChange = output<readonly string[]>();

  protected readonly fieldId = `theme-picker-${++nextId}`;
  protected readonly query = signal('');
  protected readonly results = signal<ThemePickerResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly selectedDetails = signal<Map<string, ThemePickerResult>>(new Map());

  private readonly api = inject(ApiClientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        switchMap((term) =>
          this.api
            .get<PagedResult<ThemePickerResult>>(THEMES_API.themes, {
              params: { pageNumber: 1, pageSize: 20, ...(term ? { searchTerm: term } : {}) },
            })
            .pipe(
              catchError((err) => {
                console.error('ThemePickerComponent: search failed', err);
                this.error.set(true);
                return of<PagedResult<ThemePickerResult>>({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
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

  protected toggle(theme: ThemePickerResult): void {
    if (this.disabled()) {
      return;
    }
    if (this.isSelected(theme.id)) {
      this.valueChange.emit(this.value().filter((id) => id !== theme.id));
      return;
    }
    this.cacheDetails([theme]);
    this.valueChange.emit([...this.value(), theme.id]);
  }

  protected remove(id: string): void {
    if (!this.disabled()) {
      this.valueChange.emit(this.value().filter((existing) => existing !== id));
    }
  }

  protected detailsFor(id: string): ThemePickerResult | undefined {
    return this.selectedDetails().get(id);
  }

  private cacheDetails(themes: readonly ThemePickerResult[]): void {
    const next = new Map(this.selectedDetails());
    for (const theme of themes) {
      next.set(theme.id, theme);
    }
    this.selectedDetails.set(next);
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import { VariantCombinationDto } from '../../models/inventory-api.model';
import { InventoryApiService } from '../../services/inventory-api.service';
import { ProductEditorFacade } from '../../services/product-editor.facade';

/**
 * Creates variants on purpose: lists every complete combination of the product's option groups that has no variant yet
 * (one choice from each group, e.g. Region + Type + Duration) and creates only the ones that are ticked. Nothing is created
 * until the admin chooses to, and a half-choice (a combination missing a group) can never be created here.
 */
@Component({
  selector: 'app-variant-combinations-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      header="Create variants"
      [modal]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      appendTo="body"
      [style]="{ width: 'min(46rem, 96vw)' }"
      styleClass="admin-dialog"
    >
      @if (loading()) {
        <p class="vc__hint">Loading the possible combinations…</p>
      } @else if (loadError(); as message) {
        <p class="vc__error" role="alert">{{ message }}</p>
      } @else if (missing().length === 0) {
        <p class="vc__hint">Every combination of this product's options already has a variant. Nothing to create.</p>
      } @else {
        <p class="vc__hint">
          Each line is one complete variant (one choice from every option group). Tick the ones you actually sell; each gets its
          own SKU, price and stock. {{ existingCount() }} already exist.
        </p>

        <div class="vc__toolbar">
          <input pInputText type="search" placeholder="Search (e.g. Ukraine, Essential)" [ngModel]="search()" (ngModelChange)="search.set($event ?? '')" />
          <button pButton type="button" size="small" severity="secondary" [outlined]="true" label="Tick all shown" (click)="tickShown()"></button>
          <button pButton type="button" size="small" severity="secondary" [text]="true" label="Clear" (click)="selected.set(emptySet)"></button>
        </div>

        <ul class="vc__list">
          @for (item of shown(); track keyOf(item)) {
            <li>
              <label class="vc__row">
                <input type="checkbox" [checked]="selected().has(keyOf(item))" (change)="toggle(item, $any($event.target).checked)" />
                <span>{{ item.labels.join('  ·  ') }}</span>
              </label>
            </li>
          } @empty {
            <li class="vc__hint">No combination matches your search.</li>
          }
        </ul>
      }

      @if (error(); as message) {
        <p class="vc__error" role="alert">{{ message }}</p>
      }

      <div class="admin-dialog__actions">
        <button pButton type="button" label="Close" severity="secondary" (click)="visibleChange.emit(false)"></button>
        <button
          pButton
          type="button"
          icon="pi pi-check"
          [label]="'Create ' + selected().size + ' variant' + (selected().size === 1 ? '' : 's')"
          [disabled]="selected().size === 0 || saving()"
          [loading]="saving()"
          (click)="create()"
        ></button>
      </div>
    </p-dialog>
  `,
  styles: `
    .vc__hint {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .vc__error {
      margin: 0.5rem 0;
      font-size: 0.875rem;
      color: var(--admin-accent-red, #f87171);
    }

    .vc__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .vc__toolbar input {
      flex: 1 1 12rem;
    }

    .vc__list {
      display: grid;
      gap: 0.25rem;
      max-height: 50vh;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      list-style: none;
    }

    .vc__row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--color-panel-border, rgba(128, 128, 128, 0.3));
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
    }
  `,
})
export class VariantCombinationsDialogComponent {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly facade = inject(ProductEditorFacade);

  readonly visible = input(false);
  readonly productId = input.required<string>();

  readonly visibleChange = output<boolean>();
  readonly created = output<void>();

  protected readonly emptySet: ReadonlySet<string> = new Set<string>();
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly items = signal<readonly VariantCombinationDto[]>([]);
  protected readonly selected = signal<ReadonlySet<string>>(this.emptySet);
  protected readonly existingCount = signal(0);

  protected readonly missing = computed(() => this.items().filter((item) => !item.exists));
  protected readonly shown = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.missing().filter((item) => item.labels.join(' ').toLowerCase().includes(term)) : this.missing();
  });

  constructor() {
    effect(() => {
      if (this.visible() && this.productId()) {
        void this.load();
      }
    });
  }

  protected keyOf(item: VariantCombinationDto): string {
    return item.optionIds.join(',');
  }

  protected toggle(item: VariantCombinationDto, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) {
      next.add(this.keyOf(item));
    } else {
      next.delete(this.keyOf(item));
    }
    this.selected.set(next);
  }

  protected tickShown(): void {
    const next = new Set(this.selected());
    for (const item of this.shown()) {
      next.add(this.keyOf(item));
    }
    this.selected.set(next);
  }

  protected async create(): Promise<void> {
    const chosen = this.missing().filter((item) => this.selected().has(this.keyOf(item)));
    if (chosen.length === 0 || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const ok = await this.facade.createSelectedVariants(chosen.map((item) => item.optionIds));
    this.saving.set(false);
    if (ok) {
      this.created.emit();
      this.visibleChange.emit(false);
    } else {
      this.error.set(this.facade.error() ?? 'Could not create the variants.');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.error.set(null);
    this.search.set('');
    this.selected.set(this.emptySet);
    try {
      const result = await firstValueFrom(this.inventoryApi.getVariantCombinations(this.productId()));
      this.items.set(result.items);
      this.existingCount.set(result.existingCount);
    } catch (error) {
      this.items.set([]);
      this.loadError.set(error instanceof ApiError && error.message ? error.message : 'Could not load the combinations.');
    } finally {
      this.loading.set(false);
    }
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../../core/models/api-error.model';
import {
  FilterDefinition,
  FilterLibraryApiService,
  FilterValueDraft,
  SaveFilterDefinitionInput,
} from '../../services/filter-library-api.service';

interface ScopeOption {
  readonly id: string;
  readonly label: string;
}

interface FilterForm {
  id: string | null;
  nameEn: string;
  nameAr: string;
  isMultiSelect: boolean;
  isActive: boolean;
  showWhenEmpty: boolean;
  defaultExpanded: boolean;
  scopeCategoryIds: string[];
  values: FilterValueDraft[];
}

const EMPTY_FORM: FilterForm = {
  id: null,
  nameEn: '',
  nameAr: '',
  isMultiSelect: true,
  isActive: true,
  showWhenEmpty: false,
  defaultExpanded: true,
  scopeCategoryIds: [],
  values: [],
};

/**
 * The filter library: filters the admin creates by hand (Game Mode, Offers, ...), each with its own values. Products are
 * tagged with their values (product page, or Set filter values in bulk), and the storefront offers them like any other
 * filter. Deleting a filter or a value never touches the products themselves.
 */
@Component({
  selector: 'app-filter-library',
  standalone: true,
  imports: [DatePipe, FormsModule, ButtonModule, DialogModule, MultiSelectModule],
  template: `
    <div class="library">
      <div class="library__head">
        <p class="library__intro">
          Create your own filters (Game Mode, Offers, Region...) and give them values. Then tag products with those values from
          the product page, or in bulk from the products list (More → Set filter values).
        </p>
        <button pButton type="button" icon="pi pi-plus" label="New filter" [disabled]="!canEdit()" (click)="openCreate()"></button>
      </div>

      @if (loading()) {
        <p class="library__note">Loading…</p>
      } @else if (filters().length === 0) {
        <p class="library__note">No custom filters yet. Create one, for example “Game Mode” with Single Player and Multiplayer.</p>
      } @else {
        <ul class="library__list">
          @for (filter of filters(); track filter.id) {
            <li class="library__card" [class.is-off]="!filter.isActive">
              <div class="library__card-head">
                <div>
                  <strong>{{ filter.nameEn }}</strong>
                  @if (filter.nameAr) {
                    <span class="library__ar" dir="rtl">{{ filter.nameAr }}</span>
                  }
                  <span class="library__meta">
                    {{ filter.isMultiSelect ? 'Multiple choice' : 'Single choice' }} · {{ filter.productCount }} product(s)
                    @if (filter.scopeCategoryIds.length) {
                      · only in {{ filter.scopeCategoryIds.length }} categor{{ filter.scopeCategoryIds.length === 1 ? 'y' : 'ies' }}
                    }
                    @if (!filter.isActive) {
                      · <em>switched off</em>
                    }
                  </span>
                </div>
                <div class="library__actions">
                  <button pButton type="button" icon="pi pi-pencil" severity="secondary" [text]="true" aria-label="Edit" [disabled]="!canEdit()" (click)="openEdit(filter)"></button>
                  <button pButton type="button" icon="pi pi-trash" severity="danger" [text]="true" aria-label="Delete" [disabled]="!canEdit()" (click)="remove(filter)"></button>
                </div>
              </div>
              <div class="library__chips">
                @for (value of filter.values; track value.value) {
                  <span class="library__chip" [class.is-off]="!value.isActive">
                    {{ value.labelEn }} <small>{{ value.productCount ?? 0 }}</small>
                  </span>
                } @empty {
                  <span class="library__note">No values yet.</span>
                }
              </div>
              @if (filter.modifiedBy || filter.modifiedOnUtc) {
                <small class="library__audit">Last changed {{ filter.modifiedOnUtc ? (filter.modifiedOnUtc | date: 'medium') : '' }}</small>
              }
            </li>
          }
        </ul>
      }
    </div>

    <p-dialog
      [header]="form().id ? 'Edit filter' : 'New filter'"
      [visible]="dialogOpen()"
      (visibleChange)="dialogOpen.set($event)"
      [modal]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [style]="{ width: 'min(44rem, 94vw)' }"
      styleClass="admin-dialog"
    >
      <div class="form">
        <div class="form__row">
          <label class="form__field">
            <span>Name (English) *</span>
            <input type="text" maxlength="200" [ngModel]="form().nameEn" (ngModelChange)="patch({ nameEn: $event })" />
          </label>
          <label class="form__field">
            <span>الاسم (عربي)</span>
            <input type="text" dir="rtl" maxlength="200" [ngModel]="form().nameAr" (ngModelChange)="patch({ nameAr: $event })" />
          </label>
        </div>

        <div class="form__checks">
          <label><input type="checkbox" [ngModel]="form().isMultiSelect" (ngModelChange)="patch({ isMultiSelect: $event })" /> Customers can pick several values</label>
          <label><input type="checkbox" [ngModel]="form().isActive" (ngModelChange)="patch({ isActive: $event })" /> Active (shown on the store)</label>
          <label><input type="checkbox" [ngModel]="form().defaultExpanded" (ngModelChange)="patch({ defaultExpanded: $event })" /> Opens expanded</label>
          <label><input type="checkbox" [ngModel]="form().showWhenEmpty" (ngModelChange)="patch({ showWhenEmpty: $event })" /> Show even when no product in view has it</label>
        </div>

        <div class="form__field">
          <span>Show only in these platforms / categories (empty = everywhere)</span>
          <p-multiSelect
            [options]="[...scopeOptions()]"
            optionLabel="label"
            optionValue="id"
            display="chip"
            [filter]="true"
            appendTo="body"
            placeholder="Everywhere"
            [ngModel]="form().scopeCategoryIds"
            (ngModelChange)="patch({ scopeCategoryIds: $event ?? [] })"
          />
        </div>

        <div class="form__values">
          <div class="form__values-head">
            <strong>Values</strong>
            <button pButton type="button" size="small" icon="pi pi-plus" label="Add value" severity="secondary" (click)="addValue()"></button>
          </div>
          @for (value of form().values; track $index; let i = $index; let first = $first; let last = $last) {
            <div class="form__value" [class.is-off]="!value.isActive">
              <input type="text" placeholder="Value (English)" [ngModel]="value.labelEn" (ngModelChange)="patchValue(i, { labelEn: $event })" />
              <input type="text" dir="rtl" placeholder="القيمة (عربي)" [ngModel]="value.labelAr" (ngModelChange)="patchValue(i, { labelAr: $event })" />
              <label class="form__value-active" title="Shown to customers">
                <input type="checkbox" [ngModel]="value.isActive" (ngModelChange)="patchValue(i, { isActive: $event })" />
                <span>On</span>
              </label>
              <button type="button" class="form__icon" aria-label="Move up" [disabled]="first" (click)="moveValue(i, -1)"><i class="pi pi-arrow-up"></i></button>
              <button type="button" class="form__icon" aria-label="Move down" [disabled]="last" (click)="moveValue(i, 1)"><i class="pi pi-arrow-down"></i></button>
              <button type="button" class="form__icon form__icon--danger" aria-label="Remove value" (click)="removeValue(i)"><i class="pi pi-trash"></i></button>
            </div>
          } @empty {
            <p class="library__note">Add the values customers can choose, e.g. Single Player, Multiplayer.</p>
          }
          <small class="library__note">Removing a value also takes it off the products that had it. Products themselves are never deleted.</small>
        </div>

        @if (error()) {
          <p class="form__error" role="alert">{{ error() }}</p>
        }
      </div>
      <div class="admin-dialog__actions">
        <button pButton type="button" label="Cancel" severity="secondary" (click)="dialogOpen.set(false)"></button>
        <button pButton type="button" label="Save" icon="pi pi-check" [loading]="saving()" (click)="save()"></button>
      </div>
    </p-dialog>
  `,
  styles: `
    .library__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .library__intro,
    .library__note {
      margin: 0;
      color: var(--admin-text-secondary);
    }

    .library__list {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .library__card {
      display: grid;
      gap: 0.6rem;
      padding: 1rem;
      border: 1px solid var(--admin-border-default);
      border-radius: 0.75rem;
      background: var(--admin-bg-panel);
    }

    .library__card.is-off {
      opacity: 0.65;
    }

    .library__card-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .library__ar {
      margin-inline-start: 0.6rem;
      color: var(--admin-text-secondary);
    }

    .library__meta {
      display: block;
      margin-top: 0.15rem;
      color: var(--admin-text-secondary);
      font-size: 0.8rem;
    }

    .library__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .library__chip {
      padding: 0.2rem 0.6rem;
      border: 1px solid var(--admin-border-default);
      border-radius: 999px;
      font-size: 0.8rem;
    }

    .library__chip.is-off {
      opacity: 0.55;
      text-decoration: line-through;
    }

    .library__audit {
      color: var(--admin-text-muted);
    }

    .form {
      display: grid;
      gap: 1rem;
    }

    .form__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .form__field {
      display: grid;
      gap: 0.3rem;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .form__field input,
    .form__value input[type='text'] {
      min-height: 2.4rem;
      padding: 0 0.6rem;
      border: 1px solid var(--admin-border-default);
      border-radius: 0.5rem;
      background: var(--admin-bg-input, transparent);
      color: inherit;
      font: inherit;
    }

    .form__checks {
      display: grid;
      gap: 0.4rem;
    }

    .form__values {
      display: grid;
      gap: 0.5rem;
    }

    .form__values-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .form__value {
      display: grid;
      grid-template-columns: 1fr 1fr auto auto auto auto;
      align-items: center;
      gap: 0.4rem;
    }

    .form__value.is-off input[type='text'] {
      opacity: 0.55;
    }

    .form__value-active {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
    }

    .form__icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--admin-border-default);
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .form__icon:disabled {
      opacity: 0.35;
      cursor: default;
    }

    .form__icon--danger {
      color: var(--admin-accent-red, #e5484d);
    }

    .form__error {
      margin: 0;
      color: var(--admin-accent-red, #e5484d);
    }

    @media (max-width: 640px) {
      .form__row {
        grid-template-columns: 1fr;
      }

      .form__value {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterLibraryComponent implements OnInit {
  private readonly api = inject(FilterLibraryApiService);
  private readonly messages = inject(MessageService);

  /** Platforms and categories a filter can be limited to (the page already loaded them). */
  readonly categories = input<readonly ScopeOption[]>([]);
  readonly canEdit = input(true);

  protected readonly filters = signal<readonly FilterDefinition[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly form = signal<FilterForm>({ ...EMPTY_FORM, values: [] });
  protected readonly error = signal<string | null>(null);
  protected readonly scopeOptions = computed(() => this.categories());

  ngOnInit(): void {
    void this.load();
  }

  protected openCreate(): void {
    this.form.set({ ...EMPTY_FORM, scopeCategoryIds: [], values: [] });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(filter: FilterDefinition): void {
    this.form.set({
      id: filter.id,
      nameEn: filter.nameEn,
      nameAr: filter.nameAr ?? '',
      isMultiSelect: filter.isMultiSelect,
      isActive: filter.isActive,
      showWhenEmpty: filter.showWhenEmpty,
      defaultExpanded: filter.defaultExpanded,
      scopeCategoryIds: [...filter.scopeCategoryIds],
      values: filter.values.map((value) => ({ ...value })),
    });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected patch(change: Partial<FilterForm>): void {
    this.form.update((current) => ({ ...current, ...change }));
  }

  protected addValue(): void {
    this.form.update((current) => ({
      ...current,
      values: [...current.values, { id: null, value: '', labelEn: '', labelAr: null, sortOrder: current.values.length, isActive: true }],
    }));
  }

  protected patchValue(index: number, change: Partial<FilterValueDraft>): void {
    this.form.update((current) => ({
      ...current,
      values: current.values.map((value, i) => (i === index ? { ...value, ...change } : value)),
    }));
  }

  protected moveValue(index: number, delta: number): void {
    const target = index + delta;
    this.form.update((current) => {
      if (target < 0 || target >= current.values.length) {
        return current;
      }
      const values = [...current.values];
      [values[index], values[target]] = [values[target], values[index]];
      return { ...current, values };
    });
  }

  protected removeValue(index: number): void {
    this.form.update((current) => ({ ...current, values: current.values.filter((_, i) => i !== index) }));
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f.nameEn.trim()) {
      this.error.set('The filter needs a name.');
      return;
    }
    if (f.values.some((value) => !value.labelEn.trim())) {
      this.error.set('Every value needs a name (English).');
      return;
    }

    const input: SaveFilterDefinitionInput = {
      nameEn: f.nameEn.trim(),
      nameAr: f.nameAr.trim() || null,
      isMultiSelect: f.isMultiSelect,
      isActive: f.isActive,
      showWhenEmpty: f.showWhenEmpty,
      defaultExpanded: f.defaultExpanded,
      scopeCategoryIds: f.scopeCategoryIds,
      values: f.values.map((value, index) => ({
        ...value,
        labelEn: value.labelEn.trim(),
        labelAr: value.labelAr?.trim() || null,
        sortOrder: index,
      })),
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(f.id ? this.api.update(f.id, input) : this.api.create(input));
      this.dialogOpen.set(false);
      this.messages.add({ severity: 'success', summary: 'Filter saved', life: 3000 });
      await this.load();
    } catch (error) {
      this.error.set(error instanceof ApiError && error.message ? error.message : 'Could not save the filter.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(filter: FilterDefinition): Promise<void> {
    if (!confirm(`Delete the filter “${filter.nameEn}”? Its values are removed from ${filter.productCount} product(s); the products themselves stay.`)) {
      return;
    }

    try {
      await firstValueFrom(this.api.delete(filter.id));
      this.messages.add({ severity: 'success', summary: 'Filter deleted', life: 3000 });
      await this.load();
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not delete the filter', life: 4000 });
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.filters.set(await firstValueFrom(this.api.list()));
    } catch {
      this.messages.add({ severity: 'error', summary: 'Could not load the filters', life: 4000 });
    } finally {
      this.loading.set(false);
    }
  }
}

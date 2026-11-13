import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CategoryPickerComponent } from '../../../../../shared/components/admin';

import { PopularCategoriesSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { CATEGORY_SORT_OPTIONS, SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('POPULAR_CATEGORIES', path);

@Component({
  selector: 'app-popular-categories-settings-form',
  standalone: true,
  imports: [FormsModule, SettingsFieldComponent, CategoryPickerComponent],
  template: `
    <div class="section-settings-form">
      <app-settings-field
        [field]="fields[0]"
        [value]="fieldValue('sectionTitle')"
        [disabled]="disabled()"
        (valueChange)="setField('sectionTitle', $event)"
      />

      <label class="section-settings-form__row">
        <span>What the tiles show</span>
        <select
          [disabled]="disabled()"
          [ngModel]="localConfig().contentType ?? 'categories'"
          (ngModelChange)="setField('contentType', $event)"
        >
          <option value="categories">Categories</option>
          <option value="products">Products</option>
        </select>
      </label>

      @if ((localConfig().contentType ?? 'categories') === 'categories') {
        <div class="section-settings-form__row">
          <span>Categories to show</span>
          <app-category-picker
            [value]="localConfig().categoryIds ?? []"
            [disabled]="disabled()"
            (valueChange)="setField('categoryIds', $event)"
          />
          <small>Leave it empty to show all active categories, in the store's order. Otherwise they show in the order picked.</small>
        </div>

        @for (field of otherFields; track field.key) {
          <app-settings-field
            [field]="field"
            [value]="fieldValue(field.key)"
            [disabled]="disabled()"
            (valueChange)="setField(field.key, $event)"
          />
        }
      } @else {
        <p class="section-settings-form__hint">
          Choose which products appear under <strong>Products shown</strong> below (a category, hand-picked products, and how
          many).
        </p>
      }
    </div>
  `,
  styles: `
    .section-settings-form {
      display: grid;
      gap: 0.85rem;
    }

    .section-settings-form__row {
      display: grid;
      gap: 0.35rem;
      font-size: 0.875rem;
    }

    .section-settings-form__row select {
      min-height: 2.5rem;
      padding: 0 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-input-bg);
      color: inherit;
    }

    .section-settings-form__hint,
    .section-settings-form__row small {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopularCategoriesSettingsFormComponent {
  readonly config = input.required<PopularCategoriesSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<PopularCategoriesSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', validators: { required: true }, ...KEY('SECTION_TITLE') },
    { key: 'maximumCategories', control: 'stepper', min: 1, max: 24, ...KEY('MAXIMUM_CATEGORIES') },
    { key: 'sortOrder', control: 'select', options: CATEGORY_SORT_OPTIONS, ...KEY('SORT_ORDER') },
  ];
  protected readonly otherFields = this.fields.slice(1);

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}

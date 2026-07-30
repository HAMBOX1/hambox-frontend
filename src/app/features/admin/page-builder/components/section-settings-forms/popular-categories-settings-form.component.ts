import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PopularCategoriesSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { CATEGORY_SORT_OPTIONS, SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('POPULAR_CATEGORIES', path);

@Component({
  selector: 'app-popular-categories-settings-form',
  standalone: true,
  imports: [SettingsFieldComponent],
  template: `
    <div class="section-settings-form">
      @for (field of fields; track field.key) {
        <app-settings-field
          [field]="field"
          [value]="fieldValue(field.key)"
          [disabled]="disabled()"
          (valueChange)="setField(field.key, $event)"
        />
      }
    </div>
  `,
  styles: `
    .section-settings-form {
      display: grid;
      gap: 0.85rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopularCategoriesSettingsFormComponent {
  readonly config = input.required<PopularCategoriesSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<PopularCategoriesSectionConfig>();

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', validators: { required: true }, ...KEY('SECTION_TITLE') },
    { key: 'maximumCategories', control: 'stepper', min: 1, max: 24, ...KEY('MAXIMUM_CATEGORIES') },
    { key: 'sortOrder', control: 'select', options: CATEGORY_SORT_OPTIONS, ...KEY('SORT_ORDER') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    this.configChange.emit({ ...this.config(), [key]: value });
  }
}

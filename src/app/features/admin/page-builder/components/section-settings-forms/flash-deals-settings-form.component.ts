import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FlashDealsSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { FLASH_DEALS_SORT_OPTIONS, SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('FLASH_DEALS', path);

@Component({
  selector: 'app-flash-deals-settings-form',
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
export class FlashDealsSettingsFormComponent {
  readonly config = input.required<FlashDealsSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<FlashDealsSectionConfig>();

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', validators: { required: true }, ...KEY('SECTION_TITLE') },
    { key: 'sectionSubtitle', control: 'textarea', rows: 2, ...KEY('SECTION_SUBTITLE') },
    { key: 'countdownEnabled', control: 'toggle', ...KEY('COUNTDOWN_ENABLED') },
    { key: 'countdownDateUtc', control: 'text', ...KEY('COUNTDOWN_DATE_UTC') },
    { key: 'countdownSeconds', control: 'stepper', min: 0, unit: 'seconds', ...KEY('COUNTDOWN_SECONDS') },
    { key: 'maximumProducts', control: 'stepper', min: 1, max: 24, ...KEY('MAXIMUM_PRODUCTS') },
    { key: 'sortMethod', control: 'select', options: FLASH_DEALS_SORT_OPTIONS, ...KEY('SORT_METHOD') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.config() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const next = value === '' && key === 'countdownDateUtc' ? null : value;
    this.configChange.emit({ ...this.config(), [key]: next });
  }
}

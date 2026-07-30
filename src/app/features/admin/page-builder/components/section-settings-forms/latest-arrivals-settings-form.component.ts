import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

import { LatestArrivalsSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { FLASH_DEALS_SORT_OPTIONS, SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('LATEST_ARRIVALS', path);

@Component({
  selector: 'app-latest-arrivals-settings-form',
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
export class LatestArrivalsSettingsFormComponent {
  readonly config = input.required<LatestArrivalsSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<LatestArrivalsSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', validators: { required: true }, ...KEY('SECTION_TITLE') },
    { key: 'sectionTitleAccent', control: 'text', ...KEY('SECTION_TITLE_ACCENT') },
    { key: 'sectionSubtitle', control: 'textarea', rows: 2, ...KEY('SECTION_SUBTITLE') },
    { key: 'maximumProducts', control: 'stepper', min: 5, max: 24, ...KEY('MAXIMUM_PRODUCTS') },
    { key: 'sortMethod', control: 'select', options: FLASH_DEALS_SORT_OPTIONS, ...KEY('SORT_METHOD') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const updated = { ...this.localConfig(), [key]: value };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}

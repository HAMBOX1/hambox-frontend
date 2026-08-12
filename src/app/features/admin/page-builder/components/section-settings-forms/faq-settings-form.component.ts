import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

import { FaqSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('FAQ', path);

@Component({
  selector: 'app-faq-settings-form',
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
      <p class="section-settings-form__hint">
        Question and answer content is managed under Admin &rarr; FAQ, not here — this section always
        shows that page's real, published FAQs (plus Global FAQs).
      </p>
    </div>
  `,
  styles: `
    .section-settings-form {
      display: grid;
      gap: 0.85rem;
    }
    .section-settings-form__hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--admin-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSettingsFormComponent {
  readonly config = input.required<FaqSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<FaqSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'sectionTitle', control: 'text', validators: { required: true }, ...KEY('SECTION_TITLE') },
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

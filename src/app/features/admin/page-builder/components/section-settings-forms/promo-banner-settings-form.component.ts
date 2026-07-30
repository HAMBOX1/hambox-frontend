import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { PromoBannerSectionConfig } from '../../../../home/section-registry/models/section-config.model';
import { SettingsFieldConfig } from '../../../settings/models/platform-settings.model';
import { SettingsFieldComponent } from '../../../settings/components/settings-field/settings-field.component';
import { ButtonEditorComponent } from '../../../../../shared/components/admin';
import { sectionFieldKeys } from './section-field-keys.util';

const KEY = (path: string) => sectionFieldKeys('PROMO_BANNER', path);

@Component({
  selector: 'app-promo-banner-settings-form',
  standalone: true,
  imports: [SettingsFieldComponent, ButtonEditorComponent, TranslatePipe],
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

      <app-button-editor
        [title]="'ADMIN.PAGE_BUILDER.SETTINGS.FIELDS.PROMO_BANNER.BUTTON.LABEL' | translate"
        [label]="localConfig().buttonText"
        [url]="localConfig().buttonUrl"
        [disabled]="disabled()"
        (labelChange)="setField('buttonText', $event)"
        (urlChange)="setField('buttonUrl', $event)"
      />
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
export class PromoBannerSettingsFormComponent {
  readonly config = input.required<PromoBannerSectionConfig>();
  readonly disabled = input(false);
  readonly configChange = output<PromoBannerSectionConfig>();

  protected readonly localConfig = linkedSignal(() => this.config());

  protected readonly fields: SettingsFieldConfig[] = [
    { key: 'title', control: 'text', validators: { required: true }, ...KEY('TITLE') },
    { key: 'subtitle', control: 'textarea', rows: 2, ...KEY('SUBTITLE') },
    { key: 'imageUrl', control: 'media', recommendedSize: '1600×500px, JPG/WebP', ...KEY('IMAGE_URL') },
    { key: 'countdownSeconds', control: 'stepper', min: 0, unit: 'seconds', ...KEY('COUNTDOWN_SECONDS') },
    { key: 'countdownEndsAtUtc', control: 'text', ...KEY('COUNTDOWN_ENDS_AT_UTC') },
    { key: 'backgroundColor', control: 'color', ...KEY('BACKGROUND_COLOR') },
  ];

  protected fieldValue(key: string): unknown {
    return (this.localConfig() as unknown as Record<string, unknown>)[key];
  }

  protected setField(key: string, value: unknown): void {
    const next = value === '' && key === 'countdownEndsAtUtc' ? null : value;
    const updated = { ...this.localConfig(), [key]: next };
    this.localConfig.set(updated);
    this.configChange.emit(updated);
  }
}
